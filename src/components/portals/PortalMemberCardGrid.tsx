import React, { useState } from 'react';
import { 
  GraduationCap, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  Mail, 
  Phone, 
  Award, 
  ShieldCheck, 
  Trash2, 
  Edit,
  UserCheck,
  CalendarCheck,
  CheckCircle,
  Plus
} from 'lucide-react';
import { DepartmentMember, Department, EventStaffAssignment } from '../../types/portals';

interface PortalMemberCardGridProps {
  members: DepartmentMember[];
  department: Department;
  onOpenRoleModal?: (member: DepartmentMember) => void;
  onDeleteMember?: (memberId: number | string) => void;
  onOpenEvaluation: (member: DepartmentMember) => void;
  onToggleAffiliate?: (member: DepartmentMember) => void;
  affiliatedMemberIds?: Set<string>;
  eventAssignments?: EventStaffAssignment[];
  onEditDuty?: (assignmentId: string, currentDuty: string) => void;
}

export const PortalMemberCardGrid: React.FC<PortalMemberCardGridProps> = ({
  members,
  department,
  onOpenRoleModal,
  onDeleteMember,
  onOpenEvaluation,
  onToggleAffiliate,
  affiliatedMemberIds,
  eventAssignments,
  onEditDuty,
}) => {
  const [expandedId, setExpandedId] = useState<string | number | null>(null);

  if (members.length === 0) {
    return (
      <div className="p-12 text-center rounded-3xl border border-slate-800 bg-[#090d16]/80 text-slate-400">
        <h3 className="font-bold text-white text-base">No Members Found</h3>
        <p className="text-xs text-slate-500 mt-1">Try broadening your search or filter criteria.</p>
      </div>
    );
  }

  const toggleExpand = (id: string | number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getDepartmentBadgeStyle = (dept: string) => {
    switch (dept) {
      case 'Media':
        return 'bg-purple-950/40 text-purple-300 border-purple-800';
      case 'Organization':
        return 'bg-blue-950/40 text-blue-300 border-blue-800';
      case 'Projects':
        return 'bg-cyan-950/40 text-cyan-300 border-cyan-800';
      case 'HR & External Relations':
        return 'bg-emerald-950/40 text-emerald-300 border-emerald-800';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {members.map((member) => {
        const isExpanded = expandedId === member.id;
        const deptsList = member.departments && member.departments.length > 0 ? member.departments : [department];
        const currentGeneralRating = Math.round(member.rating ?? 50);

        const rawMemberId = String(member.id).replace(/^reg-|^leader-|^mem-/, '');
        const isAffiliated = affiliatedMemberIds ? (affiliatedMemberIds.has(String(member.id)) || affiliatedMemberIds.has(rawMemberId)) : false;
        const currentAssignment = eventAssignments ? eventAssignments.find((a) => String(a.member_id).replace(/^reg-|^leader-|^mem-/, '') === rawMemberId) : undefined;

        return (
          <div
            key={member.id}
            onClick={() => toggleExpand(member.id)}
            className={`rounded-2xl glass-panel bg-[#090d16]/90 border transition-all duration-300 overflow-hidden cursor-pointer p-4 flex flex-col justify-between ${
              isExpanded
                ? 'border-[#00e5ff] shadow-lg ring-2 ring-[#00e5ff]/20 col-span-1 md:col-span-2 lg:col-span-3'
                : 'border-slate-800 hover:border-[#00e5ff]/40 hover:shadow-md'
            }`}
          >
            {/* COLLAPSED / HEADER SECTION */}
            <div className="space-y-3">
              {/* Top Row: Avatar + Role Badge + Name */}
              <div className="flex items-start gap-3">
                {member.avatar ? (
                  <img
                    src={member.avatar}
                    alt={member.full_name}
                    className="w-12 h-12 rounded-xl object-cover border border-[#00e5ff] shadow-sm shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-[#0d5c63] text-white dark:bg-[#00e5ff] dark:text-slate-950 font-bold text-sm flex items-center justify-center border border-[#00e5ff]/40 shadow-sm shrink-0">
                    {member.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                  </div>
                )}

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="mb-0.5 flex items-center justify-between gap-2">
                    <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#00e5ff]/15 text-[#00e5ff] border border-[#00e5ff]/30">
                      {member.role || 'Member'}
                    </span>

                    {onToggleAffiliate ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleAffiliate(member);
                        }}
                        className={`px-3 py-1 rounded-xl font-black text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer border ${
                          isAffiliated
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400 hover:bg-emerald-400'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-[#00e5ff] hover:text-white'
                        }`}
                      >
                        {isAffiliated ? <CheckCircle size={14} className="text-slate-950" /> : <Plus size={14} />}
                        <span>{isAffiliated ? '✓ Affiliated' : '+ Affiliate'}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenEvaluation(member);
                        }}
                        className="text-xs font-black text-[#00e5ff] bg-[#00e5ff]/10 hover:bg-[#00e5ff]/20 px-2 py-0.5 rounded-lg border border-[#00e5ff]/30 shrink-0 flex items-center gap-1 cursor-pointer transition-colors"
                        title="Click to evaluate member rating"
                      >
                        <Award size={13} className="text-amber-400" />
                        <span>{currentGeneralRating}% Rating</span>
                      </button>
                    )}
                  </div>

                  <h3 className="font-extrabold text-white text-base leading-snug truncate">
                    {member.full_name}
                  </h3>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 text-xs font-semibold text-[#00e5ff]">
                      <GraduationCap size={13} className="shrink-0" />
                      <span>{member.specialization || 'ENR'} Branch</span>
                    </div>

                    {onToggleAffiliate && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenEvaluation(member);
                        }}
                        className="text-xs font-black text-[#00e5ff] bg-[#00e5ff]/10 hover:bg-[#00e5ff]/20 px-2 py-0.5 rounded-lg border border-[#00e5ff]/30 shrink-0 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Award size={12} className="text-amber-400" />
                        <span>{currentGeneralRating}%</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Specific Event Duty Badge (if affiliated) */}
              {isAffiliated && currentAssignment && (
                <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 shrink-0">Duty:</span>
                    <span className="font-bold text-[#00e5ff] truncate">{currentAssignment.assigned_role || 'Event Staff'}</span>
                  </div>
                  {onEditDuty && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditDuty(currentAssignment.id, currentAssignment.assigned_role || '');
                      }}
                      className="text-[11px] font-bold text-slate-400 hover:text-white px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors shrink-0 flex items-center gap-1"
                    >
                      <Edit size={11} /> Edit Duty
                    </button>
                  )}
                </div>
              )}

              {/* Department Badges Row */}
              <div className="flex flex-wrap items-center gap-1 pt-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mr-1">
                  Depts:
                </span>
                {deptsList.map((d) => (
                  <span
                    key={d}
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${getDepartmentBadgeStyle(d)}`}
                  >
                    {d}
                  </span>
                ))}
              </div>
            </div>

            {/* Click to Expand / Collapse Footer Bar */}
            <div className="pt-3 mt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span className="font-medium flex items-center gap-1">
                <Sparkles size={12} className="text-[#00e5ff]" />
                {isExpanded ? 'Click to collapse record' : 'Click to view full record'}
              </span>
              <div className="p-0.5 rounded-full bg-slate-800 text-slate-400">
                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
            </div>

            {/* ── EXPANDED FULL RECORD SECTION ───────────────────────────────────── */}
            {isExpanded && (
              <div 
                className="pt-4 mt-3 border-t border-slate-800 space-y-4 animate-fade-in text-xs text-slate-300"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Contact & Personal Info Card */}
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-white flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-[#00e5ff]" />
                    Member Details
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-0.5">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Email Address</span>
                      <div className="font-bold text-white truncate">{member.email}</div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-0.5">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Phone Number</span>
                      <div className="font-bold text-white">{member.phone || 'N/A'}</div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-0.5">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Year of Study</span>
                      <div className="font-bold text-white">Year {member.study_year}</div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-0.5">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Specialization</span>
                      <div className="font-bold text-white">{member.specialization || 'ENR'}</div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions Toolbar */}
                <div className="pt-2 flex flex-wrap items-center justify-end gap-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => onOpenEvaluation(member)}
                    className="py-2 px-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Award size={14} /> Evaluate Rating
                  </button>

                  {onOpenRoleModal && (
                    <button
                      type="button"
                      onClick={() => onOpenRoleModal(member)}
                      className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
                    >
                      <ShieldCheck size={13} /> Edit Role
                    </button>
                  )}

                  {onDeleteMember && (
                    <button
                      type="button"
                      onClick={() => onDeleteMember(member.id)}
                      className="py-2 px-3 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-rose-500/20"
                    >
                      <Trash2 size={13} /> Remove
                    </button>
                  )}
                </div>

              </div>
            )}

          </div>
        );
      })}
    </div>
  );
};
