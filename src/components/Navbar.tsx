import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, Bell, User, LogOut, ChevronDown, Menu, X } from 'lucide-react';
import { useAuthStore } from '@/store';
import { useNotificationStore } from '@/store';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { notifications, unreadCount, fetchNotifications, markAllAsRead } = useNotificationStore();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const notifDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
    }
  }, [isAuthenticated, fetchNotifications]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(e.target as Node)) {
        setNotifDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    setUserDropdownOpen(false);
    navigate('/');
  };

  const dashboardPath = user?.role === 'host' ? '/host/dashboard' : '/guest/dashboard';

  return (
    <nav className="sticky top-0 z-50 bg-white shadow-sm border-b border-surface-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 group">
            <Home className="w-7 h-7 text-brand-500 group-hover:text-brand-600 transition-colors" />
            <span className="font-display text-2xl font-bold text-brand-800">栖居</span>
          </Link>

          <div className="hidden md:flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <div ref={notifDropdownRef} className="relative">
                  <button
                    onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                    className="relative p-2 rounded-full hover:bg-surface-100 transition-colors"
                  >
                    <Bell className="w-5 h-5 text-brand-800" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 bg-brand-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-medium">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>
                  {notifDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-surface-200 overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-200">
                        <span className="font-medium text-brand-800">通知</span>
                        {unreadCount > 0 && (
                          <button
                            onClick={() => markAllAsRead()}
                            className="text-sm text-brand-500 hover:text-brand-600"
                          >
                            全部已读
                          </button>
                        )}
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="px-4 py-8 text-center text-surface-300 text-sm">暂无通知</div>
                        ) : (
                          notifications.slice(0, 10).map((n) => (
                            <div
                              key={n.id}
                              className={`px-4 py-3 border-b border-surface-100 last:border-b-0 ${!n.read ? 'bg-brand-50' : ''}`}
                            >
                              <p className="text-sm font-medium text-brand-800">{n.title}</p>
                              <p className="text-xs text-surface-300 mt-0.5">{n.message}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div ref={userDropdownRef} className="relative">
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center gap-2 px-3 py-2 rounded-full hover:bg-surface-100 transition-colors"
                  >
                    {user?.avatar ? (
                      <img src={user.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center">
                        <User className="w-4 h-4 text-brand-500" />
                      </div>
                    )}
                    <span className="text-sm font-medium text-brand-800">{user?.name}</span>
                    <ChevronDown className={`w-4 h-4 text-surface-300 transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {userDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-surface-200 overflow-hidden">
                      <Link
                        to={dashboardPath}
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-3 text-sm text-brand-800 hover:bg-surface-100 transition-colors"
                      >
                        <User className="w-4 h-4" />
                        控制面板
                      </Link>
                      <Link
                        to="/profile"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-3 text-sm text-brand-800 hover:bg-surface-100 transition-colors"
                      >
                        <Home className="w-4 h-4" />
                        个人资料
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-3 text-sm text-danger hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        退出登录
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-brand-800 hover:text-brand-500 transition-colors"
                >
                  登录
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 transition-colors"
                >
                  注册
                </Link>
              </div>
            )}
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-surface-100 transition-colors"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6 text-brand-800" />
            ) : (
              <Menu className="w-6 h-6 text-brand-800" />
            )}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-surface-200 bg-white">
          <div className="px-4 py-3 space-y-2">
            {isAuthenticated ? (
              <>
                <div className="flex items-center gap-3 px-3 py-2">
                  {user?.avatar ? (
                    <img src={user.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center">
                      <User className="w-4 h-4 text-brand-500" />
                    </div>
                  )}
                  <span className="text-sm font-medium text-brand-800">{user?.name}</span>
                </div>
                <Link
                  to={dashboardPath}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-brand-800 hover:bg-surface-100 rounded-lg"
                >
                  <User className="w-4 h-4" />
                  控制面板
                </Link>
                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-brand-800 hover:bg-surface-100 rounded-lg"
                >
                  <Home className="w-4 h-4" />
                  个人资料
                </Link>
                <button
                  onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-red-50 rounded-lg"
                >
                  <LogOut className="w-4 h-4" />
                  退出登录
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 text-sm font-medium text-brand-800 hover:bg-surface-100 rounded-lg"
                >
                  登录
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg text-center hover:bg-brand-600"
                >
                  注册
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
