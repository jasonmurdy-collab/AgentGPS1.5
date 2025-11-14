import React, { useState, FC } from 'react';
import { createPortal } from 'react-dom';
import { Card } from '../ui/Card';
import { X } from 'lucide-react';
import { Spinner } from '../ui/Spinner';
import { ClientLead, ClientLeadPipelineStage, CLIENT_LEAD_PIPELINE_STAGES } from '../../types';

interface AddClientLeadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: Omit<ClientLead, 'id' | 'createdAt' | 'lastContacted' | 'ownerId' | 'teamId' | 'marketCenterId'>) => Promise<void>;
}

export const AddClientLeadModal: FC<AddClientLeadModalProps> = ({ isOpen, onClose, onSubmit }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [stage, setStage] = useState<ClientLeadPipelineStage>('New Lead');
    const [leadSource, setLeadSource] = useState('');
    const [budget, setBudget] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSubmit({ 
                name, email, phone, stage, leadSource,
                budget: Number(budget) || undefined,
                notes,
            });
            setName(''); setEmail(''); setPhone(''); setStage('New Lead');
            setLeadSource(''); setBudget(''); setNotes('');
            onClose();
        } catch (error) {
            console.error(error);
            alert('Failed to add lead.');
        }
        setLoading(false);
    };

    if (!isOpen) return null;

    const inputClasses = "w-full bg-input border border-border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary";
    const labelClasses = "block text-sm font-medium text-text-secondary mb-1";

    return createPortal(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-lg">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Add New Lead</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-primary/10"><X /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="add-lead-name" className={labelClasses}>Full Name</label>
                        <input id="add-lead-name" type="text" value={name} onChange={e => setName(e.target.value)} className={inputClasses} required />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="add-lead-email" className={labelClasses}>Email</label>
                            <input id="add-lead-email" type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputClasses} required />
                        </div>
                        <div>
                            <label htmlFor="add-lead-phone" className={labelClasses}>Phone (Optional)</label>
                            <input id="add-lead-phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} className={inputClasses} />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="add-lead-source" className={labelClasses}>Lead Source (Optional)</label>
                            <input id="add-lead-source" type="text" value={leadSource} onChange={e => setLeadSource(e.target.value)} className={inputClasses} placeholder="e.g., Open House"/>
                        </div>
                         <div>
                            <label htmlFor="add-lead-budget" className={labelClasses}>Budget (Optional)</label>
                            <input id="add-lead-budget" type="number" value={budget} onChange={e => setBudget(e.target.value)} className={inputClasses} placeholder="e.g., 500000" />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="add-lead-stage" className={labelClasses}>Initial Stage</label>
                        <select id="add-lead-stage" value={stage} onChange={e => setStage(e.target.value as ClientLeadPipelineStage)} className={inputClasses}>
                            {CLIENT_LEAD_PIPELINE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="add-lead-notes" className={labelClasses}>Notes (Optional)</label>
                        <textarea id="add-lead-notes" value={notes} onChange={e => setNotes(e.target.value)} className={inputClasses} rows={3}></textarea>
                    </div>
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="py-2 px-4 rounded-lg text-text-secondary">Cancel</button>
                        <button type="submit" disabled={loading} className="min-w-[120px] flex justify-center items-center py-2 px-4 rounded-lg bg-primary text-on-accent font-semibold">{loading ? <Spinner /> : "Add Lead"}</button>
                    </div>
                </form>
            </Card>
        </div>,
        document.body
    );
};