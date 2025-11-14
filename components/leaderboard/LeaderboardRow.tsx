import React from 'react';
import type { TeamMember } from '../../types';
import { Card } from '../ui/Card';
import { Trophy } from 'lucide-react';

interface LeaderboardRowProps {
    rank: number;
    member: TeamMember & { value: number };
    value: string;
    isCurrentUser: boolean;
}

const RankDisplay: React.FC<{ rank: number }> = React.memo(({ rank }) => {
    const rankStyles: { [key: number]: string } = {
        1: 'text-yellow-400',
        2: 'text-gray-400',
        3: 'text-amber-600',
    };

    if (rank <= 3) {
        return (
            <div className="flex items-center gap-2">
                <Trophy size={20} className={rankStyles[rank]} />
                <span className={`font-bold text-lg ${rankStyles[rank]}`}>{rank}</span>
            </div>
        );
    }

    return <span className="font-bold text-lg text-text-secondary">{rank}</span>;
});

export const LeaderboardRow: React.FC<LeaderboardRowProps> = React.memo(({ rank, member, value, isCurrentUser }) => {
  const highlightClass = isCurrentUser ? 'bg-primary/10' : '';

  return (
    <>
      {/* Desktop View */}
      <tr className={`hidden md:table-row border-b border-border last:border-b-0 ${highlightClass}`}>
        <td className="p-4 w-20">
          <RankDisplay rank={rank} />
        </td>
        <td className="p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-on-accent font-bold text-lg flex-shrink-0">
              {(member.name || ' ').charAt(0).toUpperCase()}
            </div>
            <span className="ml-4 font-semibold text-text-primary">{member.name}</span>
          </div>
        </td>
        <td className="p-4 font-bold text-lg text-right text-text-primary">{value}</td>
      </tr>

      {/* Mobile View */}
      <Card className={`md:hidden p-3 ${highlightClass}`}>
        <div className="flex items-center justify-between">
            <div className="w-16"><RankDisplay rank={rank} /></div>
            <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-on-accent font-bold text-lg flex-shrink-0">
                {(member.name || ' ').charAt(0).toUpperCase()}
            </div>
            <p className="font-semibold text-text-primary truncate">{member.name}</p>
             <p className="font-bold text-lg text-text-primary flex-shrink-0 ml-2">{value}</p>
        </div>
      </Card>
    </>
  );
});