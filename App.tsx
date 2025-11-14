
import React, { useState, useEffect, Suspense, lazy, useLayoutEffect, useMemo, useCallback } from 'react';
import { HashRouter, NavLink, Route, Routes, Navigate } from 'react-router-dom';
import { Menu, X, LayoutDashboard, Target, Users, UserCircle, LogOut, Feather, Briefcase, ClipboardList, BookOpen, Rocket, Layers, DollarSign, BarChartHorizontal, Settings, UserSearch, ChevronDown, Network, PieChart, SlidersHorizontal, UserCheck, Folder, FolderPlus, Building, Edit3, Bell, CheckCheck, ListTodo } from 'lucide-react';
import { GoalProvider } from './contexts/GoalContext';
import { AuthProvider, useAuth, P } from './contexts/AuthContext';
import { Spinner } from './components/ui/Spinner';
import { logoUrl } from './assets';
import { TransactionsProvider } from './contexts/TransactionsContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { NotificationBell } from './components/notifications/NotificationBell';

// Lazy load pages for code splitting, ensuring relative paths are correctly defined.
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const GoalsPage = lazy(() => import('./pages/GoalsPage'));
const TeamsPage = lazy(() => import('./pages/TeamsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const BusinessGpsPage = lazy(() => import('./pages/BusinessGpsPage'));
const CoachHubPage = lazy(() => import('./pages/CoachHubPage'));
const LeadGenPage = lazy(() => import('./pages/LeadGenPage'));
const MreaPlaybookPage = lazy(() => import('./pages/MreaPlaybookPage'));
const LoginPage = lazy(() => import('./auth/LoginPage'));
const NewAgentResourcesPage = lazy(() => import('./pages/NewAgentResourcesPage'));
const FinancialsPage = lazy(() => import('./pages/FinancialsPage'));
const CoachTransactionsPage = lazy(() => import('./pages/CoachTransactionsPage'));
const DailyHabitsTrackerPage = lazy(() => import('./pages/DailyHabitsTrackerPage'));
const CoachDailyHabitsTrackerPage = lazy(() => import('./pages/CoachDailyHabitsTrackerPage'));
const RecruiterDailyTrackerPage = lazy(() => import('./pages/RecruiterDailyTrackerPage'));
const CoachHabitLogsPage = lazy(() => import('./pages/CoachHabitLogsPage'));
const PerformanceLogsPage = lazy(() => import('./pages/PerformanceLogsPage'));
const MyPerformancePage = lazy(() => import('./pages/MyPerformancePage'));
const RecruitmentPlaybookPage = lazy(() => import('./pages/RecruitmentPlaybookPage'));
const RecruitmentHubPage = lazy(() => import('./pages/RecruitmentHubPage'));
const OrganizationalBlueprintPage = lazy(() => import('./pages/OrganizationalBlueprintPage'));
const CoachingFinancialsPage = lazy(() => import('./pages/CoachingFinancialsPage'));
const AdminSettingsPage = lazy(() => import('./pages/AdminSettingsPage'));
const HabitTrackerDesignerPage = lazy(() => import('./pages/CoachHabitSettingsPage'));
const ResourceLibraryPage = lazy(() => import('./pages/ResourceLibraryPage'));
const ResourceManagementPage = lazy(() => import('./pages/ResourceManagementPage'));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'));
const TermsOfServicePage = lazy(() => import('./pages/TermsOfServicePage'));
const PlaybookViewerPage = lazy(() => import('./pages/PlaybookViewerPage'));
const PlaybookEditorPage = lazy(() => import('./pages/PlaybookEditorPage'));
const LearningPathEditorPage = lazy(() => import('./pages/LearningPathEditorPage'));
const PlatformAnalyticsPage = lazy(() => import('./pages/PlatformAnalyticsPage'));
const UserManagementPage = lazy(() => import('./pages/UserManagementPage'));
const AgentAssignmentPage = lazy(() => import('./pages/AgentAssignmentPage'));
const MarketCenterHubPage = lazy(() => import('./pages/MarketCenterHubPage'));
const ProfitShareCalculatorPage = lazy(() => import('./pages/ProfitShareCalculatorPage'));
const AgentDetailPage = lazy(() => import('./pages/AgentDetailPage'));
const ClientPipelinePage = lazy(() => import('./pages/ClientPipelinePage'));
const TodoPage = lazy(() => import('./pages/TodoPage'));


const agentNavSections = [
    {
      title: 'Core Tools',
      items: [
        { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
        { name: 'Goals', icon: Target, path: '/goals' },
        { name: 'Business GPS', icon: Feather, path: '/business-gps' },
        { name: 'Client Pipeline', icon: Users, path: '/client-pipeline' },
        { name: 'Daily Tracker', icon: ClipboardList, path: '/daily-tracker' },
        { name: 'To-Do List', icon: ListTodo, path: '/todos' }, // Added To-Do List
        { name: 'Financials', icon: DollarSign, path: '/financials' },
        { name: 'My Performance', icon: UserCheck, path: '/my-performance' },
      ]
    },
    {
      title: 'Growth & Learning',
      items: [
        { name: 'Growth Architect', icon: Network, path: '/growth-architect' },
        { name: 'My Launchpad', icon: Rocket, path: '/my-launchpad' },
        { name: 'My Growth', icon: BookOpen, path: '/resource-library' },
      ]
    },
    {
      title: 'Team & Community',
      items: [
        { name: 'Teams', icon: Users, path: '/teams' },
      ]
    }
  ];

  const teamLeaderNavSections = [
    {
      title: 'My Business',
      items: [
        { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
        { name: 'Goals', icon: Target, path: '/goals' },
        { name: 'Business GPS', icon: Feather, path: '/business-gps' },
        { name: 'Financials', icon: DollarSign, path: '/financials' },
        { name: 'Growth Architect', icon: Network, path: '/growth-architect' },
        { name: 'My Performance', icon: UserCheck, path: '/my-performance' },
        { name: 'To-Do List', icon: ListTodo, path: '/todos' }, // Added To-Do List
      ]
    },
    {
      title: 'Team Management',
      items: [
        { name: 'Team Hub', icon: Briefcase, path: '/team-hub' },
        { name: 'Client Pipeline', icon: Users, path: '/client-pipeline' },
        { name: 'Agent Habit Logs', icon: ClipboardList, path: '/agent-logs' },
        { name: 'Performance Logs', icon: Settings, path: '/performance-logs' },
      ]
    },
    {
      title: 'Recruiting & Growth',
      items: [
        { name: 'Recruitment Playbook', icon: UserSearch, path: '/recruitment-playbook' },
        { name: 'Resource Library', icon: BookOpen, path: '/resource-library' },
        { name: 'Talent Development Center', icon: Edit3, path: '/resource-management' },
      ]
    },
  ];

  const recruiterNavSections = [
    {
      title: 'Recruiting Hub',
      items: [
        { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
        { name: 'Goals', icon: Target, path: '/goals' },
        { name: 'Daily Tracker', icon: ClipboardList, path: '/recruiter-daily-tracker' },
        { name: 'To-Do List', icon: ListTodo, path: '/todos' }, // Added To-Do List
        { name: 'Recruitment Playbook', icon: UserSearch, path: '/recruitment-playbook' },
      ]
    },
    {
        title: 'Growth & Strategy',
        items: [
            { name: 'Profit Share', icon: PieChart, path: '/profit-share' },
            { name: 'Resource Library', icon: BookOpen, path: '/resource-library' },
        ]
    },
  ];

  const coachNavSections = [
    {
        title: 'My Business',
        items: [
             { name: 'My Goals', icon: Target, path: '/coach-goals' },
             { name: 'My Business GPS', icon: Feather, path: '/coach-gps' },
             { name: 'My Daily Tracker', icon: ClipboardList, path: '/coach-daily-tracker' },
             { name: 'To-Do List', icon: ListTodo, path: '/todos' }, // Added To-Do List
             { name: 'Coaching Financials', icon: PieChart, path: '/coaching-financials' },
        ]
    },
    {
        title: 'Coaching Tools',
        items: [
            { name: 'Coaching Hub', icon: Briefcase, path: '/' },
            { name: 'Agent Transactions', icon: BarChartHorizontal, path: '/agent-transactions' },
            { name: 'Agent Habit Logs', icon: ClipboardList, path: '/agent-logs' },
            { name: 'Performance Logs', icon: Settings, path: '/performance-logs' },
        ]
    },
    {
        title: 'Resources',
        items: [
            { name: 'Recruitment Hub', icon: UserSearch, path: '/recruitment-hub' },
            { name: 'Resource Library', icon: BookOpen, path: '/resource-library' },
            { name: 'Talent Development Center', icon: Edit3, path: '/resource-management' },
        ]
    },
  ];
  
  const mcAdminNavSections = [
    {
        title: 'Market Center',
        items: [
            { name: 'Market Center Hub', icon: Building, path: '/' },
            { name: 'Agent Assignments', icon: UserCheck, path: '/agent-assignments' },
            { name: 'Performance Logs', icon: Settings, path: '/performance-logs' },
        ]
    },
    {
        title: 'Growth & Strategy',
        items: [
            { name: 'Growth Architect', icon: Network, path: '/growth-architect' },
            { name: 'Recruitment Hub', icon: UserSearch, path: '/recruitment-hub' },
        ]
    },
    {
        title: 'Resources & Training',
        items: [
            { name: 'Resource Library', icon: BookOpen, path: '/resource-library' },
            { name: 'Talent Development Center', icon: Edit3, path: '/resource-management' },
            { name: 'Habit Tracker Designer', icon: Settings, path: '/habit-settings' },
        ]
    }
  ];

const superAdminNavSections = [
    {
        title: 'Platform Management',
        items: [
            { name: 'Analytics', icon: PieChart, path: '/' },
            { name: 'User Roster', icon: Users, path: '/user-management' },
            { name: 'Market Centers', icon: Building, path: '/admin-settings' },
            { name: 'Habit Tracker Designer', icon: Settings, path: '/habit-settings' },
        ]
    }
];


const AppContent: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const { user, userData, loading, logout } = useAuth();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const currentYear = new Date().getFullYear();

  const handleSetIsSidebarOpen = useCallback((isOpen: boolean) => {
    setIsSidebarOpen(isOpen);
  }, []);

  const handleLogout = useCallback(() => {
    logout();
    if (window.innerWidth < 1024) handleSetIsSidebarOpen(false);
  }, [logout, handleSetIsSidebarOpen]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 1024) {
        handleSetIsSidebarOpen(false);
      } else {
        handleSetIsSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleSetIsSidebarOpen]);
  

  useLayoutEffect(() => {
    const theme = userData?.theme || 'light';
    const root = document.documentElement;

    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [userData]);


  const navSections = useMemo(() => {
    if (P.isSuperAdmin(userData)) return superAdminNavSections;
    if (P.isMcAdmin(userData)) return mcAdminNavSections;
    if (P.isCoach(userData)) return coachNavSections;
    if (P.isTeamLeader(userData)) return teamLeaderNavSections;
    if (P.isRecruiter(userData)) return recruiterNavSections;
    return agentNavSections;
  }, [userData]);
  
  useEffect(() => {
    if (navSections.length > 0) {
      const initialState: Record<string, boolean> = {};
      navSections.forEach((section, index) => {
        initialState[section.title] = index < 2; // Expand the first two sections by default
      });
      setExpandedSections(initialState);
    }
  }, [navSections]);

  const handleToggleSection = useCallback((title: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Spinner />
      </div>
    );
  }

  if (!user) {
    return (
      <Suspense fallback={<div className="flex h-full w-full items-center justify-center"><Spinner className="w-8 h-8" /></div>}>
        <LoginPage />
      </Suspense>
    );
  }

  const canManageResources = P.canManageResources(userData);

  return (
    <div className="flex h-screen bg-background text-text-primary">
      <div className={`fixed inset-0 bg-black/50 z-20 lg:hidden ${isSidebarOpen ? 'block' : 'hidden'}`} onClick={() => handleSetIsSidebarOpen(false)}></div>

      <aside className={`bg-surface border-r border-border flex flex-col transition-transform duration-300 fixed inset-y-0 left-0 z-30 w-64 lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center p-4 h-20 border-b border-border flex-shrink-0">
          <img src={logoUrl} alt="AgentGPS Logo" className="h-10 w-10 logo-img" />
          <span className="font-heading font-bold text-xl ml-2">AgentGPS</span>
        </div>
        <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
          {navSections.map((section, index) => (
            <div key={section.title}>
              <button
                onClick={() => handleToggleSection(section.title)}
                className="w-full flex justify-between items-center px-2 py-1.5 text-left rounded-md hover:bg-primary/5 transition-colors"
                aria-expanded={!!expandedSections[section.title]}
                aria-controls={`section-content-${index}`}
              >
                <h3 className="text-sm font-semibold text-text-secondary">{section.title}</h3>
                <ChevronDown
                  size={16}
                  className={`text-text-secondary transition-transform duration-300 ${expandedSections[section.title] ? 'rotate-180' : ''}`}
                />
              </button>
              <div
                id={`section-content-${index}`}
                className={`transition-all duration-300 ease-in-out overflow-hidden ${expandedSections[section.title] ? 'max-h-96' : 'max-h-0'}`}
              >
                <div className="space-y-1 pt-2">
                  {section.items.map(item => (
                    <NavLink
                      key={item.name}
                      to={item.path}
                      end={item.path === '/'}
                      onClick={() => { if (window.innerWidth < 1024) handleSetIsSidebarOpen(false); }}
                      className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors border-l-4 ${isActive ? 'bg-primary/10 text-primary border-primary' : 'border-transparent text-text-secondary hover:bg-primary/5 hover:text-text-primary'}`}
                      title={item.name}
                    >
                      <item.icon size={20} />
                      <span>{item.name}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </nav>
        <div className="p-4 border-t border-border flex-shrink-0 space-y-2">
          <NavLink
            to="/profile"
            onClick={() => { if (window.innerWidth < 1024) handleSetIsSidebarOpen(false); }}
            className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors border-l-4 ${isActive ? 'bg-primary/10 text-primary border-primary' : 'border-transparent text-text-secondary hover:bg-primary/5 hover:text-text-primary'}`}
            title="Profile"
          >
            <UserCircle size={24} />
            <div className="overflow-hidden">
                <p className="font-medium text-sm truncate">{userData?.name}</p>
                <p className="text-xs text-text-secondary">View Profile</p>
            </div>
          </NavLink>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors w-full text-destructive hover:bg-destructive/10"
            title="Logout"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
          
          <div className="!mt-4 text-center text-xs text-text-secondary">
            <NavLink 
              to="/privacy" 
              onClick={() => { if (window.innerWidth < 1024) handleSetIsSidebarOpen(false); }}
              className="hover:underline"
            >
              Privacy Policy
            </NavLink>
            <span className="mx-2">&bull;</span>
            <NavLink 
              to="/terms" 
              onClick={() => { if (window.innerWidth < 1024) handleSetIsSidebarOpen(false); }}
              className="hover:underline"
            >
              Terms of Service
            </NavLink>
          </div>
          <p className="!mt-2 text-center text-xs text-text-secondary/70">
            &copy; {currentYear} AgentGPS. All Rights Reserved. Copyright Pending.
          </p>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between p-4 h-20 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleSetIsSidebarOpen(!isSidebarOpen)} 
                  className="p-2 rounded-lg hover:bg-background lg:hidden" 
                  aria-label="Toggle sidebar"
                >
                    <Menu size={20} />
                </button>
            </div>
            <div className="flex items-center gap-4">
                <NotificationBell />
            </div>
        </header>
        
        <main className="flex-1 overflow-y-auto">
          <Suspense fallback={<div className="flex h-full w-full items-center justify-center"><Spinner className="w-8 h-8"/></div>}>
            <Routes>
              <Route path="/" element={
                P.isSuperAdmin(userData) ? <PlatformAnalyticsPage /> :
                P.isMcAdmin(userData) ? <MarketCenterHubPage /> :
                P.isRecruiter(userData) ? <RecruitmentHubPage /> :
                P.isCoach(userData) ? <CoachHubPage /> :
                <DashboardPage />
              } />
              <Route path="/goals" element={<GoalsPage />} />
              <Route path="/business-gps" element={<BusinessGpsPage />} />
              <Route path="/client-pipeline" element={P.canManageClientPipeline(userData) ? <ClientPipelinePage /> : <Navigate to="/" />} />
              <Route path="/daily-tracker" element={<DailyHabitsTrackerPage />} />
              <Route path="/todos" element={<TodoPage />} /> {/* New route for To-Do List */}
              <Route path="/recruiter-daily-tracker" element={P.isRecruiter(userData) ? <RecruiterDailyTrackerPage /> : <Navigate to="/" />} />
              <Route path="/coach-daily-tracker" element={P.isCoach(userData) ? <CoachDailyHabitsTrackerPage /> : <Navigate to="/" />} />
              <Route path="/coach-goals" element={P.isCoach(userData) ? <GoalsPage /> : <Navigate to="/" />} />
              <Route path="/coach-gps" element={P.isCoach(userData) ? <BusinessGpsPage /> : <Navigate to="/" />} />
              <Route path="/financials" element={<FinancialsPage />} />
              <Route path="/recruitment-playbook" element={P.canSeeRecruitmentPlaybook(userData) ? <RecruitmentPlaybookPage /> : <Navigate to="/" />} />
              <Route path="/recruitment-hub" element={P.isCoach(userData) ? <RecruitmentHubPage /> : <Navigate to="/" />} />
              <Route path="/teams" element={<TeamsPage />} />
              <Route path="/team-hub" element={<CoachHubPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/my-launchpad" element={<NewAgentResourcesPage />} />
              <Route path="/agent-transactions" element={<CoachTransactionsPage />} />
              <Route path="/agent-logs" element={P.canAccessCoachingTools(userData) ? <CoachHabitLogsPage /> : <Navigate to="/" />} />
              <Route path="/performance-logs" element={P.isTeamLeader(userData) ? <PerformanceLogsPage /> : <Navigate to="/" />} />
              <Route path="/my-performance" element={P.canSeeMyPerformance(userData) ? <MyPerformancePage /> : <Navigate to="/" />} />
              <Route path="/growth-architect" element={P.canSeeGrowthArchitect(userData) ? <OrganizationalBlueprintPage /> : <Navigate to="/" />} />
              <Route path="/profit-share" element={P.isRecruiter(userData) ? <ProfitShareCalculatorPage /> : <Navigate to="/" />} />
              <Route path="/coaching-financials" element={P.isCoach(userData) ? <CoachingFinancialsPage /> : <Navigate to="/" />} />
              <Route path="/admin-settings" element={P.isSuperAdmin(userData) ? <AdminSettingsPage /> : <Navigate to="/" />} />
              <Route path="/habit-settings" element={P.isMcAdmin(userData) ? <HabitTrackerDesignerPage /> : <Navigate to="/" />} />
              <Route path="/user-management" element={P.isSuperAdmin(userData) ? <UserManagementPage /> : <Navigate to="/" />} />
              <Route path="/agent-assignments" element={P.isMcAdmin(userData) ? <AgentAssignmentPage /> : <Navigate to="/" />} />
              <Route path="/agent/:agentId" element={<AgentDetailPage />} />
              
              <Route path="/resource-library" element={<ResourceLibraryPage />} />
              <Route path="/resource-library/lead-gen" element={<LeadGenPage />} />
              <Route path="/resource-library/mrea-playbook" element={<MreaPlaybookPage />} />
              <Route path="/resource-library/:playbookId" element={<PlaybookViewerPage />} />
              <Route path="/resource-management" element={canManageResources ? <ResourceManagementPage /> : <Navigate to="/" />} />
              <Route path="/resource-management/:playbookId" element={canManageResources ? <PlaybookEditorPage /> : <Navigate to="/" />} />
              <Route path="/learning-path-editor/:pathId" element={canManageResources ? <LearningPathEditorPage /> : <Navigate to="/" />} />

              <Route path="/privacy" element={<PrivacyPolicyPage />} />
              <Route path="/terms" element={<TermsOfServicePage />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  );
};


const App: React.FC = () => {
  return (
    <HashRouter>
      <AuthProvider>
        <GoalProvider>
          <TransactionsProvider>
            <NotificationProvider>
              <AppContent />
            </NotificationProvider>
          </TransactionsProvider>
        </GoalProvider>
      </AuthProvider>
    </HashRouter>
  );
};

export default App;
