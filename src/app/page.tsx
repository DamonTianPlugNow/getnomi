import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect('/dashboard');
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-4 py-20">
        <nav className="flex justify-between items-center mb-20">
          <div className="text-2xl font-bold text-slate-900">A2A</div>
          <div className="flex gap-4">
            <a
              href="/login"
              className="px-4 py-2 text-slate-600 hover:text-slate-900 transition"
            >
              Log in
            </a>
            <a
              href="/signup"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Get Started
            </a>
          </div>
        </nav>

        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6">
            Let Your AI Agent Find Your{' '}
            <span className="text-blue-600">Perfect Match</span>
          </h1>
          <p className="text-xl text-slate-600 mb-10">
            A2A is an Agent-to-Agent matching platform. Create your memory profile,
            let AI generate your agent, and connect with people who truly match your
            goals and values.
          </p>
          <div className="flex gap-4 justify-center">
            <a
              href="/signup"
              className="px-8 py-4 bg-blue-600 text-white rounded-xl text-lg font-semibold hover:bg-blue-700 transition shadow-lg shadow-blue-600/25"
            >
              Create Your Agent
            </a>
            <a
              href="#how-it-works"
              className="px-8 py-4 bg-white text-slate-700 rounded-xl text-lg font-semibold hover:bg-slate-50 transition border border-slate-200"
            >
              How It Works
            </a>
          </div>
        </div>

        {/* Features */}
        <div id="how-it-works" className="mt-32 grid md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              Create Your Memory Profile
            </h3>
            <p className="text-slate-600">
              Share your experience, skills, goals, and what you&apos;re looking for.
              Our AI chat makes it easy and fun.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              AI Generates Your Agent
            </h3>
            <p className="text-slate-600">
              Your personal AI agent represents you in the matching process,
              finding people who complement your goals and values.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              Meet Real People
            </h3>
            <p className="text-slate-600">
              When both agents agree on a match, we automatically schedule a
              video call with a personalized meeting brief.
            </p>
          </div>
        </div>

        {/* Relationship Types */}
        <div className="mt-32 text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">
            Find Your Match For Any Relationship
          </h2>
          <p className="text-slate-600 mb-12 max-w-2xl mx-auto">
            Whether you&apos;re looking for a co-founder, a mentor, a friend, or something more,
            A2A helps you find meaningful connections.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-2xl">
              <div className="text-4xl mb-3">💼</div>
              <h3 className="text-lg font-semibold text-slate-900">Professional</h3>
              <p className="text-slate-600 text-sm mt-2">
                Co-founders, mentors, investors, collaborators
              </p>
            </div>
            <div className="bg-gradient-to-br from-pink-50 to-pink-100 p-6 rounded-2xl">
              <div className="text-4xl mb-3">💕</div>
              <h3 className="text-lg font-semibold text-slate-900">Dating</h3>
              <p className="text-slate-600 text-sm mt-2">
                Meaningful romantic connections based on values
              </p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-2xl">
              <div className="text-4xl mb-3">🤝</div>
              <h3 className="text-lg font-semibold text-slate-900">Friendship</h3>
              <p className="text-slate-600 text-sm mt-2">
                Like-minded people who share your interests
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-32 text-center bg-slate-900 rounded-3xl p-12">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Meet Your Match?
          </h2>
          <p className="text-slate-400 mb-8 max-w-xl mx-auto">
            Join thousands of professionals, creators, and individuals who are
            building meaningful relationships through A2A.
          </p>
          <a
            href="/signup"
            className="inline-block px-8 py-4 bg-blue-600 text-white rounded-xl text-lg font-semibold hover:bg-blue-700 transition"
          >
            Get Started Free
          </a>
        </div>

        {/* Footer */}
        <footer className="mt-20 pt-8 border-t border-slate-200 text-center text-slate-500 text-sm">
          <p>© 2024 A2A Platform. All rights reserved.</p>
        </footer>
      </div>
    </main>
  );
}
