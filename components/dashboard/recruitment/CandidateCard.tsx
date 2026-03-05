import React, { FC } from 'react';
import type { Candidate, TeamMember } from '../../../types';
import { Mail, Phone } from 'lucide-react';

function timeAgo(dateString: string) {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
    const minutes = Math.round(seconds / 60);
    const hours = Math.round(minutes / 60);
    const days = Math.round(hours / 24);

    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
}

export const CandidateCard: FC<{
    candidate: Candidate;
    owner: TeamMember | undefined;
    onClick: () => void;
}> = React.memo(({ candidate, owner, onClick }) => {
    const ownerInitials = owner?.name.split(' ').map(n => n[0]).join('') || '?';
    
    return (
        <div
            onClick={onClick}
            className="p-4 bg-surface border border-border rounded-2xl shadow-sm hover:shadow-md hover:border-primary/50 hover:bg-primary/[0.02] transition-all cursor-pointer group"
            aria-label={`Candidate: ${candidate.name}, stage: ${candidate.stage}`}
        >
            <div className="flex justify-between items-start mb-3">
                <div>
                    <p className="font-bold text-text-primary text-lg leading-tight group-hover:text-primary transition-colors">{candidate.name}</p>
                    {candidate.currentBrokerage && (
                        <span className="inline-block mt-1 text-[10px] uppercase tracking-wider font-bold text-text-secondary bg-background px-2 py-0.5 rounded-full">
                            {candidate.currentBrokerage}
                        </span>
                    )}
                </div>
                {owner && (
                    <div 
                        className="w-8 h-8 rounded-full bg-primary/10 text-primary flex-shrink-0 flex items-center justify-center font-bold text-xs border border-primary/20" 
                        title={`Owner: ${owner.name}`}
                    >
                        {ownerInitials}
                    </div>
                )}
            </div>

            <div className="flex items-center gap-4 text-xs text-text-secondary">
                <a 
                    href={`mailto:${candidate.email}`} 
                    onClick={e => e.stopPropagation()} 
                    className="flex items-center gap-1.5 hover:text-primary transition-colors"
                >
                    <Mail size={14} /> Email
                </a>
                {candidate.phone && (
                    <a 
                        href={`tel:${candidate.phone}`} 
                        onClick={e => e.stopPropagation()} 
                        className="flex items-center gap-1.5 hover:text-primary transition-colors"
                    >
                        <Phone size={14} /> Call
                    </a>
                )}
            </div>

            <div className="mt-4 pt-3 border-t border-border/50 flex justify-between items-center">
                <span className="text-[10px] text-text-secondary uppercase font-medium tracking-tight">Last Contact</span>
                <span className="text-xs font-semibold text-text-primary">{timeAgo(candidate.lastContacted)}</span>
            </div>
        </div>
    );
});
