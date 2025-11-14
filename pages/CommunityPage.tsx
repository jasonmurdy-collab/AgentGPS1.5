import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { SkeletonCard } from '../components/ui/SkeletonCard';
import { CommunityGoalProgressCard } from '../components/goals/CommunityGoalProgressCard';
import { Goal, GoalType, TeamMember } from '../types';
import { collection, query, where, onSnapshot, orderBy, limit, getDoc, doc, DocumentSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Globe } from 'lucide-react';
import { processGoalDoc } from '../lib/firestoreUtils';

// --- GOALS TAB COMPONENT ---

type SortOrderGoals = 'createdAt' | 'progress' | 'targetValue';
type CombinedGoalData = { goal: Goal; user: { name: string } };

const CommunityGoals: React.FC = () => {
    const { userData, getUsersByIds, loading: authLoading } = useAuth();
    const [publicGoals, setPublicGoals] = useState<Goal[]>([]);
    const [teamGoals, setTeamGoals] = useState<Goal[]>([]);
    const [usersMap, setUsersMap] = useState<Map<string, TeamMember>>(new Map());
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState<GoalType | 'All'>('All');
    const [sortOrder, setSortOrder] = useState<SortOrderGoals>('createdAt');

    useEffect(() => {
        if (authLoading) return; // Wait for user data to be ready

        const fetchCommunityGoals = async () => {
            setLoading(true);
            const goalsCollectionRef = collection(db, 'goals');
            
            try {
                // Fetch public goals
                const publicQuery = query(goalsCollectionRef, where("visibility", "==", "public"));
                const publicSnapshot = await getDocs(publicQuery);
                const fetchedPublicGoals = publicSnapshot.docs.map(processGoalDoc);
                setPublicGoals(fetchedPublicGoals);

                // Fetch team goals if user is on a team
                let fetchedTeamGoals: Goal[] = [];
                if (userData?.teamId) {
                    const teamQuery = query(
                        goalsCollectionRef,
                        where("teamId", "==", userData.teamId),
                        where("visibility", "==", "team_view_only")
                    );
                    const teamSnapshot = await getDocs(teamQuery);
                    fetchedTeamGoals = teamSnapshot.docs.map(processGoalDoc);
                }
                setTeamGoals(fetchedTeamGoals);

            } catch (error: any) {
                if (error.code === 'permission-denied') {
                    console.warn("CommunityPage: Permission denied fetching goals. Check security rules.", error);
                } else {
                    console.error("CommunityPage: Error fetching goals:", error);
                }
                setPublicGoals([]);
                setTeamGoals([]);
            } finally {
                setLoading(false);
            }
        };

        fetchCommunityGoals();
    }, [userData, authLoading]);

    const combinedGoals = useMemo(() => {
        const allGoals = new Map<string, Goal>();
        [...publicGoals, ...teamGoals].forEach(goal => allGoals.set(goal.id, goal));
        return Array.from(allGoals.values());
    }, [publicGoals, teamGoals]);

    useEffect(() => {
        const fetchUsers = async () => {
            if (combinedGoals.length > 0) {
                const userIds = [...new Set(combinedGoals.map(g => g.userId).filter(Boolean) as string[])];
                const newUsersToFetch = userIds.filter(id => !usersMap.has(id));
                if (newUsersToFetch.length > 0) {
                    const usersData = await getUsersByIds(newUsersToFetch);
                    setUsersMap(prevMap => {
                        const newMap = new Map(prevMap);
                        usersData.forEach(u => newMap.set(u.id, u));
                        return newMap;
                    });
                }
            }
        };
        fetchUsers();
    }, [combinedGoals, getUsersByIds, usersMap]);
    
    const combinedGoalsWithUserData = useMemo(() => {
        return combinedGoals.map(goal => ({
            goal,
            user: { name: usersMap.get(goal.userId!)?.name || goal.userName || 'Unknown Agent' }
        }));
    }, [combinedGoals, usersMap]);


    const filteredAndSortedGoals = useMemo(() => {
        let processedGoals = [...combinedGoalsWithUserData];

        if (filterType !== 'All') {
            processedGoals = processedGoals.filter(item => item.goal.type === filterType);
        }

        const calculateProgress = (goal: Goal) => goal.targetValue > 0 ? (goal.currentValue / goal.targetValue) * 100 : 0;
        switch (sortOrder) {
            case 'targetValue':
                processedGoals.sort((a, b) => b.goal.targetValue - a.goal.targetValue);
                break;
            case 'progress':
                processedGoals.sort((a, b) => calculateProgress(b.goal) - calculateProgress(a.goal));
                break;
            case 'createdAt':
            default:
                processedGoals.sort((a, b) => {
                    const timeA = a.goal.createdAt ? new Date(a.goal.createdAt).getTime() : 0;
                    const timeB = b.goal.createdAt ? new Date(b.goal.createdAt).getTime() : 0;
                    return timeB - timeA;
                });
                break;
        }

        return processedGoals;
    }, [combinedGoalsWithUserData, filterType, sortOrder]);

    if (loading || authLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-fr">
                {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
        );
    }

    return (
        <div>
            <div className="mb-6 flex flex-wrap gap-4 justify-between items-center">
                <div className="flex items-center gap-2 p-1 bg-surface rounded-lg">
                    {(['All', ...Object.values(GoalType)] as (GoalType | 'All')[]).map(type => (
                        <button key={type} onClick={() => setFilterType(type)} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${filterType === type ? 'bg-primary text-on-accent' : 'text-text-secondary hover:bg-primary/20'}`}>
                            {type}
                        </button>
                    ))}
                </div>
                <div>
                    <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as SortOrderGoals)} className="bg-input border border-border rounded-md px-3 py-1.5 text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary" aria-label="Sort goals by">
                        <option value="createdAt">Sort by: Most Recent</option>
                        <option value="progress">Sort by: Progress (%)</option>
                        <option value="targetValue">Sort by: Target Value (High-Low)</option>
                    </select>
                </div>
            </div>
            {filteredAndSortedGoals.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-fr">
                    {filteredAndSortedGoals.map(({ goal, user }) => (
                        <CommunityGoalProgressCard key={goal.id} goal={goal} user={user} />
                    ))}
                </div>
            ) : (
                <Card><p className="text-center text-text-secondary py-8">No community or team goals to display yet.</p></Card>
            )}
        </div>
    );
};


// --- MAIN PAGE COMPONENT ---

const CommunityPage: React.FC = () => {
    return (
        <div className="h-full flex flex-col">
            <header className="p-4 sm:p-6 lg:p-8">
                <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-text-primary flex items-center gap-3"><Globe size={40} />Community</h1>
                <p className="text-lg text-text-secondary mt-1">Engage with team members and see public goals from the wider agent community.</p>
            </header>
            <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-8">
                <CommunityGoals />
            </main>
        </div>
    );
};

export default CommunityPage;