import React from 'react';
import { Card } from './Card';

export const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <Card className={`animate-pulse ${className}`}>
      <div className="flex justify-between items-start">
        <div className="h-6 w-20 bg-surface/50 rounded-full"></div>
        <div className="h-5 w-5 bg-surface/50 rounded-full"></div>
      </div>
      <div className="h-7 w-3/4 bg-surface/50 rounded mt-4"></div>
      <div className="h-5 w-1/2 bg-surface/50 rounded mt-2"></div>
      <div className="mt-8">
        <div className="flex justify-between items-end mb-1">
            <div className="h-4 w-1/4 bg-surface/50 rounded"></div>
            <div className="h-6 w-1/5 bg-surface/50 rounded"></div>
        </div>
        <div className="w-full bg-surface/50 rounded-full h-2.5"></div>
        <div className="flex justify-between mt-2">
            <div className="h-4 w-1/4 bg-surface/50 rounded"></div>
            <div className="h-4 w-1/4 bg-surface/50 rounded"></div>
        </div>
      </div>
    </Card>
  );
};