import { useState, useMemo, useEffect } from 'react';
import { 
  Download, 
  ShieldCheck, 
  ShieldAlert, 
  FileText, 
  Loader2, 
  Copy, 
  Check, 
  X, 
  Maximize2, 
  ChevronDown, 
  FileSignature, 
  Search, 
  Filter, 
  Folder, 
  FolderOpen, 
  Eye, 
  Sparkles, 
  Clock, 
  User, 
  Hash, 
  CheckCircle2, 
  AlertCircle,
  FileCode,
  FileSpreadsheet,
  FileCheck,
  Columns,
  Flame,
  RotateCcw,
  AlertTriangle
} from 'lucide-react';
import jsPDF from 'jspdf';
import { verifyDocument, getDownloadUrl, simulateTamper, restoreTamper } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import RedactionModal from './RedactionModal';
import DocumentPreviewer from './DocumentPreviewer';

const FOLDER_CONFIG = {
  INVESTIGATION: { 
    label: 'Investigation Division (IO/SHO)', 
    shortLabel: 'Investigation',
    icon: '🔍', 
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800/60'
  },
  JUDICIAL: { 
    label: 'Judicial Records (Hon\'ble Magistrate)', 
    shortLabel: 'Judicial',
    icon: '⚖️', 
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60'
  },
  PROSECUTION: { 
    label: 'Prosecution Exhibits (State Counsel)', 
    shortLabel: 'Prosecution',
    icon: '🛡️', 
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60'
  },
  DEFENSE: { 
    label: 'Defense Discovery (Counsel for Defense)', 
    shortLabel: 'Defense',
    icon: '⚔️', 
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/60'
  },
  REGISTRAR: { 
    label: 'Registrar Vault (Court Certified Filings)', 
    shortLabel: 'Registrar',
    icon: '📝', 
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800/60'
  },
  GENERAL: { 
    label: 'General Case Attachments', 
    shortLabel: 'General',
    icon: '📁', 
    badgeClass: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700'
  }
};

export default function DocumentTable({ documents = [], onRefresh }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [verifying, setVerifying] = useState({});
  const [verifyResult, setVerifyResult] = useState({});
  const [copiedHash, setCopiedHash] = useState(null);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [viewerTab, setViewerTab] = useState('entities'); // default to 'entities' (Forensic Intelligence)
  const [inspectorMode, setInspectorMode] = useState('split'); // 'split', 'preview', 'transcript'
  const [loadingDoc, setLoadingDoc] = useState(null);
  const [redactingDoc, setRedactingDoc] = useState(null);
  const [tamperActionLoading, setTamperActionLoading] = useState(false);
  const [verifyActionLoading, setVerifyActionLoading] = useState(false);
  const [tamperState, setTamperState] = useState(null); // { isTampered: boolean, message: string }
  const [liveCheckResult, setLiveCheckResult] = useState(null);

  // Close modal on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedDoc(null);
      }
    };
    if (selectedDoc) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [selectedDoc]);

  const [expandedFolders, setExpandedFolders] = useState({
    INVESTIGATION: true, 
    JUDICIAL: true, 
    PROSECUTION: true, 
    DEFENSE: true, 
    REGISTRAR: true, 
    GENERAL: true
  });

  // Filter documents by search and category
  const filteredDocs = useMemo(() => {
    return documents.filter(doc => {
      const matchesSearch = 
        !searchQuery ||
        doc.filename?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.document_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.uploaded_by_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.uploaded_by_badge?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.sha256_hash?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCat = selectedCategory === 'ALL' || (doc.document_category || 'GENERAL') === selectedCategory;

      return matchesSearch && matchesCat;
    });
  }, [documents, searchQuery, selectedCategory]);

  // Group filtered documents
  const groupedDocs = useMemo(() => {
    const groups = {};
    for (const doc of filteredDocs) {
      const cat = doc.document_category || 'GENERAL';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(doc);
    }
    return groups;
  }, [filteredDocs]);

  const toggleFolder = (cat) => {
    setExpandedFolders(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const openDocumentViewer = async (doc) => {
    setLoadingDoc(doc.id);
    try {
      const res = await fetch(`/api/documents/${doc.id}`, { 
        headers: { 
          'x-user-id': localStorage.getItem('sih_active_user'),
          'Authorization': `Bearer ${localStorage.getItem('sih_token')}`
        }
      });
      const fullDoc = await res.json();
      setSelectedDoc(fullDoc.document);
      setTamperState(null);
      setLiveCheckResult(verifyResult[doc.id] || null);
      setViewerTab('entities'); // Default to Forensic Intelligence on inspector open
    } catch (err) {
      console.error("Failed to load viewer:", err);
      alert("Error loading document.");
    } finally {
      setLoadingDoc(null);
    }
  };

  const handleVerify = async (docId) => {
    setVerifying(prev => ({ ...prev, [docId]: true }));
    try {
      const res = await verifyDocument(docId);
      setVerifyResult(prev => ({ ...prev, [docId]: res.verification }));
      setLiveCheckResult(res.verification);
    } catch (err) {
      alert('Verification failed: ' + err.message);
    } finally {
      setVerifying(prev => ({ ...prev, [docId]: false }));
      if (onRefresh) onRefresh();
    }
  };

  const handleSimulateTamper = async (docId) => {
    setTamperActionLoading(true);
    try {
      const res = await simulateTamper(docId);
      setTamperState({ isTampered: true, message: res.message });
      // Re-run verify to compute live mutated hash
      const vRes = await verifyDocument(docId);
      setVerifyResult(prev => ({ ...prev, [docId]: vRes.verification }));
      setLiveCheckResult(vRes.verification);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert('Tamper Simulation Error: ' + err.message);
    } finally {
      setTamperActionLoading(false);
    }
  };

  const handleRestoreTamper = async (docId) => {
    setTamperActionLoading(true);
    try {
      const res = await restoreTamper(docId);
      setTamperState({ isTampered: false, message: res.message });
      // Re-run verify to show it is now authentic
      const vRes = await verifyDocument(docId);
      setVerifyResult(prev => ({ ...prev, [docId]: vRes.verification }));
      setLiveCheckResult(vRes.verification);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert('Restore Error: ' + err.message);
    } finally {
      setTamperActionLoading(false);
    }
  };

  const handleRunInspectorVerify = async (docId) => {
    setVerifyActionLoading(true);
    try {
      const res = await verifyDocument(docId);
      setVerifyResult(prev => ({ ...prev, [docId]: res.verification }));
      setLiveCheckResult(res.verification);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert('Verification Error: ' + err.message);
    } finally {
      setVerifyActionLoading(false);
    }
  };

  const handleGenerateBSA = (doc) => {
    const docDate = new Date(doc.uploaded_at).toLocaleString('en-IN');
    
    const docPdf = new jsPDF();
    docPdf.setFont('helvetica', 'bold');
    docPdf.setFontSize(16);
    docPdf.text('CERTIFICATE UNDER SECTION 63', 105, 20, { align: 'center' });
    docPdf.setFontSize(12);
    docPdf.text('OF THE BHARATIYA SAKSHYA ADHINIYAM, 2023', 105, 28, { align: 'center' });
    
    docPdf.setFont('helvetica', 'normal');
    docPdf.setFontSize(10);
    docPdf.text('This is to certify that the digital evidence detailed below has been produced by a computer', 20, 45);
    docPdf.text('during the period over which the computer was used regularly to store or process information', 20, 52);
    docPdf.text('for the purposes of any activities regularly carried on by the designated authority.', 20, 59);

    docPdf.setFont('helvetica', 'bold');
    docPdf.text('EVIDENCE DETAILS:', 20, 75);
    
    docPdf.setFont('helvetica', 'normal');
    const details = [
      `Case Number: ${doc.case_number || 'N/A'}`,
      `Document Name: ${doc.filename}`,
      `Document ID: ${doc.id}`,
      `File Size: ${(doc.file_size / 1024).toFixed(2)} KB`,
      `MIME Type: ${doc.mime_type}`,
      `Upload Timestamp: ${docDate}`
    ];
    
    details.forEach((line, i) => docPdf.text(line, 25, 85 + (i * 7)));

    docPdf.setFont('helvetica', 'bold');
    docPdf.text('CRYPTOGRAPHIC CHAIN OF CUSTODY:', 20, 135);
    docPdf.setFont('helvetica', 'normal');
    docPdf.text(`SHA-256 Hash Algorithm Applied at Source`, 25, 145);
    
    const hash = doc.sha256_hash || 'N/A';
    docPdf.setFont('courier', 'normal');
    docPdf.text(`${hash.substring(0, 32)}`, 25, 155);
    docPdf.text(`${hash.substring(32)}`, 25, 162);
    
    docPdf.setFont('helvetica', 'normal');
    docPdf.text('DECLARATION:', 20, 185);
    docPdf.text('I hereby declare that to the best of my knowledge and belief, the computer output was', 20, 195);
    docPdf.text('produced during the regular course of activities, and the computer was operating properly', 20, 202);
    docPdf.text('so as not to affect the accuracy of the electronic record.', 20, 209);
    
    docPdf.setFont('helvetica', 'bold');
    docPdf.text('AUTHORIZED SIGNATORY:', 20, 240);
    docPdf.setFont('helvetica', 'normal');
    docPdf.text(`Name: ${doc.uploaded_by_name || 'Authorized Officer'}`, 20, 250);
    docPdf.text(`Badge / ID: ${doc.uploaded_by_badge || 'N/A'}`, 20, 257);
    docPdf.text(`Department: ${doc.uploaded_by_department || 'Law Enforcement Agency'}`, 20, 264);
    
    docPdf.text('_____________________________', 140, 257);
    docPdf.text('(Signature / Digital Seal)', 145, 264);

    docPdf.save(`Sec_63_BSA_${doc.filename}.pdf`);
  };

  const userRole = localStorage.getItem('sih_active_role');
  const isPolice = userRole === 'INVESTIGATING_OFFICER' || localStorage.getItem('sih_active_user')?.includes('pol');
  const isTamperDetected = Boolean((liveCheckResult && !liveCheckResult.isTamperFree) || tamperState?.isTampered);

  return (
    <div className="space-y-4">
      {/* Shadcn-Style Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search evidence by name, type, badge, or SHA-256..."
            className="w-full pl-10 pr-4 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all ${
              selectedCategory === 'ALL'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            All ({documents.length})
          </button>
          {Object.entries(FOLDER_CONFIG).map(([key, config]) => {
            if (isPolice && key !== 'INVESTIGATION') return null;
            const count = documents.filter(d => (d.document_category || 'GENERAL') === key).length;
            const isActive = selectedCategory === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedCategory(key)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>{config.icon}</span>
                <span>{config.shortLabel}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-blue-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Accordion Folders */}
      {Object.entries(FOLDER_CONFIG).map(([category, config]) => {
        const docs = groupedDocs[category] || [];
        
        if (isPolice && category !== 'INVESTIGATION') {
          return null;
        }

        // If category is selected and doesn't match, skip
        if (selectedCategory !== 'ALL' && selectedCategory !== category) {
          return null;
        }

        const expanded = expandedFolders[category];
        
        return (
          <div key={category} className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-xs transition-all">
            {/* Folder Header */}
            <button
              type="button"
              onClick={() => toggleFolder(category)}
              className="w-full flex items-center justify-between px-5 py-3.5 bg-slate-50/80 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border-b border-slate-200/80 dark:border-slate-800"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{config.icon}</span>
                <div className="text-left">
                  <div className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <span>{config.label}</span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${config.badgeClass}`}>
                      {docs.length} {docs.length === 1 ? 'record' : 'records'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <span className="text-xs hidden sm:inline text-slate-400">
                  {expanded ? 'Collapse' : 'Expand'}
                </span>
                <ChevronDown className={`transition-transform duration-200 ${expanded ? '' : '-rotate-90'}`} size={18} />
              </div>
            </button>
            
            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[920px]">
                      <thead>
                        <tr className="bg-slate-50/50 dark:bg-slate-900/40 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                          <th className="py-3 px-5">Evidence Item</th>
                          <th className="py-3 px-4">Classification</th>
                          <th className="py-3 px-4">Payload Size</th>
                          <th className="py-3 px-4">Cryptographic Integrity</th>
                          <th className="py-3 px-5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
                        {docs.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="p-8 text-center text-slate-400 italic text-xs">
                              No evidence documents cataloged in this repository.
                            </td>
                          </tr>
                        ) : docs.map(doc => {
                          const isVerifying = verifying[doc.id];
                          const result = verifyResult[doc.id];
                          const isCopied = copiedHash === doc.sha256_hash;
                          
                          return (
                            <tr 
                              key={doc.id} 
                              onClick={() => openDocumentViewer(doc)}
                              className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group cursor-pointer"
                            >
                              {/* Document Name & Officer metadata */}
                              <td className="py-4 px-5">
                                <div className="flex items-start gap-3">
                                  <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900/40">
                                    <FileText size={18} />
                                  </div>
                                  <div>
                                    <span 
                                      onClick={() => openDocumentViewer(doc)}
                                      className="font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors block"
                                    >
                                      {doc.filename}
                                    </span>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                                      <User size={11} className="text-slate-400" />
                                      <span>{doc.uploaded_by_name || 'System Officer'}</span>
                                      <span className="text-slate-300 dark:text-slate-600">•</span>
                                      <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-1 py-0.2 rounded text-slate-600 dark:text-slate-300">
                                        {doc.uploaded_by_badge || 'POL-1'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* Classification & Processing Status */}
                              <td className="py-4 px-4">
                                <div className="flex flex-col gap-1.5 items-start">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                      {doc.document_type || 'GENERAL_RECORD'}
                                    </span>
                                    {doc.is_redacted && (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800">
                                        Redacted Copy
                                      </span>
                                    )}
                                  </div>
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    doc.status === 'processed' || doc.status === 'VERIFIED_AUTHENTIC'
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                                      : doc.status === 'processing'
                                      ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800'
                                      : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800'
                                  }`}>
                                    <span className={`h-1.5 w-1.5 rounded-full ${
                                      doc.status === 'processed' || doc.status === 'VERIFIED_AUTHENTIC' ? 'bg-emerald-500' : doc.status === 'processing' ? 'bg-blue-500' : 'bg-rose-500'
                                    }`} />
                                    {doc.status === 'processed' || doc.status === 'VERIFIED_AUTHENTIC' ? 'Verified Authentic' : doc.status === 'processing' ? 'Processing' : doc.status}
                                  </span>
                                </div>
                              </td>

                              {/* File Size */}
                              <td className="py-4 px-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
                                {(doc.file_size / 1024).toFixed(1)} KB
                              </td>

                              {/* SHA-256 Hash & On-Chain Integrity */}
                              <td className="py-4 px-4">
                                <div className="flex flex-col gap-1.5">
                                  <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 font-mono text-[11px] w-max">
                                    <Hash size={11} className="text-slate-400" />
                                    <span className="w-24 truncate text-slate-700 dark:text-slate-300" title={doc.sha256_hash}>
                                      {doc.sha256_hash}
                                    </span>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); handleCopy(doc.sha256_hash); }} 
                                      className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-0.5" 
                                      title="Copy full SHA-256 hash"
                                    >
                                      {isCopied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                                    </button>
                                  </div>

                                  {result ? (
                                    <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                                      result.status === 'VERIFIED_AUTHENTIC' 
                                        ? 'text-emerald-600 dark:text-emerald-400' 
                                        : 'text-rose-600 dark:text-rose-400'
                                    }`}>
                                      {result.status === 'VERIFIED_AUTHENTIC' ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
                                      <span>{result.status}</span>
                                    </span>
                                  ) : (
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); handleVerify(doc.id); }}
                                      disabled={isVerifying}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors w-max disabled:opacity-50"
                                    >
                                      {isVerifying ? <Loader2 size={11} className="animate-spin" /> : <ShieldCheck size={11} />}
                                      <span>Verify SHA-256</span>
                                    </button>
                                  )}
                                </div>
                              </td>

                              {/* Action Buttons */}
                              <td className="py-4 px-5 text-right space-x-1.5 whitespace-nowrap">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleGenerateBSA(doc); }}
                                  title="Download BSA 2023 Sec 63 admissibility certificate"
                                  className="px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors inline-flex items-center gap-1 shadow-xs"
                                >
                                  <FileSignature size={13} />
                                  <span>Sec 63 Cert</span>
                                </button>
                                
                                <button 
                                  onClick={(e) => { e.stopPropagation(); openDocumentViewer(doc); }}
                                  disabled={loadingDoc === doc.id}
                                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white transition-all inline-flex items-center gap-1 shadow-xs disabled:opacity-50 cursor-pointer"
                                >
                                  {loadingDoc === doc.id ? (
                                    <Loader2 size={13} className="animate-spin" />
                                  ) : (
                                    <Eye size={13} />
                                  )}
                                  <span>Inspect & Intel</span>
                                </button>

                                {!doc.is_redacted && (
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); setRedactingDoc(doc); }}
                                    title="Redact sensitive PII"
                                    className="px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors inline-flex items-center gap-1 shadow-xs"
                                  >
                                    <ShieldAlert size={13} />
                                    <span>Redact</span>
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      {/* Modern High-Precision Document Inspector Modal */}
      <AnimatePresence>
        {selectedDoc && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[100] p-3 sm:p-6"
          >
            <motion.div 
              initial={{ scale: 0.96, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 10 }}
              className="bg-white dark:bg-slate-900 w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800"
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/20">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{selectedDoc.filename}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-semibold font-mono">
                        {selectedDoc.document_type || 'EVIDENCE'}
                      </span>
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>Case ID: #{selectedDoc.case_id}</span>
                      <span>•</span>
                      <span>SHA-256: {selectedDoc.sha256_hash?.substring(0, 16)}...</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* View Mode Segmented Controls */}
                  <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs mr-1">
                    <button
                      onClick={() => setInspectorMode('split')}
                      className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                        inspectorMode === 'split'
                          ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                      title="View Original Exhibit and OCR/Intel side by side"
                    >
                      <Columns size={13} />
                      <span className="hidden md:inline">Split View</span>
                    </button>
                    <button
                      onClick={() => setInspectorMode('preview')}
                      className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                        inspectorMode === 'preview'
                          ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                      title="Full-width Original Exhibit Preview"
                    >
                      <Eye size={13} />
                      <span className="hidden md:inline">Exhibit Preview</span>
                    </button>
                    <button
                      onClick={() => setInspectorMode('transcript')}
                      className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                        inspectorMode === 'transcript'
                          ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                      title="Full-width OCR Transcript & Forensic Entities"
                    >
                      <FileCode size={13} />
                      <span className="hidden md:inline">OCR & Intel</span>
                    </button>
                  </div>

                  <button 
                    onClick={() => handleGenerateBSA(selectedDoc)}
                    className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <FileSignature size={14} />
                    <span>Download Sec 63 BSA</span>
                  </button>
                  {!selectedDoc.is_redacted && (
                    <button 
                      onClick={() => setRedactingDoc(selectedDoc)}
                      className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                      title="Redact sensitive PII and generate electronic copy"
                    >
                      <ShieldAlert size={14} />
                      <span>Redact PII</span>
                    </button>
                  )}
                  <button 
                    onClick={() => setSelectedDoc(null)} 
                    className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-500 dark:text-slate-400"
                    title="Close Inspector (Esc)"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              
              {/* Modal Body: Multi-Mode Evidence Inspector */}
              <div className="flex-1 overflow-hidden h-full flex flex-col">
                {/* Mode 1: Exhibit Preview Only (Full Width) */}
                {inspectorMode === 'preview' && (
                  <div className="flex-1 overflow-hidden h-full">
                    <DocumentPreviewer 
                      documentId={selectedDoc.id} 
                      filename={selectedDoc.filename} 
                      documentType={selectedDoc.document_type} 
                      document={selectedDoc}
                    />
                  </div>
                )}

                {/* Mode 2: Split View (Exhibit on Left, OCR & Entities on Right) */}
                {inspectorMode === 'split' && (
                  <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden h-full">
                    {/* Left 6 Cols: Exhibit Media Preview */}
                    <div className="lg:col-span-6 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 flex flex-col h-full overflow-hidden">
                      <DocumentPreviewer 
                        documentId={selectedDoc.id} 
                        filename={selectedDoc.filename} 
                        documentType={selectedDoc.document_type} 
                        document={selectedDoc}
                      />
                    </div>

                    {/* Right 6 Cols: OCR Transcript & Forensic Entities & Tamper Detection */}
                    <div className="lg:col-span-6 flex flex-col h-full overflow-y-auto bg-white dark:bg-slate-900">
                      <div className="flex items-center justify-between px-5 py-2.5 bg-slate-100/70 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold">
                        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
                          <button
                            type="button"
                            onClick={() => setViewerTab('transcript')}
                            className={`px-3 py-1 rounded-lg transition-colors cursor-pointer text-xs font-semibold shrink-0 ${
                              viewerTab === 'transcript'
                                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-2xs font-bold'
                                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                          >
                            OCR Transcript
                          </button>
                          <button
                            type="button"
                            onClick={() => setViewerTab('entities')}
                            className={`px-3 py-1 rounded-lg transition-colors cursor-pointer text-xs font-semibold shrink-0 ${
                              viewerTab === 'entities'
                                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-2xs font-bold'
                                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                          >
                            Forensic Intelligence
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setViewerTab('tamper');
                              if (!liveCheckResult && selectedDoc) {
                                handleRunInspectorVerify(selectedDoc.id);
                              }
                            }}
                            className={`px-3 py-1 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer text-xs font-semibold shrink-0 ${
                              viewerTab === 'tamper'
                                ? (isTamperDetected
                                    ? 'bg-rose-600 text-white shadow-xs font-bold'
                                    : 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-2xs font-bold')
                                : (isTamperDetected
                                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 font-bold border border-rose-300 dark:border-rose-800'
                                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200')
                            }`}
                          >
                            {isTamperDetected ? (
                              <ShieldAlert size={13} className="text-rose-500" />
                            ) : (
                              <ShieldCheck size={13} className="text-emerald-500" />
                            )}
                            <span>Tamper Detection</span>
                            {isTamperDetected && (
                              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block" />
                            )}
                          </button>
                        </div>
                        {viewerTab === 'transcript' && (
                          <button 
                            onClick={() => handleCopy(selectedDoc.extracted_text || '')}
                            className="hover:text-blue-600 transition-colors flex items-center gap-1 text-slate-500 dark:text-slate-400 text-xs shrink-0 ml-2 cursor-pointer"
                          >
                            <Copy size={12} />
                            <span>Copy Text</span>
                          </button>
                        )}
                      </div>

                      <div className="flex-1 p-6 overflow-y-auto space-y-6">
                        {viewerTab === 'transcript' ? (
                          selectedDoc.extracted_text ? (
                            <div className="max-w-xl mx-auto bg-slate-50/50 dark:bg-slate-950/50 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                              <div className="text-center pb-3 mb-3 border-b border-slate-200 dark:border-slate-800">
                                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-0.5">
                                  Official Digital Evidence Transcript
                                </span>
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                  {selectedDoc.filename.replace(/\.[^/.]+$/, '').replace(/_/g, ' ')}
                                </h4>
                              </div>

                              <div className="font-mono text-xs leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-words">
                                {selectedDoc.extracted_text}
                              </div>

                              <div className="mt-6 pt-3 border-t border-dashed border-slate-200 dark:border-slate-800 text-center text-[10px] text-slate-400 uppercase tracking-wider">
                                Cryptographically Indexed • NyayVault SIH 26190
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center">
                              <FileText size={42} className="mb-3 opacity-30 text-blue-500" />
                              <p className="text-sm font-bold text-slate-600 dark:text-slate-300">No Raw Text Extracted</p>
                              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                                Binary payload is pending OCR processing or contains non-textual evidence.
                              </p>
                            </div>
                          )
                        ) : viewerTab === 'tamper' ? (
                          <div className="space-y-6">
                            {/* Live Verification Status Card */}
                            <div className={`p-5 rounded-2xl border transition-all ${
                              isTamperDetected 
                                ? 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 shadow-xs'
                                : liveCheckResult 
                                  ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 shadow-xs'
                                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                            }`}>
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-2.5">
                                  {isTamperDetected ? (
                                    <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                                      <ShieldAlert size={24} className="animate-bounce" />
                                    </div>
                                  ) : liveCheckResult ? (
                                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                                      <ShieldCheck size={24} />
                                    </div>
                                  ) : (
                                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                                      <ShieldCheck size={24} />
                                    </div>
                                  )}
                                  <div>
                                    <h4 className="text-sm font-bold tracking-tight">
                                      {isTamperDetected 
                                        ? '🚨 TAMPER DETECTED: Storage Bytes Mismatched!'
                                        : liveCheckResult 
                                          ? 'VERIFIED AUTHENTIC: Cryptographic Checksum Confirmed'
                                          : 'Evidence Integrity Audit Ready'}
                                    </h4>
                                    <p className="text-xs opacity-80 mt-0.5">
                                      {isTamperDetected 
                                        ? 'Storage byte stream does NOT match the registered blockchain SHA-256 fingerprint.'
                                        : liveCheckResult 
                                          ? 'Raw storage bytes match the ingest SHA-256 hash with zero unauthorized modifications.'
                                          : 'Run real-time SHA-256 cryptographic audit against AWS S3 / MinIO storage.'}
                                    </p>
                                  </div>
                                </div>

                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 ${
                                  isTamperDetected 
                                    ? 'bg-rose-600 text-white animate-pulse'
                                    : liveCheckResult 
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                                }`}>
                                  {isTamperDetected ? 'TAMPERED' : liveCheckResult ? 'AUTHENTIC' : 'UNVERIFIED'}
                                </span>
                              </div>

                              {/* Live Hash Badges */}
                              <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 grid grid-cols-1 gap-2 font-mono text-[11px]">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-2 rounded-lg bg-white/70 dark:bg-slate-900/70 border border-slate-200/50 dark:border-slate-800">
                                  <span className="text-[10px] font-sans font-bold uppercase tracking-wider opacity-70">Ingest Genesis Hash:</span>
                                  <span className="truncate max-w-xs">{selectedDoc.sha256_hash}</span>
                                </div>
                                {liveCheckResult && (
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-2 rounded-lg bg-white/70 dark:bg-slate-900/70 border border-slate-200/50 dark:border-slate-800">
                                    <span className="text-[10px] font-sans font-bold uppercase tracking-wider opacity-70">Live Storage Hash:</span>
                                    <span className={`truncate max-w-xs font-bold ${isTamperDetected ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                      {liveCheckResult.computedHash}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Live Presentation Demo Controls */}
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
                              <div>
                                <h5 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                                  Interactive Tamper Simulation (Hackathon Demo)
                                </h5>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                  Demonstrate real-time cryptographic detection by modifying 1 byte in object storage.
                                </p>
                              </div>

                                <div className="flex flex-wrap items-center gap-2 pt-1">
                                {!isTamperDetected ? (
                                  <button
                                    type="button"
                                    onClick={() => handleSimulateTamper(selectedDoc.id)}
                                    disabled={tamperActionLoading || verifyActionLoading}
                                    className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                                  >
                                    {tamperActionLoading ? <Loader2 size={14} className="animate-spin" /> : <Flame size={14} />}
                                    <span>Simulate Tamper (1-Byte Mutation)</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleRestoreTamper(selectedDoc.id)}
                                    disabled={tamperActionLoading || verifyActionLoading}
                                    className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-emerald-500/60 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                                  >
                                    {tamperActionLoading ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                                    <span>Restore Authentic Exhibit</span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => handleRunInspectorVerify(selectedDoc.id)}
                                  disabled={tamperActionLoading || verifyActionLoading}
                                  className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                                >
                                  {verifyActionLoading ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                                  <span>Verify Live SHA-256</span>
                                </button>
                              </div>
                            </div>

                            {/* BSA 2023 Section 63 Legal Compliance */}
                            <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-blue-900 dark:text-blue-200 text-xs font-bold uppercase tracking-wider">
                                  <FileSignature size={16} className="text-blue-600 dark:text-blue-400" />
                                  <span>BSA 2023 Section 63 Admissibility Verdict</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleGenerateBSA(selectedDoc)}
                                  className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                >
                                  <Download size={12} />
                                  <span>Download Cert PDF</span>
                                </button>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-blue-100 dark:border-blue-900/40">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Admissibility Status</span>
                                  <span className={`font-bold mt-0.5 block ${isTamperDetected ? 'text-rose-600' : 'text-emerald-600'}`}>
                                    {isTamperDetected ? 'INADMISSIBLE (Hash Mismatch)' : 'PRIMARY ELECTRONIC RECORD (Admissible)'}
                                  </span>
                                </div>
                                <div className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-blue-100 dark:border-blue-900/40">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Authorized Signatory</span>
                                  <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block truncate">
                                    {selectedDoc.uploaded_by_name || 'Designated Officer'} ({selectedDoc.uploaded_by_badge || 'POL-1'})
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-6">
                            {/* AI Classification */}
                            <div>
                              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                <Sparkles size={13} className="text-blue-600" />
                                AI Forensic Classification
                              </h3>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase">Document Class</span>
                                  <div className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-0.5 truncate">
                                    {selectedDoc.document_type || 'Unknown'}
                                  </div>
                                </div>
                                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase">Model Confidence</span>
                                  <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                                    {((selectedDoc.classification_confidence || 0.94) * 100).toFixed(1)}%
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Named Entities */}
                            <div>
                              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                <FileCheck size={13} className="text-blue-600" />
                                Extracted Named Entities
                              </h3>
                              {selectedDoc.metadata && Object.keys(selectedDoc.metadata).length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                  {Object.entries(selectedDoc.metadata).map(([k, v]) => (
                                    <div key={k} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700">
                                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">
                                        {k.replace(/_/g, ' ')}
                                      </span>
                                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block break-words">
                                        {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-xs text-slate-400 italic">
                                  No custom metadata entities mapped yet.
                                </div>
                              )}
                            </div>

                            {/* Chain of Custody Stamp */}
                            <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/50 space-y-2">
                              <div className="flex items-center gap-2 text-xs font-bold text-blue-900 dark:text-blue-300">
                                <CheckCircle2 size={15} className="text-blue-600" />
                                <span>Tamper-Proof Ingestion Stamp</span>
                              </div>
                              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-mono">
                                Timestamp: {new Date(selectedDoc.uploaded_at).toISOString()}
                              </p>
                              <p className="text-[10px] text-slate-500 font-mono break-all">
                                SHA-256: {selectedDoc.sha256_hash}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Mode 3: Transcript & Intelligence Only (Full Width) */}
                {inspectorMode === 'transcript' && (
                  <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden h-full">
                    {/* Left Side: Document Transcript Viewer (Span 7) */}
                    <div className="lg:col-span-7 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 flex flex-col h-full bg-slate-50/50 dark:bg-slate-950">
                      <div className="flex items-center justify-between px-5 py-2.5 bg-slate-100/70 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 font-medium">
                        <span className="flex items-center gap-1.5">
                          <FileCode size={14} className="text-blue-500" />
                          OCR Digital Transcript
                        </span>
                        <button 
                          onClick={() => handleCopy(selectedDoc.extracted_text || '')}
                          className="hover:text-blue-600 transition-colors flex items-center gap-1"
                        >
                          <Copy size={12} />
                          <span>Copy Text</span>
                        </button>
                      </div>

                      <div className="flex-1 overflow-y-auto p-6">
                        {selectedDoc.extracted_text ? (
                          <div className="max-w-xl mx-auto bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                            <div className="text-center pb-4 mb-4 border-b border-slate-200 dark:border-slate-700">
                              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1">
                                Official Digital Evidence Transcript
                              </span>
                              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                {selectedDoc.filename.replace(/\.[^/.]+$/, '').replace(/_/g, ' ')}
                              </h3>
                            </div>

                            <div className="font-mono text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-words">
                              {selectedDoc.extracted_text}
                            </div>

                            <div className="mt-8 pt-3 border-t border-dashed border-slate-200 dark:border-slate-700 text-center text-[10px] text-slate-400 uppercase tracking-wider">
                              Cryptographically Indexed • NyayVault SIH 26190
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center">
                            <FileText size={42} className="mb-3 opacity-30 text-blue-500" />
                            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">No Raw Text Extracted</p>
                            <p className="text-xs text-slate-400 mt-1 max-w-xs">
                              This binary evidence payload may be an audio/video recording or awaiting deep OCR queue.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Side: AI Intelligence & Forensic Metadata (Span 5) */}
                    <div className="lg:col-span-5 p-6 overflow-y-auto flex flex-col h-full bg-white dark:bg-slate-900 space-y-6">
                      {/* AI Classification Card */}
                      <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                          <Sparkles size={13} className="text-blue-600" />
                          AI Forensic Classification
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Document Class</span>
                            <div className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-0.5 truncate">
                              {selectedDoc.document_type || 'Unknown'}
                            </div>
                          </div>
                          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Model Confidence</span>
                            <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                              {((selectedDoc.classification_confidence || 0.94) * 100).toFixed(1)}%
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Structured Forensic Entities */}
                      <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                          <FileCheck size={13} className="text-blue-600" />
                          Extracted Named Entities
                        </h3>
                        {selectedDoc.metadata && Object.keys(selectedDoc.metadata).length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {Object.entries(selectedDoc.metadata).map(([k, v]) => (
                              <div key={k} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">
                                  {k.replace(/_/g, ' ')}
                                </span>
                                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block break-words">
                                  {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-xs text-slate-400 italic">
                            No custom metadata entities mapped yet.
                          </div>
                        )}
                      </div>

                      {/* Chain of Custody Stamp */}
                      <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/50 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-blue-900 dark:text-blue-300">
                          <CheckCircle2 size={15} className="text-blue-600" />
                          <span>Tamper-Proof Ingestion Stamp</span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-mono">
                          Timestamp: {new Date(selectedDoc.uploaded_at).toISOString()}
                        </p>
                        <p className="text-[10px] text-slate-500 font-mono break-all">
                          SHA-256: {selectedDoc.sha256_hash}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Redaction Modal */}
      <AnimatePresence>
        {redactingDoc && (
          <RedactionModal 
            doc={redactingDoc} 
            onClose={() => setRedactingDoc(null)} 
            onComplete={() => {
              setRedactingDoc(null);
              if (onRefresh) onRefresh();
            }} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
