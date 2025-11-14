import React from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  count?: number;
  rating: number;
  onRatingChange?: (newRating: number) => void;
  size?: number;
  color?: {
    filled: string;
    unfilled: string;
  };
}

export const StarRating: React.FC<StarRatingProps> = React.memo(({
  count = 5,
  rating = 0,
  onRatingChange,
  size = 20,
  color = {
    filled: 'text-yellow-400',
    unfilled: 'text-gray-300 dark:text-gray-600',
  },
}) => {
  const stars = Array.from({ length: count }, (_, i) => i + 1);

  return (
    <div className="flex items-center">
      {stars.map((star) => (
        <Star
          key={star}
          size={size}
          className={`cursor-pointer transition-colors ${
            star <= rating ? color.filled : color.unfilled
          }`}
          fill={star <= rating ? 'currentColor' : 'none'}
          onClick={() => onRatingChange?.(star)}
          aria-label={`Rate ${star} out of ${count}`}
        />
      ))}
    </div>
  );
});