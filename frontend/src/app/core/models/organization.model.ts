export interface Organization {
  id: number;
  name: string;
  description: string | null;
  logo: string | null;
  college: string | null;
  verified: number;
  created_by: number;
  created_by_name?: string;
  competitions_count?: number;
  created_at: string;
  updated_at: string;
}
