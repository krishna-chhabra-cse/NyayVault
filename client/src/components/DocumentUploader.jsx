import { useState, useCallback } from 'react';
import { UploadCloud, File as FileIcon, X, Loader2, ShieldCheck, CheckCircle, Folder, Edit2 } from 'lucide-react';
import { uploadDocument } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';

export default function DocumentUploader({ caseId, onUploadComplete }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [isMedical, setIsMedical] = useState(false);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFiles(prev => [
        ...prev, 
        ...Array.from(e.dataTransfer.files).map(f => ({ originalFile: f, newName: f.name }))
      ]);
    }
  }, []);

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const updateFileName = (index, newName) => {
    setFiles(prev => {
      const newFiles = [...prev];
      newFiles[index].newName = newName;
      return newFiles;
    });
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    
    try {
      for (let i = 0; i < files.length; i++) {
        setUploadProgress({ current: i + 1, total: files.length });
        const { originalFile, newName } = files[i];
        
        // Construct new file with the potentially updated name
        // Ensure the extension remains if the user accidentally removed it, or just trust the user. 
        // For safety, we just use the newName directly.
        const fileToUpload = new File([originalFile], newName || originalFile.name, { type: originalFile.type });
        
        await uploadDocument(caseId, fileToUpload, isMedical);
      }
      setFiles([]);
      setIsMedical(false);
      onUploadComplete();
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
      setUploadProgress({ current: 0, total: 0 });
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">Secure Batch Evidence Upload</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Upload digital evidence files for cryptographic hashing and classification.</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-bold">
          <ShieldCheck size={15} /> SHA-256 Active
        </div>
      </div>
      
      {/* Sensitive record toggle: S3 SSE-KMS encryption */}
      <div className={`mb-5 p-3.5 rounded-xl border transition-all ${
        isMedical 
          ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 shadow-xs' 
          : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
      }`}>
        <label className="flex items-center justify-between cursor-pointer select-none">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
              isMedical ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300'
            }`}>
              <ShieldCheck size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Mark as Sensitive Medical / Forensics Record
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  DPDPA • AWS KMS
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Encrypts this evidence in Amazon S3 with an AWS KMS key (SSE-KMS) instead of default S3 encryption.
              </p>
            </div>
          </div>
          <input
            type="checkbox"
            checked={isMedical}
            onChange={(e) => setIsMedical(e.target.checked)}
            className="w-5 h-5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
          />
        </label>
      </div>

      {files.length === 0 ? (
        <div 
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-8 transition-all flex flex-col md:flex-row items-center justify-between gap-6 cursor-pointer ${
            dragActive 
              ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20' 
              : 'border-slate-200 dark:border-slate-800 hover:border-blue-500 hover:bg-slate-50/50 dark:hover:bg-slate-800/40'
          }`}
          onClick={() => document.getElementById('file-upload').click()}
        >
          <div className="flex-1 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
              <UploadCloud size={28} />
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-0.5">
              Drag & drop multiple files here
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              or click to <span className="text-blue-600 dark:text-blue-400 font-semibold underline">browse</span> files
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-4">
              Supported formats: PDF, DOC, DOCX, TXT, JPG, PNG, GIF, MP4, MOV, WAV, CSV <span className="mx-1">|</span> Max file size: 2 GB (per file)
            </p>
          </div>

          <button 
            type="button"
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-blue-600/20 transition-all shrink-0 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              document.getElementById('file-upload').click();
            }}
          >
            <Folder size={16} />
            Browse Files
          </button>

          <input 
            id="file-upload"
            type="file" 
            multiple
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                setFiles(prev => [
                  ...prev, 
                  ...Array.from(e.target.files).map(f => ({ originalFile: f, newName: f.name }))
                ]);
              }
              e.target.value = null;
            }}
          />
        </div>
      ) : (
        <AnimatePresence>
          <motion.div 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800/40 overflow-hidden"
          >
            <div className="max-h-60 overflow-y-auto p-3 space-y-2">
              {files.map((fileItem, idx) => (
                <div key={`${fileItem.originalFile.name}-${idx}`} className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-xs gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-md shrink-0">
                      <FileIcon size={16} />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="flex items-center gap-1.5 group relative">
                        <input 
                          type="text" 
                          value={fileItem.newName} 
                          onChange={(e) => updateFileName(idx, e.target.value)}
                          disabled={uploading}
                          className="font-bold text-sm text-slate-900 dark:text-white bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-blue-500 focus:outline-none w-full truncate py-0.5 pr-6 transition-colors"
                          title="Click to rename before upload"
                        />
                        <Edit2 size={12} className="text-slate-300 dark:text-slate-600 absolute right-1 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity" />
                      </div>
                      <p className="text-[11px] text-slate-500">{(fileItem.originalFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                  {!uploading && (
                    <button 
                      onClick={() => removeFile(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors shrink-0"
                    >
                      <X size={15} />
                    </button>
                  )}
                  {uploading && idx < uploadProgress.current - 1 && (
                    <CheckCircle className="text-emerald-500 shrink-0" size={16} />
                  )}
                  {uploading && idx === uploadProgress.current - 1 && (
                    <Loader2 className="animate-spin text-emerald-500 shrink-0" size={16} />
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center p-3 bg-slate-100 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 text-xs">
              <span className="font-medium text-slate-600 dark:text-slate-400">
                {uploading ? `Uploading ${uploadProgress.current} of ${uploadProgress.total} files...` : `${files.length} file(s) queued`}
              </span>
              <div className="flex gap-2">
                <button 
                  className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" 
                  onClick={() => setFiles([])}
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button 
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold shadow-md shadow-blue-600/20 disabled:opacity-50 transition-all cursor-pointer"
                  onClick={handleUpload}
                  disabled={uploading}
                >
                  {uploading ? 'Processing...' : 'Upload Evidence'}
                </button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
