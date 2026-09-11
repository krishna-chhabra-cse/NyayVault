import { useState } from 'react';
import { 
  Fingerprint, 
  Lock, 
  Loader2, 
  AlertCircle, 
  ShieldCheck, 
  Link2, 
  Users, 
  FileText, 
  Eye, 
  EyeOff, 
  Landmark, 
  Scale, 
  ArrowRight,
  Sun,
  Moon,
  X,
  Building2,
  CheckCircle2,
  Shield,
  Sparkles,
  UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const GOVT_SSO_PROFILES = [
  {
    badge: 'JUD-1',
    name: 'Hon. Justice Vatsal Singh',
    designation: 'Principal District & Sessions Judge',
    department: 'Faridabad District Court',
    roleLabel: 'Judicial Officer',
    ssoId: 'justice.vatsal@gov.in',
    secLevel: 'ePramaan Level 3 (Class-3 DSC Token)',
    icon: Scale,
    color: 'emerald'
  },
  {
    badge: 'POL-1',
    name: 'Insp. Krishna Chhabra',
    designation: 'Cyber Crime Investigation Unit Head',
    department: 'Cyber Crime Branch, Police Dept',
    roleLabel: 'Investigating Officer',
    ssoId: 'k.chhabra@police.gov.in',
    secLevel: 'ePramaan Level 3 (Govt Biometric MFA)',
    icon: ShieldCheck,
    color: 'blue'
  },
  {
    badge: 'ADV-2',
    name: 'Adv. Priya Kapoor',
    designation: 'State Prosecutor',
    department: 'Directorate of Prosecution, Haryana',
    roleLabel: 'State Prosecution',
    ssoId: 'p.kapoor@prosecution.gov.in',
    secLevel: 'ePramaan Level 2 (Bar Council Verified)',
    icon: Users,
    color: 'purple'
  },
  {
    badge: 'ADV-1',
    name: 'Adv. Vikram Singh',
    designation: 'Senior Defense Counsel',
    department: 'Bar Council of Punjab & Haryana',
    roleLabel: 'Defense Counsel',
    ssoId: 'v.singh@barcouncil.gov.in',
    secLevel: 'ePramaan Level 2 (Bar Council Verified)',
    icon: FileText,
    color: 'amber'
  },
  {
    badge: 'REG-1',
    name: 'Registrar Amit Kumar',
    designation: 'Court Registry & Evidence In-Charge',
    department: 'Faridabad Court Registry',
    roleLabel: 'Court Registry',
    ssoId: 'registry.fbd@court.gov.in',
    secLevel: 'ePramaan Level 3 (Official Seal)',
    icon: Building2,
    color: 'indigo'
  }
];

export default function Login({ onLoginSuccess, theme, toggleTheme }) {
  const [badgeNumber, setBadgeNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSSOModal, setShowSSOModal] = useState(false);
  const [ssoProcessing, setSsoProcessing] = useState(null);
  const [ssoStep, setSsoStep] = useState(0);
  const [ssoError, setSsoError] = useState('');

  const handleQuickFill = (roleBadge) => {
    setBadgeNumber(roleBadge);
    setPassword('sih2026');
    setError('');
  };

  const performLogin = async (badge, pass) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ badge_number: badge, password: pass })
    });

    let data = null;
    try {
      data = await res.json();
    } catch (e) {
      throw new Error('Backend server unreachable. Please check connection and try again.');
    }
    
    if (!res.ok) {
      throw new Error(data?.error || `Authentication failed (${res.status})`);
    }

    localStorage.setItem('sih_token', data.token);
    localStorage.setItem('sih_active_user', data.user.id);
    localStorage.setItem('sih_active_role', data.user.role);
    
    onLoginSuccess(data.user, data.token);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await performLogin(badgeNumber, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSSOLogin = async (profile) => {
    setSsoError('');
    setSsoProcessing(profile);
    setSsoStep(1);

    try {
      await new Promise((resolve) => setTimeout(resolve, 650));
      setSsoStep(2);
      await new Promise((resolve) => setTimeout(resolve, 650));
      setSsoStep(3);
      await new Promise((resolve) => setTimeout(resolve, 500));

      await performLogin(profile.badge, 'sih2026');
      setShowSSOModal(false);
    } catch (err) {
      setSsoError(err.message || 'ePramaan SSO authentication failed. Please try again.');
      setSsoProcessing(null);
    }
  };

  return (
    <div 
      style={{ zoom: '110%' }}
      className="min-h-screen flex flex-col justify-between bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 p-4 lg:px-12 lg:py-5 overflow-x-hidden overflow-y-auto transition-colors duration-200"
    >
      
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 pb-3 sm:pb-4 shrink-0">
        <div className="flex items-center gap-3 sm:gap-6 flex-wrap sm:flex-nowrap">
          {/* Official Department of Justice Portal Link & Logo */}
          <a
            href="https://doj.gov.in/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center bg-white px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl border border-slate-200/90 dark:border-slate-700 shadow-xs hover:border-blue-500 hover:shadow-md transition-all cursor-pointer group"
            title="Department of Justice, Ministry of Law & Justice, Government of India (Official Portal - Opens in new tab)"
          >
            <img 
              src="/doj-logo.png" 
              alt="Department of Justice, Ministry of Law & Justice, Government of India" 
              className="h-10 sm:h-12 w-auto object-contain transition-transform group-hover:scale-[1.02]" 
            />
          </a>

          <div className="h-10 w-px bg-slate-300 dark:bg-slate-700 hidden sm:block" />

          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="NyayVault Logo" className="h-10 w-10 sm:h-12 sm:w-12 object-contain rounded-full shadow-md shrink-0" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none">
                Nyay<span className="text-blue-600 dark:text-blue-500">Vault</span>
              </h1>
              <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-1 leading-none">
                Evidence Today. A Safer Tomorrow.
              </p>
            </div>
          </div>
        </div>

        {/* Theme Toggle Button */}
        {toggleTheme && (
          <button
            type="button"
            onClick={toggleTheme}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-xs text-xs font-semibold cursor-pointer"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? (
              <>
                <Sun size={15} className="text-amber-400" />
                <span className="hidden sm:inline">Light</span>
              </>
            ) : (
              <>
                <Moon size={15} className="text-slate-600" />
                <span className="hidden sm:inline">Dark</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Main Grid Content - Centered Compact Container */}
      <div className="w-full max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch my-auto py-2">
        
        {/* Left Side Text & Features */}
        <div className="lg:col-span-6 flex flex-col justify-between space-y-4 pr-0 lg:pr-2 py-1">
          <div>
            <h1 className="text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-[1.15]">
              Transparent <br />
              Evidence. <br />
              <span className="text-blue-600 dark:text-blue-400">Stronger Justice.</span>
            </h1>
            <p className="text-xs lg:text-sm text-slate-600 dark:text-slate-300 font-medium mt-2 max-w-sm leading-relaxed">
              A unified, tamper-proof platform for evidence management and a transparent chain of custody.
            </p>
          </div>

          {/* Feature List */}
          <div className="space-y-3 py-1">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900/40 shadow-xs">
                <ShieldCheck size={16} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">Tamper-Proof Records</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">Immutable & verifiable</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900/40 shadow-xs">
                <Link2 size={16} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">End-to-End Chain of Custody</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">Track every action</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900/40 shadow-xs">
                <Users size={16} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">Role-Based Access</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">For Police, Prosecution, Defense, Judiciary</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900/40 shadow-xs">
                <FileText size={16} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">Audit-Ready Logs</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">Transparent & accountable</p>
              </div>
            </div>
          </div>

          {/* Bottom Tagline */}
          <div className="pt-1">
            <div className="w-10 h-0.5 bg-blue-600 dark:bg-blue-500 mb-1.5" />
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-widest uppercase">
              TECHNOLOGY FOR A MORE JUST INDIA
            </p>
          </div>
        </div>

        {/* Right Side Login Card */}
        <div className="lg:col-span-6 flex flex-col justify-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm ml-auto h-full flex flex-col justify-between bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 lg:p-6 shadow-xl shadow-slate-200/50 dark:shadow-slate-950/80"
          >
            {/* Top: Header Badge & Title */}
            <div className="text-center shrink-0 mb-2">
              <img src="/logo.png" alt="NyayVault Logo" className="w-12 h-12 object-contain rounded-full mx-auto mb-1.5 drop-shadow-md" />
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">NyayVault</h2>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-400 tracking-wider uppercase">
                SECURE EVIDENCE PORTAL
              </p>
            </div>

            {/* Middle Content Container */}
            <div className="space-y-3 flex-1 flex flex-col justify-center my-1">
              {/* Quick Demo Bar */}
              <div className="bg-blue-50/70 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 rounded-xl p-2 text-center space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-blue-900 dark:text-blue-200">✨ Auto-Fill Demo Credentials:</span>
                  <span className="font-mono font-bold text-blue-700 dark:text-blue-300">Pass: sih2026</span>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-1">
                  {['POL-1', 'JUD-1', 'ADV-1', 'ADV-2', 'REG-1'].map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => handleQuickFill(role)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                        badgeNumber === role 
                          ? 'bg-blue-600 text-white border-blue-600 dark:bg-blue-600 dark:text-white dark:border-blue-600' 
                          : 'bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-slate-700 hover:bg-blue-100/60 dark:hover:bg-slate-700/60'
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 flex items-start gap-2 text-xs">
                  <AlertCircle className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" size={14} />
                  <p className="font-bold text-rose-700 dark:text-rose-300 text-[11px]">{error}</p>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleLogin} className="space-y-2.5 text-xs">
                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-300 text-[10px] uppercase tracking-wider mb-0.5">
                    OFFICER / PERSONNEL BADGE ID
                  </label>
                  <div className="relative">
                    <Fingerprint className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={14} />
                    <input
                      type="text"
                      required
                      className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs focus:bg-white dark:focus:bg-slate-800 focus:border-blue-600 dark:focus:border-blue-500 focus:outline-none transition-colors"
                      placeholder="e.g. POL-1 or JUD-1"
                      value={badgeNumber}
                      onChange={(e) => setBadgeNumber(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-300 text-[10px] uppercase tracking-wider mb-0.5">
                    PASSPHRASE
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={14} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      className="w-full pl-8 pr-8 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs focus:bg-white dark:focus:bg-slate-800 focus:border-blue-600 dark:focus:border-blue-500 focus:outline-none transition-colors"
                      placeholder="Enter your passphrase"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 active:scale-[0.99] text-white rounded-xl font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex justify-center items-center gap-1.5 disabled:opacity-50 mt-1 cursor-pointer"
                >
                  {loading ? (
                    <><Loader2 className="animate-spin" size={14} /> Authenticating...</>
                  ) : (
                    <>Access NyayVault <ArrowRight size={14} /></>
                  )}
                </button>
              </form>

              {/* SSO Option */}
              <div className="space-y-1.5 pt-0.5">
                <div className="relative flex items-center justify-center">
                  <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
                  <span className="bg-white dark:bg-slate-900 px-2 text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase absolute">OR</span>
                </div>

                <button 
                  type="button"
                  onClick={() => {
                    setShowSSOModal(true);
                    setSsoProcessing(null);
                    setSsoError('');
                  }}
                  className="w-full py-1.5 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-700 dark:text-slate-200 text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Landmark size={13} className="text-slate-600 dark:text-slate-400" />
                  <div className="text-left leading-none">
                    <span className="font-bold block text-[10px]">Login with Government SSO</span>
                    <span className="text-[8px] text-slate-400 dark:text-slate-500 font-normal">(ePramaan / MeriPehchaan)</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Bottom: Footer Compliance Badge */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-center shrink-0 mt-2">
              <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center justify-center gap-1">
                <ShieldCheck size={12} className="text-emerald-600 dark:text-emerald-400" /> BNS & BSA 2023 Compliant
              </p>
              <p className="text-[9px] text-slate-400 dark:text-slate-500">Secure | Auditable | Government Certified</p>
            </div>
          </motion.div>
        </div>

      </div>

      {/* Footer copyright */}
      <div className="text-center text-[10px] text-slate-400 dark:text-slate-500 font-medium shrink-0 pt-1">
        NyayVault Secure Evidence Portal © 2026 · Department of Justice · Ministry of Law & Justice · Government of India
      </div>

      {/* MeriPehchaan / ePramaan Government SSO Modal */}
      <AnimatePresence>
        {showSSOModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6"
            >
              {/* Top Indian Tricolor Strip */}
              <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-white to-emerald-600" />
              
              {/* Header */}
              <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center shrink-0">
                    <Landmark className="w-6 h-6 text-amber-700 dark:text-amber-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">MeriPehchaan (NSSO)</h3>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                        ePramaan L3 Active
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      National Single Sign-On Portal · Ministry of Electronics & IT (MeitY)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={!!ssoProcessing}
                  onClick={() => setShowSSOModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors disabled:opacity-40 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-4 sm:p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                {ssoProcessing ? (
                  // Live SSO Authentication Flow
                  <div className="py-6 px-4 text-center space-y-5">
                    <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                      <div className="absolute inset-0 rounded-full border-4 border-blue-200 dark:border-blue-900 animate-ping opacity-25" />
                      <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center shadow-md">
                        <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        Authenticating via MeriPehchaan
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Verifying credentials for <span className="font-semibold text-slate-700 dark:text-slate-200">{ssoProcessing.name}</span>
                      </p>
                    </div>

                    {/* Stepper */}
                    <div className="max-w-xs mx-auto text-left space-y-2.5 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-xs">
                      <div className="flex items-center gap-2.5">
                        {ssoStep >= 1 ? (
                          <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 dark:border-slate-600 shrink-0" />
                        )}
                        <span className={ssoStep >= 1 ? 'font-semibold text-slate-800 dark:text-slate-200' : 'text-slate-400'}>
                          Connecting to MeriPehchaan Gateway
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5">
                        {ssoStep >= 2 ? (
                          <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                        ) : (
                          <Loader2 size={15} className="text-blue-500 animate-spin shrink-0" />
                        )}
                        <span className={ssoStep >= 2 ? 'font-semibold text-slate-800 dark:text-slate-200' : 'text-slate-400'}>
                          Validating ePramaan DSC Certificate
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5">
                        {ssoStep >= 3 ? (
                          <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 dark:border-slate-600 shrink-0" />
                        )}
                        <span className={ssoStep >= 3 ? 'font-semibold text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}>
                          Token Accepted · Granting Access
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Profile Selection View
                  <>
                    {ssoError && (
                      <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300">
                        <AlertCircle size={15} className="shrink-0" />
                        <span>{ssoError}</span>
                      </div>
                    )}

                    <div className="bg-blue-50/60 dark:bg-blue-950/40 p-3 rounded-xl border border-blue-100 dark:border-blue-900/60 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2.5">
                      <ShieldCheck size={16} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold leading-tight">Federated Single Sign-On (ePramaan)</p>
                        <p className="text-[11px] text-blue-700 dark:text-blue-300 mt-0.5">
                          Select an authorized government service profile below to authenticate with official MeriPehchaan identity verification:
                        </p>
                      </div>
                    </div>

                    {/* Profiles List */}
                    <div className="space-y-2">
                      {GOVT_SSO_PROFILES.map((prof) => {
                        const IconComponent = prof.icon;
                        return (
                          <button
                            key={prof.badge}
                            type="button"
                            onClick={() => handleSSOLogin(prof)}
                            className="w-full text-left p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white hover:bg-slate-50 dark:bg-slate-800/80 dark:hover:bg-slate-800 transition-all shadow-xs hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md group cursor-pointer flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 group-hover:bg-blue-50 dark:group-hover:bg-blue-950/50 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                <IconComponent size={18} />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                    {prof.name}
                                  </span>
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                    {prof.badge}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                  {prof.designation} · {prof.department}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[9px] text-slate-400 font-mono">
                                    {prof.ssoId}
                                  </span>
                                  <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                                    • {prof.secLevel}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="shrink-0 flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform">
                              <span className="hidden sm:inline text-[11px]">Authenticate</span>
                              <ArrowRight size={14} />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500">
                <span className="flex items-center gap-1">
                  <Shield size={11} className="text-emerald-500" /> NIC SAML 2.0 & OIDC 1.0 Certified
                </span>
                <span>BSA 2023 Sec 63 & DPDP Act 2023</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
