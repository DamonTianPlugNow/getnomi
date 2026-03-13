'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';
import type { ChatMessage, OnboardingProfileData } from '@/types';

const STORAGE_KEY = 'nomi_profile_chat_state';

interface StoredState {
  messages: ChatMessage[];
  profileData: Partial<OnboardingProfileData>;
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-white/[0.05] rounded-2xl px-4 py-3">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

export default function ProfileChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [profileData, setProfileData] = useState<Partial<OnboardingProfileData>>({});
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load existing profile data
  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      // Fetch current profile
      const { data: profile } = await supabase
        .from('memory_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!profile) {
        router.push('/onboarding');
        return;
      }

      // Check for saved chat state
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

      // Start fresh conversation
      setProfileData(profile);
      setMessages([{
        role: 'assistant',
        content: `欢迎回来！我是 Nomi，你的 AI 助手 👋

我可以帮你更新个人档案。你想更新什么信息？比如：
- 工作变动
- 新的技能或兴趣
- 目标调整
- 或者随便聊聊你最近的变化

**有什么新鲜事想告诉我吗？**`,
      }]);
      setInitialized(true);
    };

    init();
  }, [router]);

  // Save state to localStorage
  useEffect(() => {
    if (initialized && messages.length > 0) {
      const state: StoredState = { messages, profileData };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [messages, profileData, initialized]);

  // Scroll to bottom
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
        // Save profile and redirect
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
      setError('发送失败，请重试');
      console.error('Chat error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [messages, profileData, isLoading, router]);

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
    // Save current profile data and go back
    try {
      await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData),
      });
      localStorage.removeItem(STORAGE_KEY);
      router.push('/profile');
    } catch {
      setError('保存失败');
    }
  };

  if (!initialized) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-white/[0.06] px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/profile" className="text-white/50 hover:text-white transition">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">N</span>
            </div>
            <span className="font-medium">Update Your Profile</span>
          </div>
          <button
            onClick={handleFinish}
            className="px-4 py-2 text-sm text-white/60 hover:text-white hover:bg-white/[0.05] rounded-lg transition"
          >
            Done
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white'
                  : 'bg-white/[0.05] text-white/90'
              }`}>
                {msg.role === 'assistant' ? (
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                      strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                      ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                      li: ({ children }) => <li className="text-white/80">{children}</li>,
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
            </div>
          ))}
          {isTyping && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="px-6">
          <div className="max-w-3xl mx-auto">
            <p className="text-red-400 text-sm text-center py-2">{error}</p>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-white/[0.06] px-6 py-4">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tell me what's new..."
              rows={1}
              className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 pr-12 text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50 resize-none"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:from-violet-500 hover:to-fuchsia-500 transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
