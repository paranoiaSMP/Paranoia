CREATE TABLE IF NOT EXISTS sanctions (
    id VARCHAR(6) PRIMARY KEY,
    guild_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    mod_id BIGINT NOT NULL,
    sanction_type VARCHAR(20) NOT NULL,
    duration TEXT,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    appealed BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS appeals (
    id TEXT PRIMARY KEY,
    sanction_id VARCHAR(6) REFERENCES sanctions(id),
    pseudo_mc TEXT,
    arguments TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tiktok_targets (
    username TEXT PRIMARY KEY,
    channel_id BIGINT NOT NULL,
    role_id BIGINT,
    last_video_id TEXT,
    is_live BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_sanctions_user ON sanctions(user_id);
CREATE INDEX IF NOT EXISTS idx_sanctions_guild_user ON sanctions(guild_id, user_id);
CREATE INDEX IF NOT EXISTS idx_appeals_sanction_id ON appeals(sanction_id);
CREATE INDEX IF NOT EXISTS idx_appeals_status ON appeals(status);
