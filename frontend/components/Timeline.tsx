"use client";

import type { AgentStep } from "@/lib/api";

interface TimelineProps {
  steps: AgentStep[];
}

const agentColors: Record<string, string> = {
  supervisor: "border-yellow-400 bg-yellow-400/10 text-yellow-400",
  retriever: "border-cyan-400 bg-cyan-400/10 text-cyan-400",
  synthesizer: "border-indigo-400 bg-indigo-400/10 text-indigo-400",
  verifier: "border-green-400 bg-green-400/10 text-green-400",
};

export default function Timeline({ steps }: TimelineProps) {
  if (steps.length === 0) {
    return (
      <div className="max-w-3xl mx-auto flex items-center justify-center h-64 text-dgip-muted text-sm">
        No execution steps yet. Send a query in the Chat tab to see the agent
        execution timeline.
      </div>
    );
  }

  const totalDuration = steps.reduce((sum, s) => sum + s.duration_ms, 0);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Summary bar */}
      <div className="bg-dgip-surface border border-dgip-border rounded-lg p-4 flex items-center justify-between">
        <div className="text-sm text-dgip-text">
          <span className="font-medium">{steps.length}</span> agent steps
        </div>
        <div className="text-sm text-dgip-accent2">
          Total: {totalDuration.toFixed(0)}ms
        </div>
      </div>

      {/* Gantt-style bars */}
      <div className="bg-dgip-surface border border-dgip-border rounded-lg p-4">
        <h3 className="text-xs font-semibold text-dgip-muted uppercase tracking-wider mb-3">
          Execution Waterfall
        </h3>
        <div className="space-y-2">
          {steps.map((step, i) => {
            const widthPct =
              totalDuration > 0
                ? Math.max((step.duration_ms / totalDuration) * 100, 4)
                : 100 / steps.length;
            return (
              <div key={i} className="flex items-center gap-3">
                <span className="w-24 text-xs text-dgip-muted text-right shrink-0">
                  {step.agent}
                </span>
                <div className="flex-1 h-6 bg-dgip-bg rounded overflow-hidden relative">
                  <div
                    className={`h-full rounded ${
                      agentColors[step.agent]?.split(" ")[1] ??
                      "bg-dgip-accent/30"
                    } transition-all`}
                    style={{ width: `${widthPct}%` }}
                  />
                  <span className="absolute inset-0 flex items-center px-2 text-[10px] text-dgip-text">
                    {step.action} — {step.duration_ms.toFixed(0)}ms
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail cards */}
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-px bg-dgip-border" />
        <div className="space-y-4 pl-10">
          {steps.map((step, i) => {
            const colors =
              agentColors[step.agent] ?? "border-dgip-border bg-dgip-surface text-dgip-text";
            return (
              <div key={i} className="relative">
                <div
                  className={`absolute -left-[1.65rem] top-3 w-3 h-3 rounded-full border-2 ${
                    colors.split(" ")[0]
                  } bg-dgip-bg`}
                />
                <div
                  className={`border rounded-lg p-4 ${colors
                    .split(" ")
                    .slice(0, 2)
                    .join(" ")}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-semibold uppercase ${
                          colors.split(" ")[2]
                        }`}
                      >
                        {step.agent}
                      </span>
                      <span className="text-xs text-dgip-muted">
                        {step.action}
                      </span>
                    </div>
                    <span className="text-xs text-dgip-muted">
                      {step.duration_ms.toFixed(0)}ms
                    </span>
                  </div>
                  {step.input_summary && (
                    <p className="text-xs text-dgip-muted mb-1">
                      <span className="text-dgip-text/60">In:</span>{" "}
                      {step.input_summary}
                    </p>
                  )}
                  {step.output_summary && (
                    <p className="text-xs text-dgip-text">
                      <span className="text-dgip-text/60">Out:</span>{" "}
                      {step.output_summary}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
