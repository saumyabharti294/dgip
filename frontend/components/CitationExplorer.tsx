"use client";

import { useState } from "react";
import type { Citation } from "@/lib/api";

interface CitationExplorerProps {
  citations: Citation[];
}

export default function CitationExplorer({ citations }: CitationExplorerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"score" | "id">("score");

  if (citations.length === 0) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center h-64 text-dgip-muted text-sm">
        No citations yet. Send a query in the Chat tab to see grounded
        citations from the knowledge base.
      </div>
    );
  }

  const sorted = [...citations].sort((a, b) =>
    sortBy === "score" ? b.score - a.score : a.doc_id.localeCompare(b.doc_id)
  );
  const selected = selectedId
    ? citations.find((c) => c.doc_id === selectedId)
    : null;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-dgip-muted uppercase tracking-wider">
          {citations.length} Citations Retrieved
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setSortBy("score")}
            className={`text-xs px-3 py-1 rounded ${
              sortBy === "score"
                ? "bg-dgip-accent text-white"
                : "bg-dgip-surface text-dgip-muted border border-dgip-border"
            }`}
          >
            By Score
          </button>
          <button
            onClick={() => setSortBy("id")}
            className={`text-xs px-3 py-1 rounded ${
              sortBy === "id"
                ? "bg-dgip-accent text-white"
                : "bg-dgip-surface text-dgip-muted border border-dgip-border"
            }`}
          >
            By ID
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Citation list */}
        <div className="lg:col-span-2 space-y-3">
          {sorted.map((cit) => (
            <button
              key={cit.doc_id}
              onClick={() =>
                setSelectedId(
                  selectedId === cit.doc_id ? null : cit.doc_id
                )
              }
              className={`w-full text-left bg-dgip-surface border rounded-lg p-4 transition-colors ${
                selectedId === cit.doc_id
                  ? "border-dgip-accent"
                  : "border-dgip-border hover:border-dgip-border/80"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-dgip-accent2">
                  {cit.doc_id.slice(0, 12)}...
                </span>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-20 bg-dgip-bg rounded-full overflow-hidden">
                    <div
                      className="h-full bg-dgip-accent rounded-full"
                      style={{
                        width: `${Math.min(cit.score * 100, 100)}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-dgip-muted">
                    {(cit.score * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
              <p className="text-xs text-dgip-text line-clamp-3">
                {cit.content_snippet}
              </p>
            </button>
          ))}
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-1">
          {selected ? (
            <div className="bg-dgip-surface border border-dgip-accent rounded-lg p-4 sticky top-6">
              <h3 className="text-xs font-semibold text-dgip-accent uppercase mb-3">
                Citation Detail
              </h3>
              <dl className="space-y-3 text-xs">
                <div>
                  <dt className="text-dgip-muted">Document ID</dt>
                  <dd className="font-mono text-dgip-accent2 break-all">
                    {selected.doc_id}
                  </dd>
                </div>
                <div>
                  <dt className="text-dgip-muted">RRF Score</dt>
                  <dd className="text-dgip-text">
                    {selected.score.toFixed(6)}
                  </dd>
                </div>
                <div>
                  <dt className="text-dgip-muted">Content</dt>
                  <dd className="text-dgip-text whitespace-pre-wrap">
                    {selected.content_snippet}
                  </dd>
                </div>
                {Object.keys(selected.metadata).length > 0 && (
                  <div>
                    <dt className="text-dgip-muted">Metadata</dt>
                    <dd className="font-mono text-dgip-text bg-dgip-bg rounded p-2 mt-1 overflow-x-auto">
                      {JSON.stringify(selected.metadata, null, 2)}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          ) : (
            <div className="bg-dgip-surface border border-dgip-border rounded-lg p-6 text-center text-xs text-dgip-muted sticky top-6">
              Select a citation to see details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
