import { inngest } from '../client';
import { createAdminClient } from '@/lib/supabase/server';
import { rankMatchCandidates } from '@/lib/ai/claude';
import type { RelationshipIntent, MatchReason } from '@/types';

const MATCH_EXPIRY_HOURS = 48;
const MAX_CANDIDATES_PER_SEARCH = 50;
const MIN_MATCH_SCORE = 0.6;

/**
 * Find matches for a user after their profile is created/updated
 */
export const findMatches = inngest.createFunction(
  {
    id: 'find-matches',
    retries: 2,
    concurrency: {
      limit: 10,
    },
  },
  { event: 'matching/trigger' },
  async ({ event, step }) => {
    const { userId } = event.data;

    // Step 1: Get user's agent profiles
    const userAgents = await step.run('fetch-user-agents', async () => {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('agent_profiles')
        .select(`
          *,
          memory_profile:memory_profiles(*)
        `)
        .eq('user_id', userId);

      if (error) throw new Error(`Failed to fetch user agents: ${error.message}`);
      return data;
    });

    if (!userAgents || userAgents.length === 0) {
      return { message: 'No agent profiles found for user' };
    }

    const matchResults = [];

    // Process each intent separately
    for (const userAgent of userAgents) {
      const intent = userAgent.intent as RelationshipIntent;
      const memoryProfile = userAgent.memory_profile;

      // Step 2: Vector search for candidates
      const candidates = await step.run(`vector-search-${intent}`, async () => {
        const supabase = createAdminClient();

        // Find similar profiles using pgvector
        const { data, error } = await supabase.rpc('match_agents', {
          query_embedding: userAgent.embedding,
          match_intent: intent,
          exclude_user_id: userId,
          match_threshold: 0.5,
          match_count: MAX_CANDIDATES_PER_SEARCH,
        });

        if (error) {
          console.error('Vector search error:', error);
          return [];
        }

        return data || [];
      });

      if (candidates.length === 0) {
        matchResults.push({ intent, matches: 0, message: 'No candidates found' });
        continue;
      }

      // Step 3: Filter out existing matches
      const filteredCandidates = await step.run(`filter-existing-${intent}`, async () => {
        const supabase = createAdminClient();

        // Get existing matches for this user and intent
        const { data: existingMatches } = await supabase
          .from('matches')
          .select('user_a_id, user_b_id')
          .eq('intent', intent)
          .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
          .in('status', ['pending', 'half_approved', 'matched']);

        const matchedUserIds = new Set<string>();
        existingMatches?.forEach((m) => {
          matchedUserIds.add(m.user_a_id);
          matchedUserIds.add(m.user_b_id);
        });
        matchedUserIds.delete(userId);

        return candidates.filter((c: { user_id: string }) => !matchedUserIds.has(c.user_id));
      });

      if (filteredCandidates.length === 0) {
        matchResults.push({ intent, matches: 0, message: 'All candidates already matched' });
        continue;
      }

      // Step 4: LLM ranking
      const rankedCandidates = await step.run(`rank-candidates-${intent}`, async () => {
        return rankMatchCandidates(
          {
            summary: userAgent.summary,
            looking_for: memoryProfile?.looking_for,
            current_goals: memoryProfile?.current_goals,
            interests: memoryProfile?.interests,
            values: memoryProfile?.values,
          },
          filteredCandidates.map((c: {
            id: string;
            summary: string;
            memory_profile?: {
              can_offer?: string[];
              interests?: string[];
              values?: string[];
            };
          }) => ({
            id: c.id,
            summary: c.summary,
            can_offer: c.memory_profile?.can_offer,
            interests: c.memory_profile?.interests,
            values: c.memory_profile?.values,
          })),
          intent
        );
      });

      // Step 5: Create matches for high-scoring candidates
      const qualifiedCandidates = rankedCandidates.filter((c) => c.score >= MIN_MATCH_SCORE);

      for (const candidate of qualifiedCandidates.slice(0, 5)) {
        // Limit to top 5 matches per intent
        await step.run(`create-match-${intent}-${candidate.id}`, async () => {
          const supabase = createAdminClient();

          // Get candidate's agent profile
          const candidateAgent = filteredCandidates.find(
            (c: { id: string }) => c.id === candidate.id
          );
          if (!candidateAgent) return null;

          // Ensure user_a_id < user_b_id for consistency
          const [userAId, userBId] =
            userId < candidateAgent.user_id
              ? [userId, candidateAgent.user_id]
              : [candidateAgent.user_id, userId];

          const [agentAId, agentBId] =
            userId < candidateAgent.user_id
              ? [userAgent.id, candidateAgent.id]
              : [candidateAgent.id, userAgent.id];

          const expiresAt = new Date();
          expiresAt.setHours(expiresAt.getHours() + MATCH_EXPIRY_HOURS);

          const { data, error } = await supabase
            .from('matches')
            .insert({
              intent,
              user_a_id: userAId,
              user_b_id: userBId,
              agent_a_id: agentAId,
              agent_b_id: agentBId,
              match_score: candidate.score,
              match_reasons: candidate.reasons as MatchReason[],
              expires_at: expiresAt.toISOString(),
              status: 'pending',
            })
            .select()
            .single();

          if (error) {
            // Likely duplicate, ignore
            if (error.code === '23505') return null;
            console.error('Failed to create match:', error);
            return null;
          }

          // Send notification event
          await inngest.send({
            name: 'match/created',
            data: {
              matchId: data.id,
              userAId,
              userBId,
              intent,
            },
          });

          return data;
        });
      }

      matchResults.push({
        intent,
        candidates: candidates.length,
        qualified: qualifiedCandidates.length,
        matches: Math.min(qualifiedCandidates.length, 5),
      });
    }

    return {
      message: 'Matching completed',
      results: matchResults,
    };
  }
);

/**
 * Daily matching job - runs for all active users
 */
export const dailyMatching = inngest.createFunction(
  {
    id: 'daily-matching',
    retries: 1,
  },
  { cron: '0 6 * * *' }, // Run at 6 AM UTC daily
  async ({ step }) => {
    // Get all active users
    const activeUsers = await step.run('fetch-active-users', async () => {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('memory_profiles')
        .select('user_id, id')
        .eq('is_active', true);

      if (error) throw new Error(`Failed to fetch active users: ${error.message}`);
      return data || [];
    });

    // Trigger matching for each user
    const events = activeUsers.map((user) => ({
      name: 'matching/trigger' as const,
      data: {
        userId: user.user_id,
        memoryProfileId: user.id,
      },
    }));

    if (events.length > 0) {
      await step.sendEvent('trigger-all-matching', events);
    }

    return {
      message: `Triggered matching for ${activeUsers.length} users`,
    };
  }
);

/**
 * Check and expire old matches
 */
export const checkMatchExpiry = inngest.createFunction(
  {
    id: 'check-match-expiry',
    retries: 1,
  },
  { cron: '0 * * * *' }, // Run every hour
  async ({ step }) => {
    const expiredCount = await step.run('expire-matches', async () => {
      const supabase = createAdminClient();

      const { data, error } = await supabase
        .from('matches')
        .update({ status: 'expired' })
        .in('status', ['pending', 'half_approved'])
        .lt('expires_at', new Date().toISOString())
        .select('id');

      if (error) {
        console.error('Failed to expire matches:', error);
        return 0;
      }

      return data?.length || 0;
    });

    return { expiredMatches: expiredCount };
  }
);
