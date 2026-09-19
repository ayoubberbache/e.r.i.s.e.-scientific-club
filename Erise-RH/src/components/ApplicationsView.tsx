import React, { useState } from 'react';
import { 
  Check, 
  X, 
  Search, 
  Mail, 
  Phone, 
  GraduationCap, 
  Filter
} from 'lucide-react';
import { ClubMember } from '../types';

interface ApplicationsViewProps {
  members: ClubMember[];
  onUpdateStatus: (id: number, status: 'approved' | 'rejected') => Promise<void>;
  onRefresh: () => void;
}

export const ApplicationsView: React.FC<ApplicationsViewProps> = ({
  members,
  onUpdateStatus,
  onRefresh,
}) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState<number | null>(null);

  const filtered = members.filter((m) => {
    const matchesFilter = filter === 'all' || m.status === filter;
    const matchesSearch = 
      m.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.skills && m.skills.toLowerCase().includes(searchQuery.toLowerCase())) ||
      m.department.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleAction = async (id: number, newStatus: 'approved' | 'rejected') => {
    setProcessingId(id);
    try {
      await onUpdateStatus(id, newStatus);
      onRefresh();
    } finally {
      setProcessingId(null);
    }
  };

  const pendingCount = members.filter(m => m.status === 'pending').length;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#f8fcfd] text-slate-900">
      {/* Header */}
      <div className="p-5 border-b border-slate-200 bg-white shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">
              Club Intake & Candidate Review
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Screen applicant submissions from the registration page &bull; Approved members enter active rosters at 50% baseline rating
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200">
              {pendingCount} Pending Candidates
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-100 text-xs">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search candidate name, department, skill..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 p-0.5">
            <Filter className="w-3 h-3 text-slate-400 ml-1.5" />
            {(['all', 'pending', 'approved', 'rejected'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setFilter(s)}
                className={`px-2.5 py-1 font-bold text-[11px] transition-colors cursor-pointer capitalize ${
                  filter === s
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Candidates List */}
      <div className="flex-1 overflow-y-auto p-5">
        {filtered.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-xs text-center space-y-1">
            <p>No candidates found matching filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filtered.map((candidate) => {
              const isProcessing = processingId === candidate.id;
              const isPending = candidate.status === 'pending';

              return (
                <div
                  key={candidate.id}
                  className="p-4 bg-white border border-slate-200 flex flex-col justify-between hover:border-slate-400 transition-colors shadow-xs"
                >
                  <div>
                    {/* Top Status Strip */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-slate-100 text-slate-700 border border-slate-200">
                          {candidate.department}
                        </span>
                        <h3 className="text-sm font-bold text-slate-900 mt-1.5 leading-tight truncate">
                          {candidate.full_name}
                        </h3>
                      </div>

                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 uppercase border shrink-0 ${
                        candidate.status === 'approved' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                        candidate.status === 'rejected' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                        'bg-amber-50 text-amber-800 border-amber-200'
                      }`}>
                        {candidate.status}
                      </span>
                    </div>

                    {/* Info Rows */}
                    <div className="mt-3 space-y-1 text-xs text-slate-600">
                      <div className="flex items-center gap-1.5 truncate">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{candidate.email}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-mono">{candidate.phone}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Year {candidate.study_year} &bull; {candidate.specialization || 'Engineering'}</span>
                      </div>
                    </div>

                    {/* Candidate Statement / Skills */}
                    {candidate.skills && (
                      <div className="mt-3 p-2.5 bg-slate-50 border border-slate-200 text-xs">
                        <div className="text-[10px] uppercase font-bold text-slate-500 mb-0.5">Skills / Background</div>
                        <p className="text-slate-700 leading-relaxed line-clamp-3">
                          {candidate.skills}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Decision Actions */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                    {isPending ? (
                      <>
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleAction(candidate.id, 'rejected')}
                          className="px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>

                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleAction(candidate.id, 'approved')}
                          className="px-3.5 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve Member</span>
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleAction(candidate.id, candidate.status === 'approved' ? 'rejected' : 'approved')}
                        className="text-xs text-slate-500 hover:text-slate-800 underline transition-colors cursor-pointer"
                      >
                        Change to {candidate.status === 'approved' ? 'Rejected' : 'Approved'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
