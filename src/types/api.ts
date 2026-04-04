/**
 * Shared API response types used across the application.
 * Import from here instead of defining local interfaces in each page/component.
 */

export interface Fixture {
  id: number;
  home_team: string;
  away_team: string;
  home_team_id: number;
  away_team_id: number;
  date: string;
  time: string;
  venue: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
  home_pens: number | null;
  away_pens: number | null;
  referee?: string | null;
  ref_id?: number | null;
  has_referee?: boolean;
  tournament_id?: number | null;
  round_name?: string | null;
  is_home?: boolean;
  result?: 'win' | 'loss' | 'draw';
  postponement_status?: string;
}

export interface TeamStats {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  points: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
}

export interface TeamData {
  id: number;
  name: string;
  division_name?: string;
  league_name?: string;
  stats: TeamStats;
}

export interface StandingsRow {
  position: number;
  id: number;
  name: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  points: number;
  is_my_team?: boolean;
}

export interface LeaderboardTeam {
  id: number;
  name: string;
  stats: TeamStats;
}
