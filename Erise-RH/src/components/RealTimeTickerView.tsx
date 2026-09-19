import React, { useState } from 'react';
import { 
  UserPlus, 
  Calendar, 
  CheckSquare, 
  FolderPlus, 
  Clock, 
  Trash2,
  Play
} from 'lucide-react';
import { RealtimeActivityItem, ActivityType } from '../types';

interface RealTimeTickerViewProps {
  activities: RealtimeActivityItem[];
  onClearActivities: () => void;
  onSimulateActivity: (type: ActivityType) => void;
}

export const RealTimeTickerView: React.FC<RealTimeTickerViewProps> = ({
  activities,
  onClearActivities,
  onSimulateActivity,
}) => {
  const [filter, setFilter] = useState<'all' | ActivityType>('all');

  const filtered = activities.filter((a) => {
    if (filter === 'all') return true;
    return a.type === filter;
  });

  const getIcon = (type: ActivityType) => {
    switch (type) {
      case 'member_registered':
        return <UserPlus className="w-4 h-4 text-emerald-600" />;
      case 'event_signup':
        return <Calendar className="w-4 h-4 text-blue-600" />;
      case 'project_created':
        return <FolderPlus className="w-4 h-4 text-amber-600" />;
      case 'task_completed':
        return <CheckSquare className="w-4 h-4 text-purple-600" />;
    }
  };

  const getTypeLabel = (type: ActivityType) => {
    switch (type) {
      case 'member_registered':
        return 'Intake Application';
      case 'event_signup':
        return 'Event Registration';
      case 'project_created':
        return 'Project Initiated';
      case 'task_completed':
        return 'Task Completed';
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#f8fcfd] text-slate-900">
      {/* Header */}
      <div className="p-5 border-b border-slate-200 bg-white shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                Live Club Activity Ticker
              </h1>
              <span className="text-xs font-semibold text-slate-500">Connected</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time feed across Supabase subscriptions: Member intake, event signups, project releases, and task approvals
            </p>
          </div>

          {/* Quick Simulation & Cleanup Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 p-0.5 text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 px-1.5 flex items-center gap-1">
                <Play className="w-2.5 h-2.5" /> Test Alert:
              </span>
              <button
                type="button"
                onClick={() => onSimulateActivity('member_registered')}
                className="px-2 py-0.5 text-[10px] font-bold bg-white hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                title="Simulate new applicant intake"
              >
                + Member
              </button>
              <button
                type="button"
                onClick={() => onSimulateActivity('event_signup')}
                className="px-2 py-0.5 text-[10px] font-bold bg-white hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                title="Simulate event registration"
              >
                + Event
              </button>
              <button
                type="button"
                onClick={() => onSimulateActivity('task_completed')}
                className="px-2 py-0.5 text-[10px] font-bold bg-white hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                title="Simulate task completion"
              >
                + Task
              </button>
            </div>

            {activities.length > 0 && (
              <button
                type="button"
                onClick={onClearActivities}
                className="px-2.5 py-1 text-slate-600 hover:text-red-700 hover:bg-red-50 border border-slate-200 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Badges */}
        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-100 text-xs overflow-x-auto">
          {(['all', 'member_registered', 'event_signup', 'project_created', 'task_completed'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setFilter(t)}
              className={`px-2.5 py-1 font-bold text-[11px] transition-colors cursor-pointer capitalize border ${
                filter === t
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 hover:text-slate-900 border-slate-200'
              }`}
            >
              {t === 'all' ? 'All Activities' : t.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Feed List */}
      <div className="flex-1 overflow-y-auto p-5">
        {filtered.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-xs text-center space-y-1">
            <Clock className="w-8 h-8 text-slate-400" />
            <p>No activity records logged yet.</p>
            <p className="text-[11px] text-slate-400">
              Real-time events from Supabase will stream directly into this feed.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-w-3xl mx-auto">
            {filtered.map((item) => (
              <div
                key={item.id}
                className="p-3.5 bg-white border border-slate-200 flex items-start gap-3 hover:border-slate-300 transition-colors shadow-xs"
              >
                <div className="w-8 h-8 bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                  {getIcon(item.type)}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                      {getTypeLabel(item.type)}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-slate-900 mt-0.5 leading-snug">
                    {item.title}
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
