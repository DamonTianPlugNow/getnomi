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
    <main className="min-h-screen bg-[#0a0a0f] text-white relative overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-fuchsia-600/10 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-white/[0.02] to-transparent rounded-full" />
      </div>

      {/* Grain Overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Header */}
      <header className="relative z-10 border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-6 py-5 flex justify-between items-center">
          <Link href="/" className="group flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/25">
              <span className="text-white font-bold text-lg">N</span>
            </div>
            <span className="text-xl font-semibold tracking-tight text-white/90 group-hover:text-white transition-colors">
              Nomi
            </span>
          </Link>

          <nav className="flex items-center gap-2">
            <Link
              href="/login"
              className="px-4 py-2 text-sm text-white/50 hover:text-white hover:bg-white/[0.05] rounded-lg transition-all duration-200"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-medium rounded-xl hover:from-violet-500 hover:to-fuchsia-500 transition-all duration-200 shadow-lg shadow-violet-500/25"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pt-24 pb-32">
        <div className="text-center max-w-3xl mx-auto">
          <p className="text-white/40 text-sm font-medium tracking-widest uppercase mb-6">
            Your AI-powered identity
          </p>
          <h1 className="text-5xl md:text-7xl font-serif font-light tracking-tight text-white mb-6 leading-[1.1]">
            Create your digital
            <br />
            <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              world manual
            </span>
          </h1>
          <p className="text-lg md:text-xl text-white/50 mb-12 max-w-2xl mx-auto leading-relaxed">
            Nomi learns who you are through conversation and creates a portable personal context
            that works across any AI product. Your story, always with you.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-[#0a0a0f] rounded-xl font-medium hover:bg-white/90 transition-all duration-200"
            >
              Start Your Story
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center justify-center px-8 py-4 text-white/70 hover:text-white rounded-xl font-medium hover:bg-white/[0.05] transition-all duration-200 border border-white/10"
            >
              How It Works
            </a>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="relative z-10 max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <p className="text-white/40 text-sm font-medium tracking-widest uppercase mb-4">
            How It Works
          </p>
          <h2 className="text-3xl md:text-4xl font-serif font-light text-white">
            Three steps to your digital self
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Step 1 */}
          <div className="group relative p-8 rounded-2xl overflow-hidden">
            <div className="absolute inset-0 bg-white/[0.03] backdrop-blur-sm" />
            <div className="absolute inset-0 border border-white/[0.06] rounded-2xl group-hover:border-white/[0.12] transition-colors duration-300" />
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-500/5 flex items-center justify-center mb-6 border border-violet-500/20">
                <svg className="w-6 h-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div className="text-xs text-violet-400 font-medium mb-2">Step 1</div>
              <h3 className="text-xl font-medium text-white mb-3">Chat with AI</h3>
              <p className="text-white/50 text-sm leading-relaxed">
                Have a natural conversation. Nomi learns about your experience, skills, goals, and what makes you unique.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="group relative p-8 rounded-2xl overflow-hidden">
            <div className="absolute inset-0 bg-white/[0.03] backdrop-blur-sm" />
            <div className="absolute inset-0 border border-white/[0.06] rounded-2xl group-hover:border-white/[0.12] transition-colors duration-300" />
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-fuchsia-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-fuchsia-500/20 to-fuchsia-500/5 flex items-center justify-center mb-6 border border-fuchsia-500/20">
                <svg className="w-6 h-6 text-fuchsia-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="text-xs text-fuchsia-400 font-medium mb-2">Step 2</div>
              <h3 className="text-xl font-medium text-white mb-3">Get your .md file</h3>
              <p className="text-white/50 text-sm leading-relaxed">
                Your personal context is saved as a portable Markdown file. Export it anytime and use it with any AI tool.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="group relative p-8 rounded-2xl overflow-hidden">
            <div className="absolute inset-0 bg-white/[0.03] backdrop-blur-sm" />
            <div className="absolute inset-0 border border-white/[0.06] rounded-2xl group-hover:border-white/[0.12] transition-colors duration-300" />
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 flex items-center justify-center mb-6 border border-emerald-500/20">
                <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="text-xs text-emerald-400 font-medium mb-2">Step 3</div>
              <h3 className="text-xl font-medium text-white mb-3">Match with others</h3>
              <p className="text-white/50 text-sm leading-relaxed">
                Optionally, let your AI agent find meaningful connections — for work, friendship, or more.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Nomi */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-24">
        <div className="relative rounded-3xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 to-fuchsia-600/10 backdrop-blur-xl" />
          <div className="absolute inset-0 border border-white/10 rounded-3xl" />
          <div className="relative p-12 md:p-16">
            <div className="max-w-2xl">
              <p className="text-white/40 text-sm font-medium tracking-widest uppercase mb-4">
                Why Nomi?
              </p>
              <h2 className="text-3xl md:text-4xl font-serif font-light text-white mb-6">
                Your context, everywhere
              </h2>
              <p className="text-white/50 text-lg leading-relaxed mb-8">
                Every AI product asks you to start from scratch. Nomi creates a single source of truth
                about who you are — your skills, goals, values, and story — that you own and control.
              </p>
              <ul className="space-y-4">
                {[
                  'Export your profile as a .md file anytime',
                  'Use it with ChatGPT, Claude, or any AI assistant',
                  'Update it through natural conversation',
                  'Your data stays yours — delete anytime',
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-white/70">
                    <svg className="w-5 h-5 text-violet-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-24">
        <div className="text-center">
          <h2 className="text-3xl md:text-4xl font-serif font-light text-white mb-6">
            Ready to create your digital manual?
          </h2>
          <p className="text-white/50 text-lg mb-10 max-w-xl mx-auto">
            Join Nomi and let AI help you tell your story. It only takes a few minutes.
          </p>
          <Link
            href="/signup"
            className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl font-medium hover:from-violet-500 hover:to-fuchsia-500 transition-all duration-200 shadow-lg shadow-violet-500/25"
          >
            Get Started Free
            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                <span className="text-white font-bold text-sm">N</span>
              </div>
              <span className="text-white/40 text-sm">getnomi.me</span>
            </div>
            <p className="text-white/30 text-sm">
              © 2024 Nomi. Your story, always with you.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
