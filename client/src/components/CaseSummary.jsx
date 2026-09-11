import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileBarChart, Download, Loader2, AlertCircle } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { generateCaseSummary } from '../services/api';

export default function CaseSummary({ caseId, caseDetails }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await generateCaseSummary(caseId);
      setSummary(res.summary);
    } catch (err) {
      setError(err.message || 'Failed to generate summary');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!summary) return;
    
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42);
    doc.text('Executive Case Summary Report', 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Case No: ${caseDetails.case_number}`, 14, 28);
    doc.text(`Title: ${caseDetails.title}`, 14, 34);
    doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 14, 40);
    
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 44, 196, 44);

    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    
    const lines = doc.splitTextToSize(summary.replace(/\*\*/g, ''), 180);
    let y = 52;
    
    for (let i = 0; i < lines.length; i++) {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      doc.text(lines[i], 14, y);
      y += 6;
    }
    
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('Cryptographically Verified — Nyay Vault', 14, 290);
    
    doc.save(`${caseDetails.case_number}_Summary.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <FileBarChart size={18} className="text-emerald-600 dark:text-emerald-400" /> Executive Case Brief Synthesis
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Synthesizes all evidence files, complaints, and timeline milestones into a structured legal summary.
            </p>
          </div>

          {!summary && !loading && (
            <button
              onClick={handleGenerate}
              className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 whitespace-nowrap shadow-md shadow-blue-600/20 transition-all cursor-pointer"
            >
              <FileBarChart size={16} /> Synthesize Brief
            </button>
          )}

          {loading && (
            <div className="flex items-center gap-2 text-blue-600 text-xs font-bold">
              <Loader2 size={16} className="animate-spin" />
              <span>Analyzing evidence vault & synthesizing brief...</span>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 p-3 bg-rose-50 text-rose-700 dark:bg-rose-950/40 text-xs rounded-xl border border-rose-200 dark:border-rose-900/30 flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}
      </div>

      {summary && (
        <motion.div 
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden"
        >
          <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
            <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
              <FileBarChart size={16} className="text-blue-600" /> Synthesized Case Summary
            </h4>
            <button
              onClick={handleDownloadPDF}
              className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/20 transition-all cursor-pointer"
            >
              <Download size={14} /> Export Brief PDF
            </button>
          </div>
          <div className="p-6 text-xs leading-relaxed text-slate-800 dark:text-slate-200 font-sans space-y-2">
            {summary.split('\n').map((line, i) => (
              <p key={i}>{line.replace(/\*\*/g, '')}</p>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
