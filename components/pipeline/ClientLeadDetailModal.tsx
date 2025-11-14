import React, { FC, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Card } from '../ui/Card';
import { Spinner } from '../ui/Spinner';
import { useAuth } from '../../contexts/AuthContext';
import { ClientLead, ClientLeadActivity, CLIENT_LEAD_PIPELINE_STAGES, ClientLeadPipelineStage, TeamMember } from '../../types';
import { X, Edit, Trash2, Send, Mail, Phone, DollarSign, Home, BookOpen, User } from 'lucide-react';

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

export const ClientLeadDetailModal: FC<{
    lead: ClientLead;
    teamMembers: TeamMember[];
    onClose: () => void;
    onUpdate: (id: string, updates: Partial<ClientLead>) => void;
    onDelete: (id: string) => void;
}> = ({ lead, teamMembers, onClose, onUpdate, onDelete }) => {
    const { getClientLeadActivities, addClientLeadActivity, userData } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState(lead);
    const [activities, setActivities] = useState<ClientLeadActivity[]>([]);
    const [loadingActivities, setLoadingActivities] = useState(true);
    const [newNote, setNewNote] = useState('');
    const [isLoggingNote, setIsLoggingNote] = useState(false);

    const fetchActivities = useCallback(async () => {
        setLoadingActivities(true);
        const fetchedActivities = await getClientLeadActivities(lead.id);
        setActivities(fetchedActivities);
        setLoadingActivities(false);
    }, [lead.id, getClientLeadActivities]);

    useEffect(() => {
        fetchActivities();
    }, [fetchActivities]);

    useEffect(() => {
        setEditData(lead);
    }, [lead]);

    const handleSave = () => {
        const updates: Partial<ClientLead> = {};
        (Object.keys(editData) as Array<keyof ClientLead>).forEach(key => {
            if (editData[key] !== lead[key]) {
                (updates as any)[key] = editData[key];
            }
        });
        
        if (Object.keys(updates).length > 0) {
            onUpdate(lead.id, updates);
        }
        setIsEditing(false);
    };

    const handleDelete = () => {
        if (window.confirm(`Are you sure you want to delete ${lead.name}? This action cannot be undone.`)) {
            onDelete(lead.id);
        }
    };

    const handleLogNote = async () => {
        if (!newNote.trim()) return;
        setIsLoggingNote(true);
        await addClientLeadActivity(lead.id, newNote.trim());
        setNewNote('');
        await fetchActivities();
        setIsLoggingNote(false);
    };

    const inputClasses = "w-full bg-input border border-border rounded-md p-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary";
    const labelClasses = "block text-xs font-semibold text-text-secondary mb-0.5";
    const leadOwner = teamMembers.find(m => m.id === lead.ownerId) || userData;

    return createPortal(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-start mb-4 pb-4 border-b border-border">
                    <div className="flex-grow">
                        {isEditing ? (
                            <input type="text" value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })} className="text-3xl font-bold bg-input border border-border rounded-md px-2 py-1" />
                        ) : (
                            <h2 className="text-3xl font-bold">{lead.name}</h2>
                        )}
                        <p className="text-sm text-text-secondary">In <span className="font-semibold text-primary">{lead.stage}</span> stage</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {!isEditing && <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 bg-primary/10 text-primary font-semibold py-2 px-3 rounded-lg text-sm"><Edit size={14} /> Edit Details</button>}
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-primary/10 self-start"><X /></button>
                    </div>
                </div>

                <div className="flex-grow overflow-y-auto pr-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        {/* Details Column */}
                        <div className="md:col-span-1 space-y-4">
                            {isEditing ? (
                                <div className="space-y-4">
                                    <h3 className="font-bold text-lg border-b border-border pb-2">Edit Details</h3>
                                    <div><label className={labelClasses}>Email</label><input type="email" value={editData.email} onChange={e => setEditData({ ...editData, email: e.target.value })} className={inputClasses} /></div>
                                    <div><label className={labelClasses}>Phone</label><input type="tel" value={editData.phone || ''} onChange={e => setEditData({ ...editData, phone: e.target.value })} className={inputClasses} /></div>
                                    <div><label className={labelClasses}>Lead Source</label><input type="text" value={editData.leadSource || ''} onChange={e => setEditData({ ...editData, leadSource: e.target.value })} className={inputClasses} /></div>
                                    <div><label className={labelClasses}>Budget</label><input type="number" value={editData.budget || ''} onChange={e => setEditData({ ...editData, budget: Number(e.target.value) })} className={inputClasses} /></div>
                                    <div><label className={labelClasses}>Property Type</label><input type="text" value={editData.propertyType || ''} onChange={e => setEditData({ ...editData, propertyType: e.target.value })} className={inputClasses} placeholder="e.g. Single Family"/></div>
                                    <div><label className={labelClasses}>Stage</label><select value={editData.stage} onChange={e => setEditData({ ...editData, stage: e.target.value as ClientLeadPipelineStage })} className={inputClasses}>{CLIENT_LEAD_PIPELINE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                                    {teamMembers.length > 0 && (
                                        <div><label className={labelClasses}>Owner</label><select value={editData.ownerId} onChange={e => setEditData({...editData, ownerId: e.target.value})} className={inputClasses}>{teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <h3 className="font-bold text-lg border-b border-border pb-2">Lead Details</h3>
                                    <div><label className={labelClasses}>Email</label><p className="flex items-center gap-2 text-sm"><Mail size={14} /> {lead.email}</p></div>
                                    <div><label className={labelClasses}>Phone</label><p className="flex items-center gap-2 text-sm"><Phone size={14} /> {lead.phone || 'Not provided'}</p></div>
                                    <div><label className={labelClasses}>Lead Source</label><p className="flex items-center gap-2 text-sm">{lead.leadSource || 'Not specified'}</p></div>
                                    <div><label className={labelClasses}>Budget</label><p className="flex items-center gap-2 text-sm"><DollarSign size={14} /> ${lead.budget?.toLocaleString() || 'Not set'}</p></div>
                                    <div><label className={labelClasses}>Property Type</label><p className="flex items-center gap-2 text-sm"><Home size={14} /> {lead.propertyType || 'Not specified'}</p></div>
                                    <div><label className={labelClasses}>Owner</label><p className="flex items-center gap-2 text-sm"><User size={14} /> {leadOwner?.name || 'Unknown'}</p></div>
                                </div>
                            )}
                            
                            {isEditing ? (
                                <div className="flex items-center gap-2 pt-2">
                                    <button onClick={handleSave} className="flex-1 bg-primary text-on-accent font-semibold py-2 rounded-lg">Save</button>
                                    <button onClick={() => { setIsEditing(false); setEditData(lead); }} className="flex-1 border border-border py-2 rounded-lg">Cancel</button>
                                </div>
                            ) : (
                                <button onClick={handleDelete} className="w-full flex items-center justify-center gap-2 mt-2 bg-destructive/10 text-destructive font-semibold py-2 rounded-lg"><Trash2 size={14} /> Delete Lead</button>
                            )}
                        </div>

                        {/* Timeline Column */}
                        <div className="md:col-span-2">
                            <h3 className="font-bold text-lg mb-4">Activity Timeline</h3>
                            {loadingActivities ? <Spinner /> : (
                                <div className="space-y-4">
                                    {activities.map(activity => (
                                        <div key={activity.id} className="flex items-start gap-3">
                                            <div className="w-8 h-8 rounded-full bg-accent text-on-accent flex items-center justify-center text-xs font-bold flex-shrink-0" title={activity.userName}>{activity.userName.split(' ').map(n=>n[0]).join('')}</div>
                                            <div className="w-full">
                                                <div className="flex justify-between items-baseline">
                                                    <p className="font-semibold text-sm">{activity.userName}</p>
                                                    <p className="text-xs text-text-secondary">{timeAgo(activity.createdAt)}</p>
                                                </div>
                                                <p className="text-sm p-2 bg-background/50 rounded-md mt-1">{activity.note}</p>
                                            </div>
                                        </div>
                                    ))}
                                    {activities.length === 0 && <p className="text-sm text-center text-text-secondary py-4">No activities logged yet.</p>}
                                </div>
                            )}
                            
                            <div className="mt-6 pt-4 border-t border-border">
                                <h4 className="font-semibold mb-2">Log a new note or activity</h4>
                                <div className="flex items-start gap-2">
                                    <textarea value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Log a call, showing, or general note..." className="w-full bg-input border border-border rounded-md p-2 text-sm min-h-[60px]" />
                                    <button onClick={handleLogNote} disabled={isLoggingNote} className="p-2 bg-primary text-on-accent rounded-md disabled:bg-opacity-50"><Send size={16} /></button>
                                </div>
                                 <div className="mt-4">
                                    <label className={labelClasses}>Notes about Lead</label>
                                    {isEditing ? (
                                        <textarea value={editData.notes || ''} onChange={e => setEditData({ ...editData, notes: e.target.value })} className={inputClasses} rows={4} />
                                    ) : (
                                         <p className="text-sm p-2 bg-background/50 rounded-md min-h-[60px]">{lead.notes || 'No general notes.'}</p>
                                    )}
                                 </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>
        </div>,
        document.body
    );
};
