import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { Goal } from '../../types';
import { Card } from '../ui/Card';
import { useGoals } from '../../contexts/GoalContext';
import { useAuth } from '../../contexts/AuthContext';
import { Check, CheckCircle2, Clock, MoreVertical, Edit, Trash2, Archive, ArchiveRestore, RotateCcw } from 'lucide-react';
import { Spinner } from '../ui/Spinner';

const PacingInfo: React.FC<{ goal: Goal; progress: number }> = React.memo(({ goal, progress }) => {
    if (!goal.endDate || !goal.startDate) {
        return null;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(goal.startDate);
    const endDate = new Date(goal.endDate);

    const daysLeft = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (progress >= 100) {
        return null; // Don't show pacing if completed
    }
    
    let status = { label: '', color: '' };

    if (today > endDate) {
        status = { label: 'Overdue', color: 'bg-destructive/20 text-destructive' };
    } else if (today < startDate) {
        status = { label: 'Upcoming', color: 'bg-background text-text-secondary' };
    } else {
        const totalDuration = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
        if (totalDuration > 0) {
            const elapsedDuration = (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
            const expectedProgress = (elapsedDuration / totalDuration) * 100;

            if (progress >= expectedProgress) {
                status = { label: 'On Pace', color: 'bg-success/20 text-success' };
            } else {
                status = { label: 'Behind Pace', color: 'bg-warning/20 text-warning' };
            }
        }
    }
    
    return (
        <div className="mt-3 flex items-center justify-between text-xs">
            {status.label && (
                <span className={`px-2 py-0.5 rounded-full font-semibold ${status.color}`}>
                    {status.label}
                </span>
            )}
            {daysLeft >= 0 && (
                 <span className="flex items-center gap-1 text-text-secondary">
                    <Clock size={12} />
                    {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left
                </span>
            )}
        </div>
    );
});

export const GoalProgressCard: React.FC<{ goal: Goal, onEdit?: () => void, onDelete?: () => void, onArchive?: () => void }> = React.memo(({ goal, onEdit, onDelete, onArchive }) => {
  const { updateGoalProgress, resetGoalProgress } = useGoals();
  const { user } = useAuth();
  const [customValue, setCustomValue] = useState('');
  const [loading, setLoading] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMenuOpen) {
        setConfirmingReset(false);
    }
  }, [isMenuOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
            setIsMenuOpen(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
        document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuRef]);

  const progress = goal.targetValue > 0 ? Math.min((goal.currentValue / goal.targetValue) * 100, 100) : 0;
  const isCompleted = progress >= 100;
  const isOwner = user?.uid === goal.userId;

  const handleUpdate = useCallback(async (amount: number, type: string) => {
    if (isNaN(amount) || amount <= 0) {
      if (type === 'custom') setCustomValue('');
      return;
    }
    setLoading(type);
    try {
      await updateGoalProgress(goal.id, amount);
      if (type === 'custom') {
        setCustomValue('');
      }
    } catch (error) {
      console.error("Failed to update progress", error);
      alert("Failed to update progress. Please try again.");
    } finally {
      setLoading(null);
    }
  }, [goal.id, updateGoalProgress]);

  const handleResetClick = useCallback(() => {
    if (confirmingReset) {
        setLoading('reset');
        setConfirmingReset(false);
        resetGoalProgress(goal.id)
            .catch((error) => {
                console.error("Failed to reset progress", error);
                alert("Failed to reset progress. Please try again.");
            })
            .finally(() => {
                setLoading(null);
                setIsMenuOpen(false);
            });
    } else {
        setConfirmingReset(true);
    }
  }, [confirmingReset, resetGoalProgress, goal.id]);

  const visibilityText = {
    'solo': 'Solo',
    'team_view_only': 'Team',
    'public': 'Public'
  }[goal.visibility] || 'Solo';

  const quickAddValues = [1, 5, 10];

  return (
    <Card className={`flex flex-col p-4 h-full transition-all duration-300 ${isCompleted && !goal.isArchived ? 'bg-primary/20 border-primary' : ''} ${goal.isArchived ? 'opacity-60 bg-surface/50' : ''}`}>
      <div>
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-md font-bold text-text-primary leading-normal">{goal.title}</h3>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {goal.isArchived ? (
                 <span className="text-xs font-medium text-text-secondary bg-background px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Archive size={14}/> Archived
                </span>
            ) : isCompleted ? (
                <span className="text-xs font-medium text-on-accent bg-primary px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 size={14}/> Completed
                </span>
            ) : (
              <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">{goal.type}</span>
            )}
            {(onEdit || onDelete || onArchive) && (
              <div className="relative" ref={menuRef}>
                  <button onClick={(e) => { e.stopPropagation(); setIsMenuOpen(prev => !prev); }} className="p-1 rounded-full hover:bg-primary/20" disabled={loading === 'reset'}>
                      {loading === 'reset' ? <Spinner className="w-4 h-4" /> : <MoreVertical size={16} />}
                  </button>
                  {isMenuOpen && (
                      <div className="absolute right-0 mt-2 w-44 bg-surface border border-border rounded-lg shadow-xl z-10">
                          {onEdit && (
                            <button onClick={() => { onEdit(); setIsMenuOpen(false); }} className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-text-primary hover:bg-primary/10 rounded-t-lg">
                                <Edit size={14} /> Edit
                            </button>
                          )}
                          {onArchive && (
                             <button onClick={() => { onArchive(); setIsMenuOpen(false); }} className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-text-primary hover:bg-primary/10">
                                {goal.isArchived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                                {goal.isArchived ? 'Unarchive' : 'Archive'}
                            </button>
                          )}
                          {isOwner && !goal.isArchived && goal.currentValue > 0 && !isCompleted && (
                                <button
                                    onClick={handleResetClick}
                                    onMouseLeave={() => {
                                        if (confirmingReset) {
                                            setConfirmingReset(false);
                                        }
                                    }}
                                    disabled={loading !== null}
                                    className={`w-full text-left flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
                                        confirmingReset 
                                        ? 'bg-destructive text-on-destructive' 
                                        : 'text-warning hover:bg-warning/10'
                                    }`}
                                >
                                    {loading === 'reset' ? <Spinner className="w-4 h-4" /> : <RotateCcw size={14} />}
                                    {confirmingReset ? 'Confirm Reset?' : 'Reset Progress'}
                                </button>
                           )}
                          {onDelete && (
                            <button onClick={() => { onDelete(); setIsMenuOpen(false); }} className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-b-lg">
                                <Trash2 size={14} /> Delete
                            </button>
                          )}
                      </div>
                  )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-auto pt-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-bold text-text-primary">{Math.round(progress)}%</span>
          <span className="text-xs text-text-secondary">
            {goal.currentValue.toLocaleString()} / {goal.targetValue.toLocaleString()}
          </span>
        </div>
        <div className="w-full bg-background rounded-full h-2">
          <div className="bg-primary h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
        </div>
        {!goal.isArchived && <PacingInfo goal={goal} progress={progress} />}
      </div>

      {!isCompleted && !goal.isArchived && isOwner ? (
        <div className="mt-4 pt-3 border-t border-border">
          <label className="text-xs font-medium text-text-secondary">Quick Update</label>
          <div className="flex items-center gap-2 mt-1">
            {quickAddValues.map(value => (
              <button
                key={value}
                onClick={() => handleUpdate(value, `quick-${value}`)}
                disabled={loading !== null}
                className="px-2 py-1 bg-primary/20 rounded-md text-text-primary hover:bg-opacity-90 disabled:bg-opacity-50 text-xs font-bold w-10 flex-shrink-0 transition-colors"
                aria-label={`Add ${value}`}
              >
                {loading === `quick-${value}` ? <Spinner className="w-4 h-4 mx-auto" /> : `+${value}`}
              </button>
            ))}
            <div className="h-6 w-px bg-border mx-1"></div>
            <div className="flex-1 flex items-center gap-1">
              <input
                type="number"
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                placeholder="Add"
                className="w-full bg-input border border-border text-text-primary rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                onKeyDown={(e) => e.key === 'Enter' && handleUpdate(parseInt(customValue, 10), 'custom')}
              />
              <button
                onClick={() => handleUpdate(parseInt(customValue, 10), 'custom')}
                disabled={loading !== null || !customValue || parseInt(customValue, 10) <= 0}
                className="p-1.5 bg-primary rounded-md text-on-accent hover:bg-opacity-90 disabled:bg-opacity-50 flex-shrink-0 transition-colors"
                aria-label="Add custom amount"
              >
                {loading === 'custom' ? <Spinner className="w-4 h-4" /> : <Check size={16} />}
              </button>
            </div>
          </div>
        </div>
      ) : goal.isArchived ? null : isCompleted ? (
        <div className="mt-4 pt-3 border-t border-border text-center text-primary font-semibold">
          Goal Achieved! Great work.
        </div>
      ) : null}
    </Card>
  );
});