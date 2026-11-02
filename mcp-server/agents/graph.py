"""LangGraph multi-agent orchestration graph.

Graph topology:
  supervisor -> retriever -> synthesizer -> verifier
                                              |
                                    (if failed & iterations < max)
                                              |
                                        synthesizer (retry)
                                              |
                                           verifier
                                              |
                                            END
"""
from __future__ import annotations

import operator
from typing import Annotated, Any, TypedDict

from langgraph.graph import StateGraph, END

from agents.supervisor import supervisor_node
from agents.retriever import retriever_node
from agents.synthesizer import synthesizer_node, verifier_node
from agents.web_search import web_search_node


class AgentState(TypedDict, total=False):
    session_id: str
    query: str
    query_type: str
    retrieved_docs: list[dict[str, Any]]
    citations: list[dict[str, Any]]
    synthesis: str
    verification_passed: bool
    verification_notes: str
    final_answer: str
    steps: Annotated[list[dict[str, Any]], operator.add]
    error: str
    iteration: int
    max_iterations: int


def should_retrieve(state: AgentState) -> str:
    qt = state.get("query_type", "retrieval")
    if qt == "general":
        return "web_search"
    return "retrieve"


def should_retry(state: AgentState) -> str:
    if state.get("verification_passed"):
        return "end"
    if state.get("iteration", 0) >= state.get("max_iterations", 3):
        return "end"
    return "retry"


def build_graph():
    builder = StateGraph(AgentState)

    builder.add_node("supervisor", supervisor_node)
    builder.add_node("retriever", retriever_node)
    builder.add_node("synthesizer", synthesizer_node)
    builder.add_node("verifier", verifier_node)
    builder.add_node("web_search", web_search_node)

    builder.set_entry_point("supervisor")

    builder.add_conditional_edges("supervisor", should_retrieve, {
        "retrieve": "retriever",
        "web_search": "web_search",
        "synthesize": "synthesizer",
    })
    builder.add_edge("web_search", END)
    builder.add_edge("retriever", "synthesizer")
    builder.add_edge("synthesizer", "verifier")
    builder.add_conditional_edges("verifier", should_retry, {
        "retry": "synthesizer",
        "end": END,
    })

    return builder.compile()


agent_graph = build_graph()


async def run_agent_graph(query: str, session_id: str = "") -> dict:
    initial_state: AgentState = {
        "session_id": session_id,
        "query": query,
        "query_type": "",
        "retrieved_docs": [],
        "citations": [],
        "synthesis": "",
        "verification_passed": False,
        "verification_notes": "",
        "final_answer": "",
        "steps": [],
        "error": "",
        "iteration": 0,
        "max_iterations": 3,
    }

    try:
        result = await agent_graph.ainvoke(initial_state)
        if not result.get("final_answer"):
            result["final_answer"] = result.get("synthesis", "")
        return result
    except Exception as e:
        initial_state["error"] = str(e)
        initial_state["final_answer"] = f"Error during agent execution: {e}"
        return initial_state
