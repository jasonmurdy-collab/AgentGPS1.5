
import React, { FC, useState, useEffect, useCallback } from 'react';
import { Spinner } from '../ui/Spinner';
import { Send } from 'lucide-react';
import { ClientLeadActivity } from '../../types';

interface ActivityTimelineProps {
    leadId: string;
    getActivities: (leadId: string) => Promise<ClientLeadActivity[]>;
    addActivity: (leadId: string, note: string) => Promise<void>;
}

function timeAgo(dateString: string) {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
    const minutes = Math.round(seconds / 60);
    const hours = Math.round(minutes / 60);
    const days = Math.round(hours / 24);

    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
}

export const ActivityTimeline: FC<ActivityTimelineProps> = ({ leadId, getActivities, addActivity }) => {
    const [activities, setActivities] = useState<ClientLeadActivity[]>([]);
    const [loading, setLoading] = useState(true);
    const [newNote, setNewNote] = useState('');
    const [isLogging, setIsLogging] = useState(false);

    const fetchActivities = useCallback(async () => {
        setLoading(true);
        const fetched = await getActivities(leadId);
        setActivities(fetched);
        setLoading(false);
    }, [leadId, getActivities]);

    useEffect(() => {
        let isMounted = true;
        const load = async () => {
            if (isMounted) setLoading(true);
            const fetched = await getActivities(leadId);
            if (isMounted) {
                setActivities(fetched);
                setLoading(false);
            }
        };
        load();
        return () => { isMounted = false; };
    }, [leadId, getActivities]);

    const handleLogNote = async () => {
        if (!newNote.trim()) return;
        setIsLogging(true);
        await addActivity(leadId, newNote.trim());
        setNewNote('');
        await fetchActivities();
        setIsLogging(false);
    };

    return (
        <div className="space-y-6">
            <h3 className="font-bold text-lg">Activity Timeline</h3>
            {loading ? <Spinner /> : (
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                    {activities.map(activity => (
                        <div key={activity.id} className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-accent text-on-accent flex items-center justify-center text-xs font-bold flex-shrink-0" title={activity.userName}>
                                {activity.userName.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div className="w-full">
                                <div className="flex justify-between items-baseline">
                                    <p className="font-semibold text-sm">{activity.userName}</p>
                                    <p className="text-xs text-text-secondary">{timeAgo(activity.createdAt)}</p>
                                </div>
                                <p className="text-sm p-2 bg-background/50 rounded-md mt-1">{activity.note}</p>
                            </div>
                        </div>
                    ))}
                    {activities.length === 0 && <p className="text-sm text-center text-text-secondary py-4">No activities logged yet.</p>}
                </div>
            )}
            
            <div className="pt-4 border-t border-border">
                <h4 className="font-semibold mb-2">Log a new note or activity</h4>
                <div className="flex items-start gap-2">
                    <textarea 
                        value={newNote} 
                        onChange={e => setNewNote(e.target.value)} 
                        placeholder="Log a call, showing, or general note..." 
                        className="w-full bg-input border border-border rounded-md p-2 text-sm min-h-[60px]" 
                    />
                    <button 
                        onClick={handleLogNote} 
                        disabled={isLogging} 
                        className="p-2 bg-primary text-on-accent rounded-md disabled:bg-opacity-50"
                    >
                        <Send size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};
