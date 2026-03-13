import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

/**
 * Check if email service is configured
 */
function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

/**
 * Send an email using Resend
 * Logs to console in development when Resend is not configured
 */
export async function sendEmail(options: SendEmailOptions): Promise<{ id: string }> {
  const { to, subject, html, from = 'Nomi <noreply@getnomi.me>' } = options;

  // Graceful degradation: log email when Resend is not configured
  if (!isEmailConfigured() || !resend) {
    console.warn('[Email] Resend API key not configured - logging email instead');
    console.log('─'.repeat(60));
    console.log(`📧 Email (not sent)`);
    console.log(`   To: ${to}`);
    console.log(`   From: ${from}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Body: ${html.replace(/<[^>]*>/g, ' ').substring(0, 200)}...`);
    console.log('─'.repeat(60));
    return { id: `mock-${Date.now()}` };
  }

  try {
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
    });

    if (error) {
      console.error('Failed to send email:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    return { id: data?.id || '' };
  } catch (err) {
    console.error('Email send error:', err);
    throw err;
  }
}

/**
 * Send match notification email
 */
export async function sendMatchNotification(options: {
  to: string;
  userName: string;
  matchName: string;
  matchSummary: string;
  matchReasons: string[];
  matchUrl: string;
}): Promise<void> {
  const { to, userName, matchName, matchSummary, matchReasons, matchUrl } = options;

  await sendEmail({
    to,
    subject: `New match found: ${matchName}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">Hi ${userName}! 👋</h2>

        <p style="color: #4a4a4a; font-size: 16px;">
          Great news! We found a potential match for you.
        </p>

        <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin: 20px 0;">
          <h3 style="color: #1a1a1a; margin-top: 0;">${matchName}</h3>
          <p style="color: #4a4a4a;">${matchSummary}</p>

          <h4 style="color: #1a1a1a; margin-bottom: 8px;">Why we matched you:</h4>
          <ul style="color: #4a4a4a; padding-left: 20px;">
            ${matchReasons.map((reason) => `<li>${reason}</li>`).join('')}
          </ul>
        </div>

        <p style="text-align: center; margin: 30px 0;">
          <a href="${matchUrl}" style="background: #0066FF; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
            View Match
          </a>
        </p>

        <p style="color: #888; font-size: 14px;">
          This match will expire in 48 hours. Don't miss out!
        </p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />

        <p style="color: #888; font-size: 12px;">
          You're receiving this because you have an active profile on Nomi.
        </p>
      </div>
    `,
  });
}

/**
 * Send meeting reminder email
 */
export async function sendMeetingReminderEmail(options: {
  to: string;
  userName: string;
  otherUserName: string;
  meetingTime: Date;
  meetingUrl: string;
  briefSummary: string;
}): Promise<void> {
  const { to, userName, otherUserName, meetingTime, meetingUrl, briefSummary } = options;

  const formattedTime = meetingTime.toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  await sendEmail({
    to,
    subject: `Reminder: Meeting with ${otherUserName} in 5 minutes`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">Hi ${userName}! ⏰</h2>

        <p style="color: #4a4a4a; font-size: 16px;">
          Your meeting with <strong>${otherUserName}</strong> starts in 5 minutes!
        </p>

        <div style="background: #f0f7ff; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #0066FF;">
          <p style="margin: 0; color: #1a1a1a;"><strong>When:</strong> ${formattedTime}</p>
        </div>

        <p style="text-align: center; margin: 30px 0;">
          <a href="${meetingUrl}" style="background: #0066FF; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
            Join Meeting Now
          </a>
        </p>

        <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin: 20px 0;">
          <h4 style="color: #1a1a1a; margin-top: 0;">Quick Refresher on ${otherUserName}:</h4>
          <p style="color: #4a4a4a;">${briefSummary}</p>
        </div>

        <p style="color: #888; font-size: 14px;">
          Good luck with your meeting! 🍀
        </p>
      </div>
    `,
  });
}
