import { inngest } from '../client';
import { createAdminClient } from '@/lib/supabase/server';
import { generateAgentProfile } from '@/lib/ai/claude';
import { generateEmbedding, createEmbeddingText } from '@/lib/ai/embedding';
import type { RelationshipIntent } from '@/types';

/**
 * Generate Agent Profiles when a Memory Profile is created or updated
 * Creates one agent profile per selected intent
 */
export const generateAgentProfiles = inngest.createFunction(
  {
    id: 'generate-agent-profiles',
    retries: 3,
  },
  [{ event: 'profile/created' }, { event: 'profile/updated' }],
  async ({ event, step }) => {
    const { userId, memoryProfileId } = event.data;

    // Step 1: Fetch memory profile
    const memoryProfile = await step.run('fetch-memory-profile', async () => {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('memory_profiles')
        .select('*')
        .eq('id', memoryProfileId)
        .single();

      if (error) throw new Error(`Failed to fetch memory profile: ${error.message}`);
      return data;
    });

    if (!memoryProfile.intents || memoryProfile.intents.length === 0) {
      return { message: 'No intents selected, skipping agent generation' };
    }

    // Step 2: Generate agent profile for each intent
    const results = [];
    for (const intent of memoryProfile.intents as RelationshipIntent[]) {
      const agentData = await step.run(`generate-agent-${intent}`, async () => {
        return generateAgentProfile(
          {
            display_name: memoryProfile.display_name,
            headline: memoryProfile.headline,
            work_experience: memoryProfile.work_experience as Array<{
              company: string;
              title: string;
              description?: string | null;
            }>,
            skills: memoryProfile.skills,
            can_offer: memoryProfile.can_offer,
            looking_for: memoryProfile.looking_for,
            current_goals: memoryProfile.current_goals,
            interests: memoryProfile.interests,
            values: memoryProfile.values,
          },
          intent
        );
      });

      // Step 3: Generate embedding for the agent profile
      const embedding = await step.run(`generate-embedding-${intent}`, async () => {
        const embeddingText = createEmbeddingText({
          summary: agentData.summary,
          talking_points: agentData.talking_points,
          ideal_match_description: agentData.ideal_match_description,
          interests: memoryProfile.interests,
          values: memoryProfile.values,
          skills: memoryProfile.skills,
          can_offer: memoryProfile.can_offer,
          looking_for: memoryProfile.looking_for,
        });
        return generateEmbedding(embeddingText);
      });

      // Step 4: Upsert agent profile
      const savedAgent = await step.run(`save-agent-${intent}`, async () => {
        const supabase = createAdminClient();

        // Check if agent exists
        const { data: existing } = await supabase
          .from('agent_profiles')
          .select('id, version')
          .eq('user_id', userId)
          .eq('intent', intent)
          .single();

        const agentRecord = {
          user_id: userId,
          memory_profile_id: memoryProfileId,
          intent,
          summary: agentData.summary,
          talking_points: agentData.talking_points,
          ideal_match_description: agentData.ideal_match_description,
          conversation_starters: agentData.conversation_starters,
          embedding: JSON.stringify(embedding),
          version: existing ? existing.version + 1 : 1,
          updated_at: new Date().toISOString(),
        };

        if (existing) {
          const { data, error } = await supabase
            .from('agent_profiles')
            .update(agentRecord)
            .eq('id', existing.id)
            .select()
            .single();

          if (error) throw new Error(`Failed to update agent profile: ${error.message}`);
          return data;
        } else {
          const { data, error } = await supabase
            .from('agent_profiles')
            .insert(agentRecord)
            .select()
            .single();

          if (error) throw new Error(`Failed to create agent profile: ${error.message}`);
          return data;
        }
      });

      results.push({ intent, agentId: savedAgent.id });
    }

    // Step 5: Mark memory profile as active
    await step.run('activate-profile', async () => {
      const supabase = createAdminClient();
      await supabase
        .from('memory_profiles')
        .update({
          is_active: true,
          completed_at: new Date().toISOString(),
        })
        .eq('id', memoryProfileId);
    });

    // Step 6: Trigger matching for this user
    await step.sendEvent('trigger-matching', {
      name: 'profile/created',
      data: { userId, memoryProfileId },
    });

    return {
      message: 'Agent profiles generated successfully',
      agents: results,
    };
  }
);
