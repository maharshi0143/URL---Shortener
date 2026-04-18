CREATE TABLE IF NOT EXISTS urls (
  id SERIAL PRIMARY KEY,
  short_code VARCHAR(16) UNIQUE NOT NULL,
  original_url TEXT NOT NULL,
  strategy VARCHAR(16) NOT NULL CHECK (strategy IN ('hash', 'snowflake')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS analytics_hourly (
  id SERIAL PRIMARY KEY,
  short_code VARCHAR(16) NOT NULL,
  hour TIMESTAMPTZ NOT NULL,
  click_count INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT analytics_hourly_short_code_hour_uniq UNIQUE (short_code, hour)
);

-- Deduplication table for at-least-once stream processing safety.
CREATE TABLE IF NOT EXISTS processed_click_events (
  stream_id VARCHAR(64) PRIMARY KEY,
  short_code VARCHAR(16) NOT NULL,
  hour TIMESTAMPTZ NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_urls_expires_at ON urls (expires_at);
CREATE INDEX IF NOT EXISTS idx_analytics_short_code ON analytics_hourly (short_code);
CREATE INDEX IF NOT EXISTS idx_analytics_hour ON analytics_hourly (hour);
CREATE INDEX IF NOT EXISTS idx_processed_short_code_hour ON processed_click_events (short_code, hour);
