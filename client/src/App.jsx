import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import TopHeader from './components/TopHeader';
import CaseList from './components/CaseList';
import CaseDetail from './components/CaseDetail';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

import CrossCaseRadar from './components/CrossCaseRadar';
import SmartSearch from './components/SmartSearch';
import MasterTimelineHub from './components/MasterTimelineHub';
import AuditTrailHub from './components/AuditTrailHub';
import ReportsHub from './components/ReportsHub';
import UsersDirectory from './components/UsersDirectory';
import SettingsHub from './components/SettingsHub';
import EvidenceHub from './components/EvidenceHub';
import { canAccessGlobalEvidence } from './components/Sidebar';
import { Lock, FolderKanban } from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';
import { LanguageProvider } from './hooks/useTranslation';
import { NotificationProvider } from './hooks/useNotifications';
import { ToastProvider } from './context/ToastContext';
import ErrorBoundary from './components/ui/ErrorBoundary';

function EvidenceRestrictedBoundary({ onGoToCases }) {
  return (
    <div className="max-w-2xl mx-auto my-12 p-8 sm:p-10 bg-white dark:bg-slate-900 border border-amber-200/80 dark:border-amber-900/40 rounded-3xl shadow-xl text-center space-y-6">
      <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center text-amber-600 dark:text-amber-400 mx-auto shadow-sm">
        <Lock size={30} className="stroke-[2.2]" />
      </div>
      <div className="space-y-3">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
          Judicial Evidentiary Boundary • Section 65B BSA
        </span>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Global Evidence Vault Restricted
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-lg mx-auto">
          Under statutory confidentiality and court procedural justice rules, Police Investigators, Defense Counsels, Public Prosecutors, and Judicial Officers cannot access the global evidence repository across unassigned cases.
        </p>
        <p className="text-xs text-blue-700 dark:text-blue-300 font-semibold">
          You may only inspect, verify, and upload exhibits inside your officially assigned case dockets.
        </p>
      </div>
      <div className="pt-2 flex justify-center">
        <button
          onClick={onGoToCases}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs sm:text-sm transition-all shadow-md shadow-blue-600/20 cursor-pointer"
        >
          <FolderKanban size={16} />
          <span>Access My Assigned Cases</span>
        </button>
      </div>
    </div>
  );
}

function AppContent() {
  const [activeCaseId, setActiveCaseId] = useState(null);
  const [activeView, setActiveView] = useState('dashboard'); // 'dashboard', 'cases' or 'radar'
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!localStorage.getItem('nv_token');
  });

  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Theme management
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('nv_theme') || 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('nv_theme', theme);
  }, [theme]);

  // Load user profile if authenticated
  useEffect(() => {
    const token = localStorage.getItem('nv_token');
    if (!token) {
      setAuthLoading(false);
      return;
    }

    fetch('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('Invalid token');
        return res.json();
      })
      .then(data => {
        setCurrentUser(data.user);
        setIsAuthenticated(true);
      })
      .catch(() => {
        localStorage.removeItem('nv_token');
        setIsAuthenticated(false);
      })
      .finally(() => {
        setAuthLoading(false);
      });
  }, []);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleLoginSuccess = (user, token) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    window.history.replaceState({ view: 'cases' }, '', '/');
  };

  const handleLogout = () => {
    localStorage.removeItem('nv_token');
    localStorage.removeItem('nv_active_user');
    setIsAuthenticated(false);
    setCurrentUser(null);
    setActiveCaseId(null);
  };

  // Handle History API for browser back button
  useEffect(() => {
    const handlePopState = (event) => {
      if (event.state?.view === 'case' && event.state?.caseId) {
        setActiveCaseId(event.state.caseId);
        setActiveView('cases');
      } else if (event.state?.view) {
        setActiveCaseId(null);
        setActiveView(event.state.view);
      } else {
        setActiveCaseId(null);
        setActiveView('dashboard');
      }
    };
    
    // Initial state setup if url has hash
    const hash = window.location.hash;
    if (hash.startsWith('#case/')) {
      const id = hash.split('/')[1];
      setActiveCaseId(id);
      setActiveView('cases');
      window.history.replaceState({ view: 'case', caseId: id }, '', hash);
    } else if (hash && hash.length > 1) {
      const viewFromHash = hash.substring(1);
      setActiveView(viewFromHash);
      window.history.replaceState({ view: viewFromHash }, '', hash);
    } else {
      setActiveView('dashboard');
      window.history.replaceState({ view: 'dashboard' }, '', '/');
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Global Keyboard Shortcut: Cmd + K / Ctrl + K opens Search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        handleViewChange('search');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleCaseSelect = (id) => {
    setActiveCaseId(id);
    setActiveView('cases');
    window.history.pushState({ view: 'case', caseId: id }, '', `#case/${id}`);
  };

  const handleViewChange = (v) => {
    setActiveView(v);
    setActiveCaseId(null);
    window.history.pushState({ view: v }, '', `#${v}`);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Login 
        onLoginSuccess={handleLoginSuccess} 
        theme={theme} 
        toggleTheme={toggleTheme} 
      />
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#f8fafd] dark:bg-slate-950 text-slate-800 dark:text-white flex transition-colors duration-300 font-sans selection:bg-blue-600 selection:text-white relative">
      {/* Soft abstract ambient curves matching Login screen */}
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-blue-100/50 via-indigo-50/30 to-transparent dark:from-blue-950/20 dark:via-transparent rounded-full blur-3xl pointer-events-none -mr-40 -mt-40 z-0" />
      <div className="fixed bottom-0 left-64 w-[500px] h-[500px] bg-gradient-to-tr from-blue-100/60 via-sky-50/30 to-transparent dark:from-blue-950/20 dark:via-transparent rounded-full blur-3xl pointer-events-none -ml-20 -mb-40 z-0" />

      {/* Sidebar Navigation matching user mockup */}
      <Sidebar 
        activeView={activeCaseId ? 'cases' : activeView} 
        onViewChange={handleViewChange} 
        currentUser={currentUser} 
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />

      {/* Main Content Column */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        <TopHeader 
          currentUser={currentUser} 
          theme={theme} 
          toggleTheme={toggleTheme} 
          onLogout={handleLogout} 
          onSearchClick={() => handleViewChange('search')}
          onToggleMobileNav={() => setMobileNavOpen(prev => !prev)}
          onSelectCase={handleCaseSelect}
          onViewChange={handleViewChange}
          onSwitchUser={handleLoginSuccess}
        />

        <main className="flex-1 p-5 sm:p-7 lg:p-8 overflow-y-auto max-w-7xl w-full mx-auto">
          {activeCaseId ? (
            <CaseDetail 
              caseId={activeCaseId} 
              onBack={() => {
                setActiveCaseId(null);
                setActiveView('cases');
                window.history.pushState({ view: 'cases' }, '', '#cases');
              }} 
              currentUser={currentUser}
            />
          ) : activeView === 'dashboard' ? (
            <Dashboard currentUser={currentUser} onSelectCase={handleCaseSelect} onViewChange={handleViewChange} />
          ) : activeView === 'evidence' ? (
            canAccessGlobalEvidence(currentUser?.role) ? (
              <EvidenceHub onSelectCase={handleCaseSelect} />
            ) : (
              <EvidenceRestrictedBoundary onGoToCases={() => handleViewChange('cases')} />
            )
          ) : activeView === 'search' ? (
            <SmartSearch onOpenCase={handleCaseSelect} />
          ) : activeView === 'cases' ? (
            <CaseList onCaseSelect={handleCaseSelect} currentUser={currentUser} />
          ) : activeView === 'radar' ? (
            <CrossCaseRadar onOpenCase={handleCaseSelect} />
          ) : activeView === 'timeline' ? (
            <MasterTimelineHub onCaseSelect={handleCaseSelect} />
          ) : activeView === 'audit' ? (
            <AuditTrailHub />
          ) : activeView === 'reports' ? (
            <ReportsHub currentUser={currentUser} />
          ) : activeView === 'users' ? (
            <UsersDirectory />
          ) : activeView === 'settings' ? (
            <SettingsHub currentUser={currentUser} theme={theme} toggleTheme={toggleTheme} />
          ) : (
            <Dashboard currentUser={currentUser} onSelectCase={handleCaseSelect} onViewChange={handleViewChange} />
          )}
        </main>
      </div>
      <Analytics />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <NotificationProvider>
          <ToastProvider>
            <AppContent />
          </ToastProvider>
        </NotificationProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}
