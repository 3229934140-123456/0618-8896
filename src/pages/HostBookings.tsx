import { useState, useEffect } from 'react';
import { Users, CalendarDays, CheckCircle, XCircle, LogIn, LogOut } from 'lucide-react';
import { api } from '@/api';
import type { Booking } from '@/types';

type TabKey = 'all' | 'pending' | 'confirmed' | 'checkedin' | 'checkedout';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待确认' },
  { key: 'confirmed', label: '已确认' },
  { key: 'checkedin', label: '已入住' },
  { key: 'checkedout', label: '已完成' },
];

const statusLabels: Record<string, string> = {
  pending: '待确认',
  confirmed: '已确认',
  rejected: '已拒绝',
  checkedin: '已入住',
  checkedout: '已完成',
  cancelled: '已取消',
};

const statusBadge: Record<string, string> = {
  pending: 'badge-warning',
  confirmed: 'badge-info',
  rejected: 'badge-danger',
  checkedin: 'badge-success',
  checkedout: 'badge-brand',
  cancelled: 'badge-danger',
};

export default function HostBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [loading, setLoading] = useState(true);

  const fetchBookings = () => {
    api.bookings.getByHost().then((res) => {
      if (res.success) setBookings(res.data);
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleStatusChange = async (bookingId: string, newStatus: string) => {
    await api.bookings.updateStatus(bookingId, newStatus);
    fetchBookings();
  };

  const filteredBookings = activeTab === 'all'
    ? bookings
    : bookings.filter((b) => b.status === activeTab);

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
        <h1 className="section-title mb-6">订单管理</h1>

        <div className="mb-6 flex gap-2 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-brand-500 text-white'
                  : 'bg-white text-brand-800/70 border border-surface-200 hover:bg-surface-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {filteredBookings.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-brand-800/50">暂无订单</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBookings.map((booking) => (
              <div key={booking.id} className="card p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-brand-800">{booking.listingTitle || '房源'}</h3>
                      <span className={statusBadge[booking.status]}>{statusLabels[booking.status]}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-brand-800/60">
                      <span className="flex items-center gap-1">
                        <Users size={14} className="text-brand-500" />
                        {booking.guestName || '房客'}
                      </span>
                      <span className="flex items-center gap-1">
                        <CalendarDays size={14} className="text-brand-500" />
                        {booking.checkIn} ~ {booking.checkOut}
                      </span>
                      <span>{booking.guests}人</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-lg font-bold text-brand-800">¥{booking.totalPrice}</span>

                    <div className="flex gap-2">
                      {booking.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleStatusChange(booking.id, 'confirmed')}
                            className="flex items-center gap-1 rounded-lg bg-green-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-green-600"
                          >
                            <CheckCircle size={14} />
                            确认
                          </button>
                          <button
                            onClick={() => handleStatusChange(booking.id, 'rejected')}
                            className="flex items-center gap-1 rounded-lg bg-red-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600"
                          >
                            <XCircle size={14} />
                            拒绝
                          </button>
                        </>
                      )}
                      {booking.status === 'confirmed' && (
                        <button
                          onClick={() => handleStatusChange(booking.id, 'checkedin')}
                          className="flex items-center gap-1 rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600"
                        >
                          <LogIn size={14} />
                          办理入住
                        </button>
                      )}
                      {booking.status === 'checkedin' && (
                        <button
                          onClick={() => handleStatusChange(booking.id, 'checkedout')}
                          className="flex items-center gap-1 rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600"
                        >
                          <LogOut size={14} />
                          办理退房
                        </button>
                      )}
                    </div>
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
