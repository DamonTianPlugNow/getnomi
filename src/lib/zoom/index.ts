/**
 * Zoom API Integration
 * Server-to-Server OAuth for creating meetings
 */

interface ZoomTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface ZoomMeetingResponse {
  id: number;
  join_url: string;
  start_url: string;
  password: string;
  topic: string;
  start_time: string;
  duration: number;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Check if Zoom credentials are configured
 */
function isZoomConfigured(): boolean {
  return !!(
    process.env.ZOOM_ACCOUNT_ID &&
    process.env.ZOOM_CLIENT_ID &&
    process.env.ZOOM_CLIENT_SECRET
  );
}

/**
 * Get Zoom access token using Server-to-Server OAuth
 */
async function getZoomAccessToken(): Promise<string> {
  // Check cache
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60000) {
    return cachedToken.token;
  }

  const accountId = process.env.ZOOM_ACCOUNT_ID!;
  const clientId = process.env.ZOOM_CLIENT_ID!;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET!;

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get Zoom access token: ${error}`);
  }

  const data: ZoomTokenResponse = await response.json();

  // Cache token
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return data.access_token;
}

/**
 * Create a Zoom meeting
 * Returns mock data in development when Zoom is not configured
 */
export async function createZoomMeeting(options: {
  topic: string;
  startTime: Date;
  duration: number;
  timezone?: string;
}): Promise<ZoomMeetingResponse> {
  // Graceful degradation: return mock meeting when Zoom is not configured
  if (!isZoomConfigured()) {
    console.warn('[Zoom] Credentials not configured - returning mock meeting link');
    const mockId = Math.floor(Math.random() * 1000000000);
    return {
      id: mockId,
      join_url: `https://zoom.us/j/${mockId}?pwd=MOCK_MEETING`,
      start_url: `https://zoom.us/s/${mockId}?pwd=MOCK_MEETING`,
      password: 'mock123',
      topic: options.topic,
      start_time: options.startTime.toISOString(),
      duration: options.duration,
    };
  }

  const token = await getZoomAccessToken();

  const response = await fetch('https://api.zoom.us/v2/users/me/meetings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      topic: options.topic,
      type: 2, // Scheduled meeting
      start_time: options.startTime.toISOString(),
      duration: options.duration,
      timezone: options.timezone || 'UTC',
      settings: {
        host_video: true,
        participant_video: true,
        join_before_host: true,
        mute_upon_entry: false,
        waiting_room: false,
        auto_recording: 'none',
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create Zoom meeting: ${error}`);
  }

  return response.json();
}

/**
 * Get meeting details
 * Returns null when Zoom is not configured
 */
export async function getZoomMeeting(meetingId: string): Promise<ZoomMeetingResponse | null> {
  if (!isZoomConfigured()) {
    console.warn('[Zoom] Credentials not configured - cannot fetch meeting');
    return null;
  }

  const token = await getZoomAccessToken();

  const response = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get Zoom meeting: ${error}`);
  }

  return response.json();
}

/**
 * Delete a Zoom meeting
 * No-op when Zoom is not configured
 */
export async function deleteZoomMeeting(meetingId: string): Promise<void> {
  if (!isZoomConfigured()) {
    console.warn('[Zoom] Credentials not configured - skipping delete');
    return;
  }

  const token = await getZoomAccessToken();

  const response = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    const error = await response.text();
    throw new Error(`Failed to delete Zoom meeting: ${error}`);
  }
}

/**
 * Check if a meeting link is still valid
 */
export async function isZoomMeetingValid(meetingId: string): Promise<boolean> {
  try {
    const meeting = await getZoomMeeting(meetingId);
    return meeting !== null;
  } catch {
    return false;
  }
}
