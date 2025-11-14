

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth, P } from '../contexts/AuthContext';
import { useGoals } from '../contexts/GoalContext';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import { GoalModal } from '../components/goals/AddGoalModal';
import { GoalProgressCard } from '../components/dashboard/GoalProgressCard';
import { AssignHomeworkModal } from '../components/coach/AssignHomeworkModal';
import { ChangeRoleModal } from '../components/coach/ChangeRoleModal';
import type { Goal, TeamMember, NewAgentHomework, DailyTrackerData, Playbook, PerformanceLog, DiscoveryGuideData, OrgBlueprint, Transaction, HabitTrackerTemplate, HabitActivitySetting } from '../types';
import { EconomicModelData } from './BusinessGpsPage';
import { LayoutDashboard, Target, BookOpen, ClipboardList, UserCheck, MessageSquare, CheckSquare, Star, ArrowLeft, Plus, GraduationCap, Trash2, Compass, Network, BarChart, Users, Hash, ArrowDown, AlertTriangle, DollarSign, BarChart2, ClipboardSignature, FileCheck, Search, Home, Briefcase, ShieldCheck, PhoneCall, MapPin, Settings2, Globe, ChevronDown } from 'lucide-react';
import { getFirestoreInstance } from '../firebaseConfig';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';

// --- SUB-COMPONENTS ---

// Re-usable Performance Log Summary Card
export const PerformanceLogSummaryCard: React.FC<{ log: PerformanceLog }> = ({ log }) => {
    const typeInfo = {
        coaching_session: { icon: MessageSquare, label: 'Coaching Session' },
        attendance: { icon: CheckSquare, label: 'Attendance' },
        performance_review: { icon: Star, label: 'Performance Review' },
        goal_review: { icon: Target, label: 'Goal Review' },
    }[log.type];

    return (
        <div className="p-3 bg-surface rounded-md border border-border">
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                    <typeInfo.icon size={16} className="text-primary"/>
                    <p className="font-semibold text-sm">{typeInfo.label}</p>
                </div>
                <p className="text-xs text-text-secondary">{new Date(log.date).toLocaleDateString()}</p>
            </div>
            <p className="text-xs text-text-secondary mt-1 truncate" title={log.notes}>{log.notes || 'No notes for this log.'}</p>
        </div>
    );
};

const PlaybookProgressSummary: React.FC<{
    agent: TeamMember;
    playbooks: Playbook[];
    homework: NewAgentHomework[];
    onDeleteHomework: (homeworkId: string, userId: string) => void;
}> = ({ agent, playbooks, homework, onDeleteHomework }) => {
    const progressData = agent.playbookProgress || {};
    const homeworkByWeek = useMemo(() => homework.reduce((acc, hw) => {
        const weekTitle = `Week ${hw.week}`;
        if (!acc[weekTitle]) acc[weekTitle] = [];
        acc[weekTitle].push(hw);
        return acc;
    }, {} as Record<string, NewAgentHomework[]>), [homework]);


    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <h3 className="font-bold text-lg mb-2 flex items-center gap-2"><BookOpen size={18}/> Playbook Progress</h3>
                {playbooks.length === 0 ? (
                    <p className="text-sm text-text-secondary">No playbooks available to track.</p>
                ) : (
                    <div className="space-y-3">
                        {playbooks.map(playbook => {
                            const totalLessons = playbook.modules.reduce((acc, mod) => acc + (mod.lessons?.length || 0), 0);
                            const completedLessons = progressData[playbook.id]?.length || 0;
                            const percentage = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

                            return (
                                <div key={playbook.id}>
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="font-semibold text-sm">{playbook.title}</span>
                                        <span className="text-xs text-text-secondary">{completedLessons}/{totalLessons}</span>
                                    </div>
                                    <div className="w-full bg-surface rounded-full h-2">
                                        <div className="bg-primary h-2 rounded-full" style={{ width: `${percentage}%` }}></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
            <div>
                <h4 className="font-bold text-lg mb-2">Assigned Homework</h4>
                {homework.length > 0 ? (
                   <div className="space-y-4">
                        {Object.entries(homeworkByWeek).map(([week, hws]) => (
                            <div key={week}>
                                <h5 className="font-semibold text-sm">{week}</h5>
                                <div className="pl-4 border-l-2 border-border mt-1 space-y-2">
                                    {(hws as NewAgentHomework[]).map(hw => (
                                        <div key={hw.id} className="text-sm">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-medium text-text-primary">{hw.title}</p>
                                                    {hw.url && <a href={hw.url} target="_blank" rel="noopener noreferrer" className="text-accent text-xs hover:underline">View &rarr;</a>}
                                                </div>
                                                <button onClick={() => onDeleteHomework(hw.id, agent.id)} className="p-1 text-destructive hover:bg-destructive/10 rounded-full flex-shrink-0"><Trash2 size={14}/></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : <p className="text-sm text-text-secondary">No homework assigned.</p>}
            </div>
        </div>
    );
};

// --- GPS TAB COMPONENTS ---
const GpsDisplay: React.FC<{ data: DiscoveryGuideData }> = ({ data }) => (
    <div className="space-y-6">
        <div>
            <h3 className="text-xl font-semibold text-primary mb-2">Goal (The Destination)</h3>
            <p><strong>Focus Area:</strong> {data?.gpsGoal?.focusArea || 'Not set'}</p>
            <p><strong>Target Goal:</strong> {data?.gpsGoal?.targetGoal || 'Not set'}</p>
        </div>
        <div>
            <h3 className="text-xl font-semibold text-primary mb-2">Priorities (The Top 3 Stops)</h3>
            {data?.gpsPriorities?.map((p) => (
                <div key={p.id} className="mb-2 pl-4 border-l-2 border-primary/30">
                    <p><strong>{p.id}:</strong> {p.what || 'Not set'}</p>
                    <p className="text-sm text-text-secondary"><strong>Measured by:</strong> {p.how || 'Not set'}</p>
                </div>
            ))}
        </div>
         <div>
            <h3 className="text-xl font-semibold text-primary mb-2">Strategies (The Directions)</h3>
            {data?.gpsStrategies?.map((s) => (
                <div key={s.id} className="mb-3">
                    <strong className="text-text-secondary">{s.priority} Strategies</strong>
                    <ul className="list-disc list-inside ml-4 text-text-secondary">
                       <li>{s.strategy1 || 'Not set'}</li>
                       <li>{s.strategy2 || 'Not set'}</li>
                       <li>{s.strategy3 || 'Not set'}</li>
                    </ul>
                </div>
            ))}
        </div>
    </div>
);

const ReadOnlyStat: React.FC<{ label: string; value: string; className?: string }> = ({ label, value, className }) => (
    <div className={className}>
        <p className="text-xs text-text-secondary">{label}</p>
        <p className="font-bold text-text-primary text-md">{value}</p>
    </div>
);

const ReadOnlyEconomicModel: React.FC<{ data: EconomicModelData; calculations: any; }> = ({ data, calculations }) => {
    return (
        <Card>
            <h3 className="text-2xl font-bold mb-4 text-primary">Economic Model Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                <div className="space-y-4">
                    <h4 className="font-bold border-b border-border pb-1 mb-2">Financial Inputs</h4>
                    <ReadOnlyStat label="Annual Net Income Goal" value={`$${data.netIncome.toLocaleString()}`} />
                    <ReadOnlyStat label="Operating Expenses" value={`$${data.operatingExpenses.toLocaleString()}`} />
                    <ReadOnlyStat label="Cost of Sale" value={`$${data.costOfSale.toLocaleString()}`} />
                </div>
                <div className="space-y-4">
                     <h4 className="font-bold border-b border-border pb-1 mb-2">Business Assumptions</h4>
                     <ReadOnlyStat label="Average Commission" value={`$${data.avgCommission.toLocaleString()}`} />
                     <ReadOnlyStat label="Business Mix" value={`${data.sellerUnitPercentage}% Listings / ${calculations.buyerUnitPercentage}% Buyers`} />
                     <h4 className="font-bold border-b border-border pb-1 mb-2 mt-4">Conversion Rates</h4>
                     <ReadOnlyStat label="Seller Appointment Met Rate" value={`${data.sellerAppointmentConversionRate}%`} />
                     <ReadOnlyStat label="Seller Sold Rate" value={`${data.sellerSoldConversionRate}%`} />
                     <ReadOnlyStat label="Buyer Appointment Met Rate" value={`${data.buyerAppointmentConversionRate}%`} />
                     <ReadOnlyStat label="Buyer Sold Rate" value={`${data.buyerSoldConversionRate}%`} />
                </div>
                <div className="bg-accent-secondary/10 p-4 rounded-lg flex flex-col items-center justify-center text-center">
                    <BarChart size={24} className="text-accent-secondary mb-2"/>
                    <h4 className="text-lg font-bold">Annual Appointment Goal</h4>
                    <p className="text-5xl font-black text-accent-secondary my-2">{Math.ceil(calculations.totalAppointmentsNeeded)}</p>
                    <p className="text-sm"><strong>{calculations.appointmentsPerWeek.toFixed(2)}</strong> per week / <strong>{calculations.appointmentsPerDay.toFixed(2)}</strong> per day</p>
                </div>
            </div>
        </Card>
    );
};

// --- ARCHITECT TAB COMPONENTS ---
const ROLE_CATEGORIES = {
  Administrative: [
    { name: 'Administrative Assistant', icon: ClipboardSignature },
    { name: 'Transaction Coordinator', icon: FileCheck },
    { name: 'Executive Assistant', icon: ShieldCheck },
  ],
  Sales: [
    { name: 'Buyer\'s Agent', icon: Search },
    { name: 'Listing Specialist', icon: Home },
    { name: 'Inside Sales Agent (ISA)', icon: PhoneCall },
    { name: 'Outside Sales Agent (OSA)', icon: MapPin },
  ],
  Leadership: [
    { name: 'Director of Operations', icon: Settings2 },
    { name: 'Expansion Director', icon: Globe },
    { name: 'CEO / General Manager', icon: Briefcase },
  ]
};
const ALL_ROLES = Object.values(ROLE_CATEGORIES).flat();

const ArchitectDisplay: React.FC<{ blueprint: OrgBlueprint | null; agent: TeamMember; kpis: { gci: number, transactions: number } }> = ({ blueprint, agent, kpis }) => (
    <div className="text-center">
        <div className="inline-block relative">
            <Card className="p-4 w-72 border-2 border-primary shadow-lg">
                <p className="text-xs font-semibold text-primary">AGENT</p>
                <h3 className="text-xl font-bold">{agent.name}</h3>
                <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 gap-2 text-left">
                    <div className="flex items-center gap-2"><DollarSign size={16} className="text-accent-secondary"/><div><p className="text-xs">GCI</p><p className="font-bold">${kpis.gci.toLocaleString()}</p></div></div>
                    <div className="flex items-center gap-2"><BarChart2 size={16} className="text-accent-secondary"/><div><p className="text-xs">Transactions</p><p className="font-bold">{kpis.transactions.toLocaleString()}</p></div></div>
                </div>
            </Card>
            {blueprint && blueprint.nodes.length > 0 && <div className="absolute bottom-[-20px] left-1/2 -translate-x-1/2 w-0.5 h-5 bg-border"></div>}
        </div>
        
        <div className="mt-10 relative pt-5 min-h-[200px]">
            {blueprint && blueprint.nodes.length > 0 && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-5 bg-border"></div>}
            <div className="flex justify-center flex-wrap gap-4 px-4">
                {blueprint && blueprint.nodes.length > 0 && <div className="absolute top-0 left-1/2 h-0.5 bg-border" style={{ width: `calc(100% - ${(100/blueprint.nodes.length)}%)`, transform: 'translateX(-50%)' }}></div>}
                {blueprint?.nodes.map(node => {
                    const roleInfo = ALL_ROLES.find(r => r.name === node.role);
                    const Icon = roleInfo?.icon || Network;
                    return (
                        <div key={node.id} className="relative pt-5">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-5 bg-border"></div>
                            <Card className={`w-56 p-3 ${node.status === 'active' ? 'border-success' : 'opacity-70 border-dashed'}`}>
                                <div className="flex items-center gap-2">
                                    <Icon size={18} className={node.status === 'active' ? 'text-success' : 'text-text-secondary'} />
                                    <p className={`text-sm font-bold ${node.status === 'active' ? 'text-text-primary' : 'text-text-secondary'}`}>{node.role}</p>
                                </div>
                                <div className="mt-2 pt-2 border-t text-xs font-semibold">{node.status === 'active' ? 'Hired' : 'Planned'}</div>
                            </Card>
                        </div>
                    )
                })}
                {(!blueprint || blueprint.nodes.length === 0) && <div className="text-text-secondary py-16"><p>This agent has not built their blueprint yet.</p></div>}
            </div>
        </div>
    </div>
);

// --- ACTIVITY LOGS TAB COMPONENTS ---
const defaultHabitActivities: HabitActivitySetting[] = [ { id: 'calls', name: 'Calls Made', worth: 1, unit: 'call' }, { id: 'doorsKnocked', name: 'Doors Knocked', worth: 1, unit: 'knock' }, { id: 'knocksAnswered', name: 'Knocks Answered', worth: 2, unit: 'answer' }, { id: 'contacts', name: 'Meaningful Contacts', worth: 2, unit: 'contact' }, { id: 'listingAptsSet', name: 'Listing Appointments Set', worth: 10, unit: 'appt' }, { id: 'buyerAptsSet', name: 'Buyer Appointments Set', worth: 5, unit: 'appt' }, { id: 'lenderAptsSet', name: 'Lender Appointments Set', worth: 3, unit: 'appt' }, { id: 'agreements', name: 'Agreements Signed', worth: 20, unit: 'agreement' }, { id: 'notes', name: 'Handwritten Notes', worth: 2, unit: 'note' }, { id: 'closings', name: 'Closings', worth: 50, unit: 'closing' }, { id: 'open_house_hours', name: 'Open House Hours', worth: 10, unit: 'hour' }, { id: 'social_posts', name: 'Social Media Posts', worth: 2, unit: 'post' }, { id: 'video_content', name: 'Video Content Created', worth: 5, unit: 'video' }, { id: 'new_leads', name: 'New Leads Added', worth: 1, unit: 'lead' }, ];

const getMetricValue = (log: DailyTrackerData, activityId: string): number => {
    switch(activityId) {
        case 'calls': return log.dials || 0;
        case 'doorsKnocked': return log.doorsKnocked || 0;
        case 'knocksAnswered': return log.knocksAnswered || 0;
        case 'contacts': return log.prospectingTotals?.contacts || 0;
        case 'listingAptsSet': return log.prospectingTotals?.listingAptsSet || 0;
        case 'buyerAptsSet': return log.prospectingTotals?.buyerAptsSet || 0;
        case 'lenderAptsSet': return log.prospectingTotals?.lenderAptsSet || 0;
        default: return log.pointsActivities?.[activityId] || 0;
    }
};

const calculateTotalPoints = (data: DailyTrackerData | null, settings: HabitTrackerTemplate | null): number => {
    if (!data || !settings?.activities) return 0;
    return settings.activities.reduce((total, activity) => {
        const count = getMetricValue(data, activity.id);
        return total + (count * activity.worth);
    }, 0);
};

const LogDetailView: React.FC<{ log: DailyTrackerData, settings: HabitTrackerTemplate }> = ({ log, settings }) => {
    const totalPoints = calculateTotalPoints(log, settings);
    const aptsSet = getMetricValue(log, 'listingAptsSet') + getMetricValue(log, 'buyerAptsSet') + getMetricValue(log, 'lenderAptsSet');
    const contacts = getMetricValue(log, 'contacts');

    return (
        <div className="p-4 bg-background/50 border-t border-border">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center mb-4">
                <div className="bg-surface p-2 rounded-lg"><p className="text-xs text-text-secondary">Points</p><p className="font-bold text-lg text-primary">{totalPoints}</p></div>
                <div className="bg-surface p-2 rounded-lg"><p className="text-xs text-text-secondary">Dials</p><p className="font-bold text-lg">{log.dials}</p></div>
                <div className="bg-surface p-2 rounded-lg"><p className="text-xs text-text-secondary">Apts Set</p><p className="font-bold text-lg">{aptsSet}</p></div>
                <div className="bg-surface p-2 rounded-lg"><p className="text-xs text-text-secondary">Contacts</p><p className="font-bold text-lg">{contacts}</p></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div>
                    <h4 className="font-bold text-text-primary mb-2">Metrics</h4>
                    <ul className="list-disc list-inside text-text-secondary space-y-1">
                        {(settings.activities || []).map(act => {
                             const value = getMetricValue(log, act.id);
                            return value > 0 ? <li key={act.id}><strong>{act.name}:</strong> {value}</li> : null;
                        })}
                    </ul>
                </div>
                <div>
                    <h4 className="font-bold text-text-primary mb-2">Notes</h4>
                    <p className="text-text-secondary whitespace-pre-wrap bg-surface p-2 rounded-md">{log.notes || 'N/A'}</p>
                </div>
            </div>
        </div>
    );
};

// --- AGENT DETAIL PAGE COMPONENT ---
const AgentDetailPage: React.FC = () => {
    const { agentId } = useParams<{ agentId: string }>();
    const navigate = useNavigate();
    const { 
        user, userData, getUserById, getAssignedResourcesForUser, getHabitLogsForUser, 
        getPerformanceLogsForAgent, getPlaybooksForUser, updateUserNewAgentStatus, assignHomeworkToUser, 
        deleteHomeworkForUser, updateUserRole, removeAgentFromTeam, getOrgBlueprintForUser, getTransactionsForUser
    } = useAuth();
    const { addGoal, updateGoal, deleteGoal, toggleGoalArchiveStatus, getGoalsForUser } = useGoals();

    const [agent, setAgent] = useState<TeamMember | null>(null);
    const [goals, setGoals] = useState<Goal[]>([]);
    const [homework, setHomework] = useState<NewAgentHomework[]>([]);
    const [habitLogs, setHabitLogs] = useState<DailyTrackerData[]>([]);
    const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
    const [performanceLogs, setPerformanceLogs] = useState<PerformanceLog[]>([]);
    const [gpsData, setGpsData] = useState<DiscoveryGuideData | null>(null);
    const [economicModelData, setEconomicModelData] = useState<EconomicModelData | null>(null);
    const [blueprint, setBlueprint] = useState<OrgBlueprint | null>(null);
    const [agentTransactions, setAgentTransactions] = useState<Transaction[]>([]);
    const [habitSettings, setHabitSettings] = useState<HabitTrackerTemplate | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const [activeTab, setActiveTab] = useState('overview');
    const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
    const [goalToEdit, setGoalToEdit] = useState<Goal | null>(null);
    const [isHomeworkModalOpen, setIsHomeworkModalOpen] = useState(false);
    const [isChangeRoleModalOpen, setIsChangeRoleModalOpen] = useState(false);
    const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

    const canManageAgent = P.isTeamLeader(userData);

    const fetchData = useCallback(async () => {
        if (!agentId || !user) {
            setError("Agent ID is missing or user not authenticated.");
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const fetchedAgent = await getUserById(agentId);
            if (!fetchedAgent) {
                setError("Agent not found or you do not have permission to view this agent.");
                setLoading(false);
                return;
            }
            setAgent(fetchedAgent);

            const [
                fetchedGoals, assignedResources, fetchedHabitLogs, fetchedPlaybooks, 
                fetchedPerformanceLogs, fetchedBlueprint, fetchedTransactions, gpsDocSnap
            ] = await Promise.all([
                getGoalsForUser(agentId), getAssignedResourcesForUser(agentId), getHabitLogsForUser(agentId),
                getPlaybooksForUser(agentId), getPerformanceLogsForAgent(agentId), getOrgBlueprintForUser(agentId),
                getTransactionsForUser(agentId), getDoc(doc(getFirestoreInstance(), 'businessGps', agentId))
            ]);

            setGoals(fetchedGoals.sort((a,b) => (a.isArchived ? 1 : -1)));
            setHomework(assignedResources.homework);
            setHabitLogs(fetchedHabitLogs);
            setPlaybooks(fetchedPlaybooks);
            setPerformanceLogs(fetchedPerformanceLogs);
            setBlueprint(fetchedBlueprint);
            setAgentTransactions(fetchedTransactions);
            
            if (gpsDocSnap.exists()) {
                const fetchedGps = gpsDocSnap.data();
                setGpsData(fetchedGps.gpsData || null);
                setEconomicModelData(fetchedGps.economicModelData || null);
            }
            
            const settingsRef = collection(getFirestoreInstance(), 'habitTrackerTemplates');
            let settingsDoc = null;
            const roleQuery = query(settingsRef, where('isDefaultForRole', '==', fetchedAgent.role));
            const roleSnap = await getDocs(roleQuery);
            if (!roleSnap.empty) settingsDoc = roleSnap.docs[0];
            
            if (!settingsDoc) {
                const agentQuery = query(settingsRef, where('isDefaultForRole', '==', 'agent'));
                const agentSnap = await getDocs(agentQuery);
                if (!agentSnap.empty) settingsDoc = agentSnap.docs[0];
            }

            if (settingsDoc?.exists()) {
                setHabitSettings({id: settingsDoc.id, ...settingsDoc.data() } as HabitTrackerTemplate);
            } else {
                setHabitSettings({ id: 'fallback', name: 'Default Agent', activities: defaultHabitActivities });
            }

        } catch (err: any) {
            console.error("Error fetching agent data:", err);
            setError("Failed to load agent details. " + (err.message || "An unexpected error occurred."));
        } finally {
            setLoading(false);
        }
    }, [agentId, user, getUserById, getGoalsForUser, getAssignedResourcesForUser, getHabitLogsForUser, getPlaybooksForUser, getPerformanceLogsForAgent, getOrgBlueprintForUser, getTransactionsForUser]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const economicCalculations = useMemo(() => {
        if (!economicModelData) return null;
        const { netIncome, operatingExpenses, costOfSale, avgCommission, sellerUnitPercentage, sellerSoldConversionRate, sellerAppointmentConversionRate, buyerSoldConversionRate, buyerAppointmentConversionRate } = economicModelData;
        const totalGCI = netIncome + operatingExpenses + costOfSale;
        const totalUnitsSold = avgCommission > 0 ? totalGCI / avgCommission : 0;
        const buyerUnitPercentage = 100 - sellerUnitPercentage;
        const sellerUnitsSold = totalUnitsSold * (sellerUnitPercentage / 100);
        const sellerAppointmentsFromSold = (sellerSoldConversionRate > 0) ? sellerUnitsSold / (sellerSoldConversionRate / 100) : 0;
        const sellerAppointmentsNeeded = (sellerAppointmentConversionRate > 0) ? sellerAppointmentsFromSold / (sellerAppointmentConversionRate / 100) : 0;
        const buyerUnitsSold = totalUnitsSold * (buyerUnitPercentage / 100);
        const buyerAppointmentsFromSold = (buyerSoldConversionRate > 0) ? buyerUnitsSold / (buyerSoldConversionRate / 100) : 0;
        const buyerAppointmentsNeeded = (buyerAppointmentConversionRate > 0) ? buyerAppointmentsFromSold / (buyerAppointmentConversionRate / 100) : 0;
        const totalAppointmentsNeeded = sellerAppointmentsNeeded + buyerAppointmentsNeeded;
        const appointmentsPerWeek = totalAppointmentsNeeded > 0 ? totalAppointmentsNeeded / 50 : 0;
        const appointmentsPerDay = appointmentsPerWeek > 0 ? appointmentsPerWeek / 5 : 0;

        return { totalGCI, totalUnitsSold, buyerUnitPercentage, sellerUnitsSold, sellerAppointmentsNeeded, sellerAppointmentsFromSold, buyerUnitsSold, buyerAppointmentsNeeded, buyerAppointmentsFromSold, totalAppointmentsNeeded, appointmentsPerWeek, appointmentsPerDay };
    }, [economicModelData]);


    const handleToggleNewAgentStatus = async () => { if (!agent) return; await updateUserNewAgentStatus(agent.id, !agent.isNewAgent); setAgent(prev => prev ? { ...prev, isNewAgent: !prev.isNewAgent } : null); };
    const handleOpenGoalModalForAdd = () => { setGoalToEdit(null); setIsGoalModalOpen(true); };
    const handleOpenGoalModalForEdit = (goal: Goal) => { setGoalToEdit(goal); setIsGoalModalOpen(true); };
    const handleCloseGoalModal = () => { setIsGoalModalOpen(false); setGoalToEdit(null); };
    const handleSubmitGoal = async (goalData: Omit<Goal, 'id' | 'currentValue' | 'userId' | 'teamId' | 'marketCenterId' | 'createdAt' | 'userName' | 'startDate' | 'endDate'> & { startDate?: string, endDate?: string }) => { if (!agent) return; if (goalToEdit) { await updateGoal(goalToEdit.id, goalData); } else { await addGoal(goalData, agent.id); } fetchData(); handleCloseGoalModal(); };
    const handleDeleteGoal = async (goalId: string) => { if (window.confirm("Are you sure you want to delete this goal?")) { await deleteGoal(goalId); fetchData(); } };
    const handleToggleArchiveGoal = async (goalId: string, currentStatus: boolean) => { await toggleGoalArchiveStatus(goalId, currentStatus); fetchData(); };
    const handleAssignHomework = async (homeworkData: Omit<NewAgentHomework, 'id' | 'userId' | 'teamId' | 'marketCenterId'>) => { if (!agent) return; await assignHomeworkToUser(agent.id, homeworkData); fetchData(); setIsHomeworkModalOpen(false); };
    const handleDeleteHomework = async (homeworkId: string, userId: string) => { if (window.confirm("Are you sure?")) { await deleteHomeworkForUser(homeworkId); fetchData(); } };
    const handleChangeRole = async (newRole: TeamMember['role']) => { if (!agent) return; await updateUserRole(agent.id, newRole); fetchData(); setIsChangeRoleModalOpen(false); };
    const handleRemoveAgent = async () => { if (!agent) return; if (window.confirm(`Are you sure you want to remove ${agent.name} from your program/team?`)) { await removeAgentFromTeam(agent.id); navigate('/team-hub'); } };

    const TabButton: React.FC<{ tabId: string; label: string; icon: React.ElementType; }> = ({ tabId, label, icon: Icon }) => (
        <button onClick={() => setActiveTab(tabId)} className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === tabId ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:border-border hover:text-text-primary'}`}>{<Icon size={16} />} {label}</button>
    );

    if (loading) return <div className="flex h-full w-full items-center justify-center"><Spinner className="w-10 h-10"/></div>;
    if (error || !agent) return <Card className="m-8 text-center py-12 bg-destructive-surface border-destructive text-destructive"><h2 className="text-2xl font-bold">Error</h2><p className="mt-2">{error || "Agent not found."}</p></Card>;

    return (
        <div className="h-full flex flex-col">
            <header className="p-4 sm:p-6 lg:p-8">
                <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline mb-4"><ArrowLeft size={16}/> Back to Hub</button>
                <div className="flex justify-between items-center flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-on-accent font-bold text-3xl flex-shrink-0">{agent.name.charAt(0).toUpperCase()}</div>
                        <div>
                            <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-text-primary">{agent.name}</h1>
                            <p className="text-lg text-text-secondary -mt-1">{agent.role?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} | {agent.email}</p>
                        </div>
                    </div>
                    {canManageAgent && (
                        <div className="flex items-center gap-4 flex-wrap">
                            <div className="flex items-center gap-2"><label htmlFor="new-agent-toggle" className="text-sm font-medium text-text-secondary">New Agent Status</label><button role="switch" aria-checked={!!agent.isNewAgent} onClick={handleToggleNewAgentStatus} className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${agent.isNewAgent ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}><span aria-hidden="true" className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${agent.isNewAgent ? 'translate-x-5' : 'translate-x-0'}`}/></button></div>
                            <button onClick={handleOpenGoalModalForAdd} className="flex items-center gap-2 bg-primary/10 text-primary font-semibold py-2 px-3 rounded-lg text-sm"><Plus size={16}/> Assign Goal</button>
                            <button onClick={() => setIsHomeworkModalOpen(true)} className="flex items-center gap-2 bg-primary/10 text-primary font-semibold py-2 px-3 rounded-lg text-sm"><GraduationCap size={16}/> Assign Homework</button>
                        </div>
                    )}
                </div>
            </header>

            <div className="px-4 sm:px-6 lg:px-8"><div className="flex items-center border-b border-border -mx-4 px-4 overflow-x-auto"><TabButton tabId="overview" label="Overview" icon={LayoutDashboard} /><TabButton tabId="goals" label="Goals" icon={Target} /><TabButton tabId="gps" label="GPS" icon={Compass} /><TabButton tabId="architect" label="Architect" icon={Network} /><TabButton tabId="learning" label="Learning" icon={BookOpen} /><TabButton tabId="activity" label="Activity Logs" icon={ClipboardList} /><TabButton tabId="performance" label="Performance" icon={UserCheck} /></div></div>

            <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                {activeTab === 'overview' && <Card><h2 className="text-2xl font-bold mb-4">Agent Overview</h2><div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"><KpiDisplay label="GCI" value={`$${(agent.gci || 0).toLocaleString()}`} /><KpiDisplay label="Listings" value={agent.listings || 0} /><KpiDisplay label="Calls" value={agent.calls || 0} /><KpiDisplay label="Appointments" value={agent.appointments || 0} /></div><div><h3 className="font-bold text-lg mb-2">Recent Performance Logs</h3>{performanceLogs.length > 0 ? <div className="space-y-3">{performanceLogs.slice(0, 3).map(log => <PerformanceLogSummaryCard key={log.id} log={log} />)}</div> : <p className="text-sm text-text-secondary">No performance logs found.</p>}</div></Card>}
                {activeTab === 'goals' && <Card><h2 className="text-2xl font-bold mb-4">Goals</h2>{goals.length > 0 ? <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{goals.map(goal => <GoalProgressCard key={goal.id} goal={goal} onEdit={() => handleOpenGoalModalForEdit(goal)} onDelete={() => handleDeleteGoal(goal.id)} onArchive={() => handleToggleArchiveGoal(goal.id, !!goal.isArchived)}/>)}</div> : <p className="text-sm text-text-secondary">No goals set for this agent.</p>}</Card>}
                {activeTab === 'gps' && <Card><h2 className="text-2xl font-bold mb-4">Strategic GPS</h2>{gpsData ? <GpsDisplay data={gpsData} /> : <p className="text-text-secondary text-center py-8">This agent has not completed their Strategic GPS yet.</p>}{economicModelData && economicCalculations ? <><h2 className="text-2xl font-bold my-4 pt-4 border-t">Economic Model</h2><ReadOnlyEconomicModel data={economicModelData} calculations={economicCalculations} /></> : <p className="text-text-secondary text-center py-8 mt-4 border-t">Economic Model data not available.</p>}</Card>}
                {activeTab === 'architect' && <Card><h2 className="text-2xl font-bold mb-4">Growth Architect</h2><ArchitectDisplay blueprint={blueprint} agent={agent} kpis={{ gci: agent.gci || 0, transactions: agentTransactions.length }} /></Card>}
                {activeTab === 'learning' && <Card><h2 className="text-2xl font-bold mb-4">Learning & Development</h2><PlaybookProgressSummary agent={agent} playbooks={playbooks} homework={homework} onDeleteHomework={handleDeleteHomework} /></Card>}
                {activeTab === 'activity' && <Card><h2 className="text-2xl font-bold mb-4">Habit Logs</h2>{habitLogs.length > 0 && habitSettings ? <div className="space-y-2">{habitLogs.map(log => { const isExpanded = expandedLogId === log.id; const date = new Date(log.date); date.setUTCHours(12); const formattedDate = date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC' }); return (<Card key={log.id} className="p-0 overflow-hidden"><button onClick={() => setExpandedLogId(isExpanded ? null : log.id)} className="w-full flex justify-between items-center p-4 text-left hover:bg-primary/5"><p className="font-bold">{formattedDate}</p><ChevronDown className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} /></button>{isExpanded && <LogDetailView log={log} settings={habitSettings} />}</Card>); })}</div> : <p className="text-sm text-text-secondary text-center py-8">No habit logs found for this agent.</p>}</Card>}
                {activeTab === 'performance' && <Card><h2 className="text-2xl font-bold mb-4">All Performance Logs</h2>{performanceLogs.length > 0 ? <div className="space-y-3">{performanceLogs.map(log => <PerformanceLogSummaryCard key={log.id} log={log} />)}</div> : <p className="text-sm text-text-secondary">No performance logs found.</p>}</Card>}
            </div>

            <GoalModal isOpen={isGoalModalOpen} onClose={handleCloseGoalModal} onSubmit={handleSubmitGoal} title={goalToEdit ? `Edit Goal for ${agent.name}` : `Assign Goal to ${agent.name}`} submitButtonText={goalToEdit ? "Save Changes" : "Assign Goal"} goalToEdit={goalToEdit} />
            <AssignHomeworkModal isOpen={isHomeworkModalOpen} onClose={() => setIsHomeworkModalOpen(false)} onSubmit={handleAssignHomework} agentName={agent.name} />
            <ChangeRoleModal isOpen={isChangeRoleModalOpen} onClose={() => setIsChangeRoleModalOpen(false)} onSave={handleChangeRole} agent={agent} />
        </div>
    );
};

const KpiDisplay: React.FC<{ label: string; value: string | number; }> = ({ label, value }) => (
    <div className="bg-surface p-3 rounded-lg text-center"><p className="text-xs text-text-secondary uppercase tracking-wider">{label}</p><p className="text-2xl font-bold text-text-primary">{typeof value === 'number' ? value.toLocaleString() : value}</p></div>
);

export default AgentDetailPage;
