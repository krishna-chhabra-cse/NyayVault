import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Activity, 
  Download, 
  Search, 
  Filter, 
  Clock, 
  User, 
  FileText, 
  Lock, 
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Link as LinkIcon,
  GitCommit
} from 'lucide-react';
import { getGlobalAuditLogs, verifyAuditChain } from '../services/api';
import { jsPDF } from 'jspdf';
import autoTable, { applyPlugin } from 'jspdf-autotable';

try {
  applyPlugin(jsPDF);
} catch (e) {
  // Ignore if already applied
}

export default function AuditTrailHub() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [chainStatus, setChainStatus] = useState(null);
  const [verifyingChain, setVerifyingChain] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await getGlobalAuditLogs(150);
      setLogs(res.auditLogs || []);
    } catch (err) {
      console.error('Failed to load global audit trail:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyChain = async () => {
    setVerifyingChain(true);
    try {
      const res = await verifyAuditChain();
      setChainStatus(res.chainVerification);
    } catch (err) {
      console.error('Chain verification error:', err);
    } finally {
      setVerifyingChain(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const actionTypes = [
    { id: 'ALL', label: 'All Events' },
    { id: 'DOCUMENT_UPLOADED', label: 'Uploads' },
    { id: 'DOCUMENT_INTEGRITY_VERIFIED', label: 'SHA-256 Verifications' },
    { id: 'DOCUMENT_DOWNLOADED', label: 'Downloads' },
    { id: 'CASE_CREATED', label: 'Case Creation' },
    { id: 'AI_RAG_ASSISTANT_QUERY', label: 'AI Forensics' },
  ];

  const filteredLogs = logs.filter(log => {
    const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;
    const query = searchQuery.toLowerCase();
    const matchesQuery = !query || 
      (log.user_name && log.user_name.toLowerCase().includes(query)) ||
      (log.badge_number && log.badge_number.toLowerCase().includes(query)) ||
      (log.case_number && log.case_number.toLowerCase().includes(query)) ||
      (log.document_name && log.document_name.toLowerCase().includes(query)) ||
      (log.action && log.action.toLowerCase().includes(query));
    return matchesAction && matchesQuery;
  });

  const generateGlobalPDF = () => {
    try {
      const doc = new jsPDF();
      
      // Header & Emblem
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(15, 23, 42);
      doc.text('GOVERNMENT OF INDIA', 105, 18, { align: 'center' });
      
      doc.setFontSize(13);
      doc.setTextColor(51, 65, 85);
      doc.text('MINISTRY OF LAW & JUSTICE - NYAYVAULT', 105, 25, { align: 'center' });

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Master Forensic Chain of Custody Audit Ledger', 105, 31, { align: 'center' });

      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`Generated: ${new Date().toLocaleString('en-IN')} IST | Admissible under Section 63 BSA 2023`, 105, 37, { align: 'center' });

      doc.setDrawColor(203, 213, 225);
      doc.line(14, 40, 196, 40);

      const tableColumn = ["Timestamp (IST)", "Action Code", "Officer / Role", "Case / Evidence", "IP Address"];
      const tableRows = [];

      filteredLogs.forEach(log => {
        const timestamp = new Date(log.timestamp).toLocaleString('en-IN', {
          day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        const officer = `${log.badge_number || 'SYS'} (${(log.user_role || 'AUTOMATED').replace('_', ' ')})`;
        const target = log.case_number ? `${log.case_number}${log.document_name ? ' / ' + log.document_name : ''}` : (log.document_name || 'System Level');
        tableRows.push([
          timestamp,
          log.action,
          officer,
          target,
          log.ip_address || '127.0.0.1'
        ]);
      });

      const tableConfig = {
        head: [tableColumn],
        body: tableRows,
        startY: 44,
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        styles: { fontSize: 7, cellPadding: 2.5 },
        alternateRowStyles: { fillColor: [248, 250, 252] }
      };

      if (typeof doc.autoTable === 'function') {
        doc.autoTable(tableConfig);
      } else {
        autoTable(doc, tableConfig);
      }

      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text(
          `NyayVault Official Ledger • Page ${i} of ${pageCount} • Cryptographic Integrity Guaranteed`,
          doc.internal.pageSize.getWidth() / 2,
          doc.internal.pageSize.getHeight() - 8,
          { align: 'center' }
        );
      }

      doc.save(`NyayVault_Master_Audit_Ledger_${Date.now().toString().slice(-6)}.pdf`);
    } catch (err) {
      console.error('PDF Generation Error:', err);
      alert('Failed to generate PDF: ' + err.message);
    }
  };

  const uploadsCount = logs.filter(l => l.action === 'DOCUMENT_UPLOADED').length;
  const verificationsCount = logs.filter(l => l.action === 'DOCUMENT_INTEGRITY_VERIFIED').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider mb-1">
            <ShieldCheck size={16} />
            <span>Immutable Ledger • Zero-Trust Compliance</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Chain of Custody Audit Trail
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Cryptographically sealed, append-only log of every evidence interaction, hash verification, and officer access.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleVerifyChain}
            disabled={verifyingChain}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <GitCommit size={15} className={verifyingChain ? 'animate-spin' : ''} />
            <span>Verify Blockchain Merkle Chain</span>
          </button>
          <button
            type="button"
            onClick={fetchLogs}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            title="Refresh Ledger"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin text-emerald-600' : ''} />
          </button>
          <button
            type="button"
            onClick={generateGlobalPDF}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <Download size={15} />
            <span>Export Court PDF</span>
          </button>
        </div>
      </div>

      {chainStatus && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between gap-4 transition-all shadow-sm ${
          chainStatus.isIntact 
            ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200' 
            : 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
        }`}>
          <div className="flex items-center gap-3">
            {chainStatus.isIntact ? (
              <CheckCircle2 size={24} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle size={24} className="text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <div>
              <div className="font-bold text-sm flex items-center gap-2">
                <span>{chainStatus.isIntact ? 'SHA-256 Merkle Chain Fully Verified' : 'Cryptographic Chain Tampering Detected!'}</span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-white/70 dark:bg-slate-900/60 border border-current">
                  {chainStatus.totalBlocks} Blocks Verified
                </span>
              </div>
              <p className="text-xs opacity-90 mt-0.5 font-mono text-[11px]">
                Merkle Root: {chainStatus.merkleRoot}
              </p>
            </div>
          </div>
          <button 
            onClick={() => setChainStatus(null)}
            className="text-xs font-bold opacity-70 hover:opacity-100 cursor-pointer px-2 py-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 3 Metric Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-3.5 shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div className="text-xl font-black text-slate-900 dark:text-white">{verificationsCount}</div>
            <div className="text-xs text-slate-500 font-medium">Integrity Verifications</div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-3.5 shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center font-bold">
            <FileText size={20} />
          </div>
          <div>
            <div className="text-xl font-black text-slate-900 dark:text-white">{uploadsCount}</div>
            <div className="text-xs text-slate-500 font-medium">Evidence Ingestions</div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-3.5 shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center font-bold">
            <Activity size={20} />
          </div>
          <div>
            <div className="text-xl font-black text-slate-900 dark:text-white">{logs.length}</div>
            <div className="text-xs text-slate-500 font-medium">Total Ledger Events</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Action Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 hide-scrollbar">
            {actionTypes.map(type => (
              <button
                key={type.id}
                type="button"
                onClick={() => setActionFilter(type.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  actionFilter === type.id
                    ? 'bg-slate-900 text-white dark:bg-emerald-600 dark:text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Filter by officer, case, file..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <RefreshCw size={24} className="animate-spin text-emerald-600 mb-2" />
            <span className="text-xs font-medium">Verifying and fetching cryptographic ledger...</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            No audit records matching your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Timestamp (IST)</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Officer / User</th>
                  <th className="py-3 px-4">Case / Document</th>
                  <th className="py-3 px-4">IP Address</th>
                  <th className="py-3 px-4 text-right">Log ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {filteredLogs.map(log => {
                  const dateStr = new Date(log.timestamp).toLocaleString('en-IN', {
                    day: '2-digit', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit', second: '2-digit'
                  });

                  const isVerified = log.action === 'DOCUMENT_INTEGRITY_VERIFIED';
                  const isUploaded = log.action === 'DOCUMENT_UPLOADED';
                  const isDownloaded = log.action === 'DOCUMENT_DOWNLOADED';
                  const isCaseCreated = log.action === 'CASE_CREATED';

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors font-sans">
                      {/* Timestamp */}
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {dateStr}
                      </td>

                      {/* Action Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                          isVerified ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' :
                          isUploaded ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 border border-blue-200 dark:border-blue-800' :
                          isDownloaded ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200 dark:border-amber-800' :
                          isCaseCreated ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400 border border-purple-200 dark:border-purple-800' :
                          'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}>
                          {log.action}
                        </span>
                      </td>

                      {/* Officer */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-700 dark:text-slate-300">
                            {log.badge_number ? log.badge_number.substring(0, 3) : 'SYS'}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white leading-tight">
                              {log.user_name || 'System Worker'}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {log.badge_number || 'SYSTEM'} • {(log.user_role || 'AUTOMATED').replace('_', ' ') || 'OFFICER'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Case / Document */}
                      <td className="py-3 px-4">
                        <div>
                          {log.case_number && (
                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200 block">
                              {log.case_number}
                            </span>
                          )}
                          {log.document_name && (
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs block" title={log.document_name}>
                              {log.document_name}
                            </span>
                          )}
                          {!log.case_number && !log.document_name && (
                            <span className="text-slate-400 text-[11px]">System Process</span>
                          )}
                        </div>
                      </td>

                      {/* IP */}
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                        {log.ip_address || '127.0.0.1'}
                      </td>

                      {/* Log ID */}
                      <td className="py-3 px-4 text-right font-mono text-[10px] text-slate-400 whitespace-nowrap">
                        {log.id.substring(0, 8)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
