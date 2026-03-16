/**
 * Emotional Intelligence Module
 *
 * Provides emotion detection, response strategies, and emotional context
 * for more empathetic AI conversations. Based on research from:
 * - PMC: AI Chatbot Emotional Connection Studies
 * - Emotional contagion theory in human-AI interaction
 */

import type { EmotionalState, EmotionalContext } from '@/types';

// ============================================
// Emotional Response Strategies
// ============================================

/**
 * Response strategies for each emotional state
 */
export const EMOTIONAL_RESPONSES: Record<EmotionalState, {
  strategy: string;
  prompts: string[];
  avoid: string[];
}> = {
  excited: {
    strategy: '认可成就，表达真诚的欣赏，邀请分享更多细节',
    prompts: [
      '真诚地表达对用户分享的欣赏',
      '追问让他们兴奋的具体细节',
      '分享你对这件事的好奇',
    ],
    avoid: [
      '过度夸张的反应（"太棒了！！！"）',
      '立刻转移话题',
      '敷衍的回应',
    ],
  },
  uncertain: {
    strategy: '正常化不确定性，提供支持，轻柔引导而非给建议',
    prompts: [
      '先承认这种感觉很正常',
      '问问他们最困扰的是什么',
      '提供温和的引导而非解决方案',
    ],
    avoid: [
      '急于给出建议',
      '过度乐观（"没关系的！"）',
      '质疑他们的感受',
    ],
  },
  nostalgic: {
    strategy: '尊重情感时刻，适度共情，温和过渡',
    prompts: [
      '对分享表示珍惜和理解',
      '允许用户停留在这个情感中',
      '自然地引导到相关话题',
    ],
    avoid: [
      '打断情感流动',
      '立刻跳到另一个话题',
      '过度分析',
    ],
  },
  frustrated: {
    strategy: '先承认困难，再提供视角，不急于解决',
    prompts: [
      '验证他们的感受（"这确实让人沮丧"）',
      '问问具体是什么让他们困扰',
      '表达理解和支持',
    ],
    avoid: [
      '立刻解决问题',
      '说"别担心"或"没那么严重"',
      '给未经请求的建议',
    ],
  },
  reflective: {
    strategy: '给予思考空间，提出深入的问题，尊重节奏',
    prompts: [
      '欣赏他们的深度思考',
      '提出能引发更多反思的问题',
      '不要急于填充沉默',
    ],
    avoid: [
      '打断思考',
      '过于轻快的语气',
      '表面化的问题',
    ],
  },
  neutral: {
    strategy: '保持友好，自然推进对话，寻找兴趣点',
    prompts: [
      '保持温暖友好的语气',
      '通过有趣的问题激发对话',
      '观察可能的兴趣点',
    ],
    avoid: [
      '过于机械',
      '一连串的问题',
      '缺乏个性化',
    ],
  },
};

// ============================================
// Emotional Cue Patterns
// ============================================

/**
 * Patterns that indicate different emotional states
 */
export const EMOTIONAL_CUES: Record<EmotionalState, {
  keywords: string[];
  patterns: RegExp[];
  contextClues: string[];
}> = {
  excited: {
    keywords: [
      '太开心', '好兴奋', '终于', '成功', '实现', '搞定', '通过了',
      '拿到', '被录取', '升职', '加薪', '发布', '上线', '完成',
    ],
    patterns: [
      /！{2,}/,
      /哈哈+/,
      /太[好棒爽酷]了/,
      /终于.*(了|啦)/,
    ],
    contextClues: ['分享成就', '报告好消息', '表达期待'],
  },
  uncertain: {
    keywords: [
      '不确定', '迷茫', '困惑', '纠结', '不知道', '犹豫', '迷惑',
      '不太清楚', '说不准', '可能', '也许', '不知道该',
    ],
    patterns: [
      /不知道.*(该|怎么|如何)/,
      /是不是应该/,
      /还是.*(呢|好)/,
      /\?{2,}/,
    ],
    contextClues: ['寻求方向', '表达困惑', '请求建议'],
  },
  nostalgic: {
    keywords: [
      '以前', '那时候', '曾经', '回忆', '怀念', '想起', '还记得',
      '当年', '小时候', '年轻时', '刚开始',
    ],
    patterns: [
      /以前.*(的时候|那会儿)/,
      /想起.*(了|来)/,
      /还记得/,
    ],
    contextClues: ['回忆过去', '对比今昔', '情感追溯'],
  },
  frustrated: {
    keywords: [
      '烦', '累', '难', '沮丧', '郁闷', '无奈', '失望', '受够',
      '头疼', '崩溃', '放弃', '不想', '讨厌', '烦死',
    ],
    patterns: [
      /真的.*(烦|累|难)/,
      /受不了/,
      /太.*(烦|累|难)了/,
      /唉+/,
    ],
    contextClues: ['抱怨困难', '表达不满', '寻求理解'],
  },
  reflective: {
    keywords: [
      '想想', '觉得', '感觉', '认为', '思考', '反思', '意识到',
      '发现', '领悟', '明白', '理解', '其实',
    ],
    patterns: [
      /我(觉得|认为|感觉|想)/,
      /仔细想想/,
      /回头看/,
      /其实.*(是|有)/,
    ],
    contextClues: ['自我分析', '深入思考', '总结感悟'],
  },
  neutral: {
    keywords: [],
    patterns: [],
    contextClues: ['一般陈述', '回答问题', '提供信息'],
  },
};

// ============================================
// Emotion Detection Functions
// ============================================

/**
 * Detect emotional state from message content
 * Uses keyword matching and pattern recognition
 */
export function detectEmotionalState(message: string): EmotionalState {
  const scores: Record<EmotionalState, number> = {
    excited: 0,
    uncertain: 0,
    nostalgic: 0,
    frustrated: 0,
    reflective: 0,
    neutral: 0,
  };

  for (const [state, cues] of Object.entries(EMOTIONAL_CUES) as [EmotionalState, typeof EMOTIONAL_CUES[EmotionalState]][]) {
    // Check keywords
    for (const keyword of cues.keywords) {
      if (message.includes(keyword)) {
        scores[state] += 1;
      }
    }

    // Check patterns
    for (const pattern of cues.patterns) {
      if (pattern.test(message)) {
        scores[state] += 2; // Patterns are weighted higher
      }
    }
  }

  // Find the highest scoring state
  let maxState: EmotionalState = 'neutral';
  let maxScore = 0;

  for (const [state, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      maxState = state as EmotionalState;
    }
  }

  // Default to neutral if no strong signals (threshold = 2)
  return maxScore >= 2 ? maxState : 'neutral';
}

/**
 * Extract emotional cues (evidence) from message
 */
export function extractEmotionalCues(message: string): string[] {
  const cues: string[] = [];

  for (const [state, config] of Object.entries(EMOTIONAL_CUES) as [EmotionalState, typeof EMOTIONAL_CUES[EmotionalState]][]) {
    if (state === 'neutral') continue;

    // Find matching keywords
    for (const keyword of config.keywords) {
      if (message.includes(keyword)) {
        cues.push(keyword);
      }
    }

    // Find matching patterns and extract the matched text
    for (const pattern of config.patterns) {
      const match = message.match(pattern);
      if (match) {
        cues.push(match[0]);
      }
    }
  }

  return [...new Set(cues)]; // Remove duplicates
}

/**
 * Build emotional context from conversation history
 */
export function buildEmotionalContext(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
): EmotionalContext {
  // Analyze last 3 user messages
  const recentUserMessages = messages
    .filter((m) => m.role === 'user')
    .slice(-3);

  const states: EmotionalState[] = [];
  const allCues: string[] = [];

  for (const msg of recentUserMessages) {
    states.push(detectEmotionalState(msg.content));
    allCues.push(...extractEmotionalCues(msg.content));
  }

  // Determine current state (most recent)
  const currentState = states[states.length - 1] || 'neutral';

  // Detect emotional shift
  let emotionalShift: 'improving' | 'declining' | 'stable' = 'stable';
  if (states.length >= 2) {
    const stateValues: Record<EmotionalState, number> = {
      excited: 2,
      reflective: 1,
      neutral: 0,
      uncertain: -1,
      nostalgic: 0,
      frustrated: -2,
    };

    const recent = stateValues[states[states.length - 1]];
    const previous = stateValues[states[states.length - 2]];

    if (recent > previous) emotionalShift = 'improving';
    else if (recent < previous) emotionalShift = 'declining';
  }

  return {
    current_state: currentState,
    emotional_cues: [...new Set(allCues)],
    emotional_shift: emotionalShift,
    requires_support: ['frustrated', 'uncertain'].includes(currentState),
  };
}

// ============================================
// Emotional Response Helpers
// ============================================

/**
 * Get response strategy for an emotional state
 */
export function getEmotionalStrategy(state: EmotionalState): string {
  return EMOTIONAL_RESPONSES[state].strategy;
}

/**
 * Generate emotional context prompt for the dialog agent
 */
export function generateEmotionalPrompt(context: EmotionalContext): string {
  const strategy = EMOTIONAL_RESPONSES[context.current_state];

  let prompt = `\n## 情感状态
用户当前情感：${context.current_state}
${context.emotional_cues.length > 0 ? `情感线索：${context.emotional_cues.join(', ')}` : ''}
${context.emotional_shift !== 'stable' ? `情感趋势：${context.emotional_shift === 'improving' ? '好转' : '下降'}` : ''}

## 回应策略
${strategy.strategy}

建议：
${strategy.prompts.map((p) => `- ${p}`).join('\n')}

避免：
${strategy.avoid.map((a) => `- ${a}`).join('\n')}`;

  if (context.requires_support) {
    prompt += `\n\n⚠️ 用户可能需要额外的情感支持，请优先回应他们的感受。`;
  }

  return prompt;
}

/**
 * Check if response is emotionally appropriate
 */
export function validateEmotionalResponse(
  response: string,
  state: EmotionalState
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  const strategy = EMOTIONAL_RESPONSES[state];

  // Check for avoid patterns based on state
  if (state === 'frustrated') {
    if (/别担心|没关系|没那么/.test(response)) {
      issues.push('避免轻视用户的困扰');
    }
    if (/你(可以|应该|试试)/.test(response) && !/你觉得|你想/.test(response)) {
      issues.push('避免过早给出建议');
    }
  }

  if (state === 'uncertain') {
    if (/^你应该|^我建议/.test(response)) {
      issues.push('用户不确定时，先理解再引导');
    }
  }

  if (state === 'excited') {
    if (response.length > 100 && !/\?/.test(response)) {
      issues.push('用户兴奋时，追问细节比长篇大论更好');
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}
