"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  listDocuments,
  uploadFile,
  ingestText,
  deleteDocument,
} from "@/lib/api";
import type { DocumentInfo } from "@/lib/api";

const SECTIONS = [
  { value: "summary", label: "Summary" },
  { value: "experience", label: "Experience" },
  { value: "projects", label: "Projects" },
  { value: "education", label: "Education" },
  { value: "skills", label: "Skills" },
  { value: "documentation", label: "Documentation" },
  { value: "faq", label: "FAQ" },
  { value: "other", label: "Other" },
];

export default function KnowledgeManager() {
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Upload form state
  const [mode, setMode] = useState<"file" | "text">("file");
  const [section, setSection] = useState("other");
  const [title, setTitle] = useState("");
  const [textContent, setTextContent] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadDocs = useCallback(async () => {
    try {
      const data = await listDocuments();
      setDocuments(data.documents);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocs();
  }, [loadDocs]);

  async function handleFileUpload(file: File) {
    setUploading(true);
    setUploadResult(null);
    setError(null);

    try {
      const res = await uploadFile(file, section, title || file.name);
      setUploadResult(
        `Uploaded "${res.filename}" → ${res.chunks} chunk${
          res.chunks !== 1 ? "s" : ""
        } (${res.total_chars.toLocaleString()} chars) embedded in vector DB`
      );
      setTitle("");
      if (fileRef.current) fileRef.current.value = "";
      await loadDocs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleTextIngest() {
    if (!textContent.trim()) return;
    setUploading(true);
    setUploadResult(null);
    setError(null);

    try {
      const res = await ingestText(textContent, {
        section,
        title: title || "Manual entry",
      });
      setUploadResult(
        `Text ingested → doc ${res.doc_id.slice(0, 8)}... embedded in vector DB`
      );
      setTextContent("");
      setTitle("");
      await loadDocs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ingest failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(docId: string) {
    try {
      await deleteDocument(docId);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Upload Section */}
      <div className="bg-dgip-surface border border-dgip-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-dgip-border">
          <h2 className="text-sm font-semibold text-white">
            Add to Knowledge Base
          </h2>
          <p className="text-[10px] text-dgip-muted mt-0.5">
            Upload files or paste text. Content is chunked, embedded into
            768-dimensional vectors, and stored in Supabase pgvector for
            retrieval.
          </p>
        </div>

        <div className="p-5 space-y-4">
          {/* Mode toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setMode("file")}
              className={`text-xs px-3 py-1.5 rounded-lg transition-all ${
                mode === "file"
                  ? "bg-dgip-accent text-white"
                  : "bg-dgip-bg text-dgip-muted border border-dgip-border hover:text-dgip-text"
              }`}
            >
              Upload File
            </button>
            <button
              onClick={() => setMode("text")}
              className={`text-xs px-3 py-1.5 rounded-lg transition-all ${
                mode === "text"
                  ? "bg-dgip-accent text-white"
                  : "bg-dgip-bg text-dgip-muted border border-dgip-border hover:text-dgip-text"
              }`}
            >
              Paste Text
            </button>
          </div>

          {/* Metadata row */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[10px] text-dgip-muted uppercase tracking-wider block mb-1">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Company FAQ, Python Notes, Resume..."
                className="w-full bg-dgip-bg border border-dgip-border rounded-lg px-3 py-2 text-xs text-dgip-text placeholder:text-dgip-muted/50 focus:outline-none focus:border-dgip-accent/50"
              />
            </div>
            <div className="w-40">
              <label className="text-[10px] text-dgip-muted uppercase tracking-wider block mb-1">
                Section
              </label>
              <select
                value={section}
                onChange={(e) => setSection(e.target.value)}
                className="w-full bg-dgip-bg border border-dgip-border rounded-lg px-3 py-2 text-xs text-dgip-text focus:outline-none focus:border-dgip-accent/50"
              >
                {SECTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* File upload */}
          {mode === "file" && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                dragOver
                  ? "border-dgip-accent bg-dgip-accent/5"
                  : "border-dgip-border hover:border-dgip-accent/30"
              }`}
            >
              <div className="text-2xl mb-2">📄</div>
              <p className="text-xs text-dgip-text mb-1">
                Drag & drop a file here, or click to browse
              </p>
              <p className="text-[10px] text-dgip-muted">
                Supports: .txt, .md, .csv, .json, .log, .pdf
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".txt,.md,.csv,.json,.log,.pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
                className="hidden"
              />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="mt-3 px-4 py-2 bg-dgip-accent text-white text-xs rounded-lg hover:bg-dgip-accent/90 disabled:opacity-40 transition-all"
              >
                {uploading ? "Uploading & Embedding..." : "Choose File"}
              </button>
            </div>
          )}

          {/* Text input */}
          {mode === "text" && (
            <div className="space-y-3">
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Paste your text content here... It will be chunked and embedded as vector representations."
                rows={8}
                className="w-full bg-dgip-bg border border-dgip-border rounded-lg px-3 py-2.5 text-xs text-dgip-text placeholder:text-dgip-muted/50 focus:outline-none focus:border-dgip-accent/50 resize-y"
              />
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-dgip-muted">
                  {textContent.length.toLocaleString()} characters
                  {textContent.length > 2000 &&
                    ` → ~${Math.ceil(textContent.length / 2000)} chunks`}
                </span>
                <button
                  onClick={handleTextIngest}
                  disabled={uploading || !textContent.trim()}
                  className="px-4 py-2 bg-dgip-accent text-white text-xs rounded-lg hover:bg-dgip-accent/90 disabled:opacity-40 transition-all"
                >
                  {uploading ? "Embedding..." : "Ingest Text"}
                </button>
              </div>
            </div>
          )}

          {/* Feedback */}
          {uploadResult && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-dgip-success/10 border border-dgip-success/20 animate-fade-in">
              <span className="text-sm">✓</span>
              <p className="text-xs text-dgip-success">{uploadResult}</p>
            </div>
          )}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-dgip-error/10 border border-dgip-error/20 animate-fade-in">
              <span className="text-sm">✕</span>
              <p className="text-xs text-dgip-error">{error}</p>
            </div>
          )}
        </div>
      </div>

      {/* Processing explainer */}
      <div className="bg-dgip-bg/50 border border-dgip-border rounded-xl p-4">
        <h3 className="text-[10px] font-semibold text-dgip-accent uppercase tracking-wider mb-2">
          What happens when you upload
        </h3>
        <div className="flex flex-wrap gap-2 text-[10px]">
          {[
            { step: "1", label: "Parse file content", color: "#f59e0b" },
            { step: "2", label: "Chunk into ~2000 char segments", color: "#22d3ee" },
            { step: "3", label: "Generate 768d Gemini embeddings", color: "#6366f1" },
            { step: "4", label: "Store in Supabase pgvector", color: "#22c55e" },
            { step: "5", label: "Available for AI retrieval", color: "#a855f7" },
          ].map((item, i, arr) => (
            <span key={item.step} className="flex items-center gap-1.5">
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                style={{ background: item.color }}
              >
                {item.step}
              </span>
              <span className="text-dgip-text/80">{item.label}</span>
              {i < arr.length - 1 && (
                <span className="text-dgip-muted mx-0.5">→</span>
              )}
            </span>
          ))}
        </div>
      </div>

      {/* Document list */}
      <div className="bg-dgip-surface border border-dgip-border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-dgip-border flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">
              Stored Documents
            </h2>
            <p className="text-[10px] text-dgip-muted">
              {documents.length} document{documents.length !== 1 ? "s" : ""} in
              vector database
            </p>
          </div>
          <button
            onClick={() => {
              setLoading(true);
              loadDocs();
            }}
            className="text-[10px] text-dgip-muted hover:text-dgip-accent transition-colors px-2 py-1 rounded border border-dgip-border"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="p-8 flex items-center justify-center">
            <div className="flex gap-1">
              <span className="w-2 h-2 rounded-full bg-dgip-accent animate-pulse-dot" />
              <span className="w-2 h-2 rounded-full bg-dgip-accent animate-pulse-dot" style={{ animationDelay: "0.2s" }} />
              <span className="w-2 h-2 rounded-full bg-dgip-accent animate-pulse-dot" style={{ animationDelay: "0.4s" }} />
            </div>
          </div>
        ) : documents.length === 0 ? (
          <div className="p-8 text-center text-xs text-dgip-muted">
            No documents yet. Upload a file or paste text above.
          </div>
        ) : (
          <div className="divide-y divide-dgip-border/30">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="px-5 py-3 hover:bg-dgip-border/10 transition-colors group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-white truncate">
                        {String(
                          doc.metadata?.title ||
                            doc.metadata?.source_file ||
                            "Untitled"
                        )}
                      </span>
                      {doc.metadata?.section ? (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-dgip-accent/10 text-dgip-accent border border-dgip-accent/20">
                          {String(doc.metadata.section)}
                        </span>
                      ) : null}
                      {doc.metadata?.chunk ? (
                        <span className="text-[9px] text-dgip-muted">
                          chunk {String(doc.metadata.chunk)}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-[10px] text-dgip-muted line-clamp-2">
                      {doc.content_preview}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-[9px] text-dgip-muted/60">
                      <span>
                        {doc.content_length.toLocaleString()} characters
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="text-[10px] text-dgip-muted hover:text-dgip-error opacity-0 group-hover:opacity-100 transition-all px-2 py-1 rounded border border-dgip-border hover:border-dgip-error/50 shrink-0"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
