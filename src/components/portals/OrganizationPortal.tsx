import React, { useState, useEffect } from 'react';
import { 
  fetchDepartmentMembers, 
  fetchDepartmentTasks, 
  createDepartmentTask, 
  markDepartmentTaskDone, 
  deleteDepartmentTask 
} from '../../lib/departmentStorage';
import { DEPARTMENT_HEADS } from '../../data/departmentHeads';
import { DepartmentMember, ClubTask } from '../../types/portals';
import { 
  Building2, CheckSquare, Plus, CheckCircle2, Clock, 
  Trash2, Users, X, Check, Loader2,
  Search, Mail, Phone
} from 'lucide-react';

interface OrganizationPortalProps {
  onBackToAdmin?: () => void;
  isSuperAdmin?: boolean;
}

export function OrganizationPortal({ onBackToAdmin, isSuperAdmin }: OrganizationPortalProps) {
  const headConfig = DEPARTMENT_HEADS.Organization;

  const [activeTab, setActiveTab] = useState<'tasks' | 'members'>('tasks');

  // Tasks State
  const [tasks, setTasks] = useState<ClubTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [taskFilter, setTaskFilter] = useState<'all' | 'active' | 'completed'>('all');

  // Members State
  const [members, setMembers] = useState<DepartmentMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');

  // New Task Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskPriority, setTaskPriority] = useState<'Low' | 'Medium' | 'High'>('High');
  const [taskDeadline, setTaskDeadline] = useState('');
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<(string | number)[]>([]);
  const [creatingTask, setCreatingTask] = useState(false);

  useEffect(() => {
    loadMembers();
    loadTasks();
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

  const loadTasks = async () => {
    setTasksLoading(true);
    try {
      const list = await fetchDepartmentTasks('Organization');
      setTasks(list);
    } catch (err) {
      console.error('Error loading organization tasks:', err);
    } finally {
      setTasksLoading(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    setCreatingTask(true);
    try {
      const assigned = selectedAssigneeIds.map((mId) => {
        const mem = members.find((m) => String(m.id) === String(mId));
        return {
          id: mId,
          name: mem?.full_name || `Member #${mId}`,
        };
      });

      const newTask = await createDepartmentTask('Organization', {
        title: taskTitle.trim(),
        description: taskDescription.trim(),
        assigned_member_ids: selectedAssigneeIds,
        assigned_members: assigned,
        priority: taskPriority,
        deadline: taskDeadline || undefined,
        status: 'In Progress',
      });

      setTasks((prev) => [newTask, ...prev]);
      setCreateModalOpen(false);
      setTaskTitle('');
      setTaskDescription('');
      setTaskPriority('High');
      setTaskDeadline('');
      setSelectedAssigneeIds([]);
    } catch (err) {
      console.error('Failed to create task:', err);
    } finally {
      setCreatingTask(false);
    }
  };

  const handleMarkDone = async (taskId: string) => {
    try {
      await markDepartmentTaskDone('Organization', taskId);
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, status: 'Completed', completed_at: new Date().toISOString() } : t
        )
      );
    } catch (err) {
      console.error('Failed to mark task done:', err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await deleteDepartmentTask('Organization', taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (taskFilter === 'active') return t.status !== 'Completed';
    if (taskFilter === 'completed') return t.status === 'Completed';
    return true;
  });

  const activeCount = tasks.filter((t) => t.status !== 'Completed').length;
  const completedCount = tasks.filter((t) => t.status === 'Completed').length;

  const filteredMembers = members.filter((m) => {
    if (!memberSearchQuery) return true;
    const q = memberSearchQuery.toLowerCase();
    return (
      m.full_name?.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q) ||
      m.phone?.includes(q) ||
      m.role?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5 text-slate-900 max-w-7xl mx-auto pb-10">
      {/* Top Header Controls - Classic Minimal Light Theme */}
      <div className="bg-white border border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-100 text-slate-800 border border-slate-300 flex items-center justify-center font-bold shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 bg-slate-100 px-2 py-0.5 border border-slate-200">
                Department Admin
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-medium text-slate-600">
                Connected
              </span>
            </div>
            <h1 className="text-lg font-bold text-slate-900 mt-0.5">Organization & Event Logistics</h1>
            <p className="text-xs text-slate-500">Head: {headConfig.name} • Operational Planning, Protocols & Venue Operations</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 border border-slate-200 w-full sm:w-auto overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('tasks')}
            className={`shrink-0 px-3 py-1.5 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'tasks'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Tasks ({tasks.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`shrink-0 px-3 py-1.5 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'members'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Roster ({members.length})</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 p-3.5">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Operations</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{tasks.length}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Assigned logistic tasks</div>
        </div>
        <div className="bg-white border border-slate-200 p-3.5">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Tasks</div>
          <div className="text-2xl font-bold text-amber-700 mt-1">{activeCount}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Currently executing</div>
        </div>
        <div className="bg-white border border-slate-200 p-3.5">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Executed</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{completedCount}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Completed & verified</div>
        </div>
        <div className="bg-white border border-slate-200 p-3.5">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Logistics Crew</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{members.length}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Active department members</div>
        </div>
      </div>

      {/* ─── TAB 1: TASKS ─────────────────────────────────────────────────── */}
      {activeTab === 'tasks' && (
        <div className="bg-white border border-slate-200 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Operational Tasks</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Create event tasks, venue preparation, and protocol duties. Click "Mark Done" to record completion.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <div className="flex p-0.5 bg-slate-100 border border-slate-200 text-xs font-semibold overflow-x-auto">
                <button
                  onClick={() => setTaskFilter('all')}
                  className={`flex-1 sm:flex-initial px-3 py-1.5 sm:py-1 transition-colors cursor-pointer text-center whitespace-nowrap ${
                    taskFilter === 'all' ? 'bg-white text-slate-900 shadow-xs border border-slate-200' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({tasks.length})
                </button>
                <button
                  onClick={() => setTaskFilter('active')}
                  className={`flex-1 sm:flex-initial px-3 py-1.5 sm:py-1 transition-colors cursor-pointer text-center whitespace-nowrap ${
                    taskFilter === 'active' ? 'bg-white text-amber-800 shadow-xs border border-slate-200' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Active ({activeCount})
                </button>
                <button
                  onClick={() => setTaskFilter('completed')}
                  className={`flex-1 sm:flex-initial px-3 py-1.5 sm:py-1 transition-colors cursor-pointer text-center whitespace-nowrap ${
                    taskFilter === 'completed' ? 'bg-white text-emerald-800 shadow-xs border border-slate-200' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Done ({completedCount})
                </button>
              </div>

              <button
                onClick={() => setCreateModalOpen(true)}
                className="px-3.5 py-2 sm:py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Task</span>
              </button>
            </div>
          </div>

          {/* Task Grid */}
          {tasksLoading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-6 h-6 animate-spin text-slate-600 mx-auto" />
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 border border-slate-200 text-slate-500 text-xs">
              No tasks found in this view. Click "Create Task" to assign one.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredTasks.map((task) => {
                const isCompleted = task.status === 'Completed';

                return (
                  <div
                    key={task.id}
                    className={`p-4 border flex flex-col justify-between space-y-3 transition-colors ${
                      isCompleted
                        ? 'bg-slate-50 border-slate-200 opacity-80'
                        : 'bg-white border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 border ${
                            task.priority === 'High'
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : task.priority === 'Medium'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {task.priority} Priority
                        </span>

                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 border ${
                            isCompleted
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {task.status}
                        </span>
                      </div>

                      <h3
                        className={`font-bold text-sm text-slate-900 leading-snug ${
                          isCompleted ? 'line-through text-slate-500' : ''
                        }`}
                      >
                        {task.title}
                      </h3>

                      {task.description && (
                        <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                          {task.description}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                      {/* Assigned Crew */}
                      {task.assigned_members && task.assigned_members.length > 0 && (
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                            Assigned Members:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {task.assigned_members.map((m) => {
                              const foundMember = members.find((mem) => String(mem.id) === String(m.id));
                              const displayName = foundMember?.full_name || (m.name && !String(m.name).startsWith('Member #') ? m.name : `Member #${m.id}`);
                              return (
                                <span
                                  key={m.id}
                                  className="text-[11px] px-1.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-800 font-medium"
                                >
                                  {displayName}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Deadline & Date */}
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                        {task.deadline ? (
                          <div className="flex items-center gap-1 text-slate-700 font-mono">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>Due: {task.deadline}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">No deadline</span>
                        )}

                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                          title="Delete Task"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Action Button */}
                      {!isCompleted && (
                        <button
                          onClick={() => handleMarkDone(task.id)}
                          className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer mt-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Mark Task as Executed</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: MEMBERS ROSTER ────────────────────────────────────────── */}
      {activeTab === 'members' && (
        <div className="bg-white border border-slate-200 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Organization Roster ({filteredMembers.length})
              </h2>
              <p className="text-xs text-slate-500">
                Live recruitment database synchronization.
              </p>
            </div>

            <div className="w-full sm:w-64">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={memberSearchQuery}
                  onChange={(e) => setMemberSearchQuery(e.target.value)}
                  placeholder="Search members..."
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:bg-white"
                />
              </div>
            </div>
          </div>

          {membersLoading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-6 h-6 animate-spin text-slate-600 mx-auto" />
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No members found matching your search.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredMembers.map((mem) => {
                const assignedCount = tasks.filter((t) =>
                  (t.assigned_member_ids || []).map(String).includes(String(mem.id))
                ).length;

                return (
                  <div
                    key={mem.id}
                    className="p-3.5 bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-2.5"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="font-bold text-xs text-slate-900">{mem.full_name}</h4>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 bg-white text-slate-700 border border-slate-200">
                          Yr {mem.study_year}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 font-medium">{mem.role}</p>
                      {mem.specialization && (
                        <p className="text-[11px] text-slate-500 mt-0.5">{mem.specialization}</p>
                      )}
                    </div>

                    <div className="space-y-1 text-xs text-slate-600 pt-2 border-t border-slate-200">
                      {mem.email && (
                        <div className="flex items-center gap-1.5 truncate">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span className="truncate">{mem.email}</span>
                        </div>
                      )}
                      {mem.phone && (
                        <div className="flex items-center gap-1.5 font-mono">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <a href={`tel:${mem.phone}`} className="hover:underline">{mem.phone}</a>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                      <span>Assigned Tasks:</span>
                      <span className="font-bold text-slate-900 font-mono">{assignedCount}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── MODAL: CREATE TASK ───────────────────────────────────────────── */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-slate-300 p-4 sm:p-5 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Create Operational Task</h3>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-1 text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Auditorium Sound Setup & Guest Badges"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-none focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-none focus:bg-white"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Deadline Date</label>
                  <input
                    type="date"
                    value={taskDeadline}
                    onChange={(e) => setTaskDeadline(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-none focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description & Requirements</label>
                <textarea
                  rows={3}
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  placeholder="Specify protocol duties, venue locations, and materials required..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-none focus:bg-white"
                />
              </div>

              {/* Multi-member Assignee Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assign Team Members ({selectedAssigneeIds.length} selected)
                </label>
                <div className="max-h-36 overflow-y-auto p-2 bg-slate-50 border border-slate-300 space-y-1">
                  {members.map((mem) => {
                    const isSelected = selectedAssigneeIds.includes(mem.id);
                    return (
                      <div
                        key={mem.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedAssigneeIds(selectedAssigneeIds.filter((id) => id !== mem.id));
                          } else {
                            setSelectedAssigneeIds([...selectedAssigneeIds, mem.id]);
                          }
                        }}
                        className={`p-1.5 flex items-center justify-between text-xs cursor-pointer transition-colors border ${
                          isSelected ? 'bg-white border-slate-900 text-slate-900 font-bold' : 'border-transparent text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        <span>{mem.full_name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-slate-900" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingTask}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  {creatingTask ? 'Assigning...' : 'Assign Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
