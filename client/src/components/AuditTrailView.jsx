import { Activity, Clock, Download, ShieldCheck } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable, { applyPlugin } from 'jspdf-autotable';

try {
  applyPlugin(jsPDF);
} catch (e) {
  // Ignore if already applied
}

export default function AuditTrailView({ logs, caseNumber = 'UNKNOWN-CASE' }) {
  
  const generatePDF = () => {
    try {
      const doc = new jsPDF();
      
      doc.setFontSize(18);
      doc.setTextColor(15, 23, 42);
      doc.text('Chain of Custody Audit Report', 14, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 14, 28);
      doc.text(`Case Number: ${caseNumber}`, 14, 34);

      doc.setFontSize(8);
      doc.setTextColor(185, 28, 28);
      doc.text('CONFIDENTIAL & COURT-ADMISSIBLE: Cryptographically verified audit log.', 14, 42);

      const tableColumn = ["Timestamp", "Action", "Officer / Actor", "IP Address", "Audit Log ID"];
      const tableRows = [];

      logs.forEach(log => {
        const badge = log.badge_number || log.user_badge || 'SYSTEM';
        const role = log.user_role ? log.user_role.replace('_', ' ') : 'AUTOMATED';
        const rowData = [
          new Date(log.timestamp).toLocaleString('en-IN'),
          log.action,
          `${badge} (${role})`,
          log.ip_address || 'Internal',
          log.id.split('-')[0]
        ];
        tableRows.push(rowData);
      });

      const tableConfig = {
        head: [tableColumn],
        body: tableRows,
        startY: 48,
        theme: 'grid',
        headStyles: { fillColor: [27, 77, 62] },
        styles: { fontSize: 8, cellPadding: 3 },
        alternateRowStyles: { fillColor: [248, 250, 252] }
      };

      if (typeof doc.autoTable === 'function') {
        doc.autoTable(tableConfig);
      } else {
        autoTable(doc, tableConfig);
      }

      const pageCount = doc.internal.getNumberOfPages();
      for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(
          `Page ${i} of ${pageCount} - Nyay Vault Audit System`,
          doc.internal.pageSize.getWidth() / 2, 
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }

      doc.save(`Chain_of_Custody_${caseNumber}.pdf`);
    } catch (e) {
      console.error("PDF Generation Error:", e);
      alert("Failed to generate PDF: " + e.message);
    }
  };

  if (!logs || logs.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-400">
        <Activity size={36} className="mx-auto mb-2 opacity-30" />
        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No Audit Events Logged</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
      <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <ShieldCheck size={18} className="text-emerald-600 dark:text-emerald-400" /> Immutable Chain of Custody
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Cryptographically logged evidence events and officer access records.</p>
        </div>
        <button 
          onClick={generatePDF}
          className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-blue-600/20 transition-all cursor-pointer"
        >
          <Download size={14} /> Export Audit PDF
        </button>
      </div>
      
      <div className="space-y-2.5">
        {logs.map((log) => (
          <div 
            key={log.id} 
            className="flex items-center justify-between p-3 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/40 text-xs"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 rounded-lg shrink-0">
                <Clock size={16} />
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-white leading-tight">{log.action}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Actor: <strong className="text-slate-700 dark:text-slate-300">{log.badge_number || log.user_badge || 'SYSTEM'}</strong> ({log.user_role ? log.user_role.replace('_', ' ') : 'AUTOMATED'})
                </p>
              </div>
            </div>

            <div className="text-right space-y-1">
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 block">
                {new Date(log.timestamp).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
              <div className="flex items-center gap-2 justify-end text-[10px] text-slate-400 font-mono">
                <span>IP: {log.ip_address}</span>
                <span>•</span>
                <span>ID: {log.id.split('-')[0]}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
