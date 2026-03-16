-- Migration: 004_complete_onboarding_rpc.sql
-- Description: Add RPC function for atomic onboarding completion with idempotency

CREATE OR REPLACE FUNCTION complete_onboarding(
  p_user_id UUID,
  p_linkedin_url TEXT,
  p_birth_date DATE,
  p_birth_province TEXT,
  p_birth_city TEXT,
  p_timeline_events JSONB
) RETURNS JSONB AS $$
DECLARE
  v_profile_id UUID;
  v_display_name TEXT;
  v_inserted_events JSONB := '[]'::JSONB;
  v_event JSONB;
  v_event_id UUID;
BEGIN
  -- 1. Idempotency check: if already completed onboarding, return early
  SELECT id INTO v_profile_id FROM memory_profiles
  WHERE user_id = p_user_id AND onboarding_completed_at IS NOT NULL;

  IF v_profile_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_completed', true,
      'profile_id', v_profile_id
    );
  END IF;

  -- 2. Get user display_name from users table
  SELECT COALESCE(name, email) INTO v_display_name FROM users WHERE id = p_user_id;

  -- 3. Upsert memory_profile (atomic operation) - includes is_active = true
  INSERT INTO memory_profiles (
    user_id,
    display_name,
    intents,
    linkedin_url,
    birth_date,
    birth_province,
    birth_city,
    onboarding_completed_at,
    is_active
  )
  VALUES (
    p_user_id,
    COALESCE(v_display_name, 'User'),
    ARRAY['professional']::relationship_intent[],
    p_linkedin_url,
    p_birth_date,
    p_birth_province,
    p_birth_city,
    NOW(),
    true
  )
  ON CONFLICT (user_id) DO UPDATE SET
    linkedin_url = EXCLUDED.linkedin_url,
    birth_date = EXCLUDED.birth_date,
    birth_province = EXCLUDED.birth_province,
    birth_city = EXCLUDED.birth_city,
    onboarding_completed_at = NOW(),
    is_active = true,
    updated_at = NOW()
  RETURNING id INTO v_profile_id;

  -- 4. Delete old onboarding source events (prevent duplicates on re-submission)
  DELETE FROM timeline_events WHERE user_id = p_user_id AND source = 'onboarding';

  -- 5. Insert new timeline events
  FOR v_event IN SELECT * FROM jsonb_array_elements(p_timeline_events)
  LOOP
    INSERT INTO timeline_events (
      user_id,
      event_type,
      start_year,
      start_month,
      start_day,
      end_year,
      end_month,
      is_current,
      province,
      city,
      title,
      institution,
      position,
      description,
      source
    ) VALUES (
      p_user_id,
      (v_event->>'event_type')::timeline_event_type,
      (v_event->>'start_year')::INTEGER,
      (v_event->>'start_month')::INTEGER,
      (v_event->>'start_day')::INTEGER,
      (v_event->>'end_year')::INTEGER,
      (v_event->>'end_month')::INTEGER,
      COALESCE((v_event->>'is_current')::BOOLEAN, false),
      v_event->>'province',
      v_event->>'city',
      v_event->>'title',
      v_event->>'institution',
      v_event->>'position',
      v_event->>'description',
      'onboarding'
    ) RETURNING id INTO v_event_id;

    v_inserted_events := v_inserted_events || jsonb_build_object('id', v_event_id);
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'already_completed', false,
    'profile_id', v_profile_id,
    'events_count', jsonb_array_length(v_inserted_events)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION complete_onboarding(UUID, TEXT, DATE, TEXT, TEXT, JSONB) TO authenticated;
