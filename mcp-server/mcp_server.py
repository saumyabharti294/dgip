"""Model Context Protocol (MCP) server module.

Exposes standardized tool endpoints that any MCP-compatible client can discover and invoke:
  - query_knowledge_base: hybrid retrieval over the document store
  - vector_store_upsert: ingest a document with embeddings
  - system_health: platform health check
  - query_telemetry: execution trace telemetry
"""
from __future__ import annotations

import time
from datetime import datetime, timezone
from typing import Any

from pydantic import BaseModel, Field

from config import settings
from retrieval.hybrid import hybrid_search, ingest_document


# --- Telemetry store (in-memory, with Supabase persistence option) ---
_telemetry: list[dict[str, Any]] = []
_start_time = time.time()


def record_telemetry(event: dict[str, Any]) -> None:
    event["recorded_at"] = datetime.now(timezone.utc).isoformat()
    _telemetry.append(event)
    if len(_telemetry) > 1000:
        _telemetry.pop(0)


# --- MCP Tool definitions (JSON-Schema compatible) ---

MCP_TOOLS = [
    {
        "name": "query_knowledge_base",
        "description": "Search the knowledge base using hybrid retrieval (dense vector + sparse keyword with Reciprocal Rank Fusion). Returns ranked documents with citations.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "The search query"},
                "top_k": {"type": "integer", "description": "Number of results to return", "default": 5},
            },
            "required": ["query"],
        },
    },
    {
        "name": "vector_store_upsert",
        "description": "Ingest a document into the vector store with automatic embedding generation.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "content": {"type": "string", "description": "Document text content"},
                "metadata": {"type": "object", "description": "Optional metadata", "default": {}},
                "doc_id": {"type": "string", "description": "Optional document ID"},
            },
            "required": ["content"],
        },
    },
    {
        "name": "system_health",
        "description": "Check platform component health: API, database, embedding service, agent graph.",
        "inputSchema": {
            "type": "object",
            "properties": {},
        },
    },
    {
        "name": "query_telemetry",
        "description": "Retrieve execution telemetry and traces for recent agent runs.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "limit": {"type": "integer", "description": "Max events to return", "default": 50},
                "agent_filter": {"type": "string", "description": "Filter by agent name"},
            },
        },
    },
]


async def handle_tool_call(tool_name: str, arguments: dict[str, Any]) -> dict[str, Any]:
    start = time.time()

    if tool_name == "query_knowledge_base":
        results = await hybrid_search(
            arguments["query"],
            top_k=arguments.get("top_k", 5),
        )
        output = {"documents": results, "count": len(results)}

    elif tool_name == "vector_store_upsert":
        doc = await ingest_document(
            content=arguments["content"],
            metadata=arguments.get("metadata", {}),
            doc_id=arguments.get("doc_id"),
        )
        output = {"status": "ingested", "doc_id": doc.get("id")}

    elif tool_name == "system_health":
        output = await _check_health()

    elif tool_name == "query_telemetry":
        limit = arguments.get("limit", 50)
        agent_filter = arguments.get("agent_filter")
        events = _telemetry[-limit:]
        if agent_filter:
            events = [e for e in events if e.get("agent") == agent_filter]
        output = {"events": events, "total_stored": len(_telemetry)}

    else:
        output = {"error": f"Unknown tool: {tool_name}"}

    elapsed = (time.time() - start) * 1000
    record_telemetry({
        "tool": tool_name,
        "duration_ms": round(elapsed, 1),
        "arguments_summary": {k: str(v)[:100] for k, v in arguments.items()},
    })
    return output


async def _check_health() -> dict[str, Any]:
    components = {}

    components["api"] = {"status": "healthy", "uptime_seconds": round(time.time() - _start_time)}

    try:
        from db.supabase_client import get_supabase
        sb = get_supabase()
        sb.table("documents").select("id").limit(1).execute()
        components["database"] = {"status": "healthy"}
    except Exception as e:
        components["database"] = {"status": "degraded", "error": str(e)[:200]}

    try:
        from google import genai as _genai
        _hc = _genai.Client(api_key=settings.gemini_api_key)
        _hc.models.embed_content(model=settings.embedding_model, contents="health check")
        components["embedding_service"] = {"status": "healthy"}
    except Exception as e:
        components["embedding_service"] = {"status": "degraded", "error": str(e)[:200]}

    try:
        from agents.graph import agent_graph
        components["agent_graph"] = {"status": "healthy", "nodes": list(agent_graph.nodes.keys()) if hasattr(agent_graph, 'nodes') else []}
    except Exception as e:
        components["agent_graph"] = {"status": "degraded", "error": str(e)[:200]}

    all_healthy = all(c["status"] == "healthy" for c in components.values())
    return {
        "overall": "healthy" if all_healthy else "degraded",
        "components": components,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
