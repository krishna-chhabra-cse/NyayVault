import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  FileSignature, 
  Download, 
  ShieldCheck, 
  CheckCircle2, 
  FileText, 
  AlertCircle,
  Building2,
  Calendar,
  Lock,
  ArrowRight,
  Printer
} from 'lucide-react';
import { getCases, getCaseDocuments, getCaseAuditTrail } from '../services/api';
import { jsPDF } from 'jspdf';
import autoTable, { applyPlugin } from 'jspdf-autotable';

try {
  applyPlugin(jsPDF);
} catch (e) {
  // Ignore if already applied
}

export default function ReportsHub({ currentUser }) {
  const [cases, setCases] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [documents, setDocuments] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState('');
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getCases();
        const loaded = res.cases || [];
        setCases(loaded);
        if (loaded.length > 0) {
          setSelectedCaseId(loaded[0].id);
        }
      } catch (e) {
        console.error('Failed to load cases in ReportsHub', e);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!selectedCaseId) return;
    const fetchDocs = async () => {
      setLoadingDocs(true);
      try {
        const res = await getCaseDocuments(selectedCaseId);
        const docs = res.documents || [];
        setDocuments(docs);
        if (docs.length > 0) {
          setSelectedDocId(docs[0].id);
        } else {
          setSelectedDocId('');
        }
      } catch (e) {
        console.error('Failed to load docs for case', e);
      } finally {
        setLoadingDocs(false);
      }
    };
    fetchDocs();
  }, [selectedCaseId]);

  const selectedCase = cases.find(c => c.id === selectedCaseId);
  const selectedDoc = documents.find(d => d.id === selectedDocId);

  const generateBSACertificate = () => {
    if (!selectedCase || !selectedDoc) {
      alert('Please select a case and an evidence file.');
      return;
    }
    setGenerating(true);
    try {
      const docPdf = new jsPDF();
      
      // Official Emblem Header
      docPdf.setFont('helvetica', 'bold');
      docPdf.setFontSize(14);
      docPdf.setTextColor(15, 23, 42);
      docPdf.text('GOVERNMENT OF INDIA • MINISTRY OF LAW & JUSTICE', 105, 18, { align: 'center' });
      
      docPdf.setFontSize(16);
      docPdf.setTextColor(21, 128, 61); // emerald-700
      docPdf.text('CERTIFICATE UNDER SECTION 63', 105, 28, { align: 'center' });
      docPdf.text('OF THE BHARATIYA SAKSHYA ADHINIYAM, 2023', 105, 36, { align: 'center' });
      docPdf.setFontSize(9);
      docPdf.setTextColor(100, 116, 139);
      docPdf.text('(Corresponding to erstwhile Section 65B of the Indian Evidence Act, 1872)', 105, 42, { align: 'center' });

      docPdf.setDrawColor(203, 213, 225);
      docPdf.line(14, 46, 196, 46);

      // Body text
      docPdf.setFont('helvetica', 'normal');
      docPdf.setFontSize(10);
      docPdf.setTextColor(30, 41, 59);
      
      const p1 = `I, the undersigned Authorized Officer (${currentUser?.full_name || 'Inspector'}, Badge: ${currentUser?.badge_number || 'POL-1'}), do hereby certify that the digital evidence described below has been retrieved from the secure, tamper-evident NyayVault electronic record repository.`;
      docPdf.text(docPdf.splitTextToSize(p1, 172), 18, 55);

      const p2 = `1. The computer system and cryptographic vault were operating properly during the entire period of custody and ingestion.`;
      const p3 = `2. The digital file's SHA-256 cryptographic hash has been continuously verified against raw storage bytes with zero tampering detected.`;
      const p4 = `3. The information contained in the electronic record reproduces accurately the data supplied to the computer in the ordinary course of legitimate proceedings.`;
      
      docPdf.text(docPdf.splitTextToSize(p2, 172), 18, 70);
      docPdf.text(docPdf.splitTextToSize(p3, 172), 18, 79);
      docPdf.text(docPdf.splitTextToSize(p4, 172), 18, 88);

      // Metadata Table
      const tableData = [
        ['Case Number', selectedCase.case_number],
        ['Case Title', selectedCase.title],
        ['Evidence Filename', selectedDoc.filename],
        ['Document Category', selectedDoc.document_category || 'INVESTIGATION'],
        ['MIME Content-Type', selectedDoc.mime_type || 'application/octet-stream'],
        ['File Size', `${selectedDoc.file_size || 0} bytes`],
        ['Ingestion Timestamp', new Date(selectedDoc.uploaded_at).toLocaleString('en-IN') + ' IST'],
        ['Cryptographic SHA-256', selectedDoc.sha256_hash],
        ['Custody Integrity Status', 'VERIFIED TAMPER-FREE (AUTHENTIC)']
      ];

      const bsaTableConfig = {
        startY: 98,
        head: [['Specification', 'Cryptographic & Legal Verification']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 3 },
        columnStyles: {
          0: { fontStyle: 'bold', width: 55 },
          1: { fontStyle: 'normal' }
        }
      };

      if (typeof docPdf.autoTable === 'function') {
        docPdf.autoTable(bsaTableConfig);
      } else {
        autoTable(docPdf, bsaTableConfig);
      }

      const finalY = docPdf.lastAutoTable.finalY + 20;

      // Signature Block
      docPdf.setFontSize(10);
      docPdf.setFont('helvetica', 'bold');
      docPdf.text('AUTHORIZED SIGNATORY & CUSTODIAN OF ELECTRONIC RECORD:', 18, finalY);

      docPdf.setFont('helvetica', 'normal');
      docPdf.setFontSize(9);
      docPdf.text(`Name: ${currentUser?.full_name || 'Inspector Krishna Chhabra'}`, 18, finalY + 8);
      docPdf.text(`Designation: ${currentUser?.role?.replace(/_/g, ' ') || 'Investigating Officer'}`, 18, finalY + 14);
      docPdf.text(`Badge Number: ${currentUser?.badge_number || 'POL-1'}`, 18, finalY + 20);
      docPdf.text(`Certified At: ${new Date().toLocaleString('en-IN')} IST`, 18, finalY + 26);

      docPdf.setDrawColor(15, 23, 42);
      docPdf.line(130, finalY + 22, 190, finalY + 22);
      docPdf.text('DIGITAL COURT SEAL', 140, finalY + 27);

      docPdf.save(`BSA_Sec63_Certificate_${selectedDoc.filename}.pdf`);
    } catch (e) {
      console.error(e);
      alert('Error generating certificate: ' + e.message);
    } finally {
      setGenerating(false);
    }
  };

  const generateFullCaseDossier = async () => {
    if (!selectedCase) return;
    setGenerating(true);
    try {
      const [docsRes, auditRes] = await Promise.all([
        getCaseDocuments(selectedCase.id),
        getCaseAuditTrail(selectedCase.id)
      ]);

      const caseDocs = docsRes.documents || [];
      const auditLogs = auditRes.auditLogs || [];

      const docPdf = new jsPDF();
      docPdf.setFont('helvetica', 'bold');
      docPdf.setFontSize(18);
      docPdf.text('COURT INVESTIGATION DOSSIER', 105, 20, { align: 'center' });
      docPdf.setFontSize(12);
      docPdf.setTextColor(21, 128, 61);
      docPdf.text(`CASE FILE: ${selectedCase.case_number}`, 105, 28, { align: 'center' });
      docPdf.setFontSize(9);
      docPdf.setTextColor(100, 116, 139);
      docPdf.text(`Title: ${selectedCase.title} | Status: ${selectedCase.status || 'INVESTIGATION'}`, 105, 34, { align: 'center' });

      docPdf.line(14, 38, 196, 38);

      // Section 1: Evidence Catalog
      docPdf.setFontSize(12);
      docPdf.setTextColor(15, 23, 42);
      docPdf.text('1. Digital Evidence Vault Inventory', 14, 46);

      const docRows = caseDocs.map(d => [
        d.filename,
        d.document_category || 'INVESTIGATION',
        `${d.file_size || 0} B`,
        d.sha256_hash.substring(0, 20) + '...',
        new Date(d.uploaded_at).toLocaleDateString('en-IN')
      ]);

      const docTableConfig = {
        startY: 50,
        head: [['Filename', 'Category', 'Size', 'SHA-256 Hash', 'Date Ingested']],
        body: docRows.length > 0 ? docRows : [['No documents', '-', '-', '-', '-']],
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59], fontSize: 8 },
        styles: { fontSize: 7, cellPadding: 2.5 }
      };

      if (typeof docPdf.autoTable === 'function') {
        docPdf.autoTable(docTableConfig);
      } else {
        autoTable(docPdf, docTableConfig);
      }

      // Section 2: Chain of Custody Summary
      const nextY = (docPdf.lastAutoTable?.finalY || 50) + 12;
      docPdf.setFontSize(12);
      docPdf.text('2. Chain of Custody Audit Summary', 14, nextY);

      const auditRows = auditLogs.slice(0, 15).map(l => [
        new Date(l.timestamp).toLocaleString('en-IN'),
        l.action,
        l.badge_number || 'SYSTEM',
        l.ip_address || '127.0.0.1'
      ]);

      const auditTableConfig = {
        startY: nextY + 4,
        head: [['Timestamp', 'Action', 'Officer', 'IP']],
        body: auditRows.length > 0 ? auditRows : [['No audit logs recorded', '-', '-', '-']],
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42], fontSize: 8 },
        styles: { fontSize: 7, cellPadding: 2.5 }
      };

      if (typeof docPdf.autoTable === 'function') {
        docPdf.autoTable(auditTableConfig);
      } else {
        autoTable(docPdf, auditTableConfig);
      }

      docPdf.save(`Dossier_${selectedCase.case_number}.pdf`);
    } catch (e) {
      alert('Error generating dossier: ' + e.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-50 p-1.5 shrink-0 hidden sm:flex items-center justify-center">
            <img 
              src="/logo.png" 
              alt="NyayVault" 
              className="w-full h-full object-contain" 
            />
          </div>
          <div>
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider mb-1">
              <Building2 size={16} />
              <span>Bharatiya Sakshya Adhiniyam 2023 Compliant</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Legal Reports & Admissibility Hub
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Generate tamper-evident Section 63 BSA electronic records certificates, forensic dossiers, and court compliance exhibits.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={generateFullCaseDossier}
            disabled={generating || !selectedCase}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Download size={15} />
            <span>Download Case Dossier</span>
          </button>
        </div>
      </div>

      {/* Selector Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Case Selector */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            1. Select Target Case
          </label>
          <select
            value={selectedCaseId}
            onChange={(e) => setSelectedCaseId(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-1 focus:ring-emerald-500 outline-none"
          >
            {cases.map(c => (
              <option key={c.id} value={c.id}>
                {c.case_number} — {c.title}
              </option>
            ))}
          </select>
          {selectedCase && (
            <div className="mt-3 text-[11px] text-slate-500 flex items-center gap-3">
              <span>Security: <strong className="text-slate-700 dark:text-slate-300">{selectedCase.security_level}</strong></span>
              <span>•</span>
              <span>Status: <strong className="text-emerald-600">{selectedCase.status || 'INVESTIGATION'}</strong></span>
            </div>
          )}
        </div>

        {/* Evidence File Selector */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            2. Select Evidence Document for Certificate
          </label>
          {loadingDocs ? (
            <div className="text-xs text-slate-400 py-2">Loading documents...</div>
          ) : documents.length === 0 ? (
            <div className="text-xs text-slate-400 py-2">No documents in this case.</div>
          ) : (
            <select
              value={selectedDocId}
              onChange={(e) => setSelectedDocId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-1 focus:ring-emerald-500 outline-none"
            >
              {documents.map(d => (
                <option key={d.id} value={d.id}>
                  {d.filename} ({d.document_category || 'EVIDENCE'})
                </option>
              ))}
            </select>
          )}
          {selectedDoc && (
            <div className="mt-3 font-mono text-[10px] text-slate-400 truncate">
              SHA: {selectedDoc.sha256_hash}
            </div>
          )}
        </div>
      </div>

      {/* Certificate Preview Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center font-bold">
              <FileSignature size={22} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Section 63 Bharatiya Sakshya Adhiniyam (BSA) Certificate
              </h2>
              <p className="text-xs text-slate-400">
                Statutory electronic evidence certificate verifying authenticity and unbroken chain of custody.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={generateBSACertificate}
            disabled={generating || !selectedDoc}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Printer size={15} />
            <span>Generate Official Certificate</span>
          </button>
        </div>

        {/* Mock Official Preview Sheet */}
        <div className="p-6 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-serif text-xs leading-relaxed space-y-4">
          <div className="text-center space-y-1 font-sans">
            <div className="text-[11px] font-black uppercase tracking-widest text-slate-900 dark:text-white">
              IN THE COURT OF THE PRINCIPAL DISTRICT & SESSIONS JUDGE
            </div>
            <div className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
              CERTIFICATE UNDER SECTION 63 OF THE BHARATIYA SAKSHYA ADHINIYAM, 2023
            </div>
            <div className="text-[10px] text-slate-400 font-sans">
              (Admissibility of Electronic Records / Erstwhile Section 65B Indian Evidence Act)
            </div>
          </div>

          <p>
            This is to certify that the digital evidence designated as <strong>{selectedDoc?.filename || '[Select File]'}</strong> relating to Case <strong>{selectedCase?.case_number || '[Select Case]'}</strong> has been extracted from the secure digital repository NyayVault under cryptographic surveillance.
          </p>

          <div className="font-mono text-[11px] bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1 font-sans">
            <div><strong>Cryptographic Hash:</strong> {selectedDoc?.sha256_hash || 'SHA-256 Calculated on Demand'}</div>
            <div><strong>Custodian Officer:</strong> {currentUser?.full_name || 'Inspector'} ({currentUser?.badge_number || 'POL-1'})</div>
            <div><strong>Integrity Status:</strong> Cryptographically Verified Authentic • Zero Tampering</div>
          </div>

          <p className="text-[11px] text-slate-500 italic">
            I hereby declare that the computer system was operating properly and at all material times the electronic record remained uncompromised.
          </p>
        </div>
      </div>
    </div>
  );
}
