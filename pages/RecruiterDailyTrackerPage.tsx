import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import type { DailyTrackerData, HabitTrackerTemplate, HabitActivitySetting, ProspectingSession } from '../types';
import { Calendar, Download, ChevronLeft, ChevronRight, Minus, Plus, Target, FileText, ChevronDown, CheckCircle, Save, ClipboardList, UserSearch } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { getFirestoreInstance } from '../firebaseConfig'; // Fix: Import getFirestoreInstance
import { doc, getDoc, setDoc, collection, query, where, orderBy, getDocs, addDoc, updateDoc } from 'firebase/firestore';

// --- DEFAULT DATA & HELPERS ---
const defaultRecruiterHabitActivities: HabitActivitySetting[] = [
    { id: 'recruitingCalls', name: 'Recruiting Calls', worth: 1, unit: 'call' },
    { id: 'recruitingContacts', name: 'Meaningful Conversations', worth: 2, unit: 'conversation' },
    { id: 'recruitingAptsSet', name: 'Appointments Set', worth: 10, unit: 'appt' },
    { id: 'recruitingAptsHeld', name: 'Appointments Held', worth: 20, unit: 'appt' },
    { id: 'newAgentsSigned', name: 'New Agents Signed', worth: 50, unit: 'agent' },
    { id: 'followUpMessages', name: 'Follow-up Messages', worth: 1, unit: 'message' },
    { id: 'socialOutreach', name: 'Social Media Outreach', worth: 2, unit: 'outreach' },
    { id: 'networkingEvent', name: 'Networking Event (Hours)', worth: 5, unit: 'hour' },
];

const getInitialTrackerData = (userId: string, date: Date, teamId?: string, marketCenterId?: string): DailyTrackerData => {
    const dateString = date.toISOString().split('T')[0];
    const schedule: { [time: string]: string } = {};
    const times = [
        '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
        '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
        '16:00', '16:30', '17:00'
    ];
    times.forEach(time => { schedule[time] = ''; });
    return {
        userId, date: dateString, teamId: teamId || null, marketCenterId: marketCenterId || null, dials: 0,
        doorsKnocked: 0, knocksAnswered: 0,
        pointsActivities: {}, prospectingSessions: [{ startTime: '09:00', endTime: '12:00' }, { startTime: '', endTime: '' }],
        prospectingTotals: { contacts: 0, aptsSet: 0, listingAptsSet: 0, buyerAptsSet: 0, lenderAptsSet: 0 },
        notes: '', schedule,
    };
};

const calculateTotalPoints = (data: DailyTrackerData | null, settings: HabitTrackerTemplate | null): number => {
    if (!data || !settings?.activities) return 0;
    return settings.activities.reduce((total, activity) => {
        const count = data.pointsActivities?.[activity.id] || 0;
        return total + (count * activity.worth);
    }, 0);
};

const PrintableTracker: React.FC<{ data: DailyTrackerData; settings: HabitTrackerTemplate; userName: string; }> = ({ data, settings, userName }) => {
    const totalPoints = calculateTotalPoints(data, settings);
    const date = new Date(data.date);
    date.setUTCHours(12);
    const formattedDate = date.toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC'
    });
    
    const filledSchedule = Object.entries(data.schedule).filter(([, task]) => typeof task === 'string' && task.trim() !== '');

    return (
        <div id="pdf-export-content-recruiter" className="p-10 bg-white text-gray-800 w-[827px] font-sans">
            <div className="text-center mb-6 border-b-2 border-[var(--color-accent)] pb-4">
                <h1 className="text-3xl font-bold text-[var(--color-accent)]">Recruiter Daily Report</h1>
                <p className="text-lg text-gray-600 mt-1"><strong>{userName}</strong> - {formattedDate}</p>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center mb-6 bg-gray-100 p-4 rounded-lg">
                <div><p className="text-sm font-semibold text-gray-600">Total Points</p><p className="text-3xl font-bold text-[var(--color-accent)]">{totalPoints}</p></div>
                <div><p className="text-sm font-semibold text-gray-600">Recruiting Calls</p><p className="text-3xl font-bold">{data.pointsActivities?.recruitingCalls || 0}</p></div>
                <div><p className="text-sm font-semibold text-gray-600">Appts Set</p><p className="text-3xl font-bold">{data.pointsActivities?.recruitingAptsSet || 0}</p></div>
            </div>
            
            <div className="grid grid-cols-2 gap-8">
                <div>
                    <h2 className="text-xl font-bold border-b border-gray-300 pb-2 mb-3">Daily Metrics Log</h2>
                     <ul className="space-y-1 text-sm">
                        {settings.activities.map(activity => {
                            const value = data.pointsActivities?.[activity.id] || 0;
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

// --- MEMOIZED CHILD COMPONENTS ---
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

const DailyMetricsSection: React.FC<{ data: DailyTrackerData; settings: HabitActivitySetting[]; onUpdate: (path: string, value: any) => void; }> = ({ data, settings, onUpdate }) => (
    <Card>
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-3"><Target/> Daily Recruiting Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {settings.map(activity => (
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
        <textarea value={notes} onChange={e => onUpdate('notes', e.target.value)} className="w-full min-h-[150px] bg-input border border-border rounded-md p-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Log wins, challenges, breakthroughs, and important conversations with recruits..."/>
    </Card>
);

// --- MAIN PAGE COMPONENT ---
const RecruiterDailyTrackerPage: React.FC = () => {
    const { user, userData } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [trackerData, setTrackerData] = useState<DailyTrackerData | null>(null);
    const [docId, setDocId] = useState<string | null>(null);
    const [exporting, setExporting] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const debounceTimeoutRef = useRef<number | null>(null);
    
    const [habitSettings, setHabitSettings] = useState<HabitTrackerTemplate | null>(null);

    useEffect(() => {
      const fetchSettings = async () => {
        if (!user) return;
        const settingsRef = collection(getFirestoreInstance(), 'habitTrackerTemplates'); // Fix: Use getFirestoreInstance()
        const roleQuery = query(settingsRef, where('isDefaultForRole', '==', 'recruiter'));
        const roleSnap = await getDocs(roleQuery);
        
        let settingsDoc = null;
        if (!roleSnap.empty) {
          settingsDoc = roleSnap.docs[0];
        }

        if (settingsDoc && settingsDoc.exists()) {
          setHabitSettings({ id: settingsDoc.id, ...settingsDoc.data() } as HabitTrackerTemplate);
        } else {
          setHabitSettings({ id: 'fallback', name: 'Default Recruiter', activities: defaultRecruiterHabitActivities });
        }
      };
      fetchSettings();
    }, [user]);

    const handleUpdate = useCallback((path: string, value: any) => {
        setTrackerData(prev => {
            if (!prev) return null;
            const keys = path.split('.');
            const newState = JSON.parse(JSON.stringify(prev)); // Deep copy
            let currentLevel: any = newState;
            for (let i = 0; i < keys.length - 1; i++) {
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
            const collectionRef = collection(getFirestoreInstance(), 'dailyTrackers'); // Fix: Use getFirestoreInstance()
            const { id, ...dataToSave } = trackerData;
            if (docId) {
                await updateDoc(doc(collectionRef, docId), dataToSave);
            } else {
                const newDocRef = await addDoc(collectionRef, dataToSave);
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
        const loadTrackerData = async () => {
            if (!user) { setLoading(false); return; }
            setLoading(true);
            const dateString = currentDate.toISOString().split('T')[0];
            const q = query(collection(getFirestoreInstance(), 'dailyTrackers'), where('userId', '==', user.uid), where('date', '==', dateString)); // Fix: Use getFirestoreInstance()
            try {
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    const doc = querySnapshot.docs[0];
                    setDocId(doc.id);
                    setTrackerData({ id: doc.id, ...doc.data() } as DailyTrackerData);
                } else {
                    setDocId(null);
                    setTrackerData(getInitialTrackerData(user.uid, currentDate, userData?.teamId, userData?.marketCenterId));
                }
            } catch (error) {
                console.error("Error loading tracker data:", error);
                setDocId(null);
                setTrackerData(getInitialTrackerData(user.uid, currentDate, userData?.teamId, userData?.marketCenterId));
            } finally {
                setLoading(false);
            }
        };
        loadTrackerData();
    }, [user, userData, currentDate]);

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
        if (!trackerData || !habitSettings) return;
        setExporting(true);
        const reportElement = document.getElementById('pdf-export-content-recruiter');
        if (reportElement) {
            html2canvas(reportElement, { scale: 2, useCORS: true }).then(canvas => {
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF('p', 'px', 'a4');
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const newHeight = canvas.height * pdfWidth / canvas.width;
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, newHeight);
                pdf.save(`RecruiterTracker_${userData?.name || 'User'}_${trackerData.date}.pdf`);
            }).catch(err => {
                console.error("Error exporting PDF:", err);
            }).finally(() => {
                setExporting(false);
            });
        } else {
            setExporting(false);
        }
    };

    const totalPoints = calculateTotalPoints(trackerData, habitSettings);
    
    const isToday = useMemo(() => {
        const today = new Date();
        return currentDate.getFullYear() === today.getFullYear() &&
               currentDate.getMonth() === today.getMonth() &&
               currentDate.getDate() === today.getDate();
    }, [currentDate]);

    if (loading || !trackerData || !habitSettings) {
        return <div className="flex h-full w-full items-center justify-center"><Spinner className="w-8 h-8" /></div>;
    }

    return (
        <div className="h-full flex flex-col">
            <header className="p-4 sm:p-6 lg:p-8">
                <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-text-primary flex items-center gap-3"><UserSearch/> Recruiter Daily Tracker</h1>
                <p className="text-lg text-text-secondary mt-1">Track your high-leverage recruiting activities.</p>
            </header>

            <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-8">
                <div className="flex justify-between items-center flex-wrap gap-4 mb-6">
                    <div className="flex items-center gap-2 p-1 bg-surface rounded-lg">
                        <button onClick={() => changeDay(-1)} className="p-2 hover:bg-primary/10 rounded-md"><ChevronLeft size={16}/></button>
                        <input type="date" value={currentDate.toISOString().split('T')[0]} onChange={e => handleDateChange(new Date(e.target.value))} max={new Date().toISOString().split('T')[0]} className="bg-input border border-border rounded-md px-3 py-1.5 text-text-primary text-sm"/>
                        <button onClick={() => changeDay(1)} disabled={isToday} className="p-2 hover:bg-primary/10 rounded-md disabled:opacity-50"><ChevronRight size={16}/></button>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1 text-sm text-text-secondary w-24">
                            {saveStatus === 'saving' && <><Spinner className="w-4 h-4"/><span>Saving...</span></>}
                            {saveStatus === 'saved' && <><CheckCircle size={16} className="text-success"/><span>Saved</span></>}
                        </div>
                        <button onClick={saveData} disabled={saveStatus !== 'idle'} className="flex items-center justify-center bg-accent-secondary text-on-accent font-semibold py-2 px-4 rounded-lg disabled:opacity-50"><Save className="mr-2" size={16} /> Save Log</button>
                        <button onClick={handleExportPdf} disabled={exporting} className="flex items-center justify-center bg-accent text-on-accent font-semibold py-2 px-4 rounded-lg disabled:opacity-50">{exporting ? <Spinner /> : <><Download className="mr-2" size={20} /> Export</>}</button>
                    </div>
                </div>
                
                <Card className="mb-6">
                    <h2 className="text-xl font-bold mb-4">At a Glance for {currentDate.toLocaleDateString('en-CA')}</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                        <div className="bg-background/50 p-3 rounded-lg"><p className="text-sm text-text-secondary uppercase">Total Points</p><p className="text-4xl font-black text-primary">{totalPoints}</p></div>
                        <div className="bg-background/50 p-3 rounded-lg"><p className="text-sm text-text-secondary uppercase">Recruiting Calls</p><p className="text-4xl font-bold text-text-primary">{trackerData.pointsActivities?.recruitingCalls || 0}</p></div>
                        <div className="bg-background/50 p-3 rounded-lg"><p className="text-sm text-text-secondary uppercase">Appts Set</p><p className="text-4xl font-bold text-text-primary">{trackerData.pointsActivities?.recruitingAptsSet || 0}</p></div>
                    </div>
                </Card>
                
                <div className="space-y-6">
                    <DailyMetricsSection data={trackerData} settings={habitSettings.activities} onUpdate={handleUpdate} />
                    <ScheduleSection schedule={trackerData.schedule} onUpdate={handleUpdate} />
                    <NotesSection notes={trackerData.notes} onUpdate={handleUpdate} />
                </div>
            </div>
            <div className="absolute -left-[9999px] -top-[9999px] opacity-0" aria-hidden="true">
                <PrintableTracker data={trackerData} settings={habitSettings} userName={userData?.name || 'Recruiter'} />
            </div>
        </div>
    );
};

export default RecruiterDailyTrackerPage;