
import React from 'react';
import { GoalModal } from '../goals/AddGoalModal';
import type { Goal, GoalType } from '../../types';

type BulkGoalData = Omit<Goal, 'id' | 'currentValue' | 'userId' | 'teamId' | 'createdAt' | 'startDate' | 'endDate'> & {
    startDate?: string;
    endDate?: string;
};
interface AssignBulkGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (goal: BulkGoalData) => Promise<void>;
}

export const AssignBulkGoalModal: React.FC<AssignBulkGoalModalProps> = ({ isOpen, onClose, onSubmit }) => {
  return (
    <GoalModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={onSubmit}
      title="Assign Bulk Goal"
      description="This goal will be assigned to every agent in your program."
      submitButtonText="Assign to All Agents"
    />
  );
};