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
  const firstName = user.user_metadata?.name?.split(' ')[0] || 'there';

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white relative overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-white/[0.02] to-transparent rounded-full" />
      </div>

      {/* Grain Overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Header */}
      <header className="relative z-10 border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 py-5 flex justify-between items-center">
          <Link href="/dashboard" className="group flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/25">
              <span className="text-white font-bold text-lg">N</span>
            </div>
            <span className="text-xl font-semibold tracking-tight text-white/90 group-hover:text-white transition-colors">
              Nomi
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            {[
              { href: '/matches', label: 'Matches' },
              { href: '/meetings', label: 'Meetings' },
              { href: '/profile', label: 'Profile' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-4 py-2 text-sm text-white/50 hover:text-white hover:bg-white/[0.05] rounded-lg transition-all duration-200"
              >
                {item.label}
              </Link>
            ))}
            <div className="w-px h-6 bg-white/10 mx-2" />
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="px-4 py-2 text-sm text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-200"
              >
                Sign out
              </button>
            </form>
          </nav>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <div className="mb-16">
          <p className="text-white/40 text-sm font-medium tracking-widest uppercase mb-3">
            Welcome back
          </p>
          <h1 className="text-5xl md:text-6xl font-serif font-light tracking-tight text-white mb-4">
            {firstName}
            <span className="text-white/20">.</span>
          </h1>
          <p className="text-lg text-white/40 max-w-xl">
            Your AI agents are working to find meaningful connections for you.
          </p>
        </div>

        {/* Status Cards */}
        {!hasProfile && (
          <div className="relative mb-12 p-8 rounded-2xl overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 backdrop-blur-xl" />
            <div className="absolute inset-0 border border-white/10 rounded-2xl" />
            <div className="absolute inset-0 bg-gradient-to-r from-violet-500/0 via-violet-500/5 to-violet-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            <div className="relative">
              <h2 className="text-2xl font-serif text-white mb-2">Complete your profile</h2>
              <p className="text-white/50 mb-6 max-w-lg">
                Create your memory profile to start matching with people who share your goals and values.
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
        )}

        {hasProfile && !isProfileActive && (
          <div className="relative mb-12 p-8 rounded-2xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-600/10 to-orange-600/10 backdrop-blur-xl" />
            <div className="absolute inset-0 border border-amber-500/20 rounded-2xl" />
            <div className="relative flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
              </div>
              <div>
                <h2 className="text-xl font-medium text-amber-200">Generating your AI agent...</h2>
                <p className="text-amber-200/60 text-sm">
                  We&apos;re creating your personalized agent profile. This usually takes a minute.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        {hasProfile && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
            {[
              { value: profile?.agent_profiles?.length || 0, label: 'Active Agents', color: 'violet', href: '/profile' },
              { value: matches?.length || 0, label: 'Pending Matches', color: 'blue', href: '/matches' },
              { value: meetings?.length || 0, label: 'Upcoming Meetings', color: 'emerald', href: '/meetings' },
              { value: profile?.intents?.length || 0, label: 'Relationship Types', color: 'fuchsia', href: '/profile' },
            ].map((stat, i) => (
              <Link
                key={i}
                href={stat.href}
                className="group relative p-6 rounded-2xl overflow-hidden cursor-pointer"
              >
                <div className="absolute inset-0 bg-white/[0.03] backdrop-blur-sm" />
                <div className="absolute inset-0 border border-white/[0.06] rounded-2xl group-hover:border-white/[0.12] transition-colors duration-300" />
                <div className={`absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-${stat.color}-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                <div className="relative">
                  <p className="text-4xl md:text-5xl font-light text-white mb-1 tracking-tight">
                    {stat.value}
                  </p>
                  <p className="text-sm text-white/40 group-hover:text-white/60 transition-colors">{stat.label}</p>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Matches */}
          <div className="relative rounded-2xl overflow-hidden">
            <div className="absolute inset-0 bg-white/[0.02] backdrop-blur-sm" />
            <div className="absolute inset-0 border border-white/[0.06] rounded-2xl" />
            <div className="relative p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-medium text-white/90">Recent Matches</h2>
                <Link
                  href="/matches"
                  className="text-sm text-white/40 hover:text-white transition-colors"
                >
                  View all →
                </Link>
              </div>

              {!matches || matches.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/[0.03] flex items-center justify-center">
                    <svg className="w-8 h-8 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <p className="text-white/40 mb-1">No matches yet</p>
                  <p className="text-sm text-white/20">We&apos;re looking for your perfect matches!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {matches.map((match) => {
                    const otherUser = match.user_a_id === user.id ? match.user_b : match.user_a;
                    const otherAgent = match.user_a_id === user.id ? match.agent_b : match.agent_a;
                    return (
                      <Link
                        key={match.id}
                        href={`/matches/${match.id}`}
                        className="group flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-transparent hover:border-white/[0.08] transition-all duration-200"
                      >
                        <div className="relative">
                          {otherUser?.avatar_url ? (
                            <img
                              src={otherUser.avatar_url}
                              alt=""
                              className="w-12 h-12 rounded-full object-cover ring-2 ring-white/10"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center ring-2 ring-white/10">
                              <span className="text-white/60 font-medium">
                                {otherUser?.name?.[0] || '?'}
                              </span>
                            </div>
                          )}
                          <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#0a0a0f] ${
                            match.status === 'matched' ? 'bg-emerald-500' :
                            match.status === 'half_approved' ? 'bg-amber-500' : 'bg-white/30'
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white/90 truncate">
                            {otherUser?.name || 'Anonymous'}
                          </p>
                          <p className="text-sm text-white/40 truncate">
                            {otherAgent?.summary?.slice(0, 60) || 'No summary'}...
                          </p>
                        </div>
                        <svg className="w-5 h-5 text-white/20 group-hover:text-white/40 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Upcoming Meetings */}
          <div className="relative rounded-2xl overflow-hidden">
            <div className="absolute inset-0 bg-white/[0.02] backdrop-blur-sm" />
            <div className="absolute inset-0 border border-white/[0.06] rounded-2xl" />
            <div className="relative p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-medium text-white/90">Upcoming Meetings</h2>
                <Link
                  href="/meetings"
                  className="text-sm text-white/40 hover:text-white transition-colors"
                >
                  View all →
                </Link>
              </div>

              {!meetings || meetings.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/[0.03] flex items-center justify-center">
                    <svg className="w-8 h-8 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-white/40 mb-1">No upcoming meetings</p>
                  <p className="text-sm text-white/20">Confirm a match to schedule a meeting</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {meetings.map((meeting) => {
                    const otherUser = meeting.user_a_id === user.id ? meeting.user_b : meeting.user_a;
                    const meetingDate = new Date(meeting.scheduled_at);
                    return (
                      <Link
                        key={meeting.id}
                        href={`/meetings/${meeting.id}`}
                        className="group flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-transparent hover:border-white/[0.08] transition-all duration-200"
                      >
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex flex-col items-center justify-center border border-emerald-500/20">
                          <span className="text-xs text-emerald-400/80 uppercase font-medium">
                            {meetingDate.toLocaleDateString('en-US', { month: 'short' })}
                          </span>
                          <span className="text-xl font-light text-white">
                            {meetingDate.getDate()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white/90 truncate">
                            Meeting with {otherUser?.name || 'Anonymous'}
                          </p>
                          <p className="text-sm text-white/40">
                            {meetingDate.toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </p>
                        </div>
                        <svg className="w-5 h-5 text-white/20 group-hover:text-white/40 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Agent Profiles Section */}
        {hasProfile && isProfileActive && profile?.agent_profiles && profile.agent_profiles.length > 0 && (
          <div className="mt-12">
            <h2 className="text-lg font-medium text-white/90 mb-6">Your AI Agents</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {profile.agent_profiles.map((agent: { id: string; intent: string; summary: string }) => (
                <div
                  key={agent.id}
                  className="group relative p-6 rounded-2xl overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] to-white/[0.01] backdrop-blur-sm" />
                  <div className="absolute inset-0 border border-white/[0.06] rounded-2xl group-hover:border-white/[0.12] transition-colors duration-300" />
                  <div className="relative">
                    <div className={`inline-flex px-3 py-1 rounded-full text-xs font-medium mb-4 ${
                      agent.intent === 'professional' ? 'bg-blue-500/20 text-blue-300' :
                      agent.intent === 'dating' ? 'bg-pink-500/20 text-pink-300' :
                      'bg-emerald-500/20 text-emerald-300'
                    }`}>
                      {agent.intent === 'professional' ? '💼 Professional' :
                       agent.intent === 'dating' ? '💕 Dating' : '🤝 Friendship'}
                    </div>
                    <p className="text-sm text-white/60 line-clamp-3">
                      {agent.summary}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
