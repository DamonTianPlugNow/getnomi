import { inngest } from '../client';
import { createAdminClient } from '@/lib/supabase/server';
import { generateMeetingBrief } from '@/lib/ai/claude';
import { createZoomMeeting } from '@/lib/zoom';
import { sendEmail } from '@/lib/email';

/**
 * Create meeting when both parties confirm a match
 */
export const createMeeting = inngest.createFunction(
  {
    id: 'create-meeting',
    retries: 3,
  },
  { event: 'match/confirmed' },
  async ({ event, step }) => {
    const { matchId, userAId, userBId } = event.data;

    // Step 1: Fetch match and time slots
    const matchData = await step.run('fetch-match-data', async () => {
      const supabase = createAdminClient();

      const { data: match, error: matchError } = await supabase
        .from('matches')
        .select(`
          *,
          agent_a:agent_profiles!agent_a_id(*),
          agent_b:agent_profiles!agent_b_id(*),
          user_a:users!user_a_id(*),
          user_b:users!user_b_id(*)
        `)
        .eq('id', matchId)
        .single();

      if (matchError) throw new Error(`Failed to fetch match: ${matchError.message}`);

      const { data: timeSlots } = await supabase
        .from('time_slots')
        .select('*')
        .eq('match_id', matchId);

      return { match, timeSlots };
    });

    const { match, timeSlots } = matchData;

    // Step 2: Find common available time
    const scheduledTime = await step.run('find-common-time', async () => {
      if (!timeSlots || timeSlots.length < 2) {
        // Default to 48 hours from now if no time slots
        const defaultTime = new Date();
        defaultTime.setHours(defaultTime.getHours() + 48);
        return defaultTime.toISOString();
      }

      const userASlots = timeSlots.find((s) => s.user_id === userAId)?.available_times || [];
      const userBSlots = timeSlots.find((s) => s.user_id === userBId)?.available_times || [];

      // Find intersection
      const commonTimes = userASlots.filter((t: string) =>
        userBSlots.some((bt: string) => new Date(t).getTime() === new Date(bt).getTime())
      );

      if (commonTimes.length > 0) {
        // Return earliest common time
        return commonTimes.sort()[0];
      }

      // No common time, use first available from user A
      if (userASlots.length > 0) {
        return userASlots.sort()[0];
      }

      // Fallback
      const defaultTime = new Date();
      defaultTime.setHours(defaultTime.getHours() + 48);
      return defaultTime.toISOString();
    });

    // Step 3: Create Zoom meeting
    const zoomMeeting = await step.run('create-zoom-meeting', async () => {
      const meetingTime = new Date(scheduledTime);
      return createZoomMeeting({
        topic: `A2A Meeting: ${match.user_a.name} & ${match.user_b.name}`,
        startTime: meetingTime,
        duration: 30,
        timezone: 'UTC',
      });
    });

    // Step 4: Generate meeting brief
    const brief = await step.run('generate-brief', async () => {
      return generateMeetingBrief(
        {
          name: match.user_a.name || 'User A',
          summary: match.agent_a.summary,
          talking_points: match.agent_a.talking_points,
        },
        {
          name: match.user_b.name || 'User B',
          summary: match.agent_b.summary,
          talking_points: match.agent_b.talking_points,
        },
        match.intent,
        match.match_reasons
      );
    });

    // Step 5: Save meeting to database
    const meeting = await step.run('save-meeting', async () => {
      const supabase = createAdminClient();

      const { data, error } = await supabase
        .from('meetings')
        .insert({
          match_id: matchId,
          user_a_id: userAId,
          user_b_id: userBId,
          platform: 'zoom',
          meeting_url: zoomMeeting.join_url,
          meeting_id_external: zoomMeeting.id.toString(),
          scheduled_at: scheduledTime,
          duration_minutes: 30,
          timezone: 'UTC',
          brief,
          status: 'scheduled',
        })
        .select()
        .single();

      if (error) throw new Error(`Failed to save meeting: ${error.message}`);
      return data;
    });

    // Step 6: Send notification emails
    await step.run('send-notifications', async () => {
      const meetingTime = new Date(scheduledTime);
      const formattedTime = meetingTime.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
      });

      // Email to User A
      await sendEmail({
        to: match.user_a.email,
        subject: `Your A2A meeting with ${match.user_b.name} is scheduled!`,
        html: `
          <h2>Meeting Confirmed! 🎉</h2>
          <p>Great news! Your meeting with <strong>${match.user_b.name}</strong> has been scheduled.</p>

          <h3>Meeting Details</h3>
          <ul>
            <li><strong>When:</strong> ${formattedTime}</li>
            <li><strong>Duration:</strong> 30 minutes</li>
            <li><strong>Platform:</strong> Zoom</li>
          </ul>

          <p><a href="${zoomMeeting.join_url}" style="background: #0066FF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Join Meeting</a></p>

          <h3>About ${match.user_b.name}</h3>
          <p>${brief.user_b_summary}</p>

          <h3>Suggested Topics</h3>
          <ul>
            ${brief.suggested_agenda.map((topic) => `<li>${topic}</li>`).join('')}
          </ul>

          <h3>Ice Breakers</h3>
          <ul>
            ${brief.ice_breakers.map((ib) => `<li>${ib}</li>`).join('')}
          </ul>

          <p>Good luck with your meeting!</p>
        `,
      });

      // Email to User B
      await sendEmail({
        to: match.user_b.email,
        subject: `Your A2A meeting with ${match.user_a.name} is scheduled!`,
        html: `
          <h2>Meeting Confirmed! 🎉</h2>
          <p>Great news! Your meeting with <strong>${match.user_a.name}</strong> has been scheduled.</p>

          <h3>Meeting Details</h3>
          <ul>
            <li><strong>When:</strong> ${formattedTime}</li>
            <li><strong>Duration:</strong> 30 minutes</li>
            <li><strong>Platform:</strong> Zoom</li>
          </ul>

          <p><a href="${zoomMeeting.join_url}" style="background: #0066FF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Join Meeting</a></p>

          <h3>About ${match.user_a.name}</h3>
          <p>${brief.user_a_summary}</p>

          <h3>Suggested Topics</h3>
          <ul>
            ${brief.suggested_agenda.map((topic) => `<li>${topic}</li>`).join('')}
          </ul>

          <h3>Ice Breakers</h3>
          <ul>
            ${brief.ice_breakers.map((ib) => `<li>${ib}</li>`).join('')}
          </ul>

          <p>Good luck with your meeting!</p>
        `,
      });
    });

    // Step 7: Schedule reminder
    await step.sendEvent('schedule-reminder', {
      name: 'meeting/reminder',
      data: { meetingId: meeting.id },
    });

    return {
      message: 'Meeting created successfully',
      meetingId: meeting.id,
      scheduledAt: scheduledTime,
      zoomUrl: zoomMeeting.join_url,
    };
  }
);

/**
 * Send meeting reminder 5 minutes before
 */
export const sendMeetingReminder = inngest.createFunction(
  {
    id: 'send-meeting-reminder',
    retries: 2,
  },
  { event: 'meeting/reminder' },
  async ({ event, step }) => {
    const { meetingId } = event.data;

    // Fetch meeting details
    const meeting = await step.run('fetch-meeting', async () => {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('meetings')
        .select(`
          *,
          user_a:users!user_a_id(*),
          user_b:users!user_b_id(*)
        `)
        .eq('id', meetingId)
        .single();

      if (error) throw new Error(`Failed to fetch meeting: ${error.message}`);
      return data;
    });

    if (meeting.status !== 'scheduled') {
      return { message: 'Meeting not scheduled, skipping reminder' };
    }

    // Wait until 5 minutes before meeting
    const meetingTime = new Date(meeting.scheduled_at);
    const reminderTime = new Date(meetingTime.getTime() - 5 * 60 * 1000);
    const now = new Date();

    if (reminderTime > now) {
      await step.sleepUntil('wait-for-reminder-time', reminderTime);
    }

    // Send reminder emails
    await step.run('send-reminders', async () => {
      await sendEmail({
        to: meeting.user_a.email,
        subject: `Reminder: Your meeting starts in 5 minutes!`,
        html: `
          <h2>Meeting Starting Soon! ⏰</h2>
          <p>Your meeting with <strong>${meeting.user_b.name}</strong> starts in 5 minutes.</p>
          <p><a href="${meeting.meeting_url}" style="background: #0066FF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Join Now</a></p>
        `,
      });

      await sendEmail({
        to: meeting.user_b.email,
        subject: `Reminder: Your meeting starts in 5 minutes!`,
        html: `
          <h2>Meeting Starting Soon! ⏰</h2>
          <p>Your meeting with <strong>${meeting.user_a.name}</strong> starts in 5 minutes.</p>
          <p><a href="${meeting.meeting_url}" style="background: #0066FF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Join Now</a></p>
        `,
      });
    });

    return { message: 'Reminders sent' };
  }
);
