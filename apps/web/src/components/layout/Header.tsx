import React from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '../../stores/useAppStore';
import {
  Search,
  Sun,
  Moon,
  Bell,
  Menu,
  ChevronRight,
  User,
  Settings,
  LogOut,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { Dropdown, type DropdownItem } from '../ui/Dropdown';
import { Button } from '../ui/Button';

export const Header: React.FC = () => {
  const {
    theme,
    setTheme,
    userName,
    userEmail,
    userRole,
    notifications,
    markAllNotificationsAsRead,
    setSearchModalOpen,
    setMobileMenuOpen,
  } = useAppStore();

  const location = useLocation();
  const navigate = useNavigate();

  // Derive breadcrumb from path
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const breadcrumbs = pathSegments.map((segment, index) => {
    const url = `/${pathSegments.slice(0, index + 1).join('/')}`;
    const formatted = segment
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
    return { name: formatted, url };
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Profile menu dropdown items
  const profileMenuItems: DropdownItem[] = [
    {
      id: 'header',
      label: `${userName} (${userEmail})`,
      icon: <ShieldCheck className="w-4 h-4 text-indigo-500" />,
      disabled: true,
    },
    {
      id: 'divider-1',
      label: '',
      divider: true,
    },
    {
      id: 'profile',
      label: 'My Learning Profile',
      icon: <User className="w-4 h-4" />,
      onClick: () => navigate('/settings'),
    },
    {
      id: 'settings',
      label: 'Platform Settings',
      icon: <Settings className="w-4 h-4" />,
      onClick: () => navigate('/settings'),
    },
    {
      id: 'divider-2',
      label: '',
      divider: true,
    },
    {
      id: 'logout',
      label: 'Sign Out',
      icon: <LogOut className="w-4 h-4" />,
      destructive: true,
      onClick: () => navigate('/login'),
    },
  ];

  return (
    <header
      id="app-header"
      className="sticky top-0 z-30 w-full h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-4 sm:px-6 flex items-center justify-between transition-colors"
    >
      {/* Left: Mobile Toggle & Breadcrumbs */}
      <div className="flex items-center gap-3">
        <Button
          id="btn-mobile-nav-toggle"
          variant="ghost"
          size="icon"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Open navigation menu"
          className="lg:hidden text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
        >
          <Menu className="w-5 h-5" />
        </Button>

        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="hidden sm:flex items-center text-xs text-slate-500 dark:text-slate-400">
          <Link
            to="/dashboard"
            className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors font-medium"
          >
            OmniTutor
          </Link>
          {breadcrumbs.length > 0 ? (
            breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={crumb.url}>
                <ChevronRight className="w-3.5 h-3.5 mx-1.5 text-slate-400" />
                {idx === breadcrumbs.length - 1 ? (
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {crumb.name}
                  </span>
                ) : (
                  <Link
                    to={crumb.url}
                    className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                  >
                    {crumb.name}
                  </Link>
                )}
              </React.Fragment>
            ))
          ) : (
            <>
              <ChevronRight className="w-3.5 h-3.5 mx-1.5 text-slate-400" />
              <span className="font-semibold text-slate-900 dark:text-slate-100">Dashboard</span>
            </>
          )}
        </nav>
      </div>

      {/* Right Controls: Global Search, Theme, Notifications, Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Global Search Trigger */}
        <button
          id="btn-global-search"
          onClick={() => setSearchModalOpen(true)}
          className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-lg transition-colors cursor-pointer w-44 sm:w-60 justify-between"
        >
          <div className="flex items-center gap-2 truncate">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">Search courses, topics...</span>
          </div>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded shadow-2xs">
            Ctrl K
          </kbd>
        </button>

        {/* Theme Toggle */}
        <Button
          id="btn-theme-toggle"
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
        </Button>

        {/* Notifications Popover Dropdown */}
        <Dropdown
          align="right"
          trigger={
            <div
              id="btn-notifications-trigger"
              role="button"
              tabIndex={0}
              aria-label="View notifications"
              className="relative p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-600 ring-2 ring-white dark:ring-slate-900" />
              )}
            </div>
          }
          items={[
            {
              id: 'notif-header',
              label: `Notifications (${unreadCount} unread)`,
              disabled: true,
            },
            ...notifications.map((n) => ({
              id: n.id,
              label: `${n.title}: ${n.description}`,
              shortcut: n.timestamp,
            })),
            { id: 'div', label: '', divider: true },
            {
              id: 'mark-all',
              label: 'Mark all as read',
              icon: <Check className="w-3.5 h-3.5" />,
              onClick: markAllNotificationsAsRead,
            },
          ]}
        />

        {/* Profile Menu Dropdown */}
        <Dropdown
          align="right"
          trigger={
            <div
              id="btn-profile-menu-trigger"
              role="button"
              tabIndex={0}
              aria-label="Open profile menu"
              className="flex items-center gap-2.5 p-1 sm:pl-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-semibold text-xs flex items-center justify-center shadow-sm">
                {userName.charAt(0)}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight">
                  {userName}
                </p>
                <p className="text-[10px] text-slate-400 capitalize">{userRole}</p>
              </div>
            </div>
          }
          items={profileMenuItems}
        />
      </div>
    </header>
  );
};
