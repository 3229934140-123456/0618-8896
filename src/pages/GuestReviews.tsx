import { useState, useEffect } from 'react';
import { Star, MessageSquare } from 'lucide-react';
import { api } from '@/api';
import type { Review } from '@/types';

export default function GuestReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    api.reviews.getByGuest().then((res) => {
      if (res.success) setReviews(res.data);
    });
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="section-title mb-6">我的评价</h1>

      {reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((r) => (
            <div key={r.id} className="card p-5">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-semibold text-brand-800">{r.toListingId ? '房源评价' : '评价'}</h3>
                <span className="text-sm text-surface-300">
                  {new Date(r.createdAt).toLocaleDateString('zh-CN')}
                </span>
              </div>
              <div className="mb-2 flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((v) => (
                  <Star
                    key={v}
                    className={`h-4 w-4 ${
                      v <= r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-surface-200'
                    }`}
                  />
                ))}
              </div>
              <p className="text-sm leading-relaxed text-brand-800/80">{r.comment}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="card flex h-48 flex-col items-center justify-center text-surface-300">
          <MessageSquare className="mb-3 h-12 w-12" />
          <p className="text-lg font-medium">暂无评价</p>
          <p className="mt-1 text-sm">完成住宿后可以对房源进行评价</p>
        </div>
      )}
    </div>
  );
}
