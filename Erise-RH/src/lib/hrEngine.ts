import { ClubMember, AttendanceLog, DepartmentTask, AppraisalInput, EventItem, EventRegistration, EventRegistrationMember } from '../types';
import { supabase } from './supabase';

const BASELINE_RATING = 50.0;
const ATTENDANCE_PRESENT_BONUS = 5.0;
const ATTENDANCE_ABSENT_PENALTY = 5.0;
const TASK_COMPLETED_BONUS = 5.0;

export function calculateMemberRating(
  attendancePresentCount: number,
  attendanceAbsentCount: number,
  completedTasksCount: number,
  manualAdjustment: number = 0
): { overallRating: number; tier: ClubMember['rating_tier'] } {
  let score = BASELINE_RATING;

  // Attendance effect
  score += attendancePresentCount * ATTENDANCE_PRESENT_BONUS;
  score -= attendanceAbsentCount * ATTENDANCE_ABSENT_PENALTY;

  // Tasks completed effect
  score += completedTasksCount * TASK_COMPLETED_BONUS;

  // Manual HR adjustment
  score += manualAdjustment;

  // Clamp between 0 and 100
  const overallRating = Math.max(0, Math.min(100, Math.round(score * 10) / 10));

  let tier: ClubMember['rating_tier'] = 'Baseline';
  if (overallRating >= 85) {
    tier = 'Exceptional';
  } else if (overallRating >= 65) {
    tier = 'Solid Standing';
  } else if (overallRating >= 45) {
    tier = 'Baseline';
  } else {
    tier = 'Needs Improvement';
  }

  return { overallRating, tier };
}

/**
 * Fetch all members with computed baseline ratings from registrations and related tables
 */
export async function fetchMembersWithRatings(): Promise<ClubMember[]> {
  try {
    // 1. Fetch registrations
    const { data: registrations, error: regError } = await supabase
      .from('registrations')
      .select('*')
      .order('created_at', { ascending: false });

    if (regError || !registrations) {
      console.warn('Could not fetch registrations directly from Supabase, attempting fallback:', regError);
      return [];
    }

    // 2. Fetch existing ratings records
    const { data: ratingsData } = await supabase
      .from('member_ratings')
      .select('*');

    const ratingsMap = new Map<number, any>();
    (ratingsData || []).forEach(r => ratingsMap.set(r.member_id, r));

    // 3. Fetch attendance logs
    const { data: attendanceData } = await supabase
      .from('attendance_logs')
      .select('*');

    const attendanceByMember = new Map<number, { present: number; absent: number }>();
    (attendanceData || []).forEach((log: any) => {
      const current = attendanceByMember.get(log.member_id) || { present: 0, absent: 0 };
      if (log.status === 'Present') current.present++;
      else if (log.status === 'Absent') current.absent++;
      attendanceByMember.set(log.member_id, current);
    });

    // 4. Fetch local/stored department tasks
    const tasks = getStoredTasks();
    const tasksByMember = new Map<number, number>();
    tasks.forEach(t => {
      if (t.status === 'completed' && Array.isArray(t.assigned_member_ids)) {
        t.assigned_member_ids.forEach(mId => {
          tasksByMember.set(mId, (tasksByMember.get(mId) || 0) + 1);
        });
      }
    });

    // 5. Combine and compute ratings
    return registrations.map((reg: any) => {
      const att = attendanceByMember.get(reg.id) || { present: 0, absent: 0 };
      const tasksCompleted = tasksByMember.get(reg.id) || 0;
      const existingRating = ratingsMap.get(reg.id);

      // Manual adjustment from HR rating or appraisal notes
      const manualAdj = existingRating?.department_head_ratings?.hr_adjustment || 0;

      const { overallRating, tier } = calculateMemberRating(
        att.present,
        att.absent,
        tasksCompleted,
        manualAdj
      );

      return {
        id: reg.id,
        full_name: reg.full_name || `${reg.first_name || ''} ${reg.last_name || ''}`.trim() || 'Club Member',
        email: reg.email || '',
        phone: reg.phone || reg.phone_number || '',
        department: reg.department || 'General',
        sub_department: reg.sub_department || '',
        skills: reg.skills || reg.technical_skills || '',
        academic_year: reg.academic_year || reg.study_level || '',
        motivation: reg.motivation || '',
        status: reg.status || 'approved',
        created_at: reg.created_at,
        baseline_rating: BASELINE_RATING,
        overall_rating: overallRating,
        tasks_completed: tasksCompleted,
        attendance_present: att.present,
        attendance_absent: att.absent,
        manual_adjustment: manualAdj,
        rating_tier: tier,
        evaluation_notes: existingRating?.notes || '',
        last_evaluated_at: existingRating?.last_evaluated_at,
      };
    });
  } catch (err) {
    console.error('Error fetching members with ratings:', err);
    return [];
  }
}

/**
 * Submit an HR appraisal for a member and update member_ratings
 */
export async function submitAppraisal(appraisal: AppraisalInput): Promise<boolean> {
  const totalDelta = appraisal.punctuality + appraisal.teamwork + appraisal.initiative + appraisal.quality_of_work;
  const now = new Date().toISOString();

  try {
    const { data: existing } = await supabase
      .from('member_ratings')
      .select('*')
      .eq('member_id', appraisal.member_id)
      .single();

    if (existing) {
      const updatedHeadRatings = {
        ...(existing.department_head_ratings || {}),
        hr_adjustment: totalDelta,
        criteria: {
          punctuality: appraisal.punctuality,
          teamwork: appraisal.teamwork,
          initiative: appraisal.initiative,
          quality_of_work: appraisal.quality_of_work,
        },
      };

      await supabase
        .from('member_ratings')
        .update({
          department_head_ratings: updatedHeadRatings,
          notes: appraisal.notes,
          last_evaluated_at: now,
        })
        .eq('member_id', appraisal.member_id);
    } else {
      await supabase
        .from('member_ratings')
        .insert({
          member_id: appraisal.member_id,
          overall_rating: BASELINE_RATING + totalDelta,
          department_head_ratings: {
            hr_adjustment: totalDelta,
            criteria: {
              punctuality: appraisal.punctuality,
              teamwork: appraisal.teamwork,
              initiative: appraisal.initiative,
              quality_of_work: appraisal.quality_of_work,
            },
          },
          notes: appraisal.notes,
          last_evaluated_at: now,
        });
    }

    return true;
  } catch (err) {
    console.error('Failed to submit appraisal:', err);
    return false;
  }
}

/**
 * Update member admission status (approved / rejected)
 */
export async function updateMemberStatus(id: number, status: 'approved' | 'rejected'): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('registrations')
      .update({ status })
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error updating member status:', err);
    return false;
  }
}

/**
 * Local/Supabase tasks cache for RH desktop app
 */
const TASKS_STORAGE_KEY = 'erise_rh_department_tasks_cache';

export function getStoredTasks(): DepartmentTask[] {
  try {
    const data = localStorage.getItem(TASKS_STORAGE_KEY);
    if (data) return JSON.parse(data);
  } catch (e) {}

  // Initial seed tasks matching club operations
  const initial: DepartmentTask[] = [
    {
      id: 'task-org-1',
      department: 'Organization',
      title: 'Hall & Logistics Setup for Robotics Workshop',
      description: 'Prepare projector, audio system, and lab bench seating for 40 participants.',
      assigned_member_ids: [1, 2],
      assigned_member_names: ['Ahmed Benali', 'Sarah Khelifi'],
      status: 'completed',
      priority: 'high',
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      completed_at: new Date(Date.now() - 86400000).toISOString(),
      hr_points_awarded: true,
    },
    {
      id: 'task-media-1',
      department: 'Media',
      title: 'Event Teaser Video & Instagram Reel Editing',
      description: 'Cut 30s teaser with club branding and upcoming AI Bootcamp details.',
      assigned_member_ids: [3, 4],
      assigned_member_names: ['Yacine Mansouri', 'Amira Zerrouki'],
      status: 'completed',
      priority: 'medium',
      created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
      completed_at: new Date(Date.now() - 86400000 * 1.5).toISOString(),
      hr_points_awarded: true,
    },
    {
      id: 'task-proj-1',
      department: 'Projects',
      title: 'Solar Tracker Firmware Prototype',
      description: 'Implement dual-axis light sensor PID tracking algorithm on ESP32.',
      assigned_member_ids: [5, 6],
      assigned_member_names: ['Mohamed Cherif', 'Imane Boudiaf'],
      status: 'in_progress',
      priority: 'high',
      created_at: new Date(Date.now() - 86400000).toISOString(),
    }
  ];

  try {
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(initial));
  } catch (e) {}
  return initial;
}

export function saveStoredTasks(tasks: DepartmentTask[]): void {
  try {
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
  } catch (e) {}
}

/**
 * Fetch all events from Supabase
 */
export async function fetchEvents(): Promise<EventItem[]> {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('id', { ascending: false });

    if (error || !data) return [];
    return data;
  } catch (e) {
    console.error('Error fetching events:', e);
    return [];
  }
}

/**
 * Fetch event registrations and their participants (teams, companions, members)
 */
export async function fetchEventRegistrations(eventId?: number): Promise<EventRegistration[]> {
  try {
    let query = supabase
      .from('event_registrations')
      .select('*')
      .order('registered_at', { ascending: false });

    if (eventId) {
      query = query.eq('event_id', eventId);
    }

    const { data: registrations, error: regErr } = await query;
    if (regErr || !registrations) return [];

    const { data: allMembers } = await supabase
      .from('event_registration_members')
      .select('*');

    const { data: allEvents } = await supabase
      .from('events')
      .select('id, title');

    const eventTitleMap = new Map<number, string>();
    (allEvents || []).forEach((e: any) => eventTitleMap.set(e.id, e.title));

    const membersByRegId = new Map<number, EventRegistrationMember[]>();
    (allMembers || []).forEach((m: any) => {
      const list = membersByRegId.get(m.registration_id) || [];
      list.push(m);
      membersByRegId.set(m.registration_id, list);
    });

    return registrations.map((r: any) => ({
      id: r.id,
      event_id: r.event_id,
      event_title: eventTitleMap.get(r.event_id) || `Event #${r.event_id}`,
      registration_type: r.registration_type || 'individual',
      team_name: r.team_name,
      institution: r.institution || 'N/A',
      study_year: r.study_year || 'N/A',
      has_companion: !!r.has_companion,
      companion_name: r.companion_name,
      companion_role: r.companion_role,
      status: r.status || 'pending',
      registered_at: r.registered_at,
      members: membersByRegId.get(r.id) || [],
    }));
  } catch (e) {
    console.error('Error fetching event registrations:', e);
    return [];
  }
}

/**
 * Export arbitrary tabular data to CSV with UTF-8 BOM encoding for Excel compatibility
 */
export function exportToCSV(
  filename: string, 
  headers: string[], 
  rows: (string | number | boolean | null | undefined)[][]
): void {
  const escapeCell = (cell: any) => {
    if (cell === null || cell === undefined) return '""';
    const str = String(cell).replace(/"/g, '""');
    return `"${str}"`;
  };

  const csvContent = [
    headers.map(escapeCell).join(','),
    ...rows.map(row => row.map(escapeCell).join(','))
  ].join('\r\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

