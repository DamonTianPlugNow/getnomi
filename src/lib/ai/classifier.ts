/**
 * Message Classifier (Haiku)
 *
 * Uses Claude Haiku for fast, low-cost classification of user messages
 * into professional/life domains with structured extraction.
 * Enhanced with emotional state detection and user style analysis.
 */

import { anthropic, withTimeout, extractJSON, LLM_TIMEOUT_MS } from './claude';
import { logAgent } from './agents/base';
import { detectEmotionalState, extractEmotionalCues } from './emotional';
import { detectUserStyle } from './user-style';
import type {
  ChatMessage,
  ClassificationResult,
  ClassificationDomain,
  ProfessionalExtraction,
  LifeExtraction,
  CrossDomainItem,
  EmotionalState,
  UserStyle,
  EnhancedClassificationResult,
} from '@/types';

// Haiku-specific timeout (faster model)
const CLASSIFIER_TIMEOUT_MS = 15000;

const CLASSIFIER_SYSTEM_PROMPT = `你是一个信息分类器。分析用户消息，将信息分类为 professional（职业相关）或 life（生活相关）领域，并提取结构化数据。

## 分类规则

**Professional（职业相关）**:
- 工作经验、公司、职位
- 专业技能、技术能力
- 职业目标、事业发展
- 能提供的专业资源（如技术指导、行业人脉）
- 职业社交目的

**Life（生活相关）**:
- 兴趣爱好、业余活动
- 价值观、人生理念
- 个人关系目标（交友、约会）
- 生活方式偏好
- 个人成长目标（非职业）

**Mixed**:
- 消息同时包含职业和生活信息
- 例如："我是产品经理，平时喜欢打网球"

**Ambiguous**:
- 无法明确分类
- 信息不足以判断
- 置信度低于 0.6

## 跨领域处理

某些信息可能同时属于两个领域：
- "编程" - 可能是技能也是爱好
- "创业" - 可能是职业目标也是人生追求
- 这类信息记录在 cross_domain 数组中

## 输出格式

必须输出有效的 JSON：
{
  "domain": "professional" | "life" | "mixed" | "ambiguous",
  "confidence": 0.0-1.0,
  "professional": {
    "work_experience": [{"company": "公司名", "title": "职位", "start_date": "YYYY-MM", "end_date": null, "description": "描述", "is_current": true}],
    "skills": ["技能1", "技能2"],
    "can_offer": ["能提供的资源"],
    "looking_for": ["职业上寻找的"],
    "current_goals": ["职业目标"],
    "headline": "职业标题"
  },
  "life": {
    "interests": ["兴趣爱好"],
    "values": ["价值观"],
    "looking_for": ["生活上寻找的，如朋友、伴侣"],
    "current_goals": ["个人成长目标"],
    "dating_context": {"relationship_status": "", "looking_for_type": "", "preferences": []},
    "friendship_context": {"social_style": "", "activity_preferences": []}
  },
  "cross_domain": [
    {"item": "编程", "primary_domain": "professional", "secondary_domain": "life", "reason": "既是工作技能也是个人爱好"}
  ]
}

注意：
- 只包含从消息中明确提取的信息
- 未提及的字段设为空数组或 null
- work_experience 中 start_date 格式为 YYYY-MM，end_date 为 null 表示当前工作
- confidence 反映你对分类的确定程度`;

/**
 * Classify a user message using Haiku
 * Enhanced with emotional state and user style analysis
 */
export async function classifyMessage(
  message: string,
  conversationContext?: ChatMessage[]
): Promise<EnhancedClassificationResult> {
  const startTime = Date.now();
  logAgent('classifier', 'info', 'classify_start', {
    messageLength: message.length,
    hasContext: Boolean(conversationContext?.length),
  });

  // Run emotional state detection in parallel with LLM classification
  const emotionalState = detectEmotionalState(message);
  const emotionalCues = extractEmotionalCues(message);

  // Detect user style if we have conversation context
  let userStyle: UserStyle | undefined;
  if (conversationContext && conversationContext.length > 0) {
    userStyle = detectUserStyle([...conversationContext, { role: 'user', content: message }]);
  }

  try {
    // Build context from recent conversation
    let contextSummary = '';
    if (conversationContext && conversationContext.length > 0) {
      // Take last 3 exchanges for context
      const recentMessages = conversationContext.slice(-6);
      contextSummary = recentMessages
        .map(m => `${m.role === 'user' ? '用户' : 'AI'}: ${m.content.slice(0, 200)}`)
        .join('\n');
    }

    const userContent = `${contextSummary ? `[对话背景]\n${contextSummary}\n\n` : ''}[当前消息]\n<user_input>${message}</user_input>

分析上述消息，提取并分类信息。只输出 JSON。`;

    const response = await withTimeout(
      anthropic.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 1024,
        system: CLASSIFIER_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userContent }],
      }),
      CLASSIFIER_TIMEOUT_MS,
      'classify_message'
    );

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from classifier');
    }

    const parsed = extractJSON(content.text) as Partial<ClassificationResult>;
    const result = normalizeClassificationResult(parsed);

    // Enhance with emotional state and user style
    const enhancedResult: EnhancedClassificationResult = {
      ...result,
      emotional_state: emotionalState,
      emotional_cues: emotionalCues,
      user_style: userStyle,
    };

    const latencyMs = Date.now() - startTime;
    logAgent('classifier', 'info', 'classify_success', {
      latencyMs,
      domain: enhancedResult.domain,
      confidence: enhancedResult.confidence,
      emotionalState: enhancedResult.emotional_state,
      emotionalCues: enhancedResult.emotional_cues,
      professionalFields: Object.keys(enhancedResult.professional).filter(
        k => {
          const val = enhancedResult.professional[k as keyof ProfessionalExtraction];
          return val && (Array.isArray(val) ? val.length > 0 : true);
        }
      ),
      lifeFields: Object.keys(enhancedResult.life).filter(
        k => {
          const val = enhancedResult.life[k as keyof LifeExtraction];
          return val && (Array.isArray(val) ? val.length > 0 : true);
        }
      ),
      crossDomainCount: enhancedResult.cross_domain.length,
    });

    return enhancedResult;
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : String(err);
    logAgent('classifier', 'error', 'classify_error', {
      latencyMs,
      error: errorMessage,
    });

    // Return empty classification on error, but preserve emotional analysis
    return {
      domain: 'ambiguous',
      confidence: 0,
      professional: {},
      life: {},
      cross_domain: [],
      emotional_state: emotionalState,
      emotional_cues: emotionalCues,
      user_style: userStyle,
    };
  }
}

/**
 * Normalize and validate classification result
 */
function normalizeClassificationResult(
  parsed: Partial<ClassificationResult>
): ClassificationResult {
  // Validate domain
  const validDomains: ClassificationDomain[] = ['professional', 'life', 'mixed', 'ambiguous'];
  const domain = validDomains.includes(parsed.domain as ClassificationDomain)
    ? (parsed.domain as ClassificationDomain)
    : 'ambiguous';

  // Validate confidence
  const confidence = typeof parsed.confidence === 'number'
    ? Math.max(0, Math.min(1, parsed.confidence))
    : 0.5;

  // Normalize professional extraction
  const professional: ProfessionalExtraction = {
    work_experience: normalizeWorkExperience(parsed.professional?.work_experience),
    skills: normalizeStringArray(parsed.professional?.skills),
    can_offer: normalizeStringArray(parsed.professional?.can_offer),
    looking_for: normalizeStringArray(parsed.professional?.looking_for),
    current_goals: normalizeStringArray(parsed.professional?.current_goals),
    headline: typeof parsed.professional?.headline === 'string'
      ? parsed.professional.headline
      : undefined,
  };

  // Normalize life extraction
  const life: LifeExtraction = {
    interests: normalizeStringArray(parsed.life?.interests),
    values: normalizeStringArray(parsed.life?.values),
    looking_for: normalizeStringArray(parsed.life?.looking_for),
    current_goals: normalizeStringArray(parsed.life?.current_goals),
    dating_context: parsed.life?.dating_context,
    friendship_context: parsed.life?.friendship_context,
  };

  // Normalize cross-domain items
  const cross_domain: CrossDomainItem[] = Array.isArray(parsed.cross_domain)
    ? parsed.cross_domain.filter(
        (item): item is CrossDomainItem =>
          typeof item === 'object' &&
          item !== null &&
          typeof item.item === 'string' &&
          ['professional', 'life'].includes(item.primary_domain) &&
          ['professional', 'life'].includes(item.secondary_domain)
      )
    : [];

  return {
    domain,
    confidence,
    professional,
    life,
    cross_domain,
  };
}

function normalizeStringArray(arr: unknown): string[] {
  if (!Array.isArray(arr)) return [];
  return arr.filter((item): item is string => typeof item === 'string' && item.trim() !== '');
}

function normalizeWorkExperience(arr: unknown): Array<{
  company: string;
  title: string;
  start_date: string;
  end_date: string | null;
  description: string | null;
  is_current: boolean;
}> {
  if (!Array.isArray(arr)) return [];
  return arr.filter(
    (item): item is {
      company: string;
      title: string;
      start_date: string;
      end_date: string | null;
      description: string | null;
      is_current: boolean;
    } =>
      typeof item === 'object' &&
      item !== null &&
      typeof item.company === 'string' &&
      typeof item.title === 'string'
  ).map(item => ({
    company: item.company,
    title: item.title,
    start_date: item.start_date || new Date().toISOString().slice(0, 7),
    end_date: item.end_date || null,
    description: item.description || null,
    is_current: Boolean(item.is_current),
  }));
}

export { CLASSIFIER_TIMEOUT_MS };
