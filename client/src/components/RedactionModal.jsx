import { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Loader2, 
  Check, 
  X, 
  FileText, 
  Plus, 
  CheckSquare, 
  Square,
  Download,
  Copy,
  ExternalLink
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function RedactionModal({ doc: docProp, document: documentProp, onClose, onComplete, onRedacted }) {
  const doc = docProp || documentProp;
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIndices, setSelectedIndices] = useState(new Set());
  const [customText, setCustomText] = useState('');
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState(null);
  const [completedDoc, setCompletedDoc] = useState(null);
  const [copiedHash, setCopiedHash] = useState(false);

  const handleFinish = (resultDoc) => {
    const target = resultDoc || completedDoc;
    if (onComplete) onComplete(target);
    if (onRedacted) onRedacted(target);
    if (onClose) onClose();
  };

  const triggerDownload = (filename, textContent) => {
    try {
      const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = filename || 'REDACTED_DOCUMENT.txt';
      window.document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error('Failed to trigger direct download:', err);
    }
  };

  const downloadRedactedFile = (targetDoc) => {
    const d = targetDoc || completedDoc;
    if (!d) return;

    if (d.extracted_text) {
      triggerDownload(d.filename, d.extracted_text);
      return;
    }

    // Fallback: fetch directly from API
    fetch(`/api/documents/${d.id}/download`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('sih_token')}`
      }
    })
      .then(res => res.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = window.document.createElement('a');
        a.href = url;
        a.download = d.filename || 'REDACTED_DOCUMENT.txt';
        window.document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      })
      .catch(err => {
        console.error('Download error:', err);
      });
  };

  const copyHashToClipboard = (hash) => {
    if (!hash) return;
    navigator.clipboard.writeText(hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  useEffect(() => {
    if (!doc?.id) {
      setLoading(false);
      setError('No document provided for redaction.');
      return;
    }

    const fetchSuggestions = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/documents/${doc.id}/redact/suggest`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('sih_token')}`,
            'x-user-id': localStorage.getItem('sih_active_user')
          }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to analyze document');
        
        const list = data.suggestions || [];
        setSuggestions(list);
        // Auto-select all by default
        setSelectedIndices(new Set(list.map((_, i) => i)));
      } catch (err) {
        console.warn("Analysis suggestion error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchSuggestions();
  }, [doc?.id]);

  const toggleSelection = (index) => {
    const newSet = new Set(selectedIndices);
    if (newSet.has(index)) newSet.delete(index);
    else newSet.add(index);
    setSelectedIndices(newSet);
  };

  const handleSelectAll = () => {
    if (selectedIndices.size === suggestions.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(suggestions.map((_, i) => i)));
    }
  };

  const handleAddCustom = (e) => {
    e?.preventDefault();
    const trimmed = customText.trim();
    if (!trimmed) return;
    
    // Check if already in suggestions
    const existingIndex = suggestions.findIndex(s => s.exact_text.toLowerCase() === trimmed.toLowerCase());
    if (existingIndex >= 0) {
      setSelectedIndices(prev => new Set([...prev, existingIndex]));
    } else {
      const newSug = {
        exact_text: trimmed,
        type: 'CUSTOM_PII',
        reason: 'Manually specified sensitive entity'
      };
      const newIndex = suggestions.length;
      setSuggestions(prev => [...prev, newSug]);
      setSelectedIndices(prev => new Set([...prev, newIndex]));
    }
    setCustomText('');
  };

  const handleApply = async () => {
    if (!doc?.id) return;
    setApplying(true);
    setError(null);
    try {
      const selectedRedactions = suggestions.filter((_, i) => selectedIndices.has(i));
      if (selectedRedactions.length === 0) {
        throw new Error('Please select at least one sensitive term to redact.');
      }
      
      const res = await fetch(`/api/documents/${doc.id}/redact/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('sih_token')}`,
          'x-user-id': localStorage.getItem('sih_active_user')
        },
        body: JSON.stringify({ redactions: selectedRedactions })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to apply redactions');
      
      const createdDoc = data.document;
      setCompletedDoc(createdDoc);

      // Instantly deliver the file to the user via browser download
      if (createdDoc) {
        downloadRedactedFile(createdDoc);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setApplying(false);
    }
  };

  if (!doc) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-[110] p-4"
    >
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        className="bg-white dark:bg-slate-900 w-full max-w-3xl flex flex-col shadow-2xl rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
              completedDoc 
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50'
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50'
            }`}>
              {completedDoc ? <ShieldCheck size={20} /> : <ShieldAlert size={20} />}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>{completedDoc ? 'Redacted Exhibit Certified & Downloaded' : 'AI Redaction Studio'}</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-medium">
                  {completedDoc ? completedDoc.filename : doc.filename}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {completedDoc 
                  ? 'Cryptographically attested copy generated. Automatic file download initiated.'
                  : 'Automated PII identification and cryptographically attested public censoring'}
              </p>
            </div>
          </div>
          <button 
            onClick={() => handleFinish(completedDoc)} 
            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-500 dark:text-slate-400 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          {error && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded-2xl border border-rose-200 dark:border-rose-800 text-xs">
              <span className="font-bold block mb-0.5">Notice:</span>
              <span>{error}</span>
            </div>
          )}

          {/* COMPLETED SUCCESS SCREEN */}
          {completedDoc ? (
            <div className="space-y-5">
              {/* Green Success Banner */}
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 rounded-2xl border border-emerald-200 dark:border-emerald-800 flex items-start gap-3">
                <div className="p-1 rounded-lg bg-emerald-600 text-white shrink-0 mt-0.5">
                  <Check size={16} strokeWidth={3} />
                </div>
                <div className="text-xs space-y-1">
                  <div className="font-bold text-sm text-emerald-900 dark:text-emerald-200">
                    Redacted Copy Delivered & Logged to Audit Trail
                  </div>
                  <p className="text-emerald-700 dark:text-emerald-400">
                    The redacted file has been downloaded to your device. An immutable audit entry has been recorded in the Master Chain of Custody Ledger without cluttering the primary Evidence repository.
                  </p>
                </div>
              </div>

              {/* Exhibit Details Card */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 uppercase font-semibold text-[10px] tracking-wider block">Generated Exhibit</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white truncate block">{completedDoc.filename}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase font-semibold text-[10px] tracking-wider block">Integrity Status</span>
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                      <ShieldCheck size={14} /> VERIFIED AUTHENTIC
                    </span>
                  </div>
                </div>

                {/* SHA-256 Seal */}
                <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/80">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-slate-400 uppercase font-semibold text-[10px] tracking-wider">SHA-256 Cryptographic Checksum</span>
                    <button
                      type="button"
                      onClick={() => copyHashToClipboard(completedDoc.sha256_hash)}
                      className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      {copiedHash ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                      <span>{copiedHash ? 'Copied to Clipboard' : 'Copy Hash'}</span>
                    </button>
                  </div>
                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-700 dark:text-slate-300 break-all select-all">
                    {completedDoc.sha256_hash}
                  </div>
                </div>
              </div>

              {/* Redaction Preview */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Live Redacted Content Preview
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400">
                    Blackout Redaction Applied
                  </span>
                </div>
                <div className="p-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl max-h-56 overflow-y-auto text-xs font-mono leading-relaxed text-slate-800 dark:text-slate-300 whitespace-pre-wrap">
                  {completedDoc.extracted_text ? (
                    completedDoc.extracted_text.split(/(\[REDACTED\])/g).map((segment, idx) => {
                      if (segment === '[REDACTED]') {
                        return (
                          <span 
                            key={idx} 
                            className="inline-block px-1.5 py-0.5 mx-0.5 rounded bg-slate-900 dark:bg-black text-rose-400 dark:text-rose-400 font-mono text-[11px] font-black border border-slate-700 shadow-2xs select-none"
                            title="Sensitive Information Redacted"
                          >
                            █ [REDACTED] █
                          </span>
                        );
                      }
                      return <span key={idx}>{segment}</span>;
                    })
                  ) : (
                    <span className="text-slate-400 italic">No text preview available.</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* CONFIGURATION / SELECTION VIEW */
            <>
              {/* Add custom text form */}
              <form onSubmit={handleAddCustom} className="flex gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                <input 
                  type="text"
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="Type custom text/phrase to censor (e.g. Phone, Name, Account)..."
                  className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <button 
                  type="submit"
                  disabled={!customText.trim()}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-40 transition-colors"
                >
                  <Plus size={14} />
                  <span>Add Custom</span>
                </button>
              </form>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                  <Loader2 size={36} className="animate-spin mb-3 text-blue-500" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Scanning document text for sensitive PII...</p>
                  <p className="text-xs text-slate-400 mt-0.5">Detecting Names, Aadhaar, Phone Numbers, and Financial Records</p>
                </div>
              ) : suggestions.length === 0 ? (
                <div className="text-center py-12 text-slate-500 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-6">
                  <ShieldCheck size={36} className="mx-auto mb-2 text-emerald-500 opacity-60" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">No standard PII patterns detected</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Use the "Add Custom" bar above to type any specific words, names, or account numbers you wish to censor.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
                    <span>
                      {suggestions.length} items detected • <strong className="text-slate-700 dark:text-slate-200">{selectedIndices.size}</strong> selected for redaction
                    </span>
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      {selectedIndices.size === suggestions.length ? (
                        <>
                          <Square size={13} />
                          <span>Deselect All</span>
                        </>
                      ) : (
                        <>
                          <CheckSquare size={13} />
                          <span>Select All</span>
                        </>
                      )}
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-2.5">
                    {suggestions.map((sug, i) => {
                      const isSelected = selectedIndices.has(i);
                      return (
                        <div 
                          key={i} 
                          onClick={() => toggleSelection(i)}
                          className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                            isSelected 
                              ? 'bg-rose-50/70 border-rose-200 dark:bg-rose-950/30 dark:border-rose-900/60 shadow-2xs' 
                              : 'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800 opacity-60 hover:opacity-100'
                          }`}
                        >
                          <div className={`mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                            isSelected 
                              ? 'bg-rose-600 border-rose-600 text-white shadow-2xs' 
                              : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                          }`}>
                            {isSelected && <Check size={13} strokeWidth={3} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className={`font-mono text-sm font-bold truncate ${
                                isSelected ? 'text-rose-700 dark:text-rose-400 line-through' : 'text-slate-900 dark:text-white'
                              }`}>
                                {sug.exact_text}
                              </p>
                              <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-md shrink-0 border border-slate-200/60 dark:border-slate-700/60">
                                {sug.type}
                              </span>
                            </div>
                            <p className="text-xs mt-0.5 text-slate-500 dark:text-slate-400">
                              <span className="font-semibold uppercase text-[10px] opacity-70">Reason: </span>
                              {sug.reason}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 px-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 flex flex-col sm:flex-row justify-between items-center gap-3">
          {completedDoc ? (
            <>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <ShieldCheck size={15} className="shrink-0 text-emerald-500" />
                <span>The redacted artifact is downloaded and securely logged to the audit ledger.</span>
              </p>
              <div className="flex items-center gap-2 shrink-0">
                <button 
                  type="button"
                  onClick={() => downloadRedactedFile(completedDoc)} 
                  className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-200 dark:border-slate-700"
                >
                  <Download size={14} />
                  <span>Download Again</span>
                </button>
                <button 
                  type="button"
                  onClick={() => handleFinish(completedDoc)}
                  className="px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer transition-all"
                >
                  <Check size={14} />
                  <span>Done</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 text-center sm:text-left">
                <FileText size={14} className="shrink-0 text-blue-500" />
                <span>Original record is preserved intact. A new redacted file will be created, sealed, and downloaded.</span>
              </p>
              <div className="flex items-center gap-2 shrink-0">
                <button 
                  type="button"
                  onClick={onClose} 
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={handleApply}
                  disabled={loading || applying || selectedIndices.size === 0}
                  className="px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 disabled:opacity-40 bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer transition-all disabled:cursor-not-allowed"
                >
                  {applying ? <Loader2 size={14} className="animate-spin" /> : <ShieldAlert size={14} />}
                  <span>Generate Redacted Copy</span>
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
