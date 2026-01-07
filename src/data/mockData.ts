// Mock data for the Intramural Football League

export interface Notification {
  id: string;
  type: 'urgent' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

export interface Team {
  id: string;
  name: string;
  captainName: string;
  divisionId?: string;
}

export interface Division {
  id: string;
  name: string;
  leagueId: string;
  teams: string[]; // team IDs
}

export interface League {
  id: string;
  name: string;
  day: 'Wednesday' | 'Saturday' | 'Sunday';
  divisions: Division[];
  defaultTime: string;
  defaultVenue: string;
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
  leagueId?: string;
  divisionId?: string;
  matchweek?: number;
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

// Mock Teams
export const mockTeams: Team[] = [
  { id: 't1', name: 'Engineering Eagles', captainName: 'John Smith' },
  { id: 't2', name: 'Business Hawks', captainName: 'Sarah Johnson' },
  { id: 't3', name: 'Law Lions', captainName: 'Mike Davis' },
  { id: 't4', name: 'Medical Wolves', captainName: 'Emily Chen' },
  { id: 't5', name: 'Arts Panthers', captainName: 'Alex Thompson' },
  { id: 't6', name: 'Science Tigers', captainName: 'Maria Santos' },
  { id: 't7', name: 'Philosophy Foxes', captainName: 'James Wilson' },
  { id: 't8', name: 'History Hounds', captainName: 'Rachel Green' },
  { id: 't9', name: 'Computing Cobras', captainName: 'David Lee' },
  { id: 't10', name: 'Economics Eagles', captainName: 'Lisa Brown' },
  { id: 't11', name: 'Politics Panthers', captainName: 'Tom Harris' },
  { id: 't12', name: 'Chemistry Cheetahs', captainName: 'Anna White' },
  { id: 't13', name: 'Biology Bears', captainName: 'Chris Martin' },
  { id: 't14', name: 'Physics Phoenixes', captainName: 'Kate Miller' },
  { id: 't15', name: 'Maths Monarchs', captainName: 'Ryan Taylor' },
  { id: 't16', name: 'English Eagles', captainName: 'Sophie Adams' },
];

// Mock Leagues with Divisions
export const mockLeagues: League[] = [
  {
    id: 'wed-league',
    name: 'Wednesday League',
    day: 'Wednesday',
    defaultTime: '18:00',
    defaultVenue: 'Main Stadium - Field A',
    divisions: [
      {
        id: 'wed-div1',
        name: 'Division 1',
        leagueId: 'wed-league',
        teams: ['t1', 't2', 't3', 't4', 't5', 't6'],
      },
    ],
  },
  {
    id: 'sat-league',
    name: 'Saturday League',
    day: 'Saturday',
    defaultTime: '14:00',
    defaultVenue: 'South Field',
    divisions: [
      {
        id: 'sat-div1',
        name: 'Division 1',
        leagueId: 'sat-league',
        teams: ['t7', 't8', 't9', 't10'],
      },
      {
        id: 'sat-div2',
        name: 'Division 2',
        leagueId: 'sat-league',
        teams: ['t11', 't12', 't13', 't14'],
      },
    ],
  },
  {
    id: 'sun-league',
    name: 'Sunday League',
    day: 'Sunday',
    defaultTime: '11:00',
    defaultVenue: 'North Field',
    divisions: [
      {
        id: 'sun-div1',
        name: 'Division 1',
        leagueId: 'sun-league',
        teams: ['t1', 't7'],
      },
      {
        id: 'sun-div2',
        name: 'Division 2',
        leagueId: 'sun-league',
        teams: ['t2', 't8'],
      },
      {
        id: 'sun-div3',
        name: 'Division 3',
        leagueId: 'sun-league',
        teams: ['t3', 't9'],
      },
    ],
  },
];

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
    leagueId: 'wed-league',
    divisionId: 'wed-div1',
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
    leagueId: 'wed-league',
    divisionId: 'wed-div1',
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
    leagueId: 'wed-league',
    divisionId: 'wed-div1',
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
    leagueId: 'wed-league',
    divisionId: 'wed-div1',
  },
  {
    id: 'cg2',
    homeTeam: 'Law Lions',
    awayTeam: 'Engineering Eagles',
    date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10),
    time: '16:00',
    venue: 'South Field',
    status: 'scheduled',
    leagueId: 'wed-league',
    divisionId: 'wed-div1',
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
    leagueId: 'wed-league',
    divisionId: 'wed-div1',
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
    leagueId: 'wed-league',
    divisionId: 'wed-div1',
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

// Venues
export const mockVenues = [
  'Main Stadium - Field A',
  'Main Stadium - Field B',
  'South Field',
  'North Field',
  'West Practice Field',
  'Indoor Arena',
];

// Helper function to generate round-robin fixtures
export const generateRoundRobinFixtures = (
  teamIds: string[],
  leagueId: string,
  divisionId: string,
  startDate: Date,
  defaultTime: string,
  defaultVenue: string,
  dayOfWeek: number // 0=Sunday, 3=Wednesday, 6=Saturday
): Game[] => {
  const teams = [...teamIds];
  const games: Game[] = [];
  
  // Add bye if odd number of teams
  if (teams.length % 2 !== 0) {
    teams.push('BYE');
  }
  
  const numTeams = teams.length;
  const numRounds = numTeams - 1;
  const matchesPerRound = numTeams / 2;
  
  // Get team names from IDs
  const getTeamName = (id: string) => {
    if (id === 'BYE') return 'BYE';
    return mockTeams.find(t => t.id === id)?.name || id;
  };
  
  // Calculate the first game date (next occurrence of the day)
  const getNextDayOfWeek = (date: Date, targetDay: number): Date => {
    const result = new Date(date);
    const currentDay = result.getDay();
    const daysUntilTarget = (targetDay - currentDay + 7) % 7;
    result.setDate(result.getDate() + (daysUntilTarget === 0 ? 7 : daysUntilTarget));
    return result;
  };
  
  let gameDate = getNextDayOfWeek(startDate, dayOfWeek);
  
  for (let round = 0; round < numRounds; round++) {
    for (let match = 0; match < matchesPerRound; match++) {
      const home = teams[match];
      const away = teams[numTeams - 1 - match];
      
      // Skip bye matches
      if (home === 'BYE' || away === 'BYE') continue;
      
      games.push({
        id: `gen-${leagueId}-${divisionId}-r${round + 1}-m${match + 1}`,
        homeTeam: getTeamName(home),
        awayTeam: getTeamName(away),
        date: new Date(gameDate),
        time: defaultTime,
        venue: defaultVenue,
        status: 'scheduled',
        leagueId,
        divisionId,
        matchweek: round + 1,
      });
    }
    
    // Rotate teams (keep first team fixed)
    const lastTeam = teams.pop()!;
    teams.splice(1, 0, lastTeam);
    
    // Move to next week
    gameDate = new Date(gameDate);
    gameDate.setDate(gameDate.getDate() + 7);
  }
  
  return games;
};
