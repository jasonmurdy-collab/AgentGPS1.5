import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Card } from '../ui/Card';
import { X } from 'lucide-react';
import { GoalType, Goal } from '../../types';
import { Spinner } from '../ui/Spinner';

type GoalFormData = Omit<Goal, 'id' | 'currentValue' | 'userId' | 'teamId' | 'marketCenterId' | 'createdAt' | 'userName'> & {
    startDate?: string;
    endDate?: string;
};

interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (goal: GoalFormData) => Promise<void>;
  title: string;
  description?: string;
  submitButtonText: string;
  initialGoalData?: {
    title?: string;
    metric?: string;
    type?: GoalType;
  };
  goalToEdit?: Goal | null;
}

export const GoalModal: React.FC<GoalModalProps> = ({ isOpen, onClose, onSubmit, title, description, submitButtonText, initialGoalData, goalToEdit }) => {
    const [goalTitle, setGoalTitle] = useState('');
    const [metric, setMetric] = useState('');
    const [targetValue, setTargetValue] = useState('');
    const [type, setType] = useState<GoalType>(GoalType.Weekly);
    const [visibility, setVisibility] = useState<Goal['visibility']>('solo');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
      if (isOpen) {
        setLoading(false);
        if (goalToEdit) {
          setGoalTitle(goalToEdit.title);
          setMetric(goalToEdit.metric);
          setTargetValue(String(goalToEdit.targetValue));
          setType(goalToEdit.type);
          setVisibility(goalToEdit.visibility);
          setStartDate(goalToEdit.startDate ? new Date(goalToEdit.startDate).toISOString().split('T')[0] : '');
          setEndDate(goalToEdit.endDate ? new Date(goalToEdit.endDate).toISOString().split('T')[0] : '');
        } else if (initialGoalData) {
          setGoalTitle(initialGoalData.title || '');
          setMetric(initialGoalData.metric || '');
          if (initialGoalData.type) {
            setType(initialGoalData.type);
          }
        }
      } else {
        // Reset form when modal closes
        setGoalTitle('');
        setMetric('');
        setTargetValue('');
        setType(GoalType.Weekly);
        setVisibility('solo');
        setStartDate('');
        setEndDate('');
      }
    }, [isOpen, initialGoalData, goalToEdit]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const numericTargetValue = parseInt(targetValue, 10);
        if (!goalTitle || !metric || isNaN(numericTargetValue) || numericTargetValue <= 0) {
            alert('Please fill out all fields with valid values.');
            return;
        }
        if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
            alert('Start date cannot be after the end date.');
            return;
        }

        setLoading(true);
        try {
            await onSubmit({ title: goalTitle, metric, targetValue: numericTargetValue, type, visibility, startDate, endDate });
            onClose();
        } catch (error) {
            console.error("Failed to save goal:", error);
            alert("There was an error saving your goal. Please try again.");
            setLoading(false);
        }
    };

    const inputClasses = "w-full bg-input border border-border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary";
    const labelClasses = "block text-sm font-medium text-text-secondary mb-1";

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-text-primary">{title}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-text-primary/5">
            <X />
          </button>
        </div>
        {description && <p className="text-sm text-text-secondary mb-4 -mt-4">{description}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="title" className={labelClasses}>Goal Title</label>
             <input type="text" id="title" value={goalTitle} onChange={e => setGoalTitle(e.target.value)} className={inputClasses} placeholder="e.g., Make 100 prospecting calls" />
          </div>

          <div>
            <label htmlFor="metric" className={labelClasses}>Metric</label>
            <input type="text" id="metric" value={metric} onChange={e => setMetric(e.target.value)} className={inputClasses} placeholder="e.g., Calls Made"/>
          </div>

          <div>
            <label htmlFor="target" className={labelClasses}>Target Value</label>
            <input type="number" id="target" value={targetValue} onChange={e => setTargetValue(e.target.value)} className={inputClasses} placeholder="100"/>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <div>
                <label htmlFor="type" className={labelClasses}>Goal Type</label>
                <select id="type" value={type} onChange={e => setType(e.target.value as GoalType)} className={inputClasses}>
                    {Object.values(GoalType).map(t => <option key={t as string} value={t as string}>{t}</option>)}
                </select>
            </div>
             <div>
                <label htmlFor="visibility" className={labelClasses}>Visibility</label>
                <select id="visibility" value={visibility} onChange={e => setVisibility(e.target.value as Goal['visibility'])} className={inputClasses}>
                    <option value="solo">Solo</option>
                    <option value="team_view_only">Team</option>
                    <option value="public">Public</option>
                </select>
                {visibility === 'public' && (
                  <p className="text-xs text-text-secondary mt-1">
                      Public goals are visible to all users on the Community page.
                  </p>
                )}
            </div>
            {/* These date inputs are now correctly inside the responsive grid */}
            <div>
                <label htmlFor="startDate" className={labelClasses}>Start Date <span className="text-xs">(Optional)</span></label>
                <input type="date" id="startDate" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputClasses}/>
            </div>
            <div>
                <label htmlFor="endDate" className={labelClasses}>End Date <span className="text-xs">(Optional)</span></label>
                <input type="date" id="endDate" value={endDate} onChange={e => setEndDate(e.target.value)} className={inputClasses}/>
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <button type="button" onClick={onClose} className="py-2 px-4 rounded-lg text-text-secondary hover:bg-text-primary/5">Cancel</button>
            <button type="submit" disabled={loading} className="min-w-[120px] flex justify-center items-center py-2 px-4 rounded-lg bg-primary text-on-accent font-semibold hover:bg-opacity-90 disabled:bg-opacity-50">
              {loading ? <Spinner /> : submitButtonText}
            </button>
          </div>
        </form>
      </Card>
    </div>,
    document.body
  );
};