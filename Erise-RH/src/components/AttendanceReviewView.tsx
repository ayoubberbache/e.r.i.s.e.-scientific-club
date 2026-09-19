import React, { useState, useEffect } from 'react';
import { 
  CalendarCheck, 
  Search, 
  CheckCircle2, 
  XCircle,
  Download
} from 'lucide-react';
import { AttendanceLog } from '../types';
import { supabase } from '../lib/supabase';
import { exportToCSV } from '../lib/hrEngine';

interface AttendanceReviewViewProps {
  onRefreshMembers: () => void;
}

export const AttendanceReviewView: React.FC<AttendanceReviewViewProps> = ({
  onRefreshMembers,
}) => {
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('attendance_logs')
        .select('*')
        .order('session_date', { ascending: false });

      if (data && !error) {
        const { data: regs } = await supabase
          .from('registrations')
          .select('id, full_name, first_name, last_name');

        const memberMap = new Map<number, string>();
        (regs || []).forEach((r: any) => {
          memberMap.set(r.id, r.full_name || `${r.first_name || ''} ${r.last_name || ''}`.trim());
        });

        const mapped: AttendanceLog[] = data.map((d: any) => ({
          id: d.id,
          member_id: d.member_id,
          member_name: memberMap.get(d.member_id) || `Member #${d.member_id}`,
          event_id: d.event_id,
          event_title: d.event_title || 'Technical Workshop',
          session_date: d.session_date,
          status: d.status,
          absence_reason: d.absence_reason,
          created_at: d.created_at,
        }));

        setLogs(mapped);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const events = ['All', ...Array.from(new Set(logs.map((l) => l.event_title)))];

  const filtered = logs.filter((l) => {
    const matchesEvent = selectedEvent === 'All' || l.event_title === selectedEvent;
    const matchesSearch = 
      (l.member_name && l.member_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      l.event_title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesEvent && matchesSearch;
  });

  const presentCount = filtered.filter((l) => l.status === 'Present').length;
  const absentCount = filtered.filter((l) => l.status === 'Absent').length;
  const attendanceRate = filtered.length > 0 
    ? Math.round((presentCount / filtered.length) * 100) 
    : 100;

  const handleExportCSV = () => {
    const headers = [
      'Log ID',
      'Member ID',
      'Member Name',
      'Event / Workshop Title',
      'Session Date',
      'Status',
      'Absence Reason',
      'Logged At'
    ];

    const rows = filtered.map((l) => [
      l.id,
      l.member_id,
      l.member_name || '',
      l.event_title,
      l.session_date,
      l.status,
      l.absence_reason || '',
      l.created_at ? new Date(l.created_at).toLocaleString() : ''
    ]);

    exportToCSV(`ERISE_Attendance_${selectedEvent}_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#f8fcfd] text-slate-900">
      {/* Header */}
      <div className="p-5 border-b border-slate-200 bg-white shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">
              Workshop & Bootcamp Attendance Records
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Synchronized with Projects Department attendance check-ins &bull; Present sessions reward +5%, unexcused absence deducts -5%
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportCSV}
              disabled={filtered.length === 0}
              className="px-3 py-1.5 bg-[#0d5c63] hover:bg-[#094247] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-40"
              title="Download CSV containing filtered attendance records"
            >
              <Download className="w-3.5 h-3.5" />
              Export Attendance File (CSV)
            </button>

            {/* Aggregate Metrics */}
            <div className="flex items-center gap-2">
              <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 text-xs">
                <div className="text-[10px] uppercase font-bold text-slate-500">Total Check-ins</div>
                <div className="text-base font-bold font-mono text-slate-900 mt-0.5">
                  {logs.length}
                </div>
              </div>

              <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 text-xs">
                <div className="text-[10px] uppercase font-bold text-emerald-700">Turnout Rate</div>
                <div className="text-base font-bold font-mono text-emerald-700 mt-0.5">
                  {attendanceRate}%
                </div>
              </div>

              <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 text-xs">
                <div className="text-[10px] uppercase font-bold text-slate-500">Present / Absent</div>
                <div className="text-base font-bold font-mono text-slate-800 mt-0.5">
                  <span className="text-emerald-700">{presentCount}</span> / <span className="text-rose-700">{absentCount}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search member attendance log..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white"
              />
            </div>
          </div>

          <div className="flex items-center gap-1 overflow-x-auto">
            <span className="text-slate-500 font-bold text-[11px] mr-1">Event:</span>
            {events.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setSelectedEvent(e)}
                className={`px-2.5 py-1 font-bold text-[11px] transition-colors cursor-pointer whitespace-nowrap border ${
                  selectedEvent === e
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'text-slate-600 hover:text-slate-900 bg-white border-slate-200'
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="flex-1 overflow-y-auto p-5">
        {loading ? (
          <div className="h-64 flex items-center justify-center text-slate-500 text-xs font-mono">
            Loading attendance logs from database...
          </div>
        ) : filtered.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-xs text-center space-y-2">
            <CalendarCheck className="w-8 h-8 text-slate-400" />
            <p>No attendance logs found.</p>
            <p className="text-[11px] text-slate-400">
              When the Projects Department ticks attendance for workshops, records will appear here.
            </p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                    <th className="py-2.5 px-4">Member</th>
                    <th className="py-2.5 px-4">Workshop / Bootcamp</th>
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">HR Score Impact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filtered.map((log) => {
                    const isPresent = log.status === 'Present';
                    return (
                      <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-4 font-bold text-slate-900">
                          <div>{log.member_name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">ID: #{log.member_id}</div>
                        </td>
                        <td className="py-2.5 px-4 text-slate-700 font-medium">
                          {log.event_title}
                        </td>
                        <td className="py-2.5 px-4 text-slate-500 font-mono text-[11px]">
                          {log.session_date}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold font-mono border ${
                            isPresent 
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                              : 'bg-rose-50 text-rose-800 border-rose-200'
                          }`}>
                            {isPresent ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            <span>{log.status}</span>
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold">
                          <span className={isPresent ? 'text-emerald-700' : 'text-rose-700'}>
                            {isPresent ? '+5.0%' : '-5.0%'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
