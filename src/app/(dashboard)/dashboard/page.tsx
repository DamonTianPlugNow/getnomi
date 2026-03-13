import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
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

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="text-2xl font-bold text-slate-900">
            A2A
          </Link>
          <nav className="flex items-center gap-6">
            <Link
              href="/matches"
              className="text-slate-600 hover:text-slate-900 transition"
            >
              Matches
            </Link>
            <Link
              href="/meetings"
              className="text-slate-600 hover:text-slate-900 transition"
            >
              Meetings
            </Link>
            <Link
              href="/profile"
              className="text-slate-600 hover:text-slate-900 transition"
            >
              Profile
            </Link>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="text-slate-500 hover:text-slate-700 text-sm"
              >
                Sign out
              </button>
            </form>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            Welcome back{user.user_metadata?.name ? `, ${user.user_metadata.name.split(' ')[0]}` : ''}!
          </h1>
          <p className="text-slate-600 mt-1">
            Here&apos;s what&apos;s happening with your matches.
          </p>
        </div>

        {/* Profile Status Card */}
        {!hasProfile && (
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-6 mb-8 text-white">
            <h2 className="text-xl font-semibold mb-2">Complete your profile</h2>
            <p className="text-blue-100 mb-4">
              Create your memory profile to start matching with people who share your
              goals and values.
            </p>
            <Link
              href="/onboarding"
              className="inline-block px-6 py-2 bg-white text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition"
            >
              Get Started
            </Link>
          </div>
        )}

        {hasProfile && !isProfileActive && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-8">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-amber-600"></div>
              <div>
                <h2 className="text-lg font-semibold text-amber-900">
                  Generating your AI agent...
                </h2>
                <p className="text-amber-700 text-sm">
                  We&apos;re creating your personalized agent profile. This usually takes a minute.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8">
          {/* Recent Matches */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Recent Matches
              </h2>
              <Link
                href="/matches"
                className="text-blue-600 text-sm hover:text-blue-700"
              >
                View all
              </Link>
            </div>

            {!matches || matches.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <svg
                  className="w-12 h-12 mx-auto mb-3 text-slate-300"
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
                <p>No matches yet</p>
                <p className="text-sm text-slate-400 mt-1">
                  {hasProfile
                    ? 'We\'re looking for your perfect matches!'
                    : 'Complete your profile to start matching'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {matches.map((match) => {
                  const isUserA = match.user_a_id === user.id;
                  const otherUser = isUserA ? match.user_b : match.user_a;
                  const otherAgent = isUserA ? match.agent_b : match.agent_a;

                  return (
                    <Link
                      key={match.id}
                      href={`/matches/${match.id}`}
                      className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition"
                    >
                      <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center">
                        {otherUser?.avatar_url ? (
                          <img
                            src={otherUser.avatar_url}
                            alt={otherUser.name || ''}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-lg font-medium text-slate-500">
                            {otherUser?.name?.[0] || '?'}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">
                          {otherUser?.name || 'Unknown'}
                        </p>
                        <p className="text-sm text-slate-500 truncate">
                          {otherAgent?.summary?.slice(0, 60)}...
                        </p>
                      </div>
                      <div>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            match.status === 'matched'
                              ? 'bg-green-100 text-green-700'
                              : match.status === 'half_approved'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {match.status === 'matched'
                            ? 'Matched!'
                            : match.status === 'half_approved'
                            ? 'Waiting'
                            : 'New'}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Upcoming Meetings */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Upcoming Meetings
              </h2>
              <Link
                href="/meetings"
                className="text-blue-600 text-sm hover:text-blue-700"
              >
                View all
              </Link>
            </div>

            {!meetings || meetings.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <svg
                  className="w-12 h-12 mx-auto mb-3 text-slate-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <p>No upcoming meetings</p>
                <p className="text-sm text-slate-400 mt-1">
                  Confirm a match to schedule a meeting
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {meetings.map((meeting) => {
                  const isUserA = meeting.user_a_id === user.id;
                  const otherUser = isUserA ? meeting.user_b : meeting.user_a;
                  const meetingDate = new Date(meeting.scheduled_at);

                  return (
                    <div
                      key={meeting.id}
                      className="flex items-center gap-4 p-3 rounded-xl bg-slate-50"
                    >
                      <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                        <svg
                          className="w-6 h-6 text-blue-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900">
                          Meeting with {otherUser?.name}
                        </p>
                        <p className="text-sm text-slate-500">
                          {meetingDate.toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <a
                        href={meeting.meeting_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
                      >
                        Join
                      </a>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        {hasProfile && (
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <p className="text-2xl font-bold text-slate-900">
                {profile?.agent_profiles?.length || 0}
              </p>
              <p className="text-sm text-slate-500">Active Agents</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <p className="text-2xl font-bold text-slate-900">
                {matches?.length || 0}
              </p>
              <p className="text-sm text-slate-500">Pending Matches</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <p className="text-2xl font-bold text-slate-900">
                {meetings?.length || 0}
              </p>
              <p className="text-sm text-slate-500">Upcoming Meetings</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <p className="text-2xl font-bold text-slate-900">
                {profile?.intents?.length || 0}
              </p>
              <p className="text-sm text-slate-500">Relationship Types</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
