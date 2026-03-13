import { Inngest, EventSchemas } from 'inngest';

// Define event types
type Events = {
  // Profile events
  'profile/created': {
    data: {
      userId: string;
      memoryProfileId: string;
    };
  };
  'profile/updated': {
    data: {
      userId: string;
      memoryProfileId: string;
    };
  };

  // Matching events
  'matching/trigger': {
    data: {
      userId: string;
      memoryProfileId: string;
    };
  };
  'match/created': {
    data: {
      matchId: string;
      userAId: string;
      userBId: string;
      intent: 'professional' | 'dating' | 'friendship';
    };
  };
  'match/confirmed': {
    data: {
      matchId: string;
      userAId: string;
      userBId: string;
    };
  };
  'match/check-expiry': {
    data: Record<string, never>;
  };

  // Meeting events
  'meeting/created': {
    data: {
      meetingId: string;
      matchId: string;
      userAId: string;
      userBId: string;
    };
  };
  'meeting/reminder': {
    data: {
      meetingId: string;
    };
  };

  // Scheduled events
  'scheduled/daily-matching': {
    data: Record<string, never>;
  };
  'scheduled/check-meeting-links': {
    data: Record<string, never>;
  };
};

// Create Inngest client
export const inngest = new Inngest({
  id: 'a2a-platform',
  schemas: new EventSchemas().fromRecord<Events>(),
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

export type MatchingTriggerEvent = {
  name: 'matching/trigger';
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
  | MatchingTriggerEvent
  | MatchCreatedEvent
  | MatchConfirmedEvent
  | MeetingCreatedEvent;
