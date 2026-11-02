"""Supervisor / Router agent — classifies the query and decides the execution path."""
from __future__ import annotations

import time
from datetime import datetime, timezone

from agents.llm import generate
from agents.state import AgentStep

ROUTER_PROMPT = """You are a query router for a knowledge base system. The knowledge base contains user-uploaded documents.

Classify the user query into one of these types:
- "retrieval": The query asks for specific information that could be in the uploaded documents.
- "synthesis": The query asks for analysis, comparison, or summarization of information from the documents.
- "general": The query is about general knowledge, current events, or topics unlikely to be in the uploaded documents (weather, news, coding questions, math, science, etc).

Respond with ONLY the classification word, nothing else.

Query: {query}"""


async def supervisor_node(state: dict) -> dict:
    start = time.time()
    query = state["query"]

    raw = generate(ROUTER_PROMPT.format(query=query)).lower()

    query_type = "retrieval"
    if "synthesis" in raw:
        query_type = "synthesis"
    elif "general" in raw:
        query_type = "general"

    elapsed = (time.time() - start) * 1000
    step = AgentStep(
        agent="supervisor",
        action="classify_query",
        input_summary=query[:120],
        output_summary=f"Classified as: {query_type}",
        duration_ms=round(elapsed, 1),
        timestamp=datetime.now(timezone.utc).isoformat(),
    )
    return {
        "query_type": query_type,
        "steps": [step.model_dump()],
    }
