import { useState, useEffect } from 'react';
import { Star, MessageSquare, User, Home } from 'lucide-react';
import { api } from '@/api';
import type { Review } from '@/types';
import { useAuthStore } from '@/store';

export default function GuestReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!user) return;
    api.reviews.getByGuest(user.id).then((res) => {
      if (res.success) setReviews(res.data);
    }).finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-50">
        <div className="text-brand-500 text-lg">加载中...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="section-title mb-6">我的评价</h1>

      {reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((r) => {
            const isFromMe = r.direction === 'from_me';
            return (
              <div key={r.id} className="card p-5">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isFromMe ? (
                      <span className="flex items-center gap-1 text-sm font-medium text-brand-600">
                        <Home size={14} />
                        {r.type === 'guest_to_listing' ? '我评价的房源' : '我评价的房客'}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-sm font-medium text-brand-500">
                        <User size={14} />
                        房东评价我
                      </span>
                    )}
                    {r.listingTitle && (
                      <span className="text-xs text-brand-800/60"> · {r.listingTitle}</span>
                    )}
                    {r.toGuestName && !r.listingTitle && (
                      <span className="text-xs text-brand-800/60"> · 房客：{r.toGuestName}</span>
                    )}
                  </div>
                  <span className="text-sm text-surface-300">
                    {new Date(r.createdAt).toLocaleDateString('zh-CN')}
                  </span>
                </div>
                {!isFromMe && r.fromUserName && (
                  <div className="mb-2 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-brand-200 flex items-center justify-center text-brand-800 font-semibold text-xs">
                      {(r.fromUserName || '匿')[0]}
                    </div>
                    <span className="text-sm text-brand-800">{r.fromUserName}</span>
                  </div>
                )}
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
            );
          })}
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
