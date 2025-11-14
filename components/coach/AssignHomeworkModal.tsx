import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Card } from '../ui/Card';
import { X } from 'lucide-react';
import { NewAgentHomework } from '../../types';
import { Spinner } from '../ui/Spinner';

type HomeworkFormData = Omit<NewAgentHomework, 'id' | 'userId' | 'teamId' | 'marketCenterId'>;

interface AssignHomeworkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (homework: HomeworkFormData) => Promise<void>;
  agentName: string;
}

export const AssignHomeworkModal: React.FC<AssignHomeworkModalProps> = ({ isOpen, onClose, onSubmit, agentName }) => {
    const [formData, setFormData] = useState<HomeworkFormData>({
        week: 1,
        title: '',
        description: '',
        url: ''
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? parseInt(value, 10) || 0 : value
        }));
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title || !formData.description) {
            alert('Please fill out the title and description.');
            return;
        }
        setLoading(true);
        try {
            await onSubmit(formData);
            onClose();
        } catch (error) {
            console.error("Failed to assign homework:", error);
            alert("There was an error assigning homework. Please try again.");
        } finally {
            setLoading(false);
        }
    };
    
    if (!isOpen) return null;

    const inputClasses = "w-full bg-input border border-border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary";
    const labelClasses = "block text-sm font-medium text-text-secondary mb-1";
    
    return createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-lg">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-text-primary">Assign Homework</h2>
                        <p className="text-sm text-text-secondary">For: {agentName}</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-text-primary/5">
                        <X />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                     <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="sm:col-span-1">
                            <label htmlFor="week" className={labelClasses}>Week</label>
                            <input type="number" id="week" name="week" value={formData.week} onChange={handleChange} className={inputClasses} required />
                        </div>
                        <div className="sm:col-span-2">
                            <label htmlFor="title" className={labelClasses}>Title</label>
                            <input type="text" id="title" name="title" value={formData.title} onChange={handleChange} className={inputClasses} required />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="description" className={labelClasses}>Description</label>
                        <textarea id="description" name="description" value={formData.description} onChange={handleChange} className={`${inputClasses} min-h-[100px]`} required />
                    </div>
                     <div>
                        <label htmlFor="url" className={labelClasses}>Resource URL (Optional)</label>
                        <input type="url" id="url" name="url" value={formData.url || ''} onChange={handleChange} className={inputClasses} placeholder="https://example.com" />
                    </div>
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="py-2 px-4 rounded-lg text-text-secondary hover:bg-text-primary/5">Cancel</button>
                        <button type="submit" disabled={loading} className="min-w-[120px] flex justify-center items-center py-2 px-4 rounded-lg bg-primary text-on-accent font-semibold hover:bg-opacity-90 disabled:bg-opacity-50">
                            {loading ? <Spinner /> : "Assign Homework"}
                        </button>
                    </div>
                </form>
            </Card>
        </div>,
        document.body
    );
};