import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function MeetingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch all meetings
  const { data: meetings } = await supabase
    .from('meetings')
    .select(`
      *,
      user_a:users!user_a_id(id, name, avatar_url, email),
      user_b:users!user_b_id(id, name, avatar_url, email),
      match:matches(id, intent, match_reasons)
    `)
    .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
    .order('scheduled_at', { ascending: true });

  // Check if user has given feedback for each meeting
  const { data: feedbacks } = await supabase
    .from('feedback')
    .select('meeting_id')
    .eq('user_id', user.id);

  const feedbackMeetingIds = new Set(feedbacks?.map((f) => f.meeting_id) || []);

  // Group meetings
  const now = new Date();
  const upcomingMeetings = meetings?.filter(
    (m) => m.status === 'scheduled' && new Date(m.scheduled_at) > now
  ) || [];
  const pastMeetings = meetings?.filter(
    (m) => m.status !== 'scheduled' || new Date(m.scheduled_at) <= now
  ) || [];

  const getStatusBadge = (meeting: typeof meetings extends (infer T)[] | null ? T : never) => {
    if (meeting.status === 'completed') {
      return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">Completed</span>;
    }
    if (meeting.status === 'no_show') {
      return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700">No Show</span>;
    }
    if (meeting.status === 'cancelled') {
      return <span className="px-2 py-1 text-xs rounded-full bg-slate-100 text-slate-500">Cancelled</span>;
    }
    if (new Date(meeting.scheduled_at) <= now) {
      return <span className="px-2 py-1 text-xs rounded-full bg-amber-100 text-amber-700">Awaiting Feedback</span>;
    }
    return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">Upcoming</span>;
  };

  const formatMeetingTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const isToday = date.toDateString() === now.toDateString();
    const isTomorrow = date.toDateString() === new Date(now.getTime() + 86400000).toDateString();

    if (isToday) {
      return `Today at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (isTomorrow) {
      return `Tomorrow at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    }
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTimeUntil = (dateStr: string) => {
    const date = new Date(dateStr);
    const diffMs = date.getTime() - now.getTime();
    const diffMins = Math.round(diffMs / (1000 * 60));
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `in ${diffMins} minutes`;
    if (diffHours < 24) return `in ${diffHours} hours`;
    return `in ${diffDays} days`;
  };

  const MeetingCard = ({
    meeting,
    isPast = false,
  }: {
    meeting: typeof meetings extends (infer T)[] | null ? T : never;
    isPast?: boolean;
  }) => {
    const isUserA = meeting.user_a_id === user.id;
    const otherUser = isUserA ? meeting.user_b : meeting.user_a;
    const hasFeedback = feedbackMeetingIds.has(meeting.id);
    const needsFeedback = isPast && !hasFeedback && meeting.status !== 'cancelled';

    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4">
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
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-slate-900 truncate">
                {otherUser?.name || 'Unknown'}
              </h3>
              {getStatusBadge(meeting)}
            </div>

            <p className="text-sm text-slate-600 mb-2">
              {formatMeetingTime(meeting.scheduled_at)}
              {!isPast && (
                <span className="text-slate-400"> · {getTimeUntil(meeting.scheduled_at)}</span>
              )}
            </p>

            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-1 bg-slate-100 rounded-full text-slate-600">
                {meeting.platform === 'zoom' ? '📹 Zoom' :
                 meeting.platform === 'feishu' ? '📹 Feishu' :
                 meeting.platform === 'google_meet' ? '📹 Google Meet' :
                 meeting.platform}
              </span>
              <span className="text-xs text-slate-400">{meeting.duration_minutes} min</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {!isPast && (
              <a
                href={meeting.meeting_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition text-center"
              >
                Join
              </a>
            )}
            {needsFeedback && (
              <Link
                href={`/meetings/${meeting.id}/feedback`}
                className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition text-center"
              >
                Give Feedback
              </Link>
            )}
            {isPast && hasFeedback && (
              <span className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm text-center">
                ✓ Feedback given
              </span>
            )}
          </div>
        </div>

        {/* Meeting Brief Preview */}
        {meeting.brief && !isPast && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Meeting Brief</p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500 mb-1">Common Topics</p>
                <div className="flex flex-wrap gap-1">
                  {meeting.brief.common_topics?.slice(0, 3).map((topic: string, i: number) => (
                    <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-slate-500 mb-1">Ice Breaker</p>
                <p className="text-slate-700 text-xs italic">
                  &ldquo;{meeting.brief.ice_breakers?.[0]}&rdquo;
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="text-2xl font-bold text-slate-900">
            A2A
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/matches" className="text-slate-600 hover:text-slate-900 transition">
              Matches
            </Link>
            <Link href="/meetings" className="text-blue-600 font-medium">
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
            <h1 className="text-2xl font-bold text-slate-900">Your Meetings</h1>
            <p className="text-slate-600">
              {meetings?.length || 0} total meetings
            </p>
          </div>
        </div>

        {/* Upcoming Meetings */}
        {upcomingMeetings.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              Upcoming ({upcomingMeetings.length})
            </h2>
            <div className="space-y-3">
              {upcomingMeetings.map((meeting) => (
                <MeetingCard key={meeting.id} meeting={meeting} />
              ))}
            </div>
          </section>
        )}

        {/* Past Meetings */}
        {pastMeetings.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
              Past ({pastMeetings.length})
            </h2>
            <div className="space-y-3">
              {pastMeetings.map((meeting) => (
                <MeetingCard key={meeting.id} meeting={meeting} isPast />
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {(!meetings || meetings.length === 0) && (
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
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <h3 className="text-lg font-medium text-slate-900 mb-2">No meetings yet</h3>
            <p className="text-slate-600 mb-4">
              When you confirm a match, a meeting will be automatically scheduled.
            </p>
            <Link
              href="/matches"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              View your matches
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
