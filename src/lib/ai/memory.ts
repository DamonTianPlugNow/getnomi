/**
 * Conversation Memory System
 *
 * Manages short-term memory for AI conversations, enabling:
 * - Key fact tracking and referencing
 * - Topic trail analysis
 * - Preference inference
 * - Memory-based response generation
 */

import type { ChatMessage, ConversationMemory, KeyFact, InferredPreferences } from '@/types';

// ============================================
// Memory Extraction
// ============================================

/**
 * Categories for key facts
 */
export type FactCategory = 'personal' | 'professional' | 'preference' | 'goal' | 'relationship';

/**
 * Extract key facts from a user message
 */
export function extractKeyFacts(
  message: string,
  turnIndex: number
): KeyFact[] {
  const facts: KeyFact[] = [];

  // Personal facts patterns
  const personalPatterns = [
    { pattern: /我叫(.+?)(?:[，。,.]|$)/, category: 'personal' as FactCategory, type: '名字' },
    { pattern: /在(.+?)(?:住|生活|待)/, category: 'personal' as FactCategory, type: '位置' },
    { pattern: /来自(.+?)(?:[，。,.]|$)/, category: 'personal' as FactCategory, type: '家乡' },
    { pattern: /(\d+)岁/, category: 'personal' as FactCategory, type: '年龄' },
  ];

  // Professional facts patterns
  const professionalPatterns = [
    { pattern: /在(.+?)(?:工作|上班|做)/, category: 'professional' as FactCategory, type: '公司' },
    { pattern: /(?:是|做)(.+?)(?:的工作|工程师|经理|设计师|产品)/, category: 'professional' as FactCategory, type: '职位' },
    { pattern: /(?:做了|有)(\d+(?:多)?)年/, category: 'professional' as FactCategory, type: '经验' },
    { pattern: /(?:会|擅长|熟悉)(.+?)(?:技术|语言|框架)/, category: 'professional' as FactCategory, type: '技能' },
  ];

  // Preference patterns
  const preferencePatterns = [
    { pattern: /喜欢(.+?)(?:[，。,.]|$)/, category: 'preference' as FactCategory, type: '喜好' },
    { pattern: /不喜欢(.+?)(?:[，。,.]|$)/, category: 'preference' as FactCategory, type: '不喜欢' },
    { pattern: /爱(.+?)(?:[，。,.]|$)/, category: 'preference' as FactCategory, type: '喜好' },
  ];

  // Goal patterns
  const goalPatterns = [
    { pattern: /想(?:要)?(.+?)(?:[，。,.]|$)/, category: 'goal' as FactCategory, type: '目标' },
    { pattern: /希望(.+?)(?:[，。,.]|$)/, category: 'goal' as FactCategory, type: '希望' },
    { pattern: /打算(.+?)(?:[，。,.]|$)/, category: 'goal' as FactCategory, type: '计划' },
  ];

  const allPatterns = [
    ...personalPatterns,
    ...professionalPatterns,
    ...preferencePatterns,
    ...goalPatterns,
  ];

  for (const { pattern, category, type } of allPatterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      facts.push({
        content: match[1].trim(),
        turnIndex,
        category,
        type,
        timestamp: Date.now(),
      });
    }
  }

  // Also extract any quoted content as potentially important
  const quotedContent = message.match(/"([^"]+)"|「([^」]+)」|'([^']+)'/g);
  if (quotedContent) {
    for (const quote of quotedContent) {
      const content = quote.replace(/["「」']/g, '');
      if (content.length > 2 && content.length < 50) {
        facts.push({
          content,
          turnIndex,
          category: 'personal',
          type: '引用',
          timestamp: Date.now(),
        });
      }
    }
  }

  return facts;
}

/**
 * Extract topic from a message
 */
export function extractTopic(message: string): string {
  // Topic keywords to look for
  const topicIndicators = [
    { pattern: /聊聊(.+?)(?:[的吧呢]|$)/, weight: 2 },
    { pattern: /关于(.+?)(?:[的，。]|$)/, weight: 2 },
    { pattern: /说说(.+?)(?:[的吧呢]|$)/, weight: 2 },
    { pattern: /(?:工作|职业|事业)/, topic: '职业' },
    { pattern: /(?:兴趣|爱好|喜欢做)/, topic: '兴趣爱好' },
    { pattern: /(?:朋友|社交|认识)/, topic: '社交' },
    { pattern: /(?:家庭|父母|孩子)/, topic: '家庭' },
    { pattern: /(?:旅行|旅游|去过)/, topic: '旅行' },
    { pattern: /(?:学习|学校|专业)/, topic: '教育' },
    { pattern: /(?:创业|项目|公司)/, topic: '创业' },
    { pattern: /(?:目标|计划|未来)/, topic: '目标规划' },
    { pattern: /(?:价值观|看法|觉得)/, topic: '价值观' },
  ];

  for (const indicator of topicIndicators) {
    if ('topic' in indicator && indicator.topic && indicator.pattern.test(message)) {
      return indicator.topic;
    }
    const match = message.match(indicator.pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return '一般对话';
}

// ============================================
// Preference Inference
// ============================================

/**
 * Infer user preferences from conversation patterns
 */
export function inferPreferences(messages: ChatMessage[]): InferredPreferences {
  const userMessages = messages.filter((m) => m.role === 'user');

  // Analyze verbosity (average message length)
  const avgLength =
    userMessages.reduce((sum, m) => sum + m.content.length, 0) /
    Math.max(userMessages.length, 1);
  const verbosity: 'brief' | 'detailed' = avgLength > 80 ? 'detailed' : 'brief';

  // Analyze formality
  const formalIndicators = ['您', '请问', '麻烦', '感谢', '谢谢您'];
  const casualIndicators = ['哈哈', '嘿', '嗯', '呢', '啊', '嘛'];

  let formalScore = 0;
  let casualScore = 0;

  for (const msg of userMessages) {
    for (const indicator of formalIndicators) {
      if (msg.content.includes(indicator)) formalScore++;
    }
    for (const indicator of casualIndicators) {
      if (msg.content.includes(indicator)) casualScore++;
    }
  }

  const formality: 'casual' | 'formal' = formalScore > casualScore ? 'formal' : 'casual';

  // Analyze openness (willingness to share)
  const shareIndicators = [
    /其实/,
    /说实话/,
    /老实说/,
    /坦白说/,
    /我觉得/,
    /我认为/,
    /分享.*一下/,
  ];

  let sharingScore = 0;
  for (const msg of userMessages) {
    for (const pattern of shareIndicators) {
      if (pattern.test(msg.content)) sharingScore++;
    }
  }

  const openness: 'reserved' | 'open' =
    sharingScore >= userMessages.length * 0.3 ? 'open' : 'reserved';

  // Analyze pace (response frequency and pattern)
  // For now, default to 'thoughtful' - could be enhanced with timing data
  const pace: 'fast' | 'thoughtful' = 'thoughtful';

  return {
    verbosity,
    formality,
    openness,
    pace,
  };
}

// ============================================
// Memory Management
// ============================================

/**
 * Build conversation memory from message history
 */
export function buildConversationMemory(
  messages: ChatMessage[]
): ConversationMemory {
  const keyFacts: KeyFact[] = [];
  const topicTrail: string[] = [];

  // Process each user message
  messages.forEach((msg, index) => {
    if (msg.role === 'user') {
      // Extract facts
      const facts = extractKeyFacts(msg.content, index);
      keyFacts.push(...facts);

      // Extract topic
      const topic = extractTopic(msg.content);
      if (topic !== '一般对话' && !topicTrail.includes(topic)) {
        topicTrail.push(topic);
      }
    }
  });

  // Infer preferences
  const inferredPreferences = inferPreferences(messages);

  return {
    keyFacts,
    topicTrail,
    inferredPreferences,
  };
}

/**
 * Get recent key facts (last N turns)
 */
export function getRecentFacts(
  memory: ConversationMemory,
  maxTurns: number = 5
): KeyFact[] {
  const maxTurnIndex = Math.max(...memory.keyFacts.map((f) => f.turnIndex), 0);
  const minTurn = maxTurnIndex - maxTurns;

  return memory.keyFacts.filter((f) => f.turnIndex >= minTurn);
}

/**
 * Find facts by category
 */
export function getFactsByCategory(
  memory: ConversationMemory,
  category: FactCategory
): KeyFact[] {
  return memory.keyFacts.filter((f) => f.category === category);
}

// ============================================
// Memory Prompt Generation
// ============================================

/**
 * Generate memory context for the dialog agent
 */
export function generateMemoryPrompt(memory: ConversationMemory): string {
  const recentFacts = getRecentFacts(memory, 5);

  if (recentFacts.length === 0 && memory.topicTrail.length === 0) {
    return '';
  }

  let prompt = '\n## 对话记忆\n';

  // Add key facts
  if (recentFacts.length > 0) {
    prompt += '\n### 用户提到的关键信息\n';
    const factsByCategory: Record<string, KeyFact[]> = {};

    for (const fact of recentFacts) {
      if (!factsByCategory[fact.category]) {
        factsByCategory[fact.category] = [];
      }
      factsByCategory[fact.category].push(fact);
    }

    for (const [category, facts] of Object.entries(factsByCategory)) {
      const categoryLabels: Record<string, string> = {
        personal: '个人信息',
        professional: '职业相关',
        preference: '偏好',
        goal: '目标',
        relationship: '关系',
      };
      prompt += `\n**${categoryLabels[category] || category}:**\n`;
      for (const fact of facts) {
        prompt += `- ${fact.type}: ${fact.content}\n`;
      }
    }
  }

  // Add topic trail
  if (memory.topicTrail.length > 0) {
    prompt += `\n### 聊过的话题\n`;
    prompt += memory.topicTrail.join(' → ') + '\n';
  }

  // Add usage instructions
  prompt += `
### 使用记忆
- 主动引用用户说过的内容（"你之前提到..."）
- 将新话题与已聊过的内容联系起来
- 避免重复问已经知道的信息`;

  return prompt;
}

/**
 * Generate a memory callback/reference for the response
 * This helps the AI naturally reference previous conversation
 */
export function generateMemoryCallbacks(memory: ConversationMemory): string[] {
  const callbacks: string[] = [];
  const recentFacts = getRecentFacts(memory, 3);

  for (const fact of recentFacts) {
    switch (fact.category) {
      case 'professional':
        callbacks.push(`你之前提到在${fact.content}...`);
        callbacks.push(`说到${fact.type}，${fact.content}...`);
        break;
      case 'personal':
        callbacks.push(`记得你说${fact.content}...`);
        callbacks.push(`关于${fact.content}...`);
        break;
      case 'preference':
        callbacks.push(`既然你喜欢${fact.content}...`);
        callbacks.push(`说到${fact.content}...`);
        break;
      case 'goal':
        callbacks.push(`你想${fact.content}这个目标...`);
        callbacks.push(`关于${fact.content}的计划...`);
        break;
    }
  }

  return callbacks;
}

/**
 * Check if a question has already been answered
 */
export function isAlreadyAnswered(
  memory: ConversationMemory,
  questionTopic: string
): boolean {
  // Check if we already have facts about this topic
  const topicKeywords: Record<string, string[]> = {
    name: ['名字', '叫'],
    location: ['位置', '城市', '住', '在'],
    job: ['工作', '职位', '公司', '职业'],
    interest: ['兴趣', '爱好', '喜欢'],
  };

  const keywords = topicKeywords[questionTopic] || [questionTopic];

  for (const fact of memory.keyFacts) {
    for (const keyword of keywords) {
      if (fact.type?.includes(keyword) || fact.content.includes(keyword)) {
        return true;
      }
    }
  }

  return false;
}

// ============================================
// Style Adaptation Prompt
// ============================================

/**
 * Generate style adaptation hints based on inferred preferences
 */
export function generateStyleAdaptationPrompt(
  preferences: InferredPreferences
): string {
  const hints: string[] = [];

  if (preferences.verbosity === 'brief') {
    hints.push('用户回答简洁，你也保持简短');
  } else {
    hints.push('用户喜欢详细分享，可以追问更多细节');
  }

  if (preferences.formality === 'formal') {
    hints.push('用户语气较正式，适当保持礼貌用语');
  } else {
    hints.push('用户语气轻松，可以更随意一点');
  }

  if (preferences.openness === 'open') {
    hints.push('用户愿意分享，可以问更深入的问题');
  } else {
    hints.push('用户相对保留，不要追问太私密的话题');
  }

  return `\n## 风格适配\n${hints.map((h) => `- ${h}`).join('\n')}`;
}
