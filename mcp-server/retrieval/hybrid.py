"""Hybrid retrieval: dense vectors + sparse keyword search fused with Reciprocal Rank Fusion."""
from __future__ import annotations

from typing import Any

from config import settings
from db.supabase_client import get_supabase
from retrieval.embeddings import embed_query
from retrieval.sparse import sparse_search


def _to_pgvector_str(embedding: list[float]) -> str:
    return "[" + ",".join(str(v) for v in embedding) + "]"


async def vector_search(query_embedding: list[float], top_k: int | None = None) -> list[dict[str, Any]]:
    k = top_k or settings.top_k_vector
    sb = get_supabase()
    resp = sb.rpc(settings.vector_match_fn, {
        "query_embedding": _to_pgvector_str(query_embedding),
        "match_count": k,
    }).execute()
    return resp.data or []


def reciprocal_rank_fusion(
    ranked_lists: list[list[dict[str, Any]]],
    k: int | None = None,
    top_n: int | None = None,
) -> list[dict[str, Any]]:
    """Merge multiple ranked result lists using RRF.

    score(d) = sum over lists of 1 / (k + rank_in_list)
    """
    rrf_k = k or settings.rrf_k
    final_n = top_n or settings.top_k_final

    scores: dict[str, float] = {}
    doc_map: dict[str, dict[str, Any]] = {}

    for ranked in ranked_lists:
        for rank, doc in enumerate(ranked, start=1):
            doc_id = str(doc["id"])
            scores[doc_id] = scores.get(doc_id, 0.0) + 1.0 / (rrf_k + rank)
            doc_map[doc_id] = doc

    sorted_ids = sorted(scores, key=lambda d: scores[d], reverse=True)[:final_n]
    results = []
    for doc_id in sorted_ids:
        entry = dict(doc_map[doc_id])
        entry["rrf_score"] = scores[doc_id]
        results.append(entry)
    return results


async def hybrid_search(query: str, top_k: int | None = None) -> list[dict[str, Any]]:
    query_embedding = await embed_query(query)

    dense_results = await vector_search(query_embedding)
    sparse_results = await sparse_search(query)

    fused = reciprocal_rank_fusion(
        [dense_results, sparse_results],
        top_n=top_k or settings.top_k_final,
    )
    for doc in fused:
        doc["retrieval_method"] = "hybrid_rrf"
    return fused


async def ingest_document(
    content: str,
    metadata: dict[str, Any] | None = None,
    doc_id: str | None = None,
) -> dict[str, Any]:
    from retrieval.embeddings import embed_text
    import uuid

    embedding = await embed_text(content)
    record = {
        "id": doc_id or str(uuid.uuid4()),
        "content": content,
        "metadata": metadata or {},
        "embedding": _to_pgvector_str(embedding),
    }
    sb = get_supabase()
    resp = sb.table(settings.vector_table).upsert(record).execute()
    return resp.data[0] if resp.data else record
