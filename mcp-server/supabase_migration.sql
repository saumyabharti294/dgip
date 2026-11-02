-- Supabase migration: run this in the SQL Editor at app.supabase.com
-- Enables pgvector, creates document + session tables, and the RPC functions.

-- 1. Enable pgvector extension
create extension if not exists vector;

-- 2. Documents table with embedding column
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  metadata jsonb default '{}'::jsonb,
  embedding vector(768),
  created_at timestamptz default now()
);

-- Full-text search column for sparse retrieval
alter table documents add column if not exists fts tsvector
  generated always as (to_tsvector('english', content)) stored;

create index if not exists documents_fts_idx on documents using gin(fts);
create index if not exists documents_embedding_idx on documents using hnsw(embedding vector_cosine_ops);

-- 3. Sessions table for agent state checkpointing
create table if not exists sessions (
  id uuid primary key,
  state jsonb default '{}'::jsonb,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. RPC: vector similarity search
create or replace function match_documents(
  query_embedding vector(768),
  match_count int default 10,
  match_threshold float default 0.5
)
returns table (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    d.id,
    d.content,
    d.metadata,
    1 - (d.embedding <=> query_embedding) as similarity
  from documents d
  where 1 - (d.embedding <=> query_embedding) > match_threshold
  order by d.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- 5. RPC: sparse full-text search
create or replace function sparse_search(
  query_text text,
  match_count int default 10
)
returns table (
  id uuid,
  content text,
  metadata jsonb,
  rank float
)
language plpgsql
as $$
begin
  return query
  select
    d.id,
    d.content,
    d.metadata,
    ts_rank(d.fts, websearch_to_tsquery('english', query_text)) as rank
  from documents d
  where d.fts @@ websearch_to_tsquery('english', query_text)
  order by rank desc
  limit match_count;
end;
$$;
