import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import { StarRating } from '../components/ui/StarRating';
import type { PerformanceLog } from '../types';
import { UserCheck, Archive, MessageSquare, CheckSquare, Star, Target, AlertTriangle } from 'lucide-react';

const LogCard: React.FC<{ log: PerformanceLog }> = ({ log }) => {
    const typeInfo = {
        coaching_session: { icon: MessageSquare, label: 'Coaching Session', color: 'text-blue-500' },
        attendance: { icon: CheckSquare, label: 'Attendance', color: 'text-green-500' },
        performance_review: { icon: Star, label: 'Performance Review', color: 'text-purple-500' },
        goal_review: { icon: Target, label: 'Goal Review', color: 'text-orange-500' },
    }[log.type];

    return (
        <Card className={`transition-opacity ${log.isArchived ? 'opacity-60' : ''}`}>
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                    <typeInfo.icon size={24} className={typeInfo.color}/>
                    <div>
                        <p className="font-bold text-lg text-text-primary">{typeInfo.label}</p>
                        <p className="text-sm text-text-secondary">{new Date(log.date).toLocaleDateString()}</p>
                    </div>
                </div>
                {log.isArchived && <span className="text-xs font-semibold bg-background px-2 py-1 rounded-full">Archived</span>}
            </div>
            
            <div className="space-y-4 text-sm">
                {log.type === 'attendance' && <p><strong>Event:</strong> {log.eventName} - <strong>{log.attended ? 'Attended' : 'Absent'}</strong></p>}
                
                {log.ratings && (
                    <div>
                        <p className="font-semibold text-text-primary mb-1">Ratings from your coach:</p>
                        <div className="space-y-1">
                            <div className="flex justify-between items-center"><span className="text-text-secondary">Prospecting:</span> <StarRating rating={log.ratings.prospecting} size={16}/></div>
                            <div className="flex justify-between items-center"><span className="text-text-secondary">Skill Development:</span> <StarRating rating={log.ratings.skillDevelopment} size={16}/></div>
                            <div className="flex justify-between items-center"><span className="text-text-secondary">Mindset:</span> <StarRating rating={log.ratings.mindset} size={16}/></div>
                        </div>
                    </div>
                )}
                
                {log.goalProgress && log.goalProgress.length > 0 && (
                    <div>
                        <p className="font-semibold text-text-primary mb-1">Goals Reviewed:</p>
                        <ul className="list-disc list-inside ml-4 text-text-secondary space-y-1">
                            {log.goalProgress.map(gp => (
                                <li key={gp.goalId}>{gp.goalTitle} (Progress: {gp.currentValue.toLocaleString()} / {gp.targetValue.toLocaleString()})</li>
                            ))}
                        </ul>
                    </div>
                )}

                {log.notes && (
                    <div>
                        <p className="font-semibold text-text-primary mb-1">Coach's Notes:</p>
                        <p className="whitespace-pre-wrap p-3 bg-background/50 rounded-md text-text-secondary">{log.notes}</p>
                    </div>
                )}
            </div>
        </Card>
    );
};

const MyPerformancePage: React.FC = () => {
    const { getPerformanceLogsForCurrentUser } = useAuth();
    const [logs, setLogs] = useState<PerformanceLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showArchived, setShowArchived] = useState(false);

    useEffect(() => {
        const fetchLogs = async () => {
            setLoading(true);
            setError(null);
            try {
                const fetchedLogs = await getPerformanceLogsForCurrentUser();
                setLogs(fetchedLogs);
            } catch (error: any) {
                console.error("Failed to fetch performance logs:", error);
                 if (error.code === 'permission-denied') {
                    setError("Permission Denied: Could not fetch your performance logs. Please contact support.");
                } else {
                    setError("An unexpected error occurred while fetching your performance logs.");
                }
            } finally {
                setLoading(false);
            }
        };
        fetchLogs();
    }, [getPerformanceLogsForCurrentUser]);

    const filteredLogs = useMemo(() => {
        return logs.filter(log => showArchived ? true : !log.isArchived);
    }, [logs, showArchived]);

    if (loading) {
        return <div className="flex h-full w-full items-center justify-center"><Spinner className="w-8 h-8"/></div>;
    }

    return (
        <div className="h-full flex flex-col">
            <header className="p-4 sm:p-6 lg:p-8">
                <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-text-primary flex items-center gap-4">
                   <UserCheck className="text-accent-secondary" size={48} />
                   My Performance
                </h1>
                <p className="text-lg text-text-secondary mt-1">A record of your coaching sessions, reviews, and progress.</p>
            </header>

            <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-8 space-y-6">
                 <div className="flex justify-end">
                    <button onClick={() => setShowArchived(!showArchived)} className="flex items-center gap-2 text-sm font-semibold rounded-lg transition-colors px-3 py-1.5 bg-surface border border-border text-text-secondary hover:border-primary">
                        <Archive size={16}/> {showArchived ? 'Hide Archived' : 'Show Archived'}
                    </button>
                </div>
                
                {error && (
                    <Card className="bg-destructive-surface text-destructive border-destructive text-center">
                         <div className="flex flex-col items-center justify-center">
                            <AlertTriangle className="w-12 h-12 mb-4" />
                            <p className="font-bold text-lg">Error</p>
                            <p className="mt-2 max-w-md">{error}</p>
                        </div>
                    </Card>
                )}

                {!error && filteredLogs.length > 0 ? (
                    <div className="space-y-6">
                        {filteredLogs.map(log => <LogCard key={log.id} log={log} />)}
                    </div>
                ) : !error ? (
                    <Card className="text-center py-12">
                        <h2 className="text-2xl font-bold">No Logs Found</h2>
                        <p className="text-text-secondary mt-2">
                           {showArchived && logs.length > 0
                               ? "You have no archived performance logs."
                               : "Your coach has not created any performance logs for you yet. Check back after your next session!"
                           }
                        </p>
                    </Card>
                ) : null}
            </div>
        </div>
    );
};

export default MyPerformancePage;