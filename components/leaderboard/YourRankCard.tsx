import React from 'react';
import { Card } from '../ui/Card';

interface YourRankCardProps {
    rank: number | string;
    value: string;
    metricLabel: string;
    userName: string;
}

export const YourRankCard: React.FC<YourRankCardProps> = React.memo(({ rank, value, metricLabel, userName }) => {
    return (
        <Card className="bg-primary text-on-accent p-4">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <div className="flex items-center gap-4">
                     <div className="text-center">
                        <p className="text-xs opacity-80 uppercase">Your Rank</p>
                        <p className="text-4xl font-black">{rank}</p>
                    </div>
                    <div>
                        <p className="text-lg font-bold">{userName}</p>
                        <p className="text-sm opacity-80">Here's how you're stacking up against the competition.</p>
                    </div>
                </div>
                <div className="text-center flex-shrink-0">
                    <p className="text-xs opacity-80 uppercase">{metricLabel}</p>
                    <p className="text-3xl font-bold">{value}</p>
                </div>
            </div>
        </Card>
    );
});