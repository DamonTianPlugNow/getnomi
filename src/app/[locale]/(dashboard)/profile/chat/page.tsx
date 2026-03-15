'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { ChatMessage, OnboardingProfileData } from '@/types';

const STORAGE_KEY = 'nomi_profile_chat_state';

interface StoredState {
  messages: ChatMessage[];
  profileData: Partial<OnboardingProfileData>;
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

export default function ProfileChatPage() {
  const router = useRouter();
  const t = useTranslations('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [profileData, setProfileData] = useState<Partial<OnboardingProfileData>>({});
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('memory_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!profile) {
        router.push('/onboarding');
        return;
      }

      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const state: StoredState = JSON.parse(saved);
          setMessages(state.messages);
          setProfileData({ ...profile, ...state.profileData });
          setInitialized(true);
          return;
        } catch {
          localStorage.removeItem(STORAGE_KEY);
        }
      }

      setProfileData(profile);
      setMessages([{
        role: 'assistant',
        content: `${t('welcomeBack')}\n\n${t('updateIntro')}`,
      }]);
      setInitialized(true);
    };

    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    if (initialized && messages.length > 0) {
      const state: StoredState = { messages, profileData };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [messages, profileData, initialized]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: content.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setIsTyping(true);
    setError(null);

    try {
      const response = await fetch('/api/chat/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          profileData,
          isUpdate: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();

      setIsTyping(false);
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);

      if (data.extracted) {
        setProfileData(prev => ({ ...prev, ...data.extracted }));
      }

      if (data.isComplete) {
        const saveResponse = await fetch('/api/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...profileData, ...data.extracted }),
        });

        if (saveResponse.ok) {
          localStorage.removeItem(STORAGE_KEY);
          setTimeout(() => router.push('/profile'), 1500);
        }
      }
    } catch (err) {
      setIsTyping(false);
      setError(t('error'));
      console.error('Chat error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [messages, profileData, isLoading, router, t]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleFinish = async () => {
    try {
      await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData),
      });
      localStorage.removeItem(STORAGE_KEY);
      router.push('/profile');
    } catch {
      setError(t('saveError'));
    }
  };

  if (!initialized) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#0077cc] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-[#37352f] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-[#e3e2de]">
        <div className="max-w-3xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/profile" className="p-2 hover:bg-[#f7f6f3] rounded-md transition-colors">
              <svg className="w-5 h-5 text-[#37352f]/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="font-semibold text-[#37352f]">Update Profile</h1>
              <p className="text-sm text-[#37352f]/50">Chat with Nomi to make changes</p>
            </div>
          </div>
          <button
            onClick={handleFinish}
            className="px-4 py-2 text-sm font-medium text-[#37352f]/60 hover:text-[#37352f] hover:bg-[#f7f6f3] rounded-md transition-colors"
          >
            Done
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8">
          {error && (
            <div className="mb-4 p-3 bg-[#eb5757]/10 border border-[#eb5757]/20 rounded-lg text-[#eb5757] text-sm">
              {error}
            </div>
          )}

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
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                        strong: ({ children }) => <strong className={message.role === 'user' ? 'text-white font-semibold' : 'text-[#37352f] font-semibold'}>{children}</strong>,
                        ul: ({ children }) => <ul className="list-disc list-inside mb-2">{children}</ul>,
                        li: ({ children }) => <li className="mb-1">{children}</li>,
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}
            {isTyping && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Input */}
      <div className="sticky bottom-0 bg-white border-t border-[#e3e2de]">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex gap-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('placeholder')}
              rows={1}
              className="flex-1 px-4 py-3 border border-[#e3e2de] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0077cc]/20 focus:border-[#0077cc] resize-none text-[#37352f] placeholder:text-[#37352f]/40"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="px-6 py-3 bg-[#0077cc] hover:bg-[#0066b3] disabled:bg-[#e3e2de] disabled:text-[#37352f]/40 text-white font-medium rounded-lg transition-colors"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                t('send')
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
