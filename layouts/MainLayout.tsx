
import React, { useState, useEffect, useLayoutEffect, useMemo, useCallback, Suspense } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Menu, UserCircle, LogOut, ChevronDown, Home, ClipboardList, Users, ListTodo, MoreHorizontal, X } from 'lucide-react';
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
    const { userData, logout } = useAuth();
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
    const location = useLocation();
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

    // Identify primary mobile paths
    const mobilePrimaryNav = useMemo(() => {
        const isRecruiter = P.isRecruiter(userData);
        const isCoach = P.isCoach(userData);
        
        return [
            { name: 'Home', icon: Home, path: '/' },
            { 
                name: 'Tracker', 
                icon: ClipboardList, 
                path: isRecruiter ? '/recruiter-daily-tracker' : isCoach ? '/coach-daily-tracker' : '/daily-tracker' 
            },
            { 
                name: 'Pipeline', 
                icon: Users, 
                path: isRecruiter ? '/recruitment-hub' : '/client-pipeline' 
            },
            { name: 'Tasks', icon: ListTodo, path: '/todos' },
        ];
    }, [userData]);

    useEffect(() => {
        if (navSections.length > 0) {
            const initialState: Record<string, boolean> = {};
            navSections.forEach((section, index) => {
                initialState[section.title] = index < 1; // Only expand first one for mobile clarity
            });
            setExpandedSections(initialState);
        }
    }, [navSections]);

    const handleToggleSection = useCallback((title: string) => {
        setExpandedSections(prev => ({ ...prev, [title]: !prev[title] }));
    }, []);

    return (
        <div className="flex h-screen bg-background text-text-primary overflow-hidden">
            {/* Overlay for mobile */}
            <div
                className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => handleSetIsSidebarOpen(false)}
            ></div>

            {/* Sidebar / More Menu */}
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
                <nav className="flex-1 p-4 space-y-4 overflow-y-auto custom-scrollbar">
                    {navSections.map((section, index) => (
                        <div key={section.title}>
                            <button
                                onClick={() => handleToggleSection(section.title)}
                                className="w-full flex justify-between items-center px-2 py-1.5 text-left rounded-md hover:bg-primary/5 transition-colors"
                                aria-expanded={!!expandedSections[section.title]}
                            >
                                <h3 className="text-xs font-bold uppercase tracking-widest text-text-secondary">{section.title}</h3>
                                <ChevronDown
                                    size={14}
                                    className={`text-text-secondary transition-transform duration-300 ${expandedSections[section.title] ? 'rotate-180' : ''}`}
                                />
                            </button>
                            <div
                                className={`transition-all duration-300 ease-in-out overflow-hidden ${expandedSections[section.title] ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}
                            >
                                <div className="space-y-1 pt-2">
                                    {section.items.map(item => (
                                        <NavLink
                                            key={item.name}
                                            to={item.path}
                                            end={item.path === '/'}
                                            onClick={() => { if (window.innerWidth < 1024) handleSetIsSidebarOpen(false); }}
                                            className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive ? 'bg-primary text-on-accent shadow-md shadow-primary/20' : 'text-text-secondary hover:bg-primary/5 hover:text-text-primary'}`}
                                        >
                                            <item.icon size={18} />
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
                        className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${isActive ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-primary/5'}`}
                    >
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                            {userData?.name?.charAt(0)}
                        </div>
                        <div className="overflow-hidden flex-1">
                            <p className="font-bold text-sm truncate">{userData?.name}</p>
                            <p className="text-[10px] uppercase font-bold opacity-60">My Profile</p>
                        </div>
                    </NavLink>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors w-full text-destructive hover:bg-destructive/10"
                    >
                        <LogOut size={18} />
                        <span>Sign Out</span>
                    </button>
                    <p className="text-[10px] text-center text-text-secondary/50 pt-2">
                        &copy; {currentYear} AgentGPS
                    </p>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden relative">
                {/* Desktop Header */}
                <header className="hidden lg:flex items-center justify-between px-8 h-20 border-b border-border flex-shrink-0 bg-surface/80 backdrop-blur-md">
                    <div className="flex items-center gap-2">
                        <h2 className="font-bold text-xl text-text-primary">
                            {navSections.flatMap(s => s.items).find(i => i.path === location.pathname)?.name || 'Dashboard'}
                        </h2>
                    </div>
                    <div className="flex items-center gap-4">
                        <NotificationBell />
                    </div>
                </header>

                {/* Mobile Header - Super Condensed */}
                <header className="lg:hidden flex items-center justify-between px-4 h-14 border-b border-border flex-shrink-0 bg-surface/80 backdrop-blur-md">
                    <div className="flex items-center gap-2">
                        <img src={logoUrl} alt="Logo" className="h-6 w-6 logo-img" />
                        <h2 className="font-black text-sm tracking-tight">AGENTGPS</h2>
                    </div>
                    <NotificationBell />
                </header>

                <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
                    <Suspense fallback={<div className="flex h-full w-full items-center justify-center"><Spinner className="w-8 h-8" /></div>}>
                        <Outlet />
                    </Suspense>
                </main>

                {/* Mobile Bottom Navigation */}
                <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface/90 backdrop-blur-xl border-t border-border z-40 flex items-center justify-around px-2 pb-safe">
                    {mobilePrimaryNav.map(item => (
                        <NavLink
                            key={item.name}
                            to={item.path}
                            end={item.path === '/'}
                            className={({ isActive }) => `flex flex-col items-center justify-center gap-1 transition-all ${isActive ? 'text-primary' : 'text-text-secondary'}`}
                        >
                            <div className={`p-1.5 rounded-xl transition-all ${location.pathname === item.path ? 'bg-primary/10' : ''}`}>
                                <item.icon size={22} strokeWidth={location.pathname === item.path ? 2.5 : 2} />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-tighter">{item.name}</span>
                        </NavLink>
                    ))}
                    <button
                        onClick={() => handleSetIsSidebarOpen(true)}
                        className="flex flex-col items-center justify-center gap-1 text-text-secondary"
                    >
                        <div className="p-1.5 rounded-xl">
                            <MoreHorizontal size={22} />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-tighter">More</span>
                    </button>
                </nav>
            </div>
        </div>
    );
};
