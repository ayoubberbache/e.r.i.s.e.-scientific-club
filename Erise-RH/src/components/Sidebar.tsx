import React from 'react';
import { 
  Users, 
  Activity, 
  CheckSquare, 
  CalendarCheck, 
  UserCheck, 
  TrendingUp,
  Award,
  Clock,
  AlertCircle
} from 'lucide-react';

export type TabKey = 'members' | 'ticker' | 'tasks' | 'attendance' | 'applications' | 'events';

interface SidebarProps {
  activeTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
  unreadTickerCount: number;
  pendingApplicationsCount: number;
  activeTasksCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  unreadTickerCount,
  pendingApplicationsCount,
  activeTasksCount,
}) => {
  const navItems = [
    {
      key: 'members' as TabKey,
      label: 'Member Evaluation',
      sublabel: 'Ratings & Standing',
      icon: Users,
    },
    {
      key: 'applications' as TabKey,
      label: 'Intake Applications',
      sublabel: 'Candidate Review',
      icon: UserCheck,
      badge: pendingApplicationsCount > 0 ? pendingApplicationsCount : undefined,
    },
    {
      key: 'events' as TabKey,
      label: 'Events & Hackathons',
      sublabel: 'Participant Lists & Export',
      icon: CalendarCheck,
    },
    {
      key: 'attendance' as TabKey,
      label: 'Attendance Records',
      sublabel: 'Workshops & Events',
      icon: CalendarCheck,
    },
    {
      key: 'tasks' as TabKey,
      label: 'Tasks & Progress',
      sublabel: 'Department Work',
      icon: CheckSquare,
      badge: activeTasksCount > 0 ? activeTasksCount : undefined,
    },
    {
      key: 'ticker' as TabKey,
      label: 'Activity Feed',
      sublabel: 'Club Events & Log',
      icon: Activity,
      badge: unreadTickerCount > 0 ? unreadTickerCount : undefined,
    },
  ];

  return (
    <aside className="w-60 bg-slate-50 border-r border-slate-200 flex flex-col justify-between p-3 select-none shrink-0">
      <div className="space-y-4">
        {/* Department Title */}
        <div className="px-2 py-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            HR Operations
          </div>
          <div className="text-xs font-bold text-slate-800 mt-0.5">
            ERISE Club Management
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onSelectTab(item.key)}
                className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors cursor-pointer border ${
                  isActive
                    ? 'bg-white text-[#0d5c63] border-slate-300 border-l-3 border-l-[#0d5c63] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/80 border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#0d5c63]' : 'text-slate-400'}`} />
                  <div className="truncate">
                    <div className="text-xs font-bold truncate leading-tight">
                      {item.label}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {item.sublabel}
                    </div>
                  </div>
                </div>

                {item.badge !== undefined && (
                  <span className={`text-[11px] font-mono font-bold px-1.5 py-0.2 shrink-0 border ${
                    isActive
                      ? 'bg-[#0d5c63] text-white border-[#0d5c63]'
                      : 'bg-slate-200 text-slate-700 border-slate-300'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* 50% Baseline Rating Rule Info Box */}
      <div className="p-3 bg-white border border-slate-200 space-y-1.5 text-slate-600">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
          <TrendingUp className="w-3.5 h-3.5 text-[#0d5c63]" />
          <span>Evaluation Scale</span>
        </div>
        <p className="text-[11px] text-slate-500 leading-normal">
          Members start at 50%. Workshops (+5%), tasks (+5%), and HR reviews update standing.
        </p>
        <div className="grid grid-cols-2 gap-1 pt-1 text-[10px] font-mono text-slate-500 border-t border-slate-100">
          <span>&ge;85% Exceptional</span>
          <span>&ge;65% Solid</span>
          <span>50% Baseline</span>
          <span>&lt;45% Alert</span>
        </div>
      </div>
    </aside>
  );
};
