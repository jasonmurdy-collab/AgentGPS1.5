import React from 'react';
import { Card } from '../ui/Card';
import { BrainCircuit, Star, TrendingDown, Award } from 'lucide-react';
import type { Goal, TeamMember } from '../../types';

interface CoachInsightsProps {
    agentsWithGoals: { agent: TeamMember; goals: Goal[] }[];
}

const calculateProgress = (goal: Goal): number => {
    if (goal.targetValue <= 0) return 0;
    const progress = (goal.currentValue / goal.targetValue) * 100;
    return Math.min(progress, 100);
};

const InsightSection: React.FC<{ icon: React.ElementType; title: string; children: React.ReactNode; color: string; }> = React.memo(({ icon: Icon, title, children, color }) => (
    <div>
        <div className={`flex items-center gap-2 text-sm font-semibold ${color}`}>
            <Icon size={16} />
            <span className="uppercase">{title}</span>
        </div>
        <div className="mt-2 text-text-secondary pl-6 text-sm">{children}</div>
    </div>
));

export const CoachInsights: React.FC<CoachInsightsProps> = React.memo(({ agentsWithGoals }) => {
    if (!agentsWithGoals || agentsWithGoals.length === 0) {
        return null; 
    }

    const allGoals = agentsWithGoals.flatMap(awg => awg.goals);
    
    if (allGoals.length === 0) {
        return (
            <Card>
                <div className="flex items-center gap-3 mb-2">
                    <BrainCircuit className="text-accent-secondary" size={24} />
                    <h2 className="text-2xl font-bold">Performance Insights</h2>
                </div>
                <p className="text-text-secondary">No goals have been set for the team yet. Assign some goals to start generating insights.</p>
            </Card>
        );
    }
    
    const totalProgress = allGoals.reduce((sum, goal) => sum + calculateProgress(goal), 0);
    const averageCompletion = allGoals.length > 0 ? (totalProgress / allGoals.length).toFixed(0) : '0';

    const weeklyGoals = allGoals.filter(g => g.type === 'Weekly');
    const onTrackWeeklyGoalsCount = weeklyGoals.filter(g => calculateProgress(g) >= 50).length;
    const weeklyOnTrackPercentage = weeklyGoals.length > 0 ? ((onTrackWeeklyGoalsCount / weeklyGoals.length) * 100).toFixed(0) : '0';
    
    const metricCounts = allGoals.reduce((acc: Record<string, number>, goal) => {
        acc[goal.metric] = (acc[goal.metric] || 0) + 1;
        return acc;
    }, {});
    
    const mostCommonMetric = Object.entries(metricCounts).reduce(
        (top, current) => (current[1] > top[1] ? current : top),
        ['N/A', 0]
    )[0];

    const agentProgress = agentsWithGoals.map(({ agent, goals }) => {
        if (goals.length === 0) return { name: agent.name, avgProgress: 0 };
        const totalAgentProgress = goals.reduce((sum, goal) => sum + calculateProgress(goal), 0);
        const avgProgress = totalAgentProgress / goals.length;
        return { name: agent.name, avgProgress };
    });

    const topPerformers = agentProgress.filter(p => p.avgProgress >= 75);
    const needsAttention = agentProgress.filter(p => p.avgProgress > 0 && p.avgProgress < 25);
    
    return (
        <Card>
            <div className="flex items-center gap-3 mb-4">
                <BrainCircuit className="text-accent-secondary" size={24} />
                <h2 className="text-2xl font-bold">Performance Insights</h2>
            </div>
            <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                    <div className="bg-background/50 p-3 rounded-lg">
                        <p className="text-xs text-text-secondary uppercase tracking-wider">Total Goals</p>
                        <p className="text-2xl font-bold text-text-primary">{allGoals.length}</p>
                    </div>
                     <div className="bg-background/50 p-3 rounded-lg">
                        <p className="text-xs text-text-secondary uppercase tracking-wider">Avg. Completion</p>
                        <p className="text-2xl font-bold text-text-primary">{averageCompletion}%</p>
                    </div>
                     <div className="bg-background/50 p-3 rounded-lg">
                        <p className="text-xs text-text-secondary uppercase tracking-wider">Weekly Goals On Track</p>
                        <p className="text-2xl font-bold text-text-primary">{weeklyOnTrackPercentage}%</p>
                    </div>
                </div>
                 <p className="text-center text-sm text-text-secondary pt-2">
                    The most common goal metric is currently <strong>{mostCommonMetric}</strong>.
                </p>
                
                <hr className="border-border" />
                
                {topPerformers.length > 0 && (
                    <InsightSection icon={Award} title="On Fire" color="text-success">
                        <p className="mb-1">
                           These agents are excelling, with over 75% average completion on their goals.
                        </p>
                        <ul className="list-disc list-inside font-semibold text-text-primary">
                            {topPerformers.map(p => <li key={p.name}>{p.name} ({p.avgProgress.toFixed(0)}%)</li>)}
                        </ul>
                    </InsightSection>
                )}

                {needsAttention.length > 0 && (
                    <InsightSection icon={TrendingDown} title="Opportunity for Growth" color="text-warning">
                         <p className="mb-1">
                           These agents are making progress but are under 25% average completion. A check-in could help them gain momentum.
                        </p>
                        <ul className="list-disc list-inside font-semibold text-text-primary">
                           {needsAttention.map(p => <li key={p.name}>{p.name} ({p.avgProgress.toFixed(0)}%)</li>)}
                        </ul>
                    </InsightSection>
                )}
                
                {(topPerformers.length > 0 || needsAttention.length > 0) ? (
                    <InsightSection icon={Star} title="Actionable Next Steps" color="text-accent-secondary">
                         <ul className="list-disc list-inside space-y-1">
                            {topPerformers.length > 0 && (
                                <li>Publicly recognize <strong>{topPerformers.map(p => p.name).join(', ')}</strong> for their excellent work to motivate the team.</li>
                            )}
                             {needsAttention.length > 0 && (
                                <li>Connect with <strong>{needsAttention.map(p => p.name).join(', ')}</strong> to offer support and strategize on their goals.</li>
                            )}
                            <li>Review the goals of agents not listed above to ensure they are on a steady track.</li>
                        </ul>
                    </InsightSection>
                ) : (
                    <p className="text-text-secondary text-sm text-center pt-2">All agents are progressing steadily. Keep up the consistent effort!</p>
                )}
            </div>
        </Card>
    );
});