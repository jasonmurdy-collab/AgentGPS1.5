import React, { FC, DragEvent, useCallback } from 'react';
import type { ClientLead, TeamMember } from '../../types';
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

export const ClientLeadCard: FC<{
    lead: ClientLead;
    owner?: TeamMember;
    onClick: () => void;
    onDragStart: (e: DragEvent<HTMLDivElement>, id: string) => void;
}> = React.memo(({ lead, owner, onClick, onDragStart }) => {
    
    const handleDragStartCallback = useCallback((e: DragEvent<HTMLDivElement>) => {
        onDragStart(e, lead.id);
    }, [onDragStart, lead.id]);
    
    const ownerInitials = owner?.name?.split(' ').map(n => n[0]).join('') || '?';

    return (
        <div
            draggable
            onDragStart={handleDragStartCallback}
            onClick={onClick}
            className="p-3 mb-3 bg-surface border border-border rounded-lg shadow-sm cursor-grab active:cursor-grabbing hover:border-primary hover:bg-primary/5 transition-all"
            aria-label={`Lead: ${lead.name}, stage: ${lead.stage}`}
        >
            <div className="flex justify-between items-start">
                <p className="font-bold text-text-primary pr-2">{lead.name}</p>
                {owner ? (
                    <div className="w-6 h-6 rounded-full bg-accent flex-shrink-0 flex items-center justify-center text-on-accent font-bold text-xs" title={`Owner: ${owner.name}`}>{ownerInitials}</div>
                ) : (
                    lead.leadSource && <span className="text-xs bg-accent-secondary/20 text-accent-secondary font-semibold px-2 py-0.5 rounded-full flex-shrink-0">{lead.leadSource}</span>
                )}
            </div>
            <div className="flex items-center gap-4 mt-2 text-xs text-text-secondary">
                <a href={`mailto:${lead.email}`} onClick={e => e.stopPropagation()} className="flex items-center gap-1 hover:text-primary"><Mail size={14} /> Email</a>
                {lead.phone && <a href={`tel:${lead.phone}`} onClick={e => e.stopPropagation()} className="flex items-center gap-1 hover:text-primary"><Phone size={14} /> Call</a>}
            </div>
            <p className="text-xs text-text-secondary mt-3 text-right">Last contacted: {timeAgo(lead.lastContacted)}</p>
        </div>
    );
});
