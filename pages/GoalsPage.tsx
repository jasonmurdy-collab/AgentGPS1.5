import React, { useState, useMemo } from 'react';
import { useGoals } from '../contexts/GoalContext';
import { Card } from '../components/ui/Card';
import { GoalProgressCard } from '../components/dashboard/GoalProgressCard';
import { GoalModal } from '../components/goals/AddGoalModal';
import { Plus, Archive } from 'lucide-react';
import { SkeletonCard } from '../components/ui/SkeletonCard';
import { Goal, GoalType } from '../types';

type FilterType = GoalType | 'All';
type SortOrder = 'default' | 'title' | 'targetValue' | 'progress';

const GoalsPage: React.FC = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { personalGoals, addGoal, updateGoal, deleteGoal, toggleGoalArchiveStatus, loading } = useGoals();
    const [goalToEdit, setGoalToEdit] = useState<Goal | null>(null);
    const [filterType, setFilterType] = useState<FilterType>('All');
    const [sortOrder, setSortOrder] = useState<SortOrder>('default');
    const [showArchived, setShowArchived] = useState(false);

    const handleOpenModalForAdd = () => {
        setGoalToEdit(null);
        setIsModalOpen(true);
    };

    const handleOpenModalForEdit = (goal: Goal) => {
        setGoalToEdit(goal);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setGoalToEdit(null);
        setIsModalOpen(false);
    };

    const handleSubmitGoal = async (goalData: Omit<Goal, 'id' | 'currentValue' | 'userId' | 'teamId' | 'marketCenterId' | 'createdAt' | 'userName' | 'startDate' | 'endDate'> & { startDate?: string, endDate?: string }) => {
        if (goalToEdit) {
            await updateGoal(goalToEdit.id, goalData);
        } else {
            await addGoal(goalData);
        }
    };

    const handleDeleteGoal = async (goalId: string) => {
        if (window.confirm("Are you sure you want to delete this goal? This action cannot be undone.")) {
            try {
                await deleteGoal(goalId);
            } catch (error) {
                console.error("Failed to delete goal:", error);
                alert("Failed to delete goal. Please try again.");
            }
        }
    };
    
    const handleToggleArchive = async (goalId: string, currentStatus: boolean) => {
        try {
            await toggleGoalArchiveStatus(goalId, currentStatus);
        } catch (error) {
            console.error("Failed to toggle archive status:", error);
            alert("Failed to update goal. Please try again.");
        }
    };

    const filteredAndSortedGoals = useMemo(() => {
        let processedGoals = personalGoals.filter(goal => (showArchived ? goal.isArchived : !goal.isArchived));

        // 1. Filter
        if (filterType !== 'All') {
            processedGoals = processedGoals.filter(goal => goal.type === filterType);
        }

        // 2. Sort
        switch (sortOrder) {
            case 'title':
                processedGoals.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
                break;
            case 'targetValue':
                processedGoals.sort((a, b) => b.targetValue - a.targetValue);
                break;
            case 'progress': {
                const calculateProgress = (goal: Goal) => goal.targetValue > 0 ? (goal.currentValue / goal.targetValue) * 100 : 0;
                processedGoals.sort((a, b) => calculateProgress(b) - calculateProgress(a));
                break;
            }
            case 'default':
            default: {
                const typeOrder: Record<GoalType, number> = {
                    [GoalType.Annual]: 1,
                    [GoalType.Quarterly]: 2,
                    [GoalType.Weekly]: 3,
                };
                processedGoals.sort((a, b) => typeOrder[a.type] - typeOrder[b.type]);
                break;
            }
        }

        return processedGoals;
    }, [personalGoals, filterType, sortOrder, showArchived]);


    if (loading) {
        return (
            <div className="h-full flex flex-col">
                <header className="p-4 sm:p-6 lg:p-8">
                    <div className="flex justify-between items-center">
                        <div>
                            <div className="h-12 w-48 md:w-64 bg-surface/50 rounded animate-pulse"></div>
                            <div className="h-6 w-64 md:w-96 bg-surface/50 rounded mt-2 animate-pulse"></div>
                        </div>
                        <div className="h-10 w-36 bg-surface/50 rounded-lg animate-pulse hidden sm:block"></div>
                    </div>
                </header>
                
                <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-fr">
                        {[...Array(8)].map((_, i) => (
                           <SkeletonCard key={i} />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            <header className="p-4 sm:p-6 lg:p-8">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-text-primary">{showArchived ? 'Archived Goals' : 'Your Goals'}</h1>
                        <p className="text-lg text-text-secondary mt-1">Manage your annual, quarterly, and weekly goals.</p>
                    </div>
                    <button 
                        onClick={handleOpenModalForAdd}
                        className="flex items-center justify-center bg-primary text-on-accent font-semibold py-2 px-4 rounded-lg hover:bg-opacity-90 transition-colors"
                    >
                        <Plus className="mr-2" size={20} />
                        Add New Goal
                    </button>
                </div>
            </header>

            <div className="px-4 sm:px-6 lg:px-8 mb-6 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                <div className="flex items-center gap-2 p-1 bg-surface rounded-lg flex-wrap">
                    {(['All', ...Object.values(GoalType)] as FilterType[]).map(type => (
                        <button
                            key={type}
                            onClick={() => setFilterType(type)}
                            className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${filterType === type ? 'bg-primary text-on-accent' : 'text-text-secondary hover:bg-primary/20'}`}
                        >
                            {type}
                        </button>
                    ))}
                </div>
                
                <div className="flex items-center gap-2 flex-wrap">
                    <select
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                        className="bg-input border border-border rounded-md px-3 py-1.5 text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        aria-label="Sort goals by"
                    >
                        <option value="default">Sort by: Default</option>
                        <option value="title">Sort by: Title (A-Z)</option>
                        <option value="targetValue">Sort by: Target Value (High-Low)</option>
                        <option value="progress">Sort by: Progress (%)</option>
                    </select>
                     <button
                        onClick={() => setShowArchived(!showArchived)}
                        className="flex items-center gap-2 text-sm font-semibold rounded-lg transition-colors px-3 py-1.5 bg-input border border-border text-text-secondary hover:border-primary"
                    >
                        <Archive size={16}/> {showArchived ? 'View Active' : 'View Archived'}
                    </button>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-8">
                {filteredAndSortedGoals.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-fr">
                        {filteredAndSortedGoals.map(goal => (
                            <GoalProgressCard 
                                key={goal.id} 
                                goal={goal}
                                onEdit={() => handleOpenModalForEdit(goal)}
                                onArchive={() => handleToggleArchive(goal.id, !!goal.isArchived)}
                                onDelete={() => handleDeleteGoal(goal.id)}
                            />
                        ))}
                    </div>
                ) : (
                    <Card>
                        <p className="text-center text-text-secondary py-8">
                           {personalGoals.length === 0 
                                ? "You haven't added any goals yet. Click 'Add New Goal' to get started!"
                                : showArchived
                                    ? "You have no archived goals."
                                    : "No active goals match your current filters."
                            }
                        </p>
                    </Card>
                )}
            </div>

            <GoalModal 
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSubmit={handleSubmitGoal}
                title={goalToEdit ? "Edit Goal" : "Add New Goal"}
                submitButtonText={goalToEdit ? "Save Changes" : "Add Goal"}
                goalToEdit={goalToEdit}
            />
        </div>
    );
};

export default GoalsPage;