BEGIN;
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS app_schema_version (
  version integer PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

-- Legacy tables for continuous backwards compatibility with existing deployment/testing
CREATE TABLE IF NOT EXISTS gameplay_state (
  id integer PRIMARY KEY CHECK (id=1),
  payload jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY,
  payload jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS inventory (
  profile_id uuid NOT NULL REFERENCES profiles(id),
  item_id text NOT NULL,
  quantity bigint NOT NULL CHECK (quantity>=0),
  payload jsonb NOT NULL,
  PRIMARY KEY(profile_id,item_id)
);

-- New Platform Universe Core Tables (PostgreSQL 17)
CREATE TABLE IF NOT EXISTS player_profiles (
  profile_id UUID PRIMARY KEY,
  secret_hash CHAR(64) NOT NULL,
  gold_coins BIGINT NOT NULL DEFAULT 100 CHECK (gold_coins >= 0),
  heart_coins BIGINT NOT NULL DEFAULT 0 CHECK (heart_coins >= 0),
  revision INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS player_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES player_profiles(profile_id) ON DELETE CASCADE,
  category VARCHAR(32) NOT NULL,
  catalog_id VARCHAR(64) NOT NULL,
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  is_equipped BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_category ON player_inventory(profile_id, category);
CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_stackable ON player_inventory(profile_id, catalog_id) 
  WHERE (category IN ('currency', 'game_tool', 'pet_supply', 'work_token'));

CREATE TABLE IF NOT EXISTS player_avatars (
  profile_id UUID PRIMARY KEY REFERENCES player_profiles(profile_id) ON DELETE CASCADE,
  features JSONB NOT NULL DEFAULT '{"gender":"neutral","skin":"#ffdbac","eyes":"default","brows":"default","lips":"default"}'::jsonb,
  equipped_slots JSONB NOT NULL DEFAULT '{"hair":null,"top":null,"bottom":null,"shoes":null,"accessory":null}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS home_spaces (
  profile_id UUID PRIMARY KEY REFERENCES player_profiles(profile_id) ON DELETE CASCADE,
  grid_width INT NOT NULL DEFAULT 10,
  grid_height INT NOT NULL DEFAULT 10,
  wallpaper_id VARCHAR(64) NOT NULL DEFAULT 'wall_cream',
  flooring_id VARCHAR(64) NOT NULL DEFAULT 'floor_wood',
  placed_furnitures JSONB NOT NULL DEFAULT '[]'::jsonb,
  revision INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS idle_jobs (
  profile_id UUID PRIMARY KEY REFERENCES player_profiles(profile_id) ON DELETE CASCADE,
  job_id VARCHAR(32) NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_seconds INT NOT NULL,
  reward_coins INT NOT NULL,
  claimed BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS companion_states (
  profile_id UUID PRIMARY KEY REFERENCES player_profiles(profile_id) ON DELETE CASCADE,
  partner_name VARCHAR(64) NOT NULL DEFAULT '亲爱的',
  favorability INT NOT NULL DEFAULT 100 CHECK (favorability >= 0),
  partner_avatar JSONB NOT NULL DEFAULT '{"skin":"#ffdbac","hair":"male_short_black","top":"suit_grey"}'::jsonb,
  pet_type VARCHAR(32) NOT NULL DEFAULT 'cat',
  pet_hunger INT NOT NULL DEFAULT 80 CHECK (pet_hunger BETWEEN 0 AND 100),
  pet_status VARCHAR(32) NOT NULL DEFAULT 'idle',
  pet_forage_end_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS asset_audit_ledger (
  tx_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL,
  source_channel VARCHAR(32) NOT NULL,
  change_type VARCHAR(16) NOT NULL,
  item_catalog_id VARCHAR(64) NOT NULL,
  quantity_delta INT NOT NULL,
  receipt_token VARCHAR(128) UNIQUE NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO app_schema_version(version) VALUES(1) ON CONFLICT DO NOTHING;
INSERT INTO app_schema_version(version) VALUES(2) ON CONFLICT DO NOTHING;
COMMIT;
