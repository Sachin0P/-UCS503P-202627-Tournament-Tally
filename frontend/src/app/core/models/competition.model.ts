export type CompetitionCategory = 'SPORTS' | 'ACADEMIC' | 'ESPORTS';
export type CompetitionStatus = 'draft' | 'published' | 'ongoing' | 'completed' | 'cancelled';
export type CompetitionFormat =
  | 'knockout' | 'round_robin' | 'league' | 'group_knockout'
  | 'single_elimination' | 'double_elimination' | 'staged';

export interface Competition {
  id: number;
  organization_id: number;
  name: string;
  description: string | null;
  category: CompetitionCategory;
  type: string | null;
  banner: string | null;
  start_date: string;
  end_date: string;
  registration_deadline: string;
  venue: string | null;
  mode: 'online' | 'offline';
  max_participants: number | null;
  max_teams: number | null;
  registration_fee: number;
  rules: string | null;
  format: CompetitionFormat;
  stages_json: string | null;
  status: CompetitionStatus;
  created_by: number;
  organizer_name: string;
  organizer_college: string | null;
  organizer_logo: string | null;
  registrations_count: number;
  teams_count: number;
  created_at: string;
  updated_at: string;
}

export interface CompetitionListFilters {
  category?: CompetitionCategory;
  type?: string;
  college?: string;
  organizationId?: number;
  mode?: 'online' | 'offline';
  dateFrom?: string;
  dateTo?: string;
  q?: string;
  free?: 'true' | 'false';
  registrationOpen?: 'true' | 'false';
  closingSoonDays?: number;
  status?: CompetitionStatus;
  sort?: 'recent' | 'closingSoon' | 'popular';
  mine?: 'true';
  limit?: number;
  offset?: number;
}
