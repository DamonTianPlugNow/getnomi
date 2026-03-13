-- A2A Platform Database Schema
-- Migration: 001_initial_schema

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE relationship_intent AS ENUM ('professional', 'dating', 'friendship');
CREATE TYPE match_status AS ENUM ('pending', 'half_approved', 'matched', 'rejected', 'expired');
CREATE TYPE meeting_status AS ENUM ('scheduled', 'completed', 'no_show', 'cancelled');
CREATE TYPE meeting_platform AS ENUM ('zoom', 'feishu', 'google_meet');

-- ============================================
-- TABLES
-- ============================================

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  linkedin_id TEXT UNIQUE,
  google_id TEXT UNIQUE,
  linkedin_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Memory Profiles
CREATE TABLE memory_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Basic info
  display_name TEXT NOT NULL,
  headline TEXT,
  location TEXT,

  -- Professional (JSONB for flexibility)
  work_experience JSONB DEFAULT '[]'::jsonb,
  skills TEXT[] DEFAULT '{}',

  -- Resources & Goals
  can_offer TEXT[] DEFAULT '{}',
  looking_for TEXT[] DEFAULT '{}',
  current_goals TEXT[] DEFAULT '{}',

  -- Personal
  interests TEXT[] DEFAULT '{}',
  values TEXT[] DEFAULT '{}',

  -- Relationship intents
  intents relationship_intent[] NOT NULL DEFAULT '{}',

  -- Status
  is_active BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,

  -- Encrypted sensitive data
  contact_info_encrypted TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- One profile per user
  UNIQUE(user_id)
);

-- Agent Profiles (AI-generated, one per intent)
CREATE TABLE agent_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  memory_profile_id UUID NOT NULL REFERENCES memory_profiles(id) ON DELETE CASCADE,
  intent relationship_intent NOT NULL,

  -- AI-generated content
  summary TEXT NOT NULL,
  talking_points TEXT[] DEFAULT '{}',
  ideal_match_description TEXT,
  conversation_starters TEXT[] DEFAULT '{}',

  -- Embedding for vector search (1536 dimensions for OpenAI)
  embedding vector(1536),

  -- Version tracking
  version INTEGER DEFAULT 1,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- One agent per user per intent
  UNIQUE(user_id, intent)
);

-- Matches
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  intent relationship_intent NOT NULL,

  -- Participants (user_a_id < user_b_id to prevent duplicates)
  user_a_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_a_id UUID NOT NULL REFERENCES agent_profiles(id) ON DELETE CASCADE,
  agent_b_id UUID NOT NULL REFERENCES agent_profiles(id) ON DELETE CASCADE,

  -- Status
  status match_status DEFAULT 'pending' NOT NULL,
  user_a_approved BOOLEAN,
  user_b_approved BOOLEAN,
  user_a_approved_at TIMESTAMPTZ,
  user_b_approved_at TIMESTAMPTZ,

  -- Match reasoning
  match_score DECIMAL(5,4) NOT NULL,
  match_reasons JSONB DEFAULT '[]'::jsonb,

  -- Expiry (48 hours from creation)
  expires_at TIMESTAMPTZ NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Prevent duplicate matches
  UNIQUE(user_a_id, user_b_id, intent),

  -- Ensure user_a_id < user_b_id
  CHECK (user_a_id < user_b_id)
);

-- Time Slots for scheduling
CREATE TABLE time_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Available times
  available_times TIMESTAMPTZ[] NOT NULL DEFAULT '{}',
  timezone TEXT NOT NULL DEFAULT 'UTC',

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- One slot selection per user per match
  UNIQUE(match_id, user_id)
);

-- Meetings
CREATE TABLE meetings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,

  -- Participants
  user_a_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Meeting details
  platform meeting_platform NOT NULL,
  meeting_url TEXT NOT NULL,
  meeting_id_external TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  timezone TEXT NOT NULL DEFAULT 'UTC',

  -- Meeting brief (AI-generated)
  brief JSONB,

  -- Status
  status meeting_status DEFAULT 'scheduled' NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- One meeting per match
  UNIQUE(match_id)
);

-- Feedback
CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Ratings
  overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
  would_meet_again BOOLEAN NOT NULL,

  -- Optional details
  highlights TEXT,
  improvements TEXT,

  -- For reputation
  no_show BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- One feedback per user per meeting
  UNIQUE(meeting_id, user_id)
);

-- User Reputation (materialized view alternative)
CREATE TABLE user_reputations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,

  -- Metrics
  total_meetings INTEGER DEFAULT 0,
  completed_meetings INTEGER DEFAULT 0,
  no_show_count INTEGER DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 0,

  -- Calculated score
  reputation_score INTEGER DEFAULT 100 CHECK (reputation_score >= 0 AND reputation_score <= 100),

  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- INDEXES
-- ============================================

-- Users
CREATE INDEX idx_users_linkedin_id ON users(linkedin_id) WHERE linkedin_id IS NOT NULL;
CREATE INDEX idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;

-- Memory Profiles
CREATE INDEX idx_memory_profiles_user_id ON memory_profiles(user_id);
CREATE INDEX idx_memory_profiles_active ON memory_profiles(is_active) WHERE is_active = true;

-- Agent Profiles
CREATE INDEX idx_agent_profiles_user_id ON agent_profiles(user_id);
CREATE INDEX idx_agent_profiles_intent ON agent_profiles(intent);
CREATE INDEX idx_agent_profiles_embedding ON agent_profiles USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Matches
CREATE INDEX idx_matches_user_a ON matches(user_a_id);
CREATE INDEX idx_matches_user_b ON matches(user_b_id);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_expires_at ON matches(expires_at) WHERE status IN ('pending', 'half_approved');

-- Meetings
CREATE INDEX idx_meetings_user_a ON meetings(user_a_id);
CREATE INDEX idx_meetings_user_b ON meetings(user_b_id);
CREATE INDEX idx_meetings_scheduled_at ON meetings(scheduled_at);
CREATE INDEX idx_meetings_status ON meetings(status);

-- Feedback
CREATE INDEX idx_feedback_meeting_id ON feedback(meeting_id);
CREATE INDEX idx_feedback_target_user ON feedback(target_user_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reputations ENABLE ROW LEVEL SECURITY;

-- Users: can read own data
CREATE POLICY "Users can read own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Memory Profiles: can CRUD own profile
CREATE POLICY "Users can read own memory profile" ON memory_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own memory profile" ON memory_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own memory profile" ON memory_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own memory profile" ON memory_profiles
  FOR DELETE USING (auth.uid() = user_id);

-- Agent Profiles: can read own, others can read summary only (handled in app)
CREATE POLICY "Users can read own agent profiles" ON agent_profiles
  FOR SELECT USING (auth.uid() = user_id);

-- Matches: can read if participant
CREATE POLICY "Users can read own matches" ON matches
  FOR SELECT USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);

CREATE POLICY "Users can update own matches" ON matches
  FOR UPDATE USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);

-- Time Slots: can CRUD own slots
CREATE POLICY "Users can manage own time slots" ON time_slots
  FOR ALL USING (auth.uid() = user_id);

-- Can read other's slots for same match
CREATE POLICY "Users can read match time slots" ON time_slots
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = time_slots.match_id
      AND (matches.user_a_id = auth.uid() OR matches.user_b_id = auth.uid())
    )
  );

-- Meetings: can read if participant
CREATE POLICY "Users can read own meetings" ON meetings
  FOR SELECT USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);

-- Feedback: can CRUD own feedback
CREATE POLICY "Users can manage own feedback" ON feedback
  FOR ALL USING (auth.uid() = user_id);

-- User Reputations: can read all (public), update own
CREATE POLICY "Anyone can read reputations" ON user_reputations
  FOR SELECT USING (true);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_memory_profiles_updated_at
  BEFORE UPDATE ON memory_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_agent_profiles_updated_at
  BEFORE UPDATE ON agent_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_matches_updated_at
  BEFORE UPDATE ON matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_time_slots_updated_at
  BEFORE UPDATE ON time_slots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_meetings_updated_at
  BEFORE UPDATE ON meetings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Create user record on auth signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users (id, email, name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'avatar_url'
  );

  -- Initialize reputation
  INSERT INTO user_reputations (user_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update reputation after feedback
CREATE OR REPLACE FUNCTION update_reputation_on_feedback()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_reputations
  SET
    total_meetings = (
      SELECT COUNT(DISTINCT meeting_id)
      FROM feedback
      WHERE target_user_id = NEW.target_user_id
    ),
    completed_meetings = (
      SELECT COUNT(DISTINCT meeting_id)
      FROM feedback
      WHERE target_user_id = NEW.target_user_id AND no_show = false
    ),
    no_show_count = (
      SELECT COUNT(*)
      FROM feedback
      WHERE target_user_id = NEW.target_user_id AND no_show = true
    ),
    average_rating = (
      SELECT COALESCE(AVG(overall_rating), 0)
      FROM feedback
      WHERE target_user_id = NEW.target_user_id AND no_show = false
    ),
    reputation_score = GREATEST(0, LEAST(100,
      100
      - ((SELECT COUNT(*) FROM feedback WHERE target_user_id = NEW.target_user_id AND no_show = true) * 20)
      + (((SELECT COALESCE(AVG(overall_rating), 3) FROM feedback WHERE target_user_id = NEW.target_user_id AND no_show = false) - 3) * 10)
    )),
    updated_at = NOW()
  WHERE user_id = NEW.target_user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_feedback_created
  AFTER INSERT ON feedback
  FOR EACH ROW EXECUTE FUNCTION update_reputation_on_feedback();
