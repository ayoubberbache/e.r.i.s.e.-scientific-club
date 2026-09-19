import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TitleBar } from './components/TitleBar';
import { Sidebar, TabKey } from './components/Sidebar';
import { MemberEvaluationView } from './components/MemberEvaluationView';
import { RealTimeTickerView } from './components/RealTimeTickerView';
import { TasksReviewView } from './components/TasksReviewView';
import { AttendanceReviewView } from './components/AttendanceReviewView';
import { ApplicationsView } from './components/ApplicationsView';
import { 
  fetchMembersWithRatings, 
  submitAppraisal, 
  updateMemberStatus, 
  getStoredTasks, 
  saveStoredTasks 
} from './lib/hrEngine';
import { playNotificationChime } from './lib/notificationSound';
import { supabase } from './lib/supabase';
import { ClubMember, RealtimeActivityItem, DepartmentTask, AppraisalInput, ActivityType } from './types';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('members');
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState<boolean>(true);
  const [tasks, setTasks] = useState<DepartmentTask[]>([]);
  const [activities, setActivities] = useState<RealtimeActivityItem[]>([]);
  const [unreadTickerCount, setUnreadTickerCount] = useState<number>(0);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Load initial data
  const loadData = useCallback(async () => {
    setLoadingMembers(true);
    try {
      const mems = await fetchMembersWithRatings();
      setMembers(mems);
    } catch (e) {
      console.error('Error loading HR members:', e);
    } finally {
      setLoadingMembers(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    setTasks(getStoredTasks());

    // Load cached activities from real subscription events (no static mock data)
    const cachedActivities = localStorage.getItem('erise_rh_activities');
    if (cachedActivities) {
      try {
        setActivities(JSON.parse(cachedActivities));
      } catch (e) {
        setActivities([]);
      }
    } else {
      setActivities([]);
    }
  }, [loadData]);

  // Handle incoming notification
  const handleIncomingNotification = useCallback(
    (item: Omit<RealtimeActivityItem, 'id' | 'timestamp'>) => {
      const newActivity: RealtimeActivityItem = {
        ...item,
        id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        timestamp: new Date().toISOString(),
      };

      setActivities((prev) => {
        const updated = [newActivity, ...prev];
        localStorage.setItem('erise_rh_activities', JSON.stringify(updated.slice(0, 100)));
        return updated;
      });

      setUnreadTickerCount((prev) => prev + 1);

      if (soundEnabled) {
        playNotificationChime();
      }

      // Native Desktop Notification via Electron IPC
      if (window.electronAPI?.notify) {
        window.electronAPI.notify(newActivity.title, newActivity.description);
      }
    },
    [soundEnabled]
  );

  // Supabase Realtime Channels
  useEffect(() => {
    const channel = supabase
      .channel('rh-live-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'registrations' },
        (payload) => {
          const newReg = payload.new;
          handleIncomingNotification({
            type: 'member_registered',
            title: `New Club Application: ${newReg.full_name || 'Candidate'}`,
            description: `Registered for ${newReg.department || 'General'} department. Study Year: ${newReg.academic_year || 'N/A'}.`,
            department: newReg.department,
            metadata: newReg,
          });
          loadData();
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'event_registrations' },
        (payload) => {
          handleIncomingNotification({
            type: 'event_signup',
            title: 'New Event Registration',
            description: `Participant enrolled in club event.`,
            metadata: payload.new,
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'projects' },
        (payload) => {
          const proj = payload.new;
          handleIncomingNotification({
            type: 'project_created',
            title: `New Project Release: ${proj.title || 'Untitled'}`,
            description: `Domain: ${proj.domain || 'Renewable Tech'}. Status: ${proj.status || 'Active'}.`,
            department: 'Projects',
            metadata: proj,
          });
        }
      )
      .subscribe((status) => {
        setIsRealtimeConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [handleIncomingNotification, loadData]);

  // Tab Selection
  const handleSelectTab = (tab: TabKey) => {
    setActiveTab(tab);
    if (tab === 'ticker') {
      setUnreadTickerCount(0);
    }
  };

  const handleSimulateActivity = (type: ActivityType) => {
    switch (type) {
      case 'member_registered':
        handleIncomingNotification({
          type: 'member_registered',
          title: 'Candidate Application: Sarah Mehdi',
          description: 'Applied for Organization department. Year 2 Student.',
          department: 'Organization',
        });
        break;
      case 'event_signup':
        handleIncomingNotification({
          type: 'event_signup',
          title: 'Event Signup: AI for Energy Bootcamp',
          description: 'Individual registration confirmed.',
        });
        break;
      case 'task_completed':
        handleIncomingNotification({
          type: 'task_completed',
          title: 'Task Done: Promo Video Editing',
          description: 'Submitted by Media Department members.',
          department: 'Media',
        });
        break;
      case 'project_created':
        handleIncomingNotification({
          type: 'project_created',
          title: 'Project Initiated: Smart Solar Tracker',
          description: 'Assigned multi-member research team.',
          department: 'Projects',
        });
        break;
    }
  };

  const handleClearActivities = () => {
    setActivities([]);
    localStorage.removeItem('erise_rh_activities');
    setUnreadTickerCount(0);
  };

  // Award HR points for completed task (+5% to assigned members)
  const handleAwardTaskPoints = async (taskId: string) => {
    const updated = tasks.map((t) => {
      if (t.id === taskId) {
        return { ...t, hr_points_awarded: true };
      }
      return t;
    });

    setTasks(updated);
    saveStoredTasks(updated);

    // Give assigned members +5% manual appraisal points
    const task = tasks.find((t) => t.id === taskId);
    if (task && Array.isArray(task.assigned_member_ids)) {
      for (const mId of task.assigned_member_ids) {
        await submitAppraisal({
          member_id: mId,
          punctuality: 0,
          teamwork: 2,
          initiative: 2,
          quality_of_work: 1, // Total +5%
          notes: `Awarded +5% for completing task "${task.title}" in ${task.department} department.`,
        });
      }
      loadData();
    }
  };

  const pendingCount = members.filter((m) => m.status === 'pending').length;
  const activeTasksCount = tasks.filter((t) => t.status !== 'completed').length;

  return (
    <div className="h-screen w-screen flex flex-col bg-[#f8fcfd] text-slate-900 overflow-hidden select-none font-sans">
      {/* Top Custom Title Bar */}
      <TitleBar
        isRealtimeConnected={isRealtimeConnected}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        pendingCount={pendingCount}
      />

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Navigation */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={handleSelectTab}
          unreadTickerCount={unreadTickerCount}
          pendingApplicationsCount={pendingCount}
          activeTasksCount={activeTasksCount}
        />

        {/* Content View */}
        <main className="flex-1 overflow-hidden relative bg-[#f8fcfd]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="h-full w-full"
            >
              {activeTab === 'members' && (
                <MemberEvaluationView
                  members={members}
                  loading={loadingMembers}
                  onRefresh={loadData}
                  onSubmitAppraisal={async (appraisal: AppraisalInput) => {
                    await submitAppraisal(appraisal);
                    loadData();
                  }}
                />
              )}

              {activeTab === 'ticker' && (
                <RealTimeTickerView
                  activities={activities}
                  onClearActivities={handleClearActivities}
                  onSimulateActivity={handleSimulateActivity}
                />
              )}

              {activeTab === 'tasks' && (
                <TasksReviewView
                  tasks={tasks}
                  onAwardPoints={handleAwardTaskPoints}
                />
              )}

              {activeTab === 'attendance' && (
                <AttendanceReviewView
                  onRefreshMembers={loadData}
                />
              )}

              {activeTab === 'applications' && (
                <ApplicationsView
                  members={members}
                  onUpdateStatus={async (id, status) => {
                    await updateMemberStatus(id, status);
                    loadData();
                  }}
                  onRefresh={loadData}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default App;
