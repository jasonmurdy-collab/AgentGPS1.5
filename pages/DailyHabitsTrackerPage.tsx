
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import type { DailyTrackerData, HabitTrackerTemplate, ProspectingTotals, HabitActivitySetting, TeamMember, ProspectingSession } from '../types';
import { Calendar, Clock, Edit2, Phone, Star, Download, ChevronLeft, ChevronRight, Minus, Plus, Target, FileText, ChevronDown, CheckCircle, Save, ClipboardList } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { getFirestoreInstance } from '../firebaseConfig';
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

const getInitialTrackerData = (userId: string, date: Date, teamId?: string | null, marketCenterId?: string | null): Omit<DailyTrackerData, 'id'> => {
    const dateString = date.toISOString().split('T')[0];
    const schedule: { [time: string]: string } = {};
    const times = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'];
    times.forEach(time => { schedule[time] = ''; });
    return {
        userId, date: dateString, teamId: teamId || null, marketCenterId: marketCenterId || null,
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

const PrintableTracker: React.FC<{ data: DailyTrackerData; settings: HabitTrackerTemplate; userName: string; }> = ({ data, settings, userName }) => {
    const totalPoints = calculateTotalPoints(data, settings);
    const date = new Date(data.date);
    date.setUTCHours(12);
    const formattedDate = date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
    const filledSchedule = Object.entries(data.schedule).filter(([, task]) => typeof task === 'string' && task.trim() !== '');

    return (
        <div id="pdf-export-content" className="p-10 bg-white text-gray-800 w-[827px] font-sans">
             <div className="text-center mb-6 border-b-2 border-primary pb-4">
                <h1 className="text-3xl font-bold text-primary">Daily Accountability Report</h1>
                <p className="text-lg text-gray-600 mt-1"><strong>{userName}</strong> - {formattedDate}</p>
            </div>
            {/* ... rest of printable content */}
        </div>
    );
};

// --- Reusable Components ---
const MetricStepper: React.FC<{ label: string; value: number; onUpdate: (newValue: number) => void; unit: string; points: number; }> = ({ label, value, onUpdate, unit, points }) => (
    <div className="bg-background/50 p-3 rounded-lg flex items-center justify-between">
        <div className="flex-1 pr-2">
            <p className="font-bold text-text-primary truncate">{label}</p>
            <p className="text-xs text-text-secondary">{points} {points === 1 ? 'pt' : 'pts'} / {unit}</p>
        </div>
        <div className="flex items-center gap-2">
            <button onClick={() => onUpdate(Math.max(0, value - 1))} className="w-8 h-8 flex items-center justify-center bg-primary/10 text-primary rounded-full hover:bg-primary/20"><Minus size={16}/></button>
            <input type="number" value={value} onChange={e => onUpdate(parseInt(e.target.value, 10) || 0)} className="w-16 text-center font-bold text-2xl bg-transparent"/>
            <button onClick={() => onUpdate(value + 1)} className="w-8 h-8 flex items-center justify-center bg-primary/10 text-primary rounded-full hover:bg-primary/20"><Plus size={16}/></button>
        </div>
    </div>
);

// ... other section components (Prospecting, Schedule, Notes) would go here, similar to Coach tracker

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
                setTrackerData(getInitialTrackerData(user.uid, currentDate, userData?.teamId, userData?.marketCenterId) as DailyTrackerData);
            } else {
                const doc = snapshot.docs[0];
                setDocId(doc.id);
                setTrackerData(processDailyTrackerDoc(doc));
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
        return <div className="flex h-full w-full items-center justify-center"><Spinner className="w-8 h-8"/></div>;
    }

    return (
        <div className="h-full flex flex-col">
            <header className="p-4 sm:p-6 lg:p-8">
                 <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-text-primary flex items-center gap-3"><ClipboardList/> Daily Habits Tracker</h1>
                 <p className="text-lg text-text-secondary mt-1">Track your daily lead generation and business building activities.</p>
            </header>
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-8 space-y-6">
                <div className="flex justify-between items-center flex-wrap gap-4">
                    <div className="flex items-center gap-2 p-1 bg-surface rounded-lg">
                        <button onClick={() => changeDay(-1)} className="p-2 hover:bg-primary/10 rounded-md"><ChevronLeft size={16}/></button>
                        <input type="date" value={currentDate.toISOString().split('T')[0]} onChange={e => setCurrentDate(new Date(e.target.value))} max={new Date().toISOString().split('T')[0]} className="bg-input border border-border rounded-md px-3 py-1.5 text-text-primary text-sm"/>
                        <button onClick={() => changeDay(1)} className="p-2 hover:bg-primary/10 rounded-md"><ChevronRight size={16}/></button>
                    </div>
                </div>

                <Card>
                    <h2 className="text-xl font-bold mb-4">At a Glance for {currentDate.toLocaleDateString('en-CA')}</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                        <div className="bg-background/50 p-3 rounded-lg"><p className="text-sm text-text-secondary uppercase">Total Points</p><p className="text-4xl font-black text-primary">{totalPoints}</p></div>
                        <div className="bg-background/50 p-3 rounded-lg"><p className="text-sm text-text-secondary uppercase">Calls Made</p><p className="text-4xl font-bold text-text-primary">{trackerData.dials || 0}</p></div>
                        <div className="bg-background/50 p-3 rounded-lg"><p className="text-sm text-text-secondary uppercase">Appointments Set</p><p className="text-4xl font-bold text-text-primary">{trackerData.prospectingTotals.aptsSet || 0}</p></div>
                    </div>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-6">
                         <Card>
                            <h2 className="text-2xl font-bold mb-4 flex items-center gap-3"><Target/> Daily Metrics</h2>
                            <div className="grid grid-cols-1 gap-4">
                                {habitSettings.activities.map(activity => (
                                    <MetricStepper 
                                        key={activity.id}
                                        label={activity.name} 
                                        value={getMetricValue(trackerData, activity.id)} 
                                        onUpdate={(val) => handleUpdate(activity.id.includes('pointsActivities') ? activity.id : `pointsActivities.${activity.id}`, val)}
                                        unit={activity.unit}
                                        points={activity.worth}
                                    />
                                ))}
                            </div>
                        </Card>
                    </div>
                     <div className="space-y-6">
                        {/* Prospecting, Schedule, Notes sections would go here */}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DailyHabitsTrackerPage;
