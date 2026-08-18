export type MatchStatus = 'scheduled' | 'live' | 'completed' | 'cancelled' | 'postponed';

export interface Match {
  id: number;
  competition_id: number;
  round: string;
  round_order: number;
  team_a_id: number | null;
  team_b_id: number | null;
  team_a_name: string | null;
  team_b_name: string | null;
  score_a: number | null;
  score_b: number | null;
  winner_id: number | null;
  winner_name: string | null;
  scheduled_at: string | null;
  venue: string | null;
  status: MatchStatus;
  next_match_id: number | null;
  next_match_slot: 'A' | 'B' | null;
  competition_name?: string;
  created_at: string;
  updated_at: string;
}

export interface Standing {
  id: number;
  competition_id: number;
  team_id: number;
  team_name: string;
  team_logo: string | null;
  played: number;
  won: number;
  lost: number;
  draw: number;
  points: number;
  score_difference: number;
  rank: number;
  stats_json: string | null;
  updated_at: string;
}
