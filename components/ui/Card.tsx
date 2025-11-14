
import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '', ...rest }) => {
  return (
    <div
      className={`bg-surface border border-border rounded-2xl shadow-lg p-6 ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
};
