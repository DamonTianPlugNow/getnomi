-- Migration: 003_timeline_events.sql
-- Description: Add timeline_events table and extend memory_profiles for onboarding flow

-- Create timeline event type enum
CREATE TYPE timeline_event_type AS ENUM (
  'birth',
  'education_kindergarten',
  'education_elementary',
  'education_middle_school',
  'education_high_school',
  'education_university',
  'work',
  'custom'
);

-- Create timeline_events table
CREATE TABLE timeline_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Event type and timing
  event_type timeline_event_type NOT NULL,
  start_year INTEGER,
  start_month INTEGER,
  start_day INTEGER,
  end_year INTEGER,
  end_month INTEGER,
  is_current BOOLEAN DEFAULT false,

  -- Location
  province TEXT,
  city TEXT,

  -- Event details
  title TEXT NOT NULL,
  institution TEXT,
  position TEXT,
  description TEXT,

  -- Data source tracking
  source TEXT DEFAULT 'manual', -- 'manual' | 'linkedin' | 'onboarding'

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster user queries
CREATE INDEX idx_timeline_events_user_id ON timeline_events(user_id);
CREATE INDEX idx_timeline_events_start_year ON timeline_events(start_year);
CREATE INDEX idx_timeline_events_event_type ON timeline_events(event_type);

-- Enable RLS
ALTER TABLE timeline_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for timeline_events
CREATE POLICY "Users can view their own timeline events"
  ON timeline_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own timeline events"
  ON timeline_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own timeline events"
  ON timeline_events FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own timeline events"
  ON timeline_events FOR DELETE
  USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_timeline_events_timestamp
  BEFORE UPDATE ON timeline_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Extend memory_profiles table with new columns
ALTER TABLE memory_profiles ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE memory_profiles ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE memory_profiles ADD COLUMN IF NOT EXISTS birth_province TEXT;
ALTER TABLE memory_profiles ADD COLUMN IF NOT EXISTS birth_city TEXT;
ALTER TABLE memory_profiles ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;
