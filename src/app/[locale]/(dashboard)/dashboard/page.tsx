import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();
  const t = await getTranslations();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from('memory_profiles')
    .select('*, agent_profiles(*)')
    .eq('user_id', user.id)
    .single();

  // Fetch recent matches
  const { data: matches } = await supabase
    .from('matches')
    .select(`
      *,
      user_a:users!user_a_id(id, name, avatar_url),
      user_b:users!user_b_id(id, name, avatar_url),
      agent_a:agent_profiles!agent_a_id(summary),
      agent_b:agent_profiles!agent_b_id(summary)
    `)
    .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
    .in('status', ['pending', 'half_approved', 'matched'])
    .order('created_at', { ascending: false })
    .limit(5);

  // Fetch upcoming meetings
  const { data: meetings } = await supabase
    .from('meetings')
    .select(`
      *,
      user_a:users!user_a_id(id, name, avatar_url),
      user_b:users!user_b_id(id, name, avatar_url)
    `)
    .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
    .eq('status', 'scheduled')
    .gte('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(3);

  const hasProfile = !!profile;
  const isProfileActive = profile?.is_active;
  const firstName = user.user_metadata?.name?.split(' ')[0] || 'there';

  return (
    <div className="min-h-screen bg-white text-[#37352f]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b border-[#e3e2de]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href={`/${locale}/dashboard`} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-[#37352f] flex items-center justify-center">
              <span className="text-white font-bold text-sm">N</span>
            </div>
            <span className="text-xl font-semibold text-[#37352f]">Nomi</span>
          </Link>

          <nav className="flex items-center gap-1">
            <LanguageSwitcher />
            {[
              { href: `/${locale}/matches`, label: t('nav.matches') },
              { href: `/${locale}/meetings`, label: t('nav.meetings') },
              { href: `/${locale}/profile`, label: t('nav.profile') },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-4 py-2 text-sm font-medium text-[#37352f]/60 hover:text-[#37352f] hover:bg-[#f7f6f3] rounded-md transition-colors"
              >
                {item.label}
              </Link>
            ))}
            <div className="w-px h-5 bg-[#e3e2de] mx-2" />
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-[#37352f]/40 hover:text-[#eb5757] hover:bg-[#eb5757]/5 rounded-md transition-colors"
              >
                {t('common.logout')}
              </button>
            </form>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        {/* Welcome Section */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-[#37352f] mb-2">
            {t('dashboard.welcome', { firstName })}
          </h1>
          <p className="text-[#37352f]/60">
            {t('dashboard.matchingOn.description')}
          </p>
        </div>

        {/* Status Cards */}
        {!hasProfile && (
          <div className="mb-8 p-6 bg-[#0077cc]/5 rounded-xl border border-[#0077cc]/10">
            <h2 className="text-xl font-semibold text-[#37352f] mb-2">{t('dashboard.completeProfile.title')}</h2>
            <p className="text-[#37352f]/60 mb-4">
              {t('dashboard.completeProfile.description')}
            </p>
            <Link
              href={`/${locale}/onboarding`}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0077cc] hover:bg-[#0066b3] text-white font-medium rounded-md transition-colors"
            >
              {t('dashboard.completeProfile.cta')}
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        )}

        {hasProfile && !isProfileActive && (
          <div className="mb-8 p-6 bg-[#f7c94b]/10 rounded-xl border border-[#f7c94b]/20">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-[#f7c94b]/20 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-[#f7c94b] border-t-transparent rounded-full animate-spin" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[#37352f]">{t('dashboard.generating.title')}</h2>
                <p className="text-[#37352f]/60 text-sm">
                  {t('dashboard.generating.description')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        {hasProfile && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            {[
              { value: profile?.agent_profiles?.length || 0, label: t('dashboard.stats.activeAgents'), color: 'blue', href: `/${locale}/profile` },
              { value: matches?.length || 0, label: t('dashboard.stats.pendingMatches'), color: 'teal', href: `/${locale}/matches` },
              { value: meetings?.length || 0, label: t('dashboard.stats.upcomingMeetings'), color: 'orange', href: `/${locale}/meetings` },
              { value: profile?.intents?.length || 0, label: 'Relationship Types', color: 'purple', href: `/${locale}/profile` },
            ].map((stat, i) => {
              const colors: Record<string, string> = {
                blue: 'bg-[#0077cc]/5 border-[#0077cc]/10 hover:border-[#0077cc]/20',
                teal: 'bg-[#0f7b6c]/5 border-[#0f7b6c]/10 hover:border-[#0f7b6c]/20',
                orange: 'bg-[#eb5757]/5 border-[#eb5757]/10 hover:border-[#eb5757]/20',
                purple: 'bg-[#9065b0]/5 border-[#9065b0]/10 hover:border-[#9065b0]/20',
              };
              return (
                <Link
                  key={i}
                  href={stat.href}
                  className={`p-5 rounded-xl border transition-colors ${colors[stat.color]}`}
                >
                  <p className="text-3xl font-bold text-[#37352f] mb-1">{stat.value}</p>
                  <p className="text-sm text-[#37352f]/60">{stat.label}</p>
                </Link>
              );
            })}
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Matches */}
          <div className="bg-[#f7f6f3] rounded-xl p-6 border border-[#e3e2de]">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-semibold text-[#37352f]">{t('dashboard.recentMatches.title')}</h2>
              <Link href={`/${locale}/matches`} className="text-sm text-[#0077cc] hover:underline">
                {t('dashboard.recentMatches.viewAll')} →
              </Link>
            </div>

            {!matches || matches.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#e3e2de] flex items-center justify-center">
                  <svg className="w-6 h-6 text-[#37352f]/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <p className="text-[#37352f]/60 mb-1">{t('dashboard.recentMatches.empty')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {matches.map((match) => {
                  const otherUser = match.user_a_id === user.id ? match.user_b : match.user_a;
                  const otherAgent = match.user_a_id === user.id ? match.agent_b : match.agent_a;
                  return (
                    <Link
                      key={match.id}
                      href={`/${locale}/matches/${match.id}`}
                      className="flex items-center gap-4 p-4 bg-white rounded-lg border border-[#e3e2de] hover:border-[#0077cc]/30 transition-colors"
                    >
                      <div className="relative">
                        {otherUser?.avatar_url ? (
                          <img
                            src={otherUser.avatar_url}
                            alt=""
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-[#e3e2de] flex items-center justify-center">
                            <span className="text-[#37352f]/60 font-medium text-sm">
                              {otherUser?.name?.[0] || '?'}
                            </span>
                          </div>
                        )}
                        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                          match.status === 'matched' ? 'bg-[#0f7b6c]' :
                          match.status === 'half_approved' ? 'bg-[#f7c94b]' : 'bg-[#e3e2de]'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[#37352f] truncate">
                          {otherUser?.name || 'Anonymous'}
                        </p>
                        <p className="text-sm text-[#37352f]/50 truncate">
                          {otherAgent?.summary?.slice(0, 50) || 'No summary'}...
                        </p>
                      </div>
                      <svg className="w-5 h-5 text-[#37352f]/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Upcoming Meetings */}
          <div className="bg-[#f7f6f3] rounded-xl p-6 border border-[#e3e2de]">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-semibold text-[#37352f]">{t('dashboard.upcomingMeetings.title')}</h2>
              <Link href={`/${locale}/meetings`} className="text-sm text-[#0077cc] hover:underline">
                {t('dashboard.upcomingMeetings.viewAll')} →
              </Link>
            </div>

            {!meetings || meetings.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#e3e2de] flex items-center justify-center">
                  <svg className="w-6 h-6 text-[#37352f]/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-[#37352f]/60 mb-1">{t('dashboard.upcomingMeetings.empty')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {meetings.map((meeting) => {
                  const otherUser = meeting.user_a_id === user.id ? meeting.user_b : meeting.user_a;
                  const meetingDate = new Date(meeting.scheduled_at);
                  return (
                    <Link
                      key={meeting.id}
                      href={`/${locale}/meetings/${meeting.id}`}
                      className="flex items-center gap-4 p-4 bg-white rounded-lg border border-[#e3e2de] hover:border-[#0f7b6c]/30 transition-colors"
                    >
                      <div className="w-12 h-12 rounded-lg bg-[#0f7b6c]/10 flex flex-col items-center justify-center">
                        <span className="text-xs text-[#0f7b6c] font-medium uppercase">
                          {meetingDate.toLocaleDateString(locale, { month: 'short' })}
                        </span>
                        <span className="text-lg font-bold text-[#37352f]">
                          {meetingDate.getDate()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[#37352f] truncate">
                          Meeting with {otherUser?.name || 'Anonymous'}
                        </p>
                        <p className="text-sm text-[#37352f]/50">
                          {meetingDate.toLocaleTimeString(locale, {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </p>
                      </div>
                      <svg className="w-5 h-5 text-[#37352f]/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Agent Profiles Section */}
        {hasProfile && isProfileActive && profile?.agent_profiles && profile.agent_profiles.length > 0 && (
          <div className="mt-10">
            <h2 className="text-lg font-semibold text-[#37352f] mb-5">{t('dashboard.aiAgents.title')}</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {profile.agent_profiles.map((agent: { id: string; intent: string; summary: string }) => {
                const colors: Record<string, { bg: string; text: string; badge: string }> = {
                  professional: { bg: 'bg-[#0077cc]/5', text: 'text-[#0077cc]', badge: 'bg-[#0077cc]/10' },
                  dating: { bg: 'bg-[#eb5757]/5', text: 'text-[#eb5757]', badge: 'bg-[#eb5757]/10' },
                  friendship: { bg: 'bg-[#0f7b6c]/5', text: 'text-[#0f7b6c]', badge: 'bg-[#0f7b6c]/10' },
                };
                const color = colors[agent.intent] || colors.friendship;
                return (
                  <div
                    key={agent.id}
                    className={`p-5 rounded-xl border border-[#e3e2de] ${color.bg}`}
                  >
                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium mb-3 ${color.badge} ${color.text}`}>
                      {t(`dashboard.aiAgents.${agent.intent}`)}
                    </span>
                    <p className="text-sm text-[#37352f]/70 line-clamp-3">
                      {agent.summary}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
