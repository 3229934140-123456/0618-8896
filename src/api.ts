import type { Listing, Booking, Review, CalendarDay, SearchParams } from '@/types';

const API_BASE = '/api';

function parseJsonField(val: unknown): unknown {
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch { return val; }
  }
  return val;
}

function toSnakeCase(key: string): string {
  return key.replace(/[A-Z]/g, m => '_' + m.toLowerCase());
}

function convertToSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    result[toSnakeCase(k)] = v;
  }
  return result;
}

function normalizeCalendarDay(d: Record<string, unknown>): CalendarDay {
  return {
    id: d.id as string,
    listingId: (d.listing_id || d.listingId) as string,
    date: d.date as string,
    available: (d.available ?? 1) as number,
    price: (d.price ?? 0) as number,
    isHoliday: ((d.is_holiday ?? d.isHoliday ?? 0) as number) === 1,
  };
}

function normalizeReview(r: Record<string, unknown>): Review {
  return {
    id: r.id as string,
    bookingId: (r.booking_id || r.bookingId) as string,
    fromUserId: (r.from_user_id || r.fromUserId) as string,
    toListingId: (r.to_listing_id || r.toListingId) as string | undefined,
    toGuestId: (r.to_guest_id || r.toGuestId) as string | undefined,
    rating: (r.rating ?? 0) as number,
    comment: (r.comment || '') as string,
    type: (r.type || 'guest_to_listing') as Review['type'],
    fromUserName: (r.from_user_name || r.fromUserName) as string | undefined,
    fromUserAvatar: (r.from_user_avatar || r.fromUserAvatar) as string | undefined,
    listingTitle: (r.listing_title || r.listingTitle) as string | undefined,
    createdAt: (r.created_at || r.createdAt || '') as string,
    direction: (r.direction as 'from_me' | 'to_me' | undefined),
    toGuestName: (r.to_guest_name || r.toGuestName) as string | undefined,
  };
}

function normalizeListing(l: Record<string, unknown>): Listing {
  return {
    id: l.id as string,
    hostId: (l.host_id || l.hostId) as string,
    title: l.title as string,
    description: (l.description || '') as string,
    city: l.city as string,
    address: (l.address || '') as string,
    images: (parseJsonField(l.images) || []) as string[],
    amenities: (parseJsonField(l.amenities) || []) as string[],
    rules: (parseJsonField(l.rules) || []) as string[],
    maxGuests: (l.max_guests ?? l.maxGuests ?? 1) as number,
    bedrooms: (l.bedrooms ?? 1) as number,
    bathrooms: (l.bathrooms ?? 1) as number,
    basePrice: (l.base_price ?? l.basePrice ?? 0) as number,
    rating: (l.rating ?? 0) as number,
    reviewCount: (l.review_count ?? l.reviewCount ?? 0) as number,
    createdAt: (l.created_at || l.createdAt || '') as string,
    hostName: (l.hostName || l.host_name) as string | undefined,
  } as Listing;
}

function normalizeBooking(b: Record<string, unknown>): Booking {
  const listingImages = parseJsonField(b.listing_images || b.listingImages) as string[] | undefined;
  return {
    id: b.id as string,
    listingId: (b.listing_id || b.listingId) as string,
    guestId: (b.guest_id || b.guestId) as string,
    hostId: (b.host_id || b.hostId) as string,
    listingTitle: (b.listing_title || b.listingTitle) as string | undefined,
    listingImage: listingImages?.[0],
    listingCity: (b.listing_city || b.listingCity) as string | undefined,
    guestName: (b.guest_name || b.guestName) as string | undefined,
    hostName: (b.host_name || b.hostName) as string | undefined,
    checkIn: (b.check_in || b.checkIn) as string,
    checkOut: (b.check_out || b.checkOut) as string,
    guests: (b.guests ?? 1) as number,
    totalPrice: (b.total_price ?? b.totalPrice ?? 0) as number,
    status: (b.status || 'pending') as Booking['status'],
    confirmationCode: (b.confirmation_code || b.confirmationCode || '') as string,
    doorPassword: (b.door_password || b.doorPassword || '') as string,
    checkInInstructions: (b.check_in_instructions || b.checkInInstructions || '') as string,
    createdAt: (b.created_at || b.createdAt || '') as string,
  } as Booking;
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const api = {
  auth: {
    login: async (email: string, password: string) => {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      return res.json();
    },
    register: async (email: string, password: string, name: string, role: 'host' | 'guest') => {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, role }),
      });
      return res.json();
    },
  },

  listings: {
    search: async (params: SearchParams): Promise<{ success: boolean; data: Listing[]; total: number; page: number }> => {
      const query = new URLSearchParams();
      if (params.city) query.set('city', params.city);
      if (params.checkIn) query.set('checkIn', params.checkIn);
      if (params.checkOut) query.set('checkOut', params.checkOut);
      if (params.guests) query.set('guests', String(params.guests));
      if (params.minPrice) query.set('minPrice', String(params.minPrice));
      if (params.maxPrice) query.set('maxPrice', String(params.maxPrice));
      if (params.page) query.set('page', String(params.page));
      if (params.limit) query.set('limit', String(params.limit));
      const res = await fetch(`${API_BASE}/listings?${query}`);
      const json = await res.json();
      if (json.data) json.data = json.data.map(normalizeListing);
      return json;
    },
    getById: async (id: string): Promise<{ success: boolean; data: Listing & { reviews: Review[]; calendarDays: CalendarDay[] } }> => {
      const res = await fetch(`${API_BASE}/listings/${id}`);
      const json = await res.json();
      if (json.data) {
        const raw = json.data as Record<string, unknown>;
        const listing = normalizeListing(raw);
        const reviews = Array.isArray(raw.reviews) ? (raw.reviews as Record<string, unknown>[]).map(normalizeReview) : [];
        const calendarDays = Array.isArray(raw.calendarDays) ? (raw.calendarDays as Record<string, unknown>[]).map(normalizeCalendarDay) : [];
        json.data = { ...listing, reviews, calendarDays };
      }
      return json;
    },
    create: async (data: Partial<Listing>) => {
      const snakeData = convertToSnakeCase(data as Record<string, unknown>);
      if (snakeData.images && Array.isArray(snakeData.images)) snakeData.images = JSON.stringify(snakeData.images);
      if (snakeData.amenities && Array.isArray(snakeData.amenities)) snakeData.amenities = JSON.stringify(snakeData.amenities);
      if (snakeData.rules && Array.isArray(snakeData.rules)) snakeData.rules = JSON.stringify(snakeData.rules);
      const res = await fetch(`${API_BASE}/listings`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(snakeData),
      });
      return res.json();
    },
    update: async (id: string, data: Partial<Listing>) => {
      const snakeData = convertToSnakeCase(data as Record<string, unknown>);
      if (snakeData.images && Array.isArray(snakeData.images)) snakeData.images = JSON.stringify(snakeData.images);
      if (snakeData.amenities && Array.isArray(snakeData.amenities)) snakeData.amenities = JSON.stringify(snakeData.amenities);
      if (snakeData.rules && Array.isArray(snakeData.rules)) snakeData.rules = JSON.stringify(snakeData.rules);
      const res = await fetch(`${API_BASE}/listings/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(snakeData),
      });
      return res.json();
    },
    getByHost: async () => {
      const res = await fetch(`${API_BASE}/listings/host/mine`, {
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      if (json.data) json.data = (json.data as Record<string, unknown>[]).map(normalizeListing);
      return json;
    },
    delete: async (id: string) => {
      const res = await fetch(`${API_BASE}/listings/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      return res.json();
    },
    getCalendar: async (listingId: string, _month?: number, _year?: number) => {
      const res = await fetch(`${API_BASE}/listings/${listingId}/calendar`, {
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      if (json.data) json.data = (json.data as Record<string, unknown>[]).map(normalizeCalendarDay);
      return json;
    },
    updateCalendarDay: async (listingId: string, date: string, data: { available?: boolean; price?: number; isHoliday?: boolean }) => {
      const snakeData = convertToSnakeCase(data as Record<string, unknown>);
      const res = await fetch(`${API_BASE}/listings/${listingId}/calendar/${date}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(snakeData),
      });
      const json = await res.json();
      if (json.data) json.data = normalizeCalendarDay(json.data as Record<string, unknown>);
      return json;
    },
  },

  bookings: {
    create: async (data: { listingId: string; checkIn: string; checkOut: string; guests: number }) => {
      const res = await fetch(`${API_BASE}/bookings`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      return res.json();
    },
    pay: async (id: string, paymentMethod: string) => {
      const res = await fetch(`${API_BASE}/bookings/${id}/pay`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ paymentMethod }),
      });
      return res.json();
    },
    getByGuest: async (): Promise<{ success: boolean; data: Booking[] }> => {
      const res = await fetch(`${API_BASE}/bookings/guest`, {
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      if (json.data) json.data = json.data.map(normalizeBooking);
      return json;
    },
    getByHost: async (): Promise<{ success: boolean; data: Booking[] }> => {
      const res = await fetch(`${API_BASE}/bookings/host`, {
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      if (json.data) json.data = json.data.map(normalizeBooking);
      return json;
    },
    updateStatus: async (id: string, status: string) => {
      const res = await fetch(`${API_BASE}/bookings/${id}/status`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status }),
      });
      return res.json();
    },
  },

  reviews: {
    create: async (data: { bookingId: string; rating: number; comment: string; type: 'guest_to_listing' | 'host_to_guest' }) => {
      const snakeData = convertToSnakeCase(data as Record<string, unknown>);
      const res = await fetch(`${API_BASE}/reviews`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(snakeData),
      });
      return res.json();
    },
    getByListing: async (listingId: string): Promise<{ success: boolean; data: Review[] }> => {
      const res = await fetch(`${API_BASE}/reviews/listing/${listingId}`);
      const json = await res.json();
      if (json.data) json.data = (json.data as Record<string, unknown>[]).map(normalizeReview);
      return json;
    },
    getByHost: async (hostId: string): Promise<{ success: boolean; data: Review[] }> => {
      const res = await fetch(`${API_BASE}/reviews/host/${hostId}`);
      const json = await res.json();
      if (json.data) json.data = (json.data as Record<string, unknown>[]).map(normalizeReview);
      return json;
    },
    getByGuest: async (guestId: string): Promise<{ success: boolean; data: Review[] }> => {
      const res = await fetch(`${API_BASE}/reviews/guest/${guestId}`, {
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      if (json.data) json.data = (json.data as Record<string, unknown>[]).map(normalizeReview);
      return json;
    },
  },

  notifications: {
    getAll: async () => {
      const res = await fetch(`${API_BASE}/notifications`, {
        headers: getAuthHeaders(),
      });
      return res.json();
    },
    markAsRead: async (id: string) => {
      const res = await fetch(`${API_BASE}/notifications/${id}/read`, {
        method: 'PUT',
        headers: getAuthHeaders(),
      });
      return res.json();
    },
    markAllAsRead: async () => {
      const res = await fetch(`${API_BASE}/notifications/read-all`, {
        method: 'PUT',
        headers: getAuthHeaders(),
      });
      return res.json();
    },
  },

  roomStatus: {
    report: async (bookingId: string, status: string, note: string) => {
      const snakeData = convertToSnakeCase({ bookingId, status, note });
      const res = await fetch(`${API_BASE}/room-status`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(snakeData),
      });
      return res.json();
    },
    getHistory: async (bookingId: string) => {
      const res = await fetch(`${API_BASE}/room-status/booking/${bookingId}`, {
        headers: getAuthHeaders(),
      });
      return res.json();
    },
  },
};
