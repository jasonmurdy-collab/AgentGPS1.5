
import React, { FC, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Card } from '../ui/Card';
import { useAuth } from '../../contexts/AuthContext';
import { ClientLead, TeamMember } from '../../types';
import { X, Edit, MessageSquare } from 'lucide-react';
import { SMSModal } from './SMSModal';
import { ActivityTimeline } from './ActivityTimeline';
import { LeadDetailsForm } from './LeadDetailsForm';
import { toast } from 'sonner';

export const ClientLeadDetailModal: FC<{
    lead: ClientLead;
    teamMembers: TeamMember[];
    onClose: () => void;
    onUpdate: (id: string, updates: Partial<ClientLead>) => void;
    onDelete: (id: string) => void;
}> = ({ lead, teamMembers, onClose, onUpdate, onDelete }) => {
    const { getClientLeadActivities, addClientLeadActivity, userData, sendSms } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState(lead);
    const [isSMSModalOpen, setIsSMSModalOpen] = useState(false);

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

    const handleRealSendSMS = async (message: string) => {
        const result = await sendSms(lead.phone, message);
        if (result.success) {
            await addClientLeadActivity(lead.id, `[SMS Sent]: ${message}`);
            toast.success("SMS sent successfully");
        } else {
            throw new Error(result.error);
        }
    };

    const isTwilioReady = !!(userData?.twilioSid && userData?.twilioToken && userData?.twilioNumber);

    return createPortal(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
                <div className="flex justify-between items-start mb-4 pb-4 border-b border-border">
                    <div className="flex-grow">
                        {isEditing ? (
                            <input 
                                type="text" 
                                value={editData.name} 
                                onChange={e => setEditData({ ...editData, name: e.target.value })} 
                                className="text-3xl font-bold bg-input border border-border rounded-xl px-4 py-2 w-full focus:ring-2 focus:ring-primary outline-none" 
                            />
                        ) : (
                            <h2 className="text-3xl font-bold tracking-tight">{lead.name}</h2>
                        )}
                        <p className="text-sm text-text-secondary mt-1">In <span className="font-bold text-primary uppercase tracking-wider text-xs">{lead.stage}</span> stage</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                        {!isEditing && (
                            <>
                                <button 
                                    onClick={() => setIsSMSModalOpen(true)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${isTwilioReady ? 'bg-primary text-on-accent shadow-lg shadow-primary/20' : 'bg-surface border border-border text-text-secondary opacity-50'}`}
                                >
                                    <MessageSquare size={16}/> Text Lead
                                </button>
                                <button 
                                    onClick={() => setIsEditing(true)} 
                                    className="flex items-center gap-2 bg-surface border border-border text-text-primary font-bold py-2 px-4 rounded-xl text-sm hover:bg-primary/5 transition-colors"
                                >
                                    <Edit size={14} /> Edit Details
                                </button>
                            </>
                        )}
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-primary/10 self-start transition-colors"><X /></button>
                    </div>
                </div>

                <div className="flex-grow overflow-y-auto pr-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-6">
                        {/* Details Column */}
                        <div className="md:col-span-1 space-y-6">
                            <LeadDetailsForm 
                                lead={lead}
                                isEditing={isEditing}
                                editData={editData}
                                setEditData={setEditData}
                                teamMembers={teamMembers}
                                userData={userData}
                            />
                            
                            {isEditing ? (
                                <div className="flex items-center gap-3 pt-4">
                                    <button onClick={handleSave} className="flex-1 bg-primary text-on-accent font-bold py-2.5 rounded-xl shadow-lg shadow-primary/20">Save Changes</button>
                                    <button onClick={() => { setIsEditing(false); setEditData(lead); }} className="flex-1 border border-border py-2.5 rounded-xl font-bold text-text-secondary">Cancel</button>
                                </div>
                            ) : (
                                <button 
                                    onClick={handleDelete} 
                                    className="w-full flex items-center justify-center gap-2 mt-4 bg-destructive/5 text-destructive font-bold py-2.5 rounded-xl hover:bg-destructive/10 transition-colors"
                                >
                                    Delete Lead
                                </button>
                            )}
                        </div>

                        {/* Timeline Column */}
                        <div className="md:col-span-2">
                            <ActivityTimeline 
                                leadId={lead.id}
                                getActivities={getClientLeadActivities}
                                addActivity={addClientLeadActivity}
                            />
                        </div>
                    </div>
                </div>
            </Card>
            <SMSModal 
                isOpen={isSMSModalOpen}
                onClose={() => setIsSMSModalOpen(false)}
                recipientName={lead.name}
                recipientPhone={lead.phone}
                isConfigured={isTwilioReady}
                onSend={handleRealSendSMS}
            />
        </div>,
        document.body
    );
};
