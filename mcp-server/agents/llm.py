"""Resilient LLM client with fallback models."""
from __future__ import annotations

from google import genai

from config import settings

_client = genai.Client(api_key=settings.gemini_api_key)


def generate(prompt: str) -> str:
    models = [settings.gemini_model] + settings.gemini_fallback_models
    last_err = None
    for model in models:
        try:
            resp = _client.models.generate_content(model=model, contents=prompt)
            return resp.text.strip()
        except Exception as e:
            last_err = e
            if "503" not in str(e) and "429" not in str(e):
                raise
    raise last_err  # type: ignore[misc]
