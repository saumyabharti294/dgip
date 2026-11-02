"""Retrieval & Grounding agent — performs hybrid search and extracts citations."""
from __future__ import annotations

import time
from datetime import datetime, timezone
from typing import Any

from agents.state import AgentStep, Citation
from retrieval.hybrid import hybrid_search


async def retriever_node(state: dict) -> dict:
    start = time.time()
    query = state["query"]

    docs = await hybrid_search(query)

    citations = []
    for doc in docs:
        citations.append(Citation(
            doc_id=str(doc.get("id", "")),
            content_snippet=str(doc.get("content", ""))[:300],
            score=float(doc.get("rrf_score", 0)),
            metadata=doc.get("metadata", {}),
        ).model_dump())

    elapsed = (time.time() - start) * 1000
    step = AgentStep(
        agent="retriever",
        action="hybrid_search",
        input_summary=query[:120],
        output_summary=f"Found {len(docs)} documents via hybrid RRF",
        duration_ms=round(elapsed, 1),
        timestamp=datetime.now(timezone.utc).isoformat(),
    )
    return {
        "retrieved_docs": docs,
        "citations": citations,
        "steps": [step.model_dump()],
    }
