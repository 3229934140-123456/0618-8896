import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '@/api';
import type { Listing, Review, CalendarDay } from '@/types';
import StarRating from '@/components/StarRating';
import type { LucideIcon } from 'lucide-react';
import {
  MapPin, Users, Bed, Bath, ChevronLeft, ChevronRight, Check, AlertCircle,
  Wifi, UtensilsCrossed, AirVent, WashingMachine, Car, Building2, Tv, Flame,
  Calendar, X,
} from 'lucide-react';

const AMENITY_ICONS: Record<string, LucideIcon> = {
  WiFi: Wifi,
  '厨房': UtensilsCrossed,
  '空调': AirVent,
  '洗衣机': WashingMachine,
  '停车位': Car,
  '电梯': Building2,
  '电视': Tv,
  '热水器': Flame,
};

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

function formatDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseDateStr(s: string): { year: number; month: number; day: number } {
  const [y, m, d] = s.split('-').map(Number);
  return { year: y, month: m, day: d };
}

function daysBetween(a: string, b: string): number {
  const d1 = new Date(a);
  const d2 = new Date(b);
  return Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

export default function ListingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [listing, setListing] = useState<(Listing & { reviews: Review[]; calendarDays: CalendarDay[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth() + 1);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(1);

  const calendarMap = useMemo(() => {
    const m = new Map<string, CalendarDay>();
    calendarDays.forEach(d => m.set(d.date, d));
    return m;
  }, [calendarDays]);

  const isLoggedIn = !!localStorage.getItem('token');

  const nights = checkIn && checkOut ? daysBetween(checkIn, checkOut) : 0;
  const totalPrice = useMemo(() => {
    if (!checkIn || !checkOut || nights <= 0) return 0;
    let sum = 0;
    for (const d of calendarDays) {
      if (d.date >= checkIn && d.date < checkOut) sum += Number(d.price);
    }
    return sum > 0 ? sum : (listing?.basePrice || 0) * nights;
  }, [calendarDays, checkIn, checkOut, nights, listing]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.listings.getById(id).then(res => {
      if (res.success) {
        setListing(res.data);
        if (res.data.calendarDays?.length) {
          setCalendarDays(res.data.calendarDays);
        }
      }
      setLoading(false);
    });
  }, [id]);

  useEffect(() => {
    if (!id) return;
    api.listings.getCalendar(id, calMonth, calYear).then(res => {
      if (res.success && res.data) setCalendarDays(res.data);
    });
  }, [id, calMonth, calYear]);

  function handleCalendarNav(dir: number) {
    let m = calMonth + dir;
    let y = calYear;
    if (m < 1) { m = 12; y--; }
    if (m > 12) { m = 1; y++; }
    setCalMonth(m);
    setCalYear(y);
  }

  function handleDayClick(dateStr: string) {
    const day = calendarMap.get(dateStr);
    if (!day || Number(day.available) !== 1) return;
    if (!checkIn || (checkIn && checkOut)) {
      setCheckIn(dateStr);
      setCheckOut('');
    } else {
      if (dateStr <= checkIn) {
        setCheckIn(dateStr);
        setCheckOut('');
      } else {
        setCheckOut(dateStr);
      }
    }
  }

  function handleBooking() {
    if (!isLoggedIn) return;
    navigate(`/booking/${id}`, {
      state: { checkIn, checkOut, guests, listingId: id },
    });
  }

  const calendarGrid = useMemo(() => {
    const firstDay = new Date(calYear, calMonth - 1, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth, 0).getDate();
    const cells: (CalendarDay & { dayNum: number } | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = formatDateStr(calYear, calMonth, d);
      const dayData = calendarMap.get(dateStr);
      cells.push(dayData ? { ...dayData, dayNum: d } : null);
    }
    return cells;
  }, [calYear, calMonth, calendarMap]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-50">
        <div className="text-brand-500 text-lg">加载中...</div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-50">
        <div className="text-brand-800 text-lg">房源未找到</div>
      </div>
    );
  }

  const images = listing.images || [];
  const mainImage = images[0];
  const gridImages = images.slice(1, 5);
  const extraCount = Math.max(0, images.length - 5);

  return (
    <div className="min-h-screen bg-surface-50">
      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Image Gallery */}
        <div className="mb-8 flex gap-2 h-[420px] rounded-2xl overflow-hidden">
          {mainImage && (
            <div
              className="relative w-2/3 cursor-pointer overflow-hidden rounded-l-2xl"
              onClick={() => setLightboxIndex(0)}
            >
              <img src={mainImage} alt={listing.title} className="h-full w-full object-cover hover:scale-105 transition-transform duration-300" />
            </div>
          )}
          <div className="grid w-1/3 grid-cols-2 grid-rows-2 gap-2">
            {gridImages.map((img, i) => (
              <div
                key={i}
                className={`relative cursor-pointer overflow-hidden ${i === 3 && extraCount > 0 ? '' : ''} ${i === 1 ? 'rounded-tr-2xl' : ''} ${i === 3 ? 'rounded-br-2xl' : ''}`}
                onClick={() => setLightboxIndex(i + 1)}
              >
                <img src={img} alt="" className="h-full w-full object-cover hover:scale-105 transition-transform duration-300" />
                {i === 3 && extraCount > 0 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white font-semibold text-lg">
                    +{extraCount} 张
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex gap-8">
          {/* Left Column */}
          <div className="w-2/3 space-y-8">
            {/* Title & Basic Info */}
            <div>
              <h1 className="text-3xl font-bold text-brand-800 mb-3">{listing.title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-surface-300 text-sm">
                <span className="flex items-center gap-1"><MapPin size={16} className="text-brand-500" />{listing.city}</span>
                <span className="flex items-center gap-1"><Users size={16} className="text-brand-500" />{listing.maxGuests} 位房客</span>
                <span className="flex items-center gap-1"><Bed size={16} className="text-brand-500" />{listing.bedrooms} 间卧室</span>
                <span className="flex items-center gap-1"><Bath size={16} className="text-brand-500" />{listing.bathrooms} 间浴室</span>
              </div>
              <p className="mt-3 text-brand-800 font-medium">房东: {listing.hostName || '匿名'}</p>
            </div>

            <hr className="border-surface-200" />

            {/* Description */}
            <div>
              <h2 className="section-title mb-3">房源描述</h2>
              <p className="text-brand-800/80 leading-relaxed">{listing.description}</p>
            </div>

            <hr className="border-surface-200" />

            {/* Amenities */}
            <div>
              <h2 className="section-title mb-4">设施与服务</h2>
              <div className="grid grid-cols-4 gap-3">
                {listing.amenities.map(a => {
                  const Icon = AMENITY_ICONS[a];
                  return (
                    <div key={a} className="flex items-center gap-2 rounded-xl bg-white border border-surface-200 px-3 py-2.5">
                      <Check size={16} className="text-success shrink-0" />
                      {Icon ? <Icon size={16} className="text-brand-500 shrink-0" /> : null}
                      <span className="text-sm text-brand-800">{a}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <hr className="border-surface-200" />

            {/* House Rules */}
            {listing.rules?.length > 0 && (
              <>
                <div>
                  <h2 className="section-title mb-4">房屋守则</h2>
                  <ul className="space-y-2">
                    {listing.rules.map((rule, i) => (
                      <li key={i} className="flex items-start gap-2 text-brand-800/80">
                        <AlertCircle size={16} className="text-brand-500 mt-0.5 shrink-0" />
                        <span className="text-sm">{rule}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <hr className="border-surface-200" />
              </>
            )}

            {/* Calendar & Pricing */}
            <div>
              <h2 className="section-title mb-4 flex items-center gap-2">
                <Calendar size={22} className="text-brand-500" />
                日历与价格
              </h2>
              <div className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <button onClick={() => handleCalendarNav(-1)} className="p-1.5 rounded-lg hover:bg-surface-100 transition-colors">
                    <ChevronLeft size={20} className="text-brand-800" />
                  </button>
                  <span className="font-semibold text-brand-800">
                    {calYear}年 {calMonth}月
                  </span>
                  <button onClick={() => handleCalendarNav(1)} className="p-1.5 rounded-lg hover:bg-surface-100 transition-colors">
                    <ChevronRight size={20} className="text-brand-800" />
                  </button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-xs text-brand-800/60 mb-1">
                  {WEEKDAYS.map(d => <div key={d} className="py-1 font-medium">{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {calendarGrid.map((cell, i) => {
                    if (!cell) return <div key={`e${i}`} className="h-16" />;
                    const isSelected = cell.date === checkIn || cell.date === checkOut;
                    const isInRange = checkIn && checkOut && cell.date > checkIn && cell.date < checkOut;
                    const cellAvailable = Number(cell.available) === 1;
                    const cellIsHoliday = Number(cell.isHoliday) === 1;
                    let bg = 'bg-surface-100 text-brand-800/40';
                    if (cellAvailable && !cellIsHoliday) bg = 'bg-green-50 text-green-800';
                    if (cellIsHoliday) bg = 'bg-red-50 text-red-700';
                    if (isSelected) bg = 'bg-brand-500 text-white';
                    if (isInRange) bg = 'bg-brand-100 text-brand-800';
                    return (
                      <button
                        key={cell.date}
                        onClick={() => handleDayClick(cell.date)}
                        className={`h-16 rounded-lg flex flex-col items-center justify-center text-xs transition-colors ${bg} ${cellAvailable ? 'cursor-pointer hover:ring-2 hover:ring-brand-300' : 'cursor-not-allowed'}`}
                      >
                        <span className="font-medium">{cell.dayNum}</span>
                        <span className="text-[10px] mt-0.5">¥{cell.price}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 flex gap-4 text-xs text-brand-800/60">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-50 border border-green-200" />可预订</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-50 border border-red-200" />节假日</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-surface-100 border border-surface-200" />不可用</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-brand-500" />已选择</span>
                </div>
              </div>
            </div>

            <hr className="border-surface-200" />

            {/* Reviews */}
            <div>
              <h2 className="section-title mb-4">房客评价</h2>
              <div className="flex items-center gap-4 mb-6">
                <span className="text-5xl font-bold text-brand-800">{listing.rating.toFixed(1)}</span>
                <div>
                  <StarRating rating={listing.rating} size={20} />
                  <p className="text-sm text-brand-800/60 mt-1">{listing.reviewCount} 条评价</p>
                </div>
              </div>
              <div className="space-y-4">
                {listing.reviews.map(review => (
                  <div key={review.id} className="card p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-brand-200 flex items-center justify-center text-brand-800 font-semibold text-sm">
                        {(review.fromUserName || '匿')[0]}
                      </div>
                      <div>
                        <p className="font-medium text-brand-800 text-sm">{review.fromUserName || '匿名用户'}</p>
                        <p className="text-xs text-brand-800/50">{new Date(review.createdAt).toLocaleDateString('zh-CN')}</p>
                      </div>
                      <div className="ml-auto">
                        <StarRating rating={review.rating} size={14} />
                      </div>
                    </div>
                    <p className="text-sm text-brand-800/80 leading-relaxed">{review.comment}</p>
                  </div>
                ))}
                {listing.reviews.length === 0 && (
                  <p className="text-brand-800/50 text-sm">暂无评价</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Booking Panel */}
          <div className="w-1/3">
            <div className="sticky top-6">
              <div className="card p-6 space-y-5">
                <div className="text-2xl font-bold text-brand-800">
                  ¥{listing.basePrice}<span className="text-sm font-normal text-brand-800/50"> /晚</span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-brand-800/60 mb-1">入住日期</label>
                    <input
                      type="date"
                      value={checkIn}
                      onChange={e => { setCheckIn(e.target.value); if (checkOut && e.target.value >= checkOut) setCheckOut(''); }}
                      min={formatDateStr(calYear, calMonth, 1)}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-brand-800/60 mb-1">退房日期</label>
                    <input
                      type="date"
                      value={checkOut}
                      onChange={e => setCheckOut(e.target.value)}
                      min={checkIn || formatDateStr(calYear, calMonth, 1)}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-brand-800/60 mb-1">房客人数</label>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setGuests(Math.max(1, guests - 1))}
                        className="w-8 h-8 rounded-lg border border-surface-200 flex items-center justify-center text-brand-800 hover:bg-surface-100 transition-colors"
                      >-</button>
                      <span className="font-medium text-brand-800 w-8 text-center">{guests}</span>
                      <button
                        onClick={() => setGuests(Math.min(listing.maxGuests, guests + 1))}
                        className="w-8 h-8 rounded-lg border border-surface-200 flex items-center justify-center text-brand-800 hover:bg-surface-100 transition-colors"
                      >+</button>
                      <span className="text-xs text-brand-800/50">最多 {listing.maxGuests} 人</span>
                    </div>
                  </div>
                </div>

                {nights > 0 && (
                  <div className="space-y-2 border-t border-surface-200 pt-4">
                    <div className="flex justify-between text-sm text-brand-800/70">
                      <span>¥{listing.basePrice} × {nights} 晚</span>
                      <span>¥{totalPrice}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-brand-800 pt-2 border-t border-surface-200">
                      <span>总价</span>
                      <span>¥{totalPrice}</span>
                    </div>
                  </div>
                )}

                {isLoggedIn ? (
                  <button
                    onClick={handleBooking}
                    disabled={!checkIn || !checkOut || nights <= 0}
                    className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    预订
                  </button>
                ) : (
                  <Link
                    to="/login"
                    className="btn-primary w-full block text-center"
                  >
                    请先登录
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && images.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X size={24} className="text-white" />
          </button>
          {lightboxIndex > 0 && (
            <button
              onClick={e => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1); }}
              className="absolute left-5 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <ChevronLeft size={28} className="text-white" />
            </button>
          )}
          <img
            src={images[lightboxIndex]}
            alt=""
            className="max-h-[85vh] max-w-[85vw] object-contain rounded-lg"
            onClick={e => e.stopPropagation()}
          />
          {lightboxIndex < images.length - 1 && (
            <button
              onClick={e => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1); }}
              className="absolute right-5 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <ChevronRight size={28} className="text-white" />
            </button>
          )}
          <div className="absolute bottom-5 text-white/70 text-sm">
            {lightboxIndex + 1} / {images.length}
          </div>
        </div>
      )}
    </div>
  );
}
