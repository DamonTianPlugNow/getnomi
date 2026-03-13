'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { RelationshipIntent, WorkExperience } from '@/types';

interface Message {
  role: 'assistant' | 'user';
  content: string;
}

interface ProfileData {
  display_name: string;
  headline: string;
  location: string;
  work_experience: WorkExperience[];
  skills: string[];
  can_offer: string[];
  looking_for: string[];
  current_goals: string[];
  interests: string[];
  values: string[];
  intents: RelationshipIntent[];
}

const INITIAL_MESSAGE = `Hi! I'm here to help you create your A2A profile. This will help me understand who you are and find the best matches for you.

Let's start with the basics. **What's your name?**`;

const QUESTIONS = [
  { key: 'display_name', question: "Great to meet you, {name}! What's your current role or headline? (e.g., 'AI Engineer at Startup X' or 'Founder building the future of education')" },
  { key: 'location', question: "Where are you based? (City, Country)" },
  { key: 'work_experience', question: "Tell me about your work experience. What are 1-2 key roles you've had? (You can describe them briefly)" },
  { key: 'skills', question: "What are your top skills? List 3-5 things you're really good at." },
  { key: 'can_offer', question: "What can you offer to others? (e.g., technical advice, introductions, mentorship, design feedback)" },
  { key: 'looking_for', question: "What are you looking for from connections? (e.g., co-founder, investors, technical talent, friends with similar interests)" },
  { key: 'current_goals', question: "What are your current goals? What are you working towards right now?" },
  { key: 'interests', question: "What are your interests outside of work? Hobbies, passions, things you love talking about?" },
  { key: 'values', question: "What values are important to you? (e.g., authenticity, growth mindset, work-life balance, impact)" },
  { key: 'intents', question: "Last question! What type of relationships are you looking for? You can choose multiple:\n\n💼 **Professional** - Co-founders, mentors, collaborators\n💕 **Dating** - Romantic connections\n🤝 **Friendship** - Like-minded friends\n\nJust type the ones you want (e.g., 'Professional and Friendship')" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: INITIAL_MESSAGE },
  ]);
  const [input, setInput] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const [profileData, setProfileData] = useState<Partial<ProfileData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const parseIntents = (text: string): RelationshipIntent[] => {
    const intents: RelationshipIntent[] = [];
    const lower = text.toLowerCase();
    if (lower.includes('professional') || lower.includes('work') || lower.includes('career') || lower.includes('business')) {
      intents.push('professional');
    }
    if (lower.includes('dating') || lower.includes('romantic') || lower.includes('relationship') || lower.includes('love')) {
      intents.push('dating');
    }
    if (lower.includes('friend') || lower.includes('social')) {
      intents.push('friendship');
    }
    return intents.length > 0 ? intents : ['professional']; // Default to professional
  };

  const parseWorkExperience = (text: string): WorkExperience[] => {
    // Simple parsing - split by common separators
    const experiences: WorkExperience[] = [];
    const parts = text.split(/[,;]|\band\b/i).filter(Boolean);

    for (const part of parts.slice(0, 3)) {
      const trimmed = part.trim();
      if (trimmed.length > 0) {
        // Try to extract company and title
        const atMatch = trimmed.match(/(.+?)\s+at\s+(.+)/i);
        if (atMatch) {
          experiences.push({
            title: atMatch[1].trim(),
            company: atMatch[2].trim(),
            start_date: new Date().toISOString(),
            end_date: null,
            description: null,
            is_current: true,
          });
        } else {
          experiences.push({
            title: trimmed,
            company: '',
            start_date: new Date().toISOString(),
            end_date: null,
            description: null,
            is_current: true,
          });
        }
      }
    }

    return experiences;
  };

  const parseList = (text: string): string[] => {
    return text
      .split(/[,;]|\band\b/i)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && s.length < 100)
      .slice(0, 10);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSubmitting) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);

    // Process the answer based on current step
    const questionKey = currentStep === 0 ? 'display_name' : QUESTIONS[currentStep - 1]?.key;

    let updatedData = { ...profileData };

    switch (questionKey) {
      case 'display_name':
        updatedData.display_name = userMessage;
        break;
      case 'headline':
        updatedData.headline = userMessage;
        break;
      case 'location':
        updatedData.location = userMessage;
        break;
      case 'work_experience':
        updatedData.work_experience = parseWorkExperience(userMessage);
        break;
      case 'skills':
        updatedData.skills = parseList(userMessage);
        break;
      case 'can_offer':
        updatedData.can_offer = parseList(userMessage);
        break;
      case 'looking_for':
        updatedData.looking_for = parseList(userMessage);
        break;
      case 'current_goals':
        updatedData.current_goals = parseList(userMessage);
        break;
      case 'interests':
        updatedData.interests = parseList(userMessage);
        break;
      case 'values':
        updatedData.values = parseList(userMessage);
        break;
      case 'intents':
        updatedData.intents = parseIntents(userMessage);
        break;
    }

    setProfileData(updatedData);

    // Check if we're done
    if (currentStep >= QUESTIONS.length) {
      // Submit the profile
      setIsSubmitting(true);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: "Perfect! I'm creating your profile and generating your AI agent. This will take just a moment...",
        },
      ]);

      try {
        const response = await fetch('/api/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedData),
        });

        if (!response.ok) {
          throw new Error('Failed to create profile');
        }

        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: "Your profile has been created and your AI agent is being generated! Redirecting you to the dashboard...",
          },
        ]);

        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      } catch (error) {
        console.error('Error creating profile:', error);
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: "Sorry, there was an error creating your profile. Please try again or contact support.",
          },
        ]);
        setIsSubmitting(false);
      }
      return;
    }

    // Ask next question
    const nextQuestion = QUESTIONS[currentStep];
    let questionText = nextQuestion.question;

    // Replace placeholders
    if (questionText.includes('{name}')) {
      questionText = questionText.replace('{name}', updatedData.display_name || 'there');
    }

    setTimeout(() => {
      setMessages((prev) => [...prev, { role: 'assistant', content: questionText }]);
      setCurrentStep((prev) => prev + 1);
    }, 500);
  };

  const progress = Math.round((currentStep / (QUESTIONS.length + 1)) * 100);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <a href="/" className="text-xl font-bold text-slate-900">A2A</a>
          <div className="flex items-center gap-4">
            <div className="text-sm text-slate-500">
              Step {Math.min(currentStep + 1, QUESTIONS.length + 1)} of {QUESTIONS.length + 1}
            </div>
            <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-slate-200 text-slate-900'
                }`}
              >
                <div
                  className="whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{
                    __html: message.content
                      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                      .replace(/\n/g, '<br />')
                  }}
                />
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-slate-200 px-4 py-4">
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isSubmitting ? 'Creating your profile...' : 'Type your answer...'}
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100"
              autoFocus
            />
            <button
              type="submit"
              disabled={!input.trim() || isSubmitting}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
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
                'Send'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
