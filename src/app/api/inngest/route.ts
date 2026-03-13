import { serve } from 'inngest/next';
import { inngest } from '@/inngest/client';
import {
  generateAgentProfiles,
  findMatches,
  dailyMatching,
  checkMatchExpiry,
  createMeeting,
  sendMeetingReminder,
} from '@/inngest/functions';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    generateAgentProfiles,
    findMatches,
    dailyMatching,
    checkMatchExpiry,
    createMeeting,
    sendMeetingReminder,
  ],
});
