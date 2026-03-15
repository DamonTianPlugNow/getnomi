import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const t = await getTranslations();

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
            <LanguageSwitcher />
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-[#37352f]/70 hover:text-[#37352f] hover:bg-[#f7f6f3] rounded-md transition-colors"
            >
              {t('common.login')}
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 bg-[#37352f] hover:bg-[#2f2d28] text-white text-sm font-medium rounded-md transition-colors"
            >
              {t('common.signup')}
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-[#37352f] mb-6 leading-tight tracking-tight">
          {t('home.hero.title')}
          <br />
          <span className="bg-gradient-to-r from-[#0077cc] via-[#9065b0] to-[#eb5757] bg-clip-text text-transparent">
            {t('home.hero.titleHighlight')}
          </span>
        </h1>
        <p className="text-xl text-[#37352f]/60 mb-10 max-w-2xl mx-auto leading-relaxed">
          {t('home.hero.description')}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#0077cc] hover:bg-[#0066b3] text-white font-medium rounded-md transition-colors"
          >
            {t('home.cta.getStarted')}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
          <a
            href="#features"
            className="inline-flex items-center justify-center px-6 py-3 text-[#37352f] font-medium rounded-md border border-[#e3e2de] hover:bg-[#f7f6f3] transition-colors"
          >
            {t('home.cta.howItWorks')}
          </a>
        </div>
      </section>

      {/* Product Preview */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="bg-[#f7f6f3] rounded-2xl p-8 md:p-12 border border-[#e3e2de]">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-[#37352f]">{t('home.preview.title')}</h2>
              <p className="text-[#37352f]/60">
                {t('home.preview.description')}
              </p>
              <div className="space-y-2 pt-2">
                {[
                  { key: 'skills', icon: '💡' },
                  { key: 'goals', icon: '🎯' },
                  { key: 'values', icon: '💜' },
                  { key: 'connections', icon: '🤝' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center gap-2 text-sm text-[#37352f]/70">
                    <span>{item.icon}</span>
                    <span>{t(`home.preview.features.${item.key}`)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 border border-[#e3e2de] font-mono text-sm">
              <div className="text-[#37352f]/40 mb-2"># my-profile.md</div>
              <div className="space-y-1 text-[#37352f]/70">
                <div><span className="text-[#0077cc]">##</span> About Me</div>
                <div className="pl-4 text-xs">Product designer with 5+ years...</div>
                <div className="mt-2"><span className="text-[#0077cc]">##</span> Skills</div>
                <div className="pl-4 text-xs">UI/UX, Figma, User Research...</div>
                <div className="mt-2"><span className="text-[#0077cc]">##</span> Looking For</div>
                <div className="pl-4 text-xs">Co-founders, mentors, friends...</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="max-w-5xl mx-auto px-6 pb-20">
        <h2 className="text-3xl font-bold text-[#37352f] text-center mb-12">{t('home.features.title')}</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { key: 'chat', icon: '💬', color: 'bg-[#0077cc]/10' },
            { key: 'export', icon: '📄', color: 'bg-[#0f7b6c]/10' },
            { key: 'match', icon: '✨', color: 'bg-[#9065b0]/10' },
            { key: 'privacy', icon: '🔒', color: 'bg-[#37352f]/10' },
            { key: 'ai', icon: '🧠', color: 'bg-[#eb5757]/10' },
            { key: 'update', icon: '🔄', color: 'bg-[#f7c94b]/10' },
          ].map((feature) => (
            <div key={feature.key} className="p-6 rounded-xl border border-[#e3e2de] hover:border-[#d3d2ce] transition-colors">
              <div className={`w-10 h-10 ${feature.color} rounded-lg flex items-center justify-center mb-4`}>
                <span className="text-xl">{feature.icon}</span>
              </div>
              <h3 className="font-semibold text-[#37352f] mb-2">{t(`home.features.${feature.key}.title`)}</h3>
              <p className="text-sm text-[#37352f]/60">{t(`home.features.${feature.key}.description`)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <div className="bg-[#37352f] rounded-2xl p-8 md:p-12 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            {t('home.finalCta.title')}
          </h2>
          <p className="text-white/60 mb-8 max-w-xl mx-auto">
            {t('home.finalCta.description')}
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white hover:bg-[#f7f6f3] text-[#37352f] font-medium rounded-md transition-colors"
          >
            {t('home.cta.getStarted')}
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
              © 2024 Nomi. {t('home.footer.tagline')}
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
