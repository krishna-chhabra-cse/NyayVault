import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  FolderKanban, 
  Shield, 
  Scale, 
  Gavel, 
  UserCheck, 
  Clock, 
  ShieldCheck, 
  Moon, 
  Sun, 
  Languages, 
  ExternalLink, 
  X,
  Command,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getCases } from '../services/api';
import { useTranslation } from '../hooks/useTranslation';
import { useToast } from '../context/ToastContext';

const DEMO_USERS = [
  { badge: 'POL-1', name: 'Insp. Krishna Chhabra', role: 'INVESTIGATING_OFFICER', label: 'Police IO', icon: Shield, color: 'text-blue-500 bg-blue-500/10' },
  { badge: 'REG-1', name: 'Registrar Amit Kumar', role: 'REGISTRAR', label: 'Court Registrar', icon: Scale, color: 'text-purple-500 bg-purple-500/10' },
  { badge: 'JUD-1', name: 'Hon. Justice Vatsal Singh', role: 'JUDICIAL_OFFICER', label: 'Magistrate', icon: Gavel, color: 'text-amber-500 bg-amber-500/10' },
  { badge: 'ADV-1', name: 'Adv. Vikram Singh', role: 'LAWYER_DEFENSE', label: 'Defense Counsel', icon: UserCheck, color: 'text-rose-500 bg-rose-500/10' },
  { badge: 'ADV-2', name: 'Adv. Priya Kapoor', role: 'LAWYER_PROSECUTION', label: 'State Prosecutor', icon: UserCheck, color: 'text-emerald-500 bg-emerald-500/10' },
];

export default function CommandPalette({ 
  isOpen, 
  onClose, 
  onSelectCase, 
  onViewChange, 
  theme, 
  toggleTheme,
  onSwitchUser
}) {
  const { t, toggleLanguage, language } = useTranslation();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setLoading(true);
      getCases()
        .then(res => setCases(res.cases || []))
        .catch(() => setCases([]))
        .finally(() => setLoading(false));

      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredCases = cases.filter(c => 
    c.case_number?.toLowerCase().includes(query.toLowerCase()) ||
    c.title?.toLowerCase().includes(query.toLowerCase())
  );

  const filteredRoles = DEMO_USERS.filter(u =>
    u.name.toLowerCase().includes(query.toLowerCase()) ||
    u.badge.toLowerCase().includes(query.toLowerCase()) ||
    u.label.toLowerCase().includes(query.toLowerCase())
  );

  const handleCaseClick = (caseId) => {
    onSelectCase(caseId);
    onClose();
  };

  const handleNav = (view) => {
    onViewChange(view);
    onClose();
  };

  const handleRoleSwitch = async (badgeNumber) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ badge_number: badgeNumber, password: 'nyay2026' })
      });
      const data = await res.json();
      if (data.token && data.user) {
        localStorage.setItem('nv_token', data.token);
        localStorage.setItem('nv_active_user', JSON.stringify(data.user));
        toast.success(`Switched identity to ${data.user.full_name} (${badgeNumber})`, 'Role Switched');
        onClose();
        if (onSwitchUser) {
          onSwitchUser(data.user, data.token);
        } else {
          window.location.reload();
        }
      }
    } catch (err) {
      toast.error('Failed to switch role: ' + err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-150">
      <div 
        className="fixed inset-0 -z-10" 
        onClick={onClose} 
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: -10 }}
        transition={{ type: 'spring', damping: 28, stiffness: 400 }}
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
      >
        {/* Search Input Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3 bg-slate-50/50 dark:bg-slate-800/30">
          <Search size={18} className="text-blue-600 dark:text-blue-400 shrink-0 ml-1" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a case number (CR-...), search exhibits, or switch role..."
            className="flex-1 bg-transparent border-none outline-none text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400"
          />
          <div className="flex items-center gap-1.5 shrink-0">
            <kbd className="hidden sm:inline-flex px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
              ESC
            </kbd>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Results Scroll Area */}
        <div className="overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-3 space-y-3">
          {/* Quick Role Switcher */}
          {filteredRoles.length > 0 && (
            <div>
              <p className="px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                1-Click Role Switcher (Simulated ICJS Login)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-1">
                {filteredRoles.map((u) => {
                  const Icon = u.icon;
                  return (
                    <button
                      key={u.badge}
                      onClick={() => handleRoleSwitch(u.badge)}
                      className="flex items-center justify-between p-2.5 rounded-xl hover:bg-blue-50/70 dark:hover:bg-blue-950/30 transition-colors text-left group cursor-pointer border border-transparent hover:border-blue-100 dark:hover:border-blue-900/40"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`p-2 rounded-xl ${u.color} shrink-0 group-hover:scale-105 transition-transform`}>
                          <Icon size={14} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {u.name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {u.badge} • {u.label}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                        Switch ➔
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Cases Results */}
          <div>
            <p className="px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
              Active Case Dockets ({filteredCases.length})
            </p>
            {filteredCases.length === 0 ? (
              <div className="px-3 py-4 text-xs text-slate-400 text-center">
                No cases matched your query.
              </div>
            ) : (
              <div className="space-y-1 mt-1">
                {filteredCases.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleCaseClick(c.id)}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors text-left cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <FolderKanban size={15} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 font-mono truncate">
                          {c.case_number} - {c.title}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          Status: {c.status || 'INVESTIGATION'} • Security: {c.security_level}
                        </p>
                      </div>
                    </div>
                    <ArrowRight size={14} className="text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick System Actions */}
          <div>
            <p className="px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
              Quick System Navigation
            </p>
            <div className="grid grid-cols-2 gap-1 mt-1">
              <button
                onClick={() => handleNav('cases')}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <FolderKanban size={14} className="text-blue-600" />
                <span>All Cases</span>
              </button>
              <button
                onClick={() => handleNav('timeline')}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <Clock size={14} className="text-purple-600" />
                <span>Master Timeline</span>
              </button>
              <button
                onClick={() => handleNav('audit')}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <ShieldCheck size={14} className="text-emerald-600" />
                <span>Audit Logs</span>
              </button>
              <button
                onClick={() => {
                  toggleTheme();
                  onClose();
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                {theme === 'dark' ? <Sun size={14} className="text-amber-500" /> : <Moon size={14} className="text-slate-600" />}
                <span>Toggle {theme === 'dark' ? 'Light' : 'Dark'} Mode</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between text-[11px] text-slate-400">
          <span>Navigate with <kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono text-[10px]">↑</kbd> <kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono text-[10px]">↓</kbd></span>
          <span>Press <kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono text-[10px]">ESC</kbd> to close</span>
        </div>
      </motion.div>
    </div>
  );
}
