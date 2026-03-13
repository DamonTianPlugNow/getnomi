import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function MatchesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch all matches
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

  // Group matches by status
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
    const theirApproved = isUserA ? match.user_b_approved : match.user_a_approved;

    if (match.status === 'matched') {
      return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">Matched</span>;
    }
    if (match.status === 'half_approved') {
      if (myApproved) {
        return <span className="px-2 py-1 text-xs rounded-full bg-amber-100 text-amber-700">Waiting for response</span>;
      } else {
        return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">Waiting for you</span>;
      }
    }
    if (match.status === 'pending') {
      return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">New match</span>;
    }
    if (match.status === 'rejected') {
      return <span className="px-2 py-1 text-xs rounded-full bg-slate-100 text-slate-500">Declined</span>;
    }
    if (match.status === 'expired') {
      return <span className="px-2 py-1 text-xs rounded-full bg-slate-100 text-slate-500">Expired</span>;
    }
    return null;
  };

  const getIntentEmoji = (intent: string) => {
    switch (intent) {
      case 'professional': return '💼';
      case 'dating': return '💕';
      case 'friendship': return '🤝';
      default: return '✨';
    }
  };

  const MatchCard = ({ match }: { match: typeof matches extends (infer T)[] | null ? T : never }) => {
    const isUserA = match.user_a_id === user.id;
    const otherUser = isUserA ? match.user_b : match.user_a;
    const otherAgent = isUserA ? match.agent_b : match.agent_a;
    const hasMeeting = match.meeting && match.meeting.length > 0;

    return (
      <Link
        href={`/matches/${match.id}`}
        className="block bg-white rounded-xl border border-slate-200 p-4 hover:border-blue-300 hover:shadow-sm transition"
      >
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
            {otherUser?.avatar_url ? (
              <img
                src={otherUser.avatar_url}
                alt={otherUser.name || ''}
                className="w-14 h-14 rounded-full object-cover"
              />
            ) : (
              <span className="text-xl font-medium text-slate-500">
                {otherUser?.name?.[0] || '?'}
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-slate-900 truncate">
                {otherUser?.name || 'Unknown'}
              </h3>
              <span className="text-lg" title={match.intent}>
                {getIntentEmoji(match.intent)}
              </span>
            </div>

            <p className="text-sm text-slate-600 line-clamp-2 mb-2">
              {otherAgent?.summary}
            </p>

            <div className="flex items-center gap-2">
              {getStatusBadge(match)}
              {hasMeeting && (
                <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-700">
                  Meeting scheduled
                </span>
              )}
              <span className="text-xs text-slate-400">
                {Math.round(match.match_score * 100)}% match
              </span>
            </div>
          </div>

          <svg
            className="w-5 h-5 text-slate-400 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="text-2xl font-bold text-slate-900">
            Nomi
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/matches" className="text-blue-600 font-medium">
              Matches
            </Link>
            <Link href="/meetings" className="text-slate-600 hover:text-slate-900 transition">
              Meetings
            </Link>
            <Link href="/profile" className="text-slate-600 hover:text-slate-900 transition">
              Profile
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Your Matches</h1>
            <p className="text-slate-600">
              {matches?.length || 0} total matches
            </p>
          </div>
        </div>

        {/* Pending Matches */}
        {pendingMatches.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              Pending ({pendingMatches.length})
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
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              Confirmed ({confirmedMatches.length})
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
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
              Past ({pastMatches.length})
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
          <div className="text-center py-16">
            <svg
              className="w-16 h-16 mx-auto mb-4 text-slate-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <h3 className="text-lg font-medium text-slate-900 mb-2">No matches yet</h3>
            <p className="text-slate-600 mb-4">
              We&apos;re working on finding your perfect matches. Check back soon!
            </p>
            <Link
              href="/profile"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Update your profile
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
