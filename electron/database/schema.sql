-- Hybrid Database Schema for Puffer
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = 1000;
PRAGMA temp_store = MEMORY;

-- Conversation Storage
CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    user_message TEXT NOT NULL,
    ai_response TEXT NOT NULL,
    model TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    response_time INTEGER,
    token_count INTEGER,
    embedding_vector TEXT, -- JSON array for future vector search
    metadata TEXT, -- JSON for additional data
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_conversations_timestamp ON conversations(timestamp);
CREATE INDEX IF NOT EXISTS idx_conversations_model ON conversations(model);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at);

-- Memory Chunks for RAG
CREATE TABLE IF NOT EXISTS memory_chunks (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    summary TEXT,
    topics TEXT, -- JSON array
    relevance_score REAL DEFAULT 0.0,
    access_count INTEGER DEFAULT 0,
    last_accessed INTEGER,
    source_type TEXT, -- 'conversation', 'file', 'manual'
    source_id TEXT, -- reference to source
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_memory_chunks_relevance ON memory_chunks(relevance_score);
CREATE INDEX IF NOT EXISTS idx_memory_chunks_access_count ON memory_chunks(access_count);
CREATE INDEX IF NOT EXISTS idx_memory_chunks_last_accessed ON memory_chunks(last_accessed);

-- Telemetry Events
CREATE TABLE IF NOT EXISTS telemetry_events (
    id TEXT PRIMARY KEY,
    timestamp INTEGER NOT NULL,
    category TEXT NOT NULL,
    event TEXT NOT NULL,
    data TEXT,
    session_id TEXT NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_telemetry_timestamp ON telemetry_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_telemetry_category ON telemetry_events(category);

-- Performance Metrics
CREATE TABLE IF NOT EXISTS performance_metrics (
    id TEXT PRIMARY KEY,
    timestamp INTEGER NOT NULL,
    cpu_usage REAL,
    memory_usage REAL,
    storage_usage REAL,
    ipc_calls INTEGER,
    render_time REAL,
    frame_rate REAL,
    session_id TEXT NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_performance_timestamp ON performance_metrics(timestamp);

-- Agent History
CREATE TABLE IF NOT EXISTS agent_history (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    action TEXT NOT NULL,
    config_snapshot TEXT,
    timestamp INTEGER NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_agent_history_agent_id ON agent_history(agent_id);
