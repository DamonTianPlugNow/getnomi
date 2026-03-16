/**
 * User Style Detection and Adaptation
 *
 * Analyzes user communication patterns and adapts AI responses accordingly.
 * Enables personalized conversation experience based on user preferences.
 */

import type { ChatMessage, UserStyle, StyleAdaptation } from '@/types';

// ============================================
// Style Detection
// ============================================

/**
 * Analyze user messages to detect their communication style
 */
export function detectUserStyle(messages: ChatMessage[]): UserStyle {
  const userMessages = messages.filter((m) => m.role === 'user');

  if (userMessages.length === 0) {
    return getDefaultStyle();
  }

  return {
    verbosity: detectVerbosity(userMessages),
    formality: detectFormality(userMessages),
    openness: detectOpenness(userMessages),
    pace: detectPace(userMessages),
    emoji_usage: detectEmojiUsage(userMessages),
    question_style: detectQuestionStyle(userMessages),
  };
}

/**
 * Default style when no messages to analyze
 */
function getDefaultStyle(): UserStyle {
  return {
    verbosity: 'moderate',
    formality: 'casual',
    openness: 'moderate',
    pace: 'thoughtful',
    emoji_usage: 'none',
    question_style: 'direct',
  };
}

// ============================================
// Style Component Detection
// ============================================

/**
 * Detect verbosity level from message length patterns
 */
function detectVerbosity(
  messages: Array<{ content: string }>
): 'brief' | 'moderate' | 'detailed' {
  const avgLength =
    messages.reduce((sum, m) => sum + m.content.length, 0) / messages.length;

  if (avgLength < 30) return 'brief';
  if (avgLength > 100) return 'detailed';
  return 'moderate';
}

/**
 * Detect formality level from language patterns
 */
function detectFormality(
  messages: Array<{ content: string }>
): 'casual' | 'neutral' | 'formal' {
  let formalScore = 0;
  let casualScore = 0;

  const formalIndicators = [
    '您', '请', '麻烦', '感谢', '谢谢您', '不好意思',
    '请问', '请教', '打扰', '冒昧',
  ];

  const casualIndicators = [
    '哈哈', '嘿', '嗯', '呢', '啊', '嘛', '哎', '诶',
    '咋', '咱', '俺', '～', '~', '嘻嘻', '哈', '噢',
  ];

  const text = messages.map((m) => m.content).join(' ');

  for (const indicator of formalIndicators) {
    const count = (text.match(new RegExp(indicator, 'g')) || []).length;
    formalScore += count;
  }

  for (const indicator of casualIndicators) {
    const count = (text.match(new RegExp(indicator, 'g')) || []).length;
    casualScore += count;
  }

  if (formalScore > casualScore * 2) return 'formal';
  if (casualScore > formalScore * 2) return 'casual';
  return 'neutral';
}

/**
 * Detect openness level from sharing patterns
 */
function detectOpenness(
  messages: Array<{ content: string }>
): 'reserved' | 'moderate' | 'open' {
  const text = messages.map((m) => m.content).join(' ');

  // Indicators of openness
  const openIndicators = [
    /其实/g,
    /说实话/g,
    /老实说/g,
    /坦白(说|讲)/g,
    /我(觉得|认为|感觉)/g,
    /对我来说/g,
    /个人(觉得|认为)/g,
    /分享/g,
  ];

  // Indicators of reservation
  const reservedIndicators = [
    /不太(想|方便|好意思)/g,
    /这个.*(不太|不好)/g,
    /暂时不/g,
    /可能吧/g,
    /还行/g,
    /一般/g,
  ];

  let openScore = 0;
  let reservedScore = 0;

  for (const pattern of openIndicators) {
    openScore += (text.match(pattern) || []).length;
  }

  for (const pattern of reservedIndicators) {
    reservedScore += (text.match(pattern) || []).length;
  }

  // Also consider message length as indicator
  const avgLength =
    messages.reduce((sum, m) => sum + m.content.length, 0) / messages.length;
  if (avgLength > 80) openScore += 2;
  if (avgLength < 20) reservedScore += 2;

  if (openScore > reservedScore + 2) return 'open';
  if (reservedScore > openScore + 2) return 'reserved';
  return 'moderate';
}

/**
 * Detect conversation pace preference
 */
function detectPace(
  messages: Array<{ content: string }>
): 'fast' | 'thoughtful' {
  // Indicators of fast pace
  const fastIndicators = [
    /^(好|嗯|对|是|行)$/,
    /^.{1,10}$/,
    /简单来说/,
    /长话短说/,
  ];

  // Indicators of thoughtful pace
  const thoughtfulIndicators = [
    /仔细想想/,
    /让我想一下/,
    /这个问题/,
    /其实.*想说/,
  ];

  let fastCount = 0;
  let thoughtfulCount = 0;

  for (const msg of messages) {
    for (const pattern of fastIndicators) {
      if (pattern.test(msg.content)) fastCount++;
    }
    for (const pattern of thoughtfulIndicators) {
      if (pattern.test(msg.content)) thoughtfulCount++;
    }
  }

  // Also consider average message length
  const avgLength =
    messages.reduce((sum, m) => sum + m.content.length, 0) / messages.length;
  if (avgLength > 60) thoughtfulCount++;
  if (avgLength < 30) fastCount++;

  return fastCount > thoughtfulCount ? 'fast' : 'thoughtful';
}

/**
 * Detect emoji usage patterns
 */
function detectEmojiUsage(
  messages: Array<{ content: string }>
): 'none' | 'occasional' | 'frequent' {
  const emojiPattern = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]/gu;

  let totalEmojis = 0;
  for (const msg of messages) {
    const matches = msg.content.match(emojiPattern);
    if (matches) totalEmojis += matches.length;
  }

  const avgEmojis = totalEmojis / messages.length;

  if (avgEmojis >= 2) return 'frequent';
  if (avgEmojis > 0) return 'occasional';
  return 'none';
}

/**
 * Detect how users ask questions
 */
function detectQuestionStyle(
  messages: Array<{ content: string }>
): 'direct' | 'indirect' {
  const indirectPatterns = [
    /不知道.*能不能/,
    /可以问一下/,
    /方便.*(问|说)/,
    /想请教/,
  ];

  let indirectCount = 0;
  for (const msg of messages) {
    for (const pattern of indirectPatterns) {
      if (pattern.test(msg.content)) indirectCount++;
    }
  }

  return indirectCount >= 2 ? 'indirect' : 'direct';
}

// ============================================
// Style Adaptation
// ============================================

/**
 * Generate style adaptation guidelines for the dialog agent
 */
export function generateStyleAdaptation(style: UserStyle): StyleAdaptation {
  const adaptations: StyleAdaptation = {
    responseLength: 'moderate',
    toneAdjustment: [],
    questionApproach: 'balanced',
    promptHints: [],
  };

  // Adapt to verbosity
  switch (style.verbosity) {
    case 'brief':
      adaptations.responseLength = 'short';
      adaptations.promptHints.push('保持回复简短，不要长篇大论');
      adaptations.promptHints.push('一两句话回应即可');
      break;
    case 'detailed':
      adaptations.responseLength = 'detailed';
      adaptations.promptHints.push('用户喜欢详细表达，可以追问更多细节');
      adaptations.promptHints.push('回复可以稍微详细一些');
      break;
    default:
      adaptations.responseLength = 'moderate';
  }

  // Adapt to formality
  switch (style.formality) {
    case 'formal':
      adaptations.toneAdjustment.push('slightly_formal');
      adaptations.promptHints.push('用户语气较正式，保持礼貌但不要过于生硬');
      break;
    case 'casual':
      adaptations.toneAdjustment.push('relaxed');
      adaptations.promptHints.push('用户很随意，可以用轻松的语气');
      break;
  }

  // Adapt to openness
  switch (style.openness) {
    case 'reserved':
      adaptations.questionApproach = 'gentle';
      adaptations.promptHints.push('用户比较保守，不要问太私密的问题');
      adaptations.promptHints.push('给用户更多选择空间');
      break;
    case 'open':
      adaptations.questionApproach = 'exploratory';
      adaptations.promptHints.push('用户愿意分享，可以问更深入的问题');
      break;
  }

  // Adapt to pace
  if (style.pace === 'fast') {
    adaptations.promptHints.push('用户节奏较快，不要拖沓');
  }

  // Adapt to emoji usage
  if (style.emoji_usage === 'frequent') {
    adaptations.toneAdjustment.push('playful');
    adaptations.promptHints.push('可以偶尔用表情符号增加亲切感');
  }

  return adaptations;
}

/**
 * Generate prompt for style adaptation
 */
export function generateStylePrompt(style: UserStyle): string {
  const adaptation = generateStyleAdaptation(style);

  if (adaptation.promptHints.length === 0) {
    return '';
  }

  let prompt = '\n## 用户沟通风格\n';

  // Describe the detected style
  const styleDescription: string[] = [];

  if (style.verbosity === 'brief') {
    styleDescription.push('回答简洁');
  } else if (style.verbosity === 'detailed') {
    styleDescription.push('表达详细');
  }

  if (style.formality === 'formal') {
    styleDescription.push('语气正式');
  } else if (style.formality === 'casual') {
    styleDescription.push('语气轻松');
  }

  if (style.openness === 'reserved') {
    styleDescription.push('比较含蓄');
  } else if (style.openness === 'open') {
    styleDescription.push('乐于分享');
  }

  if (styleDescription.length > 0) {
    prompt += `\n用户风格: ${styleDescription.join('、')}\n`;
  }

  prompt += `\n### 适配建议\n`;
  prompt += adaptation.promptHints.map((h) => `- ${h}`).join('\n');

  return prompt;
}

// ============================================
// Style Matching
// ============================================

/**
 * Mirror user's style in response
 */
export function getMirroringGuidelines(style: UserStyle): string[] {
  const guidelines: string[] = [];

  // Length mirroring
  if (style.verbosity === 'brief') {
    guidelines.push('回复不要超过2句话');
  } else if (style.verbosity === 'detailed') {
    guidelines.push('可以用2-3句话回复，包含一些细节');
  }

  // Formality mirroring
  if (style.formality === 'formal') {
    guidelines.push('使用"您"而非"你"');
    guidelines.push('措辞稍微正式一点');
  } else if (style.formality === 'casual') {
    guidelines.push('语气可以更随意');
    guidelines.push('可以用一些口语化的表达');
  }

  // Energy mirroring
  if (style.emoji_usage !== 'none') {
    guidelines.push('偶尔可以用表情增加亲切感');
  }

  return guidelines;
}

/**
 * Check if response matches user style
 */
export function validateStyleMatch(
  response: string,
  style: UserStyle
): { matches: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check length match
  if (style.verbosity === 'brief' && response.length > 100) {
    issues.push('回复过长，用户偏好简短交流');
  }

  // Check formality match
  if (style.formality === 'formal' && /哈哈|嘿|呢|嘛/.test(response)) {
    issues.push('语气过于随意，用户偏好正式交流');
  }

  if (style.formality === 'casual' && /您|请问|打扰/.test(response)) {
    issues.push('语气过于正式，用户偏好轻松交流');
  }

  return {
    matches: issues.length === 0,
    issues,
  };
}

// ============================================
// Style Evolution Tracking
// ============================================

/**
 * Track how user style evolves during conversation
 */
export function trackStyleEvolution(
  previousStyle: UserStyle | null,
  currentStyle: UserStyle
): {
  changed: boolean;
  changes: Array<{ dimension: string; from: string; to: string }>;
} {
  if (!previousStyle) {
    return { changed: false, changes: [] };
  }

  const changes: Array<{ dimension: string; from: string; to: string }> = [];

  if (previousStyle.verbosity !== currentStyle.verbosity) {
    changes.push({
      dimension: 'verbosity',
      from: previousStyle.verbosity,
      to: currentStyle.verbosity,
    });
  }

  if (previousStyle.formality !== currentStyle.formality) {
    changes.push({
      dimension: 'formality',
      from: previousStyle.formality,
      to: currentStyle.formality,
    });
  }

  if (previousStyle.openness !== currentStyle.openness) {
    changes.push({
      dimension: 'openness',
      from: previousStyle.openness,
      to: currentStyle.openness,
    });
  }

  return {
    changed: changes.length > 0,
    changes,
  };
}
