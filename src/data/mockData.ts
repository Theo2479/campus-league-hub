// Mock data for the Intramural Football League

export interface Notification {
  id: string;
  type: 'urgent' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

export interface Game {
  id: string;
  homeTeam: string;
  awayTeam: string;
  date: Date;
  time: string;
  venue: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  homeScore?: number;
  awayScore?: number;
  refereeId?: string;
}

export interface TimeSlot {
  id: string;
  date: Date;
  time: string;
  status: 'available' | 'signed-up' | 'full';
  signedUpCount: number;
  maxCapacity: number;
}

export interface PostponementRequest {
  id: string;
  gameId: string;
  teamName: string;
  reason: string;
  requestedDate: Date;
  status: 'pending' | 'approved' | 'denied';
  submittedAt: Date;
}

export interface FriendlyPost {
  id: string;
  teamName: string;
  date: Date;
  time: string;
  venue: string;
  contactName: string;
  postedAt: Date;
}

// Mock Notifications
export const mockNotifications: Notification[] = [
  {
    id: 'n1',
    type: 'urgent',
    title: 'Field Closure Alert',
    message: 'North Field is closed due to maintenance. All games rescheduled to South Field.',
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    read: false,
  },
  {
    id: 'n2',
    type: 'urgent',
    title: 'Referee Shortage',
    message: 'We need 2 more referees for Saturday evening games. Please sign up if available.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    read: false,
  },
  {
    id: 'n3',
    type: 'info',
    title: 'New Schedule Released',
    message: 'Week 8 fixtures have been published. Check your upcoming games.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
    read: true,
  },
  {
    id: 'n4',
    type: 'success',
    title: 'Game Assignment Confirmed',
    message: 'You have been assigned to referee Eagles vs Hawks on Saturday.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48),
    read: true,
  },
  {
    id: 'n5',
    type: 'info',
    title: 'League Standing Update',
    message: 'Current standings have been updated after last week\'s matches.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 72),
    read: true,
  },
];

// Mock Games for Referee
export const mockRefereeGames: Game[] = [
  {
    id: 'g1',
    homeTeam: 'Engineering Eagles',
    awayTeam: 'Business Hawks',
    date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2),
    time: '14:00',
    venue: 'Main Stadium - Field A',
    status: 'scheduled',
    refereeId: 'ref-1',
  },
  {
    id: 'g2',
    homeTeam: 'Law Lions',
    awayTeam: 'Medical Wolves',
    date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5),
    time: '16:00',
    venue: 'South Field',
    status: 'scheduled',
    refereeId: 'ref-1',
  },
  {
    id: 'g3',
    homeTeam: 'Arts Panthers',
    awayTeam: 'Science Tigers',
    date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
    time: '10:00',
    venue: 'North Field',
    status: 'scheduled',
    refereeId: 'ref-1',
  },
];

// Mock Games for Team Captain
export const mockCaptainGames: Game[] = [
  {
    id: 'cg1',
    homeTeam: 'Engineering Eagles',
    awayTeam: 'Business Hawks',
    date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
    time: '14:00',
    venue: 'Main Stadium - Field A',
    status: 'scheduled',
  },
  {
    id: 'cg2',
    homeTeam: 'Law Lions',
    awayTeam: 'Engineering Eagles',
    date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10),
    time: '16:00',
    venue: 'South Field',
    status: 'scheduled',
  },
  {
    id: 'cg3',
    homeTeam: 'Engineering Eagles',
    awayTeam: 'Medical Wolves',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
    time: '10:00',
    venue: 'North Field',
    status: 'completed',
    homeScore: 3,
    awayScore: 1,
  },
  {
    id: 'cg4',
    homeTeam: 'Arts Panthers',
    awayTeam: 'Engineering Eagles',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10),
    time: '14:00',
    venue: 'Main Stadium',
    status: 'completed',
    homeScore: 2,
    awayScore: 2,
  },
];

// Generate weekly time slots for referee availability
export const generateWeeklySlots = (): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  const today = new Date();
  const times = ['09:00', '11:00', '14:00', '16:00', '18:00'];
  
  for (let day = 0; day < 7; day++) {
    const date = new Date(today);
    date.setDate(today.getDate() + day);
    
    times.forEach((time, idx) => {
      const random = Math.random();
      let status: 'available' | 'signed-up' | 'full';
      let signedUpCount: number;
      
      if (random < 0.2) {
        status = 'signed-up';
        signedUpCount = 1;
      } else if (random < 0.35) {
        status = 'full';
        signedUpCount = 3;
      } else {
        status = 'available';
        signedUpCount = Math.floor(Math.random() * 2);
      }
      
      slots.push({
        id: `slot-${day}-${idx}`,
        date,
        time,
        status,
        signedUpCount,
        maxCapacity: 3,
      });
    });
  }
  
  return slots;
};

// Mock Postponement Requests for Admin
export const mockPostponementRequests: PostponementRequest[] = [
  {
    id: 'pr1',
    gameId: 'g1',
    teamName: 'Business Hawks',
    reason: 'Multiple players have exams scheduled during the match time.',
    requestedDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
    status: 'pending',
    submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 12),
  },
  {
    id: 'pr2',
    gameId: 'g2',
    teamName: 'Medical Wolves',
    reason: 'Team bus transportation issue - waiting for replacement.',
    requestedDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
    status: 'pending',
    submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
  },
  {
    id: 'pr3',
    gameId: 'g3',
    teamName: 'Arts Panthers',
    reason: 'Venue conflict with university event.',
    requestedDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5),
    status: 'pending',
    submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
  },
];

// Mock Friendly Posts
export const mockFriendlyPosts: FriendlyPost[] = [
  {
    id: 'fp1',
    teamName: 'Science Tigers',
    date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 4),
    time: '15:00',
    venue: 'Open - Flexible',
    contactName: 'Alex Thompson',
    postedAt: new Date(Date.now() - 1000 * 60 * 60 * 3),
  },
  {
    id: 'fp2',
    teamName: 'Philosophy Foxes',
    date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 6),
    time: '11:00',
    venue: 'West Practice Field',
    contactName: 'Maria Santos',
    postedAt: new Date(Date.now() - 1000 * 60 * 60 * 8),
  },
];

// Referee Stats
export const mockRefereeStats = {
  gamesReffed: 12,
  reliabilityScore: 100,
  avgRating: 4.8,
  totalEarnings: '$240',
};

// Team Stats for Captain
export const mockTeamStats = {
  teamName: 'Engineering Eagles',
  position: 2,
  played: 8,
  won: 5,
  drawn: 2,
  lost: 1,
  goalsFor: 18,
  goalsAgainst: 9,
  points: 17,
};
