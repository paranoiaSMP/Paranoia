CREATE TABLE IF NOT EXISTS automod_points (
    guild_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    points REAL NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (guild_id, user_id)
);
