export interface TeamMember {
  id: number;
  team_id: number;
  user_id: number;
  role: 'captain' | 'member';
  status: 'active' | 'removed' | 'left';
  joined_at: string;
  name: string;
  email: string;
  profile_picture: string | null;
}

export interface Team {
  id: number;
  competition_id: number;
  name: string;
  logo: string | null;
  description: string | null;
  captain_id: number;
  captain_name: string;
  max_members: number;
  required_skills: string | null;
  looking_for_members: number;
  looking_for_role: string | null;
  status: 'active' | 'disbanded';
  member_count: number;
  members?: TeamMember[];
  competition_name?: string;
  category?: string;
  created_at: string;
  updated_at: string;
}

export type RequestStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';

export interface TeamJoinRequest {
  id: number;
  team_id: number;
  user_id: number;
  message: string | null;
  status: RequestStatus;
  created_at: string;
  updated_at: string;
  name?: string;
  email?: string;
  profile_picture?: string | null;
}

export interface TeamInvitation {
  id: number;
  team_id: number;
  user_id: number;
  invited_by: number;
  status: RequestStatus;
  created_at: string;
  updated_at: string;
  team_name?: string;
  competition_id?: number;
}

export interface LookingForTeamPost {
  id: number;
  competition_id: number;
  user_id: number;
  role: string;
  skills: string | null;
  experience: 'Beginner' | 'Intermediate' | 'Advanced' | null;
  description: string | null;
  status: 'open' | 'closed';
  user_name: string;
  profile_picture: string | null;
  competition_name: string;
  category: string;
  created_at: string;
  updated_at: string;
}
