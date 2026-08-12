import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  fetchDepartmentMembers, 
  addDepartmentMember, 
  deleteDepartmentMember, 
  grantDepartmentMemberRole,
  fetchEventAssignmentsFromSupabase,
  getEventStaffAssignments,
  toggleMemberEventAffiliation,
  batchAffiliateMembersToEvent,
  removeMemberFromEvent,
  updateEventAssignmentRole,
  isUpcomingOrActiveEvent
} from '../../lib/departmentStorage';
import { DEPARTMENT_HEADS } from '../../data/departmentHeads';
import { DepartmentMember, EventStaffAssignment } from '../../types/portals';
import { PortalMemberEvaluationModal } from './PortalMemberEvaluationModal';
import { PortalMemberCardGrid } from './PortalMemberCardGrid';
import { 
  Camera, Video, UserPlus, Trash2, ShieldCheck, 
  Search, Plus, CheckCircle, ExternalLink, 
  Phone, Mail, GraduationCap, Download, 
  Loader2, Save, X, Edit, Check, Copy, 
  Sparkles, Film, Image as ImageIcon, Share2, 
  CheckCheck, Clock, CheckSquare, Square, UserCheck, Users, Award
} from 'lucide-react';

interface MediaPortalProps {
  onBackToAdmin?: () => void;
  isSuperAdmin?: boolean;
}

export function MediaPortal({ onBackToAdmin, isSuperAdmin }: MediaPortalProps) {
  const headConfig = DEPARTMENT_HEADS?.Media || {
    name: 'Matriche Abderrahmane',
    roleTitle: 'Head of Media',
    department: 'Media'
  };

  // Active View: default to event_affiliation as primary!
  const [activeTab, setActiveTab] = useState<'event_affiliation' | 'members' | 'deliverables'>('event_affiliation');

  // Members state
  const [members, setMembers] = useState<DepartmentMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [affiliationFilter, setAffiliationFilter] = useState<'all' | 'affiliated' | 'unaffiliated'>('all');
  const [evaluatingMember, setEvaluatingMember] = useState<DepartmentMember | null>(null);

  // Selected Members for batch action
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);

  // Events state
  const [events, setEvents] = useState<any[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);

  // Coverage Assignments state
  const [coverageAssignments, setCoverageAssignments] = useState<EventStaffAssignment[]>([]);
  const [copiedRoster, setCopiedRoster] = useState(false);

  // Custom Duty Edit
  const [editingAssignment, setEditingAssignment] = useState<{ id: string; name: string; currentDuty: string } | null>(null);
  const [customDutyInput, setCustomDutyInput] = useState('');

  // Add Member Modal
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [newMemberData, setNewMemberData] = useState({
    full_name: '',
    email: '',
    phone: '',
    study_year: 3,
    specialization: 'ENR',
    role: 'Lead Photographer',
  });
  const [addingMember, setAddingMember] = useState(false);

  // Role Modal
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [selectedMemberForRole, setSelectedMemberForRole] = useState<DepartmentMember | null>(null);
  const [newRoleValue, setNewRoleValue] = useState('');

  useEffect(() => {
    loadMembers();
    loadEvents();
    loadAssignments();
  }, []);

  const loadMembers = async () => {
    setMembersLoading(true);
    try {
      const data = await fetchDepartmentMembers('Media');
      setMembers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading media members:', err);
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
        const activeOnly = data.filter((e) => isUpcomingOrActiveEvent(e.date, e.status));
        setEvents(activeOnly);
        if (activeOnly.length > 0 && selectedEventId === null) {
          setSelectedEventId(activeOnly[0].id);
        }
      }
    } catch (err) {
      console.error('Error loading events:', err);
    } finally {
      setEventsLoading(false);
    }
  };

  const loadAssignments = async () => {
    try {
      const list = await fetchEventAssignmentsFromSupabase('Media', currentEvent?.id);
      setCoverageAssignments(Array.isArray(list) ? list : []);
    } catch {
      setCoverageAssignments([]);
    }
  };

  useEffect(() => {
    loadAssignments();
  }, [selectedEventId]);

  const currentEvent = events.find((e) => e?.id === selectedEventId) || events[0] || null;
  const currentEventAssignments = coverageAssignments.filter((a) => a && currentEvent && a.event_id === currentEvent.id);
  const affiliatedMemberIds = new Set(currentEventAssignments.map((a) => String(a.member_id)));

  // 1-Click Instant Toggle Affiliation
  const handleToggleAffiliation = async (member: DepartmentMember, defaultDuty?: string) => {
    if (!currentEvent || !member) return;

    const rawMemberId = String(member.id).replace(/^reg-|^leader-|^mem-/, '');
    const numericEventId = Number(String(currentEvent.id).replace(/^evt-/, ''));

    const isCurrentlyAffiliated = coverageAssignments.some(
      (a) => a && Number(a.event_id) === numericEventId && String(a.member_id).replace(/^reg-|^leader-|^mem-/, '') === rawMemberId
    );

    // Instant local state update
    if (isCurrentlyAffiliated) {
      setCoverageAssignments((prev) =>
        prev.filter((a) => a && String(a.member_id).replace(/^reg-|^leader-|^mem-/, '') !== rawMemberId)
      );
    } else {
      const newAssignment: EventStaffAssignment = {
        id: `assign-${numericEventId}-${rawMemberId}`,
        event_id: numericEventId,
        event_title: currentEvent.title,
        department: 'Media',
        member_id: member.id,
        member_name: member.full_name,
        member_email: member.email,
        member_phone: member.phone,
        assigned_role: defaultDuty || member.role || 'Event Coverage Crew',
        status: 'Assigned',
        assigned_at: new Date().toISOString(),
      };
      setCoverageAssignments((prev) => [newAssignment, ...prev]);
    }

    // Async Supabase Sync with Explicit Action
    const actionToPerform = isCurrentlyAffiliated ? 'remove' : 'add';
    await toggleMemberEventAffiliation('Media', currentEvent, member, defaultDuty || 'Event Coverage Crew', actionToPerform);
    await loadAssignments();
  };

  // 1-Click Quick Duty Assignment
  const handleSetMemberDuty = async (assignmentId: string, duty: string) => {
    const target = coverageAssignments.find((a) => a.id === assignmentId);
    if (!currentEvent || !target) return;
    await updateEventAssignmentRole('Media', currentEvent.id, target.member_id, duty);
    await loadAssignments();
    setEditingAssignment(null);
  };

  // Batch Affiliation
  const handleBatchAffiliate = async (duty?: string) => {
    if (!currentEvent || selectedMemberIds.length === 0) return;
    const toAssign = members.filter((m) => selectedMemberIds.includes(m.id));
    await batchAffiliateMembersToEvent('Media', currentEvent, toAssign, duty || 'Event Coverage Crew');
    await loadAssignments();
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

  // Copy Media Coverage Roster for WhatsApp
  const copyCoverageRoster = () => {
    if (!currentEvent) return;
    const lines = [
      `📸 *E.R.I.S.E. Media Coverage Team Roster*`,
      `📅 *Event:* ${currentEvent.title || 'Event'}`,
      `📍 *Location:* ${currentEvent.location || 'HNS-RE2SD'}`,
      `⏰ *Date/Time:* ${currentEvent.date || ''} ${currentEvent.time || ''}`,
      `👥 *Assigned Media Crew:* ${currentEventAssignments.length}`,
      `──────────────────────────`,
      ...currentEventAssignments.map((a, idx) => {
        const phoneTxt = a.member_phone ? ` | 📞 ${String(a.member_phone)}` : '';
        return `${idx + 1}. *${a.member_name || 'Member'}* → 🎥 _${a.assigned_role || 'Coverage'}_${phoneTxt}`;
      }),
      `──────────────────────────`,
      `Prepared by: ${headConfig?.name || 'Head of Media'} (Head of Media)`
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedRoster(true);
    setTimeout(() => setCopiedRoster(false), 2500);
  };

  const filteredMembers = members.filter((m) => {
    if (!m) return false;
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

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberData.full_name) return;
    setAddingMember(true);
    try {
      await addDepartmentMember('Media', newMemberData);
      await loadMembers();
      setAddMemberOpen(false);
      setNewMemberData({
        full_name: '',
        email: '',
        phone: '',
        study_year: 3,
        specialization: 'ENR',
        role: 'Lead Photographer',
      });
    } catch (err) {
      console.error('Failed to add media member:', err);
    } finally {
      setAddingMember(false);
    }
  };

  const handleDeleteMember = async (id: number, name: string) => {
    if (!window.confirm(`Are you sure you want to remove ${name} from Media?`)) return;
    await deleteDepartmentMember('Media', id);
    await loadMembers();
    loadAssignments();
  };

  const handleGrantRole = () => {
    if (!selectedMemberForRole || !newRoleValue) return;
    grantDepartmentMemberRole(selectedMemberForRole.id, newRoleValue);
    setRoleModalOpen(false);
    loadMembers();
  };

  const exportMembersCsv = () => {
    const headers = ['ID', 'Full Name', 'Email', 'Phone', 'Year', 'Specialization', 'Specialized Role'];
    const rows = members.map((m) => [
      m.id,
      `"${m.full_name || ''}"`,
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
    link.setAttribute('download', `ERISE_Media_Members_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* ── TOP DEPARTMENT BANNER ─────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-purple-950/40 via-surface to-surface border border-purple-500/20 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-full bg-purple-500/5 blur-2xl pointer-events-none" />
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 font-bold shadow-lg shadow-purple-500/10">
              <Camera className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-primary tracking-tight">
                  Media Department Portal
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30 text-[10px] font-bold uppercase tracking-wider">
                  Head Port
                </span>
              </div>
              <p className="text-xs sm:text-sm text-secondary mt-0.5">
                Head: <strong className="text-primary font-bold">{headConfig?.name || 'Matriche Abderrahmane'}</strong> • Affiliating media crew to events, photography & coverage
              </p>
            </div>
          </div>

          {/* View Switcher */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-dominant/80 border border-subtle">
            <button
              onClick={() => setActiveTab('event_affiliation')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all ${
                activeTab === 'event_affiliation'
                  ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/25'
                  : 'text-secondary hover:text-primary hover:bg-subtle/40'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>⚡ Event Media Crew</span>
              {currentEventAssignments.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px]">
                  {currentEventAssignments.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('members')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                activeTab === 'members'
                  ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/25'
                  : 'text-secondary hover:text-primary hover:bg-subtle/40'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Media Roster ({members.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('deliverables')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                activeTab === 'deliverables'
                  ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/25'
                  : 'text-secondary hover:text-primary hover:bg-subtle/40'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Coverage Overview</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── VIEW 1: ULTRA-SIMPLE MEDIA AFFILIATION BOARD (MAIN PURPOSE) ─────── */}
      {activeTab === 'event_affiliation' && (
        <div className="space-y-6">
          {/* STEP 1: SELECT EVENT */}
          <div className="bg-surface border border-subtle rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-md border border-purple-500/20">
                  Step 1: Select Event to Cover
                </span>
                <h2 className="text-base sm:text-lg font-bold text-primary mt-1">
                  Which event needs photography & media coverage?
                </h2>
              </div>

              {currentEvent && (
                <button
                  onClick={copyCoverageRoster}
                  className="px-3.5 py-2 rounded-xl bg-dominant hover:bg-subtle text-primary border border-subtle text-xs font-bold flex items-center gap-2 transition-colors shadow-sm"
                  title="Copy media crew list to WhatsApp"
                >
                  {copiedRoster ? <Check className="w-3.5 h-3.5 text-purple-400" /> : <Copy className="w-3.5 h-3.5 text-purple-400" />}
                  <span>{copiedRoster ? 'Media Roster Copied!' : 'Copy WhatsApp Media Roster'}</span>
                </button>
              )}
            </div>

            {/* Event Horizontal Slider/Pills */}
            {eventsLoading ? (
              <div className="py-6 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
              </div>
            ) : events.length === 0 ? (
              <div className="p-6 text-center text-muted bg-dominant rounded-2xl border border-dashed border-subtle">
                No events currently scheduled.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {events.map((ev) => {
                  const isSelected = ev?.id === currentEvent?.id;
                  const count = coverageAssignments.filter((a) => a?.event_id === ev?.id).length;
                  return (
                    <div
                      key={ev.id}
                      onClick={() => setSelectedEventId(ev.id)}
                      className={`p-3.5 rounded-2xl cursor-pointer transition-all border text-left flex flex-col justify-between gap-2 relative ${
                        isSelected
                          ? 'bg-purple-500/10 border-purple-500/40 shadow-md shadow-purple-500/5 ring-2 ring-purple-500/20'
                          : 'bg-dominant border-subtle hover:border-subtle/80 hover:bg-surface'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold text-muted truncate">
                            {ev.date || 'Upcoming'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 ${
                            count > 0 ? 'bg-purple-500/20 text-purple-400' : 'bg-subtle text-muted'
                          }`}>
                            <Camera className="w-2.5 h-2.5" />
                            {count} {count === 1 ? 'crew' : 'crew'}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-primary mt-1 line-clamp-1">
                          {ev.title || 'Event'}
                        </h3>
                        <p className="text-[11px] text-secondary line-clamp-1">
                          📍 {ev.location || 'HNS-RE2SD'}
                        </p>
                      </div>
                      {isSelected && (
                        <div className="flex items-center gap-1 text-[10px] font-extrabold text-purple-400 pt-1 border-t border-purple-500/20">
                          <CheckCircle className="w-3 h-3" /> Selected Coverage Target
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* STEP 2: 1-CLICK MEDIA CREW AFFILIATION */}
          {currentEvent && (
            <div className="bg-surface border border-subtle rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-md border border-purple-500/20">
                    Step 2: 1-Click Media Crew Affiliation
                  </span>
                  <h2 className="text-base sm:text-lg font-bold text-primary mt-1">
                    Coverage for: <span className="text-purple-400 font-extrabold">"{currentEvent.title}"</span>
                  </h2>
                  <p className="text-xs text-muted">
                    Click <strong>[ + Assign Crew ]</strong> next to any media member to assign them to photograph, film, or edit this event.
                  </p>
                </div>

                {/* Filter & Batch Actions */}
                <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
                  <div className="flex items-center p-1 rounded-xl bg-dominant border border-subtle text-xs">
                    <button
                      onClick={() => setAffiliationFilter('all')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                        affiliationFilter === 'all' ? 'bg-purple-500 text-white' : 'text-secondary'
                      }`}
                    >
                      All ({members.length})
                    </button>
                    <button
                      onClick={() => setAffiliationFilter('affiliated')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                        affiliationFilter === 'affiliated' ? 'bg-purple-500 text-white' : 'text-secondary'
                      }`}
                    >
                      Assigned ({currentEventAssignments.length})
                    </button>
                    <button
                      onClick={() => setAffiliationFilter('unaffiliated')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                        affiliationFilter === 'unaffiliated' ? 'bg-purple-500 text-white' : 'text-secondary'
                      }`}
                    >
                      Unassigned ({members.length - currentEventAssignments.length})
                    </button>
                  </div>

                  {selectedMemberIds.length > 0 && (
                    <button
                      onClick={() => handleBatchAffiliate()}
                      className="px-3.5 py-1.5 rounded-xl bg-purple-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-purple-500/20 transition-transform active:scale-95"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Assign Selected ({selectedMemberIds.length})</span>
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
                    placeholder="Search media member by name or skill..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-dominant border border-subtle text-xs text-primary focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end text-xs text-muted">
                  <button
                    onClick={() => selectAllFiltered(filteredMembers)}
                    className="flex items-center gap-1.5 text-xs font-bold text-secondary hover:text-primary transition-colors"
                  >
                    {selectedMemberIds.length === filteredMembers.length && filteredMembers.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-purple-400" />
                    ) : (
                      <Square className="w-4 h-4 text-muted" />
                    )}
                    <span>Select All Filtered ({filteredMembers.length})</span>
                  </button>
                </div>
              </div>

              {/* Members Cards Grid */}
              {membersLoading ? (
                <div className="py-12 flex justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                </div>
              ) : filteredMembers.length === 0 ? (
                <div className="py-8 text-center text-muted bg-dominant rounded-2xl border border-dashed border-subtle">
                  No media members matched your search or filter.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredMembers.map((member) => {
                    const rawMemberId = String(member.id).replace(/^reg-|^leader-|^mem-/, '');
                    const assignment = currentEventAssignments.find(
                      (a) => String(a?.member_id).replace(/^reg-|^leader-|^mem-/, '') === rawMemberId
                    );
                    const isAffiliated = !!assignment;
                    const isSelected = selectedMemberIds.includes(member.id);
                    const displayName = member.full_name || 'Member';
                    const initialLetter = displayName.charAt(0) || 'M';

                    return (
                      <div
                        key={member.id}
                        className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                          isAffiliated
                            ? 'bg-purple-950/20 border-purple-500/40 shadow-sm'
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
                                <CheckSquare className="w-4 h-4 text-purple-400" />
                              ) : (
                                <Square className="w-4 h-4 text-muted" />
                              )}
                            </button>
                            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-black text-sm border border-purple-500/20 shrink-0">
                              {initialLetter}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-sm font-bold text-primary leading-tight">
                                  {displayName}
                                </h4>
                                {member.study_year && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-subtle text-muted">
                                    Y{member.study_year} {member.specialization || ''}
                                  </span>
                                )}
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center gap-1">
                                  {Math.round(member.rating ?? 50)}% Rating
                                </span>
                              </div>
                              <p className="text-[11px] text-muted mt-0.5">
                                Specialization: <span className="text-secondary">{member.role || 'Photographer'}</span>
                              </p>
                              {member.phone && (
                                <a 
                                  href={`https://wa.me/${String(member.phone).replace(/[^0-9]/g, '')}`}
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="text-[10px] text-purple-400/90 hover:underline flex items-center gap-1 mt-0.5"
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
                                className="px-3.5 py-1.5 rounded-xl bg-purple-500 text-white hover:bg-red-500/90 text-xs font-extrabold flex items-center gap-1.5 shadow-md shadow-purple-500/20 transition-all group"
                                title="Click to remove from coverage"
                              >
                                <Check className="w-3.5 h-3.5 group-hover:hidden" />
                                <X className="w-3.5 h-3.5 hidden group-hover:inline" />
                                <span className="group-hover:hidden">Assigned</span>
                                <span className="hidden group-hover:inline">Remove</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleToggleAffiliation(member)}
                                className="px-3.5 py-1.5 rounded-xl bg-dominant hover:bg-purple-500 hover:text-white text-purple-400 border border-purple-500/30 text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>+ Assign Crew</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* IF ASSIGNED: DISPLAY ONLY SPECIFIC DUTY AND ADD/EDIT SPECIFIC DUTY BUTTON */}
                        {isAffiliated && assignment && (
                          <div className="p-3 rounded-2xl bg-surface/90 border border-purple-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[11px] font-bold text-muted flex items-center gap-1">
                                🎬 Specific Media Duty:
                              </span>
                              {assignment.assigned_role && assignment.assigned_role !== 'Event Coverage Crew' ? (
                                <span className="px-3 py-1 rounded-xl bg-purple-500/15 text-purple-400 font-extrabold text-xs border border-purple-500/30 shadow-sm">
                                  {assignment.assigned_role}
                                </span>
                              ) : (
                                <span className="text-xs text-muted italic">No specific duty set</span>
                              )}
                            </div>

                            <button
                              onClick={() => {
                                setEditingAssignment({
                                  id: assignment.id,
                                  name: member.full_name || 'Member',
                                  currentDuty: assignment.assigned_role === 'Event Coverage Crew' ? '' : assignment.assigned_role,
                                });
                                setCustomDutyInput(assignment.assigned_role === 'Event Coverage Crew' ? '' : assignment.assigned_role);
                              }}
                              className="px-3.5 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 text-xs font-extrabold flex items-center gap-1.5 transition-colors shadow-sm"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>{assignment.assigned_role && assignment.assigned_role !== 'Event Coverage Crew' ? 'Edit Specific Duty' : 'Add a Specific Duty'}</span>
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

      {/* ── VIEW 2: MEDIA MEMBERS ROSTER ─────────────────────────────────── */}
      {activeTab === 'members' && (
        <div className="bg-surface border border-subtle rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-lg font-bold text-primary">
                Media Department Roster ({members.length} Members)
              </h2>
              <p className="text-xs text-muted">
                Manage photographers, videographers, editors, and content creators.
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
                className="px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-purple-500/20 transition-all"
              >
                <UserPlus className="w-3.5 h-3.5" /> <span>Add Media Member</span>
              </button>
            </div>
          </div>

          <PortalMemberCardGrid
            members={members}
            department="Media"
            onOpenRoleModal={(m) => {
              setSelectedMemberForRole(m);
              setNewRoleValue(m.role || 'Lead Photographer');
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

      {/* ── VIEW 3: COVERAGE DELIVERABLES OVERVIEW ─────────────────────────── */}
      {activeTab === 'deliverables' && (
        <div className="bg-surface border border-subtle rounded-3xl p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-bold text-primary">Media Coverage & Deliverables Roster</h2>
            <p className="text-xs text-muted">Summary of all events with assigned media crew members.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {events.map((ev) => {
              const assigned = coverageAssignments.filter((a) => a && a.event_id === ev?.id);
              return (
                <div key={ev.id} className="bg-dominant border border-subtle rounded-2xl p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-bold text-purple-400">{ev.date || 'TBA'}</span>
                      <h3 className="text-base font-bold text-primary">{ev.title || 'Event'}</h3>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 text-xs font-bold">
                      {assigned.length} Crew Assigned
                    </span>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-subtle">
                    {assigned.length === 0 ? (
                      <p className="text-xs text-muted italic">No media crew assigned yet.</p>
                    ) : (
                      assigned.map((a) => (
                        <div key={a.id} className="flex justify-between items-center text-xs p-2 rounded-xl bg-surface">
                          <span className="font-bold text-primary">{a.member_name || 'Crew Member'}</span>
                          <span className="text-[11px] text-purple-400 font-medium">{a.assigned_role || 'Coverage'}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── MODAL: CUSTOM ROLE EDIT ────────────────────────────────────────── */}
      {editingAssignment && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-subtle rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-primary">Add / Edit Specific Duty: {editingAssignment.name}</h3>
              <button onClick={() => setEditingAssignment(null)} className="text-muted hover:text-primary">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1">
                Enter Specific Duty (e.g. Lead Photographer, Reels Creator, Aftermovie Editor)
              </label>
              <input
                type="text"
                value={customDutyInput}
                onChange={(e) => setCustomDutyInput(e.target.value)}
                placeholder="e.g. Main Stage Photographer"
                className="w-full bg-dominant border border-subtle rounded-xl px-4 py-2.5 text-primary text-sm focus:border-purple-500 focus:outline-none"
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
                onClick={() => handleSetMemberDuty(editingAssignment.id, customDutyInput)}
                className="px-4 py-2 rounded-xl bg-purple-500 text-white hover:bg-purple-600 text-xs font-bold"
              >
                Save Duty
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
              <h3 className="text-base font-bold text-primary">Add Media Member</h3>
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
                  placeholder="e.g. Yacine Khelil"
                  className="w-full bg-dominant border border-subtle rounded-xl px-3 py-2 text-primary focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-muted font-bold mb-1">Email</label>
                <input
                  type="email"
                  value={newMemberData.email}
                  onChange={(e) => setNewMemberData({ ...newMemberData, email: e.target.value })}
                  placeholder="yacine@example.com"
                  className="w-full bg-dominant border border-subtle rounded-xl px-3 py-2 text-primary focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-muted font-bold mb-1">Phone (WhatsApp)</label>
                <input
                  type="text"
                  value={newMemberData.phone}
                  onChange={(e) => setNewMemberData({ ...newMemberData, phone: e.target.value })}
                  placeholder="0550 99 88 77"
                  className="w-full bg-dominant border border-subtle rounded-xl px-3 py-2 text-primary focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-muted font-bold mb-1">Study Year</label>
                  <select
                    value={newMemberData.study_year}
                    onChange={(e) => setNewMemberData({ ...newMemberData, study_year: Number(e.target.value) })}
                    className="w-full bg-dominant border border-subtle rounded-xl px-3 py-2 text-primary focus:border-purple-500 focus:outline-none"
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
                    placeholder="ENR / IRIIA / SE"
                    className="w-full bg-dominant border border-subtle rounded-xl px-3 py-2 text-primary focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-muted font-bold mb-1">Specialized Role</label>
                <input
                  type="text"
                  value={newMemberData.role}
                  onChange={(e) => setNewMemberData({ ...newMemberData, role: e.target.value })}
                  placeholder="e.g. Lead Photographer"
                  className="w-full bg-dominant border border-subtle rounded-xl px-3 py-2 text-primary focus:border-purple-500 focus:outline-none"
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
                  className="px-4 py-2 rounded-xl bg-purple-500 text-white font-bold hover:bg-purple-600"
                >
                  {addingMember ? 'Adding...' : 'Add Member'}
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
                Select or Enter Specialization
              </label>
              <input
                type="text"
                value={newRoleValue}
                onChange={(e) => setNewRoleValue(e.target.value)}
                placeholder="e.g. Lead Videographer"
                className="w-full bg-dominant border border-subtle rounded-xl px-4 py-2.5 text-primary text-sm focus:border-purple-500 focus:outline-none"
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
                className="px-4 py-2 rounded-xl bg-purple-500 text-white font-bold hover:bg-purple-600"
              >
                Save Role
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Member Rating Evaluation Modal */}
      {evaluatingMember && (
        <PortalMemberEvaluationModal
          member={evaluatingMember}
          department="Media"
          isOpen={!!evaluatingMember}
          onClose={() => setEvaluatingMember(null)}
          onSaved={() => loadMembers()}
          isSuperAdmin={isSuperAdmin}
        />
      )}
    </div>
  );
}
