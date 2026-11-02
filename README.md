# DGIP — Distributed Genetic Intelligence Platform

Production-grade multi-agent hybrid retrieval system with MCP integration. **$0 budget — all free tiers.**

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Next.js Frontend                    │
│         (Vercel Free Tier — Dashboard/Chat)          │
│  ┌──────────┬──────────┬────────────┬─────────────┐ │
│  │Dashboard │  Chat    │  Timeline  │  Citations   │ │
│  └──────────┴──────────┴────────────┴─────────────┘ │
└──────────────────────┬──────────────────────────────┘
                       │ REST API
┌──────────────────────▼──────────────────────────────┐
│              FastAPI Backend (Codespaces)             │
│  ┌────────────────────────────────────────────────┐ │
│  │           MCP Server Module                     │ │
│  │  query_knowledge_base │ vector_store_upsert     │ │
│  │  system_health        │ query_telemetry         │ │
│  └───────────┬────────────────────────────────────┘ │
│  ┌───────────▼────────────────────────────────────┐ │
│  │        LangGraph Multi-Agent Graph              │ │
│  │                                                 │ │
│  │  Supervisor ──► Retriever ──► Synthesizer       │ │
│  │  (Router)       (Hybrid)      (Gemini)          │ │
│  │                                  │              │ │
│  │                              Verifier           │ │
│  │                          (retry loop)           │ │
│  └───────────┬────────────────────────────────────┘ │
│  ┌───────────▼────────────────────────────────────┐ │
│  │        Hybrid Retrieval Engine                  │ │
│  │  Dense (Gemini embeddings) + Sparse (tsvector)  │ │
│  │  → Reciprocal Rank Fusion (RRF)                │ │
│  └────────────────────────────────────────────────┘ │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│           Supabase (Free Tier)                       │
│  PostgreSQL + pgvector + Full-Text Search            │
│  Sessions table (agent state checkpointing)          │
└─────────────────────────────────────────────────────┘
```

## Free Tier Stack

| Component | Service | Tier |
|-----------|---------|------|
| LLM & Embeddings | Google AI Studio (Gemini API) | Free |
| Vector DB & SQL | Supabase | Free Starter |
| Backend Hosting | GitHub Codespaces | 120 hrs/mo free |
| Frontend Hosting | Vercel | Hobby (free) |
| Agent Orchestration | LangGraph (local) | OSS |

## Quick Start

### 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run `mcp-server/supabase_migration.sql` in the SQL Editor
3. Copy your project URL, anon key, and service key

### 2. Configure Environment

```bash
cd mcp-server
cp .env.example .env
# Edit .env with your keys:
#   GEMINI_API_KEY     — from aistudio.google.dev
#   SUPABASE_URL       — from Supabase dashboard
#   SUPABASE_SERVICE_KEY — from Supabase dashboard
```

### 3. Run Backend

```bash
cd mcp-server
pip install -r requirements.txt
python main.py
# API at http://localhost:8000
# Docs at http://localhost:8000/docs
```

### 4. Run Frontend

```bash
cd frontend
npm install
npm run dev
# UI at http://localhost:3000
```

### 5. Deploy

- **Backend**: Push to GitHub → open in Codespaces → port forward 8000
- **Frontend**: Push to GitHub → connect to Vercel → auto-deploys
- Set `NEXT_PUBLIC_API_URL` in Vercel to your Codespaces URL

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat` | POST | Multi-agent query (full pipeline) |
| `/api/mcp/tools` | GET | MCP tool discovery |
| `/api/mcp/call` | POST | MCP tool invocation |
| `/api/ingest` | POST | Document ingestion |
| `/api/search` | POST | Direct hybrid search |
| `/api/sessions` | GET | List sessions |
| `/api/health` | GET | System health check |
| `/api/telemetry` | GET | Execution telemetry |
| `/docs` | GET | Interactive API docs (Swagger) |

## MCP Tools

- `query_knowledge_base` — Hybrid retrieval (dense + sparse + RRF)
- `vector_store_upsert` — Ingest documents with auto-embedding
- `system_health` — Component health checks
- `query_telemetry` — Execution traces and metrics
