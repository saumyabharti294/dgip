"""Sparse keyword search via PostgreSQL full-text search (tsvector/tsquery)."""
from __future__ import annotations

from typing import Any

from db.supabase_client import get_supabase
from config import settings


async def sparse_search(query: str, top_k: int | None = None) -> list[dict[str, Any]]:
    k = top_k or settings.top_k_sparse
    sb = get_supabase()
    resp = sb.rpc("sparse_search", {
        "query_text": query,
        "match_count": k,
    }).execute()
    return resp.data or []
