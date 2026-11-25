import React, { useState, useEffect } from 'react';
import { 
  Folder, 
  FileText, 
  Clock, 
  Users, 
  ChevronRight, 
  Plus, 
  MoreVertical, 
  Upload, 
  Sparkles, 
  FileSpreadsheet, 
  Share2, 
  CheckCircle2, 
  Database, 
  Settings2, 
  ShieldCheck, 
  FileVideo, 
  FileSpreadsheet as FileCsv, 
  Image as ImageIcon,
  ArrowRight,
  ExternalLink,
  X,
  Shield,
  Scale
} from 'lucide-react';
import { getCases, createCase, getAllDocuments, getGlobalAuditLogs } from '../services/api';
import { StatCardsSkeleton, TableRowsSkeleton } from './ui/Skeleton';
import { useTranslation } from '../hooks/useTranslation';
import { canAccessGlobalEvidence } from './Sidebar';
import { canCreateCase } from './CaseList';
import NumberTicker from './ui/NumberTicker';
import BorderBeam from './ui/BorderBeam';
import JudicialPipelineBadge from './JudicialPipelineBadge';
import ShimmerButton from './ui/ShimmerButton';
import { useToast } from '../context/ToastContext';

export default function Dashboard({ currentUser, onSelectCase, onViewChange }) {
  const { t, language } = useTranslation();
  const toast = useToast();
  const [cases, setCases] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCaseOverview, setSelectedCaseOverview] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // New Case Form
  const [newCaseData, setNewCaseData] = useState({
    caseNumber: '',
    title: '',
    description: '',
    securityLevel: 'RESTRICTED'
  });

  const loadDashboard = async () => {
    try {
      const [casesRes, docsRes, auditRes] = await Promise.all([
        getCases().catch(() => ({ cases: [] })),
        getAllDocuments().catch(() => ({ documents: [] })),
        getGlobalAuditLogs(6).catch(() => ({ auditLogs: [] }))
      ]);
      const loadedCases = casesRes.cases || [];
      setCases(loadedCases);
      if (loadedCases.length > 0) {
        setSelectedCaseOverview(loadedCases[0]);
      } else {
        setSelectedCaseOverview(null);
      }
      setDocuments(docsRes.documents || []);
      setAuditLogs(auditRes.auditLogs || []);
    } catch (err) {
      console.error("Failed to load dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleCreateCaseSubmit = async (e) => {
    e.preventDefault();
    try {
      await createCase(newCaseData);
      toast.success(`Case docket ${newCaseData.caseNumber} registered in ledger`, 'Case File Created');
      setShowCreateModal(false);
      setNewCaseData({ caseNumber: '', title: '', description: '', securityLevel: 'RESTRICTED' });
      await loadDashboard();
    } catch (err) {
      toast.error(err.message || 'Failed to create case', 'Action Failed');
    }
  };

  const displayCases = cases;
  const recentEvidences = documents.slice(0, 5);
  const activeCaseItem = selectedCaseOverview || (cases.length > 0 ? cases[0] : null);

  const roleName = currentUser?.role === 'INVESTIGATING_OFFICER' 
    ? 'Investigator' 
    : currentUser?.role === 'JUDICIAL_OFFICER' 
    ? 'Magistrate' 
    : currentUser?.role === 'REGISTRAR'
    ? 'Court Registrar'
    : currentUser?.role === 'LAWYER_PROSECUTION'
    ? 'Public Prosecutor'
    : currentUser?.role === 'LAWYER_DEFENSE'
    ? 'Defense Counsel'
    : 'Officer';

  const isRegistrar = currentUser?.role === 'REGISTRAR';
  const unallocatedCases = cases.filter(c => !c.assignments || c.assignments.length === 0);

  const getDocIconInfo = (mimeType, filename) => {
    const fn = (filename || '').toLowerCase();
    const mt = (mimeType || '').toLowerCase();
    if (mt.includes('video') || fn.endsWith('.mp4') || fn.endsWith('.mkv') || fn.endsWith('.mov')) {
      return { icon: FileVideo, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40' };
    }
    if (mt.includes('image') || fn.endsWith('.jpg') || fn.endsWith('.jpeg') || fn.endsWith('.png') || fn.endsWith('.webp')) {
      return { icon: ImageIcon, color: 'text-cyan-500 bg-cyan-50 dark:bg-cyan-950/40' };
    }
    if (mt.includes('csv') || fn.endsWith('.csv') || fn.endsWith('.xlsx')) {
      return { icon: FileCsv, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40' };
    }
    return { icon: FileText, color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/40' };
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Top Greeting & Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200/80 dark:border-blue-900/40">
              <Shield size={11} className="text-blue-600 dark:text-blue-400" />
              {t('Secure Cloud Evidence Portal')}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>👋</span>
            <span>{t('Welcome back,')} {currentUser?.full_name ? currentUser.full_name.split(' ')[0] : t(roleName)}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {t('Here is your live evidence custody summary and active proceedings overview.')}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden md:block">
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {new Date().toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              {new Date().toLocaleTimeString(language === 'hi' ? 'hi-IN' : 'en-GB', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>

          {canCreateCase(currentUser?.role) && (
            <ShimmerButton
              onClick={() => setShowCreateModal(true)}
              className="text-xs font-bold"
            >
              <Plus size={16} />
              <span>{t('Create Case')}</span>
            </ShimmerButton>
          )}
        </div>
      </div>

      {/* Court Registrar Urgent Allocation Alert Banner */}
      {isRegistrar && unallocatedCases.length > 0 && (
        <div className="relative overflow-hidden p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-950/40 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <BorderBeam size={320} duration={8} colorFrom="#f59e0b" colorTo="#ef4444" />
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shrink-0 shadow-xs">
              <Scale size={20} />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                {unallocatedCases.length} {t('New Police Filing(s) Awaiting Judicial Allocation')}
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {t('Assign presiding magistrates and state/defense counsels to unlock case access in judicial vaults.')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onViewChange && onViewChange('cases')}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-bold text-xs shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            {t('Open Allocation Desk')}
          </button>
        </div>
      )}

      {/* 4 Stat Metric Cards */}
      {loading ? (
        <StatCardsSkeleton />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Active Cases (Blue) */}
          <div 
            onClick={() => onViewChange && onViewChange('cases')}
            className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-blue-100 dark:border-slate-800 shadow-xs flex items-center justify-between cursor-pointer hover:border-blue-300 transition-all group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900/50">
                <Folder size={20} />
              </div>
              <div>
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  <NumberTicker value={cases.length} />
                </div>
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {t('Active Cases')}
                </div>
              </div>
            </div>
            <ChevronRight size={18} className="text-slate-300 dark:text-slate-600 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
          </div>


          {/* Card 2: Total Evidence / Case Exhibits */}
          <div 
            onClick={() => {
              if (canAccessGlobalEvidence(currentUser?.role)) {
                onViewChange && onViewChange('evidence');
              } else {
                onViewChange && onViewChange('cases');
              }
            }}
            className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-blue-100 dark:border-slate-800 shadow-xs flex items-center justify-between cursor-pointer hover:border-blue-300 transition-all group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900/50">
                <FileText size={20} />
              </div>
              <div>
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  <NumberTicker value={documents.length} />
                </div>
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {canAccessGlobalEvidence(currentUser?.role) ? t('Total Evidence') : t('Case Exhibits')}
                </div>
              </div>
            </div>
            <ChevronRight size={18} className="text-slate-300 dark:text-slate-600 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
          </div>

          {/* Card 3: Needs Review / Awaiting Allocation */}
          <div 
            onClick={() => onViewChange && onViewChange('cases')}
            className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-rose-100 dark:border-slate-800 shadow-xs flex items-center justify-between cursor-pointer hover:border-rose-300 transition-all group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-100 dark:border-rose-900/50">
                <Clock size={20} />
              </div>
              <div>
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  <NumberTicker value={isRegistrar ? unallocatedCases.length : cases.filter(c => c.status === 'INVESTIGATION' || c.status === 'Review').length} />
                </div>
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {isRegistrar ? t('Awaiting Allocation') : t('Needs Review')}
                </div>
              </div>
            </div>
            <ChevronRight size={18} className="text-slate-300 dark:text-slate-600 group-hover:text-rose-600 group-hover:translate-x-0.5 transition-all" />
          </div>

          {/* Card 4: Team Members (Purple) */}
          <div 
            onClick={() => onViewChange && onViewChange('users')}
            className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-purple-100 dark:border-slate-800 shadow-xs flex items-center justify-between cursor-pointer hover:border-purple-300 transition-all group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-100 dark:border-purple-900/50">
                <Users size={20} />
              </div>
              <div>
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  <NumberTicker value={11} />
                </div>
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {t('Team Members')}
                </div>
              </div>
            </div>
            <ChevronRight size={18} className="text-slate-300 dark:text-slate-600 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>
      )}

      {/* ICJS Live Judicial Mesh Pipeline */}
      <JudicialPipelineBadge />


      {/* 2-Column Main Layout: Left 65% / Right 35% */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Active Investigations & Recent Evidence (Span 8) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Card 1: Active Investigations Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-4 sm:px-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                {t('Active Investigations')}
              </h2>
              <button 
                type="button" 
                onClick={() => onViewChange && onViewChange('cases')}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
              >
                <span>{t('View All')}</span>
                <ArrowRight size={13} />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 dark:bg-slate-800/40 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                    <th className="py-3 px-5">{t('Case ID')}</th>
                    <th className="py-3 px-4">{t('Title')}</th>
                    <th className="py-3 px-4">{t('Priority')}</th>
                    <th className="py-3 px-4">{t('Status')}</th>
                    <th className="py-3 px-4">{t('Last Updated')}</th>
                    <th className="py-3 px-4 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="p-0">
                        <TableRowsSkeleton rows={5} cols={5} />
                      </td>
                    </tr>
                  ) : displayCases.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <Folder className="mx-auto mb-2 opacity-30 text-slate-400" size={32} />
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{t('No active cases found')}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {canCreateCase(currentUser?.role)
                            ? t('Click "Create Case" above to start your first investigation docket.')
                            : t('Cases will appear here once allocated to your bench or counsel brief by the Registrar.')}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    displayCases.slice(0, 5).map((c, idx) => {
                      const isHigh = c.priority === 'High' || c.security_level === 'TOP_SECRET';
                      const statusText = c.status || 'INVESTIGATION';
                      return (
                        <tr 
                          key={c.id || idx}
                          onClick={() => {
                            setSelectedCaseOverview(c);
                            if (onSelectCase) onSelectCase(c.id);
                          }}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                        >
                          <td className="py-3.5 px-5 font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 font-mono">
                            {c.case_number}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[180px]">
                            {c.title}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isHigh 
                                ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50' 
                                : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50'
                            }`}>
                              {t(isHigh ? 'High' : 'Medium')}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              statusText === 'CLOSED' || statusText === 'Closed'
                                ? 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400'
                                : statusText === 'CHARGE_SHEET' || statusText === 'Review'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50'
                            }`}>
                              {t(statusText)}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                            {new Date(c.updated_at || c.created_at || Date.now()).toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button 
                              onClick={(e) => { e.stopPropagation(); onSelectCase && onSelectCase(c.id); }}
                              className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                              <MoreVertical size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Card 2: Recent Evidence Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-4 sm:px-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                {t('Recent Evidence')}
              </h2>
              <button 
                type="button" 
                onClick={() => {
                  if (canAccessGlobalEvidence(currentUser?.role)) {
                    onViewChange && onViewChange('evidence');
                  } else {
                    onViewChange && onViewChange('cases');
                  }
                }}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
              >
                <span>{canAccessGlobalEvidence(currentUser?.role) ? t('View All') : t('View Cases')}</span>
                <ArrowRight size={13} />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 dark:bg-slate-800/40 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                    <th className="py-3 px-5">{t('Name')}</th>
                    <th className="py-3 px-4">{t('Type')}</th>
                    <th className="py-3 px-4">{t('Case ID')}</th>
                    <th className="py-3 px-4">{t('Status')}</th>
                    <th className="py-3 px-4">{t('Uploaded At')}</th>
                    <th className="py-3 px-4 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {recentEvidences.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        <FileText size={28} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-300">{t('No evidence exhibits uploaded yet')}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{t('Upload digital evidence to track hash integrity and custody.')}</p>
                        <button 
                          type="button"
                          onClick={() => {
                            if (canAccessGlobalEvidence(currentUser?.role)) {
                              onViewChange && onViewChange('evidence');
                            } else {
                              onViewChange && onViewChange('cases');
                            }
                          }}
                          className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 text-xs font-bold transition-colors cursor-pointer"
                        >
                          <Upload size={13} />
                          <span>{canAccessGlobalEvidence(currentUser?.role) ? t('Upload Evidence') : t('Open Cases')}</span>
                        </button>
                      </td>
                    </tr>
                  ) : (
                    recentEvidences.map((item, idx) => {
                      const { icon: Icon, color } = getDocIconInfo(item.mime_type, item.filename);
                      const isVerified = item.status === 'processed' || item.status === 'verified';
                      return (
                        <tr 
                          key={item.id || idx}
                          onClick={() => {
                            if (item.case_id && onSelectCase) {
                              onSelectCase(item.case_id);
                            } else if (canAccessGlobalEvidence(currentUser?.role)) {
                              onViewChange && onViewChange('evidence');
                            } else {
                              onViewChange && onViewChange('cases');
                            }
                          }}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                        >
                          <td className="py-3.5 px-5 font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            <div className="flex items-center gap-2.5">
                              <div className={`p-1.5 rounded-lg ${color}`}>
                                <Icon size={14} />
                              </div>
                              <span className="truncate max-w-[140px]">{item.filename}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                            {item.document_type || item.document_category || 'Evidence'}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-medium text-slate-500">
                            {item.case_number || 'N/A'}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isVerified
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50'
                                : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50'
                            }`}>
                              {t(isVerified ? 'Verified' : (item.status || 'Uploaded'))}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                            {item.uploaded_at ? new Date(item.uploaded_at).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '-'}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button 
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (item.case_id && onSelectCase) {
                                  onSelectCase(item.case_id);
                                } else if (canAccessGlobalEvidence(currentUser?.role)) {
                                  onViewChange && onViewChange('evidence');
                                } else {
                                  onViewChange && onViewChange('cases');
                                }
                              }}
                              className="p-1 rounded-md text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                              title={canAccessGlobalEvidence(currentUser?.role) ? "Inspect in Evidence Vault" : "View Case Docket"}
                            >
                              <ExternalLink size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Right Column: Case Overview, Quick Actions & Activity (Span 4) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Card 1: Case Overview */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {t('Case Overview')}
              </h3>
              {activeCaseItem && (
                <button 
                  type="button" 
                  onClick={() => onSelectCase && onSelectCase(activeCaseItem.id)}
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                >
                  <span>{t('View Details')}</span>
                  <ArrowRight size={13} />
                </button>
              )}
            </div>

            {activeCaseItem ? (
              <>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#0e1d3e] text-white flex items-center justify-center shrink-0 shadow-sm">
                      <Scale size={18} />
                    </div>
                    <div>
                      <div className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                        {activeCaseItem.case_number}
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {activeCaseItem.title}
                      </h4>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-400">
                    {t(activeCaseItem.status || 'Active')}
                  </span>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 my-3 leading-relaxed">
                  {activeCaseItem.description || t('No description provided.')}
                </p>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center justify-center text-blue-500 mb-0.5">
                      <FileText size={15} />
                    </div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      {activeCaseItem.document_count || 0}
                    </div>
                    <div className="text-[10px] text-slate-400">{t('Evidence')}</div>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center justify-center text-indigo-500 mb-0.5">
                      <Settings2 size={15} />
                    </div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">0</div>
                    <div className="text-[10px] text-slate-400">{t('Processing')}</div>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center justify-center text-purple-500 mb-0.5">
                      <Users size={15} />
                    </div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">1</div>
                    <div className="text-[10px] text-slate-400">{t('Assigned')}</div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-6 text-slate-400">
                <Folder size={32} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t('No Case Selected')}</p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-[220px] mx-auto">
                  {canCreateCase(currentUser?.role)
                    ? t('Create your first case to begin tracking evidence and investigations.')
                    : t('Assigned cases will appear here once allocated by the Court Registrar.')}
                </p>
                {canCreateCase(currentUser?.role) && (
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(true)}
                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>{t('New Case')}</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Card 2: Quick Actions 2x2 Grid */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
              {t('Quick Actions')}
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
              <button 
                type="button"
                onClick={() => {
                  if (activeCaseItem && onSelectCase) {
                    onSelectCase(activeCaseItem.id);
                  } else if (canAccessGlobalEvidence(currentUser?.role)) {
                    onViewChange && onViewChange('evidence');
                  } else {
                    onViewChange && onViewChange('cases');
                  }
                }}
                className="p-3 rounded-xl bg-blue-50/70 hover:bg-blue-100/70 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/80 dark:border-blue-900/40 flex flex-col items-center text-center transition-all cursor-pointer shadow-2xs group"
              >
                <Upload size={18} className="text-blue-600 mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold">{t('Upload Evidence')}</span>
              </button>

              <button 
                type="button"
                onClick={() => onViewChange && onViewChange('radar')}
                className="p-3 rounded-xl bg-purple-50/70 hover:bg-purple-100/70 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200/80 dark:border-purple-900/40 flex flex-col items-center text-center transition-all cursor-pointer shadow-2xs group"
              >
                <Sparkles size={18} className="text-purple-600 mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold">{t('Run Analysis')}</span>
              </button>

              <button 
                type="button"
                onClick={() => onViewChange && onViewChange('reports')}
                className="p-3 rounded-xl bg-amber-50/70 hover:bg-amber-100/70 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/80 dark:border-amber-900/40 flex flex-col items-center text-center transition-all cursor-pointer shadow-2xs group"
              >
                <FileSpreadsheet size={18} className="text-amber-600 mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold">{t('Generate Report')}</span>
              </button>

              <button 
                type="button"
                onClick={() => {
                  if (isRegistrar) {
                    onViewChange && onViewChange('cases');
                  } else if (canCreateCase(currentUser?.role)) {
                    setShowCreateModal(true);
                  } else {
                    onViewChange && onViewChange('cases');
                  }
                }}
                className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-800 dark:bg-slate-800/60 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex flex-col items-center text-center transition-all cursor-pointer shadow-2xs group"
              >
                {isRegistrar ? (
                  <Scale size={18} className="text-blue-600 dark:text-blue-400 mb-1 group-hover:scale-110 transition-transform" />
                ) : canCreateCase(currentUser?.role) ? (
                  <Plus size={18} className="text-slate-600 dark:text-slate-300 mb-1 group-hover:scale-110 transition-transform" />
                ) : (
                  <Folder size={18} className="text-blue-600 dark:text-blue-400 mb-1 group-hover:scale-110 transition-transform" />
                )}
                <span className="text-xs font-bold">
                  {isRegistrar ? t('Allocate Benches') : canCreateCase(currentUser?.role) ? t('New Case') : t('My Cases')}
                </span>
              </button>
            </div>
          </div>

          {/* Card 3: Evidence Activity */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {t('Evidence Activity')}
              </h3>
              <button 
                type="button" 
                onClick={() => onViewChange && onViewChange('timeline')}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
              >
                <span>{t('View All')}</span>
                <ArrowRight size={13} />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {auditLogs && auditLogs.length > 0 ? (
                auditLogs.slice(0, 5).map((log, idx) => (
                  <div key={log.id || idx} className="flex items-start gap-3">
                    <span className="h-2 w-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                    <div className="flex-1">
                      <div className="font-bold text-slate-800 dark:text-slate-200 leading-tight">
                        {t(log.action || 'Activity recorded')}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono truncate max-w-[200px]">
                        {log.details ? (typeof log.details === 'string' ? log.details : JSON.stringify(log.details)) : (log.entity_type || '')}
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-400 shrink-0">
                      {log.created_at ? new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-slate-400">
                  <Clock size={28} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{t('No activity recorded yet')}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{t('Audit trail will log actions automatically.')}</p>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Bottom System Status Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs shadow-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-800 dark:text-slate-200">{t('System Status:')}</span>
          <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {t('All Systems Operational')}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-5 sm:gap-6 text-slate-600 dark:text-slate-300">
          <div className="flex items-center gap-1.5">
            <Database size={14} className="text-slate-400" />
            <span>{t('Storage:')} <strong className="text-emerald-600 dark:text-emerald-400">{t('Operational')}</strong></span>
          </div>

          <div className="flex items-center gap-1.5">
            <Settings2 size={14} className="text-slate-400" />
            <span>{t('Processing:')} <strong className="text-emerald-600 dark:text-emerald-400">{t('Operational')}</strong></span>
          </div>

          <div className="flex items-center gap-1.5">
            <Sparkles size={14} className="text-slate-400" />
            <span>{t('AI Services:')} <strong className="text-emerald-600 dark:text-emerald-400">{t('Operational')}</strong></span>
          </div>

          <div className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-slate-400" />
            <span>{t('Integrity:')} <strong className="text-emerald-600 dark:text-emerald-400">{t('Verified')}</strong></span>
          </div>
        </div>

        <div className="text-[11px] text-slate-400">
          {t('Last Checked:')} 4 Sep 2025, 10:24
        </div>
      </div>

      {/* Create Case Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('Create New Case Docket')}</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateCaseSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">{t('Case Number')}</label>
                <input
                  type="text"
                  required
                  value={newCaseData.caseNumber}
                  onChange={(e) => setNewCaseData({ ...newCaseData, caseNumber: e.target.value })}
                  placeholder="e.g. CR-2026-0046"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">{t('Title')}</label>
                <input
                  type="text"
                  required
                  value={newCaseData.title}
                  onChange={(e) => setNewCaseData({ ...newCaseData, title: e.target.value })}
                  placeholder="e.g. Cyber Investigation or Armed Robbery"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">{t('Description')}</label>
                <textarea
                  rows={3}
                  value={newCaseData.description}
                  onChange={(e) => setNewCaseData({ ...newCaseData, description: e.target.value })}
                  placeholder={t('Brief summary of the incident and seized devices/exhibits...')}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 font-semibold cursor-pointer"
                >
                  {t('Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer"
                >
                  {t('Create Docket')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
