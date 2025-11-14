import React, { useMemo } from 'react';
import type { Goal, TeamMember } from '../../types';
import { Card } from '../ui/Card';
import { TrendingUp, Target, BarChartHorizontal, CheckCircle } from 'lucide-react';
import { GoalType } from '../../types';

interface DashboardVisualizationsProps {
  goals: Goal[];
  userData: TeamMember | null;
}

const ProgressBar: React.FC<{ progress: number; label: string }> = React.memo(({ progress, label }) => (
  <div>
    <div className="flex justify-between items-center mb-1">
      <span className="text-sm font-medium text-text-secondary">{label}</span>
      <span className="text-sm font-bold text-text-primary">{progress.toFixed(0)}%</span>
    </div>
    <div className="w-full bg-background rounded-full h-2.5">
      <div className="bg-primary h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
    </div>
  </div>
));

const PacingChart: React.FC<{ goal: Goal | undefined }> = React.memo(({ goal }) => {
    if (!goal || !goal.startDate || !goal.endDate) {
        return <p className="text-sm text-text-secondary text-center py-4">Set an annual goal with start and end dates to see pacing.</p>;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(goal.startDate);
    const endDate = new Date(goal.endDate);

    const actualProgress = goal.targetValue > 0 ? (goal.currentValue / goal.targetValue) * 100 : 0;
    
    let expectedProgress = 0;
    if (today >= startDate && today <= endDate) {
        const totalDuration = endDate.getTime() - startDate.getTime();
        const elapsedDuration = today.getTime() - startDate.getTime();
        if (totalDuration > 0) {
            expectedProgress = (elapsedDuration / totalDuration) * 100;
        }
    } else if (today > endDate) {
        expectedProgress = 100;
    }

    const onPace = actualProgress >= expectedProgress;
    const isCompleted = actualProgress >= 100;

    if (isCompleted) {
        return (
            <div className="text-center py-4">
                <CheckCircle size={32} className="text-success mx-auto mb-2" />
                <p className="font-bold text-success">Annual Goal Completed!</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
             <ProgressBar progress={Math.min(actualProgress, 100)} label="Actual Progress" />
             <ProgressBar progress={Math.min(expectedProgress, 100)} label="Expected Pacing" />
             <p className={`text-center font-semibold text-sm ${onPace ? 'text-success' : 'text-warning'}`}>
                {onPace ? 'You are on or ahead of pace. Keep up the great work!' : 'You are behind pace. Time to refocus!'}
             </p>
        </div>
    );
});

export const DashboardVisualizations: React.FC<DashboardVisualizationsProps> = React.memo(({ goals, userData }) => {
  const annualGoal = goals.find(g => g.type === 'Annual');
  const quarterlyGoals = goals.filter(g => g.type === 'Quarterly');
  const weeklyGoals = goals.filter(g => g.type === 'Weekly');
  
  const calculateAverageProgress = (goalSet: Goal[]): number => {
    if (goalSet.length === 0) return 0;
    const totalProgress = goalSet.reduce((acc, goal) => {
      const progress = goal.targetValue > 0 ? (goal.currentValue / goal.targetValue) * 100 : 0;
      return acc + Math.min(progress, 100);
    }, 0);
    return totalProgress / goalSet.length;
  };
  
  const annualAvg = calculateAverageProgress(annualGoal ? [annualGoal] : []);
  const quarterlyAvg = calculateAverageProgress(quarterlyGoals);
  const weeklyAvg = calculateAverageProgress(weeklyGoals);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="lg:col-span-2">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
                <TrendingUp className="text-primary"/> Goal Pacing (Annual)
            </h2>
            <PacingChart goal={annualGoal} />
        </Card>
        <Card>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
                <Target className="text-primary"/> Goal Type Progress
            </h2>
            <div className="space-y-4">
                <ProgressBar progress={annualAvg} label={GoalType.Annual} />
                <ProgressBar progress={quarterlyAvg} label={GoalType.Quarterly} />
                <ProgressBar progress={weeklyAvg} label={GoalType.Weekly} />
            </div>
        </Card>
        <Card>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
                <BarChartHorizontal className="text-primary"/> Key Metrics
            </h2>
             <div className="space-y-4">
                <div className="flex justify-between items-center bg-background/50 p-3 rounded-lg">
                    <span className="font-semibold text-text-primary">GCI</span>
                    <span className="font-bold text-lg text-primary">${(userData?.gci || 0).toLocaleString()}</span>
                </div>
                 <div className="flex justify-between items-center bg-background/50 p-3 rounded-lg">
                    <span className="font-semibold text-text-primary">Listings</span>
                    <span className="font-bold text-lg text-primary">{(userData?.listings || 0).toLocaleString()}</span>
                </div>
                 <div className="flex justify-between items-center bg-background/50 p-3 rounded-lg">
                    <span className="font-semibold text-text-primary">Calls</span>
                    <span className="font-bold text-lg text-primary">{(userData?.calls || 0).toLocaleString()}</span>
                </div>
            </div>
        </Card>
    </div>
  );
});