"""Session persistence via Supabase PostgreSQL.

Stores agent graph state checkpoints so conversations survive restarts.
"""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Any

from db.supabase_client import get_supabase


def create_session(metadata: dict[str, Any] | None = None) -> str:
    session_id = str(uuid.uuid4())
    sb = get_supabase()
    sb.table("sessions").insert({
        "id": session_id,
        "state": json.dumps({}),
        "metadata": json.dumps(metadata or {}),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }).execute()
    return session_id


def save_checkpoint(session_id: str, state: dict[str, Any]) -> None:
    sb = get_supabase()
    sb.table("sessions").update({
        "state": json.dumps(state, default=str),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", session_id).execute()


def load_checkpoint(session_id: str) -> dict[str, Any] | None:
    sb = get_supabase()
    resp = sb.table("sessions").select("state").eq("id", session_id).single().execute()
    if resp.data:
        return json.loads(resp.data["state"])
    return None


def list_sessions(limit: int = 20) -> list[dict[str, Any]]:
    sb = get_supabase()
    resp = (
        sb.table("sessions")
        .select("id, metadata, created_at, updated_at")
        .order("updated_at", desc=True)
        .limit(limit)
        .execute()
    )
    return resp.data or []
