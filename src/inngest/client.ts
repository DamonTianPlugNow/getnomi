import { Inngest } from 'inngest';

// Create Inngest client
export const inngest = new Inngest({
  id: 'a2a-platform',
  schemas: new Map([
    // Profile events
    ['profile/created', {
      data: {
        userId: '',
        memoryProfileId: '',
      },
    }],
    ['profile/updated', {
      data: {
        userId: '',
        memoryProfileId: '',
      },
    }],

    // Match events
    ['match/created', {
      data: {
        matchId: '',
        userAId: '',
        userBId: '',
        intent: '' as 'professional' | 'dating' | 'friendship',
      },
    }],
    ['match/confirmed', {
      data: {
        matchId: '',
        userAId: '',
        userBId: '',
      },
    }],
    ['match/check-expiry', {
      data: {},
    }],

    // Meeting events
    ['meeting/created', {
      data: {
        meetingId: '',
        matchId: '',
        userAId: '',
        userBId: '',
      },
    }],
    ['meeting/reminder', {
      data: {
        meetingId: '',
      },
    }],

    // Scheduled events
    ['scheduled/daily-matching', {
      data: {},
    }],
    ['scheduled/check-meeting-links', {
      data: {},
    }],
  ]),
});

// Event types for type safety
export type ProfileCreatedEvent = {
  name: 'profile/created';
  data: {
    userId: string;
    memoryProfileId: string;
  };
};

export type ProfileUpdatedEvent = {
  name: 'profile/updated';
  data: {
    userId: string;
    memoryProfileId: string;
  };
};

export type MatchCreatedEvent = {
  name: 'match/created';
  data: {
    matchId: string;
    userAId: string;
    userBId: string;
    intent: 'professional' | 'dating' | 'friendship';
  };
};

export type MatchConfirmedEvent = {
  name: 'match/confirmed';
  data: {
    matchId: string;
    userAId: string;
    userBId: string;
  };
};

export type MeetingCreatedEvent = {
  name: 'meeting/created';
  data: {
    meetingId: string;
    matchId: string;
    userAId: string;
    userBId: string;
  };
};

export type InngestEvent =
  | ProfileCreatedEvent
  | ProfileUpdatedEvent
  | MatchCreatedEvent
  | MatchConfirmedEvent
  | MeetingCreatedEvent;
