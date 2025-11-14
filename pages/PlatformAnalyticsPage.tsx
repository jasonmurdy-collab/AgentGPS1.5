
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useGoals } from '../contexts/GoalContext';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import { Users, Building, Network, Target, BarChartHorizontal, PieChart } from 'lucide-react';

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ElementType; }> = ({ title, value, icon: Icon }) => (
    <Card className="flex items-center p-6">
        <div className="p-4 bg-primary/10 rounded-full mr-4">
            <Icon size={28} className="text-primary" />
        </div>
        <div>
            <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">{title}</h3>
            <p className="text-4xl font-black text-text-primary">{typeof value === 'number' ? value.toLocaleString() : value}</p>
        </div>
    </Card>
);

const PlatformAnalyticsPage: React.FC = () => {
    const { getAllUsers, getAllTeams, getMarketCenters, getAllTransactionsForAdmin } = useAuth();
    const { getAllGoals } = useGoals();
    const [stats, setStats] = useState({
        users: 0,
        teams: 0,
        marketCenters: 0,
        goals: 0,
        transactions: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true);
            try {
                const [users, teams, mcs, goals, transactions] = await Promise.all([
                    getAllUsers(),
                    getAllTeams(),
                    getMarketCenters(),
                    getAllGoals(),
                    getAllTransactionsForAdmin(),
                ]);
                setStats({
                    users: users.length,
                    teams: teams.length,
                    marketCenters: mcs.length,
                    goals: goals.length,
                    transactions: transactions.length,
                });
            } catch (error) {
                console.error("Failed to fetch platform analytics:", error);
                // Handle error state if needed
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [getAllUsers, getAllTeams, getMarketCenters, getAllGoals, getAllTransactionsForAdmin]);

    if (loading) {
        return <div className="flex h-full w-full items-center justify-center"><Spinner className="w-10 h-10"/></div>;
    }

    return (
        <div className="h-full flex flex-col">
            <header className="p-4 sm:p-6 lg:p-8">
                <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-text-primary flex items-center gap-4">
                    <PieChart className="text-accent-secondary" size={48} />
                    Platform Analytics
                </h1>
                <p className="text-lg text-text-secondary mt-1">A high-level overview of the AgentGPS platform's key metrics.</p>
            </header>

            <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <StatCard title="Total Users" value={stats.users} icon={Users} />
                    <StatCard title="Total Teams" value={stats.teams} icon={Network} />
                    <StatCard title="Total Market Centers" value={stats.marketCenters} icon={Building} />
                    <StatCard title="Total Goals Created" value={stats.goals} icon={Target} />
                    <StatCard title="Total Transactions Logged" value={stats.transactions} icon={BarChartHorizontal} />
                </div>
            </div>
        </div>
    );
};

export default PlatformAnalyticsPage;
