import { useState, useEffect } from 'react';
import { Users, CalendarDays, CheckCircle, XCircle, LogIn, LogOut, MessageSquare, ClipboardList } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api';
import type { Booking } from '@/types';
import { useAuthStore } from '@/store';

type TabKey = 'all' | 'pending' | 'confirmed' | 'paid' | 'checked_in' | 'checked_out';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待确认' },
  { key: 'confirmed', label: '已确认' },
  { key: 'paid', label: '已支付' },
  { key: 'checked_in', label: '已入住' },
  { key: 'checked_out', label: '已完成' },
];

const statusLabels: Record<string, string> = {
  pending: '待确认',
  confirmed: '已确认',
  paid: '已支付',
  checked_in: '已入住',
  checked_out: '已完成',
  cancelled: '已取消',
};

const statusBadge: Record<string, string> = {
  pending: 'badge-warning',
  confirmed: 'badge-info',
  paid: 'badge-success',
  checked_in: 'badge-brand',
  checked_out: 'badge-brand',
  cancelled: 'badge-danger',
};

export default function HostBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [loading, setLoading] = useState(true);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

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

  const handleReportStatus = (bookingId: string) => {
    const status = prompt('请选择房间状态：clean/needs_cleaning/damaged/maintenance_needed', 'clean');
    if (!status) return;
    const note = prompt('请输入备注（可选）', '') || '';
    api.roomStatus.report(bookingId, status, note).then((r) => {
      if (r.success) alert('状态已上报');
      else alert('上报失败：' + (r.error || ''));
    });
  };

  const handleReviewGuest = (bookingId: string, guestId: string) => {
    if (!user) return;
    const rating = Number(prompt('请为房客评分(1-5)：', '5') || '5');
    if (!rating || rating < 1 || rating > 5) return;
    const comment = prompt('请输入评价内容：', '') || '';
    api.reviews.create({
      bookingId,
      rating,
      comment,
      type: 'host_to_guest',
    }).then((r) => {
      if (r.success) {
        alert('评价已提交');
      } else {
        alert('评价失败：' + (r.error || ''));
      }
    });
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
                    {booking.status === 'paid' && (
                      <div className="mt-2 rounded-lg bg-surface-50 p-3 text-xs text-brand-700">
                        <div><span className="font-medium">确认码：</span>{booking.confirmationCode}</div>
                        <div><span className="font-medium">门锁密码：</span>{booking.doorPassword}</div>
                        {booking.checkInInstructions && (
                          <div className="mt-1 text-brand-600">{booking.checkInInstructions}</div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 sm:gap-4">
                    <span className="text-lg font-bold text-brand-800">¥{booking.totalPrice}</span>

                    <div className="flex flex-wrap gap-2">
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
                            onClick={() => handleStatusChange(booking.id, 'cancelled')}
                            className="flex items-center gap-1 rounded-lg bg-red-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600"
                          >
                            <XCircle size={14} />
                            拒绝
                          </button>
                        </>
                      )}
                      {booking.status === 'confirmed' && (
                        <span className="text-xs text-brand-500 self-center">等待房客支付</span>
                      )}
                      {booking.status === 'paid' && (
                        <>
                          <button
                            onClick={() => handleStatusChange(booking.id, 'checked_in')}
                            className="flex items-center gap-1 rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600"
                          >
                            <LogIn size={14} />
                            办理入住
                          </button>
                          <button
                            onClick={() => handleReportStatus(booking.id)}
                            className="flex items-center gap-1 rounded-lg border border-surface-200 px-3 py-2 text-sm text-brand-700 hover:bg-surface-50"
                          >
                            <ClipboardList size={14} />
                            上报房间状态
                          </button>
                        </>
                      )}
                      {booking.status === 'checked_in' && (
                        <button
                          onClick={() => handleStatusChange(booking.id, 'checked_out')}
                          className="flex items-center gap-1 rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600"
                        >
                          <LogOut size={14} />
                          办理退房
                        </button>
                      )}
                      {booking.status === 'checked_out' && (
                        <button
                          onClick={() => handleReviewGuest(booking.id, booking.guestId)}
                          className="flex items-center gap-1 rounded-lg border border-brand-300 px-3 py-2 text-sm text-brand-600 hover:bg-brand-50"
                        >
                          <MessageSquare size={14} />
                          评价房客
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
