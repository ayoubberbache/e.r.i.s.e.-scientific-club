export interface ClubMember {
  id: number;
  full_name: string;
  email: string;
  phone?: string;
  department: string;
  departments?: string[];
  sub_department?: string;
  skills?: string;
  academic_year?: string;
  motivation?: string;
  status: 'approved' | 'pending' | 'rejected';
  created_at?: string;
  
  // 50% Baseline HR Engine fields
  baseline_rating: number; // strictly 50%
  overall_rating: number;  // calculated current rating (0-100%)
  tasks_completed: number;
  attendance_present: number;
  attendance_absent: number;
  manual_adjustment: number;
  rating_tier: 'Exceptional' | 'Solid Standing' | 'Baseline' | 'Needs Improvement';
  evaluation_notes?: string;
  last_evaluated_at?: string;
}

export type ActivityType = 
  | 'member_registered' 
  | 'event_signup' 
  | 'project_created' 
  | 'task_completed';

export interface RealtimeActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: string;
  department?: string;
  metadata?: Record<string, any>;
}

export interface DepartmentTask {
  id: string;
  department: 'Projects' | 'Organization' | 'Media';
  title: string;
  description?: string;
  assigned_member_ids: number[];
  assigned_member_names: string[];
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  completed_at?: string;
  hr_points_awarded?: boolean;
}

export interface AttendanceLog {
  id: number;
  member_id: number;
  member_name?: string;
  event_id: number;
  event_title: string;
  session_date: string;
  status: 'Present' | 'Absent';
  absence_reason?: string;
  created_at: string;
}

export interface AppraisalInput {
  member_id: number;
  punctuality: number;    // -10 to +10
  teamwork: number;       // -10 to +10
  initiative: number;     // -10 to +10
  quality_of_work: number;// -10 to +10
  notes: string;
}

export interface EventItem {
  id: number;
  title: string;
  title_ar?: string;
  description?: string;
  date?: string;
  time?: string;
  location?: string;
  registration_type?: 'individual' | 'team';
  registration_deadline?: string;
  status?: string;
}

export interface EventRegistrationMember {
  id: number;
  registration_id: number;
  is_leader: boolean;
  full_name: string;
  email: string;
  phone?: string;
}

export interface EventRegistration {
  id: number;
  event_id: number;
  event_title?: string;
  registration_type: string;
  team_name?: string | null;
  institution: string;
  study_year: string;
  has_companion: boolean;
  companion_name?: string | null;
  companion_role?: string | null;
  status: string;
  registered_at: string;
  members: EventRegistrationMember[];
}

declare global {
  interface Window {
    electronAPI?: {
      minimize: () => void;
      maximize: () => void;
      close: () => void;
      notify: (title: string, body: string) => void;
      platform: string;
    };
  }
}
