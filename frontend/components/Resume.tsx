"use client";

import { useState, useEffect } from "react";
import { getResume } from "@/lib/api";
import type { ResumeSection } from "@/lib/api";

const SECTION_META: Record<string, { icon: string; color: string; label: string }> = {
  summary: { icon: "📋", color: "#6366f1", label: "Summary" },
  experience: { icon: "💼", color: "#f59e0b", label: "Experience" },
  projects: { icon: "🚀", color: "#22d3ee", label: "Projects" },
  education: { icon: "🎓", color: "#22c55e", label: "Education" },
  skills: { icon: "⚡", color: "#a855f7", label: "Skills" },
  documentation: { icon: "📖", color: "#3b82f6", label: "Documentation" },
  faq: { icon: "❓", color: "#ec4899", label: "FAQ" },
  other: { icon: "📄", color: "#64748b", label: "Other" },
};

export default function Resume() {
  const [sections, setSections] = useState<ResumeSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      try {
        const data = await getResume();
        setSections(data.sections);
        setExpandedSections(new Set(data.sections.map((s) => s.section)));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load resume data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex gap-1">
          <span className="w-2 h-2 rounded-full bg-dgip-accent animate-pulse-dot" />
          <span className="w-2 h-2 rounded-full bg-dgip-accent animate-pulse-dot" style={{ animationDelay: "0.2s" }} />
          <span className="w-2 h-2 rounded-full bg-dgip-accent animate-pulse-dot" style={{ animationDelay: "0.4s" }} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto p-6 bg-dgip-surface border border-dgip-error/30 rounded-xl text-dgip-error text-sm">
        {error}. Make sure the backend is running.
      </div>
    );
  }

  if (sections.length === 0) {
    return (
      <div className="max-w-3xl mx-auto text-center text-dgip-muted py-12">
        <p className="text-sm">No documents found in the knowledge base.</p>
        <p className="text-xs mt-2">Ingest documents via /api/ingest to populate this section.</p>
      </div>
    );
  }

  const totalDocs = sections.reduce((a, s) => a + s.documents.length, 0);

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-base font-semibold text-white">Knowledge Base</h2>
          <p className="text-[10px] text-dgip-muted mt-0.5">
            Documents stored in Supabase pgvector &middot; Embedded with Gemini 768-dimensional vectors
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-lg font-bold text-white">{totalDocs}</p>
            <p className="text-[10px] text-dgip-muted">documents</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-dgip-accent">{sections.length}</p>
            <p className="text-[10px] text-dgip-muted">sections</p>
          </div>
        </div>
      </div>

      {/* How retrieval works */}
      <div className="bg-dgip-surface/50 border border-dgip-border rounded-xl p-3 flex items-center gap-3 text-[10px] text-dgip-muted">
        <span className="text-base">💡</span>
        <p>
          When you ask a question in Chat, the <span className="text-dgip-accent">Retriever agent</span> converts
          your query into a 768-dimensional vector, searches these documents using{" "}
          <span className="text-cyan-400">cosine similarity</span> + <span className="text-cyan-400">keyword matching</span>,
          then fuses results with <span className="text-amber-400">Reciprocal Rank Fusion</span>.
        </p>
      </div>

      {/* Sections */}
      {sections.map((section) => {
        const meta = SECTION_META[section.section] || SECTION_META.other;
        const isExpanded = expandedSections.has(section.section);

        return (
          <div
            key={section.section}
            className="bg-dgip-surface border border-dgip-border rounded-xl overflow-hidden transition-all"
            style={{ borderColor: isExpanded ? `${meta.color}30` : undefined }}
          >
            <button
              onClick={() => toggleSection(section.section)}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-dgip-border/10 transition-colors"
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0"
                style={{ background: `${meta.color}15`, border: `1px solid ${meta.color}30` }}
              >
                {meta.icon}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-white">{meta.label}</span>
                <span className="text-[10px] text-dgip-muted ml-2">
                  {section.documents.length} document{section.documents.length !== 1 ? "s" : ""}
                </span>
              </div>
              <span
                className={`text-dgip-muted text-xs transition-transform duration-200 ${
                  isExpanded ? "rotate-180" : ""
                }`}
              >
                ▾
              </span>
            </button>

            {isExpanded && (
              <div className="border-t border-dgip-border/50">
                {section.documents.map((doc, di) => (
                  <div
                    key={doc.id}
                    className="px-4 py-4 border-b border-dgip-border/30 last:border-b-0 animate-fade-in"
                    style={{ animationDelay: `${di * 50}ms` }}
                  >
                    <p className="text-sm text-dgip-text whitespace-pre-wrap leading-relaxed">
                      {doc.content}
                    </p>
                    {doc.metadata && Object.entries(doc.metadata).filter(([k]) => !["section", "type"].includes(k)).length > 0 && (
                      <div className="flex flex-wrap items-center gap-2 mt-3">
                        {Object.entries(doc.metadata)
                          .filter(([k]) => !["section", "type"].includes(k))
                          .map(([key, val]) => (
                            <span
                              key={key}
                              className="text-[9px] px-1.5 py-0.5 rounded border"
                              style={{
                                color: meta.color,
                                borderColor: `${meta.color}30`,
                                background: `${meta.color}08`,
                              }}
                            >
                              {key}: {String(val)}
                            </span>
                          ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
