
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAuth, P } from '../contexts/AuthContext';
import { type Goal, type TeamMember, NewAgentHomework, DailyTrackerData, Transaction, ProspectingSession, Playbook, PerformanceLog } from '../types';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import { Plus, GraduationCap, Trash2, ChevronDown, ChevronUp, MoreVertical, Edit, Search, Activity, UserCheck, BookOpen, Archive, MessageSquare, CheckSquare, Star, Target, DollarSign, BarChart2, LayoutDashboard, ClipboardList, ChevronRight, AlertTriangle, PieChart, Users, TrendingUp, Settings, PlusCircle } from 'lucide-react';
import { GoalModal } from '../components/goals/AddGoalModal';
import { useGoals } from '../contexts/GoalContext';
import { GoalProgressCard } from '../components/dashboard/GoalProgressCard';
import { CoachInsights } from '../components/coach/CoachInsights';
import { TeamPerformanceSummary } from '../components/coach/TeamPerformanceSummary';
import { AssignBulkGoalModal } from '../components/coach/AssignBulkGoalModal';
import { AssignHomeworkModal } from '../components/coach/AssignHomeworkModal';
import { ChangeRoleModal } from '../components/coach/ChangeRoleModal';
import { getFirestoreInstance } from '../firebaseConfig';
import { collection, query, where, getDocs, onSnapshot, doc } from 'firebase/firestore';
import { processGoalDoc, processDailyTrackerDoc, processTransactionDoc } from '../lib/firestoreUtils';
import { Link, useNavigate } from 'react-router-dom';

// --- AGENT CARD COMPONENT ---
const AgentCard: React.FC<{
    agent: TeamMember;
    habitLogs: DailyTrackerData[];
    isTeamLeader: boolean;
    isMcAdmin: boolean;
    onToggleNewAgentStatus: (agentId: string, currentStatus: boolean) => void;
    onAssignGoal: (agent: TeamMember) => void;
    onAssignHomework: (agent: TeamMember) => void;
    onRemoveAgent: (agentId: string, agentName: string) => void;
    onChangeRole: (agent: TeamMember) => void;
}> = ({
    agent, habitLogs, isTeamLeader, isMcAdmin, onToggleNewAgentStatus, onAssignGoal,
    onAssignHomework, onRemoveAgent, onChangeRole
}) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const logsInLast7Days = useMemo(() => {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return habitLogs.filter(log => new Date(log.date) >= sevenDaysAgo).length;
    }, [habitLogs]);

    const handleCardClick = () => {
        navigate(`/agent/${agent.id}`);
    };

    const handleLogSession = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigate(`/performance-logs?agentId=${agent.id}`);
    };

    return (
        <Card className="p-4 flex flex-col group hover:shadow-xl transition-all border-border hover:border-primary/30">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
                <button 
                    onClick={handleCardClick}
                    className="flex items-center gap-4 text-left p-2 -m-2 rounded-lg hover:bg-primary/5 flex-grow min-w-0"
                >
                    <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-on-accent font-black text-xl flex-shrink-0 shadow-lg shadow-primary/20">
                        {(agent.name || ' ').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-lg font-bold text-text-primary truncate">{agent.name}</h3>
                        <p className="text-xs font-bold text-text-secondary uppercase tracking-widest opacity-60">{agent.role?.replace(/_/g, ' ')}</p>
                    </div>
                </button>
                <div className="relative flex-shrink-0" ref={menuRef}>
                    <button onClick={() => setIsMenuOpen(p => !p)} className="p-2 rounded-full hover:bg-primary/10 transition-colors"><MoreVertical size={16} /></button>
                    {isMenuOpen && (
                         <div className="absolute right-0 mt-2 w-56 bg-surface border border-border rounded-xl shadow-2xl z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                            <button onClick={handleLogSession} className="w-full text-left flex items-center gap-2 px-4 py-3 text-sm font-bold text-primary hover:bg-primary/5 transition-colors border-b border-border"><UserCheck size={14}/> Log Coaching Session</button>
                            <button onClick={() => onAssignGoal(agent)} className="w-full text-left flex items-center gap-2 px-4 py-3 text-sm font-semibold hover:bg-primary/5 transition-colors"><Target size={14}/> Assign Goal</button>
                            <button onClick={() => onAssignHomework(agent)} className="w-full text-left flex items-center gap-2 px-4 py-3 text-sm font-semibold hover:bg-primary/5 transition-colors"><GraduationCap size={14}/> Assign Homework</button>
                            <button onClick={() => onChangeRole(agent)} className="w-full text-left flex items-center gap-2 px-4 py-3 text-sm font-semibold hover:bg-primary/5 transition-colors"><Settings size={14}/> Change Role</button>
                            {isTeamLeader && <button onClick={() => onRemoveAgent(agent.id, agent.name)} className="w-full text-left flex items-center gap-2 px-4 py-3 text-sm font-bold text-destructive hover:bg-destructive/10 transition-colors border-t border-border"><Trash2 size={14}/> Remove from Team</button>}
                        </div>
                    )}
                </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-center mt-auto pt-4 border-t border-border">
                 <div className="bg-background/50 p-2 rounded-lg">
                    <p className="text-[10px] text-text-secondary uppercase font-bold tracking-widest mb-1">GCI</p>
                    <p className="text-lg font-bold text-text-primary">${(agent.gci || 0).toLocaleString()}</p>
                </div>
                <div className="bg-background/50 p-2 rounded-lg">
                    <p className="text-[10px] text-text-secondary uppercase font-bold tracking-widest mb-1">Logs (7d)</p>
                    <p className="text-lg font-bold text-text-primary">{logsInLast7Days}</p>
                </div>
            </div>

            <button 
                onClick={handleLogSession}
                className="mt-4 w-full py-2 bg-primary/10 text-primary font-bold text-sm rounded-lg hover:bg-primary text-on-accent transition-all duration-300 opacity-0 group-hover:opacity-100"
            >
                Start Review Log
            </button>
        </Card>
    );
};


const CoachHubPage: React.FC = () => {
    const { user, userData, managedAgents, loadingAgents, getHabitLogsForManagedUsers, getAllTransactions, getAllCommissionProfiles, removeAgentFromTeam, updateUserNewAgentStatus, assignHomeworkToUser, updateUserRole } = useAuth();
    const { addGoal, getGoalsForUser } = useGoals();
    const navigate = useNavigate();
    const [loadingData, setLoadingData] = useState(true);
    const [agentGoals, setAgentGoals] = useState<Record<string, Goal[]>>({});
    const [agentHabitLogs, setAgentHabitLogs] = useState<Record<string, DailyTrackerData[]>>({});
    const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);

    const [filter, setFilter] = useState('');
    const [isAssignGoalModalOpen, setIsAssignGoalModalOpen] = useState(false);
    const [isAssignHomeworkModalOpen, setIsAssignHomeworkModalOpen] = useState(false);
    const [isChangeRoleModalOpen, setIsChangeRoleModalOpen] = useState(false);
    const [selectedAgent, setSelectedAgent] = useState<TeamMember | null>(null);

    const fetchData = useCallback(async () => {
        if (loadingAgents || !userData) return;
        setLoadingData(true);
        const [goalsData, logsData, transactionsData] = await Promise.all([
            Promise.all(managedAgents.map(agent => getGoalsForUser(agent.id).then(goals => ({ agentId: agent.id, goals })))),
            getHabitLogsForManagedUsers(),
            getAllTransactions()
        ]);

        setAgentGoals(goalsData.reduce((acc, { agentId, goals }) => ({ ...acc, [agentId]: goals }), {}));
        setAgentHabitLogs(logsData);
        setAllTransactions(transactionsData);
        setLoadingData(false);
    }, [loadingAgents, userData, managedAgents, getGoalsForUser, getHabitLogsForManagedUsers, getAllTransactions]);

    useEffect(() => {
        setTimeout(() => fetchData(), 0);
    }, [fetchData]);
    
    const filteredAgents = useMemo(() => {
        if (!filter) return managedAgents;
        return managedAgents.filter(agent => agent.name.toLowerCase().includes(filter.toLowerCase()));
    }, [managedAgents, filter]);

    const handleAssignGoal = (agent: TeamMember) => { setSelectedAgent(agent); setIsAssignGoalModalOpen(true); };
    const handleAssignHomework = (agent: TeamMember) => { setSelectedAgent(agent); setIsAssignHomeworkModalOpen(true); };
    const handleChangeRole = (agent: TeamMember) => { setSelectedAgent(agent); setIsChangeRoleModalOpen(true); };
    
    const handleSaveGoal = async (goalData: any) => { if (selectedAgent) await addGoal(goalData, selectedAgent.id); fetchData(); };
    const handleSaveHomework = async (homeworkData: any) => { if (selectedAgent) await assignHomeworkToUser(selectedAgent.id, homeworkData); };
    const handleSaveRole = async (newRole: TeamMember['role']) => { if (selectedAgent) await updateUserRole(selectedAgent.id, newRole); };
    const handleRemoveAgent = async (agentId: string, agentName: string) => { if (window.confirm(`Are you sure you want to remove ${agentName}?`)) await removeAgentFromTeam(agentId); };
    const handleToggleNewAgent = async (agentId: string, currentStatus: boolean) => { await updateUserNewAgentStatus(agentId, !currentStatus); };
    
    if (loadingAgents || loadingData) {
        return <div className="flex h-full w-full items-center justify-center"><Spinner className="w-8 h-8"/></div>;
    }
    
    const agentsWithGoals = managedAgents.map(agent => ({ agent, goals: agentGoals[agent.id] || [] }));

    return (
        <div className="h-full flex flex-col">
            <header className="p-4 sm:p-6 lg:p-8 flex justify-between items-start flex-wrap gap-4">
                <div>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-text-primary">Coaching Hub</h1>
                    <p className="text-lg text-text-secondary mt-1">Your command center for agent growth and accountability.</p>
                </div>
                <button 
                    onClick={() => navigate('/performance-logs')}
                    className="flex items-center gap-2 bg-primary text-on-accent font-bold py-3 px-6 rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 transition-transform"
                >
                    <PlusCircle size={20}/> Log Performance
                </button>
            </header>
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-8 space-y-6">
                <CoachInsights agentsWithGoals={agentsWithGoals} />
                <TeamPerformanceSummary agents={managedAgents} goals={agentGoals} transactions={allTransactions} />
                <Card>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold">My Agents ({filteredAgents.length})</h2>
                        <div className="relative max-w-xs w-full"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"/><input type="text" placeholder="Filter agents..." value={filter} onChange={e => setFilter(e.target.value)} className="w-full bg-input border border-border rounded-md pl-9 pr-4 py-2"/></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredAgents.map(agent => (
                            <AgentCard 
                                key={agent.id}
                                agent={agent}
                                habitLogs={agentHabitLogs[agent.id] || []}
                                isTeamLeader={P.isTeamLeader(userData)}
                                isMcAdmin={P.isMcAdmin(userData)}
                                onAssignGoal={handleAssignGoal}
                                onAssignHomework={handleAssignHomework}
                                onChangeRole={handleChangeRole}
                                onRemoveAgent={handleRemoveAgent}
                                onToggleNewAgentStatus={handleToggleNewAgent}
                            />
                        ))}
                    </div>
                </Card>
            </div>
            {selectedAgent && (
                <>
                    <GoalModal isOpen={isAssignGoalModalOpen} onClose={() => setIsAssignGoalModalOpen(false)} onSubmit={handleSaveGoal} title={`Assign Goal to ${selectedAgent.name}`} submitButtonText="Assign Goal" />
                    <AssignHomeworkModal isOpen={isAssignHomeworkModalOpen} onClose={() => setIsAssignHomeworkModalOpen(false)} onSubmit={handleSaveHomework} agentName={selectedAgent.name} />
                    <ChangeRoleModal isOpen={isChangeRoleModalOpen} onClose={() => setIsChangeRoleModalOpen(false)} onSave={handleSaveRole} agent={selectedAgent} />
                </>
            )}
        </div>
    );
};

export default CoachHubPage;
