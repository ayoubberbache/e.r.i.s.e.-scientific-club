import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Award, 
  CalendarCheck, 
  CheckSquare, 
  Edit3, 
  ArrowUpDown,
  Mail,
  GraduationCap
} from 'lucide-react';
import { ClubMember, AppraisalInput } from '../types';
import { AppraisalModal } from './AppraisalModal';

interface MemberEvaluationViewProps {
  members: ClubMember[];
  loading: boolean;
  onRefresh: () => void;
  onSubmitAppraisal: (appraisal: AppraisalInput) => Promise<void>;
}

export const MemberEvaluationView: React.FC<MemberEvaluationViewProps> = ({
  members,
  loading,
  onRefresh,
  onSubmitAppraisal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [tierFilter, setTierFilter] = useState('All');
  const [sortBy, setSortBy] = useState<'rating_desc' | 'rating_asc' | 'name' | 'attendance'>('rating_desc');
  const [selectedMember, setSelectedMember] = useState<ClubMember | null>(null);

  const departments = ['All', 'Projects', 'Organization', 'Media'];

  // Filtering & Sorting
  const filtered = members.filter((m) => {
    const matchesSearch = 
      m.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.skills && m.skills.toLowerCase().includes(searchQuery.toLowerCase())) ||
      m.department.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDept = deptFilter === 'All' || m.department.toLowerCase().includes(deptFilter.toLowerCase());
    const matchesTier = tierFilter === 'All' || m.rating_tier === tierFilter;

    return matchesSearch && matchesDept && matchesTier;
  });

  filtered.sort((a, b) => {
    if (sortBy === 'rating_desc') return b.overall_rating - a.overall_rating;
    if (sortBy === 'rating_asc') return a.overall_rating - b.overall_rating;
    if (sortBy === 'name') return a.full_name.localeCompare(b.full_name);
    if (sortBy === 'attendance') return b.attendance_present - a.attendance_present;
    return 0;
  });

  // Summary Metrics
  const totalApproved = members.filter(m => m.status === 'approved').length;
  const avgRating = members.length > 0 
    ? Math.round((members.reduce((acc, m) => acc + m.overall_rating, 0) / members.length) * 10) / 10 
    : 50.0;
  const exceptionalCount = members.filter(m => m.overall_rating >= 85).length;
  const solidCount = members.filter(m => m.overall_rating >= 65 && m.overall_rating < 85).length;
  const needsAttentionCount = members.filter(m => m.overall_rating < 45).length;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#f8fcfd]">
      {/* Top Banner with Key Metrics */}
      <div className="p-5 border-b border-slate-200 bg-white shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">
              Member Evaluation
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              50% baseline protocol &bull; Performance adjustments from workshops, tasks and evaluations
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-left">
            <div className="px-3 py-2 bg-slate-50 border border-slate-200">
              <div className="text-[10px] uppercase font-bold text-slate-500">Total Members</div>
              <div className="text-base font-bold font-mono text-slate-900 mt-0.5">
                {totalApproved} <span className="text-xs font-normal text-slate-500">Active</span>
              </div>
            </div>

            <div className="px-3 py-2 bg-slate-50 border border-slate-200">
              <div className="text-[10px] uppercase font-bold text-slate-500">Club Mean Rating</div>
              <div className="text-base font-bold font-mono text-[#0d5c63] mt-0.5">
                {avgRating}% <span className="text-xs font-normal text-slate-500">avg</span>
              </div>
            </div>

            <div className="px-3 py-2 bg-slate-50 border border-slate-200">
              <div className="text-[10px] uppercase font-bold text-emerald-700">Top Tier (&ge;65%)</div>
              <div className="text-base font-bold font-mono text-emerald-700 mt-0.5">
                {exceptionalCount + solidCount}
              </div>
            </div>

            <div className="px-3 py-2 bg-slate-50 border border-slate-200">
              <div className="text-[10px] uppercase font-bold text-rose-700">Needs Attention</div>
              <div className="text-base font-bold font-mono text-rose-700 mt-0.5">
                {needsAttentionCount}
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-200">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
            {/* Search Input */}
            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search member, skill, department..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#0d5c63]"
              />
            </div>

            {/* Department Filter */}
            <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 p-0.5 text-xs">
              <Filter className="w-3 h-3 text-slate-400 ml-1.5" />
              {departments.map((dept) => (
                <button
                  key={dept}
                  type="button"
                  onClick={() => setDeptFilter(dept)}
                  className={`px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                    deptFilter === dept
                      ? 'bg-white text-[#0d5c63] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {dept}
                </button>
              ))}
            </div>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 flex items-center gap-1 font-medium">
              <ArrowUpDown className="w-3 h-3" /> Sort:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2.5 py-1.5 bg-white border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-[#0d5c63]"
            >
              <option value="rating_desc">Highest Rating</option>
              <option value="rating_asc">Lowest Rating</option>
              <option value="name">Name (A-Z)</option>
              <option value="attendance">Workshop Attendance</option>
            </select>
          </div>
        </div>
      </div>

      {/* Member Cards / Grid */}
      <div className="flex-1 overflow-y-auto p-5">
        {loading ? (
          <div className="h-64 flex items-center justify-center text-slate-500 text-xs font-mono">
            Loading member directory and baseline scores...
          </div>
        ) : filtered.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-xs text-center border border-dashed border-slate-300 bg-white p-6">
            <p className="font-semibold text-slate-700">No members matched your search criteria.</p>
            <p className="text-slate-400 mt-1">Try selecting another department or resetting filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
            {filtered.map((m) => {
              const score = m.overall_rating;
              const deltaFromBaseline = Math.round((score - 50.0) * 10) / 10;

              return (
                <div
                  key={m.id}
                  className="bg-white border border-slate-200 p-4 flex flex-col justify-between hover:border-slate-400 transition-colors shadow-xs"
                >
                  <div>
                    {/* Header: Name & Department Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          {m.full_name}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-500">
                          <span className="font-semibold text-[#0d5c63]">{m.department}</span>
                          {m.academic_year && (
                            <>
                              <span>&bull;</span>
                              <span className="flex items-center gap-1">
                                <GraduationCap className="w-3 h-3" />
                                {m.academic_year}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Tier Badge */}
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 uppercase border shrink-0 ${
                        score >= 85 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        score >= 65 ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        score >= 45 ? 'bg-slate-100 text-slate-700 border-slate-200' :
                        'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {m.rating_tier}
                      </span>
                    </div>

                    {/* Email / Contacts */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-2 truncate font-mono">
                      <Mail className="w-3 h-3 shrink-0 text-slate-400" />
                      <span className="truncate">{m.email}</span>
                    </div>

                    {/* Skills pill */}
                    {m.skills && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {m.skills.split(',').slice(0, 3).map((s, idx) => (
                          <span key={idx} className="text-[10px] px-1.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-600">
                            {s.trim()}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Rating Gauge Visualizer */}
                    <div className="mt-3.5 p-2.5 bg-slate-50 border border-slate-200">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          HR Evaluation Score
                        </span>
                        <div className="flex items-baseline gap-1.5 font-mono">
                          <span className={`text-sm font-bold ${
                            score >= 85 ? 'text-emerald-700' :
                            score >= 65 ? 'text-blue-700' :
                            score >= 45 ? 'text-slate-900' : 'text-rose-700'
                          }`}>
                            {score}%
                          </span>
                          <span className={`text-[10px] font-medium ${
                            deltaFromBaseline > 0 ? 'text-emerald-700' :
                            deltaFromBaseline < 0 ? 'text-rose-700' : 'text-slate-400'
                          }`}>
                            ({deltaFromBaseline > 0 ? `+${deltaFromBaseline}%` : `${deltaFromBaseline}%`})
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="relative w-full h-1.5 bg-slate-200 overflow-hidden">
                        <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-slate-400 z-10" title="50% Starting Baseline" />
                        <div 
                          className={`h-full transition-all ${
                            score >= 85 ? 'bg-emerald-600' :
                            score >= 65 ? 'bg-blue-600' :
                            score >= 45 ? 'bg-[#0d5c63]' : 'bg-rose-600'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(5, score))}%` }}
                        />
                      </div>
                    </div>

                    {/* Operational Stats Breakdown */}
                    <div className="grid grid-cols-2 gap-2 mt-2.5 text-xs">
                      <div className="p-2 bg-slate-50 border border-slate-200 flex items-center gap-2">
                        <CalendarCheck className="w-3.5 h-3.5 text-[#0d5c63] shrink-0" />
                        <div>
                          <div className="text-slate-500 text-[10px] uppercase font-bold">Attendance</div>
                          <div className="font-mono text-slate-800 font-semibold">
                            {m.attendance_present} Pres / {m.attendance_absent} Abs
                          </div>
                        </div>
                      </div>

                      <div className="p-2 bg-slate-50 border border-slate-200 flex items-center gap-2">
                        <CheckSquare className="w-3.5 h-3.5 text-[#0d5c63] shrink-0" />
                        <div>
                          <div className="text-slate-500 text-[10px] uppercase font-bold">Completed Tasks</div>
                          <div className="font-mono text-slate-800 font-semibold">
                            {m.tasks_completed} Tasks
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer: Action Button */}
                  <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-mono">
                      ID #{m.id}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedMember(m)}
                      className="px-3 py-1 bg-white hover:bg-slate-50 text-[#0d5c63] font-semibold text-xs border border-slate-300 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Evaluate</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Appraisal Modal */}
      {selectedMember && (
        <AppraisalModal
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
          onSubmit={async (appraisal) => {
            await onSubmitAppraisal(appraisal);
            setSelectedMember(null);
            onRefresh();
          }}
        />
      )}
    </div>
  );
};
