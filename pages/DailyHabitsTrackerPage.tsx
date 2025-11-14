import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import type { DailyTrackerData, HabitTrackerTemplate, ProspectingTotals, HabitActivitySetting, TeamMember, ProspectingSession } from '../types';
import { Calendar, Clock, Edit2, Phone, Star, Download, ChevronLeft, ChevronRight, Minus, Plus, Target, FileText, ChevronDown, CheckCircle, Save, ClipboardList } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { db } from '../firebaseConfig';
import { doc, getDoc, setDoc, collection, query, where, orderBy, getDocs, addDoc, updateDoc, writeBatch, increment, Timestamp } from 'firebase/firestore';
import { processDailyTrackerDoc } from '../lib/firestoreUtils';

// --- DEFAULT DATA & HELPERS ---
const defaultHabitActivities: HabitActivitySetting[] = [
    { id: 'calls', name: 'Calls Made', worth: 1, unit: 'call' },
    { id: 'doorsKnocked', name: 'Doors Knocked', worth: 1, unit: 'knock' },
    { id: 'knocksAnswered', name: 'Knocks Answered', worth: 2, unit: 'answer' },
    { id: 'contacts', name: 'Meaningful Contacts', worth: 2, unit: 'contact' },
    { id: 'listingAptsSet', name: 'Listing Appointments Set', worth: 10, unit: 'appt' },
    { id: 'buyerAptsSet', name: 'Buyer Appointments Set', worth: 5, unit: 'appt' },
    { id: 'lenderAptsSet', name: 'Lender Appointments Set', worth: 3, unit: 'appt' },
    { id: 'agreements', name: 'Agreements Signed', worth: 20, unit: 'agreement' },
    { id: 'notes', name: 'Handwritten Notes', worth: 2, unit: 'note' },
    { id: 'closings', name: 'Closings', worth: 50, unit: 'closing' },
    { id: 'open_house_hours', name: 'Open House Hours', worth: 10, unit: 'hour' },
    { id: 'social_posts', name: 'Social Media Posts', worth: 2, unit: 'post' },
    { id: 'video_content', name: 'Video Content Created', worth: 5, unit: 'video' },
    { id: 'new_leads', name: 'New Leads Added', worth: 1, unit: 'lead' },
];

const getInitialTrackerData = (userId: string, date: Date, teamId?: string | null, marketCenterId?: string | null, coachId?: string | null): DailyTrackerData => {
    const dateString = date.toISOString().split('T')[0];
    const schedule: { [time: string]: string } = {};
    const times = [
        '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
        '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
        '16:00', '16:30', '17:00'
    ];
    times.forEach(time => { schedule[time] = ''; });
    return {
        userId, date: dateString, teamId: teamId || null, marketCenterId: marketCenterId || null, coachId: coachId || null, dials: 0,
        doorsKnocked: 0, knocksAnswered: 0,
        pointsActivities: {}, prospectingSessions: [{ startTime: '09:00', endTime: '12:00' }, { startTime: '', endTime: '' }],
        prospectingTotals: { contacts: 0, aptsSet: 0, listingAptsSet: 0, buyerAptsSet: 0, lenderAptsSet: 0 },
        notes: '', schedule,
    };
};

const calculateTotalPoints = (data: DailyTrackerData | null, settings: HabitTrackerTemplate | null): number => {
    if (!data || !settings?.activities) return 0;

    const valueGetters: { [key: string]: (d: DailyTrackerData) => number } = {
        'calls': d => d.dials || 0,
        'doorsKnocked': d => d.doorsKnocked || 0,
        'knocksAnswered': d => d.knocksAnswered || 0,
        'contacts': d => d.prospectingTotals?.contacts || 0,
        'listingAptsSet': d => d.prospectingTotals?.listingAptsSet || 0,
        'buyerAptsSet': d => d.prospectingTotals?.buyerAptsSet || 0,
        'lenderAptsSet': d => d.prospectingTotals?.lenderAptsSet || 0,
    };

    return settings.activities.reduce((total, activity) => {
        const getter = valueGetters[activity.id];
        const count = getter ? getter(data) : (data.pointsActivities?.[activity.id] || 0);
        return total + (count * activity.worth);
    }, 0);
};

const PrintableTracker: React.FC<{ data: DailyTrackerData; settings: HabitTrackerTemplate; userName: string; }> = ({ data, settings, userName }) => {
    const totalPoints = calculateTotalPoints(data, settings);
    const date = new Date(data.date);
    date.setUTCHours(12); // Adjust to avoid timezone shifts off the date
    const formattedDate = date.toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC'
    });
    
    const filledSchedule = Object.entries(data.schedule).filter(([, task]) => typeof task === 'string' && task.trim() !== '');

    return (
        <div id="pdf-export-content" className="p-10 bg-white text-gray-800 w-[827px] font-sans">
            <div className="text-center mb-6 border-b-2 border-[var(--color-accent)] pb-4">
                <h1 className="text-3xl font-bold text-[var(--color-accent)]">Daily Accountability Report</h1>
                <p className="text-lg text-gray-600 mt-1"><strong>{userName}</strong> - {formattedDate}</p>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center mb-6 bg-gray-100 p-4 rounded-lg">
                <div><p className="text-sm font-semibold text-gray-600">Total Points</p><p className="text-3xl font-bold text-[var(--color-accent)]">{totalPoints}</p></div>
                <div><p className="text-sm font-semibold text-gray-600">Dials</p><p className="text-3xl font-bold">{data.dials || 0}</p></div>
                <div><p className="text-sm font-semibold text-gray-600">Apts Set</p><p className="text-3xl font-bold">{data.prospectingTotals.aptsSet || 0}</p></div>
            </div>
            
            <div className="grid grid-cols-2 gap-8">
                <div>
                    <h2 className="text-xl font-bold border-b border-gray-300 pb-2 mb-3">Daily Metrics Log</h2>
                     <ul className="space-y-1 text-sm">
                        {settings.activities.map(activity => {
                            let value = 0;
                             switch(activity.id) {
                                case 'calls':
                                    value = data.dials || 0;
                                    break;
                                case 'doorsKnocked':
                                    value = data.doorsKnocked || 0;
                                    break;
                                case 'knocksAnswered':
                                    value = data.knocksAnswered || 0;
                                    break;
                                case 'contacts':
                                    value = data.prospectingTotals?.contacts || 0;
                                    break;
                                case 'listingAptsSet':
                                    value = data.prospectingTotals?.listingAptsSet || 0;
                                    break;
                                case 'buyerAptsSet':
                                    value = data.prospectingTotals?.buyerAptsSet || 0;
                                    break;
                                case 'lenderAptsSet':
                                    value = data.prospectingTotals?.lenderAptsSet || 0;
                                    break;
                                default:
                                    value = data.pointsActivities?.[activity.id] || 0;
                            }
                            if (value > 0) {
                                return <li key={activity.id}><strong>{activity.name}:</strong> {value}</li>;
                            }
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
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-100">
                            <tr><th className="p-2 w-24">Time</th><th className="p-2">Task</th></tr>
                        </thead>
                        <tbody>
                            {filledSchedule.map(([time, task]) => (
                                <tr key={time} className="border-b"><td className="p-2 font-semibold">{time}</td><td className="p-2">{task}</td></tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

const PrintableAllLogs: React.FC<{ logs: DailyTrackerData[]; settings: HabitTrackerTemplate; userName: string; }> = ({ logs, settings, userName }) => {
    const sortedLogs = [...logs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return (
        <div id="pdf-export-all-content" className="bg-white text-gray-800 w-[827px] font-sans">
            {sortedLogs.map((log, index) => (
                <div key={log.id || index} className="border-b-2 border-dashed border-gray-300 last:border-b-0">
                    <PrintableTracker data={log} settings={settings} userName={userName} />
                </div>
            ))}
        </div>
    );
};

// --- MEMOIZED CHILD COMPONENTS ---
const MetricStepper: React.FC<{ label: string; value: number; onUpdate: (newValue: number) => void; unit: string; points: number; }> = ({ label, value, onUpdate, unit, points }) => (
    <div className="bg-background/50 p-3 rounded-lg flex items-center justify-between">
        <div className="flex-1 pr-2">
            <p className="font-bold text-text-primary truncate">{label}</p>
            <p className="text-xs text-text-secondary">{points} {points === 1 ? 'pt' : 'pts'} / {unit}</p>
        </div>
        <div className="flex items-center gap-2">
            <button 
                onClick={() => onUpdate(Math.max(0, value - 1))} 
                className="w-8 h-8 flex items-center justify-center bg-primary/10 text-primary rounded-full transition-colors hover:bg-primary/20 disabled:opacity-50"
                aria-label={`Decrease ${label}`}
            >
                <Minus size={16}/>
            </button>
            <input 
                type="number" 
                value={value} 
                onChange={e => onUpdate(parseInt(e.target.value, 10) || 0)} 
                className="w-16 text-center font-bold text-2xl bg-transparent border-b-2 border-border focus:border-primary focus:outline-none transition-colors"
                aria-label={label}
            />
            <button 
                onClick={() => onUpdate(value + 1)} 
                className="w-8 h-8 flex items-center justify-center bg-primary/10 text-primary rounded-full transition-colors hover:bg-primary/20"
                aria-label={`Increase ${label}`}
            >
                <Plus size={16}/>
            </button>
        </div>
    </div>
);


const DailyMetricsSection: React.FC<{ data: DailyTrackerData; settings: HabitActivitySetting[]; onUpdate: (path: string, value: any) => void; }> = ({ data, settings, onUpdate }) => (
    <Card>
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-3"><Target/> Daily Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MetricStepper 
                label="Calls Made" 
                value={data.dials || 0} 
                onUpdate={(val) => onUpdate('dials', val)}
                unit={settings.find(s=>s.id==='calls')?.unit || 'call'}
                points={settings.find(s=>s.id==='calls')?.worth || 0}
            />
            <MetricStepper 
                label="Doors Knocked" 
                value={data.doorsKnocked || 0} 
                onUpdate={(val) => onUpdate('doorsKnocked', val)}
                unit={settings.find(s=>s.id==='doorsKnocked')?.unit || 'knock'}
                points={settings.find(s=>s.id==='doorsKnocked')?.worth || 0}
            />
             <MetricStepper 
                label="Knocks Answered" 
                value={data.knocksAnswered || 0} 
                onUpdate={(val) => onUpdate('knocksAnswered', val)}
                unit={settings.find(s=>s.id==='knocksAnswered')?.unit || 'answer'}
                points={settings.find(s=>s.id==='knocksAnswered')?.worth || 0}
            />
             <MetricStepper 
                label="Meaningful Contacts" 
                value={data.prospectingTotals?.contacts || 0} 
                onUpdate={(val) => onUpdate('prospectingTotals.contacts', val)}
                unit={settings.find(s=>s.id==='contacts')?.unit || 'contact'}
                points={settings.find(s=>s.id==='contacts')?.worth || 0}
            />
            <MetricStepper 
                label="Listing Appointments Set" 
                value={data.prospectingTotals?.listingAptsSet || 0} 
                onUpdate={(val) => onUpdate('prospectingTotals.listingAptsSet', val)}
                unit={settings.find(s=>s.id==='listingAptsSet')?.unit || 'appt'}
                points={settings.find(s=>s.id==='listingAptsSet')?.worth || 0}
            />
             <MetricStepper 
                label="Buyer Appointments Set" 
                value={data.prospectingTotals?.buyerAptsSet || 0} 
                onUpdate={(val) => onUpdate('prospectingTotals.buyerAptsSet', val)}
                unit={settings.find(s=>s.id==='buyerAptsSet')?.unit || 'appt'}
                points={settings.find(s=>s.id==='buyerAptsSet')?.worth || 0}
            />
             <MetricStepper 
                label="Lender Appointments Set" 
                value={data.prospectingTotals?.lenderAptsSet || 0} 
                onUpdate={(val) => onUpdate('prospectingTotals.lenderAptsSet', val)}
                unit={settings.find(s=>s.id==='lenderAptsSet')?.unit || 'appt'}
                points={settings.find(s=>s.id==='lenderAptsSet')?.worth || 0}
            />
            {settings.filter(s => !['calls', 'contacts', 'listingAptsSet', 'buyerAptsSet', 'lenderAptsSet', 'doorsKnocked', 'knocksAnswered'].includes(s.id)).map(activity => (
                 <MetricStepper 
                    key={activity.id}
                    label={activity.name} 
                    value={data.pointsActivities?.[activity.id] || 0} 
                    onUpdate={(val) => onUpdate(`pointsActivities.${activity.id}`, val)}
                    unit={activity.unit}
                    points={activity.worth}
                />
            ))}
        </div>
    </Card>
);

const ProspectingSection: React.FC<{ sessions: [any, any]; onUpdate: (path: string, value: any) => void; }> = ({ sessions, onUpdate }) => (
    <Card>
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-3"><Clock/> Prospecting Sessions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             {[0, 1].map(i => (
                <div key={i} className="p-3 bg-background/50 rounded-lg">
                    <label className="font-semibold text-text-primary text-sm">Session {i+1}</label>
                    <div className="flex items-center gap-2 mt-1">
                        <input type="time" value={sessions[i].startTime} onChange={e => onUpdate(`prospectingSessions.${i}.startTime`, e.target.value)} className="w-full bg-input border border-border rounded-md p-2 text-sm"/>
                        <span className="text-text-secondary">to</span>
                        <input type="time" value={sessions[i].endTime} onChange={e => onUpdate(`prospectingSessions.${i}.endTime`, e.target.value)} className="w-full bg-input border border-border rounded-md p-2 text-sm"/>
                    </div>
                </div>
            ))}
        </div>
    </Card>
);

const ScheduleSection: React.FC<{ schedule: { [time: string]: string }; onUpdate: (path: string, value: any) => void; }> = ({ schedule, onUpdate }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    const formatTime = (time24: string) => {
        if (!time24) return '';
        const [hour, minute] = time24.split(':');
        const h = parseInt(hour, 10);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const displayHour = h % 12 === 0 ? 12 : h % 12;
        return `${displayHour}:${minute} ${ampm}`;
    };
    
    return (
        <Card className="p-0 overflow-hidden">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center p-4 text-left hover:bg-primary/5 transition-colors">
                <h2 className="text-2xl font-bold flex items-center gap-3"><Calendar/> Today's Schedule</h2>
                <ChevronDown className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isOpen ? 'max-h-[2000px]' : 'max-h-0'}`}>
                <div className="p-4 border-t border-border">
                    <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                        {schedule && Object.keys(schedule).sort().map(time => (
                            <div key={time} className="flex items-center gap-2">
                                <span className="w-20 text-sm font-semibold text-text-secondary">{formatTime(time)}</span>
                                <input type="text" value={schedule[time]} onChange={e => onUpdate(`schedule.${time}`, e.target.value)} className="w-full bg-input border border-border rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"/>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </Card>
    );
};

const NotesSection: React.FC<{ notes: string; onUpdate: (path: string, value: any) => void; }> = ({ notes, onUpdate }) => (
    <Card>
        <h2 className="text-2xl font-bold mb-2 flex items-center gap-3"><FileText/> Key Conversations & Wins</h2>
        <textarea value={notes} onChange={e => onUpdate('notes', e.target.value)} className="w-full min-h-[150px] bg-input border border-border rounded-md p-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Log wins, challenges, breakthroughs, and important conversations..."/>
    </Card>
);

const LogDetailView: React.FC<{ log: DailyTrackerData, settings: HabitTrackerTemplate }> = ({ log, settings }) => {
    const totalPoints = calculateTotalPoints(log, settings);

    return (
        <div className="p-4 bg-background/50 border-t border-border">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center mb-4">
                <div className="bg-surface p-2 rounded-lg"><p className="text-xs text-text-secondary">Points</p><p className="font-bold text-lg text-primary">{totalPoints}</p></div>
                <div className="bg-surface p-2 rounded-lg"><p className="text-xs text-text-secondary">Dials</p><p className="font-bold text-lg">{log.dials}</p></div>
                <div className="bg-surface p-2 rounded-lg"><p className="text-xs text-text-secondary">Apts Set</p><p className="font-bold text-lg">{log.prospectingTotals.aptsSet}</p></div>
                <div className="bg-surface p-2 rounded-lg"><p className="text-xs text-text-secondary">Contacts</p><p className="font-bold text-lg">{log.prospectingTotals.contacts}</p></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div>
                    <h4 className="font-bold text-text-primary mb-2">Metrics</h4>
                    <ul className="list-disc list-inside text-text-secondary space-y-1">
                        {(settings.activities || []).map(act => {
                            let value = 0;
                            switch(act.id) {
                                case 'calls': value = log.dials || 0; break;
                                case 'contacts': value = log.prospectingTotals?.contacts || 0; break;
                                case 'listingAptsSet': value = log.prospectingTotals?.listingAptsSet || 0; break;
                                case 'buyerAptsSet': value = log.prospectingTotals?.buyerAptsSet || 0; break;
                                case 'lenderAptsSet': value = log.prospectingTotals?.lenderAptsSet || 0; break;
                                default: value = log.pointsActivities?.[act.id] || 0;
                            }
                            return value > 0 ? <li key={act.id}>{act.name}: {value}</li> : null;
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


// --- MAIN PAGE COMPONENT ---
const DailyHabitsTrackerPage: React.FC = () => {
    const { user, userData } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [trackerData, setTrackerData] = useState<DailyTrackerData | null>(null);
    const [docId, setDocId] = useState<string | null>(null);
    const [exporting, setExporting] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const debounceTimeoutRef = useRef<number | null>(null);
    
    const [activeTab, setActiveTab] = useState<'tracker' | 'logs'>('tracker');
    const [allLogs, setAllLogs] = useState<DailyTrackerData[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
    const [exportingAll, setExportingAll] = useState(false);
    
    const lastSavedDataRef = useRef<DailyTrackerData | null>(null);
    
    const [habitSettings, setHabitSettings] = useState<HabitTrackerTemplate | null>(null);

    useEffect(() => {
      const fetchSettings = async () => {
        if (!user || !userData) {
          setHabitSettings({ id: 'fallback', name: 'Default', activities: defaultHabitActivities });
          return;
        }

        const settingsRef = collection(db, 'habitTrackerTemplates');
        let settingsDoc = null;
        
        // 1. Query for role-specific default
        const roleQuery = query(settingsRef, where('isDefaultForRole', '==', userData.role));
        const roleSnap = await getDocs(roleQuery);
        if (!roleSnap.empty) {
          settingsDoc = roleSnap.docs[0];
        }

        // 2. Fallback to agent default
        if (!settingsDoc && userData.role !== 'agent') {
           const agentQuery = query(settingsRef, where('isDefaultForRole', '==', 'agent'));
           const agentSnap = await getDocs(agentQuery);
           if (!agentSnap.empty) {
             settingsDoc = agentSnap.docs[0];
           }
        }

        if (settingsDoc && settingsDoc.exists()) {
          setHabitSettings({ id: settingsDoc.id, ...settingsDoc.data() } as HabitTrackerTemplate);
        } else {
          setHabitSettings({ id: 'fallback', name: 'Default', activities: defaultHabitActivities });
        }
      };

      fetchSettings();
    }, [user, userData]);

    const handleUpdate = useCallback((path: string, value: any) => {
        setTrackerData(prev => {
            if (!prev) return null;

            const keys = path.split('.');
            const newState = { ...prev };
            
            let currentLevel: any = newState;
            for (let i = 0; i < keys.length - 1; i++) {
                const key = keys[i];
                // Create new nested objects for immutability
                currentLevel[key] = { ...currentLevel[key] };
                currentLevel = currentLevel[key];
            }
            
            currentLevel[keys[keys.length - 1]] = value;
    
            return newState;
        });
    }, []);

    // --- DATA FETCHING & SAVING ---
    const saveData = useCallback(async () => {
        if (!user || !trackerData) return;
        setSaveStatus('saving');
        const batch = writeBatch(db);
        try {
            const { id, ...dataToSave } = trackerData; // Exclude client-side id from Firestore doc

            let currentDocId = docId;
            let docRef;

            if (currentDocId) {
                docRef = doc(db, 'dailyTrackers', currentDocId);
                batch.update(docRef, dataToSave);
            } else {
                docRef = doc(collection(db, 'dailyTrackers'));
                batch.set(docRef, dataToSave);
                setDocId(docRef.id); // Set the new ID for subsequent saves
                currentDocId = docRef.id;
            }

            // Calculate diff and update user metrics atomically
            if (lastSavedDataRef.current) {
                const callsDiff = (trackerData.dials || 0) - (lastSavedDataRef.current.dials || 0);
                const aptsDiff = (trackerData.prospectingTotals.aptsSet || 0) - (lastSavedDataRef.current.prospectingTotals.aptsSet || 0);

                if (callsDiff !== 0 || aptsDiff !== 0) {
                    const userDocRef = doc(db, 'users', user.uid);
                    const metricsUpdate: { [key: string]: any } = {};
                    if (callsDiff !== 0) metricsUpdate.calls = increment(callsDiff);
                    if (aptsDiff !== 0) metricsUpdate.appointments = increment(aptsDiff);
                    batch.update(userDocRef, metricsUpdate);
                }
            }
            
            await batch.commit();

            lastSavedDataRef.current = { ...trackerData, id: currentDocId };

            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (error) {
            console.error("Error saving tracker data:", error);
            alert("Error saving tracker data:\n" + (error as Error).message);
            setSaveStatus('idle');
        }
    }, [user, trackerData, docId]);
    
    useEffect(() => {
        if (loading || activeTab === 'logs' || !trackerData) return;
        if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
        
        debounceTimeoutRef.current = window.setTimeout(saveData, 1500);
        return () => { if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current); };
    }, [trackerData, loading, saveData, activeTab]);

    useEffect(() => {
        const loadTrackerData = async () => {
            if (!user) { setLoading(false); return; }
            setLoading(true);
            const dateString = currentDate.toISOString().split('T')[0];
            const collectionRef = collection(db, 'dailyTrackers');
            const q = query(collectionRef, where('date', '==', dateString), where('userId', '==', user.uid));
            
            try {
                const querySnapshot = await getDocs(q);
                let loadedData: DailyTrackerData;
                if (!querySnapshot.empty) {
                    const doc = querySnapshot.docs[0];
                    setDocId(doc.id);
                    loadedData = processDailyTrackerDoc(doc);
                    setTrackerData(loadedData);
                } else {
                    setDocId(null);
                    loadedData = getInitialTrackerData(user.uid, currentDate, userData?.teamId, userData?.marketCenterId, userData?.coachId);
                    setTrackerData(loadedData);
                }
                lastSavedDataRef.current = loadedData;
            } catch (error) {
                console.error("Error loading tracker data:", error);
                alert("Error loading tracker data:\n" + (error as Error).message);
                setDocId(null);
                const initialData = getInitialTrackerData(user.uid, currentDate, userData?.teamId, userData?.marketCenterId, userData?.coachId);
                setTrackerData(initialData);
                lastSavedDataRef.current = initialData;
            } finally {
                setLoading(false);
                setSaveStatus('idle');
            }
        };
        loadTrackerData();
    }, [user, userData, currentDate]);

    useEffect(() => {
        if (!trackerData) return;
        const { listingAptsSet = 0, buyerAptsSet = 0, lenderAptsSet = 0 } = trackerData.prospectingTotals;
        const totalApts = listingAptsSet + buyerAptsSet + lenderAptsSet;
        if (trackerData.prospectingTotals.aptsSet !== totalApts) {
            handleUpdate('prospectingTotals.aptsSet', totalApts);
        }
    }, [trackerData?.prospectingTotals.listingAptsSet, trackerData?.prospectingTotals.buyerAptsSet, trackerData?.prospectingTotals.lenderAptsSet, trackerData?.prospectingTotals.aptsSet, handleUpdate, trackerData]);

    useEffect(() => {
        if (activeTab === 'logs' && user) {
            setLoadingLogs(true);
            const logsQuery = query(collection(db, 'dailyTrackers'), where('userId', '==', user.uid), orderBy('date', 'desc'));
            getDocs(logsQuery).then(snapshot => {
                setAllLogs(snapshot.docs.map(doc => processDailyTrackerDoc(doc)));
                setLoadingLogs(false);
            }).catch(err => {
                console.error("Error fetching all logs:", err);
                setLoadingLogs(false);
            });
        }
    }, [activeTab, user]);

    const handleDateChange = (date: Date) => {
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        if (date > today) return;
        setCurrentDate(date);
    };

    const changeDay = (amount: number) => {
        const newDate = new Date(currentDate);
        newDate.setDate(currentDate.getDate() + amount);
        handleDateChange(newDate);
    };

    const handleExportPdf = () => {
        if (!trackerData) return;
        setExporting(true);
        const reportElement = document.getElementById('pdf-export-content');
        if (reportElement) {
            html2canvas(reportElement, { scale: 2, useCORS: true }).then(canvas => {
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF('p', 'px', 'a4');
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const newHeight = canvas.height * pdfWidth / canvas.width;
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, newHeight);
                pdf.save(`DailyTracker_${userData?.name || 'User'}_${trackerData.date}.pdf`);
                setExporting(false);
            }).catch(err => {
                console.error("Error exporting PDF:", err);
                alert("Sorry, there was an error exporting your report.");
                setExporting(false);
            });
        }
    };

    const handleExportAllLogs = () => {
        if (!allLogs.length || !habitSettings) return;
        setExportingAll(true);
        const reportElement = document.getElementById('pdf-export-all-content');
        if (reportElement) {
            html2canvas(reportElement, { scale: 2, useCORS: true }).then(canvas => {
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF('p', 'px', 'a4');
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();
                const canvasWidth = canvas.width;
                const canvasHeight = canvas.height;
                const ratio = canvasWidth / pdfWidth;
                const newHeight = canvasHeight / ratio;

                let position = 0;
                while (position < newHeight) {
                    pdf.addImage(imgData, 'PNG', 0, -position, pdfWidth, newHeight);
                    position += pdfHeight;
                    if (position < newHeight) {
                        pdf.addPage();
                    }
                }
               
                pdf.save(`DailyTracker_AllLogs_${userData?.name || 'User'}.pdf`);
            }).catch(err => {
                console.error("Error exporting all logs as PDF:", err);
                alert("Sorry, there was an error exporting your logs.");
            }).finally(() => {
                setExportingAll(false);
            });
        } else {
            setExportingAll(false);
        }
    };

    const totalPoints = calculateTotalPoints(trackerData, habitSettings);
    
    const isToday = useMemo(() => {
        const today = new Date();
        return currentDate.getFullYear() === today.getFullYear() &&
               currentDate.getMonth() === today.getMonth() &&
               currentDate.getDate() === today.getDate();
    }, [currentDate]);

    const TabButton: React.FC<{ tabId: 'tracker' | 'logs'; children: React.ReactNode }> = ({ tabId, children }) => (
        <button
            onClick={() => setActiveTab(tabId)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === tabId ? 'bg-primary text-on-accent' : 'text-text-secondary hover:bg-primary/10'}`}>
            {children}
        </button>
    );

    if (loading || !trackerData || !habitSettings) {
        return <div className="flex h-full w-full items-center justify-center"><Spinner className="w-8 h-8"/></div>;
    }

    return (
        <div className="h-full flex flex-col">
            <header className="p-4 sm:p-6 lg:p-8">
                <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-text-primary">Daily Tracker</h1>
                <p className="text-lg text-text-secondary mt-1">Consistency is the key to unlocking your potential.</p>
                <div className="mt-6 flex items-center gap-2 p-1 bg-surface rounded-lg w-fit">
                    <TabButton tabId="tracker"><ClipboardList size={16}/> Daily Tracker</TabButton>
                    <TabButton tabId="logs"><FileText size={16}/> My Logs</TabButton>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-8">
                {activeTab === 'tracker' ? (
                    <>
                        <div className="flex justify-between items-center flex-wrap gap-4 mb-6">
                             <div className="flex items-center gap-2 p-1 bg-surface rounded-lg">
                                <button onClick={() => changeDay(-1)} className="p-2 hover:bg-primary/10 rounded-md" aria-label="Previous day"><ChevronLeft size={16}/></button>
                                <input type="date" value={currentDate.toISOString().split('T')[0]} onChange={e => handleDateChange(new Date(e.target.value))} max={new Date().toISOString().split('T')[0]} className="bg-input border border-border rounded-md px-3 py-1.5 text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary"/>
                                <button onClick={() => changeDay(1)} disabled={isToday} className="p-2 hover:bg-primary/10 rounded-md disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Next day"><ChevronRight size={16}/></button>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1 text-sm text-text-secondary transition-opacity duration-300 w-24">
                                    {saveStatus === 'saving' && <><Spinner className="w-4 h-4"/><span>Saving...</span></>}
                                    {saveStatus === 'saved' && <div className="flex items-center gap-1"><CheckCircle size={16} className="text-success"/><span>Saved</span></div>}
                                </div>
                                <button onClick={saveData} disabled={saveStatus === 'saving' || saveStatus === 'saved'} className="flex items-center justify-center bg-accent-secondary text-on-accent font-semibold py-2 px-4 rounded-lg hover:bg-opacity-90 transition-colors disabled:opacity-50">
                                    <Save className="mr-2" size={16} />
                                    Save Log
                                </button>
                                <button onClick={handleExportPdf} disabled={exporting} className="flex items-center justify-center bg-accent text-on-accent font-semibold py-2 px-4 rounded-lg hover:bg-opacity-90 transition-colors disabled:opacity-50">
                                    {exporting ? <Spinner /> : <><Download className="mr-2" size={20} /> Export PDF</>}
                                </button>
                            </div>
                        </div>

                        
                        <Card className="mb-6">
                            <h2 className="text-xl font-bold mb-4">At a Glance for {currentDate.toLocaleDateString('en-CA')}</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                                <div className="bg-background/50 p-3 rounded-lg"><p className="text-sm text-text-secondary uppercase">Total Points</p><p className="text-4xl font-black text-primary">{totalPoints}</p></div>
                                <div className="bg-background/50 p-3 rounded-lg"><p className="text-sm text-text-secondary uppercase">Dials</p><p className="text-4xl font-bold text-text-primary">{trackerData.dials || 0}</p></div>
                                <div className="bg-background/50 p-3 rounded-lg"><p className="text-sm text-text-secondary uppercase">Apts Set</p><p className="text-4xl font-bold text-text-primary">{trackerData.prospectingTotals.aptsSet || 0}</p></div>
                            </div>
                        </Card>
                        
                        <div className="space-y-6">
                            <DailyMetricsSection data={trackerData} settings={habitSettings.activities} onUpdate={handleUpdate} />
                            <ProspectingSection sessions={trackerData.prospectingSessions} onUpdate={handleUpdate} />
                            <ScheduleSection schedule={trackerData.schedule} onUpdate={handleUpdate} />
                            <NotesSection notes={trackerData.notes} onUpdate={handleUpdate} />
                        </div>
                    </>
                ) : (
                    <Card>
                         <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-bold">Your Log History</h2>
                            {allLogs.length > 0 && (
                                <button 
                                    onClick={handleExportAllLogs} 
                                    disabled={exportingAll}
                                    className="flex items-center justify-center bg-accent text-on-accent font-semibold py-2 px-4 rounded-lg hover:bg-opacity-90 transition-colors disabled:opacity-50"
                                >
                                    {exportingAll ? <Spinner /> : <><Download className="mr-2" size={16} /> Export All Logs</>}
                                </button>
                            )}
                        </div>
                        {loadingLogs ? (
                            <div className="flex justify-center items-center py-8"><Spinner/></div>
                        ) : allLogs.length > 0 ? (
                            <div className="space-y-2">
                                {allLogs.map(log => {
                                    const isExpanded = expandedLogId === log.id;
                                    const date = new Date(log.date);
                                    date.setUTCHours(12);
                                    const formattedDate = date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
                                    return (
                                        <Card key={log.id} className="p-0 overflow-hidden">
                                            <button onClick={() => setExpandedLogId(isExpanded ? null : log.id)} className="w-full flex justify-between items-center p-4 text-left hover:bg-primary/5 transition-colors">
                                                <p className="font-bold text-text-primary">{formattedDate}</p>
                                                <div className="flex items-center gap-2 text-text-secondary">
                                                    <span>View Details</span>
                                                    <ChevronDown className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                                </div>
                                            </button>
                                            {isExpanded && <LogDetailView log={log} settings={habitSettings} />}
                                        </Card>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-center text-text-secondary py-8">You have no saved logs yet. Go to the "Daily Tracker" tab to start logging your activity!</p>
                        )}
                    </Card>
                )}
            </div>
            <div className="absolute -left-[9999px] -top-[9999px] opacity-0" aria-hidden="true">
                <PrintableTracker data={trackerData} settings={habitSettings} userName={userData?.name || 'Agent'} />
                {activeTab === 'logs' && allLogs.length > 0 && (
                     <PrintableAllLogs logs={allLogs} settings={habitSettings} userName={userData?.name || 'Agent'} />
                )}
            </div>
        </div>
    );
};

export default DailyHabitsTrackerPage;