export type Department = 'Projects' | 'Organization' | 'Media';

export type UserRole = 'admin' | 'head_projects' | 'head_organization' | 'head_media';

export interface DepartmentHeadUser {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  roleTitle: string;
  department: Department | 'All';
  email: string;
  avatar?: string;
}

export interface DepartmentMember {
  id: number | string;
  full_name: string;
  email: string;
  phone: string;
  study_year: number | string;
  specialization?: string;
  departments: string[];
  role: string;
  status: 'approved' | 'pending' | 'rejected' | string;
  registered_at?: string;
  joined_at?: string;
  avatar?: string;
  notes?: string;
  rating?: number; // General Overall Percentage (Baseline 50%)
}

export interface EventStaffAssignment {
  id: string;
  event_id: number;
  event_title: string;
  department: Department;
  member_id: number | string;
  member_name: string;
  member_email: string;
  member_phone: string;
  assigned_role: string;
  assigned_at: string;
  status: 'Assigned' | 'Confirmed' | 'Completed';
  notes?: string;
}

export interface ProjectMemberAssignment {
  member_id: number | string;
  member_name: string;
  email?: string;
  phone?: string;
  role_in_project: string;
  assigned_at: string;
  notes?: string;
}

export interface ClubProject {
  id: string | number;
  title: string;
  description: string;
  department?: string;
  category?: string;
  status: 'Active' | 'Finished' | 'Discarded' | 'Planning' | 'In Development' | 'Completed' | 'On Hold' | string;
  progress?: number;
  leader_member_id?: number | string;
  leader_name?: string;
  team_member_ids?: (string | number)[];
  member_custom_roles?: Record<string, string>;
  start_date?: string;
  target_date?: string;
  goals?: string[];
  team_members: ProjectMemberAssignment[];
  created_at: string;
  updated_at: string;
}
