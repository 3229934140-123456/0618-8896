import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  rating: number;
  size?: number;
  showValue?: boolean;
  className?: string;
}

export default function StarRating({ rating, size = 16, showValue = false, className }: StarRatingProps) {
  return (
    <div className={cn('flex items-center gap-0.5', className)}>
      {Array.from({ length: 5 }, (_, i) => {
        const filled = i < Math.round(rating);
        return (
          <Star
            key={i}
            size={size}
            className={cn(
              filled ? 'fill-brand-400 text-brand-400' : 'text-surface-200'
            )}
          />
        );
      })}
      {showValue && (
        <span className="ml-1 text-sm font-medium text-brand-800">{rating.toFixed(1)}</span>
      )}
    </div>
  );
}
