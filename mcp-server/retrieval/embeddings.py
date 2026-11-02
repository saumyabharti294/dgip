"""Dense vector embeddings via Google Gemini embedding model."""
from __future__ import annotations

from google import genai

from config import settings

_client = genai.Client(api_key=settings.gemini_api_key)


async def embed_text(text: str) -> list[float]:
    result = _client.models.embed_content(
        model=settings.embedding_model,
        contents=text,
        config={"task_type": "RETRIEVAL_DOCUMENT", "output_dimensionality": settings.embedding_dimension},
    )
    return list(result.embeddings[0].values)


async def embed_query(query: str) -> list[float]:
    result = _client.models.embed_content(
        model=settings.embedding_model,
        contents=query,
        config={"task_type": "RETRIEVAL_DOCUMENT", "output_dimensionality": settings.embedding_dimension},
    )
    return list(result.embeddings[0].values)
