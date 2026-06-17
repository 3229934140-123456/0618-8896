import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Calendar, Trash2, MapPin, Star } from 'lucide-react';
import { api } from '@/api';
import type { Listing } from '@/types';

export default function HostListings() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    api.listings.getByHost().then((res) => {
      if (res.success) setListings(res.data);
    }).finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除此房源吗？删除后不可恢复。')) return;
    setDeleting(id);
    try {
      const res = await api.listings.delete(id);
      if (res.success) {
        setListings((prev) => prev.filter((l) => l.id !== id));
      } else {
        alert('删除失败：' + (res.error || '请稍后重试'));
      }
    } catch {
      alert('删除失败，请检查网络后重试');
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-50">
        <div className="text-brand-500 text-lg">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="section-title">我的房源</h1>
          <Link to="/host/listings/new" className="btn-primary flex items-center gap-2">
            <Plus size={18} />
            添加房源
          </Link>
        </div>

        {listings.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-brand-800/50 mb-4">暂无房源，快去添加吧！</p>
            <Link to="/host/listings/new" className="btn-primary inline-flex items-center gap-2">
              <Plus size={18} />
              添加房源
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => (
              <div key={listing.id} className="card">
                <div className="h-48 overflow-hidden">
                  <img
                    src={listing.images?.[0] || 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=cozy%20apartment%20interior&image_size=landscape_16_9'}
                    alt={listing.title}
                    className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                  />
                </div>
                <div className="p-4">
                  <h3 className="mb-1 font-semibold text-brand-800 truncate">{listing.title}</h3>
                  <div className="mb-2 flex items-center gap-1 text-sm text-brand-800/60">
                    <MapPin size={14} className="text-brand-500" />
                    {listing.city}
                  </div>
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-lg font-bold text-brand-800">
                      ¥{listing.basePrice}<span className="text-sm font-normal text-brand-800/50">/晚</span>
                    </span>
                    <span className="flex items-center gap-1 text-sm text-brand-800/60">
                      <Star size={14} className="fill-brand-400 text-brand-400" />
                      {listing.rating.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      to={`/host/listings/${listing.id}/edit`}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-surface-200 py-2 text-sm font-medium text-brand-800 transition-colors hover:bg-surface-100"
                    >
                      <Pencil size={14} />
                      编辑
                    </Link>
                    <Link
                      to={`/host/listings/${listing.id}/calendar`}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-surface-200 py-2 text-sm font-medium text-brand-800 transition-colors hover:bg-surface-100"
                    >
                      <Calendar size={14} />
                      日历
                    </Link>
                    <button
                      onClick={() => handleDelete(listing.id)}
                      disabled={deleting === listing.id}
                      className="flex items-center justify-center rounded-lg border border-red-200 px-3 py-2 text-sm text-red-500 transition-colors hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deleting === listing.id ? '...' : <Trash2 size={14} />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
