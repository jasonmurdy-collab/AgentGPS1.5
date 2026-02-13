
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useGoals } from '../contexts/GoalContext';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import { StarRating } from '../components/ui/StarRating';
import type { PerformanceLog, Goal, TeamMember } from '../types';
import { Settings, PlusCircle, MessageSquare, CheckSquare, Star, Send, MoreVertical, Archive, ArchiveRestore, ChevronDown, Edit, Save, Target, AlertTriangle, X, UserCheck } from 'lucide-react';

const LogForm: React.FC<{ 
    agentId: string;
    agent: TeamMember | undefined;
    logToEdit: PerformanceLog | null; 
    onSave: () => void;
    onCancel: () => void;
}> = ({ agentId, agent, logToEdit, onSave, onCancel }) => {
    const { addPerformanceLog, updatePerformanceLog } = useAuth();
    const { getGoalsForUser } = useGoals();

    const [logType, setLogType] = useState<PerformanceLog['type']>('coaching_session');
    const [notes, setNotes] = useState('');
    const [eventName, setEventName] = useState('');
    const [attended, setAttended] = useState(true);
    const [ratings, setRatings] = useState({ prospecting: 3, skillDevelopment: 3, mindset: 3 });
    const [agentGoals, setAgentGoals] = useState<Goal[]>([]);
    const [selectedGoalProgress, setSelectedGoalProgress] = useState<PerformanceLog['goalProgress']>([]);

    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (logToEdit) {
            setLogType(logToEdit.type);
            setNotes(logToEdit.notes || '');
            setEventName(logToEdit.eventName || '');
            setAttended(logToEdit.attended ?? true);
            setRatings(logToEdit.ratings || { prospecting: 3, skillDevelopment: 3, mindset: 3 });
            setSelectedGoalProgress(logToEdit.goalProgress || []);
        } else {
            // Reset form for new log
            setLogType('coaching_session');
            setNotes('');
            setEventName('');
            setAttended(true);
            setRatings({ prospecting: 3, skillDevelopment: 3, mindset: 3 });
            setSelectedGoalProgress([]);
        }
    }, [logToEdit]);

    useEffect(() => {
        if (agentId) {
            getGoalsForUser(agentId).then(goals => {
                const activeGoals = goals.filter(g => !g.isArchived);
                setAgentGoals(activeGoals);
            });
        }
    }, [agentId, getGoalsForUser]);
    
    const handleToggleGoal = (goal: Goal) => {
        setSelectedGoalProgress(prev => {
            const isSelected = prev.some(p => p.goalId === goal.id);
            if (isSelected) {
                return prev.filter(p => p.goalId !== goal.id);
            } else {
                return [...prev, {
                    goalId: goal.id,
                    goalTitle: goal.title,
                    currentValue: goal.currentValue,
                    targetValue: goal.targetValue,
                }];
            }
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const logData: Omit<PerformanceLog, 'id' | 'coachId' | 'date'> = {
            agentId,
            teamId: agent?.teamId ?? null,
            marketCenterId: agent?.marketCenterId ?? null,
            type: logType,
            notes,
            goalProgress: selectedGoalProgress
        };
        if (logType === 'attendance') {
            logData.eventName = eventName;
            logData.attended = attended;
        }
        if (['coaching_session', 'performance_review', 'goal_review'].includes(logType)) {
            logData.ratings = ratings;
        }

        try {
            if (logToEdit) {
                await updatePerformanceLog(logToEdit.id, logData);
            } else {
                await addPerformanceLog(logData);
            }
            onSave();
        } catch (error) {
            console.error("Failed to save performance log:", error);
            alert("Failed to save log. Please try again.");
        } finally {
            setSaving(false);
        }
    };
    
    return (
        <Card className="border-2 border-primary/20 shadow-xl animate-in slide-in-from-top-4 duration-300">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex justify-between items-center mb-2">
                    <h2 className="text-2xl font-bold">{logToEdit ? 'Edit Performance Log' : 'New Performance Log'}</h2>
                    <button type="button" onClick={onCancel} className="p-2 hover:bg-destructive/10 text-destructive rounded-full"><X size={20}/></button>
                </div>
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Log Type</label>
                    <select value={logType} onChange={e => setLogType(e.target.value as PerformanceLog['type'])} className="w-full bg-input border border-border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary">
                        <option value="coaching_session">Coaching Session</option>
                        <option value="attendance">Attendance</option>
                        <option value="performance_review">Performance Review</option>
                        <option value="goal_review">Goal Review</option>
                    </select>
                </div>
                
                {logType === 'attendance' && (
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="block text-sm font-medium text-text-secondary mb-1">Event Name</label>
                           <input type="text" value={eventName} onChange={e => setEventName(e.target.value)} className="w-full bg-input border border-border rounded-md px-3 py-2 text-text-primary" required />
                        </div>
                        <div className="flex items-center gap-2 pt-6">
                            <input type="checkbox" id="attended-checkbox" checked={attended} onChange={e => setAttended(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"/>
                            <label htmlFor="attended-checkbox" className="text-sm font-medium text-text-primary">Attended</label>
                        </div>
                    </div>
                )}
                
                {(['coaching_session', 'performance_review', 'goal_review'].includes(logType)) && (
                    <div className="space-y-2 bg-background/50 p-4 rounded-xl">
                         <label className="block text-sm font-bold text-text-secondary uppercase tracking-wider mb-2">Session Ratings</label>
                         <div className="flex justify-between items-center"><span className="text-sm font-medium">Prospecting Efforts:</span> <StarRating rating={ratings.prospecting} onRatingChange={r => setRatings(p => ({...p, prospecting: r}))} /></div>
                         <div className="flex justify-between items-center"><span className="text-sm font-medium">Skill Development:</span> <StarRating rating={ratings.skillDevelopment} onRatingChange={r => setRatings(p => ({...p, skillDevelopment: r}))} /></div>
                         <div className="flex justify-between items-center"><span className="text-sm font-medium">Mindset / Motivation:</span> <StarRating rating={ratings.mindset} onRatingChange={r => setRatings(p => ({...p, mindset: r}))} /></div>
                    </div>
                )}
                 
                {(['performance_review', 'goal_review'].includes(logType)) && (
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">Goals Reviewed During Session</label>
                        <div className="space-y-2 max-h-40 overflow-y-auto bg-input p-2 rounded-md border border-border">
                            {agentGoals.length > 0 ? agentGoals.map(goal => (
                                <div key={goal.id} className="flex items-center gap-2">
                                    <input 
                                        type="checkbox" 
                                        id={`goal-check-${goal.id}`} 
                                        checked={selectedGoalProgress?.some(p => p.goalId === goal.id)}
                                        onChange={() => handleToggleGoal(goal)}
                                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                    />
                                    <label htmlFor={`goal-check-${goal.id}`} className="text-sm font-medium text-text-primary">{goal.title}</label>
                                </div>
                            )) : <p className="text-xs text-text-secondary text-center py-4">No active goals found for this agent.</p>}
                        </div>
                    </div>
                )}
                
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Coach Notes & Takeaways</label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full min-h-[120px] bg-input border border-border rounded-md p-3 text-sm" placeholder="Summarize the breakthroughs, challenges, or next steps agreed upon..."/>
                </div>

                <div className="flex justify-end gap-4 pt-4">
                    <button type="button" onClick={onCancel} className="py-2 px-6 rounded-xl text-text-secondary hover:bg-text-primary/5 font-semibold">Cancel</button>
                    <button type="submit" disabled={saving} className="min-w-[160px] flex justify-center items-center py-2.5 px-6 rounded-xl bg-primary text-on-accent font-bold hover:bg-opacity-90 shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50">
                        {saving ? <Spinner /> : <><Save className="mr-2" size={18}/> {logToEdit ? 'Update Log' : 'Save Log'}</>}
                    </button>
                </div>
            </form>
        </Card>
    )
};


const LogItem: React.FC<{ 
    log: PerformanceLog;
    isExpanded: boolean;
    onToggleExpand: () => void;
    onEdit: () => void;
    onArchive: () => void;
    isMenuOpen: boolean;
    onToggleMenu: () => void;
}> = ({ log, isExpanded, onToggleExpand, onEdit, onArchive, isMenuOpen, onToggleMenu }) => {
    const menuRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                if (isMenuOpen) onToggleMenu();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isMenuOpen, onToggleMenu]);

    const typeInfo = {
        coaching_session: { icon: MessageSquare, label: 'Coaching Session', color: 'text-blue-500' },
        attendance: { icon: CheckSquare, label: 'Attendance', color: 'text-green-500' },
        performance_review: { icon: Star, label: 'Performance Review', color: 'text-purple-500' },
        goal_review: { icon: Target, label: 'Goal Review', color: 'text-orange-500' },
    }[log.type];
    
    return (
        <Card className={`p-0 overflow-hidden transition-all ${isExpanded ? 'ring-2 ring-primary/20' : 'hover:border-primary/30'}`}>
            <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-opacity-10 ${typeInfo.color.replace('text', 'bg')}`}>
                        <typeInfo.icon size={20} className={typeInfo.color}/>
                    </div>
                    <div>
                        <p className="font-bold text-text-primary">{typeInfo.label}</p>
                        <p className="text-xs text-text-secondary">{new Date(log.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={onToggleExpand} className="flex items-center gap-1 text-sm text-primary font-bold hover:underline px-2 py-1 rounded-lg transition-colors">
                        {isExpanded ? 'Hide Details' : 'View Details'}
                        <ChevronDown className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} size={16} />
                    </button>
                    <div className="relative" ref={menuRef}>
                        <button onClick={onToggleMenu} className="p-2 rounded-full hover:bg-primary/20 transition-colors">
                            <MoreVertical size={16}/>
                        </button>
                        {isMenuOpen && (
                            <div className="absolute right-0 mt-2 w-40 bg-surface border border-border rounded-xl shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-100 overflow-hidden">
                                <button onClick={onEdit} className="w-full text-left flex items-center gap-2 px-4 py-3 text-sm font-semibold hover:bg-primary/10 transition-colors border-b border-border"><Edit size={14} /> Edit Log</button>
                                <button onClick={onArchive} className="w-full text-left flex items-center gap-2 px-4 py-3 text-sm font-semibold hover:bg-primary/10 transition-colors">
                                    {log.isArchived ? <ArchiveRestore size={14} className="text-success" /> : <Archive size={14} className="text-warning" />}
                                    {log.isArchived ? 'Unarchive' : 'Archive Log'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {isExpanded && (
                 <div className="p-5 border-t border-border bg-background/30 text-sm space-y-4 animate-in slide-in-from-top-2 duration-200">
                    {log.type === 'attendance' && <p className="p-3 bg-surface rounded-lg border border-border"><strong>Event:</strong> {log.eventName} — <span className={log.attended ? 'text-success font-bold' : 'text-destructive font-bold'}>{log.attended ? 'Attended' : 'Absent'}</span></p>}
                    {log.ratings && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="bg-surface p-3 rounded-xl border border-border text-center">
                                <p className="text-[10px] uppercase font-bold text-text-secondary mb-1">Prospecting</p>
                                <div className="flex justify-center"><StarRating rating={log.ratings.prospecting} size={14} /></div>
                            </div>
                            <div className="bg-surface p-3 rounded-xl border border-border text-center">
                                <p className="text-[10px] uppercase font-bold text-text-secondary mb-1">Skill Dev</p>
                                <div className="flex justify-center"><StarRating rating={log.ratings.skillDevelopment} size={14} /></div>
                            </div>
                            <div className="bg-surface p-3 rounded-xl border border-border text-center">
                                <p className="text-[10px] uppercase font-bold text-text-secondary mb-1">Mindset</p>
                                <div className="flex justify-center"><StarRating rating={log.ratings.mindset} size={14} /></div>
                            </div>
                        </div>
                    )}
                    {log.goalProgress && log.goalProgress.length > 0 && (
                        <div className="bg-surface p-4 rounded-xl border border-border">
                            <p className="font-bold text-text-primary mb-3 flex items-center gap-2"><Target size={16} className="text-primary" /> Goals Reviewed</p>
                            <div className="space-y-3">
                                {log.goalProgress.map(gp => {
                                    const progress = gp.targetValue > 0 ? (gp.currentValue / gp.targetValue) * 100 : 0;
                                    return (
                                        <div key={gp.goalId}>
                                            <div className="flex justify-between text-xs font-semibold mb-1">
                                                <span>{gp.goalTitle}</span>
                                                <span className="text-primary">{progress.toFixed(0)}%</span>
                                            </div>
                                            <div className="w-full bg-background rounded-full h-1.5 overflow-hidden">
                                                <div className="bg-primary h-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    <div>
                        <p className="font-bold text-text-primary mb-2">Coach's Meeting Notes:</p>
                        <p className="whitespace-pre-wrap p-4 bg-surface rounded-xl border border-border text-text-secondary leading-relaxed">{log.notes || 'No detailed notes provided for this session.'}</p>
                    </div>
                </div>
            )}
        </Card>
    );
}

const PerformanceLogsPage: React.FC = () => {
    const { managedAgents, loadingAgents, getPerformanceLogsForAgent, updatePerformanceLog } = useAuth();
    const location = useLocation();
    // Initialize navigate
    const navigate = useNavigate();
    const [selectedAgentId, setSelectedAgentId] = useState('');
    const [logs, setLogs] = useState<PerformanceLog[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const [showForm, setShowForm] = useState(false);
    const [logToEdit, setLogToEdit] = useState<PerformanceLog | null>(null);
    const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});
    const [showArchived, setShowArchived] = useState(false);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);

    // Effect to handle deep linking via ?agentId=xxx
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const agentIdParam = params.get('agentId');
        if (agentIdParam) {
            setSelectedAgentId(agentIdParam);
            setShowForm(true); // Default to showing form if deep linking
        }
    }, [location.search]);

    const fetchLogs = useCallback(async () => {
        if (!selectedAgentId) return;
        setLoadingLogs(true);
        setError(null);
        try {
            const agentLogs = await getPerformanceLogsForAgent(selectedAgentId);
            setLogs(agentLogs);
        } catch (error: any) {
            console.error("Failed to fetch logs:", error);
            if (error.code === 'permission-denied' || (error.message && error.message.toLowerCase().includes('permission'))) {
                setError("Permission Denied: Your role does not have permission to view performance logs for this user. Please contact an administrator to update the backend security rules to allow read access.");
            } else {
                setError("An unexpected error occurred while fetching performance logs.");
            }
            setLogs([]);
        } finally {
            setLoadingLogs(false);
        }
    }, [selectedAgentId, getPerformanceLogsForAgent]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const handleSaveLog = () => {
        setShowForm(false);
        setLogToEdit(null);
        fetchLogs();
    };

    const handleEditLog = (log: PerformanceLog) => {
        setLogToEdit(log);
        setShowForm(true);
        setOpenMenuId(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleArchiveToggle = async (log: PerformanceLog) => {
        setOpenMenuId(null);
        await updatePerformanceLog(log.id, { isArchived: !log.isArchived });
        fetchLogs();
    };
    
    const sortedLogs = useMemo(() => {
        return logs
            .filter(log => showArchived ? true : !log.isArchived)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [logs, showArchived]);

    const selectedAgent = useMemo(() => managedAgents.find(a => a.id === selectedAgentId), [managedAgents, selectedAgentId]);


    return (
        <div className="h-full flex flex-col">
            <header className="p-4 sm:p-6 lg:p-8 flex justify-between items-start flex-wrap gap-4">
                <div>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-text-primary">Performance Center</h1>
                    <p className="text-lg text-text-secondary mt-1">Directly log and review coaching interactions and agent breakthroughs.</p>
                </div>
                {selectedAgentId && (
                     <button 
                        onClick={() => { setLogToEdit(null); setShowForm(!showForm); }} 
                        className={`flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all shadow-xl active:scale-95 ${showForm ? 'bg-destructive/10 text-destructive' : 'bg-primary text-on-accent shadow-primary/20'}`}
                    >
                        {showForm ? <X size={20} /> : <PlusCircle size={20} />}
                        {showForm && !logToEdit ? 'Discard Draft' : 'Add New Review Log'}
                    </button>
                )}
            </header>

            <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:p-8 pb-8 space-y-6">
                <Card className="bg-primary/5 border-primary/10">
                    <div className="flex flex-wrap gap-4 justify-between items-end">
                        <div className="flex-1 min-w-[200px]">
                            <label htmlFor="agent-select" className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-1.5 ml-1">Agent / Team Member</label>
                            <select
                                id="agent-select"
                                value={selectedAgentId}
                                onChange={e => setSelectedAgentId(e.target.value)}
                                className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text-primary font-semibold focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                                disabled={loadingAgents}
                            >
                                <option value="">{loadingAgents ? 'Loading database...' : '-- Select Agent for Review --'}</option>
                                {managedAgents.map(agent => (
                                    <option key={agent.id} value={agent.id}>{agent.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </Card>

                {showForm && selectedAgentId && (
                    <LogForm 
                        agentId={selectedAgentId}
                        agent={selectedAgent}
                        logToEdit={logToEdit}
                        onSave={handleSaveLog}
                        onCancel={() => {setShowForm(false); setLogToEdit(null);}}
                    />
                )}
                
                {selectedAgentId && error && (
                    <Card className="bg-destructive-surface text-destructive border-destructive">
                        <div className="flex flex-col items-center justify-center text-center p-4">
                            <AlertTriangle className="w-12 h-12 mb-4" />
                            <p className="font-bold text-lg">Error Fetching Logs</p>
                            <p className="mt-2 max-w-md">{error}</p>
                        </div>
                    </Card>
                )}
                
                {selectedAgentId && !error && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center px-2">
                            <h2 className="text-2xl font-bold text-text-primary">Historical Logs for {selectedAgent?.name}</h2>
                             <button 
                                onClick={() => setShowArchived(!showArchived)} 
                                className={`flex items-center gap-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all px-3 py-1.5 border border-border ${showArchived ? 'bg-primary text-on-accent border-primary' : 'bg-surface text-text-secondary hover:border-primary/50'}`}
                            >
                                <Archive size={14}/> {showArchived ? 'Hide Archived' : 'Show Archived'}
                            </button>
                        </div>
                        
                        {loadingLogs ? (
                            <div className="flex justify-center py-20 bg-surface/50 rounded-2xl border border-dashed border-border">
                                <Spinner className="w-10 h-10"/>
                            </div>
                        ) : sortedLogs.length > 0 ? (
                             <div className="space-y-4">
                                {sortedLogs.map(log => (
                                    <LogItem 
                                        key={log.id} 
                                        log={log}
                                        isExpanded={!!expandedLogs[log.id]}
                                        onToggleExpand={() => setExpandedLogs(p => ({ ...p, [log.id]: !p[log.id]}))}
                                        onEdit={() => handleEditLog(log)}
                                        onArchive={() => handleArchiveToggle(log)}
                                        isMenuOpen={openMenuId === log.id}
                                        onToggleMenu={() => setOpenMenuId(p => p === log.id ? null : log.id)}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20 bg-surface/30 rounded-2xl border border-dashed border-border">
                                <p className="text-text-secondary font-medium">
                                   {showArchived && logs.length > 0 ? "You have no archived logs for this user." : "No coaching history found for this agent yet."}
                                </p>
                                {!showForm && <button onClick={() => setShowForm(true)} className="mt-4 text-primary font-bold text-sm hover:underline">Start the first review log now &rarr;</button>}
                            </div>
                        )}
                    </div>
                )}

                {!selectedAgentId && !loadingAgents && (
                    <div className="text-center py-32">
                        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <UserCheck size={40} className="text-primary opacity-40" />
                        </div>
                        <h2 className="text-2xl font-black tracking-tight text-text-primary">Agent Select Required</h2>
                        <p className="text-sm font-semibold text-text-secondary max-w-xs mx-auto mt-2 mb-6">Pick an agent from the dropdown above to manage their performance history or start a new session.</p>
                        <div className="flex justify-center gap-3">
                            {/* Corrected usage of navigate */}
                            <button onClick={() => navigate('/')} className="px-4 py-2 text-sm font-bold text-text-secondary hover:text-primary transition-colors">Go to Dashboard</button>
                            <button onClick={() => navigate('/team-hub')} className="px-4 py-2 text-sm font-bold bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors">Browse Agent Roster</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PerformanceLogsPage;
