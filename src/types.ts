export interface User {
  id: string;
  email: string;
  name: string;
  role: 'host' | 'guest';
  avatar: string;
  createdAt: string;
}

export interface Listing {
  id: string;
  hostId: string;
  hostName?: string;
  title: string;
  description: string;
  city: string;
  address: string;
  images: string[];
  amenities: string[];
  rules: string[];
  maxGuests: number;
  bedrooms: number;
  bathrooms: number;
  basePrice: number;
  rating: number;
  reviewCount: number;
  createdAt: string;
}

export interface CalendarDay {
  id: string;
  listingId: string;
  date: string;
  available: number | boolean;
  price: number;
  isHoliday: number | boolean;
}

export interface Booking {
  id: string;
  listingId: string;
  guestId: string;
  hostId: string;
  listingTitle?: string;
  listingImage?: string;
  listingCity?: string;
  guestName?: string;
  hostName?: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'paid' | 'checked_in' | 'checked_out' | 'cancelled';
  confirmationCode: string;
  doorPassword: string;
  checkInInstructions: string;
  createdAt: string;
}

export interface Review {
  id: string;
  bookingId: string;
  fromUserId: string;
  fromUserName?: string;
  fromUserAvatar?: string;
  toListingId?: string;
  toGuestId?: string;
  rating: number;
  comment: string;
  type: 'guest_to_listing' | 'host_to_guest';
  listingTitle?: string;
  createdAt: string;
  direction?: 'from_me' | 'to_me';
  toGuestName?: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface RoomStatus {
  id: string;
  bookingId: string;
  status: string;
  note: string;
  reportedAt: string;
}

export interface SearchParams {
  city?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
}
