'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import ReactMarkdown from 'react-markdown';
import type { ChatMessage, OnboardingProfileData } from '@/types';

const STORAGE_KEY = 'nomi_onboarding_state';

const PROFILE_FIELDS = [
  { key: 'display_name', label: 'Name' },
  { key: 'headline', label: 'Role' },
  { key: 'location', label: 'Location' },
  { key: 'work_experience', label: 'Experience' },
  { key: 'skills', label: 'Skills' },
  { key: 'can_offer', label: 'Can offer' },
  { key: 'looking_for', label: 'Looking for' },
  { key: 'current_goals', label: 'Goals' },
  { key: 'interests', label: 'Interests' },
  { key: 'values', label: 'Values' },
  { key: 'intents', label: 'Connection type' },
] as const;

const SUGGESTIONS = [
  "I'm a product designer",
  "Looking for co-founders",
  "I want to make friends",
  "Based in San Francisco",
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
    return `Hey ${userInfo.name}! I'm Nomi, your AI assistant 👋

I see you've signed in. Let's build your personal profile through a quick chat so we can find the right connections for you.

**What do you do, and where are you based?**`;
  }
  return `Hey there! I'm Nomi, your AI assistant 👋

I'll help you create your personal profile through a simple conversation. This will help us find meaningful connections for you.

**Let's start simple — what's your name and what do you do?**`;
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-[#f7f6f3] rounded-xl px-4 py-3">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 bg-[#37352f]/30 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 bg-[#37352f]/30 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 bg-[#37352f]/30 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="w-full bg-[#e3e2de] rounded-full h-1.5">
      <div
        className="bg-[#0077cc] h-1.5 rounded-full transition-all duration-500"
        style={{ width: `${progress}%` }}
      />
    </div>
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const saveState = useCallback((msgs: ChatMessage[], data: Partial<OnboardingProfileData>) => {
    try {
      const state: StoredState = { messages: msgs, profileData: data };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch { /* ignore */ }
  }, []);

  const loadState = useCallback((): StoredState | null => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored) as StoredState;
    } catch { /* ignore */ }
    return null;
  }, []);

  const clearState = useCallback(() => {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    async function initialize() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

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

      const storedState = loadState();
      if (storedState && storedState.messages.length > 0) {
        setMessages(storedState.messages);
        setProfileData(storedState.profileData);
      } else {
        const initialMsg: ChatMessage = { role: 'assistant', content: getInitialMessage(info) };
        setMessages([initialMsg]);
        if (info.name) {
          setProfileData({ display_name: info.name });
        }
      }

      setIsInitialized(true);
    }
    initialize();
  }, [supabase, router, loadState, clearState]);

  const completedFields = PROFILE_FIELDS.filter(({ key }) => {
    const v = profileData[key as keyof OnboardingProfileData];
    return v !== undefined && v !== null && (Array.isArray(v) ? v.length > 0 : true);
  });
  const progress = Math.round((completedFields.length / PROFILE_FIELDS.length) * 100);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, profileData }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      const data = await response.json();
      const assistantMessage: ChatMessage = { role: 'assistant', content: data.reply };
      const updatedMessages = [...newMessages, assistantMessage];
      setMessages(updatedMessages);

      if (data.extracted) {
        const newProfileData = { ...profileData, ...data.extracted };
        setProfileData(newProfileData);
        saveState(updatedMessages, newProfileData);
        if (!showProgress && Object.keys(data.extracted).length > 0) {
          setShowProgress(true);
        }
      }

      if (data.isComplete) {
        await handleCreateProfile({ ...profileData, ...data.extracted });
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages([...newMessages, {
        role: 'assistant',
        content: "Sorry, something went wrong. Please try again.",
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProfile = async (finalData: Partial<OnboardingProfileData>) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...finalData,
          intents: finalData.intents || ['professional'],
        }),
      });

      if (!response.ok) throw new Error('Failed to create profile');

      clearState();
      router.push('/dashboard');
    } catch (error) {
      console.error('Profile creation error:', error);
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: "There was an issue creating your profile. Please try again.",
      }]);
      setIsSubmitting(false);
    }
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#0077cc] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-[#37352f] flex flex-col">
      {/* Header */}
      <header className="border-b border-[#e3e2de]">
        <div className="max-w-3xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-[#37352f] flex items-center justify-center">
              <span className="text-white font-bold text-sm">N</span>
            </div>
            <span className="text-xl font-semibold text-[#37352f]">Nomi</span>
          </Link>

          {showProgress && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-[#37352f]/60">{progress}% complete</span>
              <div className="w-24">
                <ProgressBar progress={progress} />
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <div className="space-y-6">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-[#0077cc] text-white'
                      : 'bg-[#f7f6f3] text-[#37352f]'
                  }`}
                >
                  {message.role === 'assistant' ? (
                    <div className="prose prose-sm max-w-none [&>p]:m-0 [&>p]:leading-relaxed [&>ul]:my-2 [&>ol]:my-2 [&_strong]:font-semibold">
                      <ReactMarkdown>
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm leading-relaxed">{message.content}</p>
                  )}
                </div>
              </div>
            ))}
            {isLoading && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions */}
          {messages.length === 1 && !isLoading && (
            <div className="mt-6 flex flex-wrap gap-2">
              {SUGGESTIONS.map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => setInput(suggestion)}
                  className="px-3 py-1.5 text-sm bg-[#f7f6f3] hover:bg-[#e3e2de] text-[#37352f]/70 rounded-full transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-[#e3e2de] bg-white">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isSubmitting ? "Creating your profile..." : "Type your message..."}
              disabled={isLoading || isSubmitting}
              className="flex-1 px-4 py-3 border border-[#e3e2de] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0077cc]/20 focus:border-[#0077cc] transition-colors text-[#37352f] placeholder:text-[#37352f]/40 disabled:bg-[#f7f6f3]"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading || isSubmitting}
              className="px-6 py-3 bg-[#0077cc] hover:bg-[#0066b3] disabled:bg-[#e3e2de] disabled:text-[#37352f]/40 text-white font-medium rounded-lg transition-colors"
            >
              {isLoading || isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Send'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Progress Sidebar (shown when progress > 0) */}
      {showProgress && (
        <div className="fixed right-6 top-24 w-48 p-4 bg-[#f7f6f3] rounded-xl border border-[#e3e2de] hidden lg:block">
          <p className="text-xs font-semibold text-[#37352f]/50 uppercase tracking-wide mb-3">Profile Progress</p>
          <div className="space-y-2">
            {PROFILE_FIELDS.map(({ key, label }) => {
              const v = profileData[key as keyof OnboardingProfileData];
              const filled = v !== undefined && v !== null && (Array.isArray(v) ? v.length > 0 : true);
              return (
                <div key={key} className="flex items-center gap-2 text-sm">
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center ${filled ? 'bg-[#0f7b6c]' : 'bg-[#e3e2de]'}`}>
                    {filled && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>
                  <span className={filled ? 'text-[#37352f]' : 'text-[#37352f]/40'}>{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
