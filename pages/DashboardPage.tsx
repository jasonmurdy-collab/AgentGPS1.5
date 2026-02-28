
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { GoalProgressCard } from '../components/dashboard/GoalProgressCard';
import { useGoals } from '../contexts/GoalContext';
import { WelcomeCard } from '../components/dashboard/WelcomeCard';
import { GpsSummaryCard } from '../components/dashboard/GpsSummaryCard';
import { SkeletonCard } from '../components/ui/SkeletonCard';
import { PlusCircle, Target, BarChart2, LayoutGrid, BookOpen, ClipboardList, Users, ListTodo, Video } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { useAuth, P } from '../contexts/AuthContext';
import { DashboardVisualizations } from '../components/dashboard/DashboardVisualizations';
import { getFirestoreInstance } from '../firebaseConfig';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import type { Goal, Playbook, LiveSession } from '../types';
import { GoalModal } from '../components/goals/AddGoalModal';
import { processPlaybookDoc } from '../lib/firestoreUtils';
import AnnouncementFeed from '../components/dashboard/AnnouncementFeed';
import { LiveSessionCard } from '../components/launchpad/LiveSessionCard';

const UpcomingLiveSessions: React.FC = () => {
    const { userData } = useAuth();
    const [sessions, setSessions] = useState<LiveSession[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSessions = async () => {
            if (!userData) {
                setLoading(false);
                return;
            }
            const db = getFirestoreInstance();
            if (!db) return;

            // Fetch sessions for this MC or specific to this user
            const q = query(
                collection(db, 'liveSessions'),
                where('marketCenterId', '==', userData.marketCenterId),
                where('status', 'in', ['scheduled', 'live']),
                orderBy('startTime', 'asc'),
                limit(2)
            );

            try {
                const snap = await getDocs(q);
                setSessions(snap.docs.map(d => ({ id: d.id, ...d.data() } as LiveSession)));
            } catch (error) {
                console.error("Error fetching dashboard sessions:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchSessions();
    }, [userData]);

    if (!loading && sessions.length === 0) return null;

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
                <Video size={20} className="text-primary" /> Upcoming Live Sessions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {loading ? (
                    <div className="h-48 bg-surface/50 rounded-2xl animate-pulse border border-border"></div>
                ) : (
                    sessions.map(session => (
                        <LiveSessionCard key={session.id} session={session} />
                    ))
                )}
            </div>
        </div>
    );
};

const MobileQuickActions: React.FC = () => {
    const { userData } = useAuth();
    const isRecruiter = P.isRecruiter(userData);
    const isCoach = P.isCoach(userData);

    const actions = [
        { 
            label: 'Daily Log', 
            icon: ClipboardList, 
            path: isRecruiter ? '/recruiter-daily-tracker' : isCoach ? '/coach-daily-tracker' : '/daily-tracker',
            color: 'bg-primary' 
        },
        { 
            label: isRecruiter ? 'Recruits' : 'Leads', 
            icon: Users, 
            path: isRecruiter ? '/recruitment-hub' : '/client-pipeline',
            color: 'bg-accent-secondary' 
        },
        { 
            label: 'New Task', 
            icon: ListTodo, 
            path: '/todos',
            color: 'bg-purple-500' 
        }
    ];

    return (
        <div className="lg:hidden grid grid-cols-3 gap-3 mb-6">
            {actions.map((action, i) => (
                <Link key={i} to={action.path} className="flex flex-col items-center gap-2">
                    <div className={`${action.color} w-full aspect-square rounded-2xl flex items-center justify-center text-white shadow-lg shadow-${action.color}/20`}>
                        <action.icon size={28} />
                    </div>
                    <span className="text-[11px] font-bold text-text-secondary uppercase tracking-tight">{action.label}</span>
                </Link>
            ))}
        </div>
    );
};

const StatsCard: React.FC<{ gci: number; listings: number }> = ({ gci, listings }) => {
    const stats = [
        { label: 'GCI', value: `$${gci.toLocaleString()}` },
        { label: 'Listings', value: listings.toLocaleString() },
    ];

    return (
        <Card>
            <h3 className="text-lg font-bold mb-4 text-text-primary">Key Metrics</h3>
            <div className="grid grid-cols-2 gap-4 text-center">
                {stats.map(stat => (
                    <div key={stat.label}>
                        <p className="text-xs text-text-secondary uppercase tracking-wider">{stat.label}</p>
                        <p className="text-2xl font-bold text-text-primary">{stat.value}</p>
                    </div>
                ))}
            </div>
        </Card>
    );
};

const MyLearning: React.FC<{
  playbooks: Playbook[];
  progress: { [playbookId: string]: string[] };
}> = ({ playbooks, progress }) => {
    return (
        <Card>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <BookOpen size={20}/> My Learning
            </h3>
            <div className="space-y-4">
                {playbooks.length > 0 ? playbooks.map(playbook => {
                    const totalLessons = playbook.modules.reduce((acc, mod) => acc + mod.lessons.length, 0);
                    const completedLessons = progress[playbook.id]?.length || 0;
                    const percentage = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;
                    
                    return (
                        <Link to={`/resource-library/${playbook.id}`} key={playbook.id} className="block hover:bg-primary/5 p-2 rounded-lg">
                             <div className="flex justify-between items-center mb-1">
                                <span className="font-semibold text-sm">{playbook.title}</span>
                                <span className="text-xs text-text-secondary">{completedLessons}/{totalLessons}</span>
                            </div>
                            <div className="w-full bg-background rounded-full h-2">
                                <div className="bg-primary h-2 rounded-full" style={{ width: `${percentage}%` }}></div>
                            </div>
                        </Link>
                    )
                }) : (
                    <p className="text-sm text-text-secondary text-center py-4">No learning playbooks assigned yet. Visit the Resource Library to get started.</p>
                )}
            </div>
        </Card>
    );
};

const GoalPlaceholderCard: React.FC<{ title: string, description: string }> = ({ title, description }) => (
    <Card className="flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-border hover:border-primary transition-colors h-full">
        <Target size={32} className="text-text-secondary mb-3" />
        <h3 className="font-bold text-lg text-text-primary">{title}</h3>
        <p className="text-sm text-text-secondary mt-1 mb-4 max-w-xs">{description}</p>
        <Link to="/goals" className="flex items-center justify-center bg-primary text-on-accent font-semibold py-2 px-4 rounded-lg hover:bg-opacity-90 transition-colors text-sm">
            <PlusCircle className="mr-2" size={16} />
            Set a Goal
        </Link>
    </Card>
);

const DashboardLoadingSkeleton: React.FC = () => (
    <div className="h-full flex flex-col">
        <header className="p-4 sm:p-6 lg:p-8">
            <div className="h-12 w-1/3 bg-surface/50 rounded animate-pulse"></div>
            <div className="h-6 w-2/3 bg-surface/50 rounded mt-2 animate-pulse"></div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <SkeletonCard className="h-24" />
                    <SkeletonCard className="h-48" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <SkeletonCard className="h-60" />
                        <SkeletonCard className="h-60" />
                    </div>
                </div>
                <div className="lg:col-span-1 space-y-6">
                    <SkeletonCard className="h-24" />
                    <SkeletonCard className="h-64" />
                    <SkeletonCard className="h-32" />
                </div>
            </div>
        </div>
    </div>
);


const DashboardPage: React.FC = () => {
  const { goals, loading: goalsLoading, updateGoal, deleteGoal, toggleGoalArchiveStatus } = useGoals();
  const { userData, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'visualizations'>('overview');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [goalToEdit, setGoalToEdit] = useState<Goal | null>(null);
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [loadingPlaybooks, setLoadingPlaybooks] = useState(true);

  const currentUserGCI = userData?.gci || 0;
  const currentUserListings = userData?.listings || 0;

  const fetchPlaybooks = useCallback(async () => {
        if (!userData) {
            setLoadingPlaybooks(false);
            return;
        }
        setLoadingPlaybooks(true);
        const playbooksRef = collection(getFirestoreInstance(), 'playbooks');
        const queriesToRun = [
            query(playbooksRef, where('teamId', '==', null), where('marketCenterId', '==', null))
        ];
        if (userData.teamId) {
            queriesToRun.push(query(playbooksRef, where('teamId', '==', userData.teamId)));
        }
        if (userData.marketCenterId) {
            queriesToRun.push(query(playbooksRef, where('marketCenterId', '==', userData.marketCenterId)));
        }
        try {
            const snapshots = await Promise.all(queriesToRun.map(q => getDocs(q)));
            const allPlaybooks = new Map<string, Playbook>();
            snapshots.forEach(snapshot => {
                snapshot.docs.forEach(doc => {
                    if (!allPlaybooks.has(doc.id)) {
                        allPlaybooks.set(doc.id, processPlaybookDoc(doc));
                    }
                });
            });
            setPlaybooks(Array.from(allPlaybooks.values()));
        } catch (error) {
            console.error("Error fetching playbooks for dashboard:", error);
        } finally {
            setLoadingPlaybooks(false);
        }
  }, [userData]);

  useEffect(() => {
    fetchPlaybooks();
  }, [fetchPlaybooks]);
  
  const handleOpenModalForEdit = (goal: Goal) => {
    setGoalToEdit(goal);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setGoalToEdit(null);
    setIsModalOpen(false);
  };

  const handleSubmitGoal = async (goalData: Omit<Goal, 'id' | 'currentValue' | 'userId' | 'teamId' | 'createdAt'>) => {
    if (goalToEdit) {
        await updateGoal(goalToEdit.id, goalData);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (window.confirm("Are you sure you want to delete this goal? This action cannot be undone.")) {
        await deleteGoal(goalId);
    }
  };

  const handleToggleArchive = async (goalId: string, currentStatus: boolean) => {
    await toggleGoalArchiveStatus(goalId, currentStatus);
  };

  const topGoals = useMemo(() => {
    return [...goals]
      .sort((a, b) => {
        if (a.type === 'Annual' && b.type !== 'Annual') return -1;
        if (b.type === 'Annual' && a.type !== 'Annual') return 1;
        const progressA = a.targetValue > 0 ? (a.currentValue / a.targetValue) * 100 : 0;
        const progressB = b.targetValue > 0 ? (b.currentValue / b.targetValue) * 100 : 0;
        return progressB - progressA;
      })
      .slice(0, 3);
  }, [goals]);

  const loading = goalsLoading || authLoading || loadingPlaybooks;

  if (loading) {
    return <DashboardLoadingSkeleton />;
  }

  return (
    <div className="h-full flex flex-col">
      <header className="p-4 sm:p-6 lg:p-8">
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-text-primary">Dashboard</h1>
        <p className="text-lg text-text-secondary mt-1">Your command center for growth and productivity.</p>
        <div className="mt-6 flex items-center gap-2 p-1 bg-surface rounded-lg w-fit">
            <button onClick={() => setActiveTab('overview')} className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'overview' ? 'bg-primary text-on-accent' : 'text-text-secondary hover:bg-primary/10'}`}>
                <LayoutGrid size={16}/> Overview
            </button>
            <button onClick={() => setActiveTab('visualizations')} className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'visualizations' ? 'bg-primary text-on-accent' : 'text-text-secondary hover:bg-primary/10'}`}>
                <BarChart2 size={16}/> Visualizations
            </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-8">
        {activeTab === 'overview' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            <div className="lg:col-span-2 space-y-6">
              <MobileQuickActions />
              <UpcomingLiveSessions />
              <WelcomeCard />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {topGoals.length > 0 ? (
                  topGoals.map(goal => 
                    <GoalProgressCard 
                        key={goal.id} 
                        goal={goal} 
                        onEdit={() => handleOpenModalForEdit(goal)}
                        onDelete={() => handleDeleteGoal(goal.id)}
                        onArchive={() => handleToggleArchive(goal.id, !!goal.isArchived)}
                    />
                  )
                ) : (
                  <>
                    <GoalPlaceholderCard title="Set an Annual Goal" description="Define your big-picture target for the year."/>
                    <GoalPlaceholderCard title="Set a Quarterly Goal" description="Break down your annual goal into 90-day milestones."/>
                    <GoalPlaceholderCard title="Set a Weekly Goal" description="Establish your key actions for the week ahead."/>
                  </>
                )}
              </div>
              <MyLearning playbooks={playbooks} progress={userData?.playbookProgress || {}}/>
            </div>
            <div className="lg:col-span-1 space-y-6">
              <AnnouncementFeed />
              <StatsCard gci={currentUserGCI} listings={currentUserListings} />
              <GpsSummaryCard />
            </div>
          </div>
        ) : (
            <DashboardVisualizations goals={goals} userData={userData ? { ...userData, gci: currentUserGCI, listings: currentUserListings } : null} />
        )}
      </div>
      <GoalModal 
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSubmit={handleSubmitGoal}
          title="Edit Goal"
          submitButtonText="Save Changes"
          goalToEdit={goalToEdit}
      />
    </div>
  );
};

export default DashboardPage;
