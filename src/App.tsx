import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import Layout from "@/components/Layout";
import Home from "@/pages/Home";
import Search from "@/pages/Search";
import ListingDetail from "@/pages/ListingDetail";
import Booking from "@/pages/Booking";
import BookingConfirm from "@/pages/BookingConfirm";
import HostDashboard from "@/pages/HostDashboard";
import HostListings from "@/pages/HostListings";
import HostListingForm from "@/pages/HostListingForm";
import HostCalendar from "@/pages/HostCalendar";
import HostBookings from "@/pages/HostBookings";
import HostReviews from "@/pages/HostReviews";
import GuestDashboard from "@/pages/GuestDashboard";
import GuestBookings from "@/pages/GuestBookings";
import GuestReviews from "@/pages/GuestReviews";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import { useAuthStore } from "@/store";
import { useNotificationStore } from "@/store";

export default function App() {
  const checkAuth = useAuthStore((s) => s.checkAuth);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, fetchNotifications]);

  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<Search />} />
          <Route path="/listing/:id" element={<ListingDetail />} />
          <Route path="/booking/:id" element={<Booking />} />
          <Route path="/booking/confirm/:bookingId" element={<BookingConfirm />} />
          <Route path="/host/dashboard" element={<HostDashboard />} />
          <Route path="/host/listings" element={<HostListings />} />
          <Route path="/host/listings/new" element={<HostListingForm />} />
          <Route path="/host/listings/:id/edit" element={<HostListingForm />} />
          <Route path="/host/listings/:id/calendar" element={<HostCalendar />} />
          <Route path="/host/bookings" element={<HostBookings />} />
          <Route path="/host/reviews" element={<HostReviews />} />
          <Route path="/guest/dashboard" element={<GuestDashboard />} />
          <Route path="/guest/bookings" element={<GuestBookings />} />
          <Route path="/guest/reviews" element={<GuestReviews />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>
      </Routes>
    </Router>
  );
}
