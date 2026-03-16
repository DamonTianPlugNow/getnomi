'use client';

import { useMemo } from 'react';
import type { ConversationPhase, OnboardingProfileData } from '@/types';

// ============================================
// Types
// ============================================

export interface Suggestion {
  id: string;
  label: string;
  value: string;
  category?: 'topic' | 'action' | 'emotion';
}

interface DynamicSuggestionsProps {
  phase: ConversationPhase;
  profileData: Partial<OnboardingProfileData>;
  lastAssistantMessage?: string;
  onSelect: (suggestion: Suggestion) => void;
  className?: string;
  maxSuggestions?: number;
}

// ============================================
// Suggestion Configurations
// ============================================

const PHASE_SUGGESTIONS: Record<ConversationPhase, Suggestion[]> = {
  greeting: [
    { id: 'intro-work', label: '聊聊工作', value: '我来介绍一下我的工作吧', category: 'topic' },
    { id: 'intro-self', label: '自我介绍', value: '让我先介绍一下自己', category: 'topic' },
    { id: 'intro-interest', label: '分享兴趣', value: '我想先聊聊我的兴趣爱好', category: 'topic' },
  ],
  exploration: [
    { id: 'more-work', label: '工作经历', value: '我可以多说说我的工作经历', category: 'topic' },
    { id: 'more-hobby', label: '兴趣爱好', value: '聊聊我平时喜欢做什么吧', category: 'topic' },
    { id: 'more-goal', label: '未来目标', value: '说说我的目标和计划', category: 'topic' },
    { id: 'more-social', label: '社交目的', value: '我想认识什么样的人', category: 'topic' },
  ],
  deepening: [
    { id: 'detail', label: '详细说说', value: '让我详细说说这个', category: 'action' },
    { id: 'example', label: '举个例子', value: '我举个具体的例子', category: 'action' },
    { id: 'why', label: '说说原因', value: '说说为什么吧', category: 'action' },
  ],
  wrapping: [
    { id: 'add-more', label: '补充一点', value: '我还想补充一些', category: 'action' },
    { id: 'done', label: '差不多了', value: '我觉得差不多了', category: 'action' },
    { id: 'review', label: '看看档案', value: '可以看看我的档案吗', category: 'action' },
  ],
};

// Suggestions when conversation seems stalled
const STALLED_SUGGESTIONS: Suggestion[] = [
  { id: 'change-topic', label: '换个话题', value: '我们换个话题聊聊吧', category: 'action' },
  { id: 'skip', label: '跳过这个', value: '这个我不太想聊，换一个吧', category: 'action' },
  { id: 'help', label: '不知道说什么', value: '我不太确定该说什么', category: 'emotion' },
];

// Suggestions based on missing profile fields
const FIELD_SUGGESTIONS: Record<string, Suggestion> = {
  work_experience: {
    id: 'field-work',
    label: '工作经历',
    value: '我来说说我的工作经历',
    category: 'topic',
  },
  skills: {
    id: 'field-skills',
    label: '技能特长',
    value: '聊聊我擅长什么吧',
    category: 'topic',
  },
  interests: {
    id: 'field-interests',
    label: '兴趣爱好',
    value: '说说我的兴趣爱好',
    category: 'topic',
  },
  values: {
    id: 'field-values',
    label: '价值观',
    value: '聊聊我看重什么',
    category: 'topic',
  },
  looking_for: {
    id: 'field-looking',
    label: '想认识的人',
    value: '说说我想认识什么样的人',
    category: 'topic',
  },
  current_goals: {
    id: 'field-goals',
    label: '目标计划',
    value: '聊聊我的目标和计划',
    category: 'topic',
  },
};

// ============================================
// Helper Functions
// ============================================

/**
 * Get missing profile fields
 */
function getMissingFields(profileData: Partial<OnboardingProfileData>): string[] {
  const requiredFields = [
    'work_experience',
    'skills',
    'interests',
    'values',
    'looking_for',
    'current_goals',
  ];

  return requiredFields.filter((field) => {
    const value = profileData[field as keyof OnboardingProfileData];
    if (value === undefined || value === null) return true;
    if (Array.isArray(value) && value.length === 0) return true;
    return false;
  });
}

/**
 * Detect if conversation might be stalled
 */
function isConversationStalled(lastMessage?: string): boolean {
  if (!lastMessage) return false;

  const stalledIndicators = [
    '还有什么',
    '其他的',
    '别的',
    '想聊什么',
    '继续',
    '接着',
  ];

  return stalledIndicators.some((indicator) =>
    lastMessage.includes(indicator)
  );
}

// ============================================
// Main Component
// ============================================

/**
 * DynamicSuggestions - Context-aware suggestion buttons
 *
 * Features:
 * - Phase-aware suggestions
 * - Missing field detection
 * - Stalled conversation detection
 * - Smooth animations
 */
export function DynamicSuggestions({
  phase,
  profileData,
  lastAssistantMessage,
  onSelect,
  className = '',
  maxSuggestions = 4,
}: DynamicSuggestionsProps) {
  const suggestions = useMemo(() => {
    const result: Suggestion[] = [];

    // Check if conversation is stalled
    if (isConversationStalled(lastAssistantMessage)) {
      result.push(...STALLED_SUGGESTIONS.slice(0, 2));
    }

    // Add phase-specific suggestions
    const phaseSuggestions = PHASE_SUGGESTIONS[phase] || [];
    result.push(...phaseSuggestions);

    // Add suggestions for missing fields (in exploration phase)
    if (phase === 'exploration') {
      const missingFields = getMissingFields(profileData);
      for (const field of missingFields.slice(0, 2)) {
        const suggestion = FIELD_SUGGESTIONS[field];
        if (suggestion && !result.some((s) => s.id === suggestion.id)) {
          result.push(suggestion);
        }
      }
    }

    // Deduplicate and limit
    const seen = new Set<string>();
    return result
      .filter((s) => {
        if (seen.has(s.id)) return false;
        seen.add(s.id);
        return true;
      })
      .slice(0, maxSuggestions);
  }, [phase, profileData, lastAssistantMessage, maxSuggestions]);

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {suggestions.map((suggestion, index) => (
        <button
          key={suggestion.id}
          onClick={() => onSelect(suggestion)}
          className={`
            px-3 py-1.5 text-sm rounded-full
            border border-[#e3e2de] bg-white
            text-[#37352f]/80 hover:text-[#37352f]
            hover:border-[#0077cc] hover:bg-[#0077cc]/5
            transition-all duration-200
            animate-fadeIn
          `}
          style={{
            animationDelay: `${index * 50}ms`,
          }}
        >
          {suggestion.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Progress feedback component with warm messaging
 */
interface ProgressFeedbackProps {
  profileData: Partial<OnboardingProfileData>;
  messageCount: number;
  className?: string;
}

export function ProgressFeedback({
  profileData,
  messageCount,
  className = '',
}: ProgressFeedbackProps) {
  const feedback = useMemo(() => {
    const filledFields = Object.entries(profileData).filter(([, v]) => {
      if (v === undefined || v === null) return false;
      if (Array.isArray(v)) return v.length > 0;
      return true;
    }).length;

    // Time-based feedback
    if (messageCount <= 2) {
      return '刚开始认识你...';
    }

    // Progress-based feedback
    if (filledFields < 3) {
      return '正在了解你的基本情况';
    }

    if (filledFields < 5) {
      return '对你有了初步了解';
    }

    if (filledFields < 7) {
      return '越来越了解你了';
    }

    if (filledFields < 9) {
      return '快要完成了';
    }

    return '已经很了解你了！';
  }, [profileData, messageCount]);

  const progress = useMemo(() => {
    const totalFields = 11; // Total profile fields
    const filledFields = Object.entries(profileData).filter(([, v]) => {
      if (v === undefined || v === null) return false;
      if (Array.isArray(v)) return v.length > 0;
      return true;
    }).length;

    return Math.min(Math.round((filledFields / totalFields) * 100), 100);
  }, [profileData]);

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-[#37352f]/60">{feedback}</span>
        <span className="text-[#37352f]/40">{progress}%</span>
      </div>
      <div className="w-full bg-[#e3e2de] rounded-full h-1.5 overflow-hidden">
        <div
          className="bg-gradient-to-r from-[#0077cc] to-[#0f7b6c] h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

export default DynamicSuggestions;
