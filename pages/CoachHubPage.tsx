

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAuth, P } from '../contexts/AuthContext';
import { type Goal, type TeamMember, NewAgentHomework, DailyTrackerData, Transaction, ProspectingSession, Playbook, PerformanceLog } from '../types';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import { Plus, GraduationCap, Trash2, ChevronDown, ChevronUp, MoreVertical, Edit, Search, Activity, UserCheck, BookOpen, Archive, MessageSquare, CheckSquare, Star, Target, DollarSign, BarChart2, LayoutDashboard, ClipboardList, ChevronRight, AlertTriangle } from 'lucide-react';
import { GoalModal } from '../components/goals/AddGoalModal';
import { useGoals } from '../contexts/GoalContext';
import { GoalProgressCard } from '../components/dashboard/GoalProgressCard';
import { CoachInsights } from '../components/coach/CoachInsights';
import { TeamPerformanceSummary } from '../components/coach/TeamPerformanceSummary';
import { AssignBulkGoalModal } from '../components/coach/AssignBulkGoalModal';
import { AssignHomeworkModal } from '../components/coach/AssignHomeworkModal';
import { ChangeRoleModal } from '../components/coach/ChangeRoleModal';
import { PerformanceLogSummaryCard } from './AgentDetailPage'; // Re-use from new AgentDetailPage
import { db } from '../firebaseConfig';
import { collection, query, where, getDocs, DocumentSnapshot } from 'firebase/firestore';
import { processGoalDoc, processDailyTrackerDoc, processTransactionDoc } from '../lib/firestoreUtils';
import { Link, useNavigate } from 'react-router-dom';

// --- AGENT CARD COMPONENT ---
const AgentCard: React.FC<{
    agent: TeamMember;
    habitLogs: DailyTrackerData[]; // Only needed for the summary 'logs in last 7 days'
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

    return (
        <Card className="p-4">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
                <button 
                    onClick={handleCardClick}
                    className="flex items-center gap-4 text-left p-2 -m-2 rounded-lg hover:bg-primary/5 flex-grow"
                >
                    <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-on-accent font-bold text-xl flex-shrink-0">
                        {(agent.name || ' ').charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold">{agent.name}</h2>
                        <div className="flex items-center gap-2 text-sm text-text-secondary">
                            <span>View Details</span>
                            <ChevronRight size={16} />
                        </div>
                    </div>
                </button>
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                        <label htmlFor={`new-agent-toggle-${agent.id}`} className="text-sm font-medium text-text-secondary">New Agent Status</label>
                        <button
                            role="switch"
                            aria-checked={!!agent.isNewAgent}
                            onClick={() => onToggleNewAgentStatus(agent.id, !!agent.isNewAgent)}
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${agent.isNewAgent ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}
                        >
                            <span
                                aria-hidden="true"
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${agent.isNewAgent ? 'translate-x-5' : 'translate-x-0'}`}
                            />
                        </button>
                    </div>
                    <div className="relative" ref={menuRef}>
                        <button onClick={() => setIsMenuOpen(p => !p)} className="p-2 rounded-full hover:bg-primary/10"><MoreVertical size={20}/></button>
                        {isMenuOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-surface border border-border rounded-lg shadow-xl z-10">
                                <button onClick={() => { onAssignGoal(agent); setIsMenuOpen(false); }} className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-text-primary hover:bg-primary/10 rounded-t-lg">
                                    <Plus size={14}/> Assign Goal
                                </button>
                                <button onClick={() => { onAssignHomework(agent); setIsMenuOpen(false); }} className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-text-primary hover:bg-primary/10">
                                    <GraduationCap size={14}/> Assign Homework
                                </button>
                                 {(isTeamLeader || isMcAdmin) && (
                                    <button onClick={() => { onChangeRole(agent); setIsMenuOpen(false); }} className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-text-primary hover:bg-primary/10">
                                        <UserCheck size={14}/> Change Role
                                    </button>
                                 )}
                                {isTeamLeader && (
                                    <button onClick={() => { onRemoveAgent(agent.id, agent.name); setIsMenuOpen(false); }} className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-b-lg">
                                        <Trash2 size={14}/> Remove from Team
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
             <div className="flex items-center gap-4 text-sm text-text-secondary mt-3">
                <div className={`flex items-center gap-2 ${logsInLast7Days > 0 ? 'text-success' : 'text-warning'}`}>
                    <Activity size={16}/> 
                    <span>{logsInLast7Days} {logsInLast7Days === 1 ? 'log' : 'logs'} in last 7 days</span>
                </div>
            </div>
        </Card>
    );
};

// --- MAIN PAGE COMPONENT ---
const CoachHubPage: React.FC = () => {
    const { user, userData, managedAgents: initialManagedAgents, loadingAgents, agentsError, updateUserNewAgentStatus, removeAgentFromTeam, assignHomeworkToUser, updateUserRole } = useAuth();
    const { addGoal } = useGoals();
    
    const [managedAgents, setManagedAgents] = useState(initialManagedAgents);
    const [agentData, setAgentData] = useState<Record<string, { goals: Goal[], homework: NewAgentHomework[], habitLogs: DailyTrackerData[], performanceLogs: PerformanceLog[] }>>({});
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [filter, setFilter] = useState('');
    
    const [isBulkGoalModalOpen, setIsBulkGoalModalOpen] = useState(false);
    const [isHomeworkModalOpen, setIsHomeworkModalOpen] = useState(false);
    const [isChangeRoleModalOpen, setIsChangeRoleModalOpen] = useState(false);
    const [targetAgent, setTargetAgent] = useState<TeamMember | null>(null);
    const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
    const [targetAgentForGoal, setTargetAgentForGoal] = useState<TeamMember | null>(null);
    
    useEffect(() => {
        setManagedAgents(initialManagedAgents);
    }, [initialManagedAgents]);

    useEffect(() => {
        const fetchAllDataForAgents = async () => {
            if (loadingAgents || !user || !userData || managedAgents.length === 0) {
                setLoadingData(false);
                return;
            }

            setLoadingData(true);

            // This function now queries data per-agent to comply with Firestore security rules
            // that may use get() calls to verify manager relationships.
            const fetchDataForCollection = async (collectionName: string, processDoc: (doc: DocumentSnapshot) => any, idField: string = 'userId'): Promise<any[]> => {
                const agentIds = managedAgents.map(a => a.id);
                if (agentIds.length === 0) return [];

                const collectionRef = collection(db, collectionName);
                
                // Create a query promise for each agent
                const promises = agentIds.map(agentId => {
                    let q;
                    if (P.isSuperAdmin(userData)) {
                        q = query(collectionRef, where(idField, '==', agentId));
                    } else if (P.isMcAdmin(userData) && userData.marketCenterId) {
                        q = query(collectionRef, where('marketCenterId', '==', userData.marketCenterId), where(idField, '==', agentId));
                    } else if (P.isCoach(userData)) {
                        q = query(collectionRef, where('coachId', '==', user.uid), where(idField, '==', agentId));
                    } else if (P.isTeamLeader(userData) && userData.teamId) {
                        q = query(collectionRef, where('teamId', '==', userData.teamId), where(idField, '==', agentId));
                    }
                    
                    return q ? getDocs(q) : Promise.resolve({ docs: [] });
                });

                const snapshots = await Promise.all(promises);
                return snapshots.flatMap(snapshot => snapshot.docs.map(doc => processDoc(doc)));
            };
            
            try {
                const [goals, homework, habitLogs, transactionsData] = await Promise.all([
                    fetchDataForCollection('goals', processGoalDoc),
                    fetchDataForCollection('homework', d => ({ id: d.id, ...d.data() } as NewAgentHomework)),
                    fetchDataForCollection('dailyTrackers', processDailyTrackerDoc),
                    fetchDataForCollection('transactions', processTransactionDoc),
                ]);

                const newAgentData = managedAgents.reduce((acc, agent) => {
                    acc[agent.id] = {
                        goals: goals.filter(g => g.userId === agent.id).sort((a,b) => (a.isArchived ? 1 : -1)),
                        homework: homework.filter(h => h.userId === agent.id),
                        habitLogs: habitLogs.filter(l => l.userId === agent.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
                        performanceLogs: [], // Not fetching for hub overview
                    };
                    return acc;
                }, {} as typeof agentData);

                setAgentData(newAgentData);
                setTransactions(transactionsData);

            } catch (error) {
                console.error("Error fetching bulk data for Coach Hub:", error);
            } finally {
                setLoadingData(false);
            }
        };

        fetchAllDataForAgents();
    }, [managedAgents, loadingAgents, user, userData]);

    const filteredAgents = useMemo(() => {
        if (!filter) return managedAgents;
        return managedAgents.filter(agent => agent.name.toLowerCase().includes(filter.toLowerCase()));
    }, [managedAgents, filter]);
    
    // --- HANDLER FUNCTIONS ---
    const handleToggleNewAgentStatus = async (agentId: string, currentStatus: boolean) => {
        await updateUserNewAgentStatus(agentId, !currentStatus);
        // AuthContext listener will update managedAgents and trigger re-render
    };

    const handleOpenModalForAdd = (agent: TeamMember) => {
        setTargetAgentForGoal(agent);
        setIsGoalModalOpen(true);
    };

    const handleCloseGoalModal = () => {
        setIsGoalModalOpen(false);
        setTargetAgentForGoal(null);
    };

    const handleSubmitGoal = async (goalData: Omit<Goal, 'id' | 'currentValue' | 'userId' | 'teamId' | 'marketCenterId' | 'createdAt' | 'userName' | 'startDate' | 'endDate'> & { startDate?: string, endDate?: string }) => {
        if (targetAgentForGoal) {
            await addGoal(goalData, targetAgentForGoal.id);
        }
        // No need to call fetchData() immediately as the GoalContext updates will trigger re-render
        handleCloseGoalModal();
    };
    
    const handleAssignBulkGoal = async (goalData: Omit<Goal, 'id'|'currentValue'|'userId'|'teamId'|'createdAt'>) => {
        for (const agent of managedAgents) {
            await addGoal(goalData, agent.id);
        }
        setIsBulkGoalModalOpen(false);
    };

    const handleAssignHomework = async (homeworkData: Omit<NewAgentHomework, 'id'|'userId'|'teamId'|'marketCenterId'|'coachId'>) => {
        if (!targetAgent) return;
        await assignHomeworkToUser(targetAgent.id, homeworkData);
        setIsHomeworkModalOpen(false);
        setTargetAgent(null);
    };
    
    const handleChangeRole = async (newRole: TeamMember['role']) => {
        if (!targetAgent) return;
        // The updateUserRole function is now part of AuthContext and updates roles globally
        // This will trigger a re-fetch in AuthContext for managed agents
        // and consequently re-render this page with updated roles.
        await updateUserRole(targetAgent.id, newRole);
        setIsChangeRoleModalOpen(false);
        setTargetAgent(null);
    }
    
    const handleRemoveAgent = async (agentId: string, agentName: string) => {
        if (window.confirm(`Are you sure you want to remove ${agentName} from your team?`)) {
            const originalAgents = managedAgents;
            // Optimistic UI update for a more responsive feel
            setManagedAgents(prev => prev.filter(agent => agent.id !== agentId));
            
            const result = await removeAgentFromTeam(agentId);
            if (!result.success) {
                alert(result.message);
                // Revert UI on failure
                setManagedAgents(originalAgents);
            }
        }
    };
    
    const isTeamLeader = userData?.role === 'team_leader';
    const isMcAdmin = userData?.role === 'market_center_admin';
    const hubTitle = isTeamLeader ? "Team Hub" : (userData?.marketCenterId ? "Market Center Hub" : "Coaching Hub");
    
    const agentsWithGoals = useMemo(() => {
        return managedAgents.map(agent => ({
            agent,
            goals: agentData[agent.id]?.goals || []
        }));
    }, [managedAgents, agentData]);

    // --- RENDER LOGIC ---
    if (loadingAgents || loadingData) {
        return <div className="flex h-full w-full items-center justify-center"><Spinner className="w-10 h-10"/></div>;
    }
    
    return (
        <div className="h-full flex flex-col">
            <header className="p-4 sm:p-6 lg:p-8">
                 <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-text-primary">{hubTitle}</h1>
                 <p className="text-lg text-text-secondary mt-1">Oversee your agents' goals, activities, and performance.</p>
            </header>
            
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-8 space-y-6">
                {agentsError && (
                    <Card className="bg-destructive-surface text-destructive border-destructive">
                        <div className="flex flex-col items-center justify-center p-4">
                            <AlertTriangle className="w-12 h-12 mb-4" />
                            <p className="font-bold text-lg">Error Loading Agents</p>
                            <p className="mt-2 max-w-md">{agentsError} Please contact an administrator if the issue persists.</p>
                        </div>
                    </Card>
                )}
                 {managedAgents.length > 0 && !agentsError && (
                    <>
                        <TeamPerformanceSummary agents={managedAgents} goals={Object.fromEntries(Object.entries(agentData).map(([key, val]) => [key, (val as { goals: Goal[] }).goals]))} transactions={transactions} title={`${hubTitle} Summary`} />
                        <CoachInsights agentsWithGoals={agentsWithGoals} />
                    </>
                 )}

                {!agentsError && <Card>
                    <div className="flex flex-wrap gap-4 justify-between items-center mb-4">
                        <div className="relative">
                           <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"/>
                           <input type="text" placeholder="Filter agents by name..." value={filter} onChange={e => setFilter(e.target.value)} className="w-full max-w-sm bg-input border border-border rounded-md pl-10 pr-4 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"/>
                        </div>
                         <div className="flex items-center gap-2">
                             <button
                                onClick={() => {}} // This button is removed. Show archived status can be done on the individual agent page.
                                className="hidden"
                            >
                                <Archive size={16}/> View Archived
                            </button>
                            <button onClick={() => setIsBulkGoalModalOpen(true)} className="flex items-center gap-2 bg-primary text-on-accent font-semibold py-2 px-3 rounded-lg text-sm">
                               <Plus size={16}/> Assign Goal to All Agents
                            </button>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {filteredAgents.length > 0 ? (
                            filteredAgents.map(agent => (
                                <AgentCard 
                                    key={agent.id} 
                                    agent={agent} 
                                    habitLogs={agentData[agent.id]?.habitLogs || []}
                                    isTeamLeader={isTeamLeader}
                                    isMcAdmin={isMcAdmin}
                                    onToggleNewAgentStatus={handleToggleNewAgentStatus}
                                    onAssignGoal={handleOpenModalForAdd}
                                    onAssignHomework={(agent) => { setTargetAgent(agent); setIsHomeworkModalOpen(true); }}
                                    onRemoveAgent={handleRemoveAgent}
                                    onChangeRole={(agent) => { setTargetAgent(agent); setIsChangeRoleModalOpen(true); }}
                                />
                            ))
                        ) : (
                            <p className="text-center text-text-secondary py-8">
                                {managedAgents.length === 0 ? "No agents have been assigned to your program yet." : "No agents match the current filter."}
                            </p>
                        )}
                    </div>
                </Card>}
            </div>
            
            <AssignBulkGoalModal isOpen={isBulkGoalModalOpen} onClose={() => setIsBulkGoalModalOpen(false)} onSubmit={handleAssignBulkGoal} />
            
            <GoalModal 
                isOpen={isGoalModalOpen}
                onClose={handleCloseGoalModal}
                onSubmit={handleSubmitGoal}
                title={`Assign Goal to ${targetAgentForGoal?.name}`}
                submitButtonText={"Assign Goal"}
                goalToEdit={null} // Always null for new assignment
            />

            {targetAgent && (
                <>
                     <AssignHomeworkModal
                        isOpen={isHomeworkModalOpen}
                        onClose={() => { setIsHomeworkModalOpen(false); setTargetAgent(null); }}
                        onSubmit={handleAssignHomework}
                        agentName={targetAgent.name}
                    />
                    <ChangeRoleModal 
                        isOpen={isChangeRoleModalOpen}
                        onClose={() => { setIsChangeRoleModalOpen(false); setTargetAgent(null); }}
                        onSave={handleChangeRole}
                        agent={targetAgent}
                    />
                </>
            )}
        </div>
    );
};

export default CoachHubPage;