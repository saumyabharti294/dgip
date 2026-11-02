"""Shared state schema for the multi-agent graph."""
from __future__ import annotations

from typing import Any, Literal
from pydantic import BaseModel, Field


class Citation(BaseModel):
    doc_id: str
    content_snippet: str
    score: float
    metadata: dict[str, Any] = Field(default_factory=dict)


class AgentStep(BaseModel):
    agent: str
    action: str
    input_summary: str = ""
    output_summary: str = ""
    duration_ms: float = 0
    timestamp: str = ""


class GraphState(BaseModel):
    session_id: str = ""
    query: str = ""
    query_type: Literal["retrieval", "synthesis", "general", ""] = ""
    retrieved_docs: list[dict[str, Any]] = Field(default_factory=list)
    citations: list[Citation] = Field(default_factory=list)
    synthesis: str = ""
    verification_passed: bool = False
    verification_notes: str = ""
    final_answer: str = ""
    steps: list[AgentStep] = Field(default_factory=list)
    error: str = ""
    iteration: int = 0
    max_iterations: int = 3
