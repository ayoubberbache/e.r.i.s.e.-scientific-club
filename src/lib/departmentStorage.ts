import { supabase } from './supabase';
import { getValidAuthSession } from './authCrypto';
import { 
  Department, 
  DepartmentMember, 
  ClubProject, 
  EventStaffAssignment, 
  ProjectMemberAssignment,
  ClubTask,
  AttendanceRecord
} from '../types/portals';

const ROLES_STORAGE_KEY = 'erise_custom_member_roles';
const PROJECTS_STORAGE_KEY = 'erise_club_projects_v2';
const EVENT_ASSIGNMENTS_KEY = 'erise_event_staff_assignments_v2';
const CUSTOM_MEMBERS_KEY = 'erise_custom_dept_members_v2';

export function getApiAuthHeaders(): Record<string, string> {
  const session = getValidAuthSession();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (session) {
    try {
      headers['Authorization'] = `Bearer ${btoa(unescape(encodeURIComponent(JSON.stringify(session))))}`;
    } catch {}
  }
  return headers;
}

export function isUpcomingOrActiveEvent(dateStr?: string, status?: string): boolean {
  if (!dateStr && !status) return true;
  
  const normStatus = (status || '').toLowerCase().trim();
  if (normStatus === 'past' || normStatus === 'archived' || normStatus === 'completed') {
    return false;
  }

  if (!dateStr) return true;

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  // Try parsing ISO dates like YYYY-MM-DD or YYYY-MM-DD - YYYY-MM-DD
  const isoMatches = dateStr.match(/\d{4}-\d{2}-\d{2}/g);
  if (isoMatches && isoMatches.length > 0) {
    const lastDateStr = isoMatches[isoMatches.length - 1];
    const eventDate = new Date(lastDateStr);
    if (!isNaN(eventDate.getTime())) {
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      return eventDate >= todayStart;
    }
  }

  // Try parsing Month YYYY (e.g. "October 2026", "March 2026")
  const monthsMap: Record<string, number> = {
    january: 0, jan: 0,
    february: 1, feb: 1,
    march: 2, mar: 2,
    april: 3, apr: 3,
    may: 4,
    june: 5, jun: 5,
    july: 6, jul: 6,
    august: 7, aug: 7,
    september: 8, sep: 8, sept: 8,
    october: 9, oct: 9,
    november: 10, nov: 10,
    december: 11, dec: 11,
  };

  const yearMatch = dateStr.match(/\b(20\d\d)\b/);
  if (yearMatch) {
    const year = parseInt(yearMatch[1], 10);
    if (year < currentYear) return false;
    if (year > currentYear) return true;

    // Year is current year
    const lower = dateStr.toLowerCase();
    for (const [mName, mIdx] of Object.entries(monthsMap)) {
      if (lower.includes(mName)) {
        return mIdx >= currentMonth;
      }
    }
  }

  return true;
}

// ── Real Projects Storage (Initialized empty, synced with Supabase) ─────────
const INITIAL_PROJECTS: ClubProject[] = [];

// ── Custom Roles Helper ─────────────────────────────────────────────────────
export function getCustomRolesMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(ROLES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function setCustomRole(memberId: string | number, role: string): void {
  try {
    const map = getCustomRolesMap();
    map[String(memberId)] = role;
    localStorage.setItem(ROLES_STORAGE_KEY, JSON.stringify(map));
  } catch (err) {
    console.error('Failed to save custom role:', err);
  }
}

// ── Custom Members Helper (Stored locally + synced with Supabase) ────────────
export function getCustomDeptMembers(dept: Department): DepartmentMember[] {
  try {
    const raw = localStorage.getItem(`${CUSTOM_MEMBERS_KEY}_${dept}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCustomDeptMembers(dept: Department, members: DepartmentMember[]): void {
  try {
    localStorage.setItem(`${CUSTOM_MEMBERS_KEY}_${dept}`, JSON.stringify(members));
  } catch (err) {
    console.error('Failed to save custom department members:', err);
  }
}

// ── Fetch Department Members ────────────────────────────────────────────────
export async function fetchDepartmentMembers(dept: Department): Promise<DepartmentMember[]> {
  const rolesMap = getCustomRolesMap();
  const customMembers = getCustomDeptMembers(dept);
  let dbMembers: DepartmentMember[] = [];

  // Load Member Ratings from Supabase & local storage
  const ratingsMap: Record<string, number> = {};
  try {
    const { data: ratingRows } = await supabase.from('member_ratings').select('member_id, overall_rating');
    if (ratingRows && Array.isArray(ratingRows)) {
      ratingRows.forEach((r: any) => {
        ratingsMap[String(r.member_id)] = Number(r.overall_rating ?? 50);
      });
    }
  } catch (e) {
    try {
      const raw = localStorage.getItem('erise_member_ratings_v2');
      if (raw) {
        const parsed = JSON.parse(raw);
        Object.keys(parsed).forEach((k) => {
          ratingsMap[k] = Number(parsed[k]?.overallRating ?? 50);
        });
      }
    } catch (err) {}
  }

  try {
    let rawMembers: any[] = [];
    try {
      const headers = getApiAuthHeaders();
      const res = await fetch('/api/admin-data?table=registrations', { headers });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.data) && json.data.length > 0) {
          rawMembers = json.data;
        }
      }
    } catch (apiErr) {}

    if (rawMembers.length === 0) {
      const { data, error } = await supabase
        .from('registrations')
        .select('*')
        .order('registered_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        rawMembers = data;
      }
    }

    if (rawMembers.length > 0) {
      dbMembers = rawMembers
        .filter((item) => {
          if (!item.departments) return false;
          if (Array.isArray(item.departments)) {
            return item.departments.some((d: string) => d.toLowerCase() === dept.toLowerCase());
          }
          return typeof item.departments === 'string' && item.departments.toLowerCase().includes(dept.toLowerCase());
        })
        .map((item) => {
          const depts = Array.isArray(item.departments)
            ? item.departments
            : typeof item.departments === 'string'
            ? [item.departments]
            : [dept];

          const grantedRole = rolesMap[String(item.id)] || 'General Member';
          const memberRating = ratingsMap[String(item.id)] ?? ratingsMap[`mem-${item.id}`] ?? 50;

          return {
            id: item.id,
            full_name: item.full_name || 'Member',
            email: item.email || '',
            phone: item.phone || '',
            study_year: item.study_year || 'N/A',
            specialization: item.specialization || '',
            departments: depts,
            role: grantedRole,
            status: item.status || 'approved',
            registered_at: item.registered_at,
            rating: memberRating,
          };
        });
    }
  } catch (err) {
    console.warn('Could not fetch from Supabase registrations, using local cache:', err);
  }

  // Combine DB members with locally added members, avoiding duplicates
  const existingIds = new Set(dbMembers.map((m) => String(m.id)));
  const uniqueCustom = customMembers.filter((m) => !existingIds.has(String(m.id)));

  // Apply granted roles and ratings to custom members as well
  const formattedCustom = uniqueCustom.map(m => ({
    ...m,
    role: rolesMap[String(m.id)] || m.role || 'General Member',
    rating: ratingsMap[String(m.id)] ?? ratingsMap[`mem-${m.id}`] ?? m.rating ?? 50,
  }));

  return [...dbMembers, ...formattedCustom];
}

// ── Add Department Member ───────────────────────────────────────────────────
export async function addDepartmentMember(
  dept: Department,
  member: Omit<DepartmentMember, 'id'>
): Promise<DepartmentMember> {
  const newId = `dept-${dept.toLowerCase()}-${Date.now()}`;
  const newMember: DepartmentMember = {
    ...member,
    id: newId,
    departments: member.departments?.length ? member.departments : [dept],
    role: member.role || 'General Member',
    status: member.status || 'approved',
    registered_at: new Date().toISOString(),
    joined_at: new Date().toISOString(),
  };

  // 1. Try to save to Supabase
  try {
    const { data, error } = await supabase.from('registrations').insert([
      {
        full_name: member.full_name,
        email: member.email,
        phone: member.phone,
        study_year: member.study_year,
        specialization: member.specialization,
        departments: [dept],
        status: 'approved',
      }
    ]).select();

    if (!error && data && data.length > 0) {
      newMember.id = data[0].id;
    }
  } catch (err) {
    console.warn('Could not insert member into Supabase directly:', err);
  }

  // 2. Save custom role
  if (member.role) {
    setCustomRole(newMember.id, member.role);
  }

  // 3. Save to local department store
  const existing = getCustomDeptMembers(dept);
  saveCustomDeptMembers(dept, [newMember, ...existing]);

  return newMember;
}

// ── Delete Department Member ────────────────────────────────────────────────
export async function deleteDepartmentMember(
  dept: Department,
  memberId: number | string
): Promise<void> {
  // If it's a numeric ID, try deleting from Supabase
  if (typeof memberId === 'number' || !String(memberId).startsWith('dept-')) {
    try {
      await supabase.from('registrations').delete().eq('id', memberId);
    } catch (err) {
      console.warn('Error deleting from Supabase:', err);
    }
  }

  // Remove from custom local store
  const existing = getCustomDeptMembers(dept);
  const filtered = existing.filter((m) => String(m.id) !== String(memberId));
  saveCustomDeptMembers(dept, filtered);

  // Remove any event assignments for this member
  removeMemberAssignmentsEverywhere(dept, memberId);
}

// ── Grant Role ──────────────────────────────────────────────────────────────
export function grantDepartmentMemberRole(
  dept: Department,
  memberId: number | string,
  newRole: string
): void {
  setCustomRole(memberId, newRole);

  // Also update local list if present
  const existing = getCustomDeptMembers(dept);
  const updated = existing.map((m) =>
    String(m.id) === String(memberId) ? { ...m, role: newRole } : m
  );
  saveCustomDeptMembers(dept, updated);
}

// ── Projects Engine (Projects Department with Supabase DB Integration) ──────
export async function fetchStoredProjects(): Promise<ClubProject[]> {
  const localList = getStoredProjects();
  try {
    let projectRows: any[] = [];
    try {
      const headers = getApiAuthHeaders();
      const res = await fetch('/api/admin-data?table=projects&department=Projects', { headers });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.data) && json.data.length > 0) {
          projectRows = json.data;
        }
      }
    } catch (e) {}

    if (projectRows.length === 0) {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('id', { ascending: false });
      if (!error && Array.isArray(data)) {
        projectRows = data;
      }
    }

    if (projectRows.length > 0) {
      const dbProjects: ClubProject[] = projectRows.map((p) => {
        const teamMemberIds: (string | number)[] = Array.isArray(p.team_member_ids) ? p.team_member_ids : [];
        const customRoles: Record<string, string> = p.member_custom_roles || {};

        // Hydrate team_members list
        const team_members: ProjectMemberAssignment[] = teamMemberIds.map((mId) => ({
          member_id: mId,
          member_name: `Member #${mId}`,
          role_in_project: customRoles[String(mId)] || 'Project Engineer & Developer',
          assigned_at: p.created_at || new Date().toISOString(),
        }));

        return {
          id: p.id,
          title: p.title || 'Project',
          description: p.description || '',
          department: p.department || 'Projects',
          category: 'Engineering & Innovation',
          status: p.status || 'Active',
          progress: 0,
          leader_member_id: p.leader_member_id || '',
          team_member_ids: teamMemberIds,
          member_custom_roles: customRoles,
          team_members: team_members,
          created_at: p.created_at || new Date().toISOString(),
          updated_at: p.created_at || new Date().toISOString(),
        };
      });

      saveStoredProjects(dbProjects);
      return dbProjects;
    }
  } catch (err) {
    console.warn('Could not fetch projects from Supabase database, using local cache:', err);
  }

  return localList;
}

export function getStoredProjects(): ClubProject[] {
  try {
    const raw = localStorage.getItem(PROJECTS_STORAGE_KEY) || localStorage.getItem('erise_projects_v5');
    if (!raw) {
      localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(INITIAL_PROJECTS));
      localStorage.setItem('erise_projects_v5', JSON.stringify(INITIAL_PROJECTS));
      return INITIAL_PROJECTS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_PROJECTS;
  }
}

export function saveStoredProjects(projects: ClubProject[]): void {
  try {
    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
    localStorage.setItem('erise_projects_v5', JSON.stringify(projects));
  } catch (err) {
    console.error('Failed to save projects to localStorage:', err);
  }
}

export async function addOrUpdateProject(
  projectData: Partial<ClubProject> & { title: string }
): Promise<ClubProject> {
  const currentProjects = getStoredProjects();
  const now = new Date().toISOString();

  // Extract team members, IDs, and custom roles dictionary (HR format)
  const teamMembers = projectData.team_members || [];
  const memberIds = teamMembers.map((m) => m.member_id);
  const customRoles: Record<string, string> = {};
  teamMembers.forEach((m) => {
    if (m.role_in_project) {
      customRoles[String(m.member_id)] = m.role_in_project;
    }
  });

  const dbPayload = {
    id: projectData.id,
    title: projectData.title.trim(),
    description: projectData.description || '',
    department: projectData.department || 'Projects',
    status: projectData.status || 'Active',
    leader_member_id: String(projectData.leader_member_id || memberIds[0] || ''),
    team_member_ids: memberIds,
    member_custom_roles: customRoles,
  };

  let savedId = projectData.id;

  // 1. Prioritize /api/admin-data proxy (with secret key)
  try {
    const headers = getApiAuthHeaders();
    const res = await fetch('/api/admin-data', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'save_project',
        project: dbPayload
      })
    });
    if (res.ok) {
      const json = await res.json();
      if (json.data?.id) {
        savedId = json.data.id;
      }
    }
  } catch (apiErr) {
    console.warn('API save_project failed, falling back to direct client:', apiErr);
  }

  // 2. Direct client fallback if not saved via API
  if (!savedId) {
    try {
      const rawIdStr = String(projectData.id || '').replace(/^prj-|^proj-/, '');
      const isExistingDbRecord = /^\d+$/.test(rawIdStr) && Number(rawIdStr) < 20000000;

      if (isExistingDbRecord) {
        const numericId = Number(rawIdStr);
        await supabase.from('projects').update(dbPayload).eq('id', numericId);
      } else {
        const { data, error } = await supabase.from('projects').insert([dbPayload]).select();
        if (!error && data && data[0]) {
          savedId = data[0].id;
        }
      }
    } catch (err) {
      console.warn('Could not save project into Supabase directly:', err);
    }
  }

  // 3. Format final project object
  const finalProject: ClubProject = {
    id: savedId || projectData.id || `proj-${Date.now()}`,
    title: projectData.title.trim(),
    description: projectData.description || '',
    department: 'Projects',
    category: projectData.category || 'General Engineering',
    status: projectData.status || 'Active',
    progress: 0,
    leader_member_id: String(projectData.leader_member_id || memberIds[0] || ''),
    team_member_ids: memberIds,
    member_custom_roles: customRoles,
    team_members: teamMembers,
    created_at: projectData.created_at || now,
    updated_at: now,
  };

  const updatedList = [
    finalProject,
    ...currentProjects.filter((p) => String(p.id) !== String(finalProject.id)),
  ];

  saveStoredProjects(updatedList);
  return finalProject;
}

export async function deleteProject(projectId: string | number): Promise<void> {
  const rawIdStr = String(projectId).replace(/^prj-|^proj-/, '');

  // 1. Delete via /api/admin-data proxy
  if (/^\d+$/.test(rawIdStr) && Number(rawIdStr) < 20000000) {
    try {
      const headers = getApiAuthHeaders();
      await fetch('/api/admin-data', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'delete',
          table: 'projects',
          id: Number(rawIdStr)
        })
      });
    } catch (e) {}

    // Fallback to direct client
    try {
      await supabase.from('projects').delete().eq('id', Number(rawIdStr));
    } catch (err) {
      console.warn('Could not delete project from Supabase:', err);
    }
  }

  // 2. Remove from local storage
  const current = getStoredProjects();
  const filtered = current.filter((p) => String(p.id) !== String(projectId));
  saveStoredProjects(filtered);
}

export async function assignMemberToProject(
  projectId: string | number,
  assignment: ProjectMemberAssignment
): Promise<ClubProject | null> {
  const projects = getStoredProjects();
  const target = projects.find((p) => String(p.id) === String(projectId));
  if (!target) return null;

  const existingMembers = target.team_members || [];
  const filtered = existingMembers.filter(
    (m) => String(m.member_id) !== String(assignment.member_id)
  );

  const updatedTeam = [...filtered, assignment];
  return await addOrUpdateProject({
    ...target,
    team_members: updatedTeam,
  });
}

export async function removeMemberFromProject(
  projectId: string | number,
  memberId: string | number
): Promise<ClubProject | null> {
  const projects = getStoredProjects();
  const target = projects.find((p) => String(p.id) === String(projectId));
  if (!target) return null;

  const updatedTeam = (target.team_members || []).filter(
    (m) => String(m.member_id) !== String(memberId)
  );

  return await addOrUpdateProject({
    ...target,
    team_members: updatedTeam,
  });
}

// ── Event Staff / Media Assignments Engine ──────────────────────────────────

export async function fetchEventAssignmentsFromSupabase(dept: Department, eventId?: number | string): Promise<EventStaffAssignment[]> {
  try {
    const numEventId = eventId !== undefined ? Number(String(eventId).replace(/^evt-/, '')) : NaN;
    let query = supabase.from('event_staff_assignments').select('*');
    if (!isNaN(numEventId)) {
      query = query.eq('event_id', numEventId);
    }
    const { data: assignmentsData, error } = await query;
    let list: EventStaffAssignment[] = [];

    if (!error && Array.isArray(assignmentsData)) {
      list = assignmentsData.map((item: any) => ({
        id: item.id || `assign-${item.event_id}-${item.member_id}`,
        event_id: Number(item.event_id),
        event_title: item.event_title || 'Event',
        department: (item.department || dept) as Department,
        member_id: Number(String(item.member_id).replace(/^reg-|^leader-|^mem-/, '')) || item.member_id,
        member_name: item.member_name || 'Member',
        member_email: item.member_email || '',
        member_phone: item.member_phone || '',
        assigned_role: item.assigned_role || 'Event Staff',
        status: item.status || 'Assigned',
        assigned_at: item.assigned_at || new Date().toISOString()
      }));
    }

    // Secondary fallback check on events table assigned_member_ids
    if (!isNaN(numEventId)) {
      const { data: eventRows } = await supabase.from('events').select('*').eq('id', numEventId);
      if (eventRows && eventRows.length > 0) {
        const ev = eventRows[0];
        const assignedIds: any[] = Array.isArray(ev.assigned_member_ids) ? ev.assigned_member_ids : [];
        const customRoles: Record<string, string> = ev.member_custom_roles || {};

        assignedIds.forEach((mId) => {
          const rawIdStr = String(mId).replace(/^reg-|^leader-|^mem-/, '');
          const exists = list.some((a) => String(a.member_id).replace(/^reg-|^leader-|^mem-/, '') === rawIdStr);
          if (!exists && rawIdStr) {
            list.push({
              id: `assign-${numEventId}-${rawIdStr}`,
              event_id: numEventId,
              event_title: ev.title || 'Event',
              department: dept,
              member_id: mId,
              member_name: 'Member',
              member_email: '',
              member_phone: '',
              assigned_role: customRoles[String(mId)] || customRoles[rawIdStr] || (dept === 'Media' ? 'Event Coverage Crew' : 'Event Logistics Staff'),
              status: 'Assigned',
              assigned_at: new Date().toISOString()
            });
          }
        });
      }
    }

    saveEventStaffAssignments(dept, list);
    return list;
  } catch (err) {
    console.warn('Could not fetch event assignments from Supabase, fallback to cache:', err);
  }
  return getEventStaffAssignments(dept, eventId !== undefined ? Number(String(eventId).replace(/^evt-/, '')) : undefined);
}

export async function syncEventAffiliationToSupabase(
  eventId: number | string,
  memberId: number | string,
  action: 'add' | 'remove',
  dept?: Department,
  assignedRole?: string,
  memberDetails?: Partial<DepartmentMember>
) {
  try {
    const numericEventId = Number(String(eventId).replace(/^evt-/, ''));
    if (isNaN(numericEventId)) return;

    const rawIdStr = String(memberId).replace(/^reg-|^leader-|^mem-/, '');

    // 1. Update events row in Supabase
    const { data: eventsList, error: fetchErr } = await supabase
      .from('events')
      .select('*')
      .eq('id', numericEventId);

    const eventRow = !fetchErr && Array.isArray(eventsList) && eventsList.length > 0 ? eventsList[0] : null;

    if (eventRow) {
      const existingAssigned: any[] = Array.isArray(eventRow.assigned_member_ids) ? eventRow.assigned_member_ids : [];
      const existingRoles: Record<string, string> = eventRow.member_custom_roles || {};

      let updatedAssigned: any[];
      let updatedRoles = { ...existingRoles };

      if (action === 'add') {
        const set = new Set(existingAssigned.map((v) => String(v).replace(/^reg-|^leader-|^mem-/, '')));
        set.add(rawIdStr);
        updatedAssigned = Array.from(set);

        const roleToSet = assignedRole || (dept === 'Media' ? 'Event Coverage Crew' : 'Event Logistics Staff');
        updatedRoles[rawIdStr] = roleToSet;
      } else {
        updatedAssigned = existingAssigned.filter((v) => String(v).replace(/^reg-|^leader-|^mem-/, '') !== rawIdStr);
        delete updatedRoles[rawIdStr];
      }

      const { error: eventUpdErr } = await supabase
        .from('events')
        .update({ 
          assigned_member_ids: updatedAssigned,
          member_custom_roles: updatedRoles
        })
        .eq('id', numericEventId);

      if (eventUpdErr) {
        console.error('Error updating events table in Supabase:', eventUpdErr);
      }
    }

    // 2. Sync to event_staff_assignments table in Supabase
    const assignId = `assign-${numericEventId}-${rawIdStr}`;
    if (action === 'add') {
      const { error: assignUpdErr } = await supabase.from('event_staff_assignments').upsert({
        id: assignId,
        event_id: numericEventId,
        event_title: eventRow?.title || 'Event',
        department: dept || 'Organization',
        member_id: rawIdStr,
        member_name: memberDetails?.full_name || 'Member',
        member_email: memberDetails?.email || '',
        member_phone: memberDetails?.phone || '',
        assigned_role: assignedRole || (dept === 'Media' ? 'Event Coverage Crew' : 'Event Logistics Staff'),
        status: 'Assigned',
        assigned_at: new Date().toISOString(),
      });
      if (assignUpdErr) {
        console.error('Error upserting event_staff_assignments in Supabase:', assignUpdErr);
      }
    } else {
      const { error: delErr } = await supabase
        .from('event_staff_assignments')
        .delete()
        .eq('event_id', numericEventId)
        .eq('member_id', rawIdStr);

      if (delErr) {
        console.error('Error deleting event_staff_assignments in Supabase:', delErr);
      }
    }
  } catch (err) {
    console.error('Failed to sync event affiliation to Supabase:', err);
  }
}

export function getEventStaffAssignments(dept: Department, eventId?: number): EventStaffAssignment[] {
  try {
    const raw = localStorage.getItem(`${EVENT_ASSIGNMENTS_KEY}_${dept}`);
    const list: EventStaffAssignment[] = raw ? JSON.parse(raw) : [];
    if (eventId !== undefined) {
      return list.filter((a) => Number(a.event_id) === Number(eventId));
    }
    return list;
  } catch {
    return [];
  }
}

export function saveEventStaffAssignments(dept: Department, list: EventStaffAssignment[]): void {
  try {
    localStorage.setItem(`${EVENT_ASSIGNMENTS_KEY}_${dept}`, JSON.stringify(list));
  } catch (err) {
    console.error('Failed to save event staff assignments:', err);
  }
}

export async function toggleMemberEventAffiliation(
  dept: Department,
  event: { id: number; title: string },
  member: DepartmentMember,
  defaultRole?: string,
  explicitAction?: 'add' | 'remove'
): Promise<{ affiliated: boolean; assignment?: EventStaffAssignment }> {
  const currentList = await fetchEventAssignmentsFromSupabase(dept, event.id);
  const rawMemberId = String(member.id).replace(/^reg-|^leader-|^mem-/, '');
  const existing = currentList.find(
    (a) => Number(a.event_id) === Number(event.id) && String(a.member_id).replace(/^reg-|^leader-|^mem-/, '') === rawMemberId
  );

  const shouldRemove = explicitAction ? explicitAction === 'remove' : !!existing;

  if (shouldRemove) {
    await syncEventAffiliationToSupabase(event.id, member.id, 'remove', dept);
    const updated = currentList.filter((a) => String(a.member_id).replace(/^reg-|^leader-|^mem-/, '') !== rawMemberId);
    saveEventStaffAssignments(dept, updated);
    return { affiliated: false };
  } else {
    const roleToAssign = defaultRole || member.role || (dept === 'Media' ? 'Event Coverage Crew' : 'Event Logistics Staff');
    await syncEventAffiliationToSupabase(event.id, member.id, 'add', dept, roleToAssign, member);
    const newAssignment: EventStaffAssignment = {
      id: `assign-${event.id}-${rawMemberId}`,
      event_id: event.id,
      event_title: event.title,
      department: dept,
      member_id: member.id,
      member_name: member.full_name,
      member_email: member.email,
      member_phone: member.phone,
      assigned_role: roleToAssign,
      status: 'Assigned',
      assigned_at: new Date().toISOString()
    };
    saveEventStaffAssignments(dept, [newAssignment, ...currentList.filter(a => String(a.member_id).replace(/^reg-|^leader-|^mem-/, '') !== rawMemberId)]);
    return { affiliated: true, assignment: newAssignment };
  }
}

export async function updateEventAssignmentRole(
  dept: Department,
  eventId: number,
  memberId: number | string,
  newRole: string
): Promise<void> {
  await syncEventAffiliationToSupabase(eventId, memberId, 'add', dept, newRole);
}

export async function batchAffiliateMembersToEvent(
  dept: Department,
  event: { id: number; title: string },
  membersToAssign: DepartmentMember[],
  defaultRole?: string
): Promise<void> {
  for (const m of membersToAssign) {
    const roleToAssign = defaultRole || m.role || (dept === 'Media' ? 'Event Coverage Crew' : 'Event Logistics Staff');
    await syncEventAffiliationToSupabase(event.id, m.id, 'add', dept, roleToAssign, m);
  }
}

export async function toggleMemberProjectAffiliation(
  projectId: string | number,
  member: DepartmentMember,
  defaultRole?: string
): Promise<{ affiliated: boolean }> {
  const projects = getStoredProjects();
  const target = projects.find((p) => String(p.id) === String(projectId));
  if (!target) return { affiliated: false };

  const isAssigned = (target.team_members || []).some(
    (m) => String(m.member_id) === String(member.id)
  );

  if (isAssigned) {
    await removeMemberFromProject(projectId, member.id);
    return { affiliated: false };
  } else {
    const roleToAssign = defaultRole || member.role || 'Project Engineer & Developer';
    await assignMemberToProject(projectId, {
      member_id: member.id,
      member_name: member.full_name,
      role_in_project: roleToAssign,
      assigned_at: new Date().toISOString(),
    });
    return { affiliated: true };
  }
}

export async function batchAffiliateMembersToProject(
  projectId: string | number,
  membersToAssign: DepartmentMember[],
  defaultRole?: string
): Promise<void> {
  for (const m of membersToAssign) {
    const roleToAssign = defaultRole || m.role || 'Project Engineer & Developer';
    await assignMemberToProject(projectId, {
      member_id: m.id,
      member_name: m.full_name,
      role_in_project: roleToAssign,
      assigned_at: new Date().toISOString(),
    });
  }
}

function removeMemberAssignmentsEverywhere(dept: Department, memberId: string | number): void {
  // Remove from event assignments
  const list = getEventStaffAssignments(dept);
  const filtered = list.filter((a) => String(a.member_id) !== String(memberId));
  saveEventStaffAssignments(dept, filtered);

  // If projects dept, also remove from projects
  if (dept === 'Projects') {
    const projects = getStoredProjects();
    const updatedProjects = projects.map((p) => ({
      ...p,
      team_members: (p.team_members || []).filter(
        (m) => String(m.member_id) !== String(memberId)
      ),
    }));
    saveStoredProjects(updatedProjects);
  }
}

// ── Department Tasks Engine (For Organization & Media) ──────────────────────

const INITIAL_ORG_TASKS: ClubTask[] = [];
const INITIAL_MEDIA_TASKS: ClubTask[] = [];

const isLegacyMockTaskId = (id: string | number) => {
  const s = String(id);
  return s === 'task-org-1' || s === 'task-org-2' || s === 'task-med-1' || s === 'task-med-2';
};

export async function fetchDepartmentTasks(dept: Department): Promise<ClubTask[]> {
  const storageKey = `erise_tasks_${dept.toLowerCase()}`;
  let tasks: ClubTask[] = [];

  // 1. Try to fetch from Supabase projects table (holds tasks for Organization & Media)
  try {
    const headers = getApiAuthHeaders();
    const res = await fetch(`/api/admin-data?table=projects&department=${encodeURIComponent(dept)}`, { headers });
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json.data) && json.data.length > 0) {
        tasks = json.data.map((p: any) => {
          const customRoles = p.member_custom_roles || {};
          const assignedIds = Array.isArray(p.team_member_ids) ? p.team_member_ids : [];
          return {
            id: String(p.id),
            title: p.title || 'Task',
            description: p.description || '',
            department: dept,
            assigned_member_ids: assignedIds,
            assigned_members: assignedIds.map((mId: any) => ({
              id: mId,
              name: `Member #${mId}`
            })),
            priority: customRoles.priority || 'High',
            deadline: customRoles.deadline || undefined,
            status: p.status || 'Pending',
            is_evaluated: false,
            created_at: p.created_at || new Date().toISOString(),
            completed_at: p.status === 'Completed' ? (p.updated_at || new Date().toISOString()) : undefined
          };
        });
      }
    }
  } catch (err) {
    console.warn('Could not query department tasks from API:', err);
  }

  // 2. Fallback / merge with localStorage, purging any old legacy mock items
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed: ClubTask[] = JSON.parse(raw);
      const cleaned = parsed.filter(t => !isLegacyMockTaskId(t.id));
      localStorage.setItem(storageKey, JSON.stringify(cleaned));

      if (tasks.length === 0) {
        tasks = cleaned;
      }
    }
  } catch (err) {
    console.warn('Local storage tasks parse error:', err);
  }

  return tasks.filter(t => !isLegacyMockTaskId(t.id));
}

export async function createDepartmentTask(
  dept: Department,
  taskData: Omit<ClubTask, 'id' | 'created_at' | 'department'>
): Promise<ClubTask> {
  const current = await fetchDepartmentTasks(dept);
  let savedId = `task-${dept.toLowerCase()}-${Date.now()}`;

  // 1. Save to Supabase projects table
  try {
    const headers = getApiAuthHeaders();
    const res = await fetch('/api/admin-data', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'save_project',
        project: {
          title: taskData.title,
          description: taskData.description || '',
          department: dept,
          status: taskData.status || 'Pending',
          team_member_ids: taskData.assigned_member_ids || [],
          member_custom_roles: {
            priority: taskData.priority || 'High',
            deadline: taskData.deadline || ''
          }
        }
      })
    });
    if (res.ok) {
      const json = await res.json();
      if (json.data?.id) {
        savedId = String(json.data.id);
      }
    }
  } catch (err) {
    console.warn('Could not save task to database:', err);
  }

  const newTask: ClubTask = {
    ...taskData,
    id: savedId,
    department: dept,
    status: taskData.status || 'Pending',
    is_evaluated: false,
    created_at: new Date().toISOString(),
  };

  const updated = [newTask, ...current.filter(t => t.id !== savedId && !isLegacyMockTaskId(t.id))];
  localStorage.setItem(`erise_tasks_${dept.toLowerCase()}`, JSON.stringify(updated));
  return newTask;
}

export async function markDepartmentTaskDone(
  dept: Department,
  taskId: string
): Promise<ClubTask | null> {
  const current = await fetchDepartmentTasks(dept);
  let updatedTask: ClubTask | null = null;

  // 1. Sync to Supabase projects / organization todo database
  if (taskId && !String(taskId).startsWith('temp-')) {
    try {
      const headers = getApiAuthHeaders();
      await fetch('/api/admin-data', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'update_status',
          table: 'projects',
          id: isNaN(Number(taskId)) ? taskId : Number(taskId),
          status: 'Completed'
        })
      });
    } catch (err) {
      console.warn('Could not update task status in DB:', err);
    }
  }

  const updated = current.map((t) => {
    if (t.id === taskId) {
      updatedTask = {
        ...t,
        status: 'Completed',
        completed_at: new Date().toISOString(),
        is_evaluated: false,
      };
      return updatedTask;
    }
    return t;
  });

  localStorage.setItem(`erise_tasks_${dept.toLowerCase()}`, JSON.stringify(updated.filter(t => !isLegacyMockTaskId(t.id))));
  return updatedTask;
}

export async function deleteDepartmentTask(dept: Department, taskId: string): Promise<void> {
  if (taskId && !String(taskId).startsWith('temp-')) {
    try {
      const headers = getApiAuthHeaders();
      await fetch('/api/admin-data', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'delete',
          table: 'projects',
          id: isNaN(Number(taskId)) ? taskId : Number(taskId)
        })
      });
    } catch (err) {}
  }

  const current = await fetchDepartmentTasks(dept);
  const updated = current.filter((t) => t.id !== taskId && !isLegacyMockTaskId(t.id));
  localStorage.setItem(`erise_tasks_${dept.toLowerCase()}`, JSON.stringify(updated));
}

// ── Workshop & Bootcamp Attendance Engine (Projects Portal & Supabase) ──────

export async function fetchWorkshopAttendance(eventId: number): Promise<AttendanceRecord[]> {
  const localKey = `erise_attendance_logs_${eventId}`;
  let records: AttendanceRecord[] = [];

  try {
    const { data, error } = await supabase
      .from('attendance_logs')
      .select('*')
      .eq('event_id', eventId);

    if (!error && Array.isArray(data)) {
      records = data.map((r: any) => ({
        id: r.id,
        member_id: Number(r.member_id),
        event_id: Number(r.event_id),
        event_title: r.event_title || '',
        session_date: r.session_date,
        status: (r.status === 'Present' || r.status === 'Absent') ? r.status : 'Absent',
        absence_reason: r.absence_reason,
        created_at: r.created_at
      }));
    }
  } catch (err) {
    console.warn('Could not query attendance_logs from Supabase:', err);
  }

  // Fallback / merge with local cache
  try {
    const localRaw = localStorage.getItem(localKey);
    if (localRaw) {
      const localList: AttendanceRecord[] = JSON.parse(localRaw);
      const existingMemberIds = new Set(records.map(r => r.member_id));
      for (const item of localList) {
        if (!existingMemberIds.has(item.member_id)) {
          records.push(item);
        }
      }
    }
  } catch {}

  return records;
}

export async function saveAttendanceCheck(
  eventId: number,
  eventTitle: string,
  memberId: number,
  memberName: string,
  status: 'Present' | 'Absent'
): Promise<AttendanceRecord> {
  const record: AttendanceRecord = {
    member_id: memberId,
    event_id: eventId,
    event_title: eventTitle,
    session_date: new Date().toISOString().slice(0, 10),
    status,
    member_name: memberName,
    created_at: new Date().toISOString(),
  };

  // 1. Try to save to Supabase attendance_logs
  try {
    // Delete existing entry for this member and event
    await supabase
      .from('attendance_logs')
      .delete()
      .eq('event_id', eventId)
      .eq('member_id', memberId);

    // Insert updated status
    const { data, error } = await supabase
      .from('attendance_logs')
      .insert([{
        member_id: memberId,
        event_id: eventId,
        event_title: eventTitle,
        session_date: record.session_date,
        status,
      }])
      .select();

    if (!error && data && data[0]) {
      record.id = data[0].id;
    }
  } catch (err) {
    console.warn('Could not sync attendance check to Supabase:', err);
  }

  // 2. Cache in localStorage
  try {
    const localKey = `erise_attendance_logs_${eventId}`;
    const current = await fetchWorkshopAttendance(eventId);
    const filtered = current.filter(r => r.member_id !== memberId);
    const updated = [record, ...filtered];
    localStorage.setItem(localKey, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to cache attendance locally:', err);
  }

  return record;
}

