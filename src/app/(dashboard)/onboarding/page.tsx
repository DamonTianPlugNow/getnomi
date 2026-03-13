'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import ReactMarkdown from 'react-markdown';
import type { RelationshipIntent, WorkExperience, ChatMessage, OnboardingProfileData } from '@/types';

// localStorage key for persistence (Issue 1)
const STORAGE_KEY = 'a2a_onboarding_state';

// Profile fields for progress display
const PROFILE_FIELDS = [
  { key: 'display_name', label: '姓名' },
  { key: 'headline', label: '职业' },
  { key: 'location', label: '城市' },
  { key: 'work_experience', label: '工作经历' },
  { key: 'skills', label: '技能' },
  { key: 'can_offer', label: '能提供' },
  { key: 'looking_for', label: '想找' },
  { key: 'current_goals', label: '目标' },
  { key: 'interests', label: '兴趣' },
  { key: 'values', label: '价值观' },
  { key: 'intents', label: '关系类型' },
] as const;

// Suggestion bubbles (Delight #5)
const SUGGESTIONS = [
  '我想找合伙人',
  '我想交朋友',
  '我是做产品的',
  '我在北京',
];

interface UserInfo {
  name?: string;
  avatar_url?: string;
  email?: string;
}

interface StoredState {
  messages: ChatMessage[];
  profileData: Partial<OnboardingProfileData>;
}

function getInitialMessage(userInfo: UserInfo | null): string {
  if (userInfo?.name) {
    return `你好 ${userInfo.name}！我是 Nomi 的 onboarding 助手 👋

我看到你已经通过社交账号登录了，接下来我会通过简单的对话帮你完善个人档案，这样我们就能为你找到最合适的人脉匹配。

先告诉我，**你现在做什么工作？在哪个城市？**`;
  }
  return `你好！我是 Nomi 的 onboarding 助手，很高兴认识你 👋

我会通过简单的对话帮你创建个人档案，这样我们就能为你找到最合适的人脉匹配。

先从简单的开始吧——**你叫什么名字？做什么工作的？**`;
}

// Typing indicator component (Issue 3)
function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-white text-gray-800 rounded-2xl px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

// Progress ring component (Issue 4)
function ProgressRing({ progress, size = 60 }: { progress: number; size?: number }) {
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#3b82f6"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-500"
      />
    </svg>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [profileData, setProfileData] = useState<Partial<OnboardingProfileData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sessionId = useRef<string>(Math.random().toString(36).substring(7));

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Save state to localStorage (Issue 1)
  const saveState = useCallback((msgs: ChatMessage[], data: Partial<OnboardingProfileData>) => {
    try {
      const state: StoredState = { messages: msgs, profileData: data };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Load state from localStorage
  const loadState = useCallback((): StoredState | null => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored) as StoredState;
      }
    } catch {
      // Ignore localStorage errors
    }
    return null;
  }, []);

  // Clear stored state
  const clearState = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Fetch user info and check for existing profile (Issue 10)
  useEffect(() => {
    async function initialize() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      // Check if profile already exists (Issue 10)
      const { data: existingProfile } = await supabase
        .from('memory_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (existingProfile) {
        clearState();
        router.push('/dashboard');
        return;
      }

      const info: UserInfo = {
        name: user.user_metadata?.name || user.user_metadata?.full_name,
        avatar_url: user.user_metadata?.picture || user.user_metadata?.avatar_url,
        email: user.email,
      };
      setUserInfo(info);

      // Try to restore state from localStorage
      const storedState = loadState();
      if (storedState && storedState.messages.length > 0) {
        setMessages(storedState.messages);
        setProfileData(storedState.profileData);
      } else {
        // Initialize with welcome message
        const initialMsg: ChatMessage = { role: 'assistant', content: getInitialMessage(info) };
        setMessages([initialMsg]);

        // Pre-fill profile data if we have user info
        if (info.name) {
          setProfileData({ display_name: info.name });
        }
      }

      setIsInitialized(true);
      // Trigger fade-in animation (Delight #4)
      setTimeout(() => setFadeIn(true), 50);
    }
    initialize();
  }, [supabase, router, loadState, clearState]);

  // Calculate progress
  const completedFields = PROFILE_FIELDS.filter(({ key }) => {
    const v = profileData[key as keyof OnboardingProfileData];
    return v !== undefined && v !== null && (Array.isArray(v) ? v.length > 0 : true);
  });
  const progress = Math.round((completedFields.length / PROFILE_FIELDS.length) * 100);

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || isSubmitting) return;

    const userMessage = input.trim();
    setInput('');

    // Add user message
    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      // Call AI onboarding API
      const response = await fetch('/api/chat/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          profileData,
          sessionId: sessionId.current,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to get response');
      }

      const data = await response.json();
      const { reply, extracted, isComplete } = data;

      // Update profile data with extracted info
      const updatedProfileData = { ...profileData };
      if (extracted) {
        Object.entries(extracted).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            const existingValue = updatedProfileData[key as keyof OnboardingProfileData];
            if (Array.isArray(value) && Array.isArray(existingValue)) {
              // Merge arrays, avoiding duplicates
              const merged = [...existingValue];
              for (const item of value) {
                if (!merged.some(e => JSON.stringify(e) === JSON.stringify(item))) {
                  merged.push(item);
                }
              }
              (updatedProfileData as Record<string, unknown>)[key] = merged;
            } else {
              (updatedProfileData as Record<string, unknown>)[key] = value;
            }
          }
        });
      }
      setProfileData(updatedProfileData);

      // Add assistant reply
      const updatedMessages: ChatMessage[] = [...newMessages, { role: 'assistant', content: reply }];
      setMessages(updatedMessages);

      // Save state to localStorage
      saveState(updatedMessages, updatedProfileData);

      // If complete, submit profile
      if (isComplete) {
        await submitProfile(updatedProfileData);
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = error instanceof Error ? error.message : '出了点问题';
      setMessages([
        ...newMessages,
        { role: 'assistant', content: `抱歉，${errorMessage}。请再试一次。` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const submitProfile = async (data: Partial<OnboardingProfileData>) => {
    setIsSubmitting(true);

    try {
      // Normalize work_experience to ensure required fields
      const normalizedWorkExperience = (data.work_experience || []).map((exp: Partial<WorkExperience>) => ({
        company: exp.company || '',
        title: exp.title || '',
        start_date: exp.start_date || new Date().toISOString().split('T')[0],
        end_date: exp.end_date || null,
        description: exp.description || null,
        is_current: exp.is_current ?? true,
      }));

      // Ensure required fields have defaults
      const profilePayload = {
        display_name: data.display_name || 'User',
        headline: data.headline || '',
        location: data.location || '',
        work_experience: normalizedWorkExperience,
        skills: data.skills || [],
        can_offer: data.can_offer || [],
        looking_for: data.looking_for || [],
        current_goals: data.current_goals || [],
        interests: data.interests || [],
        values: data.values || [],
        intents: data.intents?.length ? data.intents : ['professional' as RelationshipIntent],
      };

      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profilePayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create profile');
      }

      // Clear stored state on success
      clearState();

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      console.error('Profile submission error:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '创建档案时出了点问题，请稍后再试。',
        },
      ]);
      setIsSubmitting(false);
    }
  };

  // Show loading while initializing
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col transition-opacity duration-500 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}>
      {/* Header */}
      <header className="p-4 border-b bg-white/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-800">创建你的档案</h1>
          <button
            onClick={() => setShowProgress(!showProgress)}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 transition"
          >
            <div className="relative">
              <ProgressRing progress={progress} size={36} />
              <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                {completedFields.length}
              </span>
            </div>
            <span className="hidden sm:inline">/ {PROFILE_FIELDS.length}</span>
          </button>
        </div>

        {/* Progress detail panel (Issue 4) */}
        {showProgress && (
          <div className="max-w-2xl mx-auto mt-3 p-3 bg-gray-50 rounded-lg">
            <div className="flex flex-wrap gap-2">
              {PROFILE_FIELDS.map(({ key, label }) => {
                const v = profileData[key as keyof OnboardingProfileData];
                const filled = v !== undefined && v !== null && (Array.isArray(v) ? v.length > 0 : true);
                return (
                  <span
                    key={key}
                    className={`px-2 py-1 text-xs rounded-full ${
                      filled ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {filled ? '✓' : '○'} {label}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-800 shadow-sm'
                }`}
              >
                {message.role === 'assistant' ? (
                  <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0">
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p className="my-1">{children}</p>,
                        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{message.content}</p>
                )}
              </div>
            </div>
          ))}

          {/* Typing indicator (Issue 3) */}
          {isLoading && <TypingIndicator />}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Suggestion bubbles (Delight #5) */}
      {messages.length <= 2 && !isLoading && (
        <div className="px-4 pb-2">
          <div className="max-w-2xl mx-auto flex flex-wrap gap-2">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => handleSuggestionClick(suggestion)}
                className="px-3 py-1.5 text-sm bg-white text-gray-600 rounded-full border border-gray-200 hover:border-blue-300 hover:text-blue-600 transition"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t bg-white/80 backdrop-blur">
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isSubmitting ? '正在创建档案...' : '输入你的回答...'}
              disabled={isLoading || isSubmitting}
              maxLength={2000}
              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading || isSubmitting}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading || isSubmitting ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                </span>
              ) : (
                '发送'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* CSS for animations */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
