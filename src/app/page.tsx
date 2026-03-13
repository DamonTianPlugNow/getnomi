import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect('/dashboard');
  }

  return (
    <main className="min-h-screen bg-[#2b2b2b] text-[#f7f7f7] relative overflow-hidden">
      {/* Subtle gradient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-[#ff6250]/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-[#ff6250]/3 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <header className="relative z-10">
        <div className="max-w-[77.5em] mx-auto px-8 py-6 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-full bg-[#ff6250] flex items-center justify-center shadow-[0_4px_12px_rgba(255,98,80,0.3)] group-hover:shadow-[0_6px_20px_rgba(255,98,80,0.4)] transition-shadow duration-500">
              <span className="text-white font-bold text-lg">N</span>
            </div>
            <span className="text-xl font-semibold text-[#f7f7f7] tracking-tight">
              Nomi
            </span>
          </Link>

          <nav className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-5 py-2.5 text-sm font-medium text-[#f7f7f7]/70 hover:text-[#f7f7f7] transition-colors duration-300"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="px-6 py-2.5 bg-[#ff6250] hover:bg-[#e2412e] text-white text-sm font-semibold rounded-full transition-all duration-500 shadow-[0_4px_12px_rgba(255,98,80,0.3)] hover:shadow-[0_6px_20px_rgba(255,98,80,0.4)]"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 max-w-[77.5em] mx-auto px-8 pt-20 pb-32">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#3b3b3b] rounded-full mb-8">
              <span className="w-2 h-2 bg-[#ff6250] rounded-full animate-pulse" />
              <span className="text-sm font-medium text-[#f7f7f7]/70">AI-powered personal context</span>
            </div>

            <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl text-[#f7f7f7] mb-8 leading-[1.1]">
              Your digital
              <br />
              <span className="text-[#ff6250]">world manual</span>
            </h1>

            <p className="text-lg md:text-xl text-[#f7f7f7]/60 mb-10 leading-relaxed max-w-lg">
              Nomi learns who you are through conversation and creates a portable personal context that works across any AI product.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link
                href="/signup"
                className="group inline-flex items-center gap-3 px-8 py-4 bg-[#ff6250] hover:bg-[#e2412e] text-white font-semibold rounded-full transition-all duration-500 shadow-[0_4px_12px_rgba(255,98,80,0.3)] hover:shadow-[0_8px_30px_rgba(255,98,80,0.4)]"
              >
                Start Your Story
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 px-8 py-4 text-[#f7f7f7]/70 hover:text-[#f7f7f7] font-medium rounded-full border border-[#f7f7f7]/10 hover:border-[#f7f7f7]/20 transition-all duration-300"
              >
                Learn More
              </a>
            </div>
          </div>

          {/* Hero Visual */}
          <div className="relative hidden lg:block">
            <div className="relative w-full aspect-square max-w-[500px] mx-auto">
              {/* Decorative circles */}
              <div className="absolute inset-0 rounded-full border border-[#f7f7f7]/5" />
              <div className="absolute inset-8 rounded-full border border-[#f7f7f7]/5" />
              <div className="absolute inset-16 rounded-full border border-[#ff6250]/10" />

              {/* Center card */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 bg-[#3b3b3b] rounded-2xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#ff6250] to-[#ff8a7a] flex items-center justify-center">
                    <span className="text-white font-bold">Y</span>
                  </div>
                  <div>
                    <p className="font-semibold text-[#f7f7f7]">Your Profile</p>
                    <p className="text-sm text-[#f7f7f7]/50">nomi.md</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-2 bg-[#f7f7f7]/10 rounded-full w-full" />
                  <div className="h-2 bg-[#f7f7f7]/10 rounded-full w-4/5" />
                  <div className="h-2 bg-[#ff6250]/30 rounded-full w-3/5" />
                </div>
              </div>

              {/* Floating badges */}
              <div className="absolute top-12 right-8 px-4 py-2 bg-[#3b3b3b] rounded-full shadow-lg animate-float">
                <span className="text-sm font-medium text-[#ff6250]">✨ AI-powered</span>
              </div>
              <div className="absolute bottom-20 left-4 px-4 py-2 bg-[#3b3b3b] rounded-full shadow-lg animate-float-delayed">
                <span className="text-sm font-medium text-[#f7f7f7]/70">📄 Portable .md</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="relative z-10 py-24 bg-[#232323]">
        <div className="max-w-[77.5em] mx-auto px-8">
          <div className="text-center mb-16">
            <h2 className="font-serif text-4xl md:text-5xl text-[#f7f7f7] mb-4">
              How it works
            </h2>
            <p className="text-lg text-[#f7f7f7]/50 max-w-2xl mx-auto">
              Three simple steps to create your digital identity
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                num: '01',
                title: 'Chat with AI',
                desc: 'Have a natural conversation. Nomi learns about your background, skills, goals, and personality.',
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                ),
              },
              {
                num: '02',
                title: 'Get your .md file',
                desc: 'Export your personal context as a portable Markdown file. Use it anywhere, with any AI.',
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                ),
              },
              {
                num: '03',
                title: 'Connect (optional)',
                desc: 'Enable matching to meet like-minded people who share your goals and values.',
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                ),
              },
            ].map((step) => (
              <div
                key={step.num}
                className="group relative p-8 bg-[#2b2b2b] rounded-2xl border border-[#f7f7f7]/5 hover:border-[#ff6250]/20 transition-all duration-500 hover:shadow-[0_20px_60px_rgba(255,98,80,0.1)]"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-[#3b3b3b] flex items-center justify-center text-[#ff6250] group-hover:bg-[#ff6250] group-hover:text-white transition-all duration-500">
                    {step.icon}
                  </div>
                  <span className="font-serif text-5xl text-[#f7f7f7]/5 group-hover:text-[#ff6250]/10 transition-colors duration-500">
                    {step.num}
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-[#f7f7f7] mb-3">
                  {step.title}
                </h3>
                <p className="text-[#f7f7f7]/50 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 py-24">
        <div className="max-w-[77.5em] mx-auto px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="font-serif text-4xl md:text-5xl text-[#f7f7f7] mb-6">
                Your story,
                <br />
                <span className="text-[#ff6250]">always with you</span>
              </h2>
              <p className="text-lg text-[#f7f7f7]/50 mb-8 leading-relaxed">
                Unlike profiles locked in platforms, your Nomi file is truly yours. Export it, share it, use it with any AI assistant.
              </p>

              <div className="space-y-4">
                {[
                  'Portable across all AI products',
                  'Update anytime through conversation',
                  'Privacy-first: you control your data',
                  'Match with like-minded people',
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#ff6250]/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-[#ff6250]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-[#f7f7f7]/70">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Code preview */}
            <div className="relative">
              <div className="bg-[#1a1a1a] rounded-2xl p-6 font-mono text-sm shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                  <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                  <div className="w-3 h-3 rounded-full bg-[#27ca40]" />
                  <span className="ml-4 text-[#f7f7f7]/30">your-profile.md</span>
                </div>
                <pre className="text-[#f7f7f7]/70 overflow-x-auto">
{`# Sarah Chen

> Product Designer at Figma

## About
- Location: San Francisco
- Goals: Lead design systems

## Skills
\`UI Design\` \`Prototyping\` \`Design Systems\`

## Looking For
- Mentorship opportunities
- Design community connections

---
*Generated by Nomi*`}
                </pre>
              </div>

              {/* Decorative element */}
              <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-[#ff6250]/10 rounded-full blur-[60px]" />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-24">
        <div className="max-w-[77.5em] mx-auto px-8">
          <div className="relative bg-gradient-to-br from-[#3b3b3b] to-[#2b2b2b] rounded-3xl p-12 md:p-16 overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#ff6250]/10 rounded-full blur-[100px]" />

            <div className="relative text-center max-w-2xl mx-auto">
              <h2 className="font-serif text-4xl md:text-5xl text-[#f7f7f7] mb-6">
                Ready to create your digital manual?
              </h2>
              <p className="text-lg text-[#f7f7f7]/50 mb-10">
                Join Nomi and let AI help you tell your story. It only takes a few minutes.
              </p>
              <Link
                href="/signup"
                className="group inline-flex items-center gap-3 px-10 py-5 bg-[#ff6250] hover:bg-[#e2412e] text-white text-lg font-semibold rounded-full transition-all duration-500 shadow-[0_4px_12px_rgba(255,98,80,0.3)] hover:shadow-[0_8px_30px_rgba(255,98,80,0.5)]"
              >
                Get Started Free
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[#f7f7f7]/5">
        <div className="max-w-[77.5em] mx-auto px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#ff6250] flex items-center justify-center">
                <span className="text-white font-bold text-sm">N</span>
              </div>
              <span className="text-[#f7f7f7]/40 text-sm">getnomi.me</span>
            </div>
            <p className="text-[#f7f7f7]/30 text-sm">
              © 2024 Nomi. Your story, always with you.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
