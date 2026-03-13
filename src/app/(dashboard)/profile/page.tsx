'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { RelationshipIntent, WorkExperience } from '@/types';

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
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matchingEnabled, setMatchingEnabled] = useState(false);
  const [togglingMatching, setTogglingMatching] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    // Fetch user with memory profile and agent profiles
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, name, email, avatar_url')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      setError('Failed to load profile');
      setLoading(false);
      return;
    }

    // Fetch memory profile
    const { data: memoryProfile } = await supabase
      .from('memory_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Fetch agent profiles
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
      setError('Failed to export profile');
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
      setError('Failed to update matching status');
    } finally {
      setTogglingMatching(false);
    }
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
  };

  const getIntentLabel = (intent: RelationshipIntent) => {
    const labels: Record<RelationshipIntent, string> = {
      professional: '💼 Professional',
      dating: '💕 Dating',
      friendship: '🤝 Friendship',
    };
    return labels[intent];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <p className="text-white/60">Profile not found</p>
      </div>
    );
  }

  const mp = profile.memory_profile;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white relative overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-fuchsia-600/10 rounded-full blur-[100px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/[0.06]">
        <div className="max-w-5xl mx-auto px-6 py-5 flex justify-between items-center">
          <Link href="/dashboard" className="group flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/25">
              <span className="text-white font-bold text-lg">N</span>
            </div>
            <span className="text-xl font-semibold tracking-tight text-white/90 group-hover:text-white transition-colors">
              Nomi
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            <Link href="/dashboard" className="px-4 py-2 text-sm text-white/50 hover:text-white hover:bg-white/[0.05] rounded-lg transition-all">
              Dashboard
            </Link>
            <Link href="/matches" className="px-4 py-2 text-sm text-white/50 hover:text-white hover:bg-white/[0.05] rounded-lg transition-all">
              Matches
            </Link>
            <Link href="/profile" className="px-4 py-2 text-sm text-white bg-white/[0.05] rounded-lg">
              Profile
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-6 py-12">
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            {error}
            <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
          </div>
        )}

        {/* Hero Section */}
        <div className="mb-12">
          <div className="flex items-center gap-6 mb-6">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-20 h-20 rounded-2xl object-cover ring-2 ring-white/10" />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center ring-2 ring-white/10">
                <span className="text-3xl text-white/60 font-medium">
                  {mp?.display_name?.[0] || profile.name?.[0] || '?'}
                </span>
              </div>
            )}
            <div>
              <h1 className="text-3xl font-serif font-light text-white mb-1">
                {mp?.display_name || profile.name || 'Anonymous'}
              </h1>
              {mp?.headline && (
                <p className="text-white/50">{mp.headline}</p>
              )}
              {mp?.location && (
                <p className="text-white/30 text-sm mt-1">📍 {mp.location}</p>
              )}
            </div>
          </div>
        </div>

        {!mp ? (
          /* No Profile - CTA to create */
          <div className="relative p-8 rounded-2xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 backdrop-blur-xl" />
            <div className="absolute inset-0 border border-white/10 rounded-2xl" />
            <div className="relative text-center">
              <h2 className="text-2xl font-serif text-white mb-3">Create Your Digital Manual</h2>
              <p className="text-white/50 mb-6 max-w-md mx-auto">
                Chat with AI to build your personal context. It only takes a few minutes.
              </p>
              <Link
                href="/onboarding"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-[#0a0a0f] rounded-xl font-medium hover:bg-white/90 transition-colors"
              >
                Get Started
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left Column - Actions */}
            <div className="space-y-4">
              {/* Action Buttons */}
              <div className="relative rounded-2xl overflow-hidden">
                <div className="absolute inset-0 bg-white/[0.03] backdrop-blur-sm" />
                <div className="absolute inset-0 border border-white/[0.06] rounded-2xl" />
                <div className="relative p-6 space-y-4">
                  <h3 className="text-sm font-medium text-white/40 uppercase tracking-wider mb-4">Actions</h3>

                  {/* Update via Chat */}
                  <Link
                    href="/profile/chat"
                    className="flex items-center gap-3 w-full p-4 rounded-xl bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 border border-violet-500/20 hover:border-violet-500/40 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                      <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">Update Profile</p>
                      <p className="text-white/40 text-sm">Chat with AI to update</p>
                    </div>
                    <svg className="w-5 h-5 text-white/30 group-hover:text-white/60 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>

                  {/* Export */}
                  <button
                    onClick={handleExport}
                    disabled={exporting}
                    className="flex items-center gap-3 w-full p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] transition-all group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                      <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-white font-medium">Export .md</p>
                      <p className="text-white/40 text-sm">Download your manual</p>
                    </div>
                    {exporting && (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    )}
                  </button>

                  {/* Matching Toggle */}
                  <div className="flex items-center gap-3 w-full p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${matchingEnabled ? 'bg-blue-500/20' : 'bg-white/[0.05]'}`}>
                      <svg className={`w-5 h-5 ${matchingEnabled ? 'text-blue-400' : 'text-white/40'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">Matching</p>
                      <p className="text-white/40 text-sm">{matchingEnabled ? 'Visible to others' : 'Hidden from matching'}</p>
                    </div>
                    <button
                      onClick={handleToggleMatching}
                      disabled={togglingMatching}
                      className={`relative w-12 h-7 rounded-full transition-colors ${matchingEnabled ? 'bg-blue-500' : 'bg-white/20'}`}
                    >
                      <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${matchingEnabled ? 'left-6' : 'left-1'}`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Sign Out */}
              <button
                onClick={handleSignOut}
                className="w-full p-4 text-sm text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-xl border border-white/[0.06] transition-all"
              >
                Sign out
              </button>
            </div>

            {/* Right Column - Memory */}
            <div className="lg:col-span-2 space-y-6">
              {/* Your Memory */}
              <div className="relative rounded-2xl overflow-hidden">
                <div className="absolute inset-0 bg-white/[0.03] backdrop-blur-sm" />
                <div className="absolute inset-0 border border-white/[0.06] rounded-2xl" />
                <div className="relative p-6">
                  <h3 className="text-sm font-medium text-white/40 uppercase tracking-wider mb-6">Your Memory</h3>

                  <div className="space-y-6">
                    {/* Goals */}
                    {mp.current_goals && mp.current_goals.length > 0 && (
                      <div>
                        <p className="text-white/50 text-sm mb-2">Current Goals</p>
                        <div className="flex flex-wrap gap-2">
                          {mp.current_goals.map((goal, i) => (
                            <span key={i} className="px-3 py-1.5 bg-violet-500/10 text-violet-300 rounded-lg text-sm border border-violet-500/20">
                              {goal}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Skills */}
                    {mp.skills && mp.skills.length > 0 && (
                      <div>
                        <p className="text-white/50 text-sm mb-2">Skills</p>
                        <div className="flex flex-wrap gap-2">
                          {mp.skills.map((skill, i) => (
                            <span key={i} className="px-3 py-1.5 bg-blue-500/10 text-blue-300 rounded-lg text-sm border border-blue-500/20">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Can Offer */}
                    {mp.can_offer && mp.can_offer.length > 0 && (
                      <div>
                        <p className="text-white/50 text-sm mb-2">What I Can Offer</p>
                        <div className="flex flex-wrap gap-2">
                          {mp.can_offer.map((item, i) => (
                            <span key={i} className="px-3 py-1.5 bg-emerald-500/10 text-emerald-300 rounded-lg text-sm border border-emerald-500/20">
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Looking For */}
                    {mp.looking_for && mp.looking_for.length > 0 && (
                      <div>
                        <p className="text-white/50 text-sm mb-2">What I&apos;m Looking For</p>
                        <div className="flex flex-wrap gap-2">
                          {mp.looking_for.map((item, i) => (
                            <span key={i} className="px-3 py-1.5 bg-amber-500/10 text-amber-300 rounded-lg text-sm border border-amber-500/20">
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Interests */}
                    {mp.interests && mp.interests.length > 0 && (
                      <div>
                        <p className="text-white/50 text-sm mb-2">Interests</p>
                        <div className="flex flex-wrap gap-2">
                          {mp.interests.map((interest, i) => (
                            <span key={i} className="px-3 py-1.5 bg-pink-500/10 text-pink-300 rounded-lg text-sm border border-pink-500/20">
                              {interest}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Values */}
                    {mp.values && mp.values.length > 0 && (
                      <div>
                        <p className="text-white/50 text-sm mb-2">Values</p>
                        <div className="flex flex-wrap gap-2">
                          {mp.values.map((value, i) => (
                            <span key={i} className="px-3 py-1.5 bg-white/[0.05] text-white/70 rounded-lg text-sm border border-white/10">
                              {value}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Intents */}
                    {mp.intents && mp.intents.length > 0 && (
                      <div>
                        <p className="text-white/50 text-sm mb-2">Open to Connect</p>
                        <div className="flex flex-wrap gap-2">
                          {mp.intents.map((intent, i) => (
                            <span key={i} className="px-3 py-1.5 bg-fuchsia-500/10 text-fuchsia-300 rounded-lg text-sm border border-fuchsia-500/20">
                              {getIntentLabel(intent)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* AI Agents */}
              {matchingEnabled && profile.agent_profiles && profile.agent_profiles.length > 0 && (
                <div className="relative rounded-2xl overflow-hidden">
                  <div className="absolute inset-0 bg-white/[0.03] backdrop-blur-sm" />
                  <div className="absolute inset-0 border border-white/[0.06] rounded-2xl" />
                  <div className="relative p-6">
                    <h3 className="text-sm font-medium text-white/40 uppercase tracking-wider mb-6">Your AI Agents</h3>
                    <div className="space-y-4">
                      {profile.agent_profiles.map((agent) => (
                        <div key={agent.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                          <div className="flex items-center gap-3 mb-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              agent.intent === 'professional' ? 'bg-blue-500/20 text-blue-300' :
                              agent.intent === 'dating' ? 'bg-pink-500/20 text-pink-300' :
                              'bg-emerald-500/20 text-emerald-300'
                            }`}>
                              {getIntentLabel(agent.intent)}
                            </span>
                          </div>
                          <p className="text-white/70 text-sm mb-3">{agent.summary}</p>
                          {agent.talking_points && agent.talking_points.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {agent.talking_points.slice(0, 3).map((point, i) => (
                                <span key={i} className="px-2 py-1 bg-white/[0.05] text-white/50 rounded text-xs">
                                  {point.length > 40 ? point.slice(0, 40) + '...' : point}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
