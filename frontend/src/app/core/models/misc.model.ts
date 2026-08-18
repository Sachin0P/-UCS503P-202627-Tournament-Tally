export type RegistrationStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface Registration {
  id: number;
  competition_id: number;
  user_id: number;
  team_id: number | null;
  status: RegistrationStatus;
  registrant_name: string;
  registrant_email: string;
  team_name: string | null;
  competition_name: string;
  organization_id: number;
  registered_at: string;
  updated_at: string;
}

export interface Announcement {
  id: number;
  competition_id: number;
  title: string;
  message: string;
  created_by: number;
  created_by_name?: string;
  created_at: string;
}

export type NotificationType =
  | 'registrationApproved' | 'registrationRejected' | 'teamInvitation' | 'teamJoinRequest'
  | 'matchScheduled' | 'matchUpdated' | 'announcement' | 'qualification' | 'result';

export interface AppNotification {
  id: number;
  user_id: number;
  type: NotificationType;
  message: string;
  reference_id: number | null;
  is_read: number;
  created_at: string;
}
