import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useGoals } from '../contexts/GoalContext';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import { StarRating } from '../components/ui/StarRating';
import type { PerformanceLog, Goal, TeamMember } from '../types';
import { Settings, PlusCircle, MessageSquare, CheckSquare, Star, Send, MoreVertical, Archive, ArchiveRestore, ChevronDown, Edit, Save, Target, AlertTriangle } from 'lucide-react';

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
        <Card>
            <form onSubmit={handleSubmit} className="space-y-4">
                <h2 className="text-2xl font-bold">{logToEdit ? 'Edit Log' : 'Create New Performance Log'}</h2>
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
                    <div className="space-y-2">
                         <label className="block text-sm font-medium text-text-secondary">Ratings</label>
                         <div className="flex justify-between items-center"><span className="text-sm">Prospecting:</span> <StarRating rating={ratings.prospecting} onRatingChange={r => setRatings(p => ({...p, prospecting: r}))} /></div>
                         <div className="flex justify-between items-center"><span className="text-sm">Skill Development:</span> <StarRating rating={ratings.skillDevelopment} onRatingChange={r => setRatings(p => ({...p, skillDevelopment: r}))} /></div>
                         <div className="flex justify-between items-center"><span className="text-sm">Mindset:</span> <StarRating rating={ratings.mindset} onRatingChange={r => setRatings(p => ({...p, mindset: r}))} /></div>
                    </div>
                )}
                 
                {(['performance_review', 'goal_review'].includes(logType)) && (
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">Goals Reviewed</label>
                        <div className="space-y-2 max-h-40 overflow-y-auto bg-input p-2 rounded-md">
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
                            )) : <p className="text-xs text-text-secondary text-center">No active goals found for this agent.</p>}
                        </div>
                    </div>
                )}
                
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Notes</label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full min-h-[120px] bg-input border border-border rounded-md p-3 text-sm" placeholder="Add detailed notes here..."/>
                </div>

                <div className="flex justify-end gap-4 pt-4">
                    <button type="button" onClick={onCancel} className="py-2 px-4 rounded-lg text-text-secondary hover:bg-text-primary/5">Cancel</button>
                    <button type="submit" disabled={saving} className="min-w-[120px] flex justify-center items-center py-2 px-4 rounded-lg bg-primary text-on-accent font-semibold hover:bg-opacity-90 disabled:bg-opacity-50">
                        {saving ? <Spinner /> : <Save className="mr-2" size={16}/>} {logToEdit ? 'Save Changes' : 'Save Log'}
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
                onToggleMenu(); // This assumes toggle will close it
            }
        };
        if (isMenuOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isMenuOpen, onToggleMenu]);

    const typeInfo = {
        coaching_session: { icon: MessageSquare, label: 'Coaching Session', color: 'text-blue-500' },
        attendance: { icon: CheckSquare, label: 'Attendance', color: 'text-green-500' },
        performance_review: { icon: Star, label: 'Performance Review', color: 'text-purple-500' },
        goal_review: { icon: Target, label: 'Goal Review', color: 'text-orange-500' },
    }[log.type];
    
    return (
        <Card className="p-0 overflow-hidden">
            <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                    <typeInfo.icon size={20} className={typeInfo.color}/>
                    <div>
                        <p className="font-bold text-text-primary">{typeInfo.label}</p>
                        <p className="text-sm text-text-secondary">{new Date(log.date).toLocaleDateString()}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={onToggleExpand} className="flex items-center gap-1 text-sm text-primary font-semibold">
                        {isExpanded ? 'Collapse' : 'Details'}
                        <ChevronDown className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                    <div className="relative">
                        <button onClick={onToggleMenu} className="p-2 rounded-full hover:bg-primary/20">
                            <MoreVertical size={16}/>
                        </button>
                        {isMenuOpen && (
                            <div ref={menuRef} className="absolute right-0 mt-2 w-36 bg-surface border border-border rounded-lg shadow-xl z-10">
                                <button onClick={onEdit} className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm hover:bg-primary/10 rounded-t-lg"><Edit size={14} /> Edit</button>
                                <button onClick={onArchive} className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm hover:bg-primary/10 rounded-b-lg">
                                    {log.isArchived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                                    {log.isArchived ? 'Unarchive' : 'Archive'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {isExpanded && (
                 <div className="p-4 border-t border-border bg-background/50 text-sm space-y-3">
                    {log.type === 'attendance' && <p><strong>Event:</strong> {log.eventName} - <strong>{log.attended ? 'Attended' : 'Absent'}</strong></p>}
                    {log.ratings && (
                        <div>
                            <p><strong>Ratings:</strong></p>
                            <ul className="list-disc list-inside ml-4">
                                <li>Prospecting: {log.ratings.prospecting}/5</li>
                                <li>Skill Development: {log.ratings.skillDevelopment}/5</li>
                                <li>Mindset: {log.ratings.mindset}/5</li>
                            </ul>
                        </div>
                    )}
                    {log.goalProgress && log.goalProgress.length > 0 && (
                        <div>
                            <p><strong>Goals Reviewed:</strong></p>
                            <ul className="list-disc list-inside ml-4">
                                {log.goalProgress.map(gp => (
                                    <li key={gp.goalId}>{gp.goalTitle} ({gp.currentValue.toLocaleString()} / {gp.targetValue.toLocaleString()})</li>
                                ))}
                            </ul>
                        </div>
                    )}
                    <div>
                        <p><strong>Notes:</strong></p>
                        <p className="whitespace-pre-wrap p-2 bg-surface rounded-md">{log.notes || 'No notes provided.'}</p>
                    </div>
                </div>
            )}
        </Card>
    );
}

const PerformanceLogsPage: React.FC = () => {
    const { managedAgents, loadingAgents, getPerformanceLogsForAgent, updatePerformanceLog } = useAuth();
    const [selectedAgentId, setSelectedAgentId] = useState('');
    const [logs, setLogs] = useState<PerformanceLog[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const [showForm, setShowForm] = useState(false);
    const [logToEdit, setLogToEdit] = useState<PerformanceLog | null>(null);
    const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});
    const [showArchived, setShowArchived] = useState(false);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);

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
            <header className="p-4 sm:p-6 lg:p-8">
                <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-text-primary">Performance Logs</h1>
                <p className="text-lg text-text-secondary mt-1">Track coaching sessions, attendance, and reviews for your team members.</p>
            </header>

            <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:p-8 pb-8 space-y-6">
                <Card>
                    <div className="flex flex-wrap gap-4 justify-between items-end">
                        <div>
                            <label htmlFor="agent-select" className="block text-sm font-medium text-text-secondary mb-1">Select a User</label>
                            <select
                                id="agent-select"
                                value={selectedAgentId}
                                onChange={e => setSelectedAgentId(e.target.value)}
                                className="w-full max-w-sm bg-input border border-border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                                disabled={loadingAgents}
                            >
                                <option value="">{loadingAgents ? 'Loading users...' : '-- Select User --'}</option>
                                {managedAgents.map(agent => (
                                    <option key={agent.id} value={agent.id}>{agent.name}</option>
                                ))}
                            </select>
                        </div>
                        {selectedAgentId && (
                             <button onClick={() => { setLogToEdit(null); setShowForm(!showForm); }} className="flex items-center justify-center bg-primary text-on-accent font-semibold py-2 px-4 rounded-lg hover:bg-opacity-90 transition-colors">
                                <PlusCircle className="mr-2" size={16} />
                                {showForm && !logToEdit ? 'Cancel' : 'Add New Log'}
                            </button>
                        )}
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
                    <Card>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-bold">Log History {selectedAgent && `for ${selectedAgent.name}`}</h2>
                             <button onClick={() => setShowArchived(!showArchived)} className="flex items-center gap-2 text-sm font-semibold rounded-lg transition-colors px-3 py-1.5 bg-input border border-border text-text-secondary hover:border-primary">
                                <Archive size={16}/> {showArchived ? 'Hide Archived' : 'Show Archived'}
                            </button>
                        </div>
                        {loadingLogs ? <div className="flex justify-center py-8"><Spinner/></div> :
                        sortedLogs.length > 0 ? (
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
                            <p className="text-center text-text-secondary py-8">{showArchived && logs.length > 0 ? "No archived logs for this user." : "No logs found for this user."}</p>
                        )}
                    </Card>
                )}
            </div>
        </div>
    );
};

export default PerformanceLogsPage;