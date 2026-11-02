"use client";

import { useMemo } from "react";
import type { AgentStep, Citation } from "@/lib/api";

interface AgentPipelineProps {
  steps: AgentStep[];
  citations: Citation[];
  isProcessing: boolean;
}

const AGENT_META: Record<
  string,
  { label: string; icon: string; color: string; desc: string }
> = {
  supervisor: {
    label: "Supervisor",
    icon: "⚡",
    color: "#f59e0b",
    desc: "Routes query to the right pipeline",
  },
  retriever: {
    label: "Retriever",
    icon: "🔍",
    color: "#22d3ee",
    desc: "Hybrid search: vectors + keywords + RRF",
  },
  web_search: {
    label: "Web Search",
    icon: "🌐",
    color: "#3b82f6",
    desc: "Google Search grounded answers",
  },
  synthesizer: {
    label: "Synthesizer",
    icon: "🧠",
    color: "#6366f1",
    desc: "Generates grounded answer from sources",
  },
  verifier: {
    label: "Verifier",
    icon: "✓",
    color: "#22c55e",
    desc: "Checks claims against source documents",
  },
};

const PIPELINE_ORDER = [
  "supervisor",
  "retriever",
  "web_search",
  "synthesizer",
  "verifier",
];

export default function AgentPipeline({
  steps,
  citations,
  isProcessing,
}: AgentPipelineProps) {
  const activeAgents = useMemo(
    () => new Set(steps.map((s) => s.agent)),
    [steps]
  );

  const stepsByAgent = useMemo(() => {
    const map: Record<string, AgentStep[]> = {};
    for (const s of steps) {
      (map[s.agent] ??= []).push(s);
    }
    return map;
  }, [steps]);

  const totalDuration = useMemo(
    () => steps.reduce((sum, s) => sum + s.duration_ms, 0),
    [steps]
  );

  const lastAgent = steps.length > 0 ? steps[steps.length - 1].agent : null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-dgip-border">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-dgip-muted uppercase tracking-wider">
            Agent Pipeline
          </h2>
          {isProcessing && (
            <span className="flex items-center gap-1.5 text-[10px] text-dgip-accent">
              <span className="w-1.5 h-1.5 rounded-full bg-dgip-accent animate-glow" />
              Processing
            </span>
          )}
        </div>
        {steps.length > 0 && (
          <div className="flex gap-3 mt-2 text-[10px] text-dgip-muted">
            <span>{steps.length} steps</span>
            <span>{totalDuration.toFixed(0)}ms total</span>
            <span>{citations.length} citations</span>
          </div>
        )}
      </div>

      {/* Pipeline visualization */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="relative">
          {/* Vertical connector line */}
          <div className="absolute left-[18px] top-4 bottom-4 w-px bg-dgip-border" />

          <div className="space-y-1">
            {PIPELINE_ORDER.map((agentId, idx) => {
              const meta = AGENT_META[agentId];
              const isActive = activeAgents.has(agentId);
              const isCurrent = isProcessing && lastAgent === agentId;
              const agentSteps = stepsByAgent[agentId] || [];
              const agentDuration = agentSteps.reduce(
                (s, st) => s + st.duration_ms,
                0
              );

              return (
                <div key={agentId} className="relative">
                  {/* Node */}
                  <div
                    className={`flex items-start gap-3 p-2.5 rounded-lg transition-all ${
                      isCurrent
                        ? "bg-dgip-accent/10 border border-dgip-accent/30"
                        : isActive
                        ? "bg-dgip-surface/80"
                        : "opacity-40"
                    }`}
                  >
                    {/* Circle indicator */}
                    <div
                      className={`relative z-10 w-9 h-9 rounded-full flex items-center justify-center text-sm shrink-0 border-2 transition-all ${
                        isCurrent
                          ? "border-dgip-accent bg-dgip-accent/20 animate-glow"
                          : isActive
                          ? "bg-dgip-surface"
                          : "border-dgip-border bg-dgip-bg"
                      }`}
                      style={{
                        borderColor: isActive ? meta.color : undefined,
                      }}
                    >
                      {isCurrent ? (
                        <span className="animate-spin-slow">⟳</span>
                      ) : (
                        meta.icon
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span
                          className="text-xs font-semibold"
                          style={{ color: isActive ? meta.color : undefined }}
                        >
                          {meta.label}
                        </span>
                        {isActive && agentDuration > 0 && (
                          <span className="text-[10px] text-dgip-muted animate-count">
                            {agentDuration.toFixed(0)}ms
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-dgip-muted leading-tight mt-0.5">
                        {meta.desc}
                      </p>

                      {/* Step details */}
                      {agentSteps.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {agentSteps.map((step, si) => (
                            <div
                              key={si}
                              className="text-[10px] bg-dgip-bg/50 rounded px-2 py-1.5 animate-fade-in"
                            >
                              <div className="flex justify-between text-dgip-muted">
                                <span>{step.action}</span>
                                <span>{step.duration_ms.toFixed(0)}ms</span>
                              </div>
                              {step.output_summary && (
                                <p className="text-dgip-text/70 mt-0.5 line-clamp-2">
                                  {step.output_summary}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Arrow connector between nodes */}
                  {idx < PIPELINE_ORDER.length - 1 && (
                    <div className="flex justify-center py-0.5">
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        className="text-dgip-border"
                      >
                        <path
                          d="M6 0 L6 8 M3 5 L6 8 L9 5"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          fill="none"
                          className={
                            isActive && activeAgents.has(PIPELINE_ORDER[idx + 1])
                              ? "text-dgip-accent animate-flow"
                              : ""
                          }
                          strokeDasharray={
                            isActive && activeAgents.has(PIPELINE_ORDER[idx + 1])
                              ? "4 2"
                              : undefined
                          }
                        />
                      </svg>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Citations summary */}
        {citations.length > 0 && (
          <div className="mt-6 pt-4 border-t border-dgip-border">
            <h3 className="text-[10px] font-semibold text-dgip-muted uppercase tracking-wider mb-2">
              Source Citations
            </h3>
            <div className="space-y-1.5">
              {citations.map((cit, i) => (
                <div
                  key={cit.doc_id}
                  className="flex items-center gap-2 text-[10px] animate-fade-in"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div
                    className="w-6 h-6 rounded flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                    style={{
                      background: `hsl(${(i * 60 + 200) % 360}, 60%, 45%)`,
                    }}
                  >
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-dgip-text/80 truncate">
                      {cit.content_snippet.slice(0, 60)}...
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="h-1 flex-1 bg-dgip-bg rounded-full overflow-hidden">
                        <div
                          className="h-full bg-dgip-accent rounded-full"
                          style={{
                            width: `${Math.min(cit.score * 100, 100)}%`,
                          }}
                        />
                      </div>
                      <span className="text-dgip-muted">
                        {(cit.score * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Architecture info when idle */}
        {steps.length === 0 && !isProcessing && (
          <div className="space-y-4 mt-2">
            <div className="bg-dgip-bg/50 rounded-lg p-3 border border-dgip-border/50">
              <h3 className="text-[10px] font-semibold text-dgip-accent uppercase tracking-wider mb-2">
                How It Works
              </h3>
              <ol className="text-[10px] text-dgip-muted space-y-1.5 list-decimal list-inside">
                <li>
                  <span className="text-dgip-text/80">Supervisor</span> classifies your
                  query type
                </li>
                <li>
                  <span className="text-dgip-text/80">Retriever</span> runs hybrid
                  search (vectors + keywords)
                </li>
                <li>
                  <span className="text-dgip-text/80">Web Search</span> handles general
                  questions via Google
                </li>
                <li>
                  <span className="text-dgip-text/80">Synthesizer</span> generates a
                  grounded answer
                </li>
                <li>
                  <span className="text-dgip-text/80">Verifier</span> checks every
                  claim against sources
                </li>
              </ol>
            </div>

            <div className="bg-dgip-bg/50 rounded-lg p-3 border border-dgip-border/50">
              <h3 className="text-[10px] font-semibold text-dgip-accent2 uppercase tracking-wider mb-2">
                Tech Stack
              </h3>
              <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                {[
                  ["LLM", "Gemini 3.5"],
                  ["Vectors", "pgvector 768d"],
                  ["Search", "RRF Fusion"],
                  ["Agents", "LangGraph"],
                  ["Protocol", "MCP"],
                  ["Web", "Google Search"],
                  ["DB", "Supabase"],
                  ["API", "FastAPI"],
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-dgip-muted">{label}</span>
                    <span className="text-dgip-text/80">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
