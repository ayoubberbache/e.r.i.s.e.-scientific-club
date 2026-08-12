import React, { useState, useEffect } from 'react';
import { 
  fetchDepartmentMembers, 
  addDepartmentMember, 
  deleteDepartmentMember, 
  grantDepartmentMemberRole,
  fetchStoredProjects,
  getStoredProjects,
  addOrUpdateProject,
  deleteProject,
  toggleMemberProjectAffiliation,
  batchAffiliateMembersToProject,
  assignMemberToProject,
  removeMemberFromProject
} from '../../lib/departmentStorage';
import { DEPARTMENT_HEADS } from '../../data/departmentHeads';
import { DepartmentMember, ClubProject } from '../../types/portals';
import { PortalMemberEvaluationModal } from './PortalMemberEvaluationModal';
import { PortalMemberCardGrid } from './PortalMemberCardGrid';
import { 
  Cpu, Wrench, UserPlus, Trash2, ShieldCheck, 
  Search, Plus, CheckCircle, ExternalLink, 
  Phone, Mail, GraduationCap, Download, 
  Loader2, Save, X, Edit, Check, Copy, 
  Sparkles, Layers, ListChecks, ArrowRight,
  TrendingUp, Users, Target, Calendar, CheckSquare, Square, UserCheck,
  FolderKanban, Award
} from 'lucide-react';

interface ProjectsPortalProps {
  onBackToAdmin?: () => void;
  isSuperAdmin?: boolean;
}

export function ProjectsPortal({ onBackToAdmin, isSuperAdmin }: ProjectsPortalProps) {
  const headConfig = DEPARTMENT_HEADS.Projects;

  // Active View: default to project_affiliation as primary!
  const [activeTab, setActiveTab] = useState<'project_affiliation' | 'projects' | 'members'>('project_affiliation');

  // Projects State
  const [projects, setProjects] = useState<ClubProject[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | number | null>(null);

  // Members State
  const [members, setMembers] = useState<DepartmentMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [affiliationFilter, setAffiliationFilter] = useState<'all' | 'affiliated' | 'unaffiliated'>('all');
  const [evaluatingMember, setEvaluatingMember] = useState<DepartmentMember | null>(null);

  // Selected Members for batch action
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);

  // Project Modal (Add / Edit)
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [projectModalMode, setProjectModalMode] = useState<'add' | 'edit'>('add');
  const [projectFormData, setProjectFormData] = useState<any>({
    title: '',
    status: 'Active',
    description: '',
  });

  // Add Member Modal
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

  // Role Modal
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [selectedMemberForRole, setSelectedMemberForRole] = useState<DepartmentMember | null>(null);
  const [newRoleValue, setNewRoleValue] = useState('');

  // Custom Role Edit for Project Assignment
  const [editingAssignment, setEditingAssignment] = useState<{ memberId: number; name: string; currentRole: string } | null>(null);
  const [customRoleInput, setCustomRoleInput] = useState('');
  const [copiedRoster, setCopiedRoster] = useState(false);

  useEffect(() => {
    loadProjects();
    loadMembers();
  }, []);

  const loadProjects = async () => {
    setProjectsLoading(true);
    try {
      const list = await fetchStoredProjects();
      setProjects(list);
      if (list.length > 0 && selectedProjectId === null) {
        setSelectedProjectId(list[0].id);
      }
    } catch (err) {
      console.error('Error loading projects:', err);
      const fallback = getStoredProjects();
      setProjects(fallback);
      if (fallback.length > 0 && selectedProjectId === null) {
        setSelectedProjectId(fallback[0].id);
      }
    } finally {
      setProjectsLoading(false);
    }
  };

  const loadMembers = async () => {
    setMembersLoading(true);
    try {
      const data = await fetchDepartmentMembers('Projects');
      setMembers(data);
    } catch (err) {
      console.error('Error loading projects members:', err);
    } finally {
      setMembersLoading(false);
    }
  };

  const currentProject = projects.find((p) => String(p.id) === String(selectedProjectId)) || projects[0];
  const currentTeamMembers = currentProject?.team_members || [];
  const affiliatedMemberIds = new Set(currentTeamMembers.map((m) => String(m.member_id)));

  // 1-Click Instant Toggle Project Affiliation
  const handleToggleAffiliation = async (member: DepartmentMember, defaultRole?: string) => {
    if (!currentProject) return;
    await toggleMemberProjectAffiliation(currentProject.id, member, defaultRole || 'Project Engineer & Developer');
    await loadProjects();
  };

  // 1-Click Quick Technical Role Assignment
  const handleSetMemberRole = async (memberId: number, roleName: string) => {
    if (!currentProject) return;
    const memberObj = members.find((m) => m.id === memberId);
    await assignMemberToProject(currentProject.id, {
      member_id: memberId,
      member_name: memberObj?.full_name || 'Engineer',
      role_in_project: roleName,
      assigned_at: new Date().toISOString(),
    });
    await loadProjects();
    setEditingAssignment(null);
  };

  // Batch Affiliation
  const handleBatchAffiliate = async (roleName?: string) => {
    if (!currentProject || selectedMemberIds.length === 0) return;
    const toAssign = members.filter((m) => selectedMemberIds.includes(m.id));
    await batchAffiliateMembersToProject(currentProject.id, toAssign, roleName || 'Project Engineer & Developer');
    await loadProjects();
    setSelectedMemberIds([]);
  };

  const toggleSelectMember = (id: number) => {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAllFiltered = (filteredList: DepartmentMember[]) => {
    if (selectedMemberIds.length === filteredList.length) {
      setSelectedMemberIds([]);
    } else {
      setSelectedMemberIds(filteredList.map((m) => m.id));
    }
  };

  // Copy Project Engineering Team Roster for WhatsApp
  const copyTeamRoster = () => {
    if (!currentProject) return;
    const lines = [
      `⚙️ *E.R.I.S.E. Projects Team Roster*`,
      `🚀 *Project:* ${currentProject.title}`,
      `🏷️ *Status:* ${currentProject.status || 'Active'}`,
      `👥 *Engineering Team Size:* ${currentTeamMembers.length}`,
      `──────────────────────────`,
      ...currentTeamMembers.map((m, idx) => {
        const fullMember = members.find(x => String(x.id) === String(m.member_id));
        const phoneTxt = fullMember?.phone ? ` | 📞 ${String(fullMember.phone)}` : '';
        return `${idx + 1}. *${m.member_name || 'Engineer'}* → ⚡ _${m.role_in_project || 'Lead Developer'}_${phoneTxt}`;
      }),
      `──────────────────────────`,
      `Supervisor: ${headConfig.name} (Head of Projects)`
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedRoster(true);
    setTimeout(() => setCopiedRoster(false), 2500);
  };

  const filteredMembers = members.filter((m) => {
    const nameStr = String(m.full_name || '');
    const roleStr = String(m.role || '');
    const specStr = String(m.specialization || '');
    const query = (searchQuery || '').toLowerCase();

    const matchesSearch =
      !query ||
      nameStr.toLowerCase().includes(query) ||
      roleStr.toLowerCase().includes(query) ||
      specStr.toLowerCase().includes(query);

    const isAffiliated = affiliatedMemberIds.has(String(m.id));
    if (affiliationFilter === 'affiliated') return matchesSearch && isAffiliated;
    if (affiliationFilter === 'unaffiliated') return matchesSearch && !isAffiliated;
    return matchesSearch;
  });

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectFormData.title?.trim()) return;
    try {
      await addOrUpdateProject(projectFormData);
      await loadProjects();
      setProjectModalOpen(false);
      setProjectFormData({ title: '', status: 'Active', description: '' });
    } catch (err) {
      console.error('Error saving project:', err);
    }
  };

  const handleDeleteProject = async (id: string | number, title: string) => {
    if (!window.confirm(`Are you sure you want to delete the project "${title}"?`)) return;
    try {
      await deleteProject(id);
      await loadProjects();
    } catch (err) {
      console.error('Error deleting project:', err);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberData.full_name) return;
    setAddingMember(true);
    try {
      await addDepartmentMember('Projects', newMemberData);
      await loadMembers();
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
      console.error('Failed to add projects member:', err);
    } finally {
      setAddingMember(false);
    }
  };

  const handleDeleteMember = async (id: number, name: string) => {
    if (!window.confirm(`Are you sure you want to remove ${name} from Projects?`)) return;
    await deleteDepartmentMember('Projects', id);
    await loadMembers();
    await loadProjects();
  };

  const handleGrantRole = () => {
    if (!selectedMemberForRole || !newRoleValue) return;
    grantDepartmentMemberRole(selectedMemberForRole.id, newRoleValue);
    setRoleModalOpen(false);
    loadMembers();
  };

  const exportMembersCsv = () => {
    const headers = ['ID', 'Full Name', 'Email', 'Phone', 'Year', 'Specialization', 'Technical Role'];
    const rows = members.map((m) => [
      m.id,
      `"${m.full_name}"`,
      m.email || '',
      m.phone || '',
      m.study_year || '',
      m.specialization || '',
      `"${m.role || ''}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ERISE_Projects_Engineers_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            Active
          </span>
        );
      case 'Finished':
      case 'Completed':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
            Finished
          </span>
        );
      case 'Discarded':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-rose-500/15 text-rose-400 border border-rose-500/30">
            Discarded
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
            {status || 'Active'}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* ── TOP DEPARTMENT BANNER ─────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-cyan-950/40 via-surface to-surface border border-cyan-500/20 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-full bg-cyan-500/5 blur-2xl pointer-events-none" />
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold shadow-lg shadow-cyan-500/10">
              <Cpu className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-primary tracking-tight">
                  Projects Department Portal
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 text-[10px] font-bold uppercase tracking-wider">
                  Head Port
                </span>
              </div>
              <p className="text-xs sm:text-sm text-secondary mt-0.5">
                Head: <strong className="text-primary font-bold">{headConfig.name}</strong> • Affiliating engineers & developers to technical projects
              </p>
            </div>
          </div>

          {/* View Switcher */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-dominant/80 border border-subtle">
            <button
              onClick={() => setActiveTab('project_affiliation')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all ${
                activeTab === 'project_affiliation'
                  ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/25'
                  : 'text-secondary hover:text-primary hover:bg-subtle/40'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>⚡ Project Team Affiliation</span>
              {currentTeamMembers.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px]">
                  {currentTeamMembers.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('projects')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                activeTab === 'projects'
                  ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/25'
                  : 'text-secondary hover:text-primary hover:bg-subtle/40'
              }`}
            >
              <FolderKanban className="w-3.5 h-3.5" />
              <span>Projects ({projects.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('members')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                activeTab === 'members'
                  ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/25'
                  : 'text-secondary hover:text-primary hover:bg-subtle/40'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Engineers Roster ({members.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── VIEW 1: ULTRA-SIMPLE PROJECT AFFILIATION BOARD (MAIN PURPOSE) ───── */}
      {activeTab === 'project_affiliation' && (
        <div className="space-y-6">
          {/* STEP 1: SELECT TARGET PROJECT */}
          <div className="bg-surface border border-subtle rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-md border border-cyan-500/20">
                  Step 1: Select Target Project
                </span>
                <h2 className="text-base sm:text-lg font-bold text-primary mt-1">
                  Which project are you staffing engineers for?
                </h2>
              </div>

              {currentProject && (
                <button
                  onClick={copyTeamRoster}
                  className="px-3.5 py-2 rounded-xl bg-dominant hover:bg-subtle text-primary border border-subtle text-xs font-bold flex items-center gap-2 transition-colors shadow-sm"
                  title="Copy engineering team roster to WhatsApp"
                >
                  {copiedRoster ? <Check className="w-3.5 h-3.5 text-cyan-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
                  <span>{copiedRoster ? 'Team Roster Copied!' : 'Copy WhatsApp Team Roster'}</span>
                </button>
              )}
            </div>

            {/* Projects Horizontal Slider/Pills */}
            {projectsLoading ? (
              <div className="py-6 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
              </div>
            ) : projects.length === 0 ? (
              <div className="p-6 text-center text-muted bg-dominant rounded-2xl border border-dashed border-subtle">
                No active projects found. Click "Projects" tab to create your first project.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {projects.map((proj) => {
                  const isSelected = String(proj.id) === String(currentProject?.id);
                  const count = proj.team_members?.length || 0;
                  return (
                    <div
                      key={proj.id}
                      onClick={() => setSelectedProjectId(proj.id)}
                      className={`p-3.5 rounded-2xl cursor-pointer transition-all border text-left flex flex-col justify-between gap-2 relative ${
                        isSelected
                          ? 'bg-cyan-500/10 border-cyan-500/40 shadow-md shadow-cyan-500/5 ring-2 ring-cyan-500/20'
                          : 'bg-dominant border-subtle hover:border-subtle/80 hover:bg-surface'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          {getStatusBadge(proj.status)}
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 ${
                            count > 0 ? 'bg-cyan-500/20 text-cyan-400' : 'bg-subtle text-muted'
                          }`}>
                            <Users className="w-2.5 h-2.5" />
                            {count} {count === 1 ? 'member' : 'members'}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-primary mt-2 line-clamp-1">
                          {proj.title}
                        </h3>
                        <p className="text-[11px] text-secondary line-clamp-2 mt-0.5">
                          {proj.description || 'Club engineering project.'}
                        </p>
                      </div>
                      {isSelected && (
                        <div className="flex items-center gap-1 text-[10px] font-extrabold text-cyan-400 pt-1 border-t border-cyan-500/20">
                          <CheckCircle className="w-3 h-3" /> Selected Project
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* STEP 2: 1-CLICK INSTANT MEMBER AFFILIATION */}
          {currentProject && (
            <div className="bg-surface border border-subtle rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-md border border-cyan-500/20">
                    Step 2: 1-Click Engineer Affiliation
                  </span>
                  <h2 className="text-base sm:text-lg font-bold text-primary mt-1">
                    Staffing for: <span className="text-cyan-400 font-extrabold">"{currentProject.title}"</span>
                  </h2>
                  <p className="text-xs text-muted">
                    Click <strong>[ + Affiliate ]</strong> next to any engineer to assign them to this project's development team.
                  </p>
                </div>

                {/* Filter & Batch Actions */}
                <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
                  <div className="flex items-center p-1 rounded-xl bg-dominant border border-subtle text-xs">
                    <button
                      onClick={() => setAffiliationFilter('all')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                        affiliationFilter === 'all' ? 'bg-cyan-500 text-white' : 'text-secondary'
                      }`}
                    >
                      All ({members.length})
                    </button>
                    <button
                      onClick={() => setAffiliationFilter('affiliated')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                        affiliationFilter === 'affiliated' ? 'bg-cyan-500 text-white' : 'text-secondary'
                      }`}
                    >
                      On Team ({currentTeamMembers.length})
                    </button>
                    <button
                      onClick={() => setAffiliationFilter('unaffiliated')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                        affiliationFilter === 'unaffiliated' ? 'bg-cyan-500 text-white' : 'text-secondary'
                      }`}
                    >
                      Available ({members.length - currentTeamMembers.length})
                    </button>
                  </div>

                  {selectedMemberIds.length > 0 && (
                    <button
                      onClick={() => handleBatchAffiliate()}
                      className="px-3.5 py-1.5 rounded-xl bg-cyan-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-500/20 transition-transform active:scale-95"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Affiliate Selected ({selectedMemberIds.length})</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Search & Select All Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search engineer by name or skill..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-dominant border border-subtle text-xs text-primary focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end text-xs text-muted">
                  <button
                    onClick={() => selectAllFiltered(filteredMembers)}
                    className="flex items-center gap-1.5 text-xs font-bold text-secondary hover:text-primary transition-colors"
                  >
                    {selectedMemberIds.length === filteredMembers.length && filteredMembers.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-cyan-400" />
                    ) : (
                      <Square className="w-4 h-4 text-muted" />
                    )}
                    <span>Select All Filtered ({filteredMembers.length})</span>
                  </button>
                </div>
              </div>

              {/* Members Affiliation Cards Grid */}
              {membersLoading ? (
                <div className="py-12 flex justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
                </div>
              ) : filteredMembers.length === 0 ? (
                <div className="py-8 text-center text-muted bg-dominant rounded-2xl border border-dashed border-subtle">
                  No engineers matched your search or filter.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredMembers.map((member) => {
                    const assignment = currentTeamMembers.find(
                      (m) => String(m.member_id) === String(member.id)
                    );
                    const isAffiliated = !!assignment;
                    const isSelected = selectedMemberIds.includes(member.id);

                    return (
                      <div
                        key={member.id}
                        className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                          isAffiliated
                            ? 'bg-cyan-950/20 border-cyan-500/40 shadow-sm'
                            : 'bg-dominant/80 border-subtle hover:border-subtle/80'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => toggleSelectMember(member.id)}
                              className="p-1 text-muted hover:text-primary"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-cyan-400" />
                              ) : (
                                <Square className="w-4 h-4 text-muted" />
                              )}
                            </button>
                            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-black text-sm border border-cyan-500/20 shrink-0">
                              {(member.full_name || 'Member').charAt(0)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-sm font-bold text-primary leading-tight">
                                  {member.full_name || 'Member'}
                                </h4>
                                {member.study_year && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-subtle text-muted">
                                    Y{member.study_year} {member.specialization || ''}
                                  </span>
                                )}
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center gap-1">
                                  {Math.round(member.rating ?? 50)}% Rating
                                </span>
                              </div>
                              <p className="text-[11px] text-muted mt-0.5">
                                Technical Role: <span className="text-secondary">{member.role || 'Hardware & IoT'}</span>
                              </p>
                              {member.phone && (
                                <a 
                                  href={`https://wa.me/${String(member.phone).replace(/[^0-9]/g, '')}`}
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="text-[10px] text-cyan-400/90 hover:underline flex items-center gap-1 mt-0.5"
                                >
                                  <Phone className="w-2.5 h-2.5" /> {String(member.phone)}
                                </a>
                              )}
                            </div>
                          </div>

                          {/* 1-CLICK INSTANT TOGGLE BUTTON */}
                          <div>
                            {isAffiliated ? (
                              <button
                                onClick={() => handleToggleAffiliation(member)}
                                className="px-3.5 py-1.5 rounded-xl bg-cyan-500 text-white hover:bg-red-500/90 text-xs font-extrabold flex items-center gap-1.5 shadow-md shadow-cyan-500/20 transition-all group"
                                title="Click to remove from project team"
                              >
                                <Check className="w-3.5 h-3.5 group-hover:hidden" />
                                <X className="w-3.5 h-3.5 hidden group-hover:inline" />
                                <span className="group-hover:hidden">On Team</span>
                                <span className="hidden group-hover:inline">Remove</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleToggleAffiliation(member)}
                                className="px-3.5 py-1.5 rounded-xl bg-dominant hover:bg-cyan-500 hover:text-white text-cyan-400 border border-cyan-500/30 text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>+ Affiliate</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* IF ASSIGNED: DISPLAY ONLY SPECIFIC TECHNICAL ROLE AND ADD/EDIT SPECIFIC ROLE BUTTON */}
                        {isAffiliated && assignment && (
                          <div className="p-3 rounded-2xl bg-surface/90 border border-cyan-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[11px] font-bold text-muted flex items-center gap-1">
                                🛠️ Specific Technical Role:
                              </span>
                              {assignment.role_in_project && assignment.role_in_project !== 'Project Engineer & Developer' ? (
                                <span className="px-3 py-1 rounded-xl bg-cyan-500/15 text-cyan-400 font-extrabold text-xs border border-cyan-500/30 shadow-sm">
                                  {assignment.role_in_project}
                                </span>
                              ) : (
                                <span className="text-xs text-muted italic">No specific role set</span>
                              )}
                            </div>

                            <button
                              onClick={() => {
                                setEditingAssignment({
                                  memberId: member.id,
                                  name: member.full_name,
                                  currentRole: assignment.role_in_project === 'Project Engineer & Developer' ? '' : assignment.role_in_project,
                                });
                                setCustomRoleInput(assignment.role_in_project === 'Project Engineer & Developer' ? '' : assignment.role_in_project);
                              }}
                              className="px-3.5 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-extrabold flex items-center gap-1.5 transition-colors shadow-sm"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>{assignment.role_in_project && assignment.role_in_project !== 'Project Engineer & Developer' ? 'Edit Specific Role' : 'Add a Specific Role'}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── VIEW 2: PROJECTS DIRECTORY & GOALS (MATCHING HR HUB, NO PROGRESS BAR) */}
      {activeTab === 'projects' && (
        <div className="bg-surface border border-subtle rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-lg font-bold text-primary">Projects Directory</h2>
              <p className="text-xs text-muted">Technical engineering projects and software innovations registered in database.</p>
            </div>
            <button
              onClick={() => {
                setProjectModalMode('add');
                setProjectFormData({ title: '', status: 'Active', description: '' });
                setProjectModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> <span>Create New Project</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((proj) => (
              <div key={proj.id} className="bg-dominant border border-subtle rounded-2xl p-5 flex flex-col justify-between gap-4 shadow-sm hover:border-cyan-500/30 transition-all">
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center">
                    {getStatusBadge(proj.status)}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setProjectModalMode('edit');
                          setProjectFormData(proj);
                          setProjectModalOpen(true);
                        }}
                        className="p-1.5 text-secondary hover:text-cyan-400 rounded-lg hover:bg-surface border border-transparent hover:border-subtle transition-colors"
                        title="Edit Project"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteProject(proj.id, proj.title)}
                        className="p-1.5 text-secondary hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors"
                        title="Delete Project"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-primary leading-snug">{proj.title}</h3>
                  {proj.description && (
                    <p className="text-xs text-secondary line-clamp-3 leading-relaxed">{proj.description}</p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-subtle text-xs">
                  <span className="text-muted text-[11px] font-medium flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-cyan-400" />
                    {proj.team_members?.length || 0} Assigned Members
                  </span>
                  <button
                    onClick={() => {
                      setSelectedProjectId(proj.id);
                      setActiveTab('project_affiliation');
                    }}
                    className="text-cyan-400 hover:underline font-bold text-xs flex items-center gap-1"
                  >
                    Manage Team →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── VIEW 3: ENGINEERS ROSTER ───────────────────────────────────────── */}
      {activeTab === 'members' && (
        <div className="bg-surface border border-subtle rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-lg font-bold text-primary">
                Projects Engineers Roster ({members.length} Members)
              </h2>
              <p className="text-xs text-muted">
                Manage technical engineers, hardware leads, developers, and researchers.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={exportMembersCsv}
                className="px-3.5 py-2 rounded-xl bg-dominant hover:bg-subtle text-primary border border-subtle text-xs font-bold flex items-center gap-2 transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> <span>Export CSV</span>
              </button>
              <button
                onClick={() => setAddMemberOpen(true)}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all"
              >
                <UserPlus className="w-3.5 h-3.5" /> <span>Add Engineer</span>
              </button>
            </div>
          </div>

          {/* Engineers Expandable Card Grid */}
          <PortalMemberCardGrid
            members={members}
            department="Projects"
            onOpenRoleModal={(m) => {
              setSelectedMemberForRole(m);
              setNewRoleValue(m.role || 'Hardware & IoT Engineer');
              setRoleModalOpen(true);
            }}
            onDeleteMember={(id) => {
              const target = members.find((x) => String(x.id) === String(id));
              if (target) handleDeleteMember(Number(id), target.full_name);
            }}
            onOpenEvaluation={(m) => setEvaluatingMember(m)}
          />
        </div>
      )}

      {/* ── MODAL: CUSTOM TECHNICAL ROLE EDIT ──────────────────────────────── */}
      {editingAssignment && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-subtle rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-primary">Technical Role: {editingAssignment.name}</h3>
              <button onClick={() => setEditingAssignment(null)} className="text-muted hover:text-primary">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1">
                Enter Custom Engineering Role in Project
              </label>
              <input
                type="text"
                value={customRoleInput}
                onChange={(e) => setCustomRoleInput(e.target.value)}
                placeholder="e.g. Embedded C++ Developer"
                className="w-full bg-dominant border border-subtle rounded-xl px-4 py-2.5 text-primary text-sm focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditingAssignment(null)}
                className="px-4 py-2 rounded-xl bg-dominant text-secondary hover:bg-subtle text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSetMemberRole(editingAssignment.memberId, customRoleInput)}
                className="px-4 py-2 rounded-xl bg-cyan-500 text-white hover:bg-cyan-600 text-xs font-bold"
              >
                Save Role
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: ADD MEMBER ─────────────────────────────────────────────── */}
      {addMemberOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-subtle rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-primary">Add Projects Engineer</h3>
              <button onClick={() => setAddMemberOpen(false)} className="text-muted hover:text-primary">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddMember} className="space-y-3 text-xs">
              <div>
                <label className="block text-muted font-bold mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newMemberData.full_name}
                  onChange={(e) => setNewMemberData({ ...newMemberData, full_name: e.target.value })}
                  placeholder="e.g. Adnan Djanfi"
                  className="w-full bg-dominant border border-subtle rounded-xl px-3 py-2 text-primary focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-muted font-bold mb-1">Email</label>
                <input
                  type="email"
                  value={newMemberData.email}
                  onChange={(e) => setNewMemberData({ ...newMemberData, email: e.target.value })}
                  placeholder="adnan@example.com"
                  className="w-full bg-dominant border border-subtle rounded-xl px-3 py-2 text-primary focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-muted font-bold mb-1">Phone (WhatsApp)</label>
                <input
                  type="text"
                  value={newMemberData.phone}
                  onChange={(e) => setNewMemberData({ ...newMemberData, phone: e.target.value })}
                  placeholder="0550 11 22 33"
                  className="w-full bg-dominant border border-subtle rounded-xl px-3 py-2 text-primary focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-muted font-bold mb-1">Study Year</label>
                  <select
                    value={newMemberData.study_year}
                    onChange={(e) => setNewMemberData({ ...newMemberData, study_year: Number(e.target.value) })}
                    className="w-full bg-dominant border border-subtle rounded-xl px-3 py-2 text-primary focus:border-cyan-500 focus:outline-none"
                  >
                    <option value={1}>1st Year (CP1)</option>
                    <option value={2}>2nd Year (CP2)</option>
                    <option value={3}>3rd Year (CS1)</option>
                    <option value={4}>4th Year (CS2)</option>
                    <option value={5}>5th Year (CS3)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-muted font-bold mb-1">Specialization</label>
                  <input
                    type="text"
                    value={newMemberData.specialization}
                    onChange={(e) => setNewMemberData({ ...newMemberData, specialization: e.target.value })}
                    placeholder="IRIIA / ENR / SE"
                    className="w-full bg-dominant border border-subtle rounded-xl px-3 py-2 text-primary focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-muted font-bold mb-1">Technical Role</label>
                <input
                  type="text"
                  value={newMemberData.role}
                  onChange={(e) => setNewMemberData({ ...newMemberData, role: e.target.value })}
                  placeholder="e.g. Hardware & IoT Engineer"
                  className="w-full bg-dominant border border-subtle rounded-xl px-3 py-2 text-primary focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddMemberOpen(false)}
                  className="px-4 py-2 rounded-xl bg-dominant text-secondary hover:bg-subtle text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingMember}
                  className="px-4 py-2 rounded-xl bg-cyan-500 text-white font-bold hover:bg-cyan-600"
                >
                  {addingMember ? 'Adding...' : 'Add Engineer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: GRANT ROLE ─────────────────────────────────────────────── */}
      {roleModalOpen && selectedMemberForRole && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-subtle rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-primary">Grant Role: {selectedMemberForRole.full_name}</h3>
              <button onClick={() => setRoleModalOpen(false)} className="text-muted hover:text-primary">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1">
                Select or Enter Technical Role
              </label>
              <input
                type="text"
                value={newRoleValue}
                onChange={(e) => setNewRoleValue(e.target.value)}
                placeholder="e.g. Embedded C++ Developer"
                className="w-full bg-dominant border border-subtle rounded-xl px-4 py-2.5 text-primary text-sm focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRoleModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-dominant text-secondary hover:bg-subtle text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleGrantRole}
                className="px-4 py-2 rounded-xl bg-cyan-500 text-white font-bold hover:bg-cyan-600"
              >
                Save Role
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: ADD / EDIT PROJECT (MATCHING HR HUB - NO PROGRESS BAR) ────── */}
      {projectModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-subtle rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-primary">
                {projectModalMode === 'add' ? 'Create New Project' : 'Edit Project'}
              </h3>
              <button onClick={() => setProjectModalOpen(false)} className="text-muted hover:text-primary">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveProject} className="space-y-4 text-xs">
              <div>
                <label className="block text-muted font-bold mb-1.5 uppercase tracking-wider text-[10px]">
                  Project Name / Title
                </label>
                <input
                  type="text"
                  required
                  value={projectFormData.title || ''}
                  onChange={(e) => setProjectFormData({ ...projectFormData, title: e.target.value })}
                  placeholder="e.g. Smart Solar Microgrid Inverter"
                  className="w-full bg-dominant border border-subtle rounded-xl px-4 py-2.5 text-primary text-sm focus:border-cyan-500 focus:outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-muted font-bold mb-1.5 uppercase tracking-wider text-[10px]">
                  Status
                </label>
                <select
                  value={projectFormData.status || 'Active'}
                  onChange={(e) => setProjectFormData({ ...projectFormData, status: e.target.value })}
                  className="w-full bg-dominant border border-subtle rounded-xl px-4 py-2.5 text-primary text-sm focus:border-cyan-500 focus:outline-none font-medium"
                >
                  <option value="Active">Active</option>
                  <option value="Finished">Finished</option>
                  <option value="Discarded">Discarded</option>
                </select>
              </div>

              <div>
                <label className="block text-muted font-bold mb-1.5 uppercase tracking-wider text-[10px]">
                  Description & Scope
                </label>
                <textarea
                  rows={3}
                  value={projectFormData.description || ''}
                  onChange={(e) => setProjectFormData({ ...projectFormData, description: e.target.value })}
                  placeholder="Brief description of the project scope, technical stack, or research objectives..."
                  className="w-full bg-dominant border border-subtle rounded-xl px-4 py-2.5 text-primary text-sm focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setProjectModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-dominant text-secondary hover:bg-subtle text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white font-extrabold text-xs shadow-lg shadow-cyan-500/20"
                >
                  {projectModalMode === 'add' ? 'Create Project' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Member Rating Evaluation Modal */}
      {evaluatingMember && (
        <PortalMemberEvaluationModal
          member={evaluatingMember}
          department="Projects"
          isOpen={!!evaluatingMember}
          onClose={() => setEvaluatingMember(null)}
          onSaved={() => loadMembers()}
          isSuperAdmin={isSuperAdmin}
        />
      )}
    </div>
  );
}
