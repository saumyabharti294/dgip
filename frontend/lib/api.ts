const API_URL = "/api/proxy";

export interface Citation {
  doc_id: string;
  content_snippet: string;
  score: number;
  metadata: Record<string, unknown>;
}

export interface AgentStep {
  agent: string;
  action: string;
  input_summary: string;
  output_summary: string;
  duration_ms: number;
  timestamp: string;
}

export interface ChatResponse {
  session_id: string;
  answer: string;
  citations: Citation[];
  steps: AgentStep[];
  verification_passed: boolean;
  total_duration_ms: number;
}

export interface HealthResponse {
  overall: string;
  components: Record<string, { status: string; error?: string }>;
  timestamp: string;
}

export async function sendChat(
  query: string,
  sessionId?: string
): Promise<ChatResponse> {
  const res = await fetch(`${API_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, session_id: sessionId }),
  });
  if (!res.ok) throw new Error(`Chat failed: ${res.status}`);
  return res.json();
}

export async function getHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_URL}/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
  return res.json();
}

export async function getSessions(): Promise<{ sessions: Array<Record<string, unknown>> }> {
  const res = await fetch(`${API_URL}/sessions`);
  if (!res.ok) throw new Error(`Sessions fetch failed: ${res.status}`);
  return res.json();
}

export async function getTelemetry(
  limit = 50
): Promise<{ events: Array<Record<string, unknown>>; total_stored: number }> {
  const res = await fetch(`${API_URL}/telemetry?limit=${limit}`);
  if (!res.ok) throw new Error(`Telemetry fetch failed: ${res.status}`);
  return res.json();
}

export async function getMCPTools(): Promise<{ tools: Array<Record<string, unknown>> }> {
  const res = await fetch(`${API_URL}/mcp/tools`);
  if (!res.ok) throw new Error(`MCP tools fetch failed: ${res.status}`);
  return res.json();
}

export interface ResumeSection {
  section: string;
  documents: Array<{
    id: string;
    content: string;
    metadata: Record<string, unknown>;
  }>;
}

export interface ResumeResponse {
  sections: ResumeSection[];
  total_documents: number;
}

export async function getResume(): Promise<ResumeResponse> {
  const res = await fetch(`${API_URL}/resume`);
  if (!res.ok) throw new Error(`Resume fetch failed: ${res.status}`);
  return res.json();
}

// ─── Document management ────────────────────────────────────────────────────

export interface DocumentInfo {
  id: string;
  content_preview: string;
  metadata: Record<string, unknown>;
  content_length: number;
}

export async function listDocuments(): Promise<{
  documents: DocumentInfo[];
  total: number;
}> {
  const res = await fetch(`${API_URL}/documents`);
  if (!res.ok) throw new Error(`Document list failed: ${res.status}`);
  return res.json();
}

export async function uploadFile(
  file: File,
  section: string,
  title: string
): Promise<{
  status: string;
  filename: string;
  chunks: number;
  doc_ids: string[];
  total_chars: number;
}> {
  const form = new FormData();
  form.append("file", file);
  form.append("section", section);
  form.append("title", title);

  const res = await fetch(`${API_URL}/upload`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Upload failed: ${res.status}`);
  }
  return res.json();
}

export async function ingestText(
  content: string,
  metadata: Record<string, unknown> = {}
): Promise<{ status: string; doc_id: string }> {
  const res = await fetch(`${API_URL}/ingest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, metadata }),
  });
  if (!res.ok) throw new Error(`Ingest failed: ${res.status}`);
  return res.json();
}

export async function deleteDocument(docId: string): Promise<void> {
  const res = await fetch(`${API_URL}/documents/${docId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
}
