CREATE TABLE IF NOT EXISTS giveaway (
    id BIGSERIAL PRIMARY KEY,
    channel_id BIGINT NOT NULL,
    message_id BIGINT NOT NULL DEFAULT 0,
    host_id BIGINT NOT NULL,
    prize TEXT NOT NULL,
    winners INT NOT NULL DEFAULT 1,
    ends_at TIMESTAMPTZ NOT NULL,
    ended BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS giveaway_entry (
    giveaway_id BIGINT NOT NULL REFERENCES giveaway(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL,
    PRIMARY KEY (giveaway_id, user_id)
);
