-- A2A Platform - Vector Matching Function
-- Migration: 002_match_agents_function

-- Function to find similar agent profiles using vector similarity
CREATE OR REPLACE FUNCTION match_agents(
  query_embedding vector(1536),
  match_intent relationship_intent,
  exclude_user_id uuid,
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  memory_profile_id uuid,
  intent relationship_intent,
  summary text,
  talking_points text[],
  ideal_match_description text,
  conversation_starters text[],
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ap.id,
    ap.user_id,
    ap.memory_profile_id,
    ap.intent,
    ap.summary,
    ap.talking_points,
    ap.ideal_match_description,
    ap.conversation_starters,
    1 - (ap.embedding <=> query_embedding) AS similarity
  FROM agent_profiles ap
  INNER JOIN memory_profiles mp ON ap.memory_profile_id = mp.id
  WHERE
    ap.intent = match_intent
    AND ap.user_id != exclude_user_id
    AND mp.is_active = true
    AND ap.embedding IS NOT NULL
    AND 1 - (ap.embedding <=> query_embedding) > match_threshold
  ORDER BY ap.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION match_agents TO authenticated;
GRANT EXECUTE ON FUNCTION match_agents TO service_role;
