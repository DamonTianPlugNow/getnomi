import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

export default async function MatchesPage({
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

  const { data: matches } = await supabase
    .from('matches')
    .select(`
      *,
      user_a:users!user_a_id(id, name, avatar_url),
      user_b:users!user_b_id(id, name, avatar_url),
      agent_a:agent_profiles!agent_a_id(summary, talking_points),
      agent_b:agent_profiles!agent_b_id(summary, talking_points),
      meeting:meetings(id, status, scheduled_at)
    `)
    .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
    .order('created_at', { ascending: false });

  const pendingMatches = matches?.filter((m) =>
    ['pending', 'half_approved'].includes(m.status)
  ) || [];
  const confirmedMatches = matches?.filter((m) => m.status === 'matched') || [];
  const pastMatches = matches?.filter((m) =>
    ['rejected', 'expired'].includes(m.status)
  ) || [];

  const getStatusBadge = (match: typeof matches extends (infer T)[] | null ? T : never) => {
    const isUserA = match.user_a_id === user.id;
    const myApproved = isUserA ? match.user_a_approved : match.user_b_approved;

    if (match.status === 'matched') {
      return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-[#0f7b6c]/10 text-[#0f7b6c]">{t('matches.status.matched')}</span>;
    }
    if (match.status === 'half_approved') {
      if (myApproved) {
        return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-[#f7c94b]/20 text-[#9a6700]">{t('matches.status.waiting')}</span>;
      } else {
        return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-[#0077cc]/10 text-[#0077cc]">{t('matches.status.actionNeeded')}</span>;
      }
    }
    if (match.status === 'pending') {
      return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-[#0077cc]/10 text-[#0077cc]">{t('matches.status.new')}</span>;
    }
    if (match.status === 'rejected') {
      return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-[#37352f]/5 text-[#37352f]/50">{t('matches.status.declined')}</span>;
    }
    if (match.status === 'expired') {
      return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-[#37352f]/5 text-[#37352f]/50">{t('matches.status.expired')}</span>;
    }
    return null;
  };

  const getIntentBadge = (intent: string) => {
    const config: Record<string, { emoji: string; bg: string; text: string }> = {
      professional: { emoji: '💼', bg: 'bg-[#0077cc]/10', text: 'text-[#0077cc]' },
      dating: { emoji: '💕', bg: 'bg-[#eb5757]/10', text: 'text-[#eb5757]' },
      friendship: { emoji: '🤝', bg: 'bg-[#0f7b6c]/10', text: 'text-[#0f7b6c]' },
    };
    const c = config[intent] || config.friendship;
    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded ${c.bg} ${c.text}`}>
        {c.emoji} {t(`profile.intents.${intent}`)}
      </span>
    );
  };

  const MatchCard = ({ match }: { match: typeof matches extends (infer T)[] | null ? T : never }) => {
    const isUserA = match.user_a_id === user.id;
    const otherUser = isUserA ? match.user_b : match.user_a;
    const otherAgent = isUserA ? match.agent_b : match.agent_a;
    const hasMeeting = match.meeting && match.meeting.length > 0;

    return (
      <Link
        href={`/${locale}/matches/${match.id}`}
        className="block p-5 bg-white rounded-xl border border-[#e3e2de] hover:border-[#0077cc]/30 hover:shadow-sm transition-all"
      >
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            {otherUser?.avatar_url ? (
              <img
                src={otherUser.avatar_url}
                alt=""
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-[#f7f6f3] flex items-center justify-center">
                <span className="text-[#37352f]/60 font-medium text-lg">
                  {otherUser?.name?.[0] || '?'}
                </span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-[#37352f] truncate">
                {otherUser?.name || 'Anonymous'}
              </h3>
              {getStatusBadge(match)}
            </div>
            <p className="text-sm text-[#37352f]/60 line-clamp-2 mb-2">
              {otherAgent?.summary || 'No summary available'}
            </p>
            <div className="flex items-center gap-2">
              {getIntentBadge(match.intent)}
              {hasMeeting && (
                <span className="px-2 py-0.5 text-xs font-medium rounded bg-[#0f7b6c]/10 text-[#0f7b6c]">
                  📅 {t('matches.status.meetingScheduled')}
                </span>
              )}
            </div>
          </div>
          <svg className="w-5 h-5 text-[#37352f]/30 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-[#f7f6f3] text-[#37352f]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-[#e3e2de]">
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
            <Link href={`/${locale}/meetings`} className="px-4 py-2 text-sm font-medium text-[#37352f]/60 hover:text-[#37352f] hover:bg-[#f7f6f3] rounded-md transition-colors">
              {t('nav.meetings')}
            </Link>
            <Link href={`/${locale}/profile`} className="px-4 py-2 text-sm font-medium text-[#37352f]/60 hover:text-[#37352f] hover:bg-[#f7f6f3] rounded-md transition-colors">
              {t('nav.profile')}
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold text-[#37352f] mb-8">{t('matches.title')}</h1>

        {/* Pending Matches */}
        {pendingMatches.length > 0 && (
          <section className="mb-10">
            <h2 className="text-sm font-semibold text-[#37352f]/50 uppercase tracking-wide mb-4">
              {t('matches.tabs.pending')} ({pendingMatches.length})
            </h2>
            <div className="space-y-3">
              {pendingMatches.map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          </section>
        )}

        {/* Confirmed Matches */}
        {confirmedMatches.length > 0 && (
          <section className="mb-10">
            <h2 className="text-sm font-semibold text-[#37352f]/50 uppercase tracking-wide mb-4">
              {t('matches.tabs.confirmed')} ({confirmedMatches.length})
            </h2>
            <div className="space-y-3">
              {confirmedMatches.map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          </section>
        )}

        {/* Past Matches */}
        {pastMatches.length > 0 && (
          <section className="mb-10">
            <h2 className="text-sm font-semibold text-[#37352f]/50 uppercase tracking-wide mb-4">
              {t('matches.tabs.past')} ({pastMatches.length})
            </h2>
            <div className="space-y-3">
              {pastMatches.map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {(!matches || matches.length === 0) && (
          <div className="text-center py-16 bg-white rounded-xl border border-[#e3e2de]">
            <div className="w-16 h-16 mx-auto mb-4 bg-[#f7f6f3] rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-[#37352f]/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-[#37352f] mb-2">{t('matches.empty')}</h3>
            <p className="text-[#37352f]/60 mb-6 max-w-sm mx-auto">
              {t('matches.emptyDescription')}
            </p>
            <Link
              href={`/${locale}/profile`}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0077cc] hover:bg-[#0066b3] text-white font-medium rounded-md transition-colors"
            >
              {t('matches.updateProfile')}
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
