import type { Listing, Booking, Review, CalendarDay, SearchParams } from '@/types';

const API_BASE = '/api';

function parseJsonField(val: unknown): unknown {
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch { return val; }
  }
  return val;
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
      if (json.data) json.data = normalizeListing(json.data);
      return json;
    },
    create: async (data: Partial<Listing>) => {
      const res = await fetch(`${API_BASE}/listings`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      return res.json();
    },
    update: async (id: string, data: Partial<Listing>) => {
      const res = await fetch(`${API_BASE}/listings/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      return res.json();
    },
    getByHost: async () => {
      const res = await fetch(`${API_BASE}/listings/host/mine`, {
        headers: getAuthHeaders(),
      });
      return res.json();
    },
    getCalendar: async (listingId: string, month: number, year: number) => {
      const res = await fetch(`${API_BASE}/listings/${listingId}/calendar?month=${month}&year=${year}`, {
        headers: getAuthHeaders(),
      });
      return res.json();
    },
    updateCalendar: async (listingId: string, days: Partial<CalendarDay>[]) => {
      const res = await fetch(`${API_BASE}/listings/${listingId}/calendar`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ days }),
      });
      return res.json();
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
      const res = await fetch(`${API_BASE}/reviews`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      return res.json();
    },
    getByListing: async (listingId: string): Promise<{ success: boolean; data: Review[] }> => {
      const res = await fetch(`${API_BASE}/reviews/listing/${listingId}`);
      return res.json();
    },
    getByGuest: async (): Promise<{ success: boolean; data: Review[] }> => {
      const res = await fetch(`${API_BASE}/reviews/guest`, {
        headers: getAuthHeaders(),
      });
      return res.json();
    },
    getByHost: async (): Promise<{ success: boolean; data: Review[] }> => {
      const res = await fetch(`${API_BASE}/reviews/host`, {
        headers: getAuthHeaders(),
      });
      return res.json();
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
      const res = await fetch(`${API_BASE}/room-status/${bookingId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status, note }),
      });
      return res.json();
    },
    getHistory: async (bookingId: string) => {
      const res = await fetch(`${API_BASE}/room-status/${bookingId}`, {
        headers: getAuthHeaders(),
      });
      return res.json();
    },
  },
};
