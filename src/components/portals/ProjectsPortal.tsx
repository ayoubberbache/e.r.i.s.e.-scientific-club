import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../lib/supabase';
import { 
  fetchDepartmentMembers, 
  addDepartmentMember, 
  fetchStoredProjects, 
  addOrUpdateProject, 
  deleteProject,
  removeMemberFromProject,
  fetchWorkshopAttendance,
  saveAttendanceCheck,
  getMemberNamesMap
} from '../../lib/departmentStorage';
import { DEPARTMENT_HEADS } from '../../data/departmentHeads';
import { DepartmentMember, ClubProject, AttendanceRecord } from '../../types/portals';
import { 
  FolderGit2, Users, CheckSquare, Plus, 
  Search, Trash2, Edit3, Check, X, Loader2, 
  Mail, Phone, UserPlus, UserCheck, Download, Award, Sliders, Filter,
  UserMinus
} from 'lucide-react';
import { PortalMemberEvaluationModal } from './PortalMemberEvaluationModal';

interface ProjectsPortalProps {
  onBackToAdmin?: () => void;
  isSuperAdmin?: boolean;
}

export function ProjectsPortal({ onBackToAdmin, isSuperAdmin }: ProjectsPortalProps) {
  const headConfig = DEPARTMENT_HEADS.Projects;

  const [activeTab, setActiveTab] = useState<'projects' | 'attendance' | 'members'>('projects');

  // Projects State
  const [projects, setProjects] = useState<ClubProject[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | number | null>(null);

  // Members State
  const [members, setMembers] = useState<DepartmentMember[]>([]);
  const [memberNamesMap, setMemberNamesMap] = useState<Record<string, string>>({});
  const [membersLoading, setMembersLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [memberYearFilter, setMemberYearFilter] = useState<string>('all');
  const [memberProjectFilter, setMemberProjectFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [memberSpecializationFilter, setMemberSpecializationFilter] = useState<string>('all');

  // Attendance State (Bootcamps & Workshops)
  const [events, setEvents] = useState<any[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceRecord[]>([]);
  const [savingAttendanceId, setSavingAttendanceId] = useState<number | null>(null);
  const [workshopEvalRatio, setWorkshopEvalRatio] = useState<number>(100);
  const [evaluatingMember, setEvaluatingMember] = useState<DepartmentMember | null>(null);

  // Project Modal State (Create / Edit)
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [projectModalMode, setProjectModalMode] = useState<'add' | 'edit'>('add');
  const [projectForm, setProjectForm] = useState({
    title: '',
    category: 'Engineering & Innovation',
    status: 'Active',
    description: '',
  });

  // Team Group Assignment Modal State
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [targetProject, setTargetProject] = useState<ClubProject | null>(null);
  const [selectedTeamMemberIds, setSelectedTeamMemberIds] = useState<(string | number)[]>([]);
  const [memberRolesMap, setMemberRolesMap] = useState<Record<string, string>>({});
  const [assignSearchQuery, setAssignSearchQuery] = useState('');
  const [assignYearFilter, setAssignYearFilter] = useState<string>('all');
  const [assignSelectionFilter, setAssignSelectionFilter] = useState<'all' | 'selected' | 'unselected'>('all');

  // Removal & Feedback State
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Add Member Modal State
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [newMemberData, setNewMemberData] = useState({
    full_name: '',
    email: '',
    phone: '',
    study_year: 3,
    specialization: 'IRIIA',
    role: 'Hardware & IoT Engineer',
  });
  const [addingMember, setAddingMember] = useState(false);

  useEffect(() => {
    async function init() {
      setMembersLoading(true);
      setProjectsLoading(true);
      try {
        const [mems, projs, nameMap] = await Promise.all([
          fetchDepartmentMembers('Projects'),
          fetchStoredProjects('Projects'),
          getMemberNamesMap()
        ]);
        setMembers(mems);
        setMemberNamesMap(nameMap);

        const enriched = projs.map((p) => {
          const teamIds = Array.isArray(p.team_member_ids) ? p.team_member_ids : [];
          const existingTeam = Array.isArray(p.team_members) && p.team_members.length > 0
            ? p.team_members
            : teamIds.map((id) => ({
                member_id: id,
                member_name: nameMap[String(id)] || `Member #${id}`,
                role_in_project: p.member_custom_roles?.[String(id)] || 'Project Engineer & Developer',
                assigned_at: p.created_at || new Date().toISOString()
              }));

          const team = existingTeam.map((tm: any) => {
            const mId = tm.member_id ?? tm.id;
            const found = mems.find((m) => String(m.id) === String(mId));
            const realName = found?.full_name || (nameMap[String(mId)] && nameMap[String(mId)] !== 'Club Member' ? nameMap[String(mId)] : (tm.member_name && tm.member_name !== 'Club Member' ? tm.member_name : (nameMap[String(mId)] || `Member #${mId}`)));
            return {
              ...tm,
              member_id: mId,
              member_name: realName,
              role_in_project: tm.role_in_project || p.member_custom_roles?.[String(mId)] || found?.role || 'Project Engineer & Developer',
              email: tm.email || found?.email || '',
              phone: tm.phone || found?.phone || '',
            };
          });
          return { ...p, team_members: team };
        });
        setProjects(enriched);
        if (enriched.length > 0 && selectedProjectId === null) {
          setSelectedProjectId(enriched[0].id);
        }
      } catch (err) {
        console.error('ProjectsPortal init error:', err);
      } finally {
        setMembersLoading(false);
        setProjectsLoading(false);
      }
      loadEvents();
    }
    init();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      loadAttendance(selectedEventId);
    }
  }, [selectedEventId]);

  const loadProjects = async () => {
    setProjectsLoading(true);
    try {
      const [list, nameMap] = await Promise.all([
        fetchStoredProjects('Projects'),
        getMemberNamesMap()
      ]);
      setMemberNamesMap(nameMap);

      const enriched = list.map((p) => {
        const teamIds = Array.isArray(p.team_member_ids) ? p.team_member_ids : [];
        const existingTeam = Array.isArray(p.team_members) && p.team_members.length > 0
          ? p.team_members
          : teamIds.map((id) => ({
              member_id: id,
              member_name: nameMap[String(id)] || `Member #${id}`,
              role_in_project: p.member_custom_roles?.[String(id)] || 'Project Engineer & Developer',
              assigned_at: p.created_at || new Date().toISOString()
            }));

        const team = existingTeam.map((tm: any) => {
          const mId = tm.member_id ?? tm.id;
          const found = members.find((m) => String(m.id) === String(mId));
          const realName = found?.full_name || (nameMap[String(mId)] && nameMap[String(mId)] !== 'Club Member' ? nameMap[String(mId)] : (tm.member_name && tm.member_name !== 'Club Member' ? tm.member_name : (nameMap[String(mId)] || `Member #${mId}`)));
          return {
            ...tm,
            member_id: mId,
            member_name: realName,
            role_in_project: tm.role_in_project || p.member_custom_roles?.[String(mId)] || found?.role || 'Project Engineer & Developer',
            email: tm.email || found?.email || '',
            phone: tm.phone || found?.phone || '',
          };
        });
        return { ...p, team_members: team };
      });
      setProjects(enriched);
      if (enriched.length > 0 && selectedProjectId === null) {
        setSelectedProjectId(enriched[0].id);
      }
    } catch (err) {
      console.error('Error loading projects:', err);
    } finally {
      setProjectsLoading(false);
    }
  };

  const loadMembers = async () => {
    setMembersLoading(true);
    try {
      const data = await fetchDepartmentMembers('Projects');
      setMembers(data);
      return data;
    } catch (err) {
      console.error('Error loading projects members:', err);
      return [];
    } finally {
      setMembersLoading(false);
    }
  };

  const loadEvents = async () => {
    setEventsLoading(true);
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('id', { ascending: false });

      if (!error && Array.isArray(data)) {
        setEvents(data);
        if (data.length > 0 && selectedEventId === null) {
          setSelectedEventId(data[0].id);
        }
      }
    } catch (err) {
      console.error('Error loading events for attendance:', err);
    } finally {
      setEventsLoading(false);
    }
  };

  const loadAttendance = async (eventId: number) => {
    try {
      const records = await fetchWorkshopAttendance(eventId);
      setAttendanceLogs(records);
    } catch (err) {
      console.error('Error loading attendance logs:', err);
    }
  };

  // Toggle Attendance Checkbox
  const handleToggleAttendance = async (member: DepartmentMember, currentStatus: 'Present' | 'Absent') => {
    if (!selectedEventId) return;
    const currentEvent = events.find((e) => e.id === selectedEventId);
    const eventTitle = currentEvent?.title || 'Workshop';
    const nextStatus: 'Present' | 'Absent' = currentStatus === 'Present' ? 'Absent' : 'Present';

    const numMemberId = Number(String(member.id).replace(/[^\d]/g, '')) || 0;
    setSavingAttendanceId(numMemberId);

    try {
      const saved = await saveAttendanceCheck(
        selectedEventId,
        eventTitle,
        numMemberId,
        member.full_name,
        nextStatus
      );

      setAttendanceLogs((prev) => {
        const filtered = prev.filter((r) => Number(r.member_id) !== numMemberId);
        return [saved, ...filtered];
      });
    } catch (err) {
      console.error('Failed to toggle attendance:', err);
    } finally {
      setSavingAttendanceId(null);
    }
  };

  // Export Dedicated Workshop Attendance CSV
  const handleExportWorkshopAttendanceCSV = () => {
    if (!activeEvent) return;
    const cleanTitle = (activeEvent.title || 'Workshop').replace(/[^a-zA-Z0-9_-]/g, '_');
    const dateStr = activeEvent.date ? String(activeEvent.date).replace(/[^a-zA-Z0-9_-]/g, '_') : new Date().toISOString().split('T')[0];

    const headers = [
      'Member Name',
      'Year',
      'Specialization',
      'Phone',
      'Email',
      'Project Role',
      'Attendance Status',
      'Event / Workshop',
      'Event Date',
      'Evaluation Ratio (%)'
    ];

    const rows = members.map((mem) => {
      const numId = Number(String(mem.id).replace(/[^\d]/g, '')) || 0;
      const log = attendanceLogs.find((r) => Number(r.member_id) === numId);
      const isPresent = log?.status === 'Present';

      return [
        mem.full_name || 'Club Member',
        `Yr ${mem.study_year}`,
        mem.specialization || 'Projects',
        mem.phone || '—',
        mem.email || '—',
        mem.role || 'Member',
        isPresent ? 'Present' : 'Absent',
        activeEvent.title || 'Workshop',
        activeEvent.date || 'TBD',
        `${workshopEvalRatio}%`
      ];
    });

    const csvContent = '\uFEFF' + [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ERISE_Workshop_${cleanTitle}_Attendance_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Save New or Edited Project
  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectForm.title.trim()) return;

    try {
      if (projectModalMode === 'add') {
        const created = await addOrUpdateProject({
          title: projectForm.title.trim(),
          category: projectForm.category,
          status: projectForm.status,
          description: projectForm.description,
          team_members: [],
        });
        setProjects((prev) => [created, ...prev]);
        setSelectedProjectId(created.id);
      } else if (targetProject) {
        const updated = await addOrUpdateProject({
          ...targetProject,
          title: projectForm.title.trim(),
          category: projectForm.category,
          status: projectForm.status,
          description: projectForm.description,
        });
        setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      }
      setProjectModalOpen(false);
    } catch (err) {
      console.error('Error saving project:', err);
    }
  };

  // Open Team Assignment Modal for a Project
  const openTeamModal = (proj: ClubProject) => {
    setTargetProject(proj);
    const idsFromMembers = (proj.team_members || []).map((m) => m.member_id ?? (m as any).id);
    const idsFromList = Array.isArray(proj.team_member_ids) ? proj.team_member_ids : [];
    const allIds = Array.from(new Set([...idsFromMembers, ...idsFromList])).filter(Boolean);
    setSelectedTeamMemberIds(allIds);

    const roles: Record<string, string> = { ...(proj.member_custom_roles || {}) };
    (proj.team_members || []).forEach((m) => {
      const id = m.member_id ?? (m as any).id;
      if (id && m.role_in_project) {
        roles[String(id)] = m.role_in_project;
      }
    });
    setMemberRolesMap(roles);
    setAssignSearchQuery('');
    setAssignYearFilter('all');
    setAssignSelectionFilter('all');
    setTeamModalOpen(true);
  };

  // Save Team Group Assignment
  const handleSaveTeamAssignment = async () => {
    if (!targetProject) return;

    const newTeamMembers = selectedTeamMemberIds.map((mId) => {
      const memberObj = members.find((m) => String(m.id) === String(mId));
      return {
        member_id: mId,
        member_name: memberObj?.full_name || memberNamesMap[String(mId)] || `Member #${mId}`,
        email: memberObj?.email || '',
        phone: memberObj?.phone || '',
        role_in_project: memberRolesMap[String(mId)] || memberObj?.role || 'Project Engineer & Developer',
        assigned_at: new Date().toISOString(),
      };
    });

    try {
      const updated = await addOrUpdateProject({
        ...targetProject,
        team_members: newTeamMembers,
        team_member_ids: selectedTeamMemberIds.map((id) => (isNaN(Number(id)) ? id : Number(id))),
        member_custom_roles: memberRolesMap,
      });

      setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setTeamModalOpen(false);
    } catch (err) {
      console.error('Failed to update project team:', err);
    }
  };

  const handleDeleteProject = async (id: string | number) => {
    if (!confirm('Are you sure you want to delete this project?')) return;
    await deleteProject(id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
    if (selectedProjectId === id) {
      setSelectedProjectId(projects[0]?.id || null);
    }
  };

  // Remove Member from Project (Mistake correction / unassignment)
  const handleRemoveMemberFromProject = async (
    projectId: string | number,
    memberId: string | number,
    memberName?: string
  ) => {
    const proj = projects.find((p) => String(p.id) === String(projectId));
    const projTitle = proj?.title || 'Project';
    const displayName = memberName || memberNamesMap[String(memberId)] || `Member #${memberId}`;

    if (!window.confirm(`Are you sure you want to remove ${displayName} from "${projTitle}"?`)) {
      return;
    }

    const mIdStr = String(memberId);
    setRemovingMemberId(mIdStr);

    try {
      await removeMemberFromProject(projectId, memberId);

      // Optimistically update projects state
      setProjects((prev) =>
        prev.map((p) => {
          if (String(p.id) !== String(projectId)) return p;

          const updatedTeam = (p.team_members || []).filter(
            (m) => String(m.member_id ?? (m as any).id) !== mIdStr
          );
          const updatedIds = (Array.isArray(p.team_member_ids) ? p.team_member_ids : []).filter(
            (id) => String(id) !== mIdStr
          );
          const updatedRoles = { ...(p.member_custom_roles || {}) };
          delete updatedRoles[mIdStr];

          const newLeader =
            String(p.leader_member_id) === mIdStr
              ? (updatedIds[0] ? String(updatedIds[0]) : '')
              : (p.leader_member_id || '');

          return {
            ...p,
            team_members: updatedTeam,
            team_member_ids: updatedIds,
            member_custom_roles: updatedRoles,
            leader_member_id: newLeader,
          };
        })
      );

      // Sync modal selection if open
      if (targetProject && String(targetProject.id) === String(projectId)) {
        setSelectedTeamMemberIds((prev) => prev.filter((id) => String(id) !== mIdStr));
        setMemberRolesMap((prev) => {
          const next = { ...prev };
          delete next[mIdStr];
          return next;
        });
      }

      setActionFeedback(`Removed ${displayName} from "${projTitle}".`);
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err) {
      console.error('Failed to remove member from project:', err);
      alert('Failed to remove member from project. Please try again.');
    } finally {
      setRemovingMemberId(null);
    }
  };

  const handleAddMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingMember(true);
    try {
      const newMember = await addDepartmentMember('Projects', {
        full_name: newMemberData.full_name,
        email: newMemberData.email,
        phone: newMemberData.phone,
        study_year: newMemberData.study_year,
        specialization: newMemberData.specialization,
        departments: ['Projects'],
        role: newMemberData.role,
        status: 'approved',
      });
      setMembers((prev) => [newMember, ...prev]);
      setAddMemberOpen(false);
      setNewMemberData({
        full_name: '',
        email: '',
        phone: '',
        study_year: 3,
        specialization: 'IRIIA',
        role: 'Hardware & IoT Engineer',
      });
    } catch (err) {
      console.error('Error adding member:', err);
    } finally {
      setAddingMember(false);
    }
  };

  const availableYears = Array.from(new Set(members.map((m) => m.study_year).filter(Boolean))).sort((a, b) => Number(a) - Number(b));
  const availableSpecializations = Array.from(new Set(members.map((m) => m.specialization).filter(Boolean) as string[])).sort();

  const filteredMembers = members.filter((m) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match =
        m.full_name?.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q) ||
        m.phone?.includes(q) ||
        m.role?.toLowerCase().includes(q) ||
        m.specialization?.toLowerCase().includes(q);
      if (!match) return false;
    }
    if (memberYearFilter !== 'all' && String(m.study_year) !== String(memberYearFilter)) {
      return false;
    }
    if (memberSpecializationFilter !== 'all' && m.specialization !== memberSpecializationFilter) {
      return false;
    }
    if (memberProjectFilter !== 'all') {
      const isAssigned = projects.some((p) =>
        (p.team_members || []).some((tm) => String(tm.member_id ?? (tm as any).id) === String(m.id)) ||
        (Array.isArray(p.team_member_ids) && p.team_member_ids.map(String).includes(String(m.id)))
      );
      if (memberProjectFilter === 'assigned' && !isAssigned) return false;
      if (memberProjectFilter === 'unassigned' && isAssigned) return false;
    }
    return true;
  });

  const assignAvailableYears = Array.from(new Set(members.map((m) => m.study_year).filter(Boolean))).sort((a, b) => Number(a) - Number(b));

  const assignFilteredMembers = members.filter((mem) => {
    if (assignSearchQuery) {
      const q = assignSearchQuery.toLowerCase();
      const match =
        mem.full_name?.toLowerCase().includes(q) ||
        mem.role?.toLowerCase().includes(q) ||
        mem.specialization?.toLowerCase().includes(q) ||
        mem.email?.toLowerCase().includes(q) ||
        String(mem.study_year).includes(q);
      if (!match) return false;
    }
    if (assignYearFilter !== 'all' && String(mem.study_year) !== String(assignYearFilter)) {
      return false;
    }
    const isSelected = selectedTeamMemberIds.some((id) => String(id) === String(mem.id));
    if (assignSelectionFilter === 'selected' && !isSelected) return false;
    if (assignSelectionFilter === 'unselected' && isSelected) return false;
    return true;
  });

  const activeProject = projects.find((p) => p.id === selectedProjectId) || projects[0];
  const activeEvent = events.find((e) => e.id === selectedEventId) || events[0];

  const assignedTeamList = (() => {
    if (!activeProject) return [];

    const memberIdsFromObj = (activeProject.team_members || []).map((tm) => tm.member_id ?? (tm as any).id);
    const memberIdsFromArr = Array.isArray(activeProject.team_member_ids) ? activeProject.team_member_ids : [];
    const allMemberIds = Array.from(new Set([...memberIdsFromObj, ...memberIdsFromArr])).filter(Boolean);

    if (allMemberIds.length === 0 && (!activeProject.team_members || activeProject.team_members.length === 0)) {
      return [];
    }

    return allMemberIds.map((mId) => {
      const tm = (activeProject.team_members || []).find((t) => String(t.member_id ?? (t as any).id) === String(mId));
      const found = members.find((m) => String(m.id) === String(mId));
      const realName = found?.full_name || (memberNamesMap[String(mId)] && memberNamesMap[String(mId)] !== 'Club Member' ? memberNamesMap[String(mId)] : (tm?.member_name && tm.member_name !== 'Club Member' && !tm.member_name.startsWith('Member #') ? tm.member_name : (memberNamesMap[String(mId)] || `Member #${mId}`)));
      const realRole = tm?.role_in_project && tm.role_in_project !== 'General Member'
        ? tm.role_in_project
        : (activeProject.member_custom_roles?.[String(mId)] || found?.role || 'Project Engineer & Developer');
      const email = tm?.email || found?.email || '';
      const phone = tm?.phone || found?.phone || '';
      const academic = found?.study_year ? `Yr ${found.study_year} • ${found.specialization || 'Projects'}` : '';

      return {
        member_id: mId,
        member_name: realName,
        role_in_project: realRole,
        email,
        phone,
        academic,
        foundMember: found,
      };
    });
  })();

  return (
    <div className="space-y-5 text-slate-900 max-w-7xl mx-auto pb-10">
      {/* Top Header Controls - Classic Minimal Light Theme */}
      <div className="bg-white border border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-100 text-slate-800 border border-slate-300 flex items-center justify-center">
            <FolderGit2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 bg-slate-100 px-2 py-0.5 border border-slate-200">
                Department Admin
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-medium text-slate-600">
                Connected
              </span>
            </div>
            <h1 className="text-lg font-bold text-slate-900 mt-0.5">Projects Administration</h1>
            <p className="text-xs text-slate-500">Head: {headConfig.name} • Engineering & Hardware Innovation</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 border border-slate-200 w-full sm:w-auto overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('projects')}
            className={`shrink-0 px-3 py-1.5 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'projects'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FolderGit2 className="w-3.5 h-3.5" />
            <span>Projects & Groups</span>
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`shrink-0 px-3 py-1.5 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'attendance'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Attendance</span>
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`shrink-0 px-3 py-1.5 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'members'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Members ({members.length})</span>
          </button>
        </div>
      </div>

      {/* Action Notification Banner */}
      <AnimatePresence>
        {actionFeedback && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-2.5 text-xs font-semibold flex items-center justify-between shadow-xs"
          >
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{actionFeedback}</span>
            </div>
            <button
              onClick={() => setActionFeedback(null)}
              className="text-emerald-700 hover:text-emerald-950 p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── TAB 1: PROJECTS & TEAM GROUPS ─────────────────────────────────── */}
      {activeTab === 'projects' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Projects List Column */}
          <div className="lg:col-span-1 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Club Projects ({projects.length})
              </h3>
              <button
                onClick={() => {
                  setProjectModalMode('add');
                  setProjectForm({
                    title: '',
                    category: 'Engineering & Innovation',
                    status: 'Active',
                    description: '',
                  });
                  setProjectModalOpen(true);
                }}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> New Project
              </button>
            </div>

            {projectsLoading ? (
              <div className="p-8 text-center bg-white border border-slate-200">
                <Loader2 className="w-6 h-6 animate-spin text-slate-600 mx-auto" />
              </div>
            ) : projects.length === 0 ? (
              <div className="p-8 text-center bg-white border border-slate-200 text-slate-500 text-xs">
                No projects created yet. Click "New Project" to start.
              </div>
            ) : (
              <div className="space-y-2">
                {projects.map((proj) => {
                  const isSelected = proj.id === selectedProjectId;
                  const teamCount = (proj.team_members || []).length;
                  return (
                    <div
                      key={proj.id}
                      onClick={() => setSelectedProjectId(proj.id)}
                      className={`p-3.5 border cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-slate-50 border-slate-900'
                          : 'bg-white border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="font-bold text-sm text-slate-900 line-clamp-1">{proj.title}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-100 text-slate-700 border border-slate-300">
                          {proj.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-2 mb-2 leading-relaxed">
                        {proj.description || 'No description provided.'}
                      </p>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                        <span className="font-medium text-slate-700">{proj.category || 'General'}</span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3 text-slate-400" /> {teamCount} Assigned
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Project Details & Team Roster Column */}
          <div className="lg:col-span-2 space-y-4">
            {activeProject ? (
              <div className="bg-white border border-slate-200 p-5 space-y-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono px-2 py-0.5 bg-slate-100 text-slate-800 border border-slate-200">
                        {activeProject.category || 'Engineering'}
                      </span>
                      <span className="text-xs font-mono px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200">
                        Status: {activeProject.status}
                      </span>
                    </div>
                    <h2 className="text-lg font-bold text-slate-900">{activeProject.title}</h2>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openTeamModal(activeProject)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <UserCheck className="w-3.5 h-3.5" /> Group / Assign Team
                    </button>
                    <button
                      onClick={() => {
                        setTargetProject(activeProject);
                        setProjectModalMode('edit');
                        setProjectForm({
                          title: activeProject.title,
                          category: activeProject.category || 'Engineering & Innovation',
                          status: activeProject.status || 'Active',
                          description: activeProject.description || '',
                        });
                        setProjectModalOpen(true);
                      }}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-colors cursor-pointer"
                      title="Edit Project"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteProject(activeProject.id)}
                      className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-colors cursor-pointer"
                      title="Delete Project"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Project Scope</h4>
                  <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 border border-slate-200">
                    {activeProject.description || 'No description entered for this project.'}
                  </p>
                </div>

                {/* Assigned Team Members */}
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-slate-600" />
                      <span>Assigned Project Working Group ({assignedTeamList.length})</span>
                    </h4>
                    {assignedTeamList.length > 0 && (
                      <span className="text-[11px] text-slate-500 hidden sm:inline">
                        Click Remove to unassign if mistakenly added
                      </span>
                    )}
                  </div>

                  {assignedTeamList.length === 0 ? (
                    <div className="text-center p-6 bg-slate-50 border border-slate-200 text-slate-500 text-xs">
                      No members assigned to this project yet. Click "Group / Assign Team" to add members.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <AnimatePresence>
                        {assignedTeamList.map((tm, idx) => {
                          const isRemoving = removingMemberId === String(tm.member_id);
                          return (
                            <motion.div
                              key={tm.member_id || idx}
                              layout
                              initial={{ opacity: 0, scale: 0.96 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.15 } }}
                              className="p-3 bg-slate-50 border border-slate-200 flex items-start justify-between gap-2.5 group hover:border-slate-300 transition-colors"
                            >
                              <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                <div className="w-7 h-7 bg-white text-slate-700 border border-slate-300 flex items-center justify-center font-bold text-xs shrink-0">
                                  {idx + 1}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <h5 className="font-semibold text-xs text-slate-900 line-clamp-1">{tm.member_name}</h5>
                                    {String(activeProject.leader_member_id) === String(tm.member_id) && (
                                      <span className="text-[9px] font-bold px-1.5 py-0.2 bg-amber-100 text-amber-800 border border-amber-300">
                                        Lead
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-600 font-medium line-clamp-1 mt-0.5">{tm.role_in_project}</p>
                                  {tm.academic && <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{tm.academic}</p>}
                                  {tm.email && <p className="text-[11px] text-slate-400 line-clamp-1">{tm.email}</p>}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleRemoveMemberFromProject(activeProject.id, tm.member_id, tm.member_name)}
                                disabled={isRemoving}
                                className="px-2 py-1 text-[11px] font-semibold text-slate-500 hover:text-red-700 hover:bg-red-50 border border-slate-200 hover:border-red-200 transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                                title={`Remove ${tm.member_name} from project`}
                              >
                                {isRemoving ? (
                                  <Loader2 className="w-3 h-3 animate-spin text-red-600" />
                                ) : (
                                  <UserMinus className="w-3.5 h-3.5 text-slate-400 group-hover:text-red-600" />
                                )}
                                <span className="hidden sm:inline">Remove</span>
                              </button>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 p-10 text-center text-slate-500 text-xs">
                Select a project from the left or create a new one.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 2: BOOTCAMPS & WORKSHOPS ATTENDANCE ──────────────────────── */}
      {activeTab === 'attendance' && (
        <div className="bg-white border border-slate-200 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-slate-700" />
                <span>Bootcamp & Workshop Attendance Checklist</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Tick or untick attendees. Status updates live to the cloud and syncs directly with the HR appraisal portal.
              </p>
            </div>

            {/* Event Selector */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label className="text-xs font-semibold text-slate-600 shrink-0">Event:</label>
              <select
                value={selectedEventId || ''}
                onChange={(e) => setSelectedEventId(Number(e.target.value))}
                className="w-full sm:w-64 px-3 py-1.5 bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-none"
              >
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title} {ev.date ? `(${ev.date})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Event Context Banner */}
          {activeEvent && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <span className="font-bold text-slate-900 block text-sm">{activeEvent.title}</span>
                <span className="text-slate-500">{activeEvent.location || 'Campus'} • {activeEvent.date || 'TBD'}</span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5 bg-white border border-slate-300 px-2 py-1">
                  <Sliders className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-[11px] font-bold text-slate-600">Eval Ratio:</span>
                  <input
                    type="number"
                    min="10"
                    max="300"
                    step="5"
                    value={workshopEvalRatio}
                    onChange={(e) => setWorkshopEvalRatio(Number(e.target.value) || 100)}
                    className="w-14 text-center font-mono font-bold text-xs text-slate-900 focus:outline-none"
                    title="Evaluation ratio / weight for workshop attendance"
                  />
                  <span className="text-xs font-mono font-bold text-slate-500">%</span>
                </div>

                <button
                  type="button"
                  onClick={handleExportWorkshopAttendanceCSV}
                  className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold border border-slate-300 transition-colors cursor-pointer"
                  title="Export Clean Attendance CSV"
                >
                  <Download className="w-3.5 h-3.5 text-slate-600" />
                  <span>Download Workshop Attendance (CSV)</span>
                </button>

                <div className="flex items-center gap-3 text-xs font-medium pl-1 border-l border-slate-300">
                  <span className="text-emerald-700 font-bold">
                    Present: {attendanceLogs.filter((r) => r.status === 'Present').length}
                  </span>
                  <span className="text-slate-600">
                    Total: {members.length}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Mobile Attendance List */}
          <div className="sm:hidden space-y-2">
            {members.map((mem) => {
              const numId = Number(String(mem.id).replace(/[^\d]/g, '')) || 0;
              const log = attendanceLogs.find((r) => Number(r.member_id) === numId);
              const isPresent = log?.status === 'Present';
              const isSaving = savingAttendanceId === numId;

              return (
                <div
                  key={mem.id}
                  onClick={() => !isSaving && handleToggleAttendance(mem, isPresent ? 'Present' : 'Absent')}
                  className={`p-3 border flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                    isPresent ? 'bg-emerald-50/60 border-emerald-300' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleAttendance(mem, isPresent ? 'Present' : 'Absent');
                      }}
                      className={`w-7 h-7 border flex items-center justify-center shrink-0 transition-colors ${
                        isPresent
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'bg-white border-slate-300 text-transparent'
                      }`}
                    >
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
                      ) : isPresent ? (
                        <Check className="w-4 h-4 stroke-[3]" />
                      ) : null}
                    </button>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs text-slate-900 truncate">{mem.full_name}</span>
                        {isPresent && (
                          <span className="text-[9px] font-mono px-1 py-0.2 bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Present
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 truncate">{mem.role}</p>
                      <p className="text-[10px] text-slate-400">Yr {mem.study_year} {mem.specialization ? `• ${mem.specialization}` : ''}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEvaluatingMember(mem);
                      }}
                      className="p-2 bg-teal-50 hover:bg-teal-100 text-[#0d5c63] border border-teal-200 transition-colors cursor-pointer"
                      title="Evaluate Member"
                    >
                      <Award className="w-3.5 h-3.5" />
                    </button>

                    {mem.phone && (
                      <a
                        href={`tel:${mem.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs"
                        title="Call member"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Attendance Table */}
          <div className="hidden sm:block overflow-x-auto border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5 text-center w-16">Attendance</th>
                  <th className="px-4 py-2.5">Member Name</th>
                  <th className="px-4 py-2.5">Year / Specialization</th>
                  <th className="px-4 py-2.5">Phone</th>
                  <th className="px-4 py-2.5">Project Role</th>
                  <th className="px-4 py-2.5 text-right w-24">Evaluate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {members.map((mem) => {
                  const numId = Number(String(mem.id).replace(/[^\d]/g, '')) || 0;
                  const log = attendanceLogs.find((r) => Number(r.member_id) === numId);
                  const isPresent = log?.status === 'Present';
                  const isSaving = savingAttendanceId === numId;

                  return (
                    <tr
                      key={mem.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        isPresent ? 'bg-emerald-50/50' : ''
                      }`}
                    >
                      <td className="px-4 py-2.5 text-center">
                        <button
                          onClick={() => handleToggleAttendance(mem, isPresent ? 'Present' : 'Absent')}
                          disabled={isSaving}
                          className={`w-5 h-5 border flex items-center justify-center mx-auto transition-colors cursor-pointer ${
                            isPresent
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : 'bg-white border-slate-300 text-transparent hover:border-slate-500'
                          }`}
                        >
                          {isSaving ? (
                            <Loader2 className="w-3 h-3 animate-spin text-slate-600" />
                          ) : isPresent ? (
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          ) : null}
                        </button>
                      </td>
                      <td className="px-4 py-2.5 font-semibold text-slate-900">
                        {mem.full_name}
                        {isPresent && (
                          <span className="ml-2 text-[10px] font-mono px-1.5 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Present
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">
                        Yr {mem.study_year} {mem.specialization ? `• ${mem.specialization}` : ''}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 font-mono">
                        {mem.phone ? (
                          <a href={`tel:${mem.phone}`} className="hover:underline">{mem.phone}</a>
                        ) : 'N/A'}
                      </td>
                      <td className="px-4 py-2.5 text-slate-800 font-medium">{mem.role}</td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => setEvaluatingMember(mem)}
                          className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-[#0d5c63] border border-teal-200 text-xs font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                          title="Evaluate Standing"
                        >
                          <Award className="w-3.5 h-3.5" />
                          <span>Evaluate</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB 3: PROJECTS MEMBERS DIRECTORY ────────────────────────────── */}
      {activeTab === 'members' && (
        <div className="bg-white border border-slate-200 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Projects Department Members ({filteredMembers.length})
              </h3>
              <p className="text-xs text-slate-500">
                Live recruitment database synchronization.
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search members..."
                  className="w-full pl-9 pr-7 py-1.5 bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <button
                onClick={() => setAddMemberOpen(true)}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1 transition-colors shrink-0 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" /> Add Member
              </button>
            </div>
          </div>

          {/* Members Search & Filtering Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-50 p-2.5 border border-slate-200 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-slate-500 font-semibold flex items-center gap-1 text-[11px] uppercase tracking-wider">
                <Filter className="w-3 h-3" /> Filter:
              </span>

              {/* Study Year */}
              <select
                value={memberYearFilter}
                onChange={(e) => setMemberYearFilter(e.target.value)}
                className="px-2 py-1 bg-white border border-slate-300 text-xs text-slate-700 font-medium focus:outline-none cursor-pointer"
              >
                <option value="all">All Study Years</option>
                {availableYears.map((yr) => (
                  <option key={String(yr)} value={String(yr)}>
                    Year {yr}
                  </option>
                ))}
              </select>

              {/* Specialization */}
              {availableSpecializations.length > 0 && (
                <select
                  value={memberSpecializationFilter}
                  onChange={(e) => setMemberSpecializationFilter(e.target.value)}
                  className="px-2 py-1 bg-white border border-slate-300 text-xs text-slate-700 font-medium focus:outline-none cursor-pointer max-w-[170px] truncate"
                >
                  <option value="all">All Specializations</option>
                  {availableSpecializations.map((spec) => (
                    <option key={spec} value={spec}>
                      {spec}
                    </option>
                  ))}
                </select>
              )}

              {/* Project Assignment Status */}
              <div className="inline-flex p-0.5 bg-white border border-slate-200 text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setMemberProjectFilter('all')}
                  className={`px-2 py-0.5 cursor-pointer transition-colors ${
                    memberProjectFilter === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({members.length})
                </button>
                <button
                  type="button"
                  onClick={() => setMemberProjectFilter('assigned')}
                  className={`px-2 py-0.5 cursor-pointer transition-colors ${
                    memberProjectFilter === 'assigned'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Assigned
                </button>
                <button
                  type="button"
                  onClick={() => setMemberProjectFilter('unassigned')}
                  className={`px-2 py-0.5 cursor-pointer transition-colors ${
                    memberProjectFilter === 'unassigned'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Unassigned
                </button>
              </div>

              {(searchQuery || memberYearFilter !== 'all' || memberSpecializationFilter !== 'all' || memberProjectFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setMemberYearFilter('all');
                    setMemberSpecializationFilter('all');
                    setMemberProjectFilter('all');
                  }}
                  className="text-[11px] text-slate-500 hover:text-slate-900 underline ml-1 cursor-pointer"
                >
                  Reset filters
                </button>
              )}
            </div>

            <span className="text-[11px] text-slate-500 font-mono">
              Showing {filteredMembers.length} of {members.length} members
            </span>
          </div>

          {membersLoading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-6 h-6 animate-spin text-slate-600 mx-auto" />
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No members found matching your search.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredMembers.map((mem) => {
                const assignedProjects = projects.filter((p) =>
                  (p.team_members || []).some((tm) => String(tm.member_id) === String(mem.id))
                );

                return (
                  <div
                    key={mem.id}
                    className="p-3.5 bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-2.5"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="font-bold text-xs text-slate-900">{mem.full_name}</h4>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 bg-white text-slate-700 border border-slate-200">
                          Yr {mem.study_year}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 font-medium">{mem.role}</p>
                      {mem.specialization && (
                        <p className="text-[11px] text-slate-500 mt-0.5">{mem.specialization}</p>
                      )}
                    </div>

                    <div className="space-y-1 text-xs text-slate-600 pt-2 border-t border-slate-200">
                      {mem.email && (
                        <div className="flex items-center gap-1.5 truncate">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span className="truncate">{mem.email}</span>
                        </div>
                      )}
                      {mem.phone && (
                        <div className="flex items-center gap-1.5 font-mono">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{mem.phone}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-200">
                      <span className="text-[10px] text-slate-500 block mb-1">Active Projects:</span>
                      {assignedProjects.length === 0 ? (
                        <span className="text-[10px] text-slate-400 italic">None</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {assignedProjects.map((p) => {
                            const isRemoving = removingMemberId === String(mem.id);
                            return (
                              <span
                                key={p.id}
                                className="text-[10px] px-1.5 py-0.5 bg-white text-slate-700 border border-slate-200 truncate max-w-[200px] inline-flex items-center gap-1 group/chip"
                              >
                                <span className="truncate">{p.title}</span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveMemberFromProject(p.id, mem.id, mem.full_name);
                                  }}
                                  disabled={isRemoving}
                                  className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-0.5 rounded transition-colors cursor-pointer"
                                  title={`Remove ${mem.full_name} from ${p.title}`}
                                >
                                  {isRemoving ? (
                                    <Loader2 className="w-2.5 h-2.5 animate-spin text-red-600" />
                                  ) : (
                                    <X className="w-2.5 h-2.5" />
                                  )}
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={() => setEvaluatingMember(mem)}
                        className="w-full py-1.5 bg-teal-50 hover:bg-teal-100 text-[#0d5c63] border border-teal-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        title="Evaluate Standing"
                      >
                        <Award className="w-3.5 h-3.5" />
                        <span>Evaluate Member Standing</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── MODAL: ADD / EDIT PROJECT ────────────────────────────────────── */}
      {projectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-slate-300 p-4 sm:p-5 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">
                {projectModalMode === 'add' ? 'Create New Project' : 'Edit Project'}
              </h3>
              <button
                onClick={() => setProjectModalOpen(false)}
                className="p-1 text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProject} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Project Title *</label>
                <input
                  type="text"
                  required
                  value={projectForm.title}
                  onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })}
                  placeholder="e.g. Solar Tracker & Energy Logger"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <input
                    type="text"
                    value={projectForm.category}
                    onChange={(e) => setProjectForm({ ...projectForm, category: e.target.value })}
                    placeholder="e.g. Solar Energy, IoT"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={projectForm.status}
                    onChange={(e) => setProjectForm({ ...projectForm, status: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-none"
                  >
                    <option value="Planning">Planning</option>
                    <option value="In Development">In Development</option>
                    <option value="Active">Active</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description & Goals</label>
                <textarea
                  rows={3}
                  value={projectForm.description}
                  onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                  placeholder="Outline hardware/software specs, deliverables, and club goals..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setProjectModalOpen(false)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Save Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: GROUP & ASSIGN MEMBERS TO PROJECT ──────────────────────── */}
      {teamModalOpen && targetProject && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-slate-300 p-4 sm:p-5 max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Assign Members & Roles</h3>
                <p className="text-xs text-slate-500">Project: {targetProject.title}</p>
              </div>
              <button
                onClick={() => setTeamModalOpen(false)}
                className="p-1 text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Select members from the Projects department roster and assign their specific working role in this project:
            </p>

            {/* Search and Filtering Bar in Assign Modal */}
            <div className="space-y-2 bg-slate-50 p-2.5 border border-slate-200">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={assignSearchQuery}
                  onChange={(e) => setAssignSearchQuery(e.target.value)}
                  placeholder="Search members by name, role, specialization..."
                  className="w-full pl-9 pr-8 py-1.5 bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-slate-500"
                />
                {assignSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setAssignSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-1.5">
                  <select
                    value={assignYearFilter}
                    onChange={(e) => setAssignYearFilter(e.target.value)}
                    className="px-2 py-1 bg-white border border-slate-300 text-xs text-slate-700 font-medium focus:outline-none cursor-pointer"
                  >
                    <option value="all">All Years</option>
                    {assignAvailableYears.map((yr) => (
                      <option key={String(yr)} value={String(yr)}>
                        Yr {yr}
                      </option>
                    ))}
                  </select>

                  <div className="inline-flex p-0.5 bg-white border border-slate-200 text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={() => setAssignSelectionFilter('all')}
                      className={`px-2 py-0.5 cursor-pointer transition-colors ${
                        assignSelectionFilter === 'all'
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      All ({members.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAssignSelectionFilter('selected')}
                      className={`px-2 py-0.5 cursor-pointer transition-colors ${
                        assignSelectionFilter === 'selected'
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Selected ({selectedTeamMemberIds.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAssignSelectionFilter('unselected')}
                      className={`px-2 py-0.5 cursor-pointer transition-colors ${
                        assignSelectionFilter === 'unselected'
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Unselected ({members.length - selectedTeamMemberIds.length})
                    </button>
                  </div>

                  {(assignSearchQuery || assignYearFilter !== 'all' || assignSelectionFilter !== 'all') && (
                    <button
                      type="button"
                      onClick={() => {
                        setAssignSearchQuery('');
                        setAssignYearFilter('all');
                        setAssignSelectionFilter('all');
                      }}
                      className="text-[11px] text-slate-500 hover:text-slate-900 underline ml-1 cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>

                <span className="text-[11px] text-slate-500 font-mono">
                  Showing {assignFilteredMembers.length} of {members.length}
                </span>
              </div>
            </div>

            {/* Currently Selected Members Quick Review Tray */}
            {selectedTeamMemberIds.length > 0 && (
              <div className="p-2.5 bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-slate-700">
                    Assigned to this project ({selectedTeamMemberIds.length}):
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Clear all assigned members for this project?')) {
                        setSelectedTeamMemberIds([]);
                      }
                    }}
                    className="text-red-600 hover:underline text-[11px] font-semibold cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {selectedTeamMemberIds.map((id) => {
                    const m = members.find((mem) => String(mem.id) === String(id));
                    const name = m?.full_name || memberNamesMap[String(id)] || `Member #${id}`;
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-white border border-slate-300 text-xs text-slate-800 font-medium shadow-2xs"
                      >
                        <span className="max-w-[140px] truncate">{name}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTeamMemberIds(selectedTeamMemberIds.filter((mId) => String(mId) !== String(id)));
                          }}
                          className="text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                          title={`Remove ${name} from assignment`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
              {assignFilteredMembers.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs border border-dashed border-slate-200 bg-slate-50">
                  No members match your search or filter.
                </div>
              ) : (
                assignFilteredMembers.map((mem) => {
                const isSelected = selectedTeamMemberIds.some((id) => String(id) === String(mem.id));
                return (
                  <div
                    key={mem.id}
                    className={`p-2.5 border transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 ${
                      isSelected
                        ? 'bg-slate-50 border-slate-900'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div
                      onClick={() => {
                        if (isSelected) {
                          setSelectedTeamMemberIds(selectedTeamMemberIds.filter((id) => String(id) !== String(mem.id)));
                        } else {
                          setSelectedTeamMemberIds([...selectedTeamMemberIds, mem.id]);
                          if (!memberRolesMap[String(mem.id)]) {
                            setMemberRolesMap({
                              ...memberRolesMap,
                              [String(mem.id)]: mem.role || 'Project Engineer & Developer',
                            });
                          }
                        }
                      }}
                      className="flex items-center gap-2.5 cursor-pointer flex-1"
                    >
                      <div
                        className={`w-4 h-4 border flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-slate-900 border-slate-900 text-white' : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <div>
                        <span className="font-semibold text-xs text-slate-900 block">{mem.full_name}</span>
                        <span className="text-[11px] text-slate-500">Yr {mem.study_year} • {mem.specialization || 'Projects'}</span>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="w-full sm:w-64 flex items-center gap-1.5">
                        <input
                          type="text"
                          value={memberRolesMap[String(mem.id)] || ''}
                          onChange={(e) =>
                            setMemberRolesMap({
                              ...memberRolesMap,
                              [String(mem.id)]: e.target.value,
                            })
                          }
                          placeholder="Role (e.g. Embedded, CAD)"
                          className="flex-1 px-2 py-1 bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTeamMemberIds(selectedTeamMemberIds.filter((id) => String(id) !== String(mem.id)));
                          }}
                          className="px-2 py-1 bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 border border-slate-300 hover:border-red-200 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                          title="Remove from assignment"
                        >
                          <UserMinus className="w-3 h-3" />
                          <span className="text-[10px]">Remove</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <span className="text-xs text-slate-600">
                {selectedTeamMemberIds.length} members selected for group
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTeamModalOpen(false)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveTeamAssignment}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
                >
                  Save Group Assignment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: ADD MEMBER DIRECTLY ────────────────────────────────────── */}
      {addMemberOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-slate-300 p-4 sm:p-5 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <h3 className="font-bold text-slate-900 text-sm">Add Projects Member</h3>
              <button onClick={() => setAddMemberOpen(false)} className="p-1 text-slate-500 hover:text-slate-900 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddMemberSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newMemberData.full_name}
                  onChange={(e) => setNewMemberData({ ...newMemberData, full_name: e.target.value })}
                  placeholder="e.g., Mohamed Batira"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={newMemberData.email}
                    onChange={(e) => setNewMemberData({ ...newMemberData, email: e.target.value })}
                    placeholder="student@example.dz"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone *</label>
                  <input
                    type="tel"
                    required
                    value={newMemberData.phone}
                    onChange={(e) => setNewMemberData({ ...newMemberData, phone: e.target.value })}
                    placeholder="06xxxxxxxx"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Role</label>
                <select
                  value={newMemberData.role}
                  onChange={(e) => setNewMemberData({ ...newMemberData, role: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-none"
                >
                  {(headConfig.defaultMemberRoles || ['Projects Member']).map((r, i) => (
                    <option key={i} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setAddMemberOpen(false)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingMember}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
                >
                  {addingMember ? 'Adding...' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: MEMBER EVALUATION & APPRAISAL ───────────────────────── */}
      <PortalMemberEvaluationModal
        member={evaluatingMember}
        department="Projects"
        isOpen={!!evaluatingMember}
        onClose={() => setEvaluatingMember(null)}
        onSaved={() => {
          loadMembers();
          setEvaluatingMember(null);
        }}
        isSuperAdmin={isSuperAdmin}
      />
    </div>
  );
}
