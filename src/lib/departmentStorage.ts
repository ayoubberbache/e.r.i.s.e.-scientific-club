import { supabase } from './supabase';
import { getAuthHeader } from './authCrypto';
import {
  AttendanceRecord,
  ClubProject,
  ClubTask,
  Department,
  DepartmentMember,
  ProjectMemberAssignment,
} from '../types/portals';

const ROLES_STORAGE_KEY = 'erise_custom_member_roles';
const PROJECTS_STORAGE_KEY = 'erise_club_projects_v2';

export function getApiAuthHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
  };
}

export function isUpcomingOrActiveEvent(dateStr?: string, status?: string): boolean {
  if (!dateStr && !status) return true;
  const normStatus = (status || '').toLowerCase().trim();
  if (normStatus === 'past' || normStatus === 'archived' || normStatus === 'completed') {
    return false;
  }
  if (!dateStr) return true;

  const today = new Date();
  const isoMatches = dateStr.match(/\d{4}-\d{2}-\d{2}/g);
  if (isoMatches && isoMatches.length > 0) {
    const eventDate = new Date(isoMatches[isoMatches.length - 1]);
    if (!isNaN(eventDate.getTime())) {
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      return eventDate >= todayStart;
    }
  }

  const monthsMap: Record<string, number> = {
    january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2, april: 3, apr: 3,
    may: 4, june: 5, jun: 5, july: 6, jul: 6, august: 7, aug: 7,
    september: 8, sep: 8, october: 9, oct: 9, november: 10, nov: 10, december: 11, dec: 11,
  };

  const monthMatch = dateStr.toLowerCase().match(/([a-z]+)\s+(\d{4})/);
  if (monthMatch) {
    const mIdx = monthsMap[monthMatch[1]];
    const yr = parseInt(monthMatch[2], 10);
    if (mIdx !== undefined && !isNaN(yr)) {
      return yr > today.getFullYear() || (yr === today.getFullYear() && mIdx >= today.getMonth());
    }
  }

  return true;
}

export function getCustomRolesMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(ROLES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function setCustomRole(memberId: string | number, role: string): void {
  const map = getCustomRolesMap();
  map[String(memberId)] = role;
  localStorage.setItem(ROLES_STORAGE_KEY, JSON.stringify(map));
}

export async function updateMemberDepartments(
  registrationId: number | string,
  departments: Department[]
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const res = await fetch('/api/admin-data', {
      method: 'POST',
      headers: getApiAuthHeaders(),
      body: JSON.stringify({
        action: 'update_departments',
        id: registrationId,
        departments,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, error: json.error || 'Failed to update departments' };
    return { success: true, data: json.data };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error' };
  }
}

export async function fetchAllRegistrations(): Promise<DepartmentMember[]> {
  try {
    const res = await fetch('/api/admin-data?table=registrations', {
      headers: getApiAuthHeaders(),
    });
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json.data)) {
        return json.data.map((r: any) => ({
          id: r.id,
          full_name: r.full_name || 'Unknown Member',
          email: r.email || '',
          phone: r.phone || '',
          study_year: r.study_year_label || r.study_year || 'N/A',
          study_year_label: r.study_year_label,
          specialization: r.specialization || '',
          departments: Array.isArray(r.departments) ? r.departments : [],
          role: r.role || 'Member',
          status: r.status || 'pending',
          registered_at: r.registered_at,
        }));
      }
    }
  } catch (err) {
    console.warn('Could not load registrations from API:', err);
  }
  return [];
}

export async function fetchDepartmentMembers(dept: Department): Promise<DepartmentMember[]> {
  const rolesMap = getCustomRolesMap();
  const target = dept.toLowerCase();

  let rawData: any[] = [];
  try {
    const res = await fetch('/api/admin-data?table=registrations', {
      headers: getApiAuthHeaders(),
    });
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json.data)) rawData = json.data;
    }
  } catch (err) {
    console.warn('API fetchDepartmentMembers error:', err);
  }

  let ratingsMap: Record<string, number> = {};
  try {
    const { data: ratingsData } = await supabase
      .from('member_ratings')
      .select('member_id, overall_rating');
    if (Array.isArray(ratingsData)) {
      ratingsData.forEach((r: any) => {
        ratingsMap[String(r.member_id)] = Number(r.overall_rating);
      });
    }
  } catch {}

  const approved = rawData.filter((m: any) => {
    if (m.status !== 'approved') return false;
    const depts: string[] = Array.isArray(m.departments)
      ? m.departments
      : typeof m.departments === 'string'
        ? [m.departments]
        : [];
    return depts.some(d => d.toLowerCase().includes(target));
  });

  return approved.map((m: any) => ({
    id: m.id,
    full_name: m.full_name,
    email: m.email || '',
    phone: m.phone || '',
    study_year: m.study_year_label || m.study_year || 'N/A',
    study_year_label: m.study_year_label,
    specialization: m.specialization || '',
    departments: Array.isArray(m.departments) ? m.departments : [dept],
    role: rolesMap[String(m.id)] || `${dept} Member`,
    status: m.status,
    registered_at: m.registered_at,
    rating: ratingsMap[String(m.id)] ?? 50,
  }));
}

export async function addDepartmentMember(
  dept: Department,
  member: Partial<DepartmentMember> & { full_name: string }
): Promise<DepartmentMember> {
  // If adding an existing approved registration by ID or email into this department,
  // merge `dept` into their `departments` array instead of creating duplicate entries!
  const all = await fetchAllRegistrations();
  const match = all.find(
    m =>
      (member.id && String(m.id) === String(member.id)) ||
      (member.email && m.email.toLowerCase() === member.email.trim().toLowerCase())
  );

  if (match) {
    const nextDepts = Array.from(new Set([...(match.departments || []), dept])) as Department[];
    await updateMemberDepartments(match.id, nextDepts);
    return { ...match, departments: nextDepts, role: member.role || `${dept} Member` };
  }

  // Otherwise insert a newly approved department member record via /api/admin-data
  const res = await fetch('/api/admin-data', {
    method: 'POST',
    headers: getApiAuthHeaders(),
    body: JSON.stringify({
      action: 'save_item',
      table: 'registrations',
      item: {
        full_name: member.full_name.trim(),
        email: (member.email || `${Date.now()}@erise.local`).trim().toLowerCase(),
        phone: member.phone || '',
        study_year: member.study_year || '1',
        specialization: member.specialization || 'Engineering',
        departments: [dept],
        status: 'approved',
      },
    }),
  });
  const json = await res.json().catch(() => ({}));
  const created = json?.data?.[0];

  return {
    id: created?.id || Date.now(),
    full_name: member.full_name,
    email: member.email || '',
    phone: member.phone || '',
    study_year: member.study_year || 'N/A',
    specialization: member.specialization || '',
    departments: [dept],
    role: member.role || `${dept} Member`,
    status: 'approved',
  };
}

export async function getMemberNamesMap(): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  const all = await fetchAllRegistrations();
  all.forEach(m => {
    if (m.id !== undefined) map[String(m.id)] = m.full_name;
  });
  return map;
}

export function getStoredProjects(): ClubProject[] {
  try {
    const raw = localStorage.getItem(PROJECTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveStoredProjects(projects: ClubProject[]): void {
  localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
}

export async function fetchStoredProjects(department?: Department): Promise<ClubProject[]> {
  try {
    const url = department
      ? `/api/admin-data?table=projects&department=${encodeURIComponent(department)}`
      : '/api/admin-data?table=projects';
    const res = await fetch(url, { headers: getApiAuthHeaders() });
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json.data)) {
        const namesMap = await getMemberNamesMap();
        const mapped: ClubProject[] = json.data.map((p: any) => {
          const ids = Array.isArray(p.team_member_ids) ? p.team_member_ids : [];
          const customRoles = p.member_custom_roles || {};
          const teamMembers: ProjectMemberAssignment[] = Array.isArray(p.assigned_members)
            ? p.assigned_members.map((am: any) => ({
                member_id: am.id,
                member_name: am.name,
                role_in_project: customRoles[String(am.id)] || 'Member',
                assigned_at: p.created_at || new Date().toISOString(),
              }))
            : ids.map((id: any) => ({
                member_id: id,
                member_name: namesMap[String(id)] || `Member #${id}`,
                role_in_project: customRoles[String(id)] || 'Member',
                assigned_at: p.created_at || new Date().toISOString(),
              }));

          return {
            id: p.id,
            title: p.title,
            description: p.description || '',
            department: p.department || 'Projects',
            category: p.category,
            status: p.status || 'Active',
            todo_status: p.todo_status,
            leader_member_id: p.leader_member_id,
            leader_name: p.leader_member_id ? namesMap[String(p.leader_member_id)] : undefined,
            team_member_ids: ids,
            member_custom_roles: customRoles,
            team_members: teamMembers,
            created_at: p.created_at || new Date().toISOString(),
            updated_at: p.updated_at || new Date().toISOString(),
          };
        });
        saveStoredProjects(mapped);
        return mapped;
      }
    }
  } catch (err) {
    console.warn('Could not fetch projects from API:', err);
  }
  return getStoredProjects();
}

export async function addOrUpdateProject(
  projectData: Partial<ClubProject> & { title: string }
): Promise<ClubProject> {
  const teamMembers = projectData.team_members || [];
  const memberIds = Array.isArray(projectData.team_member_ids)
    ? projectData.team_member_ids
    : teamMembers.map(m => m.member_id);
  const customRoles: Record<string, any> = { ...(projectData.member_custom_roles || {}) };
  teamMembers.forEach(m => {
    if (m.role_in_project) customRoles[String(m.member_id)] = m.role_in_project;
  });

  const payload = {
    id: projectData.id,
    title: projectData.title.trim(),
    description: projectData.description || '',
    department: projectData.department || 'Projects',
    status: projectData.status || 'Active',
    leader_member_id:
      projectData.leader_member_id ?? (memberIds[0] ? String(memberIds[0]) : null),
    team_member_ids: memberIds,
    member_custom_roles: customRoles,
  };

  const res = await fetch('/api/admin-data', {
    method: 'POST',
    headers: getApiAuthHeaders(),
    body: JSON.stringify({ action: 'save_project', project: payload }),
  });

  const json = await res.json().catch(() => ({}));
  const saved = json?.data || payload;
  return {
    ...projectData,
    id: saved.id || projectData.id || `proj-${Date.now()}`,
    title: payload.title,
    description: payload.description,
    department: payload.department,
    status: payload.status,
    team_member_ids: memberIds,
    member_custom_roles: customRoles,
    team_members: teamMembers,
    created_at: saved.created_at || projectData.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export async function deleteProject(projectId: string | number): Promise<void> {
  await fetch('/api/admin-data', {
    method: 'POST',
    headers: getApiAuthHeaders(),
    body: JSON.stringify({ action: 'delete', table: 'projects', id: projectId }),
  });
}

export async function removeMemberFromProject(
  projectId: string | number,
  memberId: string | number
): Promise<void> {
  const list = await fetchStoredProjects();
  const target = list.find(p => String(p.id) === String(projectId));
  if (!target) return;
  const remaining = target.team_members.filter(m => String(m.member_id) !== String(memberId));
  await addOrUpdateProject({
    ...target,
    team_members: remaining,
    team_member_ids: remaining.map(m => m.member_id),
  });
}

export async function fetchDepartmentTasks(dept: Department): Promise<ClubTask[]> {
  try {
    const projects = await fetchStoredProjects(dept);
    return projects
      .filter(p => (p.department || dept).toLowerCase() === dept.toLowerCase())
      .map(p => ({
        id: String(p.id),
        title: p.title,
        description: p.description || '',
        department: dept,
        assigned_member_ids: p.team_member_ids || [],
        assigned_members: (p.team_members || []).map(tm => ({
          id: tm.member_id,
          name: tm.member_name,
        })),
        priority:
          String(p.member_custom_roles?.priority || 'Medium').toUpperCase() === 'HIGH'
            ? 'High'
            : String(p.member_custom_roles?.priority || '').toUpperCase() === 'LOW'
              ? 'Low'
              : 'Medium',
        deadline: p.member_custom_roles?.deadline || '',
        status:
          p.status === 'Completed' || p.todo_status === 'completed'
            ? 'Completed'
            : p.status === 'In Progress' || p.todo_status === 'in_progress'
              ? 'In Progress'
              : 'Pending',
        todo_status: p.todo_status,
        created_at: p.created_at,
        completed_at: p.member_custom_roles?.completed_at || undefined,
      }));
  } catch (err) {
    console.warn('fetchDepartmentTasks error:', err);
    return [];
  }
}

export async function createDepartmentTask(
  dept: Department,
  taskData: Omit<ClubTask, 'id' | 'created_at' | 'department'>
): Promise<ClubTask> {
  const saved = await addOrUpdateProject({
    title: taskData.title,
    description: taskData.description || '',
    department: dept,
    status: taskData.status || 'Pending',
    team_member_ids: taskData.assigned_member_ids || [],
    team_members: taskData.assigned_members.map(m => ({
      member_id: m.id,
      member_name: m.name,
      role_in_project: 'Assignee',
      assigned_at: new Date().toISOString(),
    })),
    member_custom_roles: {
      priority: taskData.priority || 'Medium',
      deadline: taskData.deadline || '',
    },
  });

  return {
    ...taskData,
    id: String(saved.id),
    department: dept,
    status: taskData.status || 'Pending',
    created_at: saved.created_at,
  };
}

export async function updateDepartmentTaskStatus(
  _dept: Department,
  taskId: string,
  status: 'Pending' | 'In Progress' | 'Completed'
): Promise<boolean> {
  const res = await fetch('/api/admin-data', {
    method: 'POST',
    headers: getApiAuthHeaders(),
    body: JSON.stringify({
      action: 'update_task_status',
      id: taskId,
      status,
    }),
  });
  return res.ok;
}

export async function markDepartmentTaskDone(
  dept: Department,
  taskId: string
): Promise<ClubTask | null> {
  await updateDepartmentTaskStatus(dept, taskId, 'Completed');
  const list = await fetchDepartmentTasks(dept);
  return list.find(t => t.id === taskId) || null;
}

export async function deleteDepartmentTask(_dept: Department, taskId: string): Promise<void> {
  await deleteProject(taskId);
}

export async function fetchWorkshopAttendance(eventId: number): Promise<AttendanceRecord[]> {
  try {
    const res = await fetch(`/api/admin-data?table=attendance_logs&eventId=${eventId}`, {
      headers: getApiAuthHeaders(),
    });
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json.data)) {
        return json.data.map((r: any) => ({
          id: r.id,
          member_id: Number(r.member_id),
          event_id: Number(r.event_id),
          event_title: r.event_title || '',
          session_date: r.session_date,
          status: r.status === 'Present' ? 'Present' : 'Absent',
          absence_reason: r.absence_reason,
          member_name: r.member_name,
          created_at: r.created_at,
        }));
      }
    }
  } catch (err) {
    console.warn('Could not load attendance:', err);
  }
  return [];
}

export async function saveAttendanceCheck(
  eventId: number,
  eventTitle: string,
  memberId: number,
  memberName: string,
  status: 'Present' | 'Absent'
): Promise<AttendanceRecord> {
  const sessionDate = new Date().toISOString().slice(0, 10);
  const res = await fetch('/api/admin-data', {
    method: 'POST',
    headers: getApiAuthHeaders(),
    body: JSON.stringify({
      action: 'save_attendance',
      eventId,
      eventTitle,
      memberId,
      memberName,
      sessionDate,
      status,
    }),
  });
  const json = await res.json().catch(() => ({}));
  return {
    id: json?.data?.id,
    member_id: memberId,
    event_id: eventId,
    event_title: eventTitle,
    session_date: sessionDate,
    status,
    member_name: memberName,
    created_at: new Date().toISOString(),
  };
}
