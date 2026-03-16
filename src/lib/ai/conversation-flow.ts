/**
 * Conversation Flow Management
 *
 * Manages dialogue phases and transitions for natural conversation flow.
 * Ensures smooth progression from greeting to completion.
 */

import type { ChatMessage, OnboardingProfileData, ConversationPhase, PhaseTransition } from '@/types';

// ============================================
// Phase Configuration
// ============================================

export interface PhaseConfig {
  phase: ConversationPhase;
  goals: string[];
  minTurns: number;
  maxTurns: number;
  transitionCues: string[];
  promptOverrides: string[];
}

export const PHASE_CONFIGS: Record<ConversationPhase, PhaseConfig> = {
  greeting: {
    phase: 'greeting',
    goals: [
      '建立温暖友好的第一印象',
      '了解用户的名字',
      '开启自然的对话',
    ],
    minTurns: 1,
    maxTurns: 2,
    transitionCues: [
      '用户介绍了自己',
      '用户回应了问候',
      '用户开始分享信息',
    ],
    promptOverrides: [
      '保持轻松友好',
      '不要急于收集信息',
      '让用户感到被欢迎',
    ],
  },
  exploration: {
    phase: 'exploration',
    goals: [
      '了解用户的职业背景',
      '发现用户的兴趣爱好',
      '理解用户的目标',
    ],
    minTurns: 4,
    maxTurns: 15,
    transitionCues: [
      '多个核心领域都已涉及',
      '用户分享了足够的信息',
      '发现值得深挖的话题',
    ],
    promptOverrides: [
      '在不同话题间自然过渡',
      '根据用户的兴趣灵活调整',
      '保持对话的流畅性',
    ],
  },
  deepening: {
    phase: 'deepening',
    goals: [
      '深入了解感兴趣的话题',
      '发现用户的独特之处',
      '建立更深的连接',
    ],
    minTurns: 2,
    maxTurns: 5,
    transitionCues: [
      '话题已经充分展开',
      '用户表示满意',
      '信息收集基本完成',
    ],
    promptOverrides: [
      '追问有意思的细节',
      '表达对用户故事的兴趣',
      '不要急于结束',
    ],
  },
  wrapping: {
    phase: 'wrapping',
    goals: [
      '确认已收集的信息',
      '询问是否有补充',
      '结束对话',
    ],
    minTurns: 1,
    maxTurns: 3,
    transitionCues: [
      '用户确认完成',
      '没有更多补充',
    ],
    promptOverrides: [
      '温和地总结对话',
      '询问是否需要补充',
      '表达感谢',
    ],
  },
};

// ============================================
// Phase Detection
// ============================================

/**
 * Detect current conversation phase based on message history and profile data
 */
export function detectPhase(
  messages: ChatMessage[],
  profileData: Partial<OnboardingProfileData>
): ConversationPhase {
  const userMessageCount = messages.filter((m) => m.role === 'user').length;
  const collectedFieldCount = countCollectedFields(profileData);

  // Greeting phase: first 1-2 turns
  if (userMessageCount <= 1) {
    return 'greeting';
  }

  // Wrapping phase: enough data collected and explicit signals
  const lastUserMessage = messages.filter((m) => m.role === 'user').slice(-1)[0]?.content || '';
  const wrappingSignals = [
    '没了', '差不多了', '可以了', '就这些', '完成', '好了',
    '没有了', '没什么了', '结束', '足够了',
  ];

  if (
    collectedFieldCount >= 6 &&
    wrappingSignals.some((signal) => lastUserMessage.includes(signal))
  ) {
    return 'wrapping';
  }

  // Deepening phase: found interesting topic to explore
  const deepeningSignals = [
    '其实', '说实话', '详细说说', '具体', '比如说',
    '举个例子', '为什么', '怎么', '告诉你',
  ];

  if (
    collectedFieldCount >= 3 &&
    userMessageCount >= 5 &&
    deepeningSignals.some((signal) => lastUserMessage.includes(signal))
  ) {
    return 'deepening';
  }

  // Default: exploration phase
  return 'exploration';
}

/**
 * Count how many profile fields have been collected
 */
function countCollectedFields(profileData: Partial<OnboardingProfileData>): number {
  let count = 0;
  const fields: (keyof OnboardingProfileData)[] = [
    'display_name',
    'headline',
    'location',
    'work_experience',
    'skills',
    'can_offer',
    'looking_for',
    'current_goals',
    'interests',
    'values',
    'intents',
  ];

  for (const field of fields) {
    const value = profileData[field];
    if (value !== undefined && value !== null) {
      if (Array.isArray(value) && value.length > 0) {
        count++;
      } else if (!Array.isArray(value) && value) {
        count++;
      }
    }
  }

  return count;
}

// ============================================
// Phase Transition Logic
// ============================================

/**
 * Check if it's time to transition to the next phase
 */
export function shouldTransitionPhase(
  currentPhase: ConversationPhase,
  messages: ChatMessage[],
  profileData: Partial<OnboardingProfileData>
): PhaseTransition | null {
  const config = PHASE_CONFIGS[currentPhase];
  const userMessageCount = messages.filter((m) => m.role === 'user').length;
  const collectedFieldCount = countCollectedFields(profileData);

  // Check minimum turns
  if (userMessageCount < config.minTurns) {
    return null;
  }

  // Phase-specific transition logic
  switch (currentPhase) {
    case 'greeting': {
      // Transition to exploration once we have basic interaction
      if (userMessageCount >= 1) {
        return {
          from: 'greeting',
          to: 'exploration',
          reason: '已建立初步连接',
        };
      }
      break;
    }

    case 'exploration': {
      // Transition to deepening if we found an interesting topic
      const lastMessage = messages.filter((m) => m.role === 'user').slice(-1)[0];
      const isDetailedShare = lastMessage && lastMessage.content.length > 100;
      const hasEnoughData = collectedFieldCount >= 4;

      if (isDetailedShare && hasEnoughData) {
        return {
          from: 'exploration',
          to: 'deepening',
          reason: '用户分享了有趣的细节',
        };
      }

      // Transition to wrapping if enough data
      if (collectedFieldCount >= 7 && userMessageCount >= 8) {
        return {
          from: 'exploration',
          to: 'wrapping',
          reason: '已收集足够信息',
        };
      }
      break;
    }

    case 'deepening': {
      // Transition to wrapping after exploring
      if (userMessageCount >= config.minTurns && collectedFieldCount >= 6) {
        return {
          from: 'deepening',
          to: 'wrapping',
          reason: '话题已充分展开',
        };
      }
      break;
    }

    case 'wrapping': {
      // Stay in wrapping until completion
      return null;
    }
  }

  // Force transition if max turns exceeded
  if (userMessageCount >= config.maxTurns) {
    const nextPhase = getNextPhase(currentPhase);
    if (nextPhase) {
      return {
        from: currentPhase,
        to: nextPhase,
        reason: '对话已足够长',
      };
    }
  }

  return null;
}

/**
 * Get the next phase in the conversation flow
 */
function getNextPhase(currentPhase: ConversationPhase): ConversationPhase | null {
  const phaseOrder: ConversationPhase[] = ['greeting', 'exploration', 'deepening', 'wrapping'];
  const currentIndex = phaseOrder.indexOf(currentPhase);

  if (currentIndex >= 0 && currentIndex < phaseOrder.length - 1) {
    return phaseOrder[currentIndex + 1];
  }

  return null;
}

// ============================================
// Phase-Specific Prompts
// ============================================

/**
 * Generate phase-specific prompt additions
 */
export function generatePhasePrompt(phase: ConversationPhase): string {
  const config = PHASE_CONFIGS[phase];

  let prompt = `\n## 当前对话阶段: ${getPhaseLabel(phase)}\n`;

  prompt += `\n### 阶段目标\n`;
  prompt += config.goals.map((g) => `- ${g}`).join('\n');

  prompt += `\n\n### 注意事项\n`;
  prompt += config.promptOverrides.map((o) => `- ${o}`).join('\n');

  // Add phase-specific instructions
  switch (phase) {
    case 'greeting':
      prompt += `\n\n### 开场建议
- 用用户的名字打招呼（如果知道的话）
- 简单介绍自己是谁
- 用一个轻松的问题开始对话
- 不要一开始就问职业/兴趣等正式问题`;
      break;

    case 'exploration':
      prompt += `\n\n### 探索建议
- 根据用户的回答灵活选择下一个话题
- 不需要按固定顺序收集信息
- 对有趣的分享表达真诚的好奇
- 在不同领域间自然过渡`;
      break;

    case 'deepening':
      prompt += `\n\n### 深化建议
- 追问细节和背后的故事
- 探索用户的动机和感受
- 建立更深的情感连接
- 不要急于转到其他话题`;
      break;

    case 'wrapping':
      prompt += `\n\n### 收尾建议
- 温和地总结你了解到的内容
- 询问是否有想补充的
- 表达对这次对话的感谢
- 告诉用户接下来会发生什么`;
      break;
  }

  return prompt;
}

/**
 * Get human-readable phase label
 */
function getPhaseLabel(phase: ConversationPhase): string {
  const labels: Record<ConversationPhase, string> = {
    greeting: '开场问候',
    exploration: '自由探索',
    deepening: '深入了解',
    wrapping: '总结收尾',
  };
  return labels[phase];
}

// ============================================
// Missing Information Detection
// ============================================

/**
 * Get fields that still need to be collected
 */
export function getMissingFields(
  profileData: Partial<OnboardingProfileData>
): Array<{ field: string; priority: 'high' | 'medium' | 'low'; suggestedQuestion: string }> {
  const missing: Array<{ field: string; priority: 'high' | 'medium' | 'low'; suggestedQuestion: string }> = [];

  // High priority fields
  if (!profileData.display_name) {
    missing.push({
      field: 'display_name',
      priority: 'high',
      suggestedQuestion: '怎么称呼你比较好？',
    });
  }

  if (!profileData.intents || profileData.intents.length === 0) {
    missing.push({
      field: 'intents',
      priority: 'high',
      suggestedQuestion: '你来这里主要想认识什么样的人？',
    });
  }

  // Medium priority fields
  if (!profileData.headline && (!profileData.work_experience || profileData.work_experience.length === 0)) {
    missing.push({
      field: 'work',
      priority: 'medium',
      suggestedQuestion: '现在在做什么工作？',
    });
  }

  if (!profileData.interests || profileData.interests.length === 0) {
    missing.push({
      field: 'interests',
      priority: 'medium',
      suggestedQuestion: '平时喜欢做什么？',
    });
  }

  // Low priority fields
  if (!profileData.location) {
    missing.push({
      field: 'location',
      priority: 'low',
      suggestedQuestion: '你现在在哪个城市？',
    });
  }

  if (!profileData.values || profileData.values.length === 0) {
    missing.push({
      field: 'values',
      priority: 'low',
      suggestedQuestion: '你觉得什么对你来说比较重要？',
    });
  }

  if (!profileData.current_goals || profileData.current_goals.length === 0) {
    missing.push({
      field: 'current_goals',
      priority: 'low',
      suggestedQuestion: '最近有什么想实现的目标吗？',
    });
  }

  return missing;
}

/**
 * Generate prompt hint about missing information
 */
export function generateMissingInfoPrompt(
  profileData: Partial<OnboardingProfileData>
): string {
  const missing = getMissingFields(profileData);
  const highPriority = missing.filter((m) => m.priority === 'high');

  if (highPriority.length === 0) {
    return '';
  }

  let prompt = '\n## 待了解的信息\n';
  prompt += '以下信息很重要但还不清楚，有机会自然地了解：\n';
  prompt += highPriority.map((m) => `- ${m.suggestedQuestion}`).join('\n');

  return prompt;
}

// ============================================
// Progress Feedback
// ============================================

/**
 * Generate warm progress feedback message
 */
export function generateProgressFeedback(
  profileData: Partial<OnboardingProfileData>,
  userMessageCount: number
): string {
  const collectedCount = countCollectedFields(profileData);

  if (userMessageCount < 3) {
    return '';
  }

  if (collectedCount < 3) {
    return '我们刚开始聊，慢慢来～';
  }

  if (collectedCount < 5) {
    return '聊了一会了，对你有了初步的了解';
  }

  if (collectedCount < 7) {
    return '你分享了很多有意思的内容，继续聊聊？';
  }

  return '感觉对你已经有了不错的了解';
}
