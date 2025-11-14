
import React, { useState, useEffect, useLayoutEffect, useMemo, useCallback, Suspense } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Menu, UserCircle, LogOut, ChevronDown } from 'lucide-react';
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
} from '../navigation'; // Import from your new navigation file

export const MainLayout: React.FC = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
    const { userData, logout } = useAuth();
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
    const currentYear = new Date().getFullYear();

    const handleSetIsSidebarOpen = useCallback((isOpen: boolean) => {
        setIsSidebarOpen(isOpen);
    }, []);

    const handleLogout = useCallback(() => {
        logout();
        if (window.innerWidth < 1024) handleSetIsSidebarOpen(false);
    }, [logout, handleSetIsSidebarOpen]);

    // Effect for handling responsive sidebar
    useEffect(() => {
        const handleResize = () => {
            handleSetIsSidebarOpen(window.innerWidth > 1024);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [handleSetIsSidebarOpen]);

    // Effect for setting the theme
    useLayoutEffect(() => {
        const theme = userData?.theme || 'light';
        const root = document.documentElement;
        root.classList.toggle('dark', theme === 'dark');
    }, [userData]);

    // Memo for selecting the correct nav sections based on user role
    const navSections = useMemo(() => {
        if (P.isSuperAdmin(userData)) return superAdminNavSections;
        if (P.isMcAdmin(userData)) return mcAdminNavSections;
        if (P.isCoach(userData)) return coachNavSections;
        if (P.isTeamLeader(userData)) return teamLeaderNavSections;
        if (P.isRecruiter(userData)) return recruiterNavSections;
        return agentNavSections;
    }, [userData]);

    // Effect for setting default expanded sections
    useEffect(() => {
        if (navSections.length > 0) {
            const initialState: Record<string, boolean> = {};
            navSections.forEach((section, index) => {
                initialState[section.title] = index < 2; // Expand first two
            });
            setExpandedSections(initialState);
        }
    }, [navSections]);

    const handleToggleSection = useCallback((title: string) => {
        setExpandedSections(prev => ({ ...prev, [title]: !prev[title] }));
    }, []);

    return (
        <div className="flex h-screen bg-background text-text-primary">
            {/* Overlay for mobile */}
            <div
                className={`fixed inset-0 bg-black/50 z-20 lg:hidden ${isSidebarOpen ? 'block' : 'hidden'}`}
                onClick={() => handleSetIsSidebarOpen(false)}
            ></div>

            {/* Sidebar */}
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
                        <NavLink to="/privacy" onClick={() => { if (window.innerWidth < 1024) handleSetIsSidebarOpen(false); }} className="hover:underline">
                            Privacy Policy
                        </NavLink>
                        <span className="mx-2">&bull;</span>
                        <NavLink to="/terms" onClick={() => { if (window.innerWidth < 1024) handleSetIsSidebarOpen(false); }} className="hover:underline">
                            Terms of Service
                        </NavLink>
                    </div>
                    <p className="!mt-2 text-center text-xs text-text-secondary/70">
                        &copy; {currentYear} AgentGPS. All Rights Reserved. Copyright Pending.
                    </p>
                </div>
            </aside>

            {/* Main Content Area */}
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
                    {/* This is where all the page components will be rendered */}
                    <Suspense fallback={<div className="flex h-full w-full items-center justify-center"><Spinner className="w-8 h-8" /></div>}>
                        <Outlet />
                    </Suspense>
                </main>
            </div>
        </div>
    );
};
