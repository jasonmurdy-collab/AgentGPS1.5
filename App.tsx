import React, { Suspense, lazy } from 'react';
import { HashRouter, Route, Routes, Navigate } from 'react-router-dom';
import { GoalProvider } from './contexts/GoalContext';
import { AuthProvider, useAuth, P } from './contexts/AuthContext';
import { Spinner } from './components/ui/Spinner';
import { TransactionsProvider } from './contexts/TransactionsContext';
import { NotificationProvider } from './contexts/NotificationContext';

// Import layout components
import { MainLayout } from './layouts/MainLayout';
import { ProtectedRoute } from './components/ProtectedRoute';

// Lazy load pages
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
const CoachBlueprintViewPage = lazy(() => import('./pages/CoachBlueprintViewPage'));
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
const CalendarPage = lazy(() => import('./pages/CalendarPage'));

const AppRoutes: React.FC = () => {
    const { user, userData, loading } = useAuth();

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
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/privacy" element={<PrivacyPolicyPage />} />
                    <Route path="/terms" element={<TermsOfServicePage />} />
                    <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
            </Suspense>
        );
    }

    const canManageResources = P.canManageResources(userData);

    return (
        <Routes>
            <Route element={<MainLayout />}>
                <Route path="/" element={
                    P.isSuperAdmin(userData) ? <PlatformAnalyticsPage /> :
                    P.isMcAdmin(userData) ? <MarketCenterHubPage /> :
                    P.isRecruiter(userData) ? <RecruitmentHubPage /> :
                    P.isCoach(userData) ? <CoachHubPage /> :
                    <DashboardPage />
                } />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/goals" element={<GoalsPage />} />
                <Route path="/business-gps" element={<BusinessGpsPage />} />
                <Route path="/daily-tracker" element={<DailyHabitsTrackerPage />} />
                <Route path="/todos" element={<TodoPage />} />
                <Route path="/financials" element={<FinancialsPage />} />
                <Route path="/teams" element={<TeamsPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/my-launchpad" element={<NewAgentResourcesPage />} />
                <Route path="/agent-transactions" element={<CoachTransactionsPage />} />
                <Route path="/agent/:agentId" element={<AgentDetailPage />} />
                <Route path="/resource-library" element={<ResourceLibraryPage />} />
                <Route path="/resource-library/lead-gen" element={<LeadGenPage />} />
                <Route path="/resource-library/mrea-playbook" element={<MreaPlaybookPage />} />
                <Route path="/resource-library/:playbookId" element={<PlaybookViewerPage />} />

                <Route path="/client-pipeline" element={
                    <ProtectedRoute isAllowed={P.canManageClientPipeline(userData)}>
                        <ClientPipelinePage />
                    </ProtectedRoute>
                } />
                <Route path="/recruiter-daily-tracker" element={
                    <ProtectedRoute isAllowed={P.isRecruiter(userData)}>
                        <RecruiterDailyTrackerPage />
                    </ProtectedRoute>
                } />
                <Route path="/coach-daily-tracker" element={
                    <ProtectedRoute isAllowed={P.isCoach(userData)}>
                        <CoachDailyHabitsTrackerPage />
                    </ProtectedRoute>
                } />
                <Route path="/coach-goals" element={
                    <ProtectedRoute isAllowed={P.isCoach(userData)}><GoalsPage /></ProtectedRoute>
                } />
                <Route path="/coach-gps" element={
                    <ProtectedRoute isAllowed={P.isCoach(userData)}><BusinessGpsPage /></ProtectedRoute>
                } />
                <Route path="/recruitment-playbook" element={
                    <ProtectedRoute isAllowed={P.canSeeRecruitmentPlaybook(userData)}>
                        <RecruitmentPlaybookPage />
                    </ProtectedRoute>
                } />
                <Route path="/recruitment-hub" element={
                    <ProtectedRoute isAllowed={P.isCoach(userData)}><RecruitmentHubPage /></ProtectedRoute>
                } />
                <Route path="/team-hub" element={
                    <ProtectedRoute isAllowed={P.isTeamLeader(userData)}><CoachHubPage /></ProtectedRoute>
                } />
                <Route path="/agent-logs" element={
                    <ProtectedRoute isAllowed={P.canAccessCoachingTools(userData)}>
                        <CoachHabitLogsPage />
                    </ProtectedRoute>
                } />
                 <Route path="/agent-architect" element={
                    <ProtectedRoute isAllowed={P.canAccessCoachingTools(userData)}>
                        <CoachBlueprintViewPage />
                    </ProtectedRoute>
                } />
                <Route path="/performance-logs" element={
                    <ProtectedRoute isAllowed={P.isTeamLeader(userData)}>
                        <PerformanceLogsPage />
                    </ProtectedRoute>
                } />
                <Route path="/my-performance" element={
                    <ProtectedRoute isAllowed={P.canSeeMyPerformance(userData)}>
                        <MyPerformancePage />
                    </ProtectedRoute>
                } />
                <Route path="/growth-architect" element={
                    <ProtectedRoute isAllowed={P.canSeeGrowthArchitect(userData)}>
                        <OrganizationalBlueprintPage />
                    </ProtectedRoute>
                } />
                <Route path="/profit-share" element={
                    <ProtectedRoute isAllowed={P.isRecruiter(userData)}>
                        <ProfitShareCalculatorPage />
                    </ProtectedRoute>
                } />
                <Route path="/coaching-financials" element={
                    <ProtectedRoute isAllowed={P.isCoach(userData)}>
                        <CoachingFinancialsPage />
                    </ProtectedRoute>
                } />
                
                {/* SETTINGS: Scoped for Coaches and MC Admins */}
                <Route path="/admin-settings" element={
                    <ProtectedRoute isAllowed={P.isCoach(userData) || P.isMcAdmin(userData) || P.isSuperAdmin(userData)}>
                        <AdminSettingsPage />
                    </ProtectedRoute>
                } />
                
                <Route path="/habit-settings" element={
                    <ProtectedRoute isAllowed={P.isMcAdmin(userData) || P.isSuperAdmin(userData)}>
                        <HabitTrackerDesignerPage />
                    </ProtectedRoute>
                } />
                <Route path="/user-management" element={
                    <ProtectedRoute isAllowed={P.isSuperAdmin(userData)}>
                        <UserManagementPage />
                    </ProtectedRoute>
                } />
                <Route path="/agent-assignments" element={
                    <ProtectedRoute isAllowed={P.isMcAdmin(userData)}>
                        <AgentAssignmentPage />
                    </ProtectedRoute>
                } />
                
                <Route path="/resource-management" element={
                    <ProtectedRoute isAllowed={canManageResources}><ResourceManagementPage /></ProtectedRoute>
                } />
                <Route path="/resource-management/:playbookId" element={
                    <ProtectedRoute isAllowed={canManageResources}><PlaybookEditorPage /></ProtectedRoute>
                } />
                <Route path="/learning-path-editor/:pathId" element={
                    <ProtectedRoute isAllowed={canManageResources}><LearningPathEditorPage /></ProtectedRoute>
                } />

                <Route path="/privacy" element={<PrivacyPolicyPage />} />
                <Route path="/terms" element={<TermsOfServicePage />} />
                
                <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
        </Routes>
    );
};

const App: React.FC = () => {
    return (
        <HashRouter>
            <AuthProvider>
                <GoalProvider>
                    <TransactionsProvider>
                        <NotificationProvider>
                            <AppRoutes />
                        </NotificationProvider>
                    </TransactionsProvider>
                </GoalProvider>
            </AuthProvider>
        </HashRouter>
    );
};

export default App;