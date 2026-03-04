import React, { useMemo } from 'react';
import { Card } from '../ui/Card';
import { Goal, TeamMember, Transaction } from '../../types';
import { Users, BarChartHorizontal, Target } from 'lucide-react';

interface TeamPerformanceSummaryProps {
    agents: TeamMember[];
    goals: Record<string, Goal[]>;
    transactions: Transaction[];
    title?: string;
}

const StatCard: React.FC<{ title: string; value: string; icon: React.ElementType }> = React.memo(({ title, value, icon: Icon }) => (
    <div className="bg-background/50 p-4 rounded-lg">
        <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/20 rounded-full">
                <Icon size={24} className="text-primary" />
            </div>
            <div>
                <p className="text-sm text-text-secondary uppercase tracking-wider">{title}</p>
                <p className="text-3xl font-bold text-text-primary">{value}</p>
            </div>
        </div>
    </div>
));

export const TeamPerformanceSummary: React.FC<TeamPerformanceSummaryProps> = React.memo(({ agents, goals, transactions, title = "Team Performance Summary" }) => {

    const summary = useMemo(() => {
        const totalAgents = agents?.length || 0;
        const totalTransactionsCount = transactions?.length || 0;
        const totalGoalsCount = goals ? Object.values(goals).flat().filter(Boolean).length : 0;
        
        const totalGci = transactions?.reduce((sum, t) => {
            const gci = t.totalCommission !== undefined ? t.totalCommission : t.salePrice * (t.commissionRate / 100);
            return sum + gci;
        }, 0) || 0;

        return {
            totalAgents,
            totalTransactionsCount,
            totalGoalsCount,
            totalGci
        };
    }, [agents, transactions, goals]);

    return (
        <Card>
            <h2 className="text-2xl font-bold mb-4">{title}</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard 
                    title="Total Agents" 
                    value={summary.totalAgents.toLocaleString()} 
                    icon={Users}
                />
                <StatCard 
                    title="Total Team GCI" 
                    value={`$${summary.totalGci.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} 
                    icon={BarChartHorizontal}
                />
                <StatCard 
                    title="Transactions" 
                    value={summary.totalTransactionsCount.toLocaleString()} 
                    icon={BarChartHorizontal}
                />
                 <StatCard 
                    title="Goals Set" 
                    value={summary.totalGoalsCount.toLocaleString()} 
                    icon={Target}
                />
            </div>
        </Card>
    );
});