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
  Users, Calendar, UserPlus, Trash2, ShieldCheck, 
  Search, Plus, CheckCircle, Clock, 
  ExternalLink, Phone, Mail, GraduationCap, 
  Download, Loader2, Save, X, Edit, 
  Check, Copy, Sparkles, Building, UserCheck,
  CheckSquare, Square, Share2, MessageCircle, AlertCircle, Award
} from 'lucide-react';

interface OrganizationPortalProps {
  onBackToAdmin?: () => void;
  isSuperAdmin?: boolean;
}

export function OrganizationPortal({ onBackToAdmin, isSuperAdmin }: OrganizationPortalProps) {
  const headConfig = DEPARTMENT_HEADS.Organization;

  // Active View: default to event_affiliation as primary!
  const [activeTab, setActiveTab] = useState<'event_affiliation' | 'members' | 'events'>('event_affiliation');

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

  // Event Staffing Assignment state
  const [eventAssignments, setEventAssignments] = useState<EventStaffAssignment[]>([]);
  const [copiedRoster, setCopiedRoster] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Editing duty modal / popup
  const [editingAssignment, setEditingAssignment] = useState<{ id: string; name: string; currentDuty: string } | null>(null);
  const [customDutyInput, setCustomDutyInput] = useState('');

  // Add Member modal
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [newMemberData, setNewMemberData] = useState({
    full_name: '',
    email: '',
    phone: '',
    study_year: 3,
    specialization: 'ENR',
    role: 'General Organization Member',
  });
  const [addingMember, setAddingMember] = useState(false);

  // Role Edit Modal
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [selectedMemberForRole, setSelectedMemberForRole] = useState<DepartmentMember | null>(null);
  const [newRoleValue, setNewRoleValue] = useState('');

  // Add / Edit Event modal
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [eventModalMode, setEventModalMode] = useState<'add' | 'edit'>('add');
  const [eventFormData, setEventFormData] = useState<any>({});
  const [savingEvent, setSavingEvent] = useState(false);

  useEffect(() => {
    loadMembers();
    loadEvents();
    loadAssignments();
  }, []);

  const loadMembers = async () => {
    setMembersLoading(true);
    try {
      const data = await fetchDepartmentMembers('Organization');
      setMembers(data);
    } catch (err) {
      console.error('Error loading organization members:', err);
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
      if (!error && data) {
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
    const list = await fetchEventAssignmentsFromSupabase('Organization', currentEvent?.id);
    setEventAssignments(list);
  };

  useEffect(() => {
    loadAssignments();
  }, [selectedEventId]);

  const currentEvent = events.find((e) => e.id === selectedEventId) || events[0];
  const currentEventAssignments = eventAssignments.filter((a) => a.event_id === currentEvent?.id);
  const affiliatedMemberIds = new Set(currentEventAssignments.map((a) => String(a.member_id)));

  // 1-Click Instant Toggle Affiliation
  const handleToggleAffiliation = async (member: DepartmentMember, defaultDuty?: string) => {
    if (!currentEvent) return;

    const rawMemberId = String(member.id).replace(/^reg-|^leader-|^mem-/, '');
    const numericEventId = Number(String(currentEvent.id).replace(/^evt-/, ''));

    const isCurrentlyAffiliated = eventAssignments.some(
      (a) => Number(a.event_id) === numericEventId && String(a.member_id).replace(/^reg-|^leader-|^mem-/, '') === rawMemberId
    );

    // Instant local state update
    if (isCurrentlyAffiliated) {
      setEventAssignments((prev) =>
        prev.filter((a) => String(a.member_id).replace(/^reg-|^leader-|^mem-/, '') !== rawMemberId)
      );
    } else {
      const newAssignment: EventStaffAssignment = {
        id: `assign-${numericEventId}-${rawMemberId}`,
        event_id: numericEventId,
        event_title: currentEvent.title,
        department: 'Organization',
        member_id: member.id,
        member_name: member.full_name,
        member_email: member.email,
        member_phone: member.phone,
        assigned_role: defaultDuty || member.role || 'Event Logistics Staff',
        status: 'Assigned',
        assigned_at: new Date().toISOString(),
      };
      setEventAssignments((prev) => [newAssignment, ...prev]);
    }

    // Async Supabase Sync with Explicit Action
    const actionToPerform = isCurrentlyAffiliated ? 'remove' : 'add';
    await toggleMemberEventAffiliation('Organization', currentEvent, member, defaultDuty, actionToPerform);
    await loadAssignments();
  };

  // 1-Click Quick Duty Assignment
  const handleSetMemberDuty = async (assignmentId: string, duty: string) => {
    const target = eventAssignments.find((a) => a.id === assignmentId);
    if (!currentEvent || !target) return;
    await updateEventAssignmentRole('Organization', currentEvent.id, target.member_id, duty);
    await loadAssignments();
    setEditingAssignment(null);
  };

  // Batch Affiliation
  const handleBatchAffiliate = async (duty?: string) => {
    if (!currentEvent || selectedMemberIds.length === 0) return;
    const toAssign = members.filter((m) => selectedMemberIds.includes(m.id));
    await batchAffiliateMembersToEvent('Organization', currentEvent, toAssign, duty);
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

  // Copy Full Event Roster for WhatsApp / Telegram
  const copyEventRoster = () => {
    if (!currentEvent) return;
    const lines = [
      `🏛️ *E.R.I.S.E. Organization Team Roster*`,
      `📅 *Event:* ${currentEvent.title}`,
      `📍 *Location:* ${currentEvent.location || 'HNS-RE2SD'}`,
      `⏰ *Date/Time:* ${currentEvent.date || ''} ${currentEvent.time || ''}`,
      `👥 *Total Staff Affiliated:* ${currentEventAssignments.length}`,
      `──────────────────────────`,
      ...currentEventAssignments.map((a, idx) => {
        const phoneTxt = a.member_phone ? ` | 📞 ${a.member_phone}` : '';
        return `${idx + 1}. *${a.member_name}* → _${a.assigned_role}_${phoneTxt}`;
      }),
      `──────────────────────────`,
      `Prepared by: ${headConfig.name} (Head of Organization)`
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedRoster(true);
    setTimeout(() => setCopiedRoster(false), 2500);
  };

  // Filtered members for affiliation board
  const filteredMembers = members.filter((m) => {
    const matchesSearch =
      m.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.role && m.role.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (m.specialization && m.specialization.toLowerCase().includes(searchQuery.toLowerCase()));

    const isAffiliated = affiliatedMemberIds.has(String(m.id));
    if (affiliationFilter === 'affiliated') return matchesSearch && isAffiliated;
    if (affiliationFilter === 'unaffiliated') return matchesSearch && !isAffiliated;
    return matchesSearch;
  });

  // Add Member handler
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberData.full_name) return;
    setAddingMember(true);
    try {
      addDepartmentMember('Organization', newMemberData);
      await loadMembers();
      setAddMemberOpen(false);
      setNewMemberData({
        full_name: '',
        email: '',
        phone: '',
        study_year: 3,
        specialization: 'ENR',
        role: 'General Organization Member',
      });
    } catch (err) {
      console.error('Failed to add member:', err);
    } finally {
      setAddingMember(false);
    }
  };

  // Delete Member handler
  const handleDeleteMember = async (id: number, name: string) => {
    if (!window.confirm(`Are you sure you want to remove ${name} from Organization?`)) return;
    deleteDepartmentMember('Organization', id);
    await loadMembers();
    loadAssignments();
  };

  // Grant Role handler
  const handleGrantRole = () => {
    if (!selectedMemberForRole || !newRoleValue) return;
    grantDepartmentMemberRole(selectedMemberForRole.id, newRoleValue);
    setRoleModalOpen(false);
    loadMembers();
  };

  // Event CRUD handlers
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEvent(true);
    try {
      if (eventModalMode === 'add') {
        const { error } = await supabase.from('events').insert([{
          title: eventFormData.title,
          date: eventFormData.date || 'TBA',
          time: eventFormData.time || '10:00 AM',
          location: eventFormData.location || 'HNS-RE2SD Auditorium',
          description: eventFormData.description || '',
          image: eventFormData.image || 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&q=80&w=800',
          registration_enabled: eventFormData.registration_enabled ?? true,
          registration_type: eventFormData.registration_type || 'individual',
        }]);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('events')
          .update(eventFormData)
          .eq('id', eventFormData.id);
        if (error) throw error;
      }
      await loadEvents();
      setEventModalOpen(false);
    } catch (err: any) {
      alert('Error saving event: ' + err.message);
    } finally {
      setSavingEvent(false);
    }
  };

  const handleDeleteEvent = async (id: number, title: string) => {
    if (!window.confirm(`Are you sure you want to delete event "${title}"?`)) return;
    try {
      const { error } = await supabase.from('events').delete().eq('id', id);
      if (error) throw error;
      await loadEvents();
      if (selectedEventId === id) setSelectedEventId(null);
    } catch (err: any) {
      alert('Error deleting event: ' + err.message);
    }
  };

  const exportMembersCsv = () => {
    const headers = ['ID', 'Full Name', 'Email', 'Phone', 'Year', 'Specialization', 'Role'];
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
    link.setAttribute('download', `ERISE_Organization_Members_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* ── TOP DEPARTMENT BANNER ─────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-surface to-surface border border-emerald-500/20 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-full bg-emerald-500/5 blur-2xl pointer-events-none" />
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold shadow-lg shadow-emerald-500/10">
              <Building className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-primary tracking-tight">
                  Organization Department Portal
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider">
                  Head Port
                </span>
              </div>
              <p className="text-xs sm:text-sm text-secondary mt-0.5">
                Head: <strong className="text-primary font-bold">{headConfig.name}</strong> • Affiliating members to events, role granting & logistics
              </p>
            </div>
          </div>

          {/* View Switcher Pills */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-dominant/80 border border-subtle">
            <button
              onClick={() => setActiveTab('event_affiliation')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all ${
                activeTab === 'event_affiliation'
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                  : 'text-secondary hover:text-primary hover:bg-subtle/40'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>⚡ Event Affiliation</span>
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
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                  : 'text-secondary hover:text-primary hover:bg-subtle/40'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Members ({members.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('events')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                activeTab === 'events'
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                  : 'text-secondary hover:text-primary hover:bg-subtle/40'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Events ({events.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── VIEW 1: ULTRA-SIMPLE EVENT AFFILIATION BOARD (MAIN PURPOSE) ─────── */}
      {activeTab === 'event_affiliation' && (
        <div className="space-y-6">
          {/* STEP 1: SELECT EVENT */}
          <div className="bg-surface border border-subtle rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                  Step 1: Choose Target Event
                </span>
                <h2 className="text-base sm:text-lg font-bold text-primary mt-1">
                  Which event are you staffing today?
                </h2>
              </div>

              {currentEvent && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={copyEventRoster}
                    className="px-3.5 py-2 rounded-xl bg-dominant hover:bg-subtle text-primary border border-subtle text-xs font-bold flex items-center gap-2 transition-colors shadow-sm"
                    title="Copy formatted roster to paste in WhatsApp"
                  >
                    {copiedRoster ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-emerald-400" />}
                    <span>{copiedRoster ? 'Roster Copied!' : 'Copy WhatsApp Roster'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setEventModalMode('add');
                      setEventFormData({});
                      setEventModalOpen(true);
                    }}
                    className="px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> <span>New Event</span>
                  </button>
                </div>
              )}
            </div>

            {/* Event Horizontal Slider/Pills */}
            {eventsLoading ? (
              <div className="py-6 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
              </div>
            ) : events.length === 0 ? (
              <div className="p-6 text-center text-muted bg-dominant rounded-2xl border border-dashed border-subtle">
                No events found. Click "New Event" above to create one.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {events.map((ev) => {
                  const isSelected = ev.id === currentEvent?.id;
                  const count = eventAssignments.filter((a) => a.event_id === ev.id).length;
                  return (
                    <div
                      key={ev.id}
                      onClick={() => setSelectedEventId(ev.id)}
                      className={`p-3.5 rounded-2xl cursor-pointer transition-all border text-left flex flex-col justify-between gap-2 relative ${
                        isSelected
                          ? 'bg-emerald-500/10 border-emerald-500/40 shadow-md shadow-emerald-500/5 ring-2 ring-emerald-500/20'
                          : 'bg-dominant border-subtle hover:border-subtle/80 hover:bg-surface'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold text-muted truncate">
                            {ev.date || 'Upcoming'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 ${
                            count > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-subtle text-muted'
                          }`}>
                            <Users className="w-2.5 h-2.5" />
                            {count} {count === 1 ? 'member' : 'members'}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-primary mt-1 line-clamp-1">
                          {ev.title}
                        </h3>
                        <p className="text-[11px] text-secondary line-clamp-1">
                          📍 {ev.location || 'HNS-RE2SD'}
                        </p>
                      </div>
                      {isSelected && (
                        <div className="flex items-center gap-1 text-[10px] font-extrabold text-emerald-400 pt-1 border-t border-emerald-500/20">
                          <CheckCircle className="w-3 h-3" /> Selected Active Event
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* STEP 2: 1-CLICK MEMBER AFFILIATION LIST */}
          {currentEvent && (
            <div className="bg-surface border border-subtle rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                    Step 2: 1-Click Member Affiliation
                  </span>
                  <h2 className="text-base sm:text-lg font-bold text-primary mt-1">
                    Staffing: <span className="text-emerald-400 font-extrabold">"{currentEvent.title}"</span>
                  </h2>
                  <p className="text-xs text-muted">
                    Click <strong>[ + Affiliate ]</strong> next to any member to instantly assign them to this event.
                  </p>
                </div>

                {/* Filter & Batch Actions */}
                <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
                  {/* Affiliation filter */}
                  <div className="flex items-center p-1 rounded-xl bg-dominant border border-subtle text-xs">
                    <button
                      onClick={() => setAffiliationFilter('all')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                        affiliationFilter === 'all' ? 'bg-emerald-500 text-white' : 'text-secondary'
                      }`}
                    >
                      All ({members.length})
                    </button>
                    <button
                      onClick={() => setAffiliationFilter('affiliated')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                        affiliationFilter === 'affiliated' ? 'bg-emerald-500 text-white' : 'text-secondary'
                      }`}
                    >
                      Affiliated ({currentEventAssignments.length})
                    </button>
                    <button
                      onClick={() => setAffiliationFilter('unaffiliated')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                        affiliationFilter === 'unaffiliated' ? 'bg-emerald-500 text-white' : 'text-secondary'
                      }`}
                    >
                      Unaffiliated ({members.length - currentEventAssignments.length})
                    </button>
                  </div>

                  {selectedMemberIds.length > 0 && (
                    <button
                      onClick={() => handleBatchAffiliate()}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-transform active:scale-95"
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
                    placeholder="Search member by name or role..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-dominant border border-subtle text-xs text-primary focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end text-xs text-muted">
                  <button
                    onClick={() => selectAllFiltered(filteredMembers)}
                    className="flex items-center gap-1.5 text-xs font-bold text-secondary hover:text-primary transition-colors"
                  >
                    {selectedMemberIds.length === filteredMembers.length && filteredMembers.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-emerald-400" />
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
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
                </div>
              ) : filteredMembers.length === 0 ? (
                <div className="py-8 text-center text-muted bg-dominant rounded-2xl border border-dashed border-subtle">
                  No members matched your search or filter.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredMembers.map((member) => {
                    const rawMemberId = String(member.id).replace(/^reg-|^leader-|^mem-/, '');
                    const assignment = currentEventAssignments.find(
                      (a) => String(a.member_id).replace(/^reg-|^leader-|^mem-/, '') === rawMemberId
                    );
                    const isAffiliated = !!assignment;
                    const isSelected = selectedMemberIds.includes(member.id);

                    return (
                      <div
                        key={member.id}
                        className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                          isAffiliated
                            ? 'bg-emerald-950/20 border-emerald-500/40 shadow-sm'
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
                                <CheckSquare className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <Square className="w-4 h-4 text-muted" />
                              )}
                            </button>
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-black text-sm border border-emerald-500/20 shrink-0">
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
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                                  {Math.round(member.rating ?? 50)}% Rating
                                </span>
                              </div>
                              <p className="text-[11px] text-muted mt-0.5">
                                Permanent Role: <span className="text-secondary">{member.role || 'Member'}</span>
                              </p>
                              {member.phone && (
                                <a 
                                  href={`https://wa.me/${String(member.phone).replace(/[^0-9]/g, '')}`}
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="text-[10px] text-emerald-400/90 hover:underline flex items-center gap-1 mt-0.5"
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
                                className="px-3.5 py-1.5 rounded-xl bg-emerald-500 text-white hover:bg-red-500/90 text-xs font-extrabold flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all group"
                                title="Click to remove from this event"
                              >
                                <Check className="w-3.5 h-3.5 group-hover:hidden" />
                                <X className="w-3.5 h-3.5 hidden group-hover:inline" />
                                <span className="group-hover:hidden">Affiliated</span>
                                <span className="hidden group-hover:inline">Remove</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleToggleAffiliation(member)}
                                className="px-3.5 py-1.5 rounded-xl bg-dominant hover:bg-emerald-500 hover:text-white text-emerald-400 border border-emerald-500/30 text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>+ Affiliate</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* IF AFFILIATED: DISPLAY ONLY SPECIFIC DUTY AND ADD/EDIT SPECIFIC DUTY BUTTON */}
                        {isAffiliated && assignment && (
                          <div className="p-3 rounded-2xl bg-surface/90 border border-emerald-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[11px] font-bold text-muted flex items-center gap-1">
                                🎯 Specific Event Duty:
                              </span>
                              {assignment.assigned_role && assignment.assigned_role !== 'Event Logistics Staff' ? (
                                <span className="px-3 py-1 rounded-xl bg-emerald-500/15 text-emerald-400 font-extrabold text-xs border border-emerald-500/30 shadow-sm">
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
                                  name: member.full_name,
                                  currentDuty: assignment.assigned_role === 'Event Logistics Staff' ? '' : assignment.assigned_role,
                                });
                                setCustomDutyInput(assignment.assigned_role === 'Event Logistics Staff' ? '' : assignment.assigned_role);
                              }}
                              className="px-3.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-extrabold flex items-center gap-1.5 transition-colors shadow-sm"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>{assignment.assigned_role && assignment.assigned_role !== 'Event Logistics Staff' ? 'Edit Specific Duty' : 'Add a Specific Duty'}</span>
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

      {/* ── VIEW 2: DEPARTMENT MEMBERS DIRECTORY ─────────────────────────── */}
      {activeTab === 'members' && (
        <div className="bg-surface border border-subtle rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-lg font-bold text-primary">
                Organization Department Roster ({members.length} Members)
              </h2>
              <p className="text-xs text-muted">
                Manage organization members, assign permanent roles, or register new recruits.
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
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
              >
                <UserPlus className="w-3.5 h-3.5" /> <span>Add New Member</span>
              </button>
            </div>
          </div>

          {/* Members Expandable Card Grid */}
          <PortalMemberCardGrid
            members={members}
            department="Organization"
            onOpenRoleModal={(m) => {
              setSelectedMemberForRole(m);
              setNewRoleValue(m.role || 'General Organization Member');
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

      {/* ── VIEW 3: EVENTS MANAGEMENT ─────────────────────────────────────── */}
      {activeTab === 'events' && (
        <div className="bg-surface border border-subtle rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-primary">Events Management</h2>
              <p className="text-xs text-muted">Create, edit, or remove club events.</p>
            </div>
            <button
              onClick={() => {
                setEventModalMode('add');
                setEventFormData({});
                setEventModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> <span>Add Event</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((ev) => (
              <div key={ev.id} className="bg-dominant border border-subtle rounded-2xl p-4 flex flex-col justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold text-emerald-400">{ev.date || 'TBA'} • {ev.time || ''}</span>
                  <h3 className="text-base font-bold text-primary mt-1">{ev.title}</h3>
                  <p className="text-xs text-secondary mt-1 line-clamp-2">{ev.description}</p>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-subtle text-xs">
                  <span className="text-muted text-[11px]">📍 {ev.location || 'HNS-RE2SD'}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEventModalMode('edit');
                        setEventFormData(ev);
                        setEventModalOpen(true);
                      }}
                      className="p-1.5 text-secondary hover:text-primary rounded-lg bg-surface border border-subtle"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteEvent(ev.id, ev.title)}
                      className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MODAL: CUSTOM DUTY EDIT ────────────────────────────────────────── */}
      {editingAssignment && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-subtle rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-primary">Custom Duty: {editingAssignment.name}</h3>
              <button onClick={() => setEditingAssignment(null)} className="text-muted hover:text-primary">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1">
                Enter Custom Operational Role
              </label>
              <input
                type="text"
                value={customDutyInput}
                onChange={(e) => setCustomDutyInput(e.target.value)}
                placeholder="e.g. Lead Stage Director & Mic Coordinator"
                className="w-full bg-dominant border border-subtle rounded-xl px-4 py-2.5 text-primary text-sm focus:border-emerald-500 focus:outline-none"
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
                className="px-4 py-2 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 text-xs font-bold"
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
              <h3 className="text-base font-bold text-primary">Add Organization Member</h3>
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
                  placeholder="e.g. Sarah Benali"
                  className="w-full bg-dominant border border-subtle rounded-xl px-3 py-2 text-primary focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-muted font-bold mb-1">Email</label>
                <input
                  type="email"
                  value={newMemberData.email}
                  onChange={(e) => setNewMemberData({ ...newMemberData, email: e.target.value })}
                  placeholder="sarah@example.com"
                  className="w-full bg-dominant border border-subtle rounded-xl px-3 py-2 text-primary focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-muted font-bold mb-1">Phone (WhatsApp)</label>
                <input
                  type="text"
                  value={newMemberData.phone}
                  onChange={(e) => setNewMemberData({ ...newMemberData, phone: e.target.value })}
                  placeholder="0550 12 34 56"
                  className="w-full bg-dominant border border-subtle rounded-xl px-3 py-2 text-primary focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-muted font-bold mb-1">Study Year</label>
                  <select
                    value={newMemberData.study_year}
                    onChange={(e) => setNewMemberData({ ...newMemberData, study_year: Number(e.target.value) })}
                    className="w-full bg-dominant border border-subtle rounded-xl px-3 py-2 text-primary focus:border-emerald-500 focus:outline-none"
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
                    className="w-full bg-dominant border border-subtle rounded-xl px-3 py-2 text-primary focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-muted font-bold mb-1">Permanent Role</label>
                <input
                  type="text"
                  value={newMemberData.role}
                  onChange={(e) => setNewMemberData({ ...newMemberData, role: e.target.value })}
                  placeholder="e.g. Lead Logistics Coordinator"
                  className="w-full bg-dominant border border-subtle rounded-xl px-3 py-2 text-primary focus:border-emerald-500 focus:outline-none"
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
                  className="px-4 py-2 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-600"
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
                Select or Enter Role
              </label>
              <input
                type="text"
                value={newRoleValue}
                onChange={(e) => setNewRoleValue(e.target.value)}
                placeholder="e.g. Senior Logistics Officer"
                className="w-full bg-dominant border border-subtle rounded-xl px-4 py-2.5 text-primary text-sm focus:border-emerald-500 focus:outline-none"
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
                className="px-4 py-2 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-600"
              >
                Save Role
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: ADD / EDIT EVENT ───────────────────────────────────────── */}
      {eventModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-subtle rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-primary">
                {eventModalMode === 'add' ? 'Create New Event' : 'Edit Event'}
              </h3>
              <button onClick={() => setEventModalOpen(false)} className="text-muted hover:text-primary">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEvent} className="space-y-3 text-xs">
              <div>
                <label className="block text-muted font-bold mb-1">Event Title</label>
                <input
                  type="text"
                  required
                  value={eventFormData.title || ''}
                  onChange={(e) => setEventFormData({ ...eventFormData, title: e.target.value })}
                  placeholder="e.g. Annual Clean Energy Hackathon"
                  className="w-full bg-dominant border border-subtle rounded-xl px-3 py-2 text-primary focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-muted font-bold mb-1">Date</label>
                  <input
                    type="text"
                    value={eventFormData.date || ''}
                    onChange={(e) => setEventFormData({ ...eventFormData, date: e.target.value })}
                    placeholder="e.g. March 15, 2026"
                    className="w-full bg-dominant border border-subtle rounded-xl px-3 py-2 text-primary focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-muted font-bold mb-1">Time</label>
                  <input
                    type="text"
                    value={eventFormData.time || ''}
                    onChange={(e) => setEventFormData({ ...eventFormData, time: e.target.value })}
                    placeholder="e.g. 09:30 AM"
                    className="w-full bg-dominant border border-subtle rounded-xl px-3 py-2 text-primary focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-muted font-bold mb-1">Location / Venue</label>
                <input
                  type="text"
                  value={eventFormData.location || ''}
                  onChange={(e) => setEventFormData({ ...eventFormData, location: e.target.value })}
                  placeholder="e.g. HNS-RE2SD Main Amphitheater"
                  className="w-full bg-dominant border border-subtle rounded-xl px-3 py-2 text-primary focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-muted font-bold mb-1">Description</label>
                <textarea
                  rows={3}
                  value={eventFormData.description || ''}
                  onChange={(e) => setEventFormData({ ...eventFormData, description: e.target.value })}
                  placeholder="Event overview, objectives and schedule..."
                  className="w-full bg-dominant border border-subtle rounded-xl px-3 py-2 text-primary focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEventModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-dominant text-secondary hover:bg-subtle text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEvent}
                  className="px-4 py-2 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-600"
                >
                  {savingEvent ? 'Saving...' : 'Save Event'}
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
          department="Organization"
          isOpen={!!evaluatingMember}
          onClose={() => setEvaluatingMember(null)}
          onSaved={() => loadMembers()}
          isSuperAdmin={isSuperAdmin}
        />
      )}
    </div>
  );
}
