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
import { EventItem, EventRegistration } from '../types';
import { fetchEvents, fetchEventRegistrations, exportToCSV } from '../lib/hrEngine';

export const EventsReviewView: React.FC = () => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const loadData = async () => {
    setLoading(true);
    try {
      const [allEvents, allRegs] = await Promise.all([
        fetchEvents(),
        fetchEventRegistrations(selectedEventId === 'all' ? undefined : selectedEventId)
      ]);
      setEvents(allEvents);
      setRegistrations(allRegs);
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

    return matchesStatus && matchesSearch;
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

  const totalParticipantsCount = filteredRegistrations.reduce((acc, r) => acc + (r.members.length || 1), 0);

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#f8fcfd] text-slate-900">
      {/* Header */}
      <div className="p-5 border-b border-slate-200 bg-white shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#0d5c63]" />
              Events & Hackathon Registrations
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Live registration data from competitions, idea tracks, hackathons, and workshops &bull; Export attendee lists
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              disabled={filteredRegistrations.length === 0}
              className="px-3 py-1.5 bg-[#0d5c63] hover:bg-[#094247] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-40"
              title="Download CSV containing all participants and team members"
            >
              <Download className="w-3.5 h-3.5" />
              Extract Participants File (CSV)
            </button>

            <button
              onClick={loadData}
              className="p-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
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
                      className={`p-2.5 border text-xs ${
                        m.is_leader
                          ? 'border-teal-200 bg-teal-50/40'
                          : 'border-slate-200 bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-900 truncate">
                          {m.full_name}
                        </span>
                        {m.is_leader && (
                          <span className="text-[10px] font-bold text-[#0d5c63] uppercase">
                            Leader
                          </span>
                        )}
                      </div>

                      <div className="space-y-0.5 text-slate-600 text-[11px]">
                        <div className="flex items-center gap-1 truncate">
                          <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{m.email}</span>
                        </div>
                        {m.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{m.phone}</span>
                          </div>
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

                  <span className="text-slate-400 text-[11px]">
                    Registration #{reg.id}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
