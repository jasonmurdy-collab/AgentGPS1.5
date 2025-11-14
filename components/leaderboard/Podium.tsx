import React from 'react';
import type { TeamMember, LeaderboardViewMetric } from '../../types';

interface PodiumProps {
    users: (TeamMember & { value: number })[];
    metric: LeaderboardViewMetric;
    formatValue: (value: number, metric: LeaderboardViewMetric) => string;
}

export const Podium: React.FC<PodiumProps> = React.memo(({ users, metric, formatValue }) => {
    // Defines visual order: 2nd, 1st, 3rd
    const podiumOrder = [1, 0, 2];
    const userMap = users.map((user, index) => ({ ...user, rank: index + 1 }));

    return (
        <div className="mt-8 flex justify-center items-end gap-4">
            {podiumOrder.map(index => {
                const user = userMap[index];
                if (!user) return <div key={index} className="w-1/3" />;

                const isFirst = user.rank === 1;
                const heightClass = isFirst ? 'h-48' : user.rank === 2 ? 'h-40' : 'h-32';
                const rankColor = isFirst ? 'text-yellow-400' : user.rank === 2 ? 'text-gray-400' : 'text-amber-600';

                return (
                    <div key={user.id} className={`w-1/3 flex flex-col items-center text-center ${isFirst ? 'scale-105' : ''}`}>
                        <p className={`font-black text-4xl ${rankColor}`}>{user.rank}</p>
                        <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center text-on-accent font-bold text-3xl my-2 border-4 border-surface">
                            {(user.name || ' ').charAt(0).toUpperCase()}
                        </div>
                        <p className="font-bold text-text-primary truncate w-full px-2" title={user.name}>{user.name}</p>
                        <p className="font-semibold text-lg text-primary">{formatValue(user.value, metric)}</p>
                        <div className={`mt-2 w-full ${heightClass} rounded-t-lg bg-primary/10`}></div>
                    </div>
                );
            })}
        </div>
    );
});