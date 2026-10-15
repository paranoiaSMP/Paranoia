CREATE TABLE IF NOT EXISTS tribunal (
    id BIGSERIAL PRIMARY KEY,
    guild_id BIGINT NOT NULL,
    channel_id BIGINT NOT NULL,
    message_id BIGINT NOT NULL DEFAULT 0,
    target_id BIGINT NOT NULL,
    author_id BIGINT NOT NULL,
    motif TEXT NOT NULL,
    sanction TEXT NOT NULL,
    custom_text TEXT,
    ends_at TIMESTAMPTZ NOT NULL,
    extended INT NOT NULL DEFAULT 0,
    ended BOOLEAN NOT NULL DEFAULT FALSE,
    ended_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS tribunal_vote (
    trial_id BIGINT NOT NULL REFERENCES tribunal(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL,
    guilty BOOLEAN NOT NULL,
    PRIMARY KEY (trial_id, user_id)
);
