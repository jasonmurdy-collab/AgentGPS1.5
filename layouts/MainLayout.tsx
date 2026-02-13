
import React, { useState, useEffect, useLayoutEffect, useMemo, useCallback, Suspense } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Menu, UserCircle, LogOut, ChevronDown, Home, ClipboardList, Users, ListTodo, MoreHorizontal, X, Plus, Target, UserPlus, UserCheck } from 'lucide-react';
import { useAuth, P } from '../contexts/AuthContext';
import { Spinner } from '../components/ui/Spinner';
import { logoUrl } from '../assets';
import { NotificationBell } from '../components/notifications/NotificationBell';
import {
    agentNavSections,
    teamLeaderNavSections,
    recruiterNavSections,
    coachNavSections,
    mcAdminNavSections,
    superAdminNavSections
} from '../navigation';

export const MainLayout: React.FC = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);
    const { userData, logout } = useAuth();
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
    const location = useLocation();
    const navigate = useNavigate();
    const currentYear = new Date().getFullYear();

    const handleSetIsSidebarOpen = useCallback((isOpen: boolean) => {
        setIsSidebarOpen(isOpen);
    }, []);

    const handleLogout = useCallback(() => {
        logout();
        if (window.innerWidth < 1024) handleSetIsSidebarOpen(false);
    }, [logout, handleSetIsSidebarOpen]);

    // Effect for setting the theme
    useLayoutEffect(() => {
        const theme = userData?.theme || 'light';
        const root = document.documentElement;
        root.classList.toggle('dark', theme === 'dark');
    }, [userData]);

    // Select nav sections based on role
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
            navSections.forEach((section) => {
                initialState[section.title] = true; // Default all hubs/sections to expanded for clarity
            });
            setExpandedSections(initialState);
        }
    }, [navSections]);

    const handleToggleSection = useCallback((title: string) => {
        setExpandedSections(prev => ({ ...prev, [title]: !prev[title] }));
    }, []);

    const isLeadership = P.isTeamLeader(userData) || P.isCoach(userData);

    return (
        <div className="flex h-screen bg-background text-text-primary overflow-hidden">
            {/* Overlay for mobile */}
            <div
                className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => handleSetIsSidebarOpen(false)}
            ></div>

            {/* Sidebar */}
            <aside className={`bg-surface border-r border-border flex flex-col transition-transform duration-300 fixed inset-y-0 left-0 z-50 w-72 lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex items-center justify-between p-4 h-20 border-b border-border flex-shrink-0">
                    <div className="flex items-center">
                        <img src={logoUrl} alt="AgentGPS Logo" className="h-8 w-8 logo-img" />
                        <span className="font-heading font-bold text-lg ml-2">AgentGPS</span>
                    </div>
                    <button onClick={() => handleSetIsSidebarOpen(false)} className="lg:hidden p-2 hover:bg-primary/10 rounded-full">
                        <X size={20} />
                    </button>
                </div>
                <nav className="flex-1 p-4 space-y-6 overflow-y-auto custom-scrollbar">
                    {navSections.map((section) => (
                        <div key={section.title}>
                            <h3 className="px-3 mb-2 text-xs font-bold uppercase tracking-widest text-text-secondary opacity-50">{section.title}</h3>
                            <div className="space-y-1">
                                {section.items.map(item => (
                                    <NavLink
                                        key={item.name}
                                        to={item.path}
                                        end={item.path === '/'}
                                        onClick={() => { if (window.innerWidth < 1024) handleSetIsSidebarOpen(false); }}
                                        className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${isActive ? 'bg-primary text-on-accent shadow-lg shadow-primary/20 scale-[1.02]' : 'text-text-secondary hover:bg-primary/5 hover:text-text-primary'}`}
                                    >
                                        <item.icon size={18} strokeWidth={2.5} />
                                        <span>{item.name}</span>
                                    </NavLink>
                                ))}
                            </div>
                        </div>
                    ))}
                </nav>
                <div className="p-4 border-t border-border flex-shrink-0 space-y-2">
                    <NavLink
                        to="/profile"
                        onClick={() => { if (window.innerWidth < 1024) handleSetIsSidebarOpen(false); }}
                        className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${isActive ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-primary/5'}`}
                    >
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                            {userData?.name?.charAt(0)}
                        </div>
                        <div className="overflow-hidden flex-1">
                            <p className="font-bold text-sm truncate">{userData?.name}</p>
                            <p className="text-[10px] uppercase font-bold opacity-40">Account Settings</p>
                        </div>
                    </NavLink>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors w-full text-destructive hover:bg-destructive/10"
                    >
                        <LogOut size={18} />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden relative">
                <header className="flex items-center justify-between px-4 lg:px-8 h-16 lg:h-20 border-b border-border flex-shrink-0 bg-surface/80 backdrop-blur-md">
                    <div className="flex items-center gap-2">
                        <button onClick={() => handleSetIsSidebarOpen(true)} className="lg:hidden p-2 -ml-2 text-text-secondary">
                            <Menu size={20} />
                        </button>
                        <h2 className="font-bold text-base lg:text-xl text-text-primary hidden sm:block">
                            {navSections.flatMap(s => s.items).find(i => i.path === location.pathname)?.name || 'Command Center'}
                        </h2>
                    </div>

                    <div className="flex items-center gap-2 lg:gap-4">
                        {/* Desktop Quick Action */}
                        <button 
                            onClick={() => setIsQuickActionOpen(!isQuickActionOpen)}
                            className="hidden sm:flex items-center gap-2 px-4 py-2 bg-primary text-on-accent rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
                        >
                            <Plus size={18} /> New
                        </button>
                        <NotificationBell />
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto">
                    <Suspense fallback={<div className="flex h-full w-full items-center justify-center"><Spinner className="w-8 h-8" /></div>}>
                        <Outlet />
                    </Suspense>
                </main>

                {/* Quick Action Overlay (FAB Menu) */}
                {isQuickActionOpen && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                        <div className="w-full max-w-sm bg-surface rounded-3xl p-6 shadow-2xl animate-in zoom-in-95">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold">Log New Action</h3>
                                <button onClick={() => setIsQuickActionOpen(false)} className="p-2 hover:bg-primary/5 rounded-full"><X size={24}/></button>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <button onClick={() => { navigate('/client-pipeline'); setIsQuickActionOpen(false); }} className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-primary/5 hover:bg-primary/10 transition-all active:scale-95">
                                    <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20"><UserPlus size={24}/></div>
                                    <span className="font-bold text-sm">New Lead</span>
                                </button>
                                <button onClick={() => { navigate('/goals'); setIsQuickActionOpen(false); }} className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-success/5 hover:bg-success/10 transition-all active:scale-95">
                                    <div className="w-12 h-12 rounded-full bg-success text-white flex items-center justify-center shadow-lg shadow-success/20"><Target size={24}/></div>
                                    <span className="font-bold text-sm">Set Goal</span>
                                </button>
                                <button onClick={() => { navigate('/todos'); setIsQuickActionOpen(false); }} className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-accent-secondary/5 hover:bg-accent-secondary/10 transition-all active:scale-95">
                                    <div className="w-12 h-12 rounded-full bg-accent-secondary text-white flex items-center justify-center shadow-lg shadow-accent-secondary/20"><ListTodo size={24}/></div>
                                    <span className="font-bold text-sm">Add Task</span>
                                </button>
                                {isLeadership ? (
                                    <button onClick={() => { navigate('/performance-logs'); setIsQuickActionOpen(false); }} className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-purple-500/5 hover:bg-purple-500/10 transition-all active:scale-95">
                                        <div className="w-12 h-12 rounded-full bg-purple-500 text-white flex items-center justify-center shadow-lg shadow-purple-500/20"><UserCheck size={24}/></div>
                                        <span className="font-bold text-sm">Log Review</span>
                                    </button>
                                ) : (
                                    <button onClick={() => { navigate('/daily-tracker'); setIsQuickActionOpen(false); }} className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-orange-500/5 hover:bg-orange-500/10 transition-all active:scale-95">
                                        <div className="w-12 h-12 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/20"><ClipboardList size={24}/></div>
                                        <span className="font-bold text-sm">Log Habits</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Mobile FAB */}
                <button 
                    onClick={() => setIsQuickActionOpen(true)}
                    className="sm:hidden fixed bottom-6 right-6 w-14 h-14 bg-primary text-on-accent rounded-full shadow-2xl flex items-center justify-center z-50 transition-transform active:scale-90"
                >
                    <Plus size={28} />
                </button>
            </div>
        </div>
    );
};
