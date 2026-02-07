import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Calendar as CalendarIcon, AlertCircle, ExternalLink, HelpCircle, Info } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getFirestoreInstance } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { Spinner } from '../components/ui/Spinner';

const CalendarPage: React.FC = () => {
    const { userData } = useAuth();
    const [calendarUrl, setCalendarUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showHelp, setShowHelp] = useState(false);

    // Default fallback if no MC-specific calendar is set (US Holidays)
    const defaultCalendarUrl = "https://calendar.google.com/calendar/embed?height=600&wkst=1&bgcolor=%23ffffff&ctz=America%2FNew_York&src=ZW4udXNhI2hvbGlkYXlAZ3JvdXAudi5jYWxlbmRhci5nb29nbGUuY29t&color=%230B8043";

    useEffect(() => {
        const fetchCalendarConfig = async () => {
            if (!userData) {
                setLoading(false);
                return;
            }

            if (!userData.marketCenterId) {
                setCalendarUrl(defaultCalendarUrl);
                setLoading(false);
                return;
            }

            try {
                const db = getFirestoreInstance();
                if (!db) throw new Error("Database not connected");

                const mcDocRef = doc(db, 'marketCenters', userData.marketCenterId);
                const mcDocSnap = await getDoc(mcDocRef);

                if (mcDocSnap.exists()) {
                    const data = mcDocSnap.data();
                    setCalendarUrl(data.calendarEmbedUrl || defaultCalendarUrl);
                } else {
                    setCalendarUrl(defaultCalendarUrl);
                }
            } catch (err) {
                console.error("Error fetching calendar configuration:", err);
                setError("Failed to load your Market Center's calendar configuration.");
                setCalendarUrl(defaultCalendarUrl); 
            } finally {
                setLoading(false);
            }
        };

        fetchCalendarConfig();
    }, [userData]);

    if (loading) {
        return <div className="flex h-full w-full items-center justify-center"><Spinner className="w-10 h-10" /></div>;
    }

    return (
        <div className="h-full flex flex-col">
            <header className="p-4 sm:p-6 lg:p-8">
                <div className="flex justify-between items-start flex-wrap gap-4">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-text-primary flex items-center gap-4">
                            <CalendarIcon className="text-accent-secondary" size={48} />
                            Training Calendar
                        </h1>
                        <p className="text-lg text-text-secondary mt-1">Stay up to date with coaching sessions, trainings, and team events.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => setShowHelp(!showHelp)}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-surface border border-border text-text-secondary hover:text-primary transition-colors"
                        >
                            <HelpCircle size={18} /> Troubleshooting
                        </button>
                        {calendarUrl && (
                            <a 
                                href={calendarUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-on-accent hover:bg-opacity-90 transition-colors"
                            >
                                <ExternalLink size={18} /> Open in New Tab
                            </a>
                        )}
                    </div>
                </div>

                {error && (
                    <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2">
                        <AlertCircle size={16} />
                        <span className="text-sm">{error}</span>
                    </div>
                )}

                {showHelp && (
                    <Card className="mt-6 border-warning/50 bg-warning/5 animate-in fade-in slide-in-from-top-2">
                        <h3 className="font-bold text-lg mb-2 flex items-center gap-2 text-warning"><Info size={20}/> Why can't I see the calendar?</h3>
                        <div className="space-y-3 text-sm text-text-secondary">
                            <p>If the calendar below is blank, showing a "Forbidden" error, or asking you to log in repeatedly, it is usually due to one of these reasons:</p>
                            <ul className="list-disc list-inside space-y-2">
                                <li><strong>Public Sharing is Off:</strong> Your Market Center leadership must set the calendar to "Public" in Google Calendar settings.</li>
                                <li><strong>Browser Privacy:</strong> Some browsers (like Safari or Brave) block embedded content. Try clicking "Open in New Tab" above.</li>
                                <li><strong>Logged into Multiple Accounts:</strong> Google sometimes struggles with multiple active sessions. Try viewing this in an Incognito/Private window.</li>
                                <li><strong>Workspace Restrictions:</strong> Your Google Workspace admin may have restricted external sharing of calendars.</li>
                            </ul>
                        </div>
                    </Card>
                )}
            </header>

            <div className="flex-1 px-4 sm:px-6 lg:px-8 pb-8">
                <Card className="h-full flex flex-col min-h-[650px] p-0 overflow-hidden bg-white border-2 border-border shadow-inner">
                    {calendarUrl ? (
                        <iframe 
                            src={calendarUrl} 
                            style={{border: 0}} 
                            width="100%" 
                            height="100%" 
                            frameBorder="0" 
                            scrolling="no"
                            className="flex-1"
                            title="Agent GPS Coaching Calendar"
                            onError={() => setError("The calendar could not be loaded. Please try the external link.")}
                        ></iframe>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-text-secondary gap-4 p-10 text-center">
                            <CalendarIcon size={64} className="opacity-20" />
                            <div>
                                <p className="font-bold text-xl">No Calendar Configured</p>
                                <p className="max-w-xs mx-auto">Ask your Productivity Coach or Market Center Admin to set up the calendar in the Settings panel.</p>
                            </div>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};

export default CalendarPage;