import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import { Podium } from '../components/leaderboard/Podium';
import { LeaderboardRow } from '../components/leaderboard/LeaderboardRow';
import { YourRankCard } from '../components/leaderboard/YourRankCard';
import type { TeamMember, LeaderboardViewMetric } from '../types';
import { Trophy, DollarSign, List, Phone, UserCheck, Star, RefreshCw } from 'lucide-react';

const metricOptions: { key: LeaderboardViewMetric; label: string; icon: React.ElementType }[] = [
    { key: 'gci', label: 'GCI', icon: DollarSign },
    { key: 'listings', label: 'Listings', icon: List },
    { key: 'goalScore', label: 'Goal Score', icon: Star },
    { key: 'calls', label: 'Calls', icon: Phone },
    { key: 'appointments', label: 'Appointments', icon: UserCheck },
];

const formatValue = (value: number, metric: LeaderboardViewMetric): string => {
    if (metric === 'gci') {
        return `$${value.toLocaleString()}`;
    }
    return value.toLocaleString();
};

const LeaderboardPage: React.FC = () => {
    const { user, userData, loading: authLoading, getTeamById, managedAgents, loadingAgents } = useAuth();
    const [leaderboardUsers, setLeaderboardUsers] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMetric, setSelectedMetric] = useState<LeaderboardViewMetric>('gci');
    const [leaderboardTitle, setLeaderboardTitle] = useState('Leaderboard');

    useEffect(() => {
        if (authLoading || loadingAgents || !userData) {
            setLoading(true);
            return;
        }

        setLoading(true);
        let usersForLeaderboard: TeamMember[] = [];
        const isMcAdmin = userData.role === 'market_center_admin';
        const isProdCoach = userData.role === 'productivity_coach';

        if (isMcAdmin && userData.marketCenterId) {
            setLeaderboardTitle('Market Center Leaderboard');
            usersForLeaderboard = [...managedAgents, userData];
        } else if (isProdCoach) {
            if (userData.marketCenterId) {
                setLeaderboardTitle('Market Center Leaderboard');
            } else {
                setLeaderboardTitle('Your Stats');
            }
            usersForLeaderboard = [...managedAgents, userData];
        } else if (userData.teamId) {
            getTeamById(userData.teamId).then(teamData => {
                if (teamData) setLeaderboardTitle(`${teamData.name} Leaderboard`);
            });
            // managedAgents for a team leader are their team members. Add the leader themselves.
            usersForLeaderboard = [...managedAgents, userData];
        } else { // Agent not on a team
            setLeaderboardTitle('Your Stats');
            usersForLeaderboard = [userData];
        }
        setLeaderboardUsers(usersForLeaderboard);
        setLoading(false);

    }, [userData, authLoading, loadingAgents, getTeamById, managedAgents]);

    const sortedUsers = useMemo(() => {
        return [...leaderboardUsers]
            .map(u => ({ ...u, value: u[selectedMetric] || 0 }))
            .sort((a, b) => (b[selectedMetric] || 0) - (a[selectedMetric] || 0));
    }, [leaderboardUsers, selectedMetric]);

    const currentUserRank = useMemo(() => {
        const rank = sortedUsers.findIndex(u => u.id === user?.uid) + 1;
        return rank > 0 ? rank : 'N/A';
    }, [sortedUsers, user]);
    
    const currentUserData = sortedUsers.find(u => u.id === user?.uid);

    if (loading) {
        return <div className="flex h-full w-full items-center justify-center"><Spinner className="w-8 h-8"/></div>;
    }

    const podiumUsers = sortedUsers.slice(0, 3);
    const otherUsers = sortedUsers.slice(3);

    return (
        <div className="h-full flex flex-col">
            <header className="p-4 sm:p-6 lg:p-8">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-text-primary flex items-center gap-3">
                            <Trophy size={40} className="text-accent-secondary"/>
                            {leaderboardTitle}
                        </h1>
                        <p className="text-lg text-text-secondary mt-1">See how you stack up against the competition.</p>
                    </div>
                </div>
            </header>
            
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-8 space-y-6">
                <Card>
                    <div className="flex flex-wrap items-center gap-2">
                        {metricOptions.map(({ key, label, icon: Icon }) => (
                            <button
                                key={key}
                                onClick={() => setSelectedMetric(key)}
                                className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${selectedMetric === key ? 'bg-primary text-on-accent' : 'text-text-secondary hover:bg-primary/10'}`}
                            >
                                <Icon size={16}/> {label}
                            </button>
                        ))}
                    </div>
                </Card>

                {leaderboardUsers.length === 0 ? (
                    <Card><p className="text-center text-text-secondary py-8">No users to display on the leaderboard.</p></Card>
                ) : (
                    <>
                        {currentUserData && (
                             <YourRankCard 
                                rank={currentUserRank}
                                value={formatValue(currentUserData.value, selectedMetric)}
                                metricLabel={metricOptions.find(m => m.key === selectedMetric)?.label || ''}
                                userName={userData?.name || ''}
                            />
                        )}
                       
                        <Card>
                             {podiumUsers.length > 0 && <Podium users={podiumUsers} metric={selectedMetric} formatValue={formatValue} />}
                            
                            {otherUsers.length > 0 && (
                                <div className="mt-8">
                                    <table className="hidden md:table w-full">
                                        <tbody>
                                            {otherUsers.map((member, index) => (
                                                <LeaderboardRow
                                                    key={member.id}
                                                    rank={index + 4}
                                                    member={member}
                                                    value={formatValue(member.value, selectedMetric)}
                                                    isCurrentUser={member.id === user?.uid}
                                                />
                                            ))}
                                        </tbody>
                                    </table>
                                     <div className="md:hidden space-y-2">
                                        {otherUsers.map((member, index) => (
                                            <LeaderboardRow
                                                key={member.id}
                                                rank={index + 4}
                                                member={member}
                                                value={formatValue(member.value, selectedMetric)}
                                                isCurrentUser={member.id === user?.uid}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </Card>
                    </>
                )}
            </div>
        </div>
    );
};

export default LeaderboardPage;