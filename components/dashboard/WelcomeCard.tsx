import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../ui/Card';
import { Hand } from 'lucide-react';

export const WelcomeCard: React.FC = React.memo(() => {
  const { userData } = useAuth();
  const displayName = userData?.name?.split(' ')[0] || 'Agent';

  return (
    <Card className="flex items-center p-4">
        <div className="p-3 bg-accent-secondary/20 rounded-full mr-4">
            <Hand size={24} className="text-accent-secondary" />
        </div>
        <div>
            <h2 className="text-xl font-bold text-text-primary">
                Welcome, {displayName}!
            </h2>
            <p className="text-text-secondary text-sm">
                Ready to conquer your goals?
            </p>
        </div>
    </Card>
  );
});