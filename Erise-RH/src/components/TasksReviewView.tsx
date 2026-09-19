import React, { useState } from 'react';
import { 
  CheckSquare, 
  Clock, 
  Users, 
  Award, 
  CheckCircle2, 
  Filter, 
  FolderKanban
} from 'lucide-react';
import { DepartmentTask } from '../types';

interface TasksReviewViewProps {
  tasks: DepartmentTask[];
  onAwardPoints: (taskId: string) => void;
}

export const TasksReviewView: React.FC<TasksReviewViewProps> = ({
  tasks,
  onAwardPoints,
}) => {
  const [deptFilter, setDeptFilter] = useState<'All' | 'Projects' | 'Organization' | 'Media'>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'completed' | 'in_progress' | 'pending'>('All');

  const filtered = tasks.filter((t) => {
    const matchesDept = deptFilter === 'All' || t.department === deptFilter;
    const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
    return matchesDept && matchesStatus;
  });

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#f8fcfd] text-slate-900">
      {/* Header */}
      <div className="p-5 border-b border-slate-200 bg-white shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">
              Department Tasks & HR Point Allocation
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Review tasks executed across Projects, Organization & Media &bull; Each completed task grants +5% towards member standing
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 text-xs font-mono">
              <span className="text-slate-500">Completed: </span>
              <span className="font-bold text-emerald-700">
                {tasks.filter(t => t.status === 'completed').length} / {tasks.length}
              </span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-slate-100 text-xs">
          {/* Dept Filter */}
          <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 p-0.5">
            <Filter className="w-3 h-3 text-slate-400 ml-1.5" />
            {(['All', 'Projects', 'Organization', 'Media'] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDeptFilter(d)}
                className={`px-2.5 py-1 font-bold text-[11px] transition-colors cursor-pointer ${
                  deptFilter === d
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 p-0.5">
            {(['All', 'completed', 'in_progress', 'pending'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1 font-bold text-[11px] transition-colors cursor-pointer capitalize ${
                  statusFilter === s
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {s === 'All' ? 'All Statuses' : s.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto p-5">
        {filtered.length === 0 ? (
          <div className="h-64 border border-dashed border-slate-300 flex flex-col items-center justify-center p-6 text-center">
            <FolderKanban className="w-8 h-8 text-slate-400 mb-2" />
            <h3 className="text-sm font-semibold text-slate-800">No Department Tasks Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              No tasks have been created in the database. When Department Heads create or assign tasks in Projects, Organization, or Media, they will synchronize here in real time.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
            {filtered.map((task) => {
              const isDone = task.status === 'completed';
              return (
                <div
                  key={task.id}
                  className="p-4 bg-white border border-slate-200 flex flex-col justify-between hover:border-slate-400 transition-colors shadow-xs"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 border font-mono bg-slate-100 text-slate-700 border-slate-200">
                          {task.department} Department
                        </span>
                        <h3 className="text-sm font-bold text-slate-900 mt-1.5 leading-snug">
                          {task.title}
                        </h3>
                      </div>

                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 uppercase border shrink-0 ${
                        isDone ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                        task.status === 'in_progress' ? 'bg-sky-50 text-sky-800 border-sky-200' :
                        'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {task.status.replace('_', ' ')}
                      </span>
                    </div>

                    {task.description && (
                      <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                        {task.description}
                      </p>
                    )}

                    {/* Assigned Members */}
                    <div className="mt-3 p-2.5 bg-slate-50 border border-slate-200">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Users className="w-3 h-3 text-slate-600" />
                        <span>Assigned Personnel ({task.assigned_member_names.length})</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {task.assigned_member_names.map((name, i) => (
                          <span
                            key={i}
                            className="px-1.5 py-0.5 bg-white border border-slate-200 text-xs font-semibold text-slate-800"
                          >
                            {name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Footer & HR Points Action */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(task.created_at).toLocaleDateString()}</span>
                    </div>

                    {isDone && (
                      <div className="flex items-center gap-2">
                        {task.hr_points_awarded ? (
                          <span className="flex items-center gap-1 text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>+5% Points Credited</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onAwardPoints(task.id)}
                            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Award className="w-3.5 h-3.5" />
                            <span>Award +5% to Assignees</span>
                          </button>
                        )}
                      </div>
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
