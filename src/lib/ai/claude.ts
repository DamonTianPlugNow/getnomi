import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  baseURL: process.env.ANTHROPIC_BASE_URL || undefined,
});

export { anthropic };

// Default timeout for LLM calls (30 seconds)
export const LLM_TIMEOUT_MS = 30000;

/**
 * Extract JSON from text, handling markdown code blocks
 * Exported for testing
 */
export function extractJSON(text: string): unknown {
  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch {
    // Try to extract from markdown code block
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1].trim());
      } catch {
        // Fall through to final error
      }
    }

    // Try to find JSON object in text
    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0]);
      } catch {
        // Fall through to final error
      }
    }

    throw new Error('Could not extract valid JSON from response');
  }
}

/**
 * Wrap a promise with a timeout
 * Exported for testing
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, operation: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${operation} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

/**
 * Generate Agent Profile from Memory Profile
 * Uses Claude to create a compelling agent representation
 */
export async function generateAgentProfile(
  memoryProfile: {
    display_name: string;
    headline?: string | null;
    work_experience?: Array<{
      company: string;
      title: string;
      description?: string | null;
    }>;
    skills?: string[];
    can_offer?: string[];
    looking_for?: string[];
    current_goals?: string[];
    interests?: string[];
    values?: string[];
  },
  intent: 'professional' | 'dating' | 'friendship'
): Promise<{
  summary: string;
  talking_points: string[];
  ideal_match_description: string;
  conversation_starters: string[];
}> {
  const intentDescriptions = {
    professional: 'professional networking, career opportunities, business partnerships, or mentorship',
    dating: 'romantic relationships and meaningful personal connections',
    friendship: 'genuine friendships and social connections based on shared interests',
  };

  const systemPrompt = `You are an AI agent creator for a relationship matching platform. Your job is to create a compelling agent profile that represents a user for ${intentDescriptions[intent]}.

You must respond with valid JSON only, no other text. The JSON must have this exact structure:
{
  "summary": "A 2-3 sentence compelling summary of this person for ${intent} matching",
  "talking_points": ["point1", "point2", "point3"],
  "ideal_match_description": "Description of who would be an ideal match for this person",
  "conversation_starters": ["starter1", "starter2", "starter3"]
}

Guidelines:
- Be authentic and highlight genuine strengths
- For professional: focus on expertise, achievements, and collaboration potential
- For dating: focus on personality, values, and relationship goals
- For friendship: focus on interests, hobbies, and social preferences
- Keep the tone warm but professional
- Avoid exaggeration or false claims`;

  const userContent = `<user_input>
Name: ${memoryProfile.display_name}
Headline: ${memoryProfile.headline || 'Not provided'}

Work Experience:
${memoryProfile.work_experience?.map(w => `- ${w.title} at ${w.company}: ${w.description || ''}`).join('\n') || 'Not provided'}

Skills: ${memoryProfile.skills?.join(', ') || 'Not provided'}

Can Offer: ${memoryProfile.can_offer?.join(', ') || 'Not provided'}

Looking For: ${memoryProfile.looking_for?.join(', ') || 'Not provided'}

Current Goals: ${memoryProfile.current_goals?.join(', ') || 'Not provided'}

Interests: ${memoryProfile.interests?.join(', ') || 'Not provided'}

Values: ${memoryProfile.values?.join(', ') || 'Not provided'}
</user_input>

Create an agent profile for ${intent} matching. Respond with JSON only.`;

  const response = await withTimeout(
    anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: userContent,
        },
      ],
      system: systemPrompt,
    }),
    LLM_TIMEOUT_MS,
    'generateAgentProfile'
  );

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  const parsed = extractJSON(content.text) as {
    summary?: string;
    talking_points?: string[];
    ideal_match_description?: string;
    conversation_starters?: string[];
  };

  // Validate required fields with defaults
  return {
    summary: parsed.summary || `${memoryProfile.display_name} - ${intent} profile`,
    talking_points: parsed.talking_points || [],
    ideal_match_description: parsed.ideal_match_description || 'Looking for meaningful connections',
    conversation_starters: parsed.conversation_starters || [],
  };
}

/**
 * Rank match candidates using Claude
 * Returns scored candidates with match reasons
 */
export async function rankMatchCandidates(
  userProfile: {
    summary: string;
    looking_for?: string[];
    current_goals?: string[];
    interests?: string[];
    values?: string[];
  },
  candidates: Array<{
    id: string;
    summary: string;
    can_offer?: string[];
    interests?: string[];
    values?: string[];
  }>,
  intent: 'professional' | 'dating' | 'friendship'
): Promise<Array<{
  id: string;
  score: number;
  reasons: Array<{
    type: 'common_interest' | 'complementary_skill' | 'shared_goal' | 'mutual_value';
    description: string;
    weight: number;
  }>;
}>> {
  if (candidates.length === 0) {
    return [];
  }

  const systemPrompt = `You are a matching algorithm for a ${intent} relationship platform. Analyze compatibility between a user and candidates.

Respond with valid JSON only:
{
  "rankings": [
    {
      "id": "candidate_id",
      "score": 0.85,
      "reasons": [
        {"type": "common_interest", "description": "Both interested in AI", "weight": 0.3},
        {"type": "complementary_skill", "description": "User needs marketing, candidate offers it", "weight": 0.4}
      ]
    }
  ]
}

Scoring guidelines:
- Score 0.0 to 1.0 (1.0 = perfect match)
- Consider: shared interests, complementary skills/resources, aligned goals, compatible values
- For professional: prioritize skill complementarity and goal alignment
- For dating: prioritize values alignment and genuine compatibility
- For friendship: prioritize shared interests and compatible personalities
- Be selective - not everyone is a good match`;

  const userContent = `<user_input>
User Profile:
${userProfile.summary}
Looking for: ${userProfile.looking_for?.join(', ') || 'Not specified'}
Goals: ${userProfile.current_goals?.join(', ') || 'Not specified'}
Interests: ${userProfile.interests?.join(', ') || 'Not specified'}
Values: ${userProfile.values?.join(', ') || 'Not specified'}

Candidates:
${candidates.map((c, i) => `
[${i + 1}] ID: ${c.id}
Summary: ${c.summary}
Can offer: ${c.can_offer?.join(', ') || 'Not specified'}
Interests: ${c.interests?.join(', ') || 'Not specified'}
Values: ${c.values?.join(', ') || 'Not specified'}
`).join('\n')}
</user_input>

Rank these candidates for ${intent} matching. Only include candidates with score >= 0.6. Respond with JSON only.`;

  const response = await withTimeout(
    anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: userContent,
        },
      ],
      system: systemPrompt,
    }),
    LLM_TIMEOUT_MS,
    'rankMatchCandidates'
  );

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  try {
    const parsed = extractJSON(content.text) as { rankings?: unknown[] };
    return (parsed.rankings || []) as Array<{
      id: string;
      score: number;
      reasons: Array<{
        type: 'common_interest' | 'complementary_skill' | 'shared_goal' | 'mutual_value';
        description: string;
        weight: number;
      }>;
    }>;
  } catch (err) {
    console.error('Failed to parse ranking response:', err);
    // Return empty array on parse failure instead of throwing
    return [];
  }
}

/**
 * Generate Meeting Brief
 */
export async function generateMeetingBrief(
  userA: { name: string; summary: string; interests?: string[] },
  userB: { name: string; summary: string; interests?: string[] },
  matchReasons: Array<{ description: string }>
): Promise<{
  user_a_summary: string;
  user_b_summary: string;
  common_topics: string[];
  suggested_agenda: string[];
  ice_breakers: string[];
}> {
  const systemPrompt = `You are preparing a meeting brief for two people who matched on a networking platform.

Respond with valid JSON only:
{
  "user_a_summary": "Brief intro of person A for person B to read",
  "user_b_summary": "Brief intro of person B for person A to read",
  "common_topics": ["topic1", "topic2", "topic3"],
  "suggested_agenda": ["agenda1", "agenda2"],
  "ice_breakers": ["question1", "question2", "question3"]
}

Keep it concise, warm, and actionable.`;

  const userContent = `<user_input>
Person A: ${userA.name}
${userA.summary}
Interests: ${userA.interests?.join(', ') || 'Not specified'}

Person B: ${userB.name}
${userB.summary}
Interests: ${userB.interests?.join(', ') || 'Not specified'}

Why they matched:
${matchReasons.map(r => `- ${r.description}`).join('\n')}
</user_input>

Generate a meeting brief. Respond with JSON only.`;

  const response = await withTimeout(
    anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: userContent,
        },
      ],
      system: systemPrompt,
    }),
    LLM_TIMEOUT_MS,
    'generateMeetingBrief'
  );

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  try {
    const parsed = extractJSON(content.text) as {
      user_a_summary?: string;
      user_b_summary?: string;
      common_topics?: string[];
      suggested_agenda?: string[];
      ice_breakers?: string[];
    };

    // Return with defaults for missing fields
    return {
      user_a_summary: parsed.user_a_summary || userA.summary,
      user_b_summary: parsed.user_b_summary || userB.summary,
      common_topics: parsed.common_topics || [],
      suggested_agenda: parsed.suggested_agenda || ['Introduce yourselves', 'Discuss shared interests'],
      ice_breakers: parsed.ice_breakers || ['What are you currently working on?'],
    };
  } catch (err) {
    console.error('Failed to parse meeting brief response:', err);
    // Return fallback brief
    return {
      user_a_summary: userA.summary,
      user_b_summary: userB.summary,
      common_topics: [],
      suggested_agenda: ['Introduce yourselves', 'Discuss shared interests'],
      ice_breakers: ['What are you currently working on?'],
    };
  }
}
