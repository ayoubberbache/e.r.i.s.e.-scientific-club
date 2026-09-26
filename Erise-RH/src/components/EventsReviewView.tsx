import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Users, 
  Download, 
  Search, 
  Filter, 
  RefreshCw,
  Mail, 
  Phone, 
  GraduationCap, 
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { EventItem, EventRegistration, ClubMember, AppraisalInput } from '../types';
import { fetchEvents, fetchEventRegistrations, fetchMembersWithRatings, submitAppraisal, exportToCSV } from '../lib/hrEngine';
import { AppraisalModal } from './AppraisalModal';
import { UserPlus, Award } from 'lucide-react';

export const EventsReviewView: React.FC = () => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [clubMembers, setClubMembers] = useState<ClubMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [memberTypeFilter, setMemberTypeFilter] = useState<'all' | 'members' | 'non_members'>('all');
  const [evaluatingMember, setEvaluatingMember] = useState<ClubMember | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allEvents, allRegs, allMembers] = await Promise.all([
        fetchEvents(),
        fetchEventRegistrations(selectedEventId === 'all' ? undefined : selectedEventId),
        fetchMembersWithRatings()
      ]);
      setEvents(allEvents);
      setClubMembers(allMembers);

      // Build fast lookup sets for approved club members
      const approvedMembers = allMembers.filter(m => m.status === 'approved');
      const emailMap = new Map<string, ClubMember>();
      const phoneMap = new Map<string, ClubMember>();
      const nameMap = new Map<string, ClubMember>();

      approvedMembers.forEach(m => {
        if (m.email) emailMap.set(m.email.toLowerCase().trim(), m);
        if (m.phone) phoneMap.set(m.phone.replace(/[^\d]/g, ''), m);
        if (m.full_name) nameMap.set(m.full_name.toLowerCase().trim(), m);
      });

      // Enrich registrations & members with club membership detection
      const enriched: EventRegistration[] = allRegs.map((reg) => {
        const enrichedMembers = (reg.members || []).map((m) => {
          const matched = (m.email && emailMap.get(m.email.toLowerCase().trim())) ||
            (m.phone && phoneMap.get(m.phone.replace(/[^\d]/g, ''))) ||
            nameMap.get(m.full_name.toLowerCase().trim());

          return {
            ...m,
            is_club_member: !!matched,
            club_member_id: matched?.id,
          };
        });

        const hasClubMember = enrichedMembers.length > 0
          ? enrichedMembers.some(m => m.is_club_member)
          : false;

        return {
          ...reg,
          is_club_member: hasClubMember,
          members: enrichedMembers,
        };
      });

      setRegistrations(enriched);
    } catch (err) {
      console.error('Error loading event data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedEventId]);

  const filteredRegistrations = registrations.filter((reg) => {
    const matchesStatus = statusFilter === 'all' || reg.status === statusFilter;
    const matchesMemberType = 
      memberTypeFilter === 'all' || 
      (memberTypeFilter === 'members' && reg.is_club_member) || 
      (memberTypeFilter === 'non_members' && !reg.is_club_member);

    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      !query ||
      (reg.team_name && reg.team_name.toLowerCase().includes(query)) ||
      reg.institution.toLowerCase().includes(query) ||
      reg.event_title?.toLowerCase().includes(query) ||
      reg.members.some(m => 
        m.full_name.toLowerCase().includes(query) || 
        m.email.toLowerCase().includes(query) ||
        (m.phone && m.phone.includes(query))
      ) ||
      (reg.companion_name && reg.companion_name.toLowerCase().includes(query));

    return matchesStatus && matchesMemberType && matchesSearch;
  });

  // Export participants list to CSV
  const handleExportCSV = () => {
    const headers = [
      'Event ID',
      'Event Name',
      'Registration Type',
      'Team Name',
      'Participant Role',
      'Full Name',
      'Club Standing',
      'Email',
      'Phone',
      'Institution / University',
      'Study Year',
      'Has Companion',
      'Companion Name',
      'Companion Role',
      'Status',
      'Registered Date'
    ];

    const rows: (string | number | boolean | null | undefined)[][] = [];

    filteredRegistrations.forEach((reg) => {
      if (reg.members.length > 0) {
        reg.members.forEach((m) => {
          rows.push([
            reg.event_id,
            reg.event_title || '',
            reg.registration_type,
            reg.team_name || 'N/A',
            m.is_leader ? 'Leader' : 'Team Member',
            m.full_name,
            m.is_club_member ? 'Registered Club Member' : 'Non-Member (Future Invite Candidate)',
            m.email,
            m.phone || '',
            reg.institution,
            reg.study_year,
            reg.has_companion ? 'Yes' : 'No',
            reg.companion_name || '',
            reg.companion_role || '',
            reg.status,
            reg.registered_at ? new Date(reg.registered_at).toLocaleDateString() : ''
          ]);
        });
      } else {
        rows.push([
          reg.event_id,
          reg.event_title || '',
          reg.registration_type,
          reg.team_name || 'N/A',
          'Primary Registrant',
          'N/A',
          'Non-Member (Future Invite Candidate)',
          '',
          '',
          reg.institution,
          reg.study_year,
          reg.has_companion ? 'Yes' : 'No',
          reg.companion_name || '',
          reg.companion_role || '',
          reg.status,
          reg.registered_at ? new Date(reg.registered_at).toLocaleDateString() : ''
        ]);
      }
    });

    const activeEventTitle = selectedEventId !== 'all' 
      ? events.find(e => e.id === selectedEventId)?.title?.replace(/[^a-zA-Z0-9]/g, '_') 
      : 'All_Events';

    const filename = `ERISE_Participants_${activeEventTitle}_${new Date().toISOString().slice(0, 10)}.csv`;
    exportToCSV(filename, headers, rows);
  };

  // Export specifically Non-Members saved for future invitations
  const handleExportFutureInvitesCSV = () => {
    const headers = [
      'Full Name',
      'Email',
      'Phone',
      'Institution / University',
      'Study Year',
      'Attended Workshop / Event',
      'Role in Registration',
      'Team Name',
      'Invitation Status',
      'Registered Date'
    ];

    const rows: (string | number | boolean | null | undefined)[][] = [];
    const seenEmails = new Set<string>();

    registrations.forEach((reg) => {
      (reg.members || []).forEach((m) => {
        if (!m.is_club_member && m.email) {
          const emailKey = m.email.toLowerCase().trim();
          if (!seenEmails.has(emailKey)) {
            seenEmails.add(emailKey);
            rows.push([
              m.full_name,
              m.email,
              m.phone || '',
              reg.institution,
              reg.study_year,
              reg.event_title || `Event #${reg.event_id}`,
              m.is_leader ? 'Leader' : 'Participant',
              reg.team_name || 'Individual',
              'Saved for Future Invitations & Recruitment',
              reg.registered_at ? new Date(reg.registered_at).toLocaleDateString() : ''
            ]);
          }
        }
      });
    });

    if (rows.length === 0) {
      alert('No non-member attendees found to export.');
      return;
    }

    const filename = `ERISE_Future_Invites_NonMembers_${new Date().toISOString().slice(0, 10)}.csv`;
    exportToCSV(filename, headers, rows);
  };

  const totalParticipantsCount = filteredRegistrations.reduce((acc, r) => acc + (r.members.length || 1), 0);
  const totalNonMembersCount = registrations.reduce((acc, r) => acc + (r.members.filter(m => !m.is_club_member).length || (r.is_club_member ? 0 : 1)), 0);

  const selectedEventTitle = selectedEventId !== 'all'
    ? events.find(e => e.id === selectedEventId)?.title || 'Selected Event'
    : 'All Events & Workshops';

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#f8fcfd] text-slate-900">
      {/* Header */}
      <div className="p-5 border-b border-slate-200 bg-white shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#0d5c63]" />
              Events & Workshop Participants
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Track workshops, hackathons & bootcamps &bull; Evaluate club members & save prospective non-members for future invitations
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Future Invites Button */}
            <button
              onClick={handleExportFutureInvitesCSV}
              className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Download CSV of all non-members who attended to invite them for future workshops/events"
            >
              <UserPlus className="w-3.5 h-3.5 text-amber-700" />
              <span>Future Invites CSV ({totalNonMembersCount})</span>
            </button>

            {/* Event Specific CSV Export Button */}
            <button
              onClick={handleExportCSV}
              disabled={filteredRegistrations.length === 0}
              className="px-3 py-1.5 bg-[#0d5c63] hover:bg-[#094247] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-40 cursor-pointer"
              title="Download clean CSV of participants for this specific event or workshop"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download {selectedEventId === 'all' ? 'All Events' : selectedEventTitle} CSV</span>
            </button>

            <button
              onClick={loadData}
              className="p-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
              title="Refresh live data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#0d5c63]' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="mt-4 flex flex-col md:flex-row md:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            {/* Event Filter */}
            <div className="flex items-center gap-1 text-xs">
              <span className="text-slate-500 font-medium">Event:</span>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-300 font-medium focus:outline-none focus:border-[#0d5c63]"
              >
                <option value="all">All Events ({events.length})</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Member Type Filter */}
            <div className="flex items-center gap-1 text-xs ml-2">
              <span className="text-slate-500 font-medium">Type:</span>
              <select
                value={memberTypeFilter}
                onChange={(e: any) => setMemberTypeFilter(e.target.value)}
                className="px-2 py-1 text-xs bg-slate-50 border border-slate-300 font-medium focus:outline-none focus:border-[#0d5c63]"
              >
                <option value="all">All Attendees</option>
                <option value="members">Club Members Only</option>
                <option value="non_members">Non-Members / Future Invites</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1 text-xs ml-2">
              <span className="text-slate-500 font-medium">Status:</span>
              <select
                value={statusFilter}
                onChange={(e: any) => setStatusFilter(e.target.value)}
                className="px-2 py-1 text-xs bg-slate-50 border border-slate-300 font-medium focus:outline-none focus:border-[#0d5c63]"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search team, name, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1 bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#0d5c63]"
            />
          </div>
        </div>

        {/* Stats Summary Bar */}
        <div className="mt-3 flex items-center gap-4 text-xs text-slate-600 font-medium">
          <span>
            Showing <strong className="text-slate-900 font-bold">{filteredRegistrations.length}</strong> registration entries
          </span>
          <span>&bull;</span>
          <span>
            Total <strong className="text-[#0d5c63] font-bold">{totalParticipantsCount}</strong> individual participant(s)
          </span>
        </div>
      </div>

      {/* Main List Table */}
      <div className="flex-1 overflow-y-auto p-5">
        {loading ? (
          <div className="h-48 flex items-center justify-center text-xs text-slate-500">
            <RefreshCw className="w-4 h-4 animate-spin text-[#0d5c63] mr-2" />
            Pulling event registrations from database...
          </div>
        ) : filteredRegistrations.length === 0 ? (
          <div className="h-64 border border-dashed border-slate-300 flex flex-col items-center justify-center p-6 text-center">
            <Users className="w-8 h-8 text-slate-300 mb-2" />
            <h3 className="text-sm font-semibold text-slate-700">No event registrations found</h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              No participants have submitted entries for the selected filter yet. When attendees register on the website, they will appear here in real time.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRegistrations.map((reg) => (
              <div
                key={reg.id}
                className="bg-white border border-slate-200 p-4 transition-all hover:border-slate-300"
              >
                {/* Entry Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b border-slate-100 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-[#0d5c63] bg-teal-50 px-2 py-0.5 border border-teal-200">
                      {reg.event_title}
                    </span>
                    {reg.team_name ? (
                      <span className="text-sm font-bold text-slate-900">
                        Team: {reg.team_name}
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                        Individual Registration
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span
                      className={`px-2 py-0.5 font-bold uppercase text-[10px] ${
                        reg.status === 'approved'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : reg.status === 'rejected'
                          ? 'bg-rose-50 text-rose-800 border border-rose-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {reg.status}
                    </span>
                    <span className="text-slate-400 font-mono text-[11px]">
                      {reg.registered_at ? new Date(reg.registered_at).toLocaleString() : ''}
                    </span>
                  </div>
                </div>

                {/* Team Members / Participants Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {reg.members.map((m, idx) => (
                    <div
                      key={m.id || idx}
                      className={`p-3 border text-xs flex flex-col justify-between ${
                        m.is_leader
                          ? 'border-teal-300 bg-teal-50/40'
                          : m.is_club_member
                          ? 'border-emerald-200 bg-emerald-50/20'
                          : 'border-slate-200 bg-slate-50/50'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5 gap-1 flex-wrap">
                          <span className="font-bold text-slate-900 truncate">
                            {m.full_name}
                          </span>
                          <div className="flex items-center gap-1">
                            {m.is_leader && (
                              <span className="text-[9px] font-bold text-[#0d5c63] bg-teal-50 px-1 py-0.2 border border-teal-200 uppercase">
                                Leader
                              </span>
                            )}
                            {m.is_club_member ? (
                              <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 border border-emerald-300 uppercase flex items-center gap-0.5">
                                <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" />
                                <span>Member</span>
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.2 border border-amber-300 uppercase flex items-center gap-0.5">
                                <UserPlus className="w-2.5 h-2.5 text-amber-600" />
                                <span>Future Invite</span>
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="space-y-0.5 text-slate-600 text-[11px]">
                          <div className="flex items-center gap-1 truncate">
                            <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{m.email}</span>
                          </div>
                          {m.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="font-mono">{m.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Member Actions */}
                      <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                        {m.is_club_member ? (
                          <button
                            type="button"
                            onClick={() => {
                              const found = clubMembers.find(cm => cm.id === m.club_member_id || cm.email.toLowerCase() === m.email.toLowerCase());
                              if (found) setEvaluatingMember(found);
                            }}
                            className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
                            title="Evaluate this member's workshop performance & standing"
                          >
                            <Award className="w-3 h-3 text-amber-400" />
                            <span>Evaluate Standing</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-500 italic">
                            Saved on non-members invite list
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Institution & Companion Meta */}
                <div className="mt-3 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                      <strong>{reg.institution}</strong> ({reg.study_year})
                    </span>

                    {reg.has_companion && reg.companion_name && (
                      <span className="text-slate-600">
                        &bull; Companion: <strong>{reg.companion_name}</strong> ({reg.companion_role || 'Companion'})
                      </span>
                    )}
                  </div>

                  <span className="text-slate-400 text-[11px] font-mono">
                    Registration #{reg.id}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Evaluation Modal for Club Members */}
      {evaluatingMember && (
        <AppraisalModal
          member={evaluatingMember}
          onClose={() => setEvaluatingMember(null)}
          onSubmit={async (appraisal) => {
            await submitAppraisal(appraisal);
            setEvaluatingMember(null);
            loadData();
          }}
        />
      )}
    </div>
  );
};
