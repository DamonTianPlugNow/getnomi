'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter, useParams } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function SignUpPage() {
  const supabase = createClient();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const t = useTranslations('auth.signup');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEmailSignup, setShowEmailSignup] = useState(false);

  const handleLinkedInSignUp = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'linkedin_oidc',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirect=/onboarding`,
      },
    });
  };

  const handleGoogleSignUp = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirect=/onboarding`,
      },
    });
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push(`/${locale}/onboarding`);
    }
  };

  const benefits = [
    t('benefits.aiContext'),
    t('benefits.export'),
    t('benefits.matching'),
  ];

  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href={`/${locale}`} className="inline-flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded bg-[#37352f] flex items-center justify-center">
              <span className="text-white font-bold text-sm">N</span>
            </div>
            <span className="text-xl font-semibold text-[#37352f]">Nomi</span>
          </Link>
          <h1 className="text-2xl font-bold text-[#37352f] mb-2">
            {t('title')}
          </h1>
          <p className="text-[#37352f]/60 text-sm">
            {t('subtitle')}
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleGoogleSignUp}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white text-[#37352f] rounded-md border border-[#e3e2de] hover:bg-[#f7f6f3] transition-colors font-medium"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {t('continueWithGoogle')}
          </button>

          <button
            onClick={handleLinkedInSignUp}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#0A66C2] text-white rounded-md hover:bg-[#004182] transition-colors font-medium"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
            </svg>
            {t('continueWithLinkedIn')}
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#e3e2de]"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-[#37352f]/40">or</span>
            </div>
          </div>

          {!showEmailSignup ? (
            <button
              onClick={() => setShowEmailSignup(true)}
              className="w-full px-4 py-3 text-[#37352f]/70 hover:text-[#37352f] rounded-md border border-[#e3e2de] hover:bg-[#f7f6f3] transition-colors font-medium"
            >
              {t('continueWithEmail')}
            </button>
          ) : (
            <form onSubmit={handleEmailSignUp} className="space-y-3">
              {error && (
                <div className="p-3 bg-[#eb5757]/10 border border-[#eb5757]/20 rounded-md text-[#eb5757] text-sm">
                  {error}
                </div>
              )}
              <input
                type="text"
                placeholder={t('namePlaceholder')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border border-[#e3e2de] rounded-md focus:outline-none focus:ring-2 focus:ring-[#0077cc]/20 focus:border-[#0077cc] transition-colors text-[#37352f] placeholder:text-[#37352f]/40"
                required
              />
              <input
                type="email"
                placeholder={t('emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-[#e3e2de] rounded-md focus:outline-none focus:ring-2 focus:ring-[#0077cc]/20 focus:border-[#0077cc] transition-colors text-[#37352f] placeholder:text-[#37352f]/40"
                required
              />
              <input
                type="password"
                placeholder={t('passwordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-[#e3e2de] rounded-md focus:outline-none focus:ring-2 focus:ring-[#0077cc]/20 focus:border-[#0077cc] transition-colors text-[#37352f] placeholder:text-[#37352f]/40"
                required
                minLength={6}
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#0077cc] hover:bg-[#0066b3] text-white rounded-md transition-colors font-medium disabled:opacity-50"
              >
                {loading ? t('creatingAccount') : t('createAccount')}
              </button>
            </form>
          )}
        </div>

        {/* Benefits */}
        <div className="mt-8 p-4 bg-[#f7f6f3] rounded-lg">
          <p className="text-sm font-medium text-[#37352f] mb-3">{t('benefits.title')}</p>
          <div className="space-y-2">
            {benefits.map((benefit, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-[#37352f]/70">
                <svg className="w-4 h-4 text-[#0f7b6c]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {benefit}
              </div>
            ))}
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-[#37352f]/60">
          {t('hasAccount')}{' '}
          <Link href={`/${locale}/login`} className="text-[#0077cc] hover:underline font-medium">
            {t('loginLink', { defaultValue: 'Log in' })}
          </Link>
        </p>

        <p className="mt-4 text-center text-xs text-[#37352f]/40">
          {t('terms')}
        </p>
      </div>
    </main>
  );
}
