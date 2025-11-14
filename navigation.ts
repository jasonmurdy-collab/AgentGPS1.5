

import {
    LayoutDashboard, Target, Users, UserCircle, Feather, Briefcase,
    ClipboardList, BookOpen, Rocket, DollarSign, BarChartHorizontal,
    Settings, UserSearch, Network, PieChart, UserCheck, Building,
    Edit3, ListTodo
} from 'lucide-react';

// 1. DEFINE ALL POSSIBLE NAV ITEMS
// Now you only need to change a path or icon in ONE place.
const navItems = {
    // Core
    DASHBOARD: { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
    GOALS: { name: 'Goals', icon: Target, path: '/goals' },
    BUSINESS_GPS: { name: 'Business GPS', icon: Feather, path: '/business-gps' },
    CLIENT_PIPELINE: { name: 'Client Pipeline', icon: Users, path: '/client-pipeline' },
    DAILY_TRACKER: { name: 'Daily Tracker', icon: ClipboardList, path: '/daily-tracker' },
    TODOS: { name: 'To-Do List', icon: ListTodo, path: '/todos' },
    FINANCIALS: { name: 'Financials', icon: DollarSign, path: '/financials' },
    MY_PERFORMANCE: { name: 'My Performance', icon: UserCheck, path: '/my-performance' },
    
    // Growth & Learning
    GROWTH_ARCHITECT: { name: 'Growth Architect', icon: Network, path: '/growth-architect' },
    MY_LAUNCHPAD: { name: 'My Launchpad', icon: Rocket, path: '/my-launchpad' },
    RESOURCE_LIBRARY: { name: 'My Growth', icon: BookOpen, path: '/resource-library' }, // Renamed to 'My Growth' for Agent
    RESOURCE_LIBRARY_DEFAULT: { name: 'Resource Library', icon: BookOpen, path: '/resource-library' },

    // Team & Community
    TEAMS: { name: 'Teams', icon: Users, path: '/teams' },
    TEAM_HUB: { name: 'Team Hub', icon: Briefcase, path: '/team-hub' },
    AGENT_HABIT_LOGS: { name: 'Agent Habit Logs', icon: ClipboardList, path: '/agent-logs' },
    PERFORMANCE_LOGS: { name: 'Performance Logs', icon: Settings, path: '/performance-logs' },

    // Recruiting
    RECRUITMENT_PLAYBOOK: { name: 'Recruitment Playbook', icon: UserSearch, path: '/recruitment-playbook' },
    RECRUITMENT_HUB: { name: 'Recruitment Hub', icon: UserSearch, path: '/recruitment-hub' },
    RECRUITER_DAILY_TRACKER: { name: 'Daily Tracker', icon: ClipboardList, path: '/recruiter-daily-tracker' },
    PROFIT_SHARE: { name: 'Profit Share', icon: PieChart, path: '/profit-share' },

    // Coach
    COACH_GOALS: { name: 'My Goals', icon: Target, path: '/coach-goals' },
    COACH_GPS: { name: 'My Business GPS', icon: Feather, path: '/coach-gps' },
    COACH_DAILY_TRACKER: { name: 'My Daily Tracker', icon: ClipboardList, path: '/coach-daily-tracker' },
    COACHING_FINANCIALS: { name: 'Coaching Financials', icon: PieChart, path: '/coaching-financials' },
    COACHING_HUB: { name: 'Coaching Hub', icon: Briefcase, path: '/' },
    AGENT_TRANSACTIONS: { name: 'Agent Transactions', icon: BarChartHorizontal, path: '/agent-transactions' },
    TALENT_DEV_CENTER: { name: 'Talent Development Center', icon: Edit3, path: '/resource-management' },

    // MC Admin
    AGENT_ARCHITECT: { name: 'Agent Architect', icon: Network, path: '/agent-architect' },
    MC_HUB: { name: 'Market Center Hub', icon: Building, path: '/' },
    AGENT_ASSIGNMENTS: { name: 'Agent Assignments', icon: UserCheck, path: '/agent-assignments' },
    HABIT_DESIGNER: { name: 'Habit Tracker Designer', icon: Settings, path: '/habit-settings' },

    // Super Admin
    ANALYTICS: { name: 'Analytics', icon: PieChart, path: '/' },
    USER_ROSTER: { name: 'User Roster', icon: Users, path: '/user-management' },
    MC_SETTINGS: { name: 'Market Centers', icon: Building, path: '/admin-settings' },
};

// 2. COMPOSE ROLE-BASED NAVIGATION
// Now you just pick from the items you defined above.
export const agentNavSections = [
    {
        title: 'Core Tools',
        items: [
            navItems.DASHBOARD,
            navItems.GOALS,
            navItems.BUSINESS_GPS,
            navItems.CLIENT_PIPELINE,
            navItems.DAILY_TRACKER,
            navItems.TODOS,
            navItems.FINANCIALS,
            navItems.MY_PERFORMANCE,
        ]
    },
    {
        title: 'Growth & Learning',
        items: [
            navItems.GROWTH_ARCHITECT,
            navItems.MY_LAUNCHPAD,
            navItems.RESOURCE_LIBRARY, // Uses the 'My Growth' label
        ]
    },
    {
        title: 'Team & Community',
        items: [ navItems.TEAMS ]
    },
];

export const teamLeaderNavSections = [
    {
        title: 'My Business',
        items: [
            navItems.DASHBOARD,
            navItems.GOALS,
            navItems.BUSINESS_GPS,
            navItems.FINANCIALS,
            navItems.GROWTH_ARCHITECT,
            navItems.MY_PERFORMANCE,
            navItems.TODOS,
        ]
    },
    {
        title: 'Team Management',
        items: [
            navItems.TEAM_HUB,
            navItems.CLIENT_PIPELINE,
            navItems.AGENT_HABIT_LOGS,
            navItems.PERFORMANCE_LOGS,
        ]
    },
    {
        title: 'Recruiting & Growth',
        items: [
            navItems.RECRUITMENT_PLAYBOOK,
            navItems.RESOURCE_LIBRARY_DEFAULT,
            navItems.TALENT_DEV_CENTER,
        ]
    },
];

export const recruiterNavSections = [
    {
        title: 'Recruiting Hub',
        items: [
            navItems.DASHBOARD,
            navItems.GOALS,
            navItems.RECRUITER_DAILY_TRACKER,
            navItems.TODOS,
            navItems.RECRUITMENT_PLAYBOOK,
        ]
    },
    {
        title: 'Growth & Strategy',
        items: [
            navItems.PROFIT_SHARE,
            navItems.RESOURCE_LIBRARY_DEFAULT,
        ]
    },
];

export const coachNavSections = [
    {
        title: 'My Business',
        items: [
            navItems.COACH_GOALS,
            navItems.COACH_GPS,
            navItems.GROWTH_ARCHITECT,
            navItems.COACH_DAILY_TRACKER,
            navItems.TODOS,
            navItems.COACHING_FINANCIALS,
        ]
    },
    {
        title: 'Coaching Tools',
        items: [
            navItems.COACHING_HUB,
            navItems.AGENT_TRANSACTIONS,
            navItems.AGENT_HABIT_LOGS,
            navItems.PERFORMANCE_LOGS,
            navItems.AGENT_ARCHITECT,
        ]
    },
    {
        title: 'Resources',
        items: [
            navItems.RECRUITMENT_HUB,
            navItems.RESOURCE_LIBRARY_DEFAULT,
            navItems.TALENT_DEV_CENTER,
        ]
    },
];

export const mcAdminNavSections = [
    {
        title: 'Market Center',
        items: [
            navItems.MC_HUB,
            navItems.AGENT_ASSIGNMENTS,
            navItems.PERFORMANCE_LOGS,
        ]
    },
    {
        title: 'Growth & Strategy',
        items: [
            navItems.GROWTH_ARCHITECT,
            navItems.RECRUITMENT_HUB,
        ]
    },
    {
        title: 'Resources & Training',
        items: [
            navItems.RESOURCE_LIBRARY_DEFAULT,
            navItems.TALENT_DEV_CENTER,
            navItems.HABIT_DESIGNER,
        ]
    }
];

export const superAdminNavSections = [
    {
        title: 'Platform Management',
        items: [
            navItems.ANALYTICS,
            navItems.USER_ROSTER,
            navItems.MC_SETTINGS,
            navItems.HABIT_DESIGNER,
        ]
    }
];