import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Save, X } from 'lucide-react';
import { api } from '@/api';
import type { CalendarDay, Listing } from '@/types';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

function formatDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export default function HostCalendar() {
  const { id } = useParams<{ id: string }>();
  const [listing, setListing] = useState<Listing | null>(null);
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editDay, setEditDay] = useState<CalendarDay | null>(null);
  const [editAvailable, setEditAvailable] = useState(true);
  const [editPrice, setEditPrice] = useState(0);
  const [editIsHoliday, setEditIsHoliday] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.listings.getById(id).then((res) => {
      if (res.success) setListing(res.data);
    });
  }, [id]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.listings.getCalendar(id, calMonth, calYear).then((res) => {
      if (res.success && res.data) setCalendarDays(res.data);
    }).finally(() => setLoading(false));
  }, [id, calMonth, calYear]);

  const calendarMap = useMemo(() => {
    const m = new Map<string, CalendarDay>();
    calendarDays.forEach((d) => m.set(d.date, d));
    return m;
  }, [calendarDays]);

  const calendarGrid = useMemo(() => {
    const firstDay = new Date(calYear, calMonth - 1, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth, 0).getDate();
    const cells: (CalendarDay & { dayNum: number } | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = formatDateStr(calYear, calMonth, d);
      const dayData = calendarMap.get(dateStr);
      if (dayData) {
        cells.push({ ...dayData, dayNum: d });
      } else {
        cells.push(null);
      }
    }
    return cells;
  }, [calYear, calMonth, calendarMap]);

  const handleNav = (dir: number) => {
    let m = calMonth + dir;
    let y = calYear;
    if (m < 1) { m = 12; y--; }
    if (m > 12) { m = 1; y++; }
    setCalMonth(m);
    setCalYear(y);
  };

  const handleDayClick = (cell: CalendarDay & { dayNum: number }) => {
    setEditDay(cell);
    setEditAvailable(cell.available);
    setEditPrice(cell.price);
    setEditIsHoliday(cell.isHoliday);
  };

  const handleEditSave = () => {
    if (!editDay) return;
    setCalendarDays((prev) =>
      prev.map((d) =>
        d.date === editDay.date
          ? { ...d, available: editAvailable, price: editPrice, isHoliday: editIsHoliday }
          : d
      )
    );
    setEditDay(null);
  };

  const handleBatchSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await api.listings.updateCalendar(id, calendarDays);
    } finally {
      setSaving(false);
    }
  };

  const getDotColor = (cell: CalendarDay) => {
    if (!cell.available) return 'bg-surface-300';
    if (cell.isHoliday) return 'bg-red-500';
    return 'bg-green-500';
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
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link to="/host/listings" className="mb-2 inline-block text-sm text-brand-500 hover:text-brand-600">
              ← 返回房源列表
            </Link>
            <h1 className="section-title">{listing?.title || '日历管理'}</h1>
          </div>
          <button
            onClick={handleBatchSave}
            disabled={saving}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            <Save size={18} />
            {saving ? '保存中...' : '保存修改'}
          </button>
        </div>

        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <button onClick={() => handleNav(-1)} className="p-1.5 rounded-lg hover:bg-surface-100 transition-colors">
              <ChevronLeft size={20} className="text-brand-800" />
            </button>
            <span className="font-semibold text-brand-800">
              {calYear}年 {calMonth}月
            </span>
            <button onClick={() => handleNav(1)} className="p-1.5 rounded-lg hover:bg-surface-100 transition-colors">
              <ChevronRight size={20} className="text-brand-800" />
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-1 text-center text-xs text-brand-800/60">
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-1 font-medium">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarGrid.map((cell, i) => {
              if (!cell) return <div key={`e${i}`} className="h-20" />;
              return (
                <button
                  key={cell.date}
                  onClick={() => handleDayClick(cell)}
                  className="flex h-20 flex-col items-center justify-center rounded-lg border border-surface-200 bg-white p-1 text-xs transition-colors hover:border-brand-300 hover:ring-1 hover:ring-brand-300"
                >
                  <span className="font-medium text-brand-800">{cell.dayNum}</span>
                  <span className="text-brand-800/60">¥{cell.price}</span>
                  <span className={`mt-0.5 h-2 w-2 rounded-full ${getDotColor(cell)}`} />
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex gap-5 text-xs text-brand-800/60">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
              可预订
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
              节假日
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-surface-300" />
              不可用
            </span>
          </div>
        </div>
      </div>

      {editDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setEditDay(null)}>
          <div className="w-80 rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-brand-800">编辑 {editDay.date}</h3>
              <button onClick={() => setEditDay(null)} className="p-1 rounded-lg hover:bg-surface-100">
                <X size={18} className="text-brand-800/60" />
              </button>
            </div>

            <div className="space-y-4">
              <label className="flex items-center justify-between">
                <span className="text-sm text-brand-800">可预订</span>
                <button
                  type="button"
                  onClick={() => setEditAvailable(!editAvailable)}
                  className={`relative h-6 w-11 rounded-full transition-colors ${editAvailable ? 'bg-brand-500' : 'bg-surface-300'}`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${editAvailable ? 'left-[22px]' : 'left-0.5'}`}
                  />
                </button>
              </label>

              <div>
                <label className="mb-1 block text-sm text-brand-800">价格（¥）</label>
                <input
                  type="number"
                  value={editPrice}
                  onChange={(e) => setEditPrice(Number(e.target.value))}
                  min={1}
                  className="input-field"
                />
              </div>

              <label className="flex items-center justify-between">
                <span className="text-sm text-brand-800">节假日</span>
                <button
                  type="button"
                  onClick={() => setEditIsHoliday(!editIsHoliday)}
                  className={`relative h-6 w-11 rounded-full transition-colors ${editIsHoliday ? 'bg-red-500' : 'bg-surface-300'}`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${editIsHoliday ? 'left-[22px]' : 'left-0.5'}`}
                  />
                </button>
              </label>

              <button
                onClick={handleEditSave}
                className="btn-primary w-full"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
