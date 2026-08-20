export type UserRole = 'participant' | 'organizer' | 'admin';

export interface User {
  id: number;
  name: string;
  email: string;
  profilePicture: string | null;
  role: UserRole;
  college: string | null;
  rollNumber: string | null;
  branch: string | null;
  status: 'active' | 'suspended';
  createdAt: string;
}
