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
  // 0. Try direct IPC bridge to Node.js main process first (bypasses browser RLS and restrictions)
  if (typeof window !== 'undefined' && (window as any).electronAPI?.fetchMembers) {
    try {
      const ipcMembers = await (window as any).electronAPI.fetchMembers();
      if (Array.isArray(ipcMembers) && ipcMembers.length > 0) {
        return ipcMembers;
      }
    } catch (e) {
      console.warn('IPC fetchMembers error, falling back to direct query:', e);
    }
  }

  try {
    // 1. Fetch registrations — actual columns: id, full_name, email, phone, study_year, specialization, departments (array), registered_at, status
    const { data: registrations, error: regError } = await supabase
      .from('registrations')
      .select('*')
      .order('registered_at', { ascending: false });

    if (regError || !registrations) {
      console.warn('Could not fetch registrations from Supabase:', regError?.message, regError?.details, regError?.hint, regError?.code);
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

      // departments is an array like ["Media","Organization","Projects"] — pick first
      const depts: string[] = Array.isArray(reg.departments) ? reg.departments : [];
      const primaryDept = depts[0] || 'General';

      return {
        id: reg.id,
        full_name: reg.full_name || 'Club Member',
        email: reg.email || '',
        phone: reg.phone || '',
        department: primaryDept,
        sub_department: reg.specialization || '',
        skills: reg.specialization || '',
        academic_year: reg.study_year ? `Year ${reg.study_year}` : '',
        motivation: '',
        status: reg.status || 'approved',
        created_at: reg.registered_at,
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
  if (typeof window !== 'undefined' && (window as any).electronAPI?.submitAppraisal) {
    try {
      const ok = await (window as any).electronAPI.submitAppraisal(appraisal);
      if (ok) return true;
    } catch (e) {
      console.warn('IPC submitAppraisal failed:', e);
    }
  }

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
  if (typeof window !== 'undefined' && (window as any).electronAPI?.updateMemberStatus) {
    try {
      const ok = await (window as any).electronAPI.updateMemberStatus(id, status);
      if (ok) return true;
    } catch (e) {
      console.warn('IPC updateMemberStatus failed:', e);
    }
  }

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
    if (data) {
      const parsed: DepartmentTask[] = JSON.parse(data);
      // Strip any mock tasks permanently
      const cleaned = parsed.filter((t) => 
        !t.id?.startsWith('task-org-') && 
        !t.id?.startsWith('task-media-') && 
        !t.id?.startsWith('task-proj-')
      );
      if (cleaned.length !== parsed.length) {
        localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(cleaned));
      }
      return cleaned;
    }
  } catch (e) {}
  return [];
}

export async function fetchTasksFromSupabase(): Promise<DepartmentTask[]> {
  if (typeof window !== 'undefined' && (window as any).electronAPI?.fetchTasks) {
    try {
      const ipcTasks = await (window as any).electronAPI.fetchTasks();
      if (Array.isArray(ipcTasks)) {
        saveStoredTasks(ipcTasks);
        return ipcTasks;
      }
    } catch (e) {
      console.warn('IPC fetchTasks failed:', e);
    }
  }

  try {
    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !projects) {
      console.warn('Could not fetch projects:', error?.message, error?.details, error?.hint, error?.code);
      return getStoredTasks();
    }

    const { data: members } = await supabase
      .from('registrations')
      .select('id, full_name');

    const memberNameMap = new Map<number, string>();
    (members || []).forEach((m: any) => {
      memberNameMap.set(m.id, m.full_name || `Member #${m.id}`);
    });

    const tasks: DepartmentTask[] = projects.map((p: any) => {
      const assignedIds: number[] = Array.isArray(p.team_member_ids) 
        ? p.team_member_ids 
        : Array.isArray(p.assigned_member_ids) 
        ? p.assigned_member_ids 
        : [];

      const assignedNames = assignedIds.map(id => memberNameMap.get(id) || `Member #${id}`);
      const customRoles = p.member_custom_roles || {};

      let status: DepartmentTask['status'] = 'pending';
      const s = (p.status || '').toLowerCase();
      if (s === 'completed' || s === 'done') status = 'completed';
      else if (s === 'in_progress' || s === 'in progress' || s === 'in development' || s === 'active') status = 'in_progress';
      else if (s === 'planning' || s === 'pending' || s === 'draft') status = 'pending';

      return {
        id: String(p.id),
        department: (p.department || 'Projects') as DepartmentTask['department'],
        title: p.title || 'Department Assignment',
        description: p.description || '',
        assigned_member_ids: assignedIds,
        assigned_member_names: assignedNames,
        status,
        priority: (customRoles.priority || 'medium').toLowerCase() as any,
        created_at: p.created_at || new Date().toISOString(),
        completed_at: status === 'completed' ? (p.updated_at || new Date().toISOString()) : undefined,
        hr_points_awarded: status === 'completed'
      };
    });

    saveStoredTasks(tasks);
    return tasks;
  } catch (err) {
    console.error('Error fetching tasks from Supabase:', err);
    return getStoredTasks();
  }
}

export function saveStoredTasks(tasks: DepartmentTask[]): void {
  try {
    const cleaned = tasks.filter((t) => 
      !t.id?.startsWith('task-org-') && 
      !t.id?.startsWith('task-media-') && 
      !t.id?.startsWith('task-proj-')
    );
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(cleaned));
  } catch (e) {}
}

/**
 * Fetch all events from Supabase
 */
export async function fetchEvents(): Promise<EventItem[]> {
  if (typeof window !== 'undefined' && (window as any).electronAPI?.fetchEvents) {
    try {
      const data = await (window as any).electronAPI.fetchEvents();
      if (Array.isArray(data)) return data;
    } catch (e) {
      console.warn('IPC fetchEvents failed:', e);
    }
  }

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
  if (typeof window !== 'undefined' && (window as any).electronAPI?.fetchEventRegistrations) {
    try {
      const data = await (window as any).electronAPI.fetchEventRegistrations(eventId);
      if (Array.isArray(data)) return data;
    } catch (e) {
      console.warn('IPC fetchEventRegistrations failed:', e);
    }
  }

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

