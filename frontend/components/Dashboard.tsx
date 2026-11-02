"use client";

import { useEffect, useState } from "react";
import { getHealth, getTelemetry, getMCPTools } from "@/lib/api";

interface HealthData {
  overall: string;
  components: Record<string, { status: string; error?: string }>;
  timestamp: string;
}

const COMPONENT_META: Record<string, { icon: string; desc: string }> = {
  api: { icon: "⚙", desc: "FastAPI Server" },
  database: { icon: "🗄", desc: "Supabase PostgreSQL + pgvector" },
  embedding_service: { icon: "📐", desc: "Gemini Embeddings (768d)" },
  agent_graph: { icon: "🔀", desc: "LangGraph Multi-Agent" },
};

export default function Dashboard() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [telemetry, setTelemetry] = useState<{
    events: Array<Record<string, unknown>>;
    total_stored: number;
  } | null>(null);
  const [tools, setTools] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [h, t, m] = await Promise.all([
          getHealth().catch(() => null),
          getTelemetry(20).catch(() => null),
          getMCPTools().catch(() => null),
        ]);
        if (h) setHealth(h);
        if (t) setTelemetry(t);
        if (m) setTools(m.tools);
      } finally {
        setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  const statusColor = (status: string) =>
    status === "healthy"
      ? "bg-dgip-success"
      : status === "degraded"
      ? "bg-dgip-warning"
      : "bg-dgip-error";

  const statusBorder = (status: string) =>
    status === "healthy"
      ? "border-dgip-success/30"
      : status === "degraded"
      ? "border-dgip-warning/30"
      : "border-dgip-error/30";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-dgip-muted text-sm">
        <div className="flex gap-1">
          <span className="w-2 h-2 rounded-full bg-dgip-accent animate-pulse-dot" />
          <span className="w-2 h-2 rounded-full bg-dgip-accent animate-pulse-dot" style={{ animationDelay: "0.2s" }} />
          <span className="w-2 h-2 rounded-full bg-dgip-accent animate-pulse-dot" style={{ animationDelay: "0.4s" }} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Overall Status Banner */}
      <div
        className={`rounded-xl p-4 border ${
          health?.overall === "healthy"
            ? "bg-dgip-success/5 border-dgip-success/20"
            : "bg-dgip-error/5 border-dgip-error/20"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className={`w-3 h-3 rounded-full ${
                health?.overall === "healthy" ? "bg-dgip-success animate-pulse-dot" : "bg-dgip-error"
              }`}
            />
            <div>
              <span className="text-sm font-medium text-white">
                System {health?.overall === "healthy" ? "Operational" : "Degraded"}
              </span>
              <p className="text-[10px] text-dgip-muted">
                {health?.timestamp
                  ? `Last check: ${new Date(health.timestamp).toLocaleTimeString()}`
                  : "Backend not reachable"}
              </p>
            </div>
          </div>
          <div className="text-right text-[10px] text-dgip-muted">
            <p>{telemetry?.total_stored ?? 0} telemetry events</p>
            <p>{tools.length} MCP tools registered</p>
          </div>
        </div>
      </div>

      {/* Component Health Grid */}
      <section>
        <h2 className="text-xs font-semibold text-dgip-muted uppercase tracking-wider mb-3">
          System Components
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {health?.components &&
            Object.entries(health.components).map(([name, info]) => {
              const meta = COMPONENT_META[name] || { icon: "•", desc: name };
              return (
                <div
                  key={name}
                  className={`bg-dgip-surface border rounded-xl p-4 transition-all hover:border-dgip-accent/30 ${statusBorder(
                    info.status
                  )}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-base">{meta.icon}</span>
                    <span
                      className={`w-2 h-2 rounded-full ${statusColor(info.status)}`}
                    />
                  </div>
                  <p className="text-xs font-medium text-white capitalize">
                    {name.replace(/_/g, " ")}
                  </p>
                  <p className="text-[10px] text-dgip-muted mt-0.5">
                    {meta.desc}
                  </p>
                  {info.error && (
                    <p className="text-[10px] text-dgip-error mt-1 truncate">
                      {info.error}
                    </p>
                  )}
                </div>
              );
            })}
          {!health && (
            <div className="col-span-full text-sm text-dgip-muted bg-dgip-surface border border-dgip-border rounded-xl p-6 text-center">
              Backend not reachable — start the FastAPI server.
            </div>
          )}
        </div>
      </section>

      {/* Architecture Diagram */}
      <section>
        <h2 className="text-xs font-semibold text-dgip-muted uppercase tracking-wider mb-3">
          System Architecture
        </h2>
        <div className="bg-dgip-surface border border-dgip-border rounded-xl p-6">
          <div className="flex flex-col items-center gap-2 text-[10px]">
            {/* User */}
            <div className="px-4 py-2 rounded-lg bg-dgip-bg border border-dgip-border text-dgip-text text-xs">
              User Query
            </div>
            <span className="text-dgip-muted">↓</span>

            {/* Frontend + Proxy */}
            <div className="px-4 py-2 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs">
              Next.js Frontend → API Proxy
            </div>
            <span className="text-dgip-muted">↓</span>

            {/* FastAPI */}
            <div className="px-4 py-2 rounded-lg bg-dgip-accent/10 border border-dgip-accent/30 text-dgip-accent text-xs">
              FastAPI Backend (MCP Server)
            </div>
            <span className="text-dgip-muted">↓</span>

            {/* Agent Graph */}
            <div className="w-full max-w-lg bg-dgip-bg rounded-xl border border-dgip-border p-4">
              <p className="text-center text-[10px] text-dgip-muted uppercase tracking-wider mb-3">
                LangGraph Agent Orchestration
              </p>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {[
                  { name: "Supervisor", color: "#f59e0b" },
                  { name: "Retriever", color: "#22d3ee" },
                  { name: "Web Search", color: "#3b82f6" },
                  { name: "Synthesizer", color: "#6366f1" },
                  { name: "Verifier", color: "#22c55e" },
                ].map((agent, i, arr) => (
                  <span key={agent.name} className="flex items-center gap-2">
                    <span
                      className="px-2 py-1 rounded text-[10px] font-medium border"
                      style={{
                        color: agent.color,
                        borderColor: `${agent.color}40`,
                        background: `${agent.color}10`,
                      }}
                    >
                      {agent.name}
                    </span>
                    {i < arr.length - 1 && (
                      <span className="text-dgip-muted text-[10px]">→</span>
                    )}
                  </span>
                ))}
              </div>
            </div>

            {/* Data stores row */}
            <div className="flex gap-4 mt-2">
              <span className="text-dgip-muted">↙</span>
              <span className="text-dgip-muted">↓</span>
              <span className="text-dgip-muted">↘</span>
            </div>
            <div className="flex gap-3 flex-wrap justify-center">
              <div className="px-3 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px]">
                Supabase pgvector
              </div>
              <div className="px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[10px]">
                Google Search API
              </div>
              <div className="px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px]">
                Gemini LLM + Embeddings
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MCP Tools */}
      <section>
        <h2 className="text-xs font-semibold text-dgip-muted uppercase tracking-wider mb-3">
          MCP Tool Registry
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {tools.map((tool) => (
            <div
              key={String(tool.name)}
              className="bg-dgip-surface border border-dgip-border rounded-xl p-4 hover:border-dgip-accent/30 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-dgip-accent/10 text-dgip-accent border border-dgip-accent/20">
                  MCP
                </span>
                <h3 className="text-xs font-medium text-white">
                  {String(tool.name)}
                </h3>
              </div>
              <p className="text-[10px] text-dgip-muted">
                {String(tool.description)}
              </p>
            </div>
          ))}
          {tools.length === 0 && (
            <div className="col-span-full text-xs text-dgip-muted bg-dgip-surface border border-dgip-border rounded-xl p-6 text-center">
              No tools loaded.
            </div>
          )}
        </div>
      </section>

      {/* Telemetry */}
      <section>
        <h2 className="text-xs font-semibold text-dgip-muted uppercase tracking-wider mb-3">
          Recent Activity ({telemetry?.total_stored ?? 0} events)
        </h2>
        <div className="bg-dgip-surface border border-dgip-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-dgip-border text-dgip-muted">
                  <th className="px-4 py-2.5 text-left font-medium">Time</th>
                  <th className="px-4 py-2.5 text-left font-medium">Type</th>
                  <th className="px-4 py-2.5 text-left font-medium">Duration</th>
                  <th className="px-4 py-2.5 text-left font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {telemetry?.events?.map((evt, i) => (
                  <tr
                    key={i}
                    className="border-b border-dgip-border/30 hover:bg-dgip-border/10"
                  >
                    <td className="px-4 py-2 text-dgip-muted font-mono">
                      {String(evt.recorded_at ?? "").slice(11, 19)}
                    </td>
                    <td className="px-4 py-2 text-dgip-text">
                      {String(evt.type ?? evt.tool ?? "—")}
                    </td>
                    <td className="px-4 py-2 text-dgip-accent2">
                      {evt.duration_ms ? `${evt.duration_ms}ms` : "—"}
                    </td>
                    <td className="px-4 py-2 text-dgip-muted truncate max-w-xs">
                      {String(evt.query ?? evt.tool ?? "").slice(0, 80)}
                    </td>
                  </tr>
                ))}
                {(!telemetry?.events || telemetry.events.length === 0) && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-6 text-center text-dgip-muted"
                    >
                      No telemetry events yet. Send a chat query to generate activity.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
