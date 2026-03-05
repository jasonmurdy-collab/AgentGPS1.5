
import React, { FC } from 'react';
import { Mail, Phone, DollarSign, Home, User } from 'lucide-react';
import { ClientLead, CLIENT_LEAD_PIPELINE_STAGES, ClientLeadPipelineStage, TeamMember } from '../../types';

interface LeadDetailsFormProps {
    lead: ClientLead;
    isEditing: boolean;
    editData: ClientLead;
    setEditData: (data: ClientLead) => void;
    teamMembers: TeamMember[];
    userData: TeamMember | null;
}

export const LeadDetailsForm: FC<LeadDetailsFormProps> = ({ lead, isEditing, editData, setEditData, teamMembers, userData }) => {
    const inputClasses = "w-full bg-input border border-border rounded-md p-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary";
    const labelClasses = "block text-xs font-semibold text-text-secondary mb-0.5";
    const leadOwner = teamMembers.find(m => m.id === lead.ownerId) || userData;

    if (isEditing) {
        return (
            <div className="space-y-4">
                <h3 className="font-bold text-lg border-b border-border pb-2">Edit Details</h3>
                <div>
                    <label className={labelClasses}>Email</label>
                    <input type="email" value={editData.email} onChange={e => setEditData({ ...editData, email: e.target.value })} className={inputClasses} />
                </div>
                <div>
                    <label className={labelClasses}>Phone</label>
                    <input type="tel" value={editData.phone || ''} onChange={e => setEditData({ ...editData, phone: e.target.value })} className={inputClasses} />
                </div>
                <div>
                    <label className={labelClasses}>Lead Source</label>
                    <input type="text" value={editData.leadSource || ''} onChange={e => setEditData({ ...editData, leadSource: e.target.value })} className={inputClasses} />
                </div>
                <div>
                    <label className={labelClasses}>Budget</label>
                    <input type="number" value={editData.budget || ''} onChange={e => setEditData({ ...editData, budget: Number(e.target.value) })} className={inputClasses} />
                </div>
                <div>
                    <label className={labelClasses}>Property Type</label>
                    <input type="text" value={editData.propertyType || ''} onChange={e => setEditData({ ...editData, propertyType: e.target.value })} className={inputClasses} placeholder="e.g. Single Family"/>
                </div>
                <div>
                    <label className={labelClasses}>Stage</label>
                    <select value={editData.stage} onChange={e => setEditData({ ...editData, stage: e.target.value as ClientLeadPipelineStage })} className={inputClasses}>
                        {CLIENT_LEAD_PIPELINE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                {teamMembers.length > 0 && (
                    <div>
                        <label className={labelClasses}>Owner</label>
                        <select value={editData.ownerId} onChange={e => setEditData({...editData, ownerId: e.target.value})} className={inputClasses}>
                            {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                    </div>
                )}
                <div>
                    <label className={labelClasses}>Notes about Lead</label>
                    <textarea value={editData.notes || ''} onChange={e => setEditData({ ...editData, notes: e.target.value })} className={inputClasses} rows={4} />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h3 className="font-bold text-lg border-b border-border pb-2">Lead Details</h3>
            <div>
                <label className={labelClasses}>Email</label>
                <p className="flex items-center gap-2 text-sm"><Mail size={14} /> {lead.email}</p>
            </div>
            <div>
                <label className={labelClasses}>Phone</label>
                <p className="flex items-center gap-2 text-sm"><Phone size={14} /> {lead.phone || 'Not provided'}</p>
            </div>
            <div>
                <label className={labelClasses}>Lead Source</label>
                <p className="flex items-center gap-2 text-sm">{lead.leadSource || 'Not specified'}</p>
            </div>
            <div>
                <label className={labelClasses}>Budget</label>
                <p className="flex items-center gap-2 text-sm"><DollarSign size={14} /> ${lead.budget?.toLocaleString() || 'Not set'}</p>
            </div>
            <div>
                <label className={labelClasses}>Property Type</label>
                <p className="flex items-center gap-2 text-sm"><Home size={14} /> {lead.propertyType || 'Not specified'}</p>
            </div>
            <div>
                <label className={labelClasses}>Owner</label>
                <p className="flex items-center gap-2 text-sm"><User size={14} /> {leadOwner?.name || 'Unknown'}</p>
            </div>
            <div>
                <label className={labelClasses}>General Notes</label>
                <p className="text-sm p-2 bg-background/50 rounded-md min-h-[60px]">{lead.notes || 'No general notes.'}</p>
            </div>
        </div>
    );
};
