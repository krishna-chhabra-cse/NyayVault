import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  Bell, 
  ChevronDown, 
  Sun, 
  Moon, 
  Languages, 
  LogOut, 
  User, 
  ShieldCheck,
  Menu,
  CheckCheck,
  Trash2,
  Upload,
  AlertTriangle,
  FileText,
  Clock,
  ExternalLink
} from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { useNotifications } from '../hooks/useNotifications';
import CommandPalette from './CommandPalette';

export default function TopHeader({ 
  currentUser, 
  theme, 
  toggleTheme, 
  onLogout, 
  onSearchClick, 
  onToggleMobileNav,
  onSelectCase,
  onViewChange,
  onSwitchUser
}) {
  const { t, language, toggleLanguage } = useTranslation();
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotifications();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifFilter, setNotifFilter] = useState('all'); // 'all' | 'unread'
  const [commandOpen, setCommandOpen] = useState(false);

  const notifRef = useRef(null);
  const profileRef = useRef(null);

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle shortcuts (ESC and Cmd+K / Ctrl+K)
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setNotifOpen(false);
        setDropdownOpen(false);
        setCommandOpen(false);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen(prev => !prev);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const initials = currentUser?.full_name 
    ? currentUser.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : 'AK';

  const roleLabelKey = currentUser?.role === 'INVESTIGATING_OFFICER' 
    ? 'Investigator' 
    : currentUser?.role === 'JUDICIAL_OFFICER' 
    ? 'Magistrate' 
    : currentUser?.role === 'DEFENSE_COUNSEL'
    ? 'Defense'
    : currentUser?.role === 'PUBLIC_PROSECUTOR'
    ? 'Prosecutor'
    : currentUser?.role === 'COURT_REGISTRAR'
    ? 'Registrar'
    : currentUser?.role?.replace(/_/g, ' ') || 'Investigator';

  const filteredNotifications = notifications.filter(n => {
    if (notifFilter === 'unread') return !n.read;
    return true;
  });

  const getNotifIcon = (type) => {
    switch (type) {
      case 'success':
        return <ShieldCheck size={16} className="text-emerald-600 dark:text-emerald-400" />;
      case 'warning':
        return <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400" />;
      case 'info':
        return <Upload size={16} className="text-blue-600 dark:text-blue-400" />;
      default:
        return <Clock size={16} className="text-slate-500 dark:text-slate-400" />;
    }
  };

  const handleNotificationClick = (item) => {
    markAsRead(item.id);
    setNotifOpen(false);
    if (item.caseId && onSelectCase) {
      onSelectCase(item.caseId);
    } else if (onViewChange) {
      onViewChange('timeline');
    }
  };

  return (
    <>
      <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 transition-colors select-none">
      {/* Mobile Menu Toggle + Search Bar */}
      <div className="flex items-center flex-1 max-w-xl">
        <button
          type="button"
          onClick={onToggleMobileNav}
          className="lg:hidden p-2 -ml-1 mr-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
          title="Open Menu"
        >
          <Menu size={20} />
        </button>

        <div className="lg:hidden flex items-center mr-2.5 shrink-0">
          <div className="w-9 h-9 rounded-xl overflow-hidden shadow-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-50 p-1 flex items-center justify-center">
            <img 
              src="/logo.png" 
              alt="NyayVault" 
              className="w-full h-full object-contain" 
            />
          </div>
        </div>

        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            onClick={() => setCommandOpen(true)}
            placeholder={t('Search evidence, cases, people...')}
            className="w-full pl-10 pr-12 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all cursor-pointer"
            readOnly
          />
          <span className="hidden sm:inline-block absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-600">
            ⌘ K
          </span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5 sm:gap-3.5 ml-4">
        {/* Language Switch Button */}
        <button 
          onClick={toggleLanguage} 
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 hover:border-blue-200 dark:hover:bg-slate-700 transition-all text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer shadow-2xs group"
          title={language === 'en' ? t('Switch to Hindi') : t('Switch to English')}
        >
          <Languages size={15} className="text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
          <span>{language === 'en' ? 'हिन्दी' : 'English'}</span>
        </button>

        {/* Theme Switch */}
        <button 
          onClick={toggleTheme} 
          className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Toggle Dark/Light Mode"
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        {/* Notification Bell with Dropdown */}
        <div className="relative" ref={notifRef}>
          <button 
            type="button"
            onClick={() => {
              setNotifOpen(prev => !prev);
              setDropdownOpen(false);
            }}
            className={`p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative cursor-pointer ${
              notifOpen ? 'bg-slate-100 dark:bg-slate-800 text-blue-600' : ''
            }`}
            title={t('Notifications')}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[17px] h-[17px] px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white dark:ring-slate-900 shadow-xs animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Panel */}
          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              {/* Dropdown Header */}
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {t('Notifications')}
                  </h4>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/50 dark:text-blue-400">
                      {unreadCount} {t('New')}
                    </span>
                  )}
                </div>

                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCheck size={13} />
                    <span>{t('Mark all as read')}</span>
                  </button>
                )}
              </div>

              {/* Filter Tabs (All / Unread) */}
              <div className="flex border-b border-slate-100 dark:border-slate-800 px-4 pt-2 gap-3 text-xs font-semibold">
                <button
                  onClick={() => setNotifFilter('all')}
                  className={`pb-2 border-b-2 transition-colors cursor-pointer ${
                    notifFilter === 'all'
                      ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 font-bold'
                      : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                >
                  {t('All')} ({notifications.length})
                </button>
                <button
                  onClick={() => setNotifFilter('unread')}
                  className={`pb-2 border-b-2 transition-colors cursor-pointer ${
                    notifFilter === 'unread'
                      ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 font-bold'
                      : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                >
                  {t('Unread')} ({unreadCount})
                </button>
              </div>

              {/* Notification Items List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredNotifications.length === 0 ? (
                  <div className="p-8 text-center flex flex-col items-center justify-center text-slate-400">
                    <Bell size={28} className="mb-2 opacity-30" />
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      {t('All caught up! No unread notifications.')}
                    </p>
                  </div>
                ) : (
                  filteredNotifications.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleNotificationClick(item)}
                      className={`p-3.5 sm:p-4 flex items-start gap-3 transition-colors cursor-pointer group ${
                        item.read 
                          ? 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/40 opacity-75' 
                          : 'bg-blue-50/40 dark:bg-blue-950/20 hover:bg-blue-50/70 dark:hover:bg-blue-950/30'
                      }`}
                    >
                      <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                        {getNotifIcon(item.type)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h5 className={`text-xs ${item.read ? 'font-semibold text-slate-700 dark:text-slate-300' : 'font-bold text-slate-900 dark:text-white'}`}>
                            {language === 'hi' ? item.titleHi : item.titleEn}
                          </h5>
                          <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                            {language === 'hi' ? item.timeHi : item.timeEn}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug line-clamp-2">
                          {language === 'hi' ? item.messageHi : item.messageEn}
                        </p>

                        {item.caseId && (
                          <div className="mt-2 flex items-center gap-1 text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400">
                            <span>{item.caseId}</span>
                            <ExternalLink size={10} />
                          </div>
                        )}
                      </div>

                      {!item.read && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 mt-2 shrink-0" />
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Footer Actions */}
              {notifications.length > 0 && (
                <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400">
                    {notifications.length} {t('Notifications').toLowerCase()}
                  </span>
                  <button
                    onClick={clearAll}
                    className="text-[11px] font-semibold text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Trash2 size={12} />
                    <span>{t('Clear all')}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />

        {/* User Profile */}
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => {
              setDropdownOpen(!dropdownOpen);
              setNotifOpen(false);
            }}
            className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <div className="w-9 h-9 rounded-full bg-[#0e1d3e] text-white font-bold text-xs flex items-center justify-center ring-2 ring-blue-500/30">
              {initials}
            </div>
            <div className="hidden sm:block text-left leading-tight">
              <div className="text-xs font-bold text-slate-900 dark:text-white">
                {currentUser?.full_name || 'Aditya Kochar'}
              </div>
              <div className="text-[10px] text-slate-400 capitalize">
                {t(roleLabelKey)}
              </div>
            </div>
            <ChevronDown size={14} className="text-slate-400" />
          </button>

          {/* Profile Dropdown */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {currentUser?.full_name}
                </p>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                  ID: {currentUser?.badge_number || 'POL-1'}
                </p>
              </div>

              <button
                onClick={() => {
                  setDropdownOpen(false);
                  onLogout();
                }}
                className="w-full px-4 py-2 text-left text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors flex items-center gap-2 mt-1 cursor-pointer"
              >
                <LogOut size={14} />
                <span>{t('Sign Out')}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>

    <CommandPalette
      isOpen={commandOpen}
      onClose={() => setCommandOpen(false)}
      onSelectCase={onSelectCase}
      onViewChange={onViewChange}
      theme={theme}
      toggleTheme={toggleTheme}
      onSwitchUser={onSwitchUser}
    />
  </>
);
}
