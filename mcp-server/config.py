from __future__ import annotations

import os

from dotenv import load_dotenv
from pydantic import BaseModel

load_dotenv()


class Settings(BaseModel):
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    gemini_model: str = "gemini-3.5-flash-lite"
    gemini_fallback_models: list[str] = ["gemini-3.5-flash", "gemini-3.7-flash", "gemini-3.1-flash-lite"]
    embedding_model: str = "models/gemini-embedding-001"
    embedding_dimension: int = 768

    supabase_url: str = os.getenv("SUPABASE_URL", "")
    supabase_anon_key: str = os.getenv("SUPABASE_ANON_KEY", "")
    supabase_service_key: str = os.getenv("SUPABASE_SERVICE_KEY", "")

    vector_table: str = "documents"
    vector_match_fn: str = "search_vectors"
    top_k_vector: int = 10
    top_k_sparse: int = 10
    top_k_final: int = 5
    rrf_k: int = 60

    host: str = "0.0.0.0"
    port: int = 8000


settings = Settings()
