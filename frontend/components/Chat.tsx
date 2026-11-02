"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { sendChat } from "@/lib/api";
import type { AgentStep, Citation, ChatResponse } from "@/lib/api";

interface Message {
  role: "user" | "assistant";
  content: string;
  response?: ChatResponse;
}

interface ChatProps {
  onStepsUpdate: (steps: AgentStep[]) => void;
  onCitationsUpdate: (citations: Citation[]) => void;
  onProcessingChange: (processing: boolean) => void;
}

const STORAGE_KEY = "dgip_chat_messages";
const SESSION_KEY = "dgip_session_id";

function loadMessages(): Message[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveMessages(msgs: Message[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs));
  } catch {}
}

function getRouteLabel(steps: AgentStep[]): string {
  const agents = steps.map((s) => s.agent);
  if (agents.includes("web_search")) return "Web Search Pipeline";
  if (agents.includes("retriever")) return "Knowledge Base Pipeline";
  return "Direct Pipeline";
}

function getRouteColor(steps: AgentStep[]): string {
  const agents = steps.map((s) => s.agent);
  if (agents.includes("web_search")) return "text-blue-400 bg-blue-400/10 border-blue-400/20";
  if (agents.includes("retriever")) return "text-cyan-400 bg-cyan-400/10 border-cyan-400/20";
  return "text-indigo-400 bg-indigo-400/10 border-indigo-400/20";
}

export default function Chat({
  onStepsUpdate,
  onCitationsUpdate,
  onProcessingChange,
}: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const scrollRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      const saved = loadMessages();
      if (saved.length > 0) setMessages(saved);
      try {
        const sid = localStorage.getItem(SESSION_KEY);
        if (sid) setSessionId(sid);
      } catch {}
    }
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    if (initialized.current && messages.length > 0) {
      saveMessages(messages);
    }
  }, [messages]);

  useEffect(() => {
    if (sessionId) {
      try {
        localStorage.setItem(SESSION_KEY, sessionId);
      } catch {}
    }
  }, [sessionId]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setSessionId(undefined);
    onStepsUpdate([]);
    onCitationsUpdate([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(SESSION_KEY);
    } catch {}
  }, [onStepsUpdate, onCitationsUpdate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const query = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: query }]);
    setLoading(true);
    onProcessingChange(true);

    try {
      const res = await sendChat(query, sessionId);
      setSessionId(res.session_id);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.answer, response: res },
      ]);
      onStepsUpdate(res.steps);
      onCitationsUpdate(res.citations);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Error: ${
            err instanceof Error ? err.message : "Request failed"
          }. Make sure the backend is running.`,
        },
      ]);
    } finally {
      setLoading(false);
      onProcessingChange(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-10rem)]">
      {/* Header with clear */}
      {messages.length > 0 && (
        <div className="flex justify-end pb-2">
          <button
            onClick={clearChat}
            className="text-[10px] text-dgip-muted hover:text-dgip-error transition-colors px-2 py-1 rounded border border-dgip-border hover:border-dgip-error/50"
          >
            Clear chat
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-dgip-muted">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-dgip-accent to-purple-600 flex items-center justify-center mb-4 text-2xl text-white font-bold">
              DG
            </div>
            <p className="text-sm font-medium text-white">
              What would you like to know?
            </p>
            <p className="text-xs text-dgip-muted mt-1 max-w-md text-center">
              Ask about your uploaded documents or any general question.
              Watch the agent pipeline on the right as AI agents collaborate to answer.
            </p>
            <div className="flex flex-wrap gap-2 mt-6 justify-center">
              {[
                "What documents are in the knowledge base?",
                "How does quantum computing work?",
                "Summarize the key information",
                "What is React Server Components?",
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    setInput(q);
                  }}
                  className="text-[11px] px-3 py-1.5 rounded-full border border-dgip-border text-dgip-muted hover:text-dgip-text hover:border-dgip-accent/50 transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${
              msg.role === "user" ? "justify-end" : "justify-start"
            } animate-fade-in`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                msg.role === "user"
                  ? "bg-gradient-to-r from-dgip-accent to-purple-600 text-white"
                  : "bg-dgip-surface border border-dgip-border text-dgip-text"
              }`}
            >
              <p className="whitespace-pre-wrap leading-relaxed">
                {msg.content}
              </p>
              {msg.response && (
                <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                  {/* Route badge */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${getRouteColor(
                        msg.response.steps
                      )}`}
                    >
                      {getRouteLabel(msg.response.steps)}
                    </span>
                    <span className="text-[10px] text-dgip-muted">
                      {msg.response.verification_passed ? "✓ Verified" : "⚠ Unverified"}
                    </span>
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center gap-3 text-[10px] text-dgip-muted">
                    <span>{msg.response.total_duration_ms.toFixed(0)}ms</span>
                    <span>{msg.response.steps.length} agents</span>
                    <span>{msg.response.citations.length} sources</span>
                  </div>

                  {/* Agent flow */}
                  <div className="flex flex-wrap items-center gap-1">
                    {msg.response.steps.map((step, j) => (
                      <span key={j} className="contents">
                        <span
                          className="inline-block px-1.5 py-0.5 rounded text-[9px] font-medium bg-dgip-bg/50 border border-dgip-border"
                          title={`${step.action}: ${step.output_summary}`}
                        >
                          {step.agent}
                          <span className="text-dgip-muted ml-1">
                            {step.duration_ms.toFixed(0)}ms
                          </span>
                        </span>
                        {j < msg.response!.steps.length - 1 && (
                          <span className="text-dgip-muted text-[8px]">→</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start animate-fade-in">
            <div className="bg-dgip-surface border border-dgip-accent/30 rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-dgip-accent animate-pulse-dot" />
                  <span
                    className="w-2 h-2 rounded-full bg-dgip-accent animate-pulse-dot"
                    style={{ animationDelay: "0.2s" }}
                  />
                  <span
                    className="w-2 h-2 rounded-full bg-dgip-accent animate-pulse-dot"
                    style={{ animationDelay: "0.4s" }}
                  />
                </div>
                <span className="text-[10px] text-dgip-accent">
                  Agents are working...
                </span>
              </div>
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="flex gap-2 pt-3 border-t border-dgip-border"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything — your documents or general questions..."
          className="flex-1 bg-dgip-surface border border-dgip-border rounded-xl px-4 py-3 text-sm text-dgip-text placeholder:text-dgip-muted/60 focus:outline-none focus:border-dgip-accent/50 transition-colors"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-5 py-3 bg-gradient-to-r from-dgip-accent to-purple-600 text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          Send
        </button>
      </form>
    </div>
  );
}
