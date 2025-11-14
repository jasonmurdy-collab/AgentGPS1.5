import React from 'react';
import type { Goal, TeamMember } from '../../types';
import { Card } from '../ui/Card';
import { CheckCircle2 } from 'lucide-react';

interface CommunityGoalProgressCardProps {
    goal: Goal;
    user: { name: string };
}

export const CommunityGoalProgressCard: React.FC<CommunityGoalProgressCardProps> = React.memo(({ goal, user }) => {
  const progress = goal.targetValue > 0 ? Math.min((goal.currentValue / goal.targetValue) * 100, 100) : 0;
  const isCompleted = progress >= 100;

  return (
    <Card className={`flex flex-col justify-between p-4 h-full transition-all duration-300 ${isCompleted ? 'bg-primary/20 border-primary' : ''}`}>
      <div>
        {/* User Info Section */}
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-on-accent font-bold text-sm">
                {(user.name || ' ').charAt(0).toUpperCase()}
            </div>
            <div>
                <p className="font-semibold text-sm truncate text-text-primary" title={user.name}>{user.name}</p>
                <p className="text-xs text-text-secondary">Agent</p>
            </div>
        </div>

        <div className="flex justify-between items-start">
          <h3 className="text-md font-bold text-text-primary pr-2 leading-tight" title={goal.title}>{goal.title}</h3>
          {isCompleted ? (
              <span className="text-xs font-medium text-on-accent bg-primary px-2 py-0.5 rounded-full flex-shrink-0 flex items-center gap-1">
                  <CheckCircle2 size={14}/> Completed
              </span>
          ) : (
            <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full flex-shrink-0">{goal.type}</span>
          )}
        </div>
        <p className="text-xs text-text-secondary mt-1 truncate">{goal.metric}</p>
      </div>

      <div className="mt-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-bold text-text-primary">{Math.round(progress)}%</span>
          <span className="text-xs text-text-secondary">
            {goal.currentValue.toLocaleString()} / {goal.targetValue.toLocaleString()}
          </span>
        </div>
        <div className="w-full bg-background rounded-full h-2">
          <div className="bg-primary h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
        </div>
      </div>
    </Card>
  );
});