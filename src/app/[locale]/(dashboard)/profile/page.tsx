'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { RelationshipIntent, WorkExperience } from '@/types';
import { useTranslations } from 'next-intl';

interface ProfileData {
  id: string;
  name: string | null;
  email: string;
  avatar_url: string | null;
  memory_profile: {
    id: string;
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
    is_active: boolean;
  } | null;
  agent_profiles: Array<{
    id: string;
    intent: RelationshipIntent;
    summary: string;
    talking_points: string[];
  }>;
}

export default function ProfilePage() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const t = useTranslations();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matchingEnabled, setMatchingEnabled] = useState(false);
  const [togglingMatching, setTogglingMatching] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push(`/${locale}/login`);
      return;
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, name, email, avatar_url')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      setError(t('profile.loadError'));
      setLoading(false);
      return;
    }

    const { data: memoryProfile } = await supabase
      .from('memory_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const { data: agentProfiles } = await supabase
      .from('agent_profiles')
      .select('id, intent, summary, talking_points')
      .eq('user_id', user.id);

    setProfile({
      ...userData,
      memory_profile: memoryProfile || null,
      agent_profiles: agentProfiles || [],
    });
    setMatchingEnabled(memoryProfile?.is_active || false);
    setLoading(false);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await fetch('/api/profile/export');
      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${profile?.memory_profile?.display_name || 'profile'}.md`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      setError(t('profile.exportError'));
    } finally {
      setExporting(false);
    }
  };

  const handleToggleMatching = async () => {
    setTogglingMatching(true);
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !matchingEnabled }),
      });
      if (!response.ok) throw new Error('Failed to update');
      setMatchingEnabled(!matchingEnabled);
    } catch {
      setError(t('profile.updateError'));
    } finally {
      setTogglingMatching(false);
    }
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push(`/${locale}`);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return;

    setDeleting(true);
    try {
      const response = await fetch('/api/user/delete', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to delete account');
      }

      // Sign out and redirect to home
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push(`/${locale}`);
    } catch {
      setError(t('profile.deleteAccountError'));
      setDeleting(false);
    }
  };

  const getIntentLabel = (intent: RelationshipIntent) => {
    return t(`profile.intents.${intent}`);
  };

  const getIntentColor = (intent: RelationshipIntent) => {
    const colors: Record<RelationshipIntent, { bg: string; text: string }> = {
      professional: { bg: 'bg-[#0077cc]/10', text: 'text-[#0077cc]' },
      dating: { bg: 'bg-[#eb5757]/10', text: 'text-[#eb5757]' },
      friendship: { bg: 'bg-[#0f7b6c]/10', text: 'text-[#0f7b6c]' },
    };
    return colors[intent];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#0077cc] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-[#37352f]/60">{t('profile.profileNotFound')}</p>
      </div>
    );
  }

  const mp = profile.memory_profile;

  return (
    <div className="min-h-screen bg-white text-[#37352f]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b border-[#e3e2de]">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href={`/${locale}/dashboard`} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-[#37352f] flex items-center justify-center">
              <span className="text-white font-bold text-sm">N</span>
            </div>
            <span className="text-xl font-semibold text-[#37352f]">Nomi</span>
          </Link>

          <nav className="flex items-center gap-1">
            <Link href={`/${locale}/dashboard`} className="px-4 py-2 text-sm font-medium text-[#37352f]/60 hover:text-[#37352f] hover:bg-[#f7f6f3] rounded-md transition-colors">
              {t('nav.dashboard')}
            </Link>
            <Link href={`/${locale}/matches`} className="px-4 py-2 text-sm font-medium text-[#37352f]/60 hover:text-[#37352f] hover:bg-[#f7f6f3] rounded-md transition-colors">
              {t('nav.matches')}
            </Link>
            <div className="w-px h-5 bg-[#e3e2de] mx-2" />
            <button
              onClick={handleSignOut}
              className="px-4 py-2 text-sm font-medium text-[#37352f]/40 hover:text-[#eb5757] hover:bg-[#eb5757]/5 rounded-md transition-colors"
            >
              {t('profile.signOut')}
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        {error && (
          <div className="mb-6 p-4 bg-[#eb5757]/10 border border-[#eb5757]/20 rounded-lg text-[#eb5757]">
            {error}
          </div>
        )}

        {!mp ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-6 bg-[#f7f6f3] rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-[#37352f]/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-[#37352f] mb-2">{t('profile.noProfile')}</h2>
            <p className="text-[#37352f]/60 mb-6">{t('profile.noProfileDescription')}</p>
            <Link
              href={`/${locale}/onboarding`}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0077cc] hover:bg-[#0066b3] text-white font-medium rounded-md transition-colors"
            >
              {t('profile.createProfile')}
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Profile Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-16 h-16 rounded-full object-cover" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-[#f7f6f3] flex items-center justify-center">
                    <span className="text-2xl font-medium text-[#37352f]/50">
                      {mp.display_name?.[0] || '?'}
                    </span>
                  </div>
                )}
                <div>
                  <h1 className="text-2xl font-bold text-[#37352f]">{mp.display_name}</h1>
                  {mp.headline && <p className="text-[#37352f]/60">{mp.headline}</p>}
                  {mp.location && (
                    <p className="text-sm text-[#37352f]/40 flex items-center gap-1 mt-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {mp.location}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <Link
                href={`/${locale}/profile/chat`}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0077cc] hover:bg-[#0066b3] text-white font-medium rounded-md transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                {t('profile.updateWithAI')}
              </Link>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="inline-flex items-center gap-2 px-4 py-2.5 border border-[#e3e2de] hover:bg-[#f7f6f3] text-[#37352f] font-medium rounded-md transition-colors disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {exporting ? t('profile.exporting') : t('profile.exportMd')}
              </button>
              <button
                onClick={handleToggleMatching}
                disabled={togglingMatching}
                className={`inline-flex items-center gap-2 px-4 py-2.5 border rounded-md font-medium transition-colors disabled:opacity-50 ${
                  matchingEnabled
                    ? 'border-[#0f7b6c] bg-[#0f7b6c]/5 text-[#0f7b6c]'
                    : 'border-[#e3e2de] text-[#37352f]/60 hover:bg-[#f7f6f3]'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${matchingEnabled ? 'bg-[#0f7b6c]' : 'bg-[#37352f]/30'}`} />
                {togglingMatching ? t('profile.updating') : matchingEnabled ? t('profile.matchingOn') : t('profile.matchingOff')}
              </button>
            </div>

            {/* Memory Sections */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Skills */}
              {mp.skills && mp.skills.length > 0 && (
                <div className="p-5 bg-[#f7f6f3] rounded-xl">
                  <h3 className="text-sm font-semibold text-[#37352f]/50 uppercase tracking-wide mb-3">{t('profile.sections.skills')}</h3>
                  <div className="flex flex-wrap gap-2">
                    {mp.skills.map((skill, i) => (
                      <span key={i} className="px-3 py-1 bg-white text-[#37352f] text-sm rounded-md border border-[#e3e2de]">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Interests */}
              {mp.interests && mp.interests.length > 0 && (
                <div className="p-5 bg-[#f7f6f3] rounded-xl">
                  <h3 className="text-sm font-semibold text-[#37352f]/50 uppercase tracking-wide mb-3">{t('profile.sections.interests')}</h3>
                  <div className="flex flex-wrap gap-2">
                    {mp.interests.map((interest, i) => (
                      <span key={i} className="px-3 py-1 bg-white text-[#37352f] text-sm rounded-md border border-[#e3e2de]">
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Goals */}
              {mp.current_goals && mp.current_goals.length > 0 && (
                <div className="p-5 bg-[#0077cc]/5 rounded-xl border border-[#0077cc]/10">
                  <h3 className="text-sm font-semibold text-[#0077cc] uppercase tracking-wide mb-3">{t('profile.sections.currentGoals')}</h3>
                  <ul className="space-y-2">
                    {mp.current_goals.map((goal, i) => (
                      <li key={i} className="flex items-start gap-2 text-[#37352f]">
                        <span className="text-[#0077cc] mt-1">→</span>
                        {goal}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Values */}
              {mp.values && mp.values.length > 0 && (
                <div className="p-5 bg-[#9065b0]/5 rounded-xl border border-[#9065b0]/10">
                  <h3 className="text-sm font-semibold text-[#9065b0] uppercase tracking-wide mb-3">{t('profile.sections.values')}</h3>
                  <div className="flex flex-wrap gap-2">
                    {mp.values.map((value, i) => (
                      <span key={i} className="px-3 py-1 bg-white text-[#37352f] text-sm rounded-md border border-[#9065b0]/20">
                        {value}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Can Offer */}
              {mp.can_offer && mp.can_offer.length > 0 && (
                <div className="p-5 bg-[#0f7b6c]/5 rounded-xl border border-[#0f7b6c]/10">
                  <h3 className="text-sm font-semibold text-[#0f7b6c] uppercase tracking-wide mb-3">{t('profile.sections.canOffer')}</h3>
                  <ul className="space-y-2">
                    {mp.can_offer.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-[#37352f]">
                        <svg className="w-4 h-4 text-[#0f7b6c] mt-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Looking For */}
              {mp.looking_for && mp.looking_for.length > 0 && (
                <div className="p-5 bg-[#f7c94b]/5 rounded-xl border border-[#f7c94b]/20">
                  <h3 className="text-sm font-semibold text-[#b8860b] uppercase tracking-wide mb-3">{t('profile.sections.lookingFor')}</h3>
                  <ul className="space-y-2">
                    {mp.looking_for.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-[#37352f]">
                        <span className="text-[#b8860b] mt-1">◦</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Relationship Types */}
            {mp.intents && mp.intents.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-[#37352f]/50 uppercase tracking-wide mb-3">{t('profile.sections.openToConnect')}</h3>
                <div className="flex flex-wrap gap-2">
                  {mp.intents.map((intent) => {
                    const color = getIntentColor(intent);
                    return (
                      <span key={intent} className={`px-4 py-2 rounded-md text-sm font-medium ${color.bg} ${color.text}`}>
                        {getIntentLabel(intent)}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* AI Agents */}
            {profile.agent_profiles && profile.agent_profiles.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-[#37352f]/50 uppercase tracking-wide mb-4">{t('profile.yourAgents')}</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {profile.agent_profiles.map((agent) => {
                    const color = getIntentColor(agent.intent);
                    return (
                      <div key={agent.id} className={`p-5 rounded-xl border border-[#e3e2de] ${color.bg}`}>
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium mb-3 bg-white ${color.text}`}>
                          {getIntentLabel(agent.intent)}
                        </span>
                        <p className="text-sm text-[#37352f]/70 mb-3">{agent.summary}</p>
                        {agent.talking_points && agent.talking_points.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {agent.talking_points.slice(0, 3).map((point, i) => (
                              <span key={i} className="px-2 py-1 bg-white/80 text-[#37352f]/60 rounded text-xs">
                                {point.length > 30 ? point.slice(0, 30) + '...' : point}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Danger Zone */}
            <div className="mt-12 pt-8 border-t border-[#eb5757]/20">
              <h3 className="text-sm font-semibold text-[#eb5757] uppercase tracking-wide mb-4">{t('profile.dangerZone')}</h3>
              <div className="p-5 rounded-xl border border-[#eb5757]/30 bg-[#eb5757]/5">
                <p className="text-sm text-[#37352f]/70 mb-4">{t('profile.deleteAccountWarning')}</p>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="px-4 py-2 bg-[#eb5757] text-white text-sm font-medium rounded-lg hover:bg-[#d94444] transition-colors"
                >
                  {t('profile.deleteAccount')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Account Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
              <h3 className="text-lg font-semibold text-[#37352f] mb-2">{t('profile.deleteAccountTitle')}</h3>
              <p className="text-sm text-[#37352f]/70 mb-4">{t('profile.deleteAccountConfirm')}</p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full px-4 py-2 border border-[#e3e2de] rounded-lg text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-[#eb5757]/50"
              />
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteConfirmText('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-[#37352f]/60 hover:text-[#37352f] transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText !== 'DELETE' || deleting}
                  className="px-4 py-2 bg-[#eb5757] text-white text-sm font-medium rounded-lg hover:bg-[#d94444] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleting ? t('common.loading') : t('profile.deleteAccount')}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
