CREATE TABLE IF NOT EXISTS campuses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  center_lng DOUBLE PRECISION NOT NULL,
  center_lat DOUBLE PRECISION NOT NULL,
  radius_km DOUBLE PRECISION NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS anonymous_sessions (
  token TEXT PRIMARY KEY,
  device_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS places (
  id TEXT PRIMARY KEY,
  campus_id TEXT NOT NULL REFERENCES campuses(id),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('restaurant', 'stall')),
  lng DOUBLE PRECISION NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  cuisines JSONB NOT NULL DEFAULT '[]',
  tags JSONB NOT NULL DEFAULT '[]',
  price_level SMALLINT NOT NULL,
  avg_price INTEGER NOT NULL,
  rating NUMERIC(2,1) NOT NULL,
  review_count INTEGER NOT NULL DEFAULT 0,
  vibe_line TEXT NOT NULL,
  address TEXT NOT NULL,
  meal_service_speed TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS decisions (
  id TEXT PRIMARY KEY,
  scene_id TEXT NOT NULL,
  place_id TEXT NOT NULL REFERENCES places(id),
  session_token TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS place_hours (
  id BIGSERIAL PRIMARY KEY,
  place_id TEXT NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  day SMALLINT NOT NULL CHECK (day BETWEEN 0 AND 6),
  start_at TEXT NOT NULL,
  end_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS place_signatures (
  id BIGSERIAL PRIMARY KEY,
  place_id TEXT NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  dish_name TEXT NOT NULL,
  image_url TEXT
);

CREATE TABLE IF NOT EXISTS scene_sessions (
  id TEXT PRIMARY KEY,
  session_token TEXT NOT NULL,
  scene_payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recommendation_results (
  id BIGSERIAL PRIMARY KEY,
  scene_id TEXT NOT NULL REFERENCES scene_sessions(id) ON DELETE CASCADE,
  place_id TEXT NOT NULL REFERENCES places(id),
  score DOUBLE PRECISION NOT NULL,
  reason TEXT NOT NULL,
  walk_minutes INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_events (
  id TEXT PRIMARY KEY,
  session_token TEXT NOT NULL,
  event_name TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  place_id TEXT NOT NULL REFERENCES places(id),
  session_token TEXT NOT NULL,
  tags JSONB NOT NULL DEFAULT '[]',
  body TEXT NOT NULL DEFAULT '',
  images JSONB NOT NULL DEFAULT '[]',
  quality_weight DOUBLE PRECISION NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS review_signals (
  id BIGSERIAL PRIMARY KEY,
  review_id TEXT NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  confidence DOUBLE PRECISION NOT NULL
);

CREATE TABLE IF NOT EXISTS trust_snapshots (
  place_id TEXT PRIMARY KEY REFERENCES places(id) ON DELETE CASCADE,
  keywords JSONB NOT NULL,
  revisit_rate_30d INTEGER NOT NULL,
  ai_summary TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS community_posts (
  id TEXT PRIMARY KEY,
  session_token TEXT,
  author TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  place_id TEXT REFERENCES places(id),
  tags JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS community_comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS in_app_notifications (
  id TEXT PRIMARY KEY,
  session_token TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  due_at TIMESTAMPTZ NOT NULL,
  acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS moderation_queue (
  id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS merchant_claims (
  id TEXT PRIMARY KEY,
  place_id TEXT NOT NULL REFERENCES places(id),
  merchant_name TEXT NOT NULL,
  contact_info TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS place_submissions (
  id TEXT PRIMARY KEY,
  session_token TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('restaurant', 'stall')),
  campus_id TEXT NOT NULL REFERENCES campuses(id),
  address_hint TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
