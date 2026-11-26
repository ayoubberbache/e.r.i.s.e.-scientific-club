export type Department = 'Projects' | 'Organization' | 'Media';
export type DepartmentName = Department;

export type UserRole = 'admin' | 'head_projects' | 'head_organization' | 'head_media';

export type TaskStatus = 'pending' | 'in_progress' | 'completed';

export interface DepartmentHeadUser {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  roleTitle: string;
  department: Department | 'All';
  email: string;
  avatar?: string;
  defaultMemberRoles?: string[];
}

export interface DepartmentMember {
  id: number | string;
  full_name: string;
  email: string;
  phone: string;
  study_year: number | string;
  study_year_label?: string;
  specialization?: string;
  departments: string[];
  role: string;
  status: 'approved' | 'pending' | 'rejected' | string;
  registered_at?: string;
  joined_at?: string;
  avatar?: string;
  notes?: string;
  rating?: number;
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
  todo_status?: TaskStatus;
  progress?: number;
  leader_member_id?: number | string;
  leader_name?: string;
  team_member_ids?: (string | number)[];
  member_custom_roles?: Record<string, any>;
  start_date?: string;
  target_date?: string;
  goals?: string[];
  team_members: ProjectMemberAssignment[];
  created_at: string;
  updated_at: string;
}

export interface ClubTask {
  id: string;
  title: string;
  description: string;
  department: Department;
  assigned_member_ids: (number | string)[];
  assigned_members: { id: number | string; name: string }[];
  priority: 'Low' | 'Medium' | 'High';
  deadline?: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  todo_status?: TaskStatus;
  is_evaluated?: boolean;
  evaluation_score?: number;
  evaluation_notes?: string;
  created_at: string;
  completed_at?: string;
}

export interface AttendanceRecord {
  id?: number | string;
  member_id: number;
  event_id: number;
  event_title: string;
  session_date?: string;
  status: 'Present' | 'Absent';
  absence_reason?: string;
  member_name?: string;
  created_at?: string;
}

export type ImagePlacement =
  | 'header_banner'
  | 'hero'
  | 'inline_top'
  | 'inline_left'
  | 'inline_right'
  | 'inline_bottom'
  | 'footer_banner';

export interface EmailBlock {
  id: string;
  type: 'heading' | 'paragraph' | 'image' | 'button' | 'event_card' | 'divider' | 'spacer';
  text?: string;
  level?: 'h1' | 'h2' | 'h3';
  color?: string;
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string;
  align?: 'left' | 'center' | 'right';
  url?: string;
  alt?: string;
  placement?: ImagePlacement;
  width?: string;
  borderRadius?: string;
  title?: string;
  showLocation?: boolean;
  showDateTime?: boolean;
  showNotes?: boolean;
  height?: number;
}

export interface EmailThemeConfig {
  bgColor: string;
  cardBg: string;
  headerBg: string;
  headerText: string;
  accentColor: string;
  textColor: string;
  fontFamily: string;
  buttonBg: string;
  buttonText: string;
}

export interface EmailTemplateRecord {
  id: string;
  name: string;
  slug?: string;
  category:
    | 'workshop'
    | 'bootcamp'
    | 'competition'
    | 'hackathon'
    | 'recruitment_meeting'
    | 'recruitment_acceptance'
    | 'custom';
  subject: string;
  blocks: EmailBlock[];
  theme_config: EmailThemeConfig;
  is_default?: boolean;
  html_preview?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}
