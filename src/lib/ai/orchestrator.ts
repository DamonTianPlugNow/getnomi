/**
 * Multi-Agent Chat Orchestrator
 *
 * Coordinates the multi-agent chat system with:
 * 1. Persona-driven dialog agent
 * 2. Emotional intelligence integration
 * 3. Conversation memory system
 * 4. Phase-aware conversation flow
 * 5. User style adaptation
 *
 * Based on research from:
 * - Frontiers in AI: Designing Intelligent Chatbots
 * - Bank of America Erica: 3B+ interactions at 98% satisfaction
 */

import { anthropic, withTimeout, LLM_TIMEOUT_MS } from './claude';
import { classifyMessage } from './classifier';
import { professionalAgent } from './agents/professional';
import { lifeAgent } from './agents/life';
import {
  logAgent,
  mergeExtractions,
  mergeArrayField,
  checkCompletion,
} from './agents/base';

// Import new modules
import { generatePersonaPrompt, generatePersonaContext } from './persona';
import { buildEmotionalContext, generateEmotionalPrompt } from './emotional';
import { buildConversationMemory, generateMemoryPrompt, generateStyleAdaptationPrompt } from './memory';
import { detectPhase, generatePhasePrompt, generateMissingInfoPrompt } from './conversation-flow';
import { generateStylePrompt } from './user-style';

import type {
  ChatMessage,
  OnboardingProfileData,
  MultiAgentChatResult,
  DomainUpdate,
  CrossDomainItem,
  RelationshipIntent,
  EnhancedClassificationResult,
  ConversationPhase,
  EmotionalContext,
  ConversationMemory,
} from '@/types';

// ============================================
// Enhanced Dialog System Prompt
// ============================================

/**
 * Build a comprehensive system prompt with all context
 */
function buildDialogSystemPrompt(
  currentProfile: Partial<OnboardingProfileData>,
  phase: ConversationPhase,
  emotionalContext: EmotionalContext,
  memory: ConversationMemory,
  classification?: EnhancedClassificationResult
): string {
  const parts: string[] = [];

  // 1. Core persona
  parts.push(generatePersonaPrompt());

  // 2. Current phase context
  parts.push(generatePhasePrompt(phase));

  // 3. Emotional context (only if not neutral)
  if (emotionalContext.current_state !== 'neutral' || emotionalContext.requires_support) {
    parts.push(generateEmotionalPrompt(emotionalContext));
  }

  // 4. Memory context (only if we have memories)
  if (memory.keyFacts.length > 0 || memory.topicTrail.length > 0) {
    parts.push(generateMemoryPrompt(memory));
  }

  // 5. Style adaptation (only if detected)
  if (classification?.user_style) {
    parts.push(generateStylePrompt(classification.user_style));
  } else if (memory.inferredPreferences) {
    parts.push(generateStyleAdaptationPrompt(memory.inferredPreferences));
  }

  // 6. Missing info hints (only in exploration phase)
  if (phase === 'exploration') {
    const missingPrompt = generateMissingInfoPrompt(currentProfile);
    if (missingPrompt) {
      parts.push(missingPrompt);
    }
  }

  // 7. Profile progress context
  const collectedFields = Object.entries(currentProfile)
    .filter(([, v]) => v !== undefined && v !== null && (Array.isArray(v) ? v.length > 0 : true))
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join('\n');

  if (collectedFields) {
    parts.push(`\n## 已了解的信息\n${collectedFields}`);
  }

  // 8. Final reminder
  parts.push(`\n## 最终提醒
${generatePersonaContext()}
记住：先回应用户，再自然过渡。`);

  return parts.join('\n\n');
}

// ============================================
// Enhanced Dialog Agent
// ============================================

interface DialogContext {
  phase: ConversationPhase;
  emotionalContext: EmotionalContext;
  memory: ConversationMemory;
  classification?: EnhancedClassificationResult;
}

/**
 * Generate dialog reply with full context awareness
 */
async function generateDialogReply(
  messages: ChatMessage[],
  currentProfile: Partial<OnboardingProfileData>,
  context: DialogContext
): Promise<{ reply: string }> {
  // Build conversation history
  const conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  for (const msg of messages) {
    conversationHistory.push({
      role: msg.role,
      content: msg.role === 'user' ? `<user_input>${msg.content}</user_input>` : msg.content,
    });
  }

  // Build comprehensive system prompt
  const systemPrompt = buildDialogSystemPrompt(
    currentProfile,
    context.phase,
    context.emotionalContext,
    context.memory,
    context.classification
  );

  const response = await withTimeout(
    anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      system: systemPrompt,
      messages: conversationHistory,
    }),
    LLM_TIMEOUT_MS,
    'dialog_reply'
  );

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from dialog agent');
  }

  return { reply: content.text };
}

// ============================================
// Cross-Domain Handler
// ============================================

/**
 * Handle items that belong to both domains
 */
function handleCrossDomain(
  items: CrossDomainItem[]
): { professionalUpdates: Partial<OnboardingProfileData>; lifeUpdates: Partial<OnboardingProfileData> } {
  const professionalUpdates: Partial<OnboardingProfileData> = {};
  const lifeUpdates: Partial<OnboardingProfileData> = {};

  for (const item of items) {
    // Add to both domains based on context
    if (item.primary_domain === 'professional') {
      // Primary professional, secondary life
      professionalUpdates.skills = mergeArrayField(professionalUpdates.skills, [item.item]);
      lifeUpdates.interests = mergeArrayField(lifeUpdates.interests, [item.item]);
    } else {
      // Primary life, secondary professional
      lifeUpdates.interests = mergeArrayField(lifeUpdates.interests, [item.item]);
      professionalUpdates.skills = mergeArrayField(professionalUpdates.skills, [item.item]);
    }

    logAgent('orchestrator', 'debug', 'cross_domain_handled', {
      item: item.item,
      primaryDomain: item.primary_domain,
      reason: item.reason,
    });
  }

  return { professionalUpdates, lifeUpdates };
}

// ============================================
// Intent Inference
// ============================================

/**
 * Infer relationship intents from classification and extractions
 */
function inferIntents(
  classification: EnhancedClassificationResult,
  existingIntents?: RelationshipIntent[]
): RelationshipIntent[] {
  const intents: Set<RelationshipIntent> = new Set(existingIntents || []);

  // Infer from professional extraction
  const professionalIntents = professionalAgent.inferIntents(classification.professional);
  for (const intent of professionalIntents) {
    intents.add(intent);
  }

  // Infer from life extraction
  const lifeIntents = lifeAgent.inferIntents(classification.life);
  for (const intent of lifeIntents) {
    intents.add(intent);
  }

  return Array.from(intents);
}

// ============================================
// Main Orchestrator
// ============================================

/**
 * Handle multi-agent chat with enhanced context awareness
 *
 * Pipeline:
 * 1. Build context (phase, emotion, memory)
 * 2. Run classifier to get enhanced classification
 * 3. Generate dialog reply with full context
 * 4. Route to domain agents for extraction
 * 5. Merge results and check completion
 */
export async function handleMultiAgentChat(
  messages: ChatMessage[],
  currentProfile: Partial<OnboardingProfileData>,
  sessionId: string
): Promise<MultiAgentChatResult> {
  const startTime = Date.now();
  const lastMessage = messages[messages.length - 1];

  logAgent('orchestrator', 'info', 'chat_start', {
    sessionId,
    messageCount: messages.length,
    lastMessageLength: lastMessage?.content?.length || 0,
  });

  try {
    // Step 1: Build context - these are fast local operations
    const phase = detectPhase(messages, currentProfile);
    const emotionalContext = buildEmotionalContext(messages);
    const memory = buildConversationMemory(messages);

    logAgent('orchestrator', 'debug', 'context_built', {
      phase,
      emotionalState: emotionalContext.current_state,
      emotionalShift: emotionalContext.emotional_shift,
      keyFactsCount: memory.keyFacts.length,
      topicCount: memory.topicTrail.length,
    });

    // Step 2: Run classifier (includes emotional state and user style)
    const classification = await classifyMessage(lastMessage.content, messages.slice(0, -1));

    logAgent('orchestrator', 'debug', 'classification_complete', {
      domain: classification.domain,
      confidence: classification.confidence,
      emotionalState: classification.emotional_state,
      emotionalCues: classification.emotional_cues,
      hasUserStyle: Boolean(classification.user_style),
    });

    // Step 3: Generate dialog reply with full context
    const dialogResult = await generateDialogReply(
      messages,
      currentProfile,
      {
        phase,
        emotionalContext,
        memory,
        classification,
      }
    );

    logAgent('orchestrator', 'debug', 'dialog_complete', {
      replyLength: dialogResult.reply.length,
    });

    // Step 4: Route to domain agents based on classification
    const updates: DomainUpdate[] = [];

    if (classification.domain !== 'life' && classification.domain !== 'ambiguous') {
      // Process professional extraction
      const professionalUpdate = await professionalAgent.process(classification.professional);
      if (Object.keys(professionalUpdate.updates).length > 0) {
        updates.push(professionalUpdate);
      }
    }

    if (classification.domain !== 'professional' && classification.domain !== 'ambiguous') {
      // Process life extraction
      const lifeUpdate = await lifeAgent.process(classification.life);
      if (Object.keys(lifeUpdate.updates).length > 0) {
        updates.push(lifeUpdate);
      }
    }

    // Handle cross-domain items
    if (classification.cross_domain.length > 0) {
      const crossDomainResults = handleCrossDomain(classification.cross_domain);

      if (Object.keys(crossDomainResults.professionalUpdates).length > 0) {
        updates.push({
          domain: 'professional',
          updates: crossDomainResults.professionalUpdates,
        });
      }

      if (Object.keys(crossDomainResults.lifeUpdates).length > 0) {
        updates.push({
          domain: 'life',
          updates: crossDomainResults.lifeUpdates,
        });
      }
    }

    // Step 5: Merge extractions
    const extracted = mergeExtractions(updates);

    // Step 6: Infer intents
    const inferredIntents = inferIntents(classification, currentProfile.intents);
    if (inferredIntents.length > 0 && !extracted.intents) {
      extracted.intents = inferredIntents;
    } else if (inferredIntents.length > 0 && extracted.intents) {
      extracted.intents = mergeArrayField(extracted.intents, inferredIntents);
    }

    // Step 7: Check completion (consider phase)
    const isComplete = phase === 'wrapping' && checkCompletion(currentProfile, updates);

    const latencyMs = Date.now() - startTime;
    logAgent('orchestrator', 'info', 'chat_complete', {
      sessionId,
      latencyMs,
      phase,
      emotionalState: emotionalContext.current_state,
      domain: classification.domain,
      extractedFields: Object.keys(extracted),
      isComplete,
    });

    return {
      reply: dialogResult.reply,
      extracted,
      isComplete,
      classification,
    };
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : String(err);

    logAgent('orchestrator', 'error', 'chat_error', {
      sessionId,
      latencyMs,
      error: errorMessage,
    });

    // Return graceful error response with empathy
    let userMessage = '抱歉，我这边出了点小状况。能再说一次吗？';
    if (errorMessage.includes('timed out')) {
      userMessage = '思考得太久了，能再说一遍吗？';
    } else if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
      userMessage = '聊得太火热了，稍等一下再继续？';
    }

    return {
      reply: userMessage,
      extracted: {},
      isComplete: false,
    };
  }
}

export { generateDialogReply };
