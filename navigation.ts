
import {
    LayoutDashboard, Target, Users, Compass, 
    ClipboardList, BookOpen, Rocket, DollarSign,
    Settings, UserSearch, Network, PieChart, UserCheck, Building,
    Edit3, ListTodo, Calendar as CalendarIcon, Briefcase, GraduationCap
} from 'lucide-react';

// 1. DEFINE ALL POSSIBLE NAV ITEMS
export const navItems = {
    // Core
    DASHBOARD: { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
    CALENDAR: { name: 'Calendar', icon: CalendarIcon, path: '/calendar' },
    
    // Hubs (The new Spoke-entry points)
    MY_BUSINESS_HUB: { name: 'My Business', icon: Compass, path: '/business-hub' },
    TRAINING_HUB: { name: 'Training', icon: GraduationCap, path: '/training-hub' },
    TEAM_HUB: { name: 'Team Hub', icon: Users, path: '/team-hub' },
    RECRUITING_HUB: { name: 'Recruiting', icon: UserSearch, path: '/recruitment-hub' },

    // Direct Access (Daily Drivers)
    DAILY_TRACKER: { name: 'Daily Tracker', icon: ClipboardList, path: '/daily-tracker' },
    CLIENT_PIPELINE: { name: 'Pipeline', icon: Users, path: '/client-pipeline' },
    TODOS: { name: 'To-Dos', icon: ListTodo, path: '/todos' },
    
    // Admin/Global
    ANALYTICS: { name: 'Analytics', icon: PieChart, path: '/' },
    MC_HUB: { name: 'Market Center Hub', icon: Building, path: '/' },
    USER_ROSTER: { name: 'User Roster', icon: Users, path: '/user-management' },
    AGENT_ASSIGNMENTS: { name: 'Agent Assignments', icon: UserCheck, path: '/agent-assignments' },
    ADMIN_SETTINGS: { name: 'Admin Settings', icon: Settings, path: '/admin-settings' },
};

// 2. COMPOSE ROLE-BASED NAVIGATION (Reduced count as per Strategy Doc)
export const agentNavSections = [
    {
        title: 'Home',
        items: [ navItems.DASHBOARD ]
    },
    {
        title: 'Daily Execution',
        items: [
            navItems.DAILY_TRACKER,
            navItems.CLIENT_PIPELINE,
            navItems.TODOS,
        ]
    },
    {
        title: 'Strategy & Growth',
        items: [
            navItems.MY_BUSINESS_HUB,
            navItems.TRAINING_HUB,
        ]
    },
];

export const teamLeaderNavSections = [
    {
        title: 'Home',
        items: [ navItems.DASHBOARD ]
    },
    {
        title: 'Execution',
        items: [
            navItems.DAILY_TRACKER,
            navItems.CLIENT_PIPELINE,
        ]
    },
    {
        title: 'Management',
        items: [
            navItems.MY_BUSINESS_HUB,
            navItems.TEAM_HUB,
            navItems.RECRUITING_HUB,
        ]
    },
    {
        title: 'Growth',
        items: [ navItems.TRAINING_HUB ]
    }
];

export const recruiterNavSections = [
    {
        title: 'Home',
        items: [ navItems.DASHBOARD ]
    },
    {
        title: 'Recruiting',
        items: [
            { name: 'Tracker', icon: ClipboardList, path: '/recruiter-daily-tracker' },
            navItems.RECRUITING_HUB,
            { name: 'Strategy', icon: Compass, path: '/recruitment-playbook' },
        ]
    },
    {
        title: 'Analysis',
        items: [ { name: 'Profit Share', icon: PieChart, path: '/profit-share' } ]
    }
];

export const coachNavSections = [
    {
        title: 'Home',
        items: [ { name: 'Coaching Hub', icon: Briefcase, path: '/' } ]
    },
    {
        title: 'Strategy',
        items: [ navItems.MY_BUSINESS_HUB ]
    },
    {
        title: 'Tools',
        items: [
            { name: 'Daily Tracker', icon: ClipboardList, path: '/coach-daily-tracker' },
            { name: 'Agent Logs', icon: ClipboardList, path: '/agent-logs' },
            { name: 'Transactions', icon: DollarSign, path: '/agent-transactions' },
        ]
    },
    {
        title: 'Management',
        items: [
            { name: 'Development', icon: Edit3, path: '/resource-management' },
            navItems.RECRUITING_HUB,
            navItems.ADMIN_SETTINGS,
        ]
    }
];

export const mcAdminNavSections = [
    {
        title: 'Market Center',
        items: [
            navItems.MC_HUB,
            navItems.AGENT_ASSIGNMENTS,
            navItems.ADMIN_SETTINGS,
        ]
    },
    {
        title: 'Strategy',
        items: [
            navItems.MY_BUSINESS_HUB,
            navItems.RECRUITING_HUB,
        ]
    },
    {
        title: 'Training',
        items: [
            { name: 'Dev Center', icon: Edit3, path: '/resource-management' },
            { name: 'Habit Designer', icon: Settings, path: '/habit-settings' },
        ]
    }
];

export const superAdminNavSections = [
    {
        title: 'Platform',
        items: [
            navItems.ANALYTICS,
            navItems.USER_ROSTER,
            navItems.ADMIN_SETTINGS,
            { name: 'Habit Designer', icon: Settings, path: '/habit-settings' },
        ]
    }
];
