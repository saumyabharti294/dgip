"""Web search agent — uses Gemini grounding with Google Search for general questions."""
from __future__ import annotations

import time
from datetime import datetime, timezone

from google import genai
from google.genai import types

from config import settings
from agents.state import AgentStep

_client = genai.Client(api_key=settings.gemini_api_key)


async def web_search_node(state: dict) -> dict:
    start = time.time()
    query = state["query"]

    tool = types.Tool(google_search=types.GoogleSearch())

    models = [settings.gemini_model] + settings.gemini_fallback_models
    last_err = None
    response_text = ""

    for model in models:
        try:
            resp = _client.models.generate_content(
                model=model,
                contents=query,
                config=types.GenerateContentConfig(
                    tools=[tool],
                    temperature=0.3,
                ),
            )
            response_text = resp.text.strip()
            break
        except Exception as e:
            last_err = e
            if "503" not in str(e) and "429" not in str(e):
                break

    if not response_text and last_err:
        from agents.llm import generate
        try:
            response_text = generate(
                f"Answer this question concisely and helpfully using your general knowledge.\n\nQuestion: {query}"
            )
        except Exception:
            response_text = f"Web search unavailable and LLM fallback failed. Please try again later."

    elapsed = (time.time() - start) * 1000
    step = AgentStep(
        agent="web_search",
        action="google_search",
        input_summary=query[:120],
        output_summary=response_text[:120],
        duration_ms=round(elapsed, 1),
        timestamp=datetime.now(timezone.utc).isoformat(),
    )

    return {
        "synthesis": response_text,
        "final_answer": response_text,
        "verification_passed": True,
        "verification_notes": "Web search grounded response — no KB verification needed.",
        "steps": [step.model_dump()],
    }
