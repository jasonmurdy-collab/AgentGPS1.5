import React, { FC, DragEvent, useCallback } from 'react';
import type { Candidate, TeamMember } from '../../types';
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
    canDrag: boolean;
    onClick: () => void;
    onDragStart: (e: DragEvent<HTMLDivElement>, id: string) => void;
}> = React.memo(({ candidate, owner, canDrag, onClick, onDragStart }) => {
    const ownerInitials = owner?.name.split(' ').map(n => n[0]).join('') || '?';
    
    const handleDragStartCallback = useCallback((e: DragEvent<HTMLDivElement>) => {
        if (canDrag) {
            onDragStart(e, candidate.id);
        }
    }, [canDrag, onDragStart, candidate.id]);

    return (
        <div
            draggable={canDrag}
            onDragStart={handleDragStartCallback}
            onClick={onClick}
            className={`p-3 mb-3 bg-surface border border-border rounded-lg shadow-sm ${canDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} hover:border-primary hover:bg-primary/5 transition-all`}
            aria-label={`Candidate: ${candidate.name}, stage: ${candidate.stage}`}
        >
            <div className="flex justify-between items-start">
                <p className="font-bold text-text-primary pr-2">{candidate.name}</p>
                <div className="w-6 h-6 rounded-full bg-accent flex-shrink-0 flex items-center justify-center text-on-accent font-bold text-xs" title={`Owner: ${owner?.name}`}>{ownerInitials}</div>
            </div>
            <div className="flex items-center gap-4 mt-2 text-xs text-text-secondary">
                <a href={`mailto:${candidate.email}`} onClick={e => e.stopPropagation()} className="flex items-center gap-1 hover:text-primary"><Mail size={14} /> Email</a>
                {candidate.phone && <a href={`tel:${candidate.phone}`} onClick={e => e.stopPropagation()} className="flex items-center gap-1 hover:text-primary"><Phone size={14} /> Call</a>}
            </div>
            <p className="text-xs text-text-secondary mt-3 text-right">Last contacted: {timeAgo(candidate.lastContacted)}</p>
        </div>
    );
});