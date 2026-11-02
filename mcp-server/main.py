"""FastAPI application — Distributed Genetic Intelligence Platform.

Serves:
  /api/chat           — multi-agent query endpoint
  /api/mcp/tools      — MCP tool discovery
  /api/mcp/call       — MCP tool invocation
  /api/ingest         — document ingestion
  /api/search         — direct hybrid search
  /api/sessions       — session CRUD
  /api/health         — system health
  /api/telemetry      — execution telemetry
"""
from __future__ import annotations

import time
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from agents.graph import run_agent_graph
from config import settings
from db.session import create_session, save_checkpoint, load_checkpoint, list_sessions
from db.supabase_client import get_supabase
from mcp_server import MCP_TOOLS, handle_tool_call, record_telemetry
from retrieval.hybrid import hybrid_search, ingest_document

app = FastAPI(
    title="DGIP — Distributed Genetic Intelligence Platform",
    version="1.0.0",
    description="Production-grade multi-agent hybrid retrieval system with MCP integration",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Request / Response models ───────────────────────────────────────────────


class ChatRequest(BaseModel):
    query: str
    session_id: str | None = None


class ChatResponse(BaseModel):
    session_id: str
    answer: str
    citations: list[dict[str, Any]] = Field(default_factory=list)
    steps: list[dict[str, Any]] = Field(default_factory=list)
    verification_passed: bool = False
    total_duration_ms: float = 0


class IngestRequest(BaseModel):
    content: str
    metadata: dict[str, Any] = Field(default_factory=dict)
    doc_id: str | None = None


class SearchRequest(BaseModel):
    query: str
    top_k: int = 5


class MCPCallRequest(BaseModel):
    tool_name: str
    arguments: dict[str, Any] = Field(default_factory=dict)


# ─── Chat endpoint — runs the full agent graph ──────────────────────────────


@app.post("/api/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    start = time.time()

    session_id = req.session_id
    if not session_id:
        try:
            session_id = create_session({"created_via": "chat"})
        except Exception:
            session_id = str(uuid.uuid4())

    result = await run_agent_graph(req.query, session_id=session_id)

    elapsed = (time.time() - start) * 1000

    try:
        save_checkpoint(session_id, result)
    except Exception:
        pass

    record_telemetry({
        "type": "chat_request",
        "session_id": session_id,
        "query": req.query[:200],
        "duration_ms": round(elapsed, 1),
        "steps_count": len(result.get("steps", [])),
    })

    return ChatResponse(
        session_id=session_id,
        answer=result.get("final_answer", ""),
        citations=result.get("citations", []),
        steps=result.get("steps", []),
        verification_passed=result.get("verification_passed", False),
        total_duration_ms=round(elapsed, 1),
    )


# ─── MCP endpoints ──────────────────────────────────────────────────────────


@app.get("/api/mcp/tools")
async def mcp_list_tools():
    return {"tools": MCP_TOOLS}


@app.post("/api/mcp/call")
async def mcp_call_tool(req: MCPCallRequest):
    valid_names = {t["name"] for t in MCP_TOOLS}
    if req.tool_name not in valid_names:
        raise HTTPException(404, f"Unknown MCP tool: {req.tool_name}")
    result = await handle_tool_call(req.tool_name, req.arguments)
    return {"tool": req.tool_name, "result": result}


# ─── Document ingestion ─────────────────────────────────────────────────────


@app.post("/api/ingest")
async def ingest(req: IngestRequest):
    doc = await ingest_document(req.content, req.metadata, req.doc_id)
    return {"status": "ingested", "doc_id": doc.get("id")}


@app.post("/api/upload")
async def upload_file(
    file: UploadFile = File(...),
    section: str = Form("other"),
    title: str = Form(""),
):
    """Upload a file (txt, md, pdf, csv, json) and ingest its content."""
    raw = await file.read()
    filename = file.filename or "unknown"
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if ext in ("txt", "md", "csv", "log"):
        text = raw.decode("utf-8", errors="replace")
    elif ext == "json":
        import json as _json
        data = _json.loads(raw)
        text = _json.dumps(data, indent=2) if isinstance(data, (dict, list)) else str(data)
    elif ext == "pdf":
        try:
            import fitz  # PyMuPDF
            doc = fitz.open(stream=raw, filetype="pdf")
            text = "\n\n".join(page.get_text() for page in doc)
            doc.close()
        except ImportError:
            text = raw.decode("utf-8", errors="replace")
    else:
        text = raw.decode("utf-8", errors="replace")

    if not text.strip():
        raise HTTPException(400, "File is empty or could not be parsed.")

    # Chunk long documents (each chunk ≤ 2000 chars for better retrieval)
    chunks = _chunk_text(text, max_chars=2000)
    doc_ids = []

    for i, chunk in enumerate(chunks):
        meta = {
            "section": section,
            "source_file": filename,
            "title": title or filename,
        }
        if len(chunks) > 1:
            meta["chunk"] = f"{i + 1}/{len(chunks)}"
        result = await ingest_document(chunk, meta)
        doc_ids.append(result.get("id"))

    return {
        "status": "ingested",
        "filename": filename,
        "chunks": len(chunks),
        "doc_ids": doc_ids,
        "total_chars": len(text),
    }


def _chunk_text(text: str, max_chars: int = 2000) -> list[str]:
    """Split text into chunks, preferring paragraph boundaries."""
    if len(text) <= max_chars:
        return [text]

    chunks = []
    paragraphs = text.split("\n\n")
    current = ""

    for para in paragraphs:
        if len(current) + len(para) + 2 > max_chars and current:
            chunks.append(current.strip())
            current = para
        else:
            current = current + "\n\n" + para if current else para

    if current.strip():
        chunks.append(current.strip())

    # If any chunk is still too long, split by sentences
    final = []
    for chunk in chunks:
        if len(chunk) <= max_chars:
            final.append(chunk)
        else:
            sentences = chunk.replace(". ", ".\n").split("\n")
            buf = ""
            for sent in sentences:
                if len(buf) + len(sent) + 1 > max_chars and buf:
                    final.append(buf.strip())
                    buf = sent
                else:
                    buf = buf + " " + sent if buf else sent
            if buf.strip():
                final.append(buf.strip())

    return final if final else [text[:max_chars]]


@app.delete("/api/documents/{doc_id}")
async def delete_document(doc_id: str):
    """Delete a document from the knowledge base."""
    sb = get_supabase()
    resp = sb.table(settings.vector_table).delete().eq("id", doc_id).execute()
    if not resp.data:
        raise HTTPException(404, "Document not found")
    return {"status": "deleted", "doc_id": doc_id}


@app.get("/api/documents")
async def list_documents():
    """List all documents in the knowledge base."""
    sb = get_supabase()
    resp = sb.table(settings.vector_table).select("id, content, metadata").execute()
    rows = resp.data or []
    return {
        "documents": [
            {
                "id": r["id"],
                "content_preview": r["content"][:200],
                "metadata": r.get("metadata", {}),
                "content_length": len(r["content"]),
            }
            for r in rows
        ],
        "total": len(rows),
    }


# ─── Direct search ──────────────────────────────────────────────────────────


@app.post("/api/search")
async def search(req: SearchRequest):
    results = await hybrid_search(req.query, top_k=req.top_k)
    return {"results": results, "count": len(results)}


# ─── Sessions ────────────────────────────────────────────────────────────────


@app.get("/api/sessions")
async def get_sessions():
    try:
        sessions = list_sessions()
    except Exception:
        sessions = []
    return {"sessions": sessions}


@app.get("/api/sessions/{session_id}")
async def get_session(session_id: str):
    try:
        state = load_checkpoint(session_id)
    except Exception:
        state = None
    if not state:
        raise HTTPException(404, "Session not found")
    return {"session_id": session_id, "state": state}


# ─── Health & Telemetry ─────────────────────────────────────────────────────


@app.get("/api/health")
async def health():
    result = await handle_tool_call("system_health", {})
    return result


@app.get("/api/telemetry")
async def telemetry(limit: int = 50):
    result = await handle_tool_call("query_telemetry", {"limit": limit})
    return result


# ─── Resume ────────────────────────────────────────────────────────────────────


@app.get("/api/resume")
async def get_resume():
    """Return all resume documents from the knowledge base, organized by section."""
    sb = get_supabase()
    resp = sb.table(settings.vector_table).select("id, content, metadata").execute()
    rows = resp.data or []

    sections: dict[str, list[dict[str, Any]]] = {}
    for row in rows:
        meta = row.get("metadata") or {}
        section = meta.get("section", "other")
        sections.setdefault(section, []).append({
            "id": row["id"],
            "content": row["content"],
            "metadata": meta,
        })

    section_order = ["summary", "experience", "projects", "education", "skills", "other"]
    ordered = []
    for s in section_order:
        if s in sections:
            ordered.append({"section": s, "documents": sections.pop(s)})
    for s, docs in sections.items():
        ordered.append({"section": s, "documents": docs})

    return {"sections": ordered, "total_documents": len(rows)}


# ─── Root ────────────────────────────────────────────────────────────────────


@app.get("/")
async def root():
    return {
        "platform": "Distributed Genetic Intelligence Platform (DGIP)",
        "version": "1.0.0",
        "endpoints": {
            "chat": "/api/chat",
            "mcp_tools": "/api/mcp/tools",
            "mcp_call": "/api/mcp/call",
            "ingest": "/api/ingest",
            "search": "/api/search",
            "sessions": "/api/sessions",
            "health": "/api/health",
            "telemetry": "/api/telemetry",
            "docs": "/docs",
        },
    }


if __name__ == "__main__":
    import uvicorn
    from config import settings
    uvicorn.run("main:app", host=settings.host, port=settings.port, reload=True)
