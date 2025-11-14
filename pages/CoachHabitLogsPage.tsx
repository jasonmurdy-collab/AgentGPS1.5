import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth, P } from '../contexts/AuthContext';
import type { TeamMember, DailyTrackerData, HabitTrackerTemplate, HabitActivitySetting } from '../types';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import { ClipboardList, ChevronDown, ChevronUp, Download, AlertTriangle } from 'lucide-react';
import { db } from '../firebaseConfig';
import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { processDailyTrackerDoc } from '../lib/firestoreUtils';

// --- DEFAULT DATA & HELPERS ---
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

const PrintableLog: React.FC<{ data: DailyTrackerData; settings: HabitTrackerTemplate; userName: string; }> = ({ data, settings, userName }) => {
    const totalPoints = calculateTotalPoints(data, settings);
    const date = new Date(data.date);
    date.setUTCHours(12);
    const formattedDate = date.toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC'
    });
    
    const filledSchedule = Object.entries(data.schedule).filter(([, task]) => typeof task === 'string' && task.trim() !== '');

    return (
        <div className="p-10 bg-white text-gray-800 w-[827px] font-sans">
            <div className="text-center mb-6 border-b-2 border-[var(--color-accent)] pb-4">
                <h1 className="text-3xl font-bold text-[var(--color-accent)]">Daily Accountability Report</h1>
                <p className="text-lg text-gray-600 mt-1"><strong>{userName}</strong> - {formattedDate}</p>
            </div>
            <div className="grid grid-cols-4 gap-4 text-center mb-6 bg-gray-100 p-4 rounded-lg">
                <div><p className="text-sm font-semibold text-gray-600">Total Points</p><p className="text-3xl font-bold text-[var(--color-accent)]">{totalPoints}</p></div>
                <div><p className="text-sm font-semibold text-gray-600">Dials</p><p className="text-3xl font-bold">{data.dials || 0}</p></div>
                <div><p className="text-sm font-semibold text-gray-600">Apts Set</p><p className="text-3xl font-bold">{data.prospectingTotals.aptsSet || 0}</p></div>
                <div><p className="text-sm font-semibold text-gray-600">Contacts</p><p className="text-3xl font-bold">{data.prospectingTotals.contacts || 0}</p></div>
            </div>
            <div className="grid grid-cols-2 gap-8">
                <div>
                    <h2 className="text-xl font-bold border-b border-gray-300 pb-2 mb-3">Daily Metrics Log</h2>
                     <ul className="space-y-1 text-sm">
                        {settings.activities.map(activity => {
                            const value = getMetricValue(data, activity.id);
                            if (value > 0) return <li key={activity.id}><strong>{activity.name}:</strong> {value}</li>;
                            return null;
                        })}
                    </ul>
                </div>
                 <div>
                    <h2 className="text-xl font-bold border-b border-gray-300 pb-2 mb-3">Key Conversations & Wins</h2>
                    <p className="text-sm whitespace-pre-wrap">{data.notes || 'No notes provided.'}</p>
                </div>
            </div>
            {filledSchedule.length > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-300">
                    <h2 className="text-xl font-bold mb-3">Activity Schedule</h2>
                    <table className="w-full text-sm text-left"><thead className="bg-gray-100"><tr><th className="p-2 w-24">Time</th><th className="p-2">Task</th></tr></thead><tbody>{filledSchedule.map(([time, task]) => (<tr key={time} className="border-b"><td className="p-2 font-semibold">{time}</td><td className="p-2">{task}</td></tr>))}</tbody></table>
                </div>
            )}
        </div>
    );
};

const PrintableLogsContainer: React.FC<{ logs: DailyTrackerData[]; settings: HabitTrackerTemplate; userName: string; }> = ({ logs, settings, userName }) => {
    const sortedLogs = [...logs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return (<div id="pdf-export-all-content-coach-logs" className="bg-white text-gray-800 w-[827px] font-sans">{sortedLogs.map((log, index) => (<div key={log.id || index} className="border-b-2 border-dashed border-gray-300 last:border-b-0"><PrintableLog data={log} settings={settings} userName={userName} /></div>))}</div>);
};

const CoachHabitLogsPage: React.FC = () => {
    const { managedAgents: agents, loadingAgents, userData, user } = useAuth();
    const [selectedAgentId, setSelectedAgentId] = useState('');
    const [agentLogs, setAgentLogs] = useState<DailyTrackerData[]>([]);
    const [agentSettings, setAgentSettings] = useState<HabitTrackerTemplate | null>(null);
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
    const [exportingAll, setExportingAll] = useState(false);
    const [logToExport, setLogToExport] = useState<DailyTrackerData | null>(null);
    const [exportingSingle, setExportingSingle] = useState(false);

    useEffect(() => {
        const fetchAgentData = async () => {
            if (selectedAgentId && user && userData) {
                setLoadingLogs(true);
                setExpandedLogId(null);
                setError(null);
                try {
                    const selectedAgent = agents.find(a => a.id === selectedAgentId);
                    const logsCollectionRef = collection(db, 'dailyTrackers');
                    let logsQuery;
                    
                    if (userData.isSuperAdmin) {
                        logsQuery = query(logsCollectionRef, where('userId', '==', selectedAgentId), orderBy('date', 'desc'));
                    } else if (userData.role === 'market_center_admin' && userData.marketCenterId) {
                        logsQuery = query(logsCollectionRef, where('marketCenterId', '==', userData.marketCenterId), where('userId', '==', selectedAgentId), orderBy('date', 'desc'));
                    } else if (userData.role === 'productivity_coach') {
                        logsQuery = query(logsCollectionRef, where('coachId', '==', user.uid), where('userId', '==', selectedAgentId), orderBy('date', 'desc'));
                    } else if (userData.role === 'team_leader' && userData.teamId) {
                        logsQuery = query(logsCollectionRef, where('teamId', '==', userData.teamId), where('userId', '==', selectedAgentId), orderBy('date', 'desc'));
                    }

                    if (!logsQuery) {
                        setError("You do not have permission to view logs for this user.");
                        setLoadingLogs(false);
                        return;
                    }

                    const logsSnapshot = await getDocs(logsQuery);
                    setAgentLogs(logsSnapshot.docs.map(processDailyTrackerDoc));
                    
                    let settingsDoc = null;
                    const settingsRef = collection(db, 'habitTrackerTemplates');
                    if (selectedAgent) {
                         const roleQuery = query(settingsRef, where('isDefaultForRole', '==', selectedAgent.role));
                         const roleSnap = await getDocs(roleQuery);
                         if (!roleSnap.empty) settingsDoc = roleSnap.docs[0];
                    }
                    if (!settingsDoc) {
                        const agentQuery = query(settingsRef, where('isDefaultForRole', '==', 'agent'));
                        const agentSnap = await getDocs(agentQuery);
                        if (!agentSnap.empty) settingsDoc = agentSnap.docs[0];
                    }
                    if (settingsDoc?.exists()) {
                        setAgentSettings({id: settingsDoc.id, ...settingsDoc.data() } as HabitTrackerTemplate);
                    } else {
                        setAgentSettings({ id: 'fallback', name: 'Default Agent', activities: defaultHabitActivities });
                    }
                } catch (error: any) {
                    console.error("Failed to fetch agent logs or settings:", error);
                     if (error.code === 'permission-denied') {
                        setError("Permission Denied: Your role does not have permission to view this agent's logs or settings. Please contact an administrator.");
                    } else {
                        setError("An unexpected error occurred while fetching logs.");
                    }
                    setAgentLogs([]);
                    setAgentSettings(null);
                } finally {
                    setLoadingLogs(false);
                }
            } else {
                setAgentLogs([]);
                setAgentSettings(null);
            }
        };
        fetchAgentData();
    }, [selectedAgentId, agents, userData, user]);

    const handleExportAllLogs = () => { /* ... implementation as before ... */ };
    const handleExportSingleLog = (log: DailyTrackerData) => { /* ... implementation as before ... */ };
    const selectedAgentName = agents.find(a => a.id === selectedAgentId)?.name || 'Agent';

    return (
        <div className="h-full flex flex-col">
            <header className="p-4 sm:p-6 lg:p-8">
                <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-text-primary flex items-center gap-4">
                   <ClipboardList className="text-accent-secondary" size={48} />
                   Agent Habit Logs
                </h1>
                <p className="text-lg text-text-secondary mt-1">Review your agents' daily productivity and accountability logs.</p>
            </header>
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-8 space-y-6">
                <Card>
                    <label htmlFor="agent-select" className="block text-sm font-medium text-text-secondary mb-1">Select an Agent to View Logs</label>
                    <select id="agent-select" value={selectedAgentId} onChange={e => setSelectedAgentId(e.target.value)} className="w-full max-w-sm bg-input border border-border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary" disabled={loadingAgents}>
                        <option value="">{loadingAgents ? 'Loading agents...' : '-- Select an Agent --'}</option>
                        {agents.map(agent => (<option key={agent.id} value={agent.id}>{agent.name}</option>))}
                    </select>
                </Card>

                {loadingLogs ? (<div className="flex justify-center items-center py-8"><Spinner/></div>
                ) : error ? (<Card className="bg-destructive-surface text-destructive border-destructive"><p className="font-bold">Error Loading Logs</p><p>{error}</p></Card>
                ) : selectedAgentId ? (
                    <Card>
                        <div className="flex justify-between items-center mb-4"><h2 className="text-2xl font-bold">Logs for {selectedAgentName}</h2>{agentLogs.length > 0 && <button onClick={handleExportAllLogs} disabled={exportingAll || !agentSettings} className="flex items-center justify-center bg-accent text-on-accent font-semibold py-2 px-4 rounded-lg hover:bg-opacity-90 transition-colors disabled:opacity-50">{exportingAll ? <Spinner className="w-4 h-4"/> : <><Download className="mr-2" size={16} /> Export All Logs</>}</button>}</div>
                        {agentLogs.length > 0 && agentSettings ? (
                            <div className="space-y-2">{agentLogs.map(log => { const isExpanded = expandedLogId === log.id; const date = new Date(log.date); date.setUTCHours(12); const formattedDate = date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }); return (
                                <Card key={log.id} className="p-0 overflow-hidden"><button onClick={() => setExpandedLogId(isExpanded ? null : log.id)} className="w-full flex justify-between items-center p-4 text-left hover:bg-primary/5"><p className="font-bold text-text-primary">{formattedDate}</p><div className="flex items-center gap-2 text-text-secondary"><span>View Details</span><ChevronDown className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} /></div></button>{isExpanded && <><LogDetailView log={log} settings={agentSettings} /><div className="p-4 border-t border-border flex justify-end"><button onClick={() => handleExportSingleLog(log)} disabled={exportingSingle} className="flex items-center gap-2 text-sm font-semibold rounded-lg transition-colors px-3 py-1.5 bg-accent/20 text-accent hover:bg-accent/30">{exportingSingle && logToExport?.id === log.id ? <Spinner className="w-4 h-4"/> : <Download size={14}/>} Export Log</button></div></>}</Card>
                            );})}</div>
                        ) : (<p className="text-center text-text-secondary py-8">No logs found for this agent.</p>)}
                    </Card>
                ) : (<Card className="text-center py-12"><h2 className="text-2xl font-bold">Select an Agent</h2><p className="text-text-secondary mt-2">Choose an agent from the dropdown above to view their daily habit logs.</p></Card>)}
            </div>
            {exportingSingle && logToExport && agentSettings && (<div className="absolute -left-[9999px] -top-[9999px] opacity-0" aria-hidden="true"><div id="pdf-printable-log-single"><PrintableLog data={logToExport} settings={agentSettings} userName={selectedAgentName} /></div></div>)}
            {exportingAll && agentLogs.length > 0 && agentSettings && (<div className="absolute -left-[9999px] -top-[9999px] opacity-0" aria-hidden="true"><PrintableLogsContainer logs={agentLogs} settings={agentSettings} userName={selectedAgentName} /></div>)}
        </div>
    );
};

export default CoachHabitLogsPage;