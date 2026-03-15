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

  const { data: feedbacks } = await supabase
    .from('feedback')
    .select('meeting_id')
    .eq('user_id', user.id);

  const feedbackMeetingIds = new Set(feedbacks?.map((f) => f.meeting_id) || []);

  const now = new Date();
  const upcomingMeetings = meetings?.filter(
    (m) => m.status === 'scheduled' && new Date(m.scheduled_at) > now
  ) || [];
  const pastMeetings = meetings?.filter(
    (m) => m.status !== 'scheduled' || new Date(m.scheduled_at) <= now
  ) || [];

  const getStatusBadge = (meeting: typeof meetings extends (infer T)[] | null ? T : never) => {
    if (meeting.status === 'completed') {
      return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-[#0f7b6c]/10 text-[#0f7b6c]">Completed</span>;
    }
    if (meeting.status === 'no_show') {
      return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-[#eb5757]/10 text-[#eb5757]">No Show</span>;
    }
    if (meeting.status === 'cancelled') {
      return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-[#37352f]/5 text-[#37352f]/50">Cancelled</span>;
    }
    if (new Date(meeting.scheduled_at) <= now) {
      return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-[#f7c94b]/20 text-[#9a6700]">Needs feedback</span>;
    }
    return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-[#0077cc]/10 text-[#0077cc]">Upcoming</span>;
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

  const getIntentBadge = (intent: string) => {
    const config: Record<string, { emoji: string; bg: string; text: string }> = {
      professional: { emoji: '💼', bg: 'bg-[#0077cc]/10', text: 'text-[#0077cc]' },
      dating: { emoji: '💕', bg: 'bg-[#eb5757]/10', text: 'text-[#eb5757]' },
      friendship: { emoji: '🤝', bg: 'bg-[#0f7b6c]/10', text: 'text-[#0f7b6c]' },
    };
    const c = config[intent] || config.friendship;
    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded ${c.bg} ${c.text}`}>
        {c.emoji} {intent}
      </span>
    );
  };

  const MeetingCard = ({ meeting, showFeedback = false }: {
    meeting: typeof meetings extends (infer T)[] | null ? T : never;
    showFeedback?: boolean;
  }) => {
    const isUserA = meeting.user_a_id === user.id;
    const otherUser = isUserA ? meeting.user_b : meeting.user_a;
    const needsFeedback = showFeedback && !feedbackMeetingIds.has(meeting.id) && new Date(meeting.scheduled_at) <= now;

    return (
      <div className="p-5 bg-white rounded-xl border border-[#e3e2de] hover:border-[#0077cc]/30 hover:shadow-sm transition-all">
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
              <h3 className="font-semibold text-[#37352f]">
                {otherUser?.name || 'Anonymous'}
              </h3>
              {getStatusBadge(meeting)}
            </div>
            <p className="text-sm text-[#37352f]/60 mb-2">
              {formatMeetingTime(meeting.scheduled_at)}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              {meeting.match?.intent && getIntentBadge(meeting.match.intent)}
              {meeting.platform && (
                <span className="px-2 py-0.5 text-xs font-medium rounded bg-[#37352f]/5 text-[#37352f]/60">
                  📹 {meeting.platform}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {meeting.meeting_url && new Date(meeting.scheduled_at) > now && (
              <a
                href={meeting.meeting_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-[#0077cc] hover:bg-[#0066b3] text-white text-sm font-medium rounded-md transition-colors"
              >
                Join
              </a>
            )}
            {needsFeedback && (
              <Link
                href={`/meetings/${meeting.id}/feedback`}
                className="px-4 py-2 bg-[#f7c94b] hover:bg-[#e5b93e] text-[#37352f] text-sm font-medium rounded-md transition-colors"
              >
                Give feedback
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f7f6f3] text-[#37352f]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-[#e3e2de]">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-[#37352f] flex items-center justify-center">
              <span className="text-white font-bold text-sm">N</span>
            </div>
            <span className="text-xl font-semibold text-[#37352f]">Nomi</span>
          </Link>

          <nav className="flex items-center gap-1">
            <Link href="/dashboard" className="px-4 py-2 text-sm font-medium text-[#37352f]/60 hover:text-[#37352f] hover:bg-[#f7f6f3] rounded-md transition-colors">
              Dashboard
            </Link>
            <Link href="/matches" className="px-4 py-2 text-sm font-medium text-[#37352f]/60 hover:text-[#37352f] hover:bg-[#f7f6f3] rounded-md transition-colors">
              Matches
            </Link>
            <Link href="/profile" className="px-4 py-2 text-sm font-medium text-[#37352f]/60 hover:text-[#37352f] hover:bg-[#f7f6f3] rounded-md transition-colors">
              Profile
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#37352f] mb-2">Meetings</h1>
          <p className="text-[#37352f]/60">Your scheduled and past meetings</p>
        </div>

        {/* Upcoming Meetings */}
        {upcomingMeetings.length > 0 && (
          <section className="mb-10">
            <h2 className="text-sm font-semibold text-[#37352f]/50 uppercase tracking-wide mb-4">
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
          <section className="mb-10">
            <h2 className="text-sm font-semibold text-[#37352f]/50 uppercase tracking-wide mb-4">
              Past ({pastMeetings.length})
            </h2>
            <div className="space-y-3">
              {pastMeetings.map((meeting) => (
                <MeetingCard key={meeting.id} meeting={meeting} showFeedback />
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {(!meetings || meetings.length === 0) && (
          <div className="text-center py-16 bg-white rounded-xl border border-[#e3e2de]">
            <div className="w-16 h-16 mx-auto mb-4 bg-[#f7f6f3] rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-[#37352f]/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-[#37352f] mb-2">No meetings yet</h3>
            <p className="text-[#37352f]/60 mb-6 max-w-sm mx-auto">
              When you confirm a match, a meeting will be automatically scheduled.
            </p>
            <Link
              href="/matches"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0077cc] hover:bg-[#0066b3] text-white font-medium rounded-md transition-colors"
            >
              View your matches
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
