import { useQuery } from '@tanstack/react-query';
import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Calendar as CalendarIcon, HelpCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getFirestoreInstance } from '../firebaseConfig';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { Spinner } from '../components/ui/Spinner';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import axios from 'axios';

const CalendarPage: React.FC = () => {
    const { user, userData } = useAuth();
    const [viewMode, setViewMode] = useState<'mc' | 'personal'>('mc');
    const [showHelp, setShowHelp] = useState(false);
    const [hasIntegration, setHasIntegration] = useState(true);

    const defaultCalendarUrl = "https://calendar.google.com/calendar/embed?height=600&wkst=1&bgcolor=%23ffffff&ctz=America%2FNew_York&src=ZW4udXNhI2hvbGlkYXlAZ3JvdXAudi5jYWxlbmRhci5nb29nbGUuY29t&color=%230B8043";

    const { data: mcCalendarUrl, isLoading: isMcLoading } = useQuery({
        queryKey: ['mcCalendar', userData?.marketCenterId],
        queryFn: async () => {
            if (!userData?.marketCenterId) return defaultCalendarUrl;
            const db = getFirestoreInstance();
            const mcDocSnap = await getDoc(doc(db, 'marketCenters', userData.marketCenterId));
            return mcDocSnap.exists() ? (mcDocSnap.data().calendarEmbedUrl || defaultCalendarUrl) : defaultCalendarUrl;
        },
        enabled: viewMode === 'mc'
    });

    const { data: googleEvents, isLoading: isGoogleLoading, error: googleError } = useQuery({
        queryKey: ['googleEvents', user?.uid],
        queryFn: async () => {
            if (!user) return [];
            const db = getFirestoreInstance();
            const integrationDoc = await getDoc(doc(db, 'userIntegrations', user.uid));
            if (!integrationDoc.exists()) {
                setHasIntegration(false);
                return [];
            }
            setHasIntegration(true);
            const res = await axios.post('/api/calendar/list-events', { userId: user.uid });
            return res.data.events.map((e: any) => ({
                title: e.summary,
                start: e.start.dateTime || e.start.date,
                end: e.end.dateTime || e.end.date,
                backgroundColor: '#3b82f6'
            }));
        },
        enabled: viewMode === 'personal' && !!user
    });

    const { data: liveSessions, isLoading: isSessionsLoading, error: sessionsError } = useQuery({
        queryKey: ['liveSessions', user?.uid],
        queryFn: async () => {
            if (!user) return [];
            const db = getFirestoreInstance();
            const sessionsQuery = query(collection(db, 'liveSessions'), where('attendees', 'array-contains', user.email || ''));
            const sessionsSnap = await getDocs(sessionsQuery);
            return sessionsSnap.docs.map(doc => ({
                title: doc.data().title,
                start: doc.data().startTime,
                end: doc.data().endTime,
                backgroundColor: '#10b981'
            }));
        },
        enabled: viewMode === 'personal' && !!user
    });

    const personalEvents = [...(googleEvents || []), ...(liveSessions || [])];
    const isPersonalLoading = isGoogleLoading || isSessionsLoading;
    const personalError = googleError || sessionsError;

    const handleConnectCalendar = async () => {
        if (!user) return;
        try {
            const res = await axios.get(`/api/auth/google-calendar-url?userId=${user.uid}`);
            const authWindow = window.open(res.data.url, 'oauth_popup', 'width=600,height=700');
            if (!authWindow) {
                alert('Please allow popups for this site to connect your calendar.');
                return;
            }
            
            const handleMessage = (event: MessageEvent) => {
                if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
                    window.removeEventListener('message', handleMessage);
                    window.location.reload();
                }
            };
            window.addEventListener('message', handleMessage);
        } catch (err) {
            console.error("Error initiating OAuth:", err);
        }
    };

    if (isMcLoading || isPersonalLoading) {
        return <div className="flex h-full w-full items-center justify-center"><Spinner className="w-10 h-10" /></div>;
    }

    return (
        <div className="h-full flex flex-col">
            <header className="p-4 sm:p-6 lg:p-8">
                <div className="flex justify-between items-start flex-wrap gap-4">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-text-primary flex items-center gap-4">
                            <CalendarIcon className="text-accent-secondary" size={48} />
                            {viewMode === 'mc' ? 'Training Calendar' : 'Personal Calendar'}
                        </h1>
                        <p className="text-lg text-text-secondary mt-1">
                            {viewMode === 'mc' ? 'Stay up to date with coaching sessions, trainings, and team events.' : 'Your meetings and RSVP\'d sessions.'}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => setViewMode(viewMode === 'mc' ? 'personal' : 'mc')}
                            className="px-4 py-2 text-sm font-bold rounded-lg bg-surface border border-border text-primary hover:bg-surface-hover transition-colors"
                        >
                            Switch to {viewMode === 'mc' ? 'Personal' : 'MC Training'}
                        </button>
                        <button 
                            onClick={() => setShowHelp(!showHelp)}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-surface border border-border text-text-secondary hover:text-primary transition-colors"
                        >
                            <HelpCircle size={18} /> Troubleshooting
                        </button>
                    </div>
                </div>

                {personalError && (
                    <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2">
                        <span className="text-sm">Failed to load calendar data.</span>
                    </div>
                )}
            </header>

            <div className="flex-1 px-4 sm:px-6 lg:px-8 pb-8">
                <Card className="h-full flex flex-col min-h-[650px] p-4 overflow-hidden bg-white border-2 border-border shadow-inner">
                    {viewMode === 'mc' ? (
                         mcCalendarUrl ? (
                            <iframe 
                                src={mcCalendarUrl} 
                                style={{border: 0}} 
                                width="100%" 
                                height="100%" 
                                frameBorder="0" 
                                scrolling="no"
                                className="flex-1"
                                title="Agent GPS Coaching Calendar"
                            ></iframe>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-text-secondary gap-4 p-10 text-center">
                                <CalendarIcon size={64} className="opacity-20" />
                                <p className="font-bold text-xl">No Calendar Configured</p>
                            </div>
                        )
                    ) : (
                        !hasIntegration ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-text-secondary gap-4 p-10 text-center">
                                <CalendarIcon size={64} className="opacity-20" />
                                <p className="font-bold text-xl">Google Calendar Not Connected</p>
                                <button 
                                    onClick={handleConnectCalendar}
                                    className="px-6 py-3 font-bold rounded-lg bg-primary text-on-accent hover:bg-opacity-90 transition-colors"
                                >
                                    Connect Google Calendar
                                </button>
                            </div>
                        ) : (
                            <div className="h-full [&_.fc-header-toolbar]:mb-4 [&_.fc-button]:bg-surface [&_.fc-button]:border-border [&_.fc-button]:text-text-primary [&_.fc-button-active]:bg-primary [&_.fc-button-active]:text-on-accent [&_.fc-event]:rounded-md [&_.fc-event]:px-1">
                                <FullCalendar
                                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                                    initialView="dayGridMonth"
                                    events={personalEvents || []}
                                    headerToolbar={{
                                        left: 'prev,next today',
                                        center: 'title',
                                        right: 'dayGridMonth,timeGridWeek,timeGridDay'
                                    }}
                                    height="100%"
                                />
                            </div>
                        )
                    )}
                </Card>
            </div>
        </div>
    );
};

export default CalendarPage;
