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
    <main className="min-h-screen bg-white text-[#37352f]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b border-[#e3e2de]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-[#37352f] flex items-center justify-center">
              <span className="text-white font-bold text-sm">N</span>
            </div>
            <span className="text-xl font-semibold text-[#37352f]">
              Nomi
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-[#37352f]/70 hover:text-[#37352f] hover:bg-[#f7f6f3] rounded-md transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 bg-[#37352f] hover:bg-[#2f2d28] text-white text-sm font-medium rounded-md transition-colors"
            >
              Get Nomi free
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-[#37352f] mb-6 leading-tight tracking-tight">
          Your personal context,
          <br />
          <span className="bg-gradient-to-r from-[#0077cc] via-[#9065b0] to-[#eb5757] bg-clip-text text-transparent">
            everywhere you go
          </span>
        </h1>
        <p className="text-xl text-[#37352f]/60 mb-10 max-w-2xl mx-auto leading-relaxed">
          Nomi is the AI-powered way to create and maintain your digital identity.
          Export it as a portable .md file that works with any AI product.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#0077cc] hover:bg-[#0066b3] text-white font-medium rounded-md transition-colors"
          >
            Get Nomi free
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
          <a
            href="#features"
            className="inline-flex items-center justify-center px-6 py-3 text-[#37352f] font-medium rounded-md border border-[#e3e2de] hover:bg-[#f7f6f3] transition-colors"
          >
            See how it works
          </a>
        </div>
      </section>

      {/* Product Preview */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="bg-[#f7f6f3] rounded-2xl p-8 md:p-12 border border-[#e3e2de]">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#0f7b6c]/10 text-[#0f7b6c] rounded-full text-sm font-medium">
                <span className="w-2 h-2 bg-[#0f7b6c] rounded-full"></span>
                AI-powered
              </div>
              <h2 className="text-3xl font-bold text-[#37352f]">
                Chat to build your profile
              </h2>
              <p className="text-[#37352f]/60 leading-relaxed">
                No forms to fill. Just have a conversation with Nomi and watch your personal context come to life.
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-[#e3e2de]">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-[#e3e2de]">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0077cc] to-[#9065b0] flex items-center justify-center">
                  <span className="text-white font-medium">N</span>
                </div>
                <div>
                  <p className="font-medium text-[#37352f]">Nomi</p>
                  <p className="text-sm text-[#37352f]/50">Your AI assistant</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="bg-[#f7f6f3] rounded-lg p-3 text-sm text-[#37352f]/80">
                  Tell me about yourself. What do you do?
                </div>
                <div className="bg-[#0077cc]/10 rounded-lg p-3 text-sm text-[#37352f]/80 ml-8">
                  I'm a product designer at a startup...
                </div>
                <div className="bg-[#f7f6f3] rounded-lg p-3 text-sm text-[#37352f]/80">
                  Great! What are you passionate about?
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="max-w-5xl mx-auto px-6 pb-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-[#37352f] mb-4">
            Everything you need
          </h2>
          <p className="text-[#37352f]/60 max-w-xl mx-auto">
            Build, maintain, and share your personal context with powerful features.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {/* Feature 1 - Blue */}
          <div className="bg-[#0077cc]/5 rounded-xl p-6 border border-[#0077cc]/10 hover:border-[#0077cc]/20 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-[#0077cc]/10 flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-[#0077cc]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="font-semibold text-[#37352f] mb-2">AI Conversations</h3>
            <p className="text-sm text-[#37352f]/60">
              Natural chat interface to build and update your profile effortlessly.
            </p>
          </div>

          {/* Feature 2 - Teal */}
          <div className="bg-[#0f7b6c]/5 rounded-xl p-6 border border-[#0f7b6c]/10 hover:border-[#0f7b6c]/20 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-[#0f7b6c]/10 flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-[#0f7b6c]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="font-semibold text-[#37352f] mb-2">Export as .md</h3>
            <p className="text-sm text-[#37352f]/60">
              Download your profile as a portable Markdown file anytime.
            </p>
          </div>

          {/* Feature 3 - Purple */}
          <div className="bg-[#9065b0]/5 rounded-xl p-6 border border-[#9065b0]/10 hover:border-[#9065b0]/20 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-[#9065b0]/10 flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-[#9065b0]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-[#37352f] mb-2">Smart Matching</h3>
            <p className="text-sm text-[#37352f]/60">
              Optionally connect with like-minded people based on your profile.
            </p>
          </div>

          {/* Feature 4 - Orange */}
          <div className="bg-[#eb5757]/5 rounded-xl p-6 border border-[#eb5757]/10 hover:border-[#eb5757]/20 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-[#eb5757]/10 flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-[#eb5757]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="font-semibold text-[#37352f] mb-2">Privacy First</h3>
            <p className="text-sm text-[#37352f]/60">
              Your data is yours. Control what you share and with whom.
            </p>
          </div>

          {/* Feature 5 - Yellow */}
          <div className="bg-[#f7c94b]/10 rounded-xl p-6 border border-[#f7c94b]/20 hover:border-[#f7c94b]/30 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-[#f7c94b]/20 flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-[#9a7b00]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="font-semibold text-[#37352f] mb-2">Always Updated</h3>
            <p className="text-sm text-[#37352f]/60">
              Chat anytime to keep your profile fresh and relevant.
            </p>
          </div>

          {/* Feature 6 - Blue */}
          <div className="bg-[#0077cc]/5 rounded-xl p-6 border border-[#0077cc]/10 hover:border-[#0077cc]/20 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-[#0077cc]/10 flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-[#0077cc]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
              </svg>
            </div>
            <h3 className="font-semibold text-[#37352f] mb-2">Works Everywhere</h3>
            <p className="text-sm text-[#37352f]/60">
              Use your .md file with ChatGPT, Claude, or any AI assistant.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="bg-[#37352f] rounded-2xl p-12 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Start building your digital identity
          </h2>
          <p className="text-white/60 mb-8 max-w-lg mx-auto">
            Join thousands of people who use Nomi to maintain their personal context across AI products.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white hover:bg-[#f7f6f3] text-[#37352f] font-medium rounded-md transition-colors"
          >
            Get Nomi free
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#e3e2de]">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-[#37352f] flex items-center justify-center">
                <span className="text-white font-bold text-xs">N</span>
              </div>
              <span className="text-[#37352f]/50 text-sm">getnomi.me</span>
            </div>
            <p className="text-[#37352f]/40 text-sm">
              © 2024 Nomi. Your story, always with you.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
