import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import type { DailyTrackerData, HabitTrackerTemplate, HabitActivitySetting, ProspectingSession } from '../types';
import { Calendar, Clock, Star, ChevronLeft, ChevronRight, Minus, Plus, Target, FileText, CheckCircle, Save, ClipboardList } from 'lucide-react';
import { getFirestoreInstance } from '../firebaseConfig';
import { doc, collection, query, where, getDocs, addDoc, updateDoc } from 'firebase/firestore';
import { processDailyTrackerDoc } from '../lib/firestoreUtils';

// --- DEFAULT DATA & HELPERS ---
const defaultHabitActivities: (HabitActivitySetting & { category?: string })[] = [
    { id: 'calls', name: 'Calls Made', worth: 1, unit: 'call', category: 'Lead Generation' },
    { id: 'doorsKnocked', name: 'Doors Knocked', worth: 1, unit: 'knock', category: 'Lead Generation' },
    { id: 'knocksAnswered', name: 'Knocks Answered', worth: 2, unit: 'answer', category: 'Lead Generation' },
    { id: 'contacts', name: 'Meaningful Contacts', worth: 2, unit: 'contact', category: 'Lead Generation' },
    { id: 'listingAptsSet', name: 'Listing Appointments Set', worth: 10, unit: 'appt', category: 'Appointments' },
    { id: 'buyerAptsSet', name: 'Buyer Appointments Set', worth: 5, unit: 'appt', category: 'Appointments' },
    { id: 'lenderAptsSet', name: 'Lender Appointments Set', worth: 3, unit: 'appt', category: 'Appointments' },
    { id: 'agreements', name: 'Agreements Signed', worth: 20, unit: 'agreement', category: 'Conversions' },
    { id: 'notes', name: 'Handwritten Notes', worth: 2, unit: 'note', category: 'Marketing' },
    { id: 'closings', name: 'Closings', worth: 50, unit: 'closing', category: 'Conversions' },
    { id: 'open_house_hours', name: 'Open House Hours', worth: 10, unit: 'hour', category: 'Lead Generation' },
    { id: 'social_posts', name: 'Social Media Posts', worth: 2, unit: 'post', category: 'Marketing' },
    { id: 'video_content', name: 'Video Content Created', worth: 5, unit: 'video', category: 'Marketing' },
    { id: 'new_leads', name: 'New Leads Added', worth: 1, unit: 'lead', category: 'Lead Generation' },
];

const getInitialTrackerData = (userId: string, date: Date, teamId?: string | null, marketCenterId?: string | null, coachId?: string | null): Omit<DailyTrackerData, 'id'> => {
    const dateString = date.toISOString().split('T')[0];
    const schedule: { [time: string]: string } = {};
    const times = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'];
    times.forEach(time => { schedule[time] = ''; });
    return {
        userId, date: dateString, teamId: teamId || null, marketCenterId: marketCenterId || null, coachId: coachId || null,
        dials: 0, doorsKnocked: 0, knocksAnswered: 0,
        pointsActivities: {},
        prospectingSessions: [{ startTime: '09:00', endTime: '11:00' }, { startTime: '14:00', endTime: '16:00' }],
        prospectingTotals: { contacts: 0, aptsSet: 0, listingAptsSet: 0, buyerAptsSet: 0, lenderAptsSet: 0 },
        notes: '', schedule,
    };
};

const getMetricValue = (data: DailyTrackerData, activityId: string): number => {
    switch(activityId) {
        case 'calls': return data.dials || 0;
        case 'doorsKnocked': return data.doorsKnocked || 0;
        case 'knocksAnswered': return data.knocksAnswered || 0;
        case 'contacts': return data.prospectingTotals?.contacts || 0;
        case 'listingAptsSet': return data.prospectingTotals?.listingAptsSet || 0;
        case 'buyerAptsSet': return data.prospectingTotals?.buyerAptsSet || 0;
        case 'lenderAptsSet': return data.prospectingTotals?.lenderAptsSet || 0;
        // Fix: Changed 'activity.id' to 'activityId' to correctly reference the function parameter.
        default: return data.pointsActivities?.[activityId] || 0;
    }
};

const calculateTotalPoints = (data: DailyTrackerData | null, settings: HabitTrackerTemplate | null): number => {
    if (!data || !settings?.activities) return 0;
    return settings.activities.reduce((total, activity) => {
        const count = getMetricValue(data, activity.id);
        return total + (count * activity.worth);
    }, 0);
};

// --- Reusable Components ---
const MetricStepper: React.FC<{ label: string; value: number; onUpdate: (newValue: number) => void; unit: string; points: number; }> = React.memo(({ label, value, onUpdate, unit, points }) => (
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
));

const ProspectingSessionSection: React.FC<{ sessions: [ProspectingSession, ProspectingSession]; onUpdate: (path: string, value: any) => void; }> = React.memo(({ sessions, onUpdate }) => (
    <Card>
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-3"><Clock/> Prospecting Sessions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sessions.map((session, index) => (
                <div key={index} className="bg-background/50 p-3 rounded-lg">
                    <h3 className="font-semibold mb-2">Session {index + 1}</h3>
                    <div className="flex items-center gap-2">
                        <input type="time" value={session.startTime} onChange={e => onUpdate(`prospectingSessions.${index}.startTime`, e.target.value)} className="w-full bg-input border border-border rounded-md px-2 py-1 text-sm"/>
                        <span>to</span>
                        <input type="time" value={session.endTime} onChange={e => onUpdate(`prospectingSessions.${index}.endTime`, e.target.value)} className="w-full bg-input border border-border rounded-md px-2 py-1 text-sm"/>
                    </div>
                </div>
            ))}
        </div>
    </Card>
));

const ScheduleSection: React.FC<{ schedule: { [time: string]: string }; onUpdate: (path: string, value: any) => void; }> = React.memo(({ schedule, onUpdate }) => {
    const formatTime = (time24: string) => {
        if (!time24) return '';
        const [hour, minute] = time24.split(':');
        const h = parseInt(hour, 10);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const displayHour = h % 12 === 0 ? 12 : h % 12;
        return `${displayHour}:${minute} ${ampm}`;
    };

    const activeBlocks = Object.entries(schedule)
        .filter(([, task]) => task && task.trim() !== '')
        .sort(([a], [b]) => a.localeCompare(b));

    const addTimeBlock = () => {
        const time = prompt("Enter time (e.g. 09:00 or 14:30):");
        if (time && /^([01]\d|2[0-3]):([0-5]\d)$/.test(time)) {
            onUpdate(`schedule.${time}`, ' ');
        } else if (time) {
            alert("Please enter time in HH:MM format");
        }
    };

    return (
        <Card className="p-0 overflow-hidden">
            <div className="w-full flex justify-between items-center p-4 text-left">
                <h2 className="text-2xl font-bold flex items-center gap-3"><Calendar/> Today's Agenda</h2>
                <button 
                    onClick={addTimeBlock}
                    className="flex items-center gap-1 text-sm bg-primary/10 text-primary px-3 py-1 rounded-full hover:bg-primary/20 transition-colors"
                >
                    <Plus size={14} /> Add Block
                </button>
            </div>
            <div className="p-4 border-t border-border">
                <div className="space-y-3">
                    {activeBlocks.length === 0 ? (
                        <p className="text-sm text-text-secondary italic text-center py-4">No agenda items yet. Click "Add Block" to start planning your day.</p>
                    ) : (
                        activeBlocks.map(([time, task]) => (
                            <div key={time} className="flex items-start gap-3 group">
                                <div className="w-20 pt-2 text-xs font-bold text-text-secondary uppercase tracking-wider">{formatTime(time)}</div>
                                <div className="flex-1">
                                    <input 
                                        type="text" 
                                        value={task} 
                                        onChange={e => onUpdate(`schedule.${time}`, e.target.value)} 
                                        className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                                        placeholder="What are you doing at this time?"
                                    />
                                </div>
                                <button 
                                    onClick={() => onUpdate(`schedule.${time}`, '')}
                                    className="pt-2 text-text-secondary opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all"
                                >
                                    <Minus size={14} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </Card>
    );
});

const NotesSection: React.FC<{ notes: string; onUpdate: (path: string, value: any) => void; }> = React.memo(({ notes, onUpdate }) => (
    <Card>
        <h2 className="text-2xl font-bold mb-2 flex items-center gap-3"><FileText/> Key Conversations & Wins</h2>
        <textarea value={notes} onChange={e => onUpdate('notes', e.target.value)} className="w-full min-h-[150px] bg-input border border-border rounded-md p-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Log wins, challenges, breakthroughs, and important conversations..."/>
    </Card>
));


const DailyHabitsTrackerPage: React.FC = () => {
    const { user, userData } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [trackerData, setTrackerData] = useState<DailyTrackerData | null>(null);
    const [docId, setDocId] = useState<string | null>(null);
    const [habitSettings, setHabitSettings] = useState<HabitTrackerTemplate | null>(null);
    const [loading, setLoading] = useState(true);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const debounceTimeoutRef = useRef<number | null>(null);
    
    useEffect(() => {
        const fetchSettings = async () => {
            if (!user) return;
            const settingsRef = collection(getFirestoreInstance(), 'habitTrackerTemplates');
            const roleQuery = query(settingsRef, where('isDefaultForRole', '==', 'agent'));
            const roleSnap = await getDocs(roleQuery);
            if (!roleSnap.empty && roleSnap.docs[0].exists()) {
                setHabitSettings({ id: roleSnap.docs[0].id, ...roleSnap.docs[0].data() } as HabitTrackerTemplate);
            } else {
                setHabitSettings({ id: 'fallback', name: 'Default Agent', activities: defaultHabitActivities });
            }
        };
        fetchSettings();
    }, [user]);

    const handleUpdate = useCallback((path: string, value: any) => {
        setTrackerData(prev => {
            if (!prev) return null;
            const keys = path.split('.');
            const newState = { ...prev };
            let currentLevel: any = newState;
            for (let i = 0; i < keys.length - 1; i++) {
                currentLevel[keys[i]] = { ...currentLevel[keys[i]] };
                currentLevel = currentLevel[keys[i]];
            }
            currentLevel[keys[keys.length - 1]] = value;
            return newState;
        });
    }, []);

    const saveData = useCallback(async () => {
        if (!user || !trackerData) return;
        setSaveStatus('saving');
        try {
            const { id, ...dataToSave } = trackerData;
            if (docId) {
                await updateDoc(doc(getFirestoreInstance(), 'dailyTrackers', docId), dataToSave);
            } else {
                const newDocRef = await addDoc(collection(getFirestoreInstance(), 'dailyTrackers'), dataToSave);
                setDocId(newDocRef.id);
            }
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (error) {
            console.error("Error saving tracker data:", error);
            setSaveStatus('idle');
        }
    }, [user, trackerData, docId]);
    
    useEffect(() => {
        if (loading || !trackerData) return;
        if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = window.setTimeout(saveData, 1500);
        return () => { if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current); };
    }, [trackerData, loading, saveData]);

    useEffect(() => {
        const loadData = async () => {
            if (!user || !habitSettings) { setLoading(false); return; }
            setLoading(true);
            const dateString = currentDate.toISOString().split('T')[0];
            const q = query(collection(getFirestoreInstance(), 'dailyTrackers'), where('userId', '==', user.uid), where('date', '==', dateString));
            const snapshot = await getDocs(q);
            if (snapshot.empty) {
                setDocId(null);
                setTrackerData(getInitialTrackerData(user.uid, currentDate, userData?.teamId, userData?.marketCenterId, userData?.coachId) as DailyTrackerData);
            } else {
                const docSnap = snapshot.docs[0];
                setDocId(docSnap.id);
                setTrackerData(processDailyTrackerDoc(docSnap));
            }
            setLoading(false);
        };
        loadData();
    }, [user, userData, currentDate, habitSettings]);
    
    const changeDay = (amount: number) => {
        const newDate = new Date(currentDate);
        newDate.setDate(currentDate.getDate() + amount);
        const today = new Date();
        if (newDate > today) return;
        setCurrentDate(newDate);
    };

    const totalPoints = calculateTotalPoints(trackerData, habitSettings);

    if (loading || !trackerData || !habitSettings) {
        return <div className="flex h-full w-full items-center justify-center"><Spinner className="w-8 h-8" /></div>;
    }

    return (
        <div className="h-full flex flex-col">
            <header className="p-4 sm:p-6 lg:p-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                 <div>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-text-primary flex items-center gap-3"><ClipboardList/> Daily Habits Tracker</h1>
                    <p className="text-lg text-text-secondary mt-1">Track your daily lead generation and business building activities.</p>
                 </div>
                 <div className="flex items-center gap-3 bg-surface p-2 rounded-xl border border-border">
                    {saveStatus === 'saving' ? (
                        <div className="flex items-center gap-2 text-primary text-sm font-medium">
                            <Spinner className="w-4 h-4" /> Saving...
                        </div>
                    ) : saveStatus === 'saved' ? (
                        <div className="flex items-center gap-2 text-emerald-500 text-sm font-medium">
                            <CheckCircle size={16} /> All changes saved
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-text-secondary text-sm font-medium">
                            <Save size={16} /> Auto-save active
                        </div>
                    )}
                 </div>
            </header>
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-8 space-y-6">
                <div className="flex justify-between items-center flex-wrap gap-4">
                    <div className="flex items-center gap-2 p-1 bg-surface rounded-lg">
                        <button onClick={() => changeDay(-1)} className="p-2 hover:bg-primary/10 rounded-md"><ChevronLeft size={16}/></button>
                        <input type="date" value={currentDate.toISOString().split('T')[0]} onChange={e => setCurrentDate(new Date(e.target.value))} max={new Date().toISOString().split('T')[0]} className="bg-input border border-border rounded-md px-3 py-1.5 text-text-primary text-sm"/>
                        <button onClick={() => changeDay(1)} className="p-2 hover:bg-primary/10 rounded-md"><ChevronRight size={16}/></button>
                    </div>
                </div>

                <Card className="relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-border">
                        <div 
                            className="h-full bg-primary transition-all duration-1000 ease-out" 
                            style={{ width: `${Math.min(100, (totalPoints / 100) * 100)}%` }}
                        />
                    </div>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                        <h2 className="text-xl font-bold">At a Glance for {currentDate.toLocaleDateString('en-CA')}</h2>
                        <div className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full">
                            <Star className="text-primary" size={18} />
                            <span className="font-bold text-primary">{totalPoints} / 100 <span className="text-xs font-normal opacity-70">Daily Goal</span></span>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                        <div className="bg-background/50 p-4 rounded-xl border border-border/50">
                            <p className="text-xs text-text-secondary uppercase font-bold tracking-widest mb-1">Total Points</p>
                            <p className="text-4xl font-black text-primary">{totalPoints}</p>
                        </div>
                        <div className="bg-background/50 p-4 rounded-xl border border-border/50">
                            <p className="text-xs text-text-secondary uppercase font-bold tracking-widest mb-1">Calls Made</p>
                            <p className="text-4xl font-bold text-text-primary">{trackerData.dials || 0}</p>
                        </div>
                        <div className="bg-background/50 p-4 rounded-xl border border-border/50">
                            <p className="text-xs text-text-secondary uppercase font-bold tracking-widest mb-1">Appointments Set</p>
                            <p className="text-4xl font-bold text-text-primary">{trackerData.prospectingTotals.aptsSet || 0}</p>
                        </div>
                    </div>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-6">
                         <Card>
                            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3"><Target/> Daily Metrics</h2>
                            <div className="space-y-8">
                                {Array.from(new Set(habitSettings.activities.map(a => (a as any).category || 'Other'))).map(category => (
                                    <div key={category}>
                                        <h3 className="text-sm font-bold text-text-secondary uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <span className="w-2 h-2 bg-primary rounded-full"></span>
                                            {category}
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {habitSettings.activities.filter(a => ((a as any).category || 'Other') === category).map(activity => (
                                                <MetricStepper 
                                                    key={activity.id}
                                                    label={activity.name} 
                                                    value={getMetricValue(trackerData, activity.id)} 
                                                    onUpdate={(val) => {
                                                        const path = ({
                                                            'calls': 'dials',
                                                            'doorsKnocked': 'doorsKnocked',
                                                            'knocksAnswered': 'knocksAnswered',
                                                            'contacts': 'prospectingTotals.contacts',
                                                            'listingAptsSet': 'prospectingTotals.listingAptsSet',
                                                            'buyerAptsSet': 'prospectingTotals.buyerAptsSet',
                                                            'lenderAptsSet': 'prospectingTotals.lenderAptsSet',
                                                        } as Record<string, string>)[activity.id] || `pointsActivities.${activity.id}`;
                                                        handleUpdate(path, val);
                                                    }}
                                                    unit={activity.unit}
                                                    points={activity.worth}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>
                     <div className="space-y-6">
                        <ProspectingSessionSection sessions={trackerData.prospectingSessions} onUpdate={handleUpdate} />
                        <ScheduleSection schedule={trackerData.schedule} onUpdate={handleUpdate} />
                        <NotesSection notes={trackerData.notes} onUpdate={handleUpdate} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DailyHabitsTrackerPage;