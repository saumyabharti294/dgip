"""Synthesis & Verification agent — generates grounded answers with citations, then self-verifies."""
from __future__ import annotations

import time
from datetime import datetime, timezone

from agents.llm import generate
from agents.state import AgentStep

SYNTHESIS_PROMPT = """You are a synthesis agent. Using ONLY the retrieved documents below, answer the user's query.
Rules:
1. Ground every claim in a retrieved document. Cite using [doc_id] format.
2. If the documents don't contain enough information, say so explicitly.
3. Be concise but thorough.

Retrieved Documents:
{documents}

User Query: {query}

Answer:"""

VERIFICATION_PROMPT = """You are a verification agent. Check whether the synthesized answer is properly grounded in the source documents.

Source Documents:
{documents}

Synthesized Answer:
{synthesis}

Check each claim for:
1. Is it supported by the source documents?
2. Are citations accurate?
3. Are there any hallucinated claims?

If the answer passes verification, respond with exactly: VERIFIED
If it fails, respond with: FAILED: <brief explanation of what's wrong>"""


async def synthesizer_node(state: dict) -> dict:
    start = time.time()
    query = state["query"]
    docs = state.get("retrieved_docs", [])

    docs_text = "\n\n".join(
        f"[{doc.get('id', i)}]: {doc.get('content', '')[:500]}"
        for i, doc in enumerate(docs)
    )

    top_sim = max((d.get("similarity", 0) for d in docs), default=0)
    if not docs or top_sim < 0.75:
        synthesis = generate(
            f"Answer this question concisely and helpfully using your general knowledge.\n\nQuestion: {query}"
        )
    else:
        synthesis = generate(SYNTHESIS_PROMPT.format(documents=docs_text, query=query))

    elapsed = (time.time() - start) * 1000
    step = AgentStep(
        agent="synthesizer",
        action="generate_answer",
        input_summary=f"{len(docs)} docs for: {query[:80]}",
        output_summary=synthesis[:120],
        duration_ms=round(elapsed, 1),
        timestamp=datetime.now(timezone.utc).isoformat(),
    )
    return {
        "synthesis": synthesis,
        "steps": [step.model_dump()],
    }


async def verifier_node(state: dict) -> dict:
    start = time.time()
    synthesis = state.get("synthesis", "")
    docs = state.get("retrieved_docs", [])

    if not docs or not synthesis:
        return {
            "verification_passed": True,
            "verification_notes": "No documents to verify against.",
            "final_answer": synthesis,
            "steps": [AgentStep(
                agent="verifier",
                action="skip_verification",
                output_summary="No documents — skipped",
                duration_ms=0,
                timestamp=datetime.now(timezone.utc).isoformat(),
            ).model_dump()],
        }

    docs_text = "\n\n".join(
        f"[{doc.get('id', i)}]: {doc.get('content', '')[:500]}"
        for i, doc in enumerate(docs)
    )

    verdict = generate(VERIFICATION_PROMPT.format(documents=docs_text, synthesis=synthesis))
    passed = verdict.upper().startswith("VERIFIED")

    elapsed = (time.time() - start) * 1000
    step = AgentStep(
        agent="verifier",
        action="verify_grounding",
        input_summary=synthesis[:80],
        output_summary=f"{'PASSED' if passed else 'FAILED'}: {verdict[:100]}",
        duration_ms=round(elapsed, 1),
        timestamp=datetime.now(timezone.utc).isoformat(),
    )

    iteration = state.get("iteration", 0) + 1
    final = synthesis if passed or iteration >= state.get("max_iterations", 3) else ""

    return {
        "verification_passed": passed,
        "verification_notes": verdict,
        "final_answer": final,
        "iteration": iteration,
        "steps": [step.model_dump()],
    }
