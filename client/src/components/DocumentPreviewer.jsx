import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Image as ImageIcon, 
  Film, 
  Volume2, 
  FileCode, 
  Download, 
  ExternalLink, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Maximize2, 
  Loader2, 
  AlertCircle,
  RefreshCw,
  Gauge,
  Key,
  ShieldCheck,
  Award,
  Flame,
  CheckCircle2,
  X
} from 'lucide-react';
import { 
  fetchDocumentBlob, 
  getDownloadUrl, 
  signExhibit, 
  getBsaCertificate, 
  simulateTamper, 
  restoreTamper, 
  verifyDocument 
} from '../services/api';

export default function DocumentPreviewer({ 
  documentId: propDocId, 
  filename: propFilename = '', 
  documentType = 'EVIDENCE',
  document = null,
  searchQuery = ''
}) {
  const documentId = propDocId || document?.id;
  const filename = propFilename || document?.filename || '';
  const initialText = document?.extracted_text || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fileData, setFileData] = useState(null);
  const [textContent, setTextContent] = useState(initialText);
  const [imgError, setImgError] = useState(false);
  
  // Image zoom state
  const [zoom, setZoom] = useState(1);
  // Video playback speed
  const [playbackRate, setPlaybackRate] = useState(1);

  // PKI & Tamper Demo State
  const [signing, setSigning] = useState(false);
  const [signedInfo, setSignedInfo] = useState(null);
  const [certModal, setCertModal] = useState(null);
  const [tamperState, setTamperState] = useState(null); // { isTampered, message }
  const [liveCheckResult, setLiveCheckResult] = useState(null);

  const handleSignExhibit = async () => {
    setSigning(true);
    try {
      const res = await signExhibit(documentId);
      setSignedInfo(res.signature);
    } catch (err) {
      alert('PKI Signature Error: ' + err.message);
    } finally {
      setSigning(false);
    }
  };

  const handleViewCertificate = async () => {
    try {
      const res = await getBsaCertificate(documentId);
      setCertModal(res.certificate);
    } catch (err) {
      alert('Certificate Error: ' + err.message);
    }
  };

  const handleSimulateTamper = async () => {
    try {
      const res = await simulateTamper(documentId);
      setTamperState({ isTampered: true, message: res.message });
      setLiveCheckResult(null);
    } catch (err) {
      alert('Tamper Simulation Error: ' + err.message);
    }
  };

  const handleRestoreTamper = async () => {
    try {
      const res = await restoreTamper(documentId);
      setTamperState({ isTampered: false, message: res.message });
      setLiveCheckResult(null);
    } catch (err) {
      alert('Restore Error: ' + err.message);
    }
  };

  const handleRunLiveCheck = async () => {
    try {
      const res = await verifyDocument(documentId);
      setLiveCheckResult(res.verification);
    } catch (err) {
      alert('Verification error: ' + err.message);
    }
  };

  useEffect(() => {
    let active = true;
    let createdUrl = null;

    const loadBlob = async () => {
      if (!documentId) return;
      setLoading(true);
      setError(null);
      setZoom(1);

      try {
        const result = await fetchDocumentBlob(documentId);
        if (!active) {
          if (result.objectUrl) URL.revokeObjectURL(result.objectUrl);
          return;
        }

        createdUrl = result.objectUrl;
        setFileData(result);

        // Inspect blob content: Check if it is readable text (common in mock/dev databases)
        try {
          const rawText = await result.blob.text();
          const isPrintable = rawText && rawText.length > 0 && !/[\x00-\x08\x0E-\x1F]/.test(rawText.substring(0, 100));
          if (isPrintable && active) {
            setTextContent(rawText);
          }
        } catch (e) {}
      } catch (err) {
        if (active) {
          console.error('DocumentPreviewer fetch error:', err);
          if (initialText) {
            setTextContent(initialText);
          } else {
            setError(err.message || 'Unable to retrieve evidence binary payload.');
          }
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadBlob();

    return () => {
      active = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [documentId, filename]);

  // Determine media type
  const lowerName = (filename || '').toLowerCase();
  const cType = (fileData?.contentType || '').toLowerCase();

  const isPdf = cType.includes('pdf') || lowerName.endsWith('.pdf');
  const isVideo = cType.startsWith('video/') || /\.(mp4|webm|mov|m4v)$/i.test(lowerName);
  const isAudio = cType.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac)$/i.test(lowerName);
  const isImage = (cType.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(lowerName)) && !isPdf && !isVideo && !isAudio;
  const isText = cType.startsWith('text/') || /\.(txt|csv|json|md|log)$/i.test(lowerName) || Boolean(textContent && (imgError || (!isImage && !isPdf && !isVideo && !isAudio)));

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => setZoom(1);

  const handleSpeedChange = (e) => {
    const rate = parseFloat(e.target.value);
    setPlaybackRate(rate);
    const videoEl = document.getElementById('preview-video-player');
    if (videoEl) videoEl.playbackRate = rate;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[350px] p-8 text-slate-400">
        <Loader2 size={36} className="animate-spin text-emerald-500 mb-3" />
        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Retrieving Encrypted Evidence Exhibit...</p>
        <p className="text-xs text-slate-400 mt-1">Verifying custody access tokens & streaming bytes from vault</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[350px] p-8 text-center">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-500 flex items-center justify-center mb-3">
          <AlertCircle size={26} />
        </div>
        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Unable to Render Evidence Preview</p>
        <p className="text-xs text-rose-600 dark:text-rose-400 mt-1 max-w-sm">{error}</p>
        <a 
          href={getDownloadUrl(documentId)} 
          target="_blank" 
          rel="noreferrer"
          className="mt-4 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2 transition-colors"
        >
          <Download size={14} /> Download File Directly
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-900/5 dark:bg-slate-950/40 select-none">
      {/* Exhibit Sub-header Controls */}
      <div className="px-2.5 py-1.5 bg-slate-100/80 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-1.5 overflow-x-auto scrollbar-none text-xs text-slate-600 dark:text-slate-400 shrink-0">
        <div className="flex items-center gap-1.5 shrink-0 min-w-0">
          {isPdf && <FileText size={14} className="text-rose-500 shrink-0" />}
          {isImage && <ImageIcon size={14} className="text-blue-500 shrink-0" />}
          {isVideo && <Film size={14} className="text-purple-500 shrink-0" />}
          {isAudio && <Volume2 size={14} className="text-emerald-500 shrink-0" />}
          {isText && <FileCode size={14} className="text-amber-500 shrink-0" />}
          <span 
            className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[90px] xl:max-w-[130px] text-[11px]"
            title={filename}
          >
            {filename}
          </span>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold uppercase shrink-0">
            {fileData?.blob?.size ? `${(fileData.blob.size / 1024).toFixed(1)} KB` : 'Binary'}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Zoom controls for Images */}
          {isImage && (
            <div className="flex items-center bg-white dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700 mr-1 shrink-0">
              <button 
                onClick={handleZoomOut} 
                title="Zoom Out"
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                <ZoomOut size={12} />
              </button>
              <span className="text-[9px] font-mono font-bold px-1 text-slate-700 dark:text-slate-300">
                {Math.round(zoom * 100)}%
              </span>
              <button 
                onClick={handleZoomIn} 
                title="Zoom In"
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                <ZoomIn size={12} />
              </button>
              <button 
                onClick={handleResetZoom} 
                title="Reset Zoom"
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                <RotateCcw size={12} />
              </button>
            </div>
          )}

          {/* Speed controls for Video */}
          {isVideo && (
            <div className="flex items-center gap-1 mr-1 bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0">
              <Gauge size={12} className="text-slate-400" />
              <select 
                value={playbackRate} 
                onChange={handleSpeedChange}
                className="bg-transparent text-[10px] font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
              >
                <option value={0.5}>0.5x</option>
                <option value={1}>1.0x</option>
                <option value={1.25}>1.25x</option>
                <option value={1.5}>1.5x</option>
                <option value={2}>2.0x</option>
              </select>
            </div>
          )}

          {/* PKI & BSA Certificate Tools */}
          <button
            type="button"
            onClick={handleSignExhibit}
            disabled={signing}
            className="whitespace-nowrap shrink-0 px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold flex items-center gap-1 transition-all shadow-2xs cursor-pointer"
            title="Digitally Sign Exhibit with RSA-2048 PKI Key"
          >
            <Key size={12} className={signing ? 'animate-spin' : ''} />
            <span>Sign PKI</span>
          </button>

          <button
            type="button"
            onClick={handleViewCertificate}
            className="whitespace-nowrap shrink-0 px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold flex items-center gap-1 transition-all shadow-2xs cursor-pointer"
            title="View Bharatiya Sakshya Adhiniyam 2023 Sec 63 Electronic Certificate"
          >
            <Award size={12} />
            <span>BSA Cert</span>
          </button>

          {/* Tamper Simulation Demo Tool */}
          <div className="flex items-center gap-1 border-l border-slate-300 dark:border-slate-700 pl-1.5 ml-0.5 flex-nowrap shrink-0">
            {!tamperState?.isTampered ? (
              <button
                type="button"
                onClick={handleSimulateTamper}
                className="whitespace-nowrap shrink-0 px-2 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-[10px] font-black flex items-center gap-1 cursor-pointer"
                title="Integrity demo: mutate 1 byte of the stored S3 object to trigger the tamper alert"
              >
                <Flame size={12} />
                <span>Simulate</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleRestoreTamper}
                className="whitespace-nowrap shrink-0 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 text-[10px] font-bold flex items-center gap-1 cursor-pointer border border-emerald-500/50"
                title="Restore original authentic storage blob"
              >
                <RotateCcw size={12} />
                <span>Restore</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleRunLiveCheck}
              className="whitespace-nowrap shrink-0 px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer"
              title="Verify SHA-256 Checksum"
            >
              <ShieldCheck size={12} className="text-emerald-400" />
              <span>Verify</span>
            </button>
          </div>

          {/* Direct Open & Download */}
          <a
            href={fileData?.objectUrl}
            target="_blank"
            rel="noreferrer"
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300 transition-colors shrink-0"
            title="Open In New Window"
          >
            <ExternalLink size={13} />
          </a>
          <a
            href={fileData?.objectUrl}
            download={filename}
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300 transition-colors shrink-0"
            title="Download Evidence Payload"
          >
            <Download size={13} />
          </a>
        </div>
      </div>

      {/* Live Verification / Tamper Banners (Prominently at the Top) */}
      {(signedInfo || liveCheckResult || tamperState) && (
        <div className="p-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 space-y-2 z-10">
          {signedInfo && (
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
                <span className="font-bold">Digitally Signed (RSA-2048 / SHA-256):</span>
                <span className="font-mono text-[11px] opacity-80">{signedInfo.signedBy} ({signedInfo.badgeNumber})</span>
              </div>
              <span className="font-mono text-[10px] bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded font-bold">
                Key Fingerprint: {signedInfo.keyFingerprint}
              </span>
            </div>
          )}

          {liveCheckResult && (
            <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-bold ${
              liveCheckResult.isTamperFree 
                ? 'bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-200 dark:border-emerald-800' 
                : 'bg-rose-50 text-rose-900 border-rose-300 dark:bg-rose-950/50 dark:text-rose-200 dark:border-rose-800'
            }`}>
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className={liveCheckResult.isTamperFree ? 'text-emerald-600' : 'text-rose-600 animate-bounce'} />
                <span>{liveCheckResult.isTamperFree ? 'VERIFIED AUTHENTIC: Live SHA-256 Checksum Matches Vault Fingerprint' : '🚨 TAMPER DETECTED: Storage bytes do not match SHA-256 Checksum!'}</span>
              </div>
              <span className="font-mono text-[10px] font-bold">
                {liveCheckResult.computedHash?.substring(0, 16)}...
              </span>
            </div>
          )}

          {tamperState && !liveCheckResult && (
            <div className={`p-2 rounded-xl text-xs font-bold flex items-center justify-between ${
              tamperState.isTampered ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
            }`}>
              <span>{tamperState.message}</span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-white/60 rounded">Demo Action</span>
            </div>
          )}
        </div>
      )}

      {/* Main Preview Viewport */}
      <div className="flex-1 overflow-auto p-4 flex items-center justify-center relative min-h-[400px]">
        {/* PDF Viewer */}
        {isPdf && (
          <div className="w-full h-full min-h-[500px] rounded-xl overflow-hidden shadow-inner border border-slate-200 dark:border-slate-800 bg-white">
            <iframe 
              src={`${fileData?.objectUrl}#toolbar=1&navpanes=0${searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ''}`} 
              className="w-full h-full min-h-[500px]"
              title={`Evidence Exhibit: ${filename}`}
            />
          </div>
        )}

        {/* High-Resolution Image Viewer with Zoom & Graceful Fallback */}
        {isImage && !imgError && (
          <div className="w-full h-full flex items-center justify-center overflow-auto p-2">
            <img 
              src={fileData?.objectUrl} 
              alt={filename}
              onError={() => setImgError(true)}
              style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
              className="max-h-[60vh] max-w-full object-contain rounded-xl shadow-lg transition-transform duration-150 ease-out select-none"
            />
          </div>
        )}

        {/* Video Player */}
        {isVideo && (
          <div className="w-full h-full flex flex-col items-center justify-center max-w-3xl">
            <video 
              id="preview-video-player"
              src={fileData?.objectUrl} 
              controls 
              autoPlay={false}
              className="w-full max-h-[60vh] rounded-2xl shadow-xl bg-black border border-slate-800"
            />
            <p className="text-[11px] text-slate-400 font-mono mt-3">
              Forensic playback with frame-rate sync • NyayVault Tamper-Proof Storage
            </p>
          </div>
        )}

        {/* Audio Player */}
        {isAudio && (
          <div className="w-full max-w-md p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-inner">
              <Volume2 size={32} />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">{filename}</h4>
              <p className="text-xs text-slate-400 mt-0.5">Encrypted Audio Exhibit Recording</p>
            </div>
            <audio 
              src={fileData?.objectUrl} 
              controls 
              className="w-full mt-2" 
            />
          </div>
        )}

        {/* Formatted Legal Record / Monospace Code / Text Exhibit Viewer */}
        {(isText || (isImage && imgError)) && (
          <div className="w-full h-full max-h-[65vh] bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Authenticated Case Record Transcript</span>
              </div>
              <span className="text-slate-400 font-mono text-[10px]">BSA 2023 Sec 63 Compliant</span>
            </div>
            <pre className="whitespace-pre-wrap break-words leading-relaxed font-mono text-xs text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-950/70 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800">
              {textContent || initialText || 'No transcript text available for this exhibit.'}
            </pre>
          </div>
        )}

        {/* Generic File Fallback */}
        {!isPdf && !isImage && !isVideo && !isAudio && !isText && (
          <div className="flex flex-col items-center justify-center text-center p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs max-w-md">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center mb-3">
              <FileText size={32} />
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">{filename}</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4 leading-relaxed">
              Binary evidence archive ({fileData?.contentType || 'application/octet-stream'}). Direct in-browser parsing not available for this proprietary format.
            </p>
            <a 
              href={fileData?.objectUrl} 
              download={filename}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-blue-600/20 transition-all cursor-pointer"
            >
              <Download size={14} /> Download Raw Exhibit
            </a>
          </div>
        )}
      </div>

      {/* BSA 2023 Section 63 Electronic Evidence Certificate Modal */}
      {certModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-xs uppercase tracking-wider">
                <Award size={18} />
                <span>Section 63 BSA 2023 Electronic Certificate</span>
              </div>
              <button 
                onClick={() => setCertModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 font-mono space-y-1">
                <div className="flex justify-between font-bold text-slate-900 dark:text-white">
                  <span>Cert ID: {certModal.certificateId}</span>
                  <span className="text-emerald-600 dark:text-emerald-400">VALID ADMISSIBLE</span>
                </div>
                <div className="text-[11px] text-slate-500">Issued: {new Date(certModal.issuedAt).toLocaleString('en-IN')}</div>
              </div>

              <div className="space-y-1.5">
                <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[10px]">Statutory Legal Declaration:</span>
                <p className="text-slate-600 dark:text-slate-300 italic bg-blue-50/50 dark:bg-blue-950/30 p-3 rounded-xl border border-blue-100 dark:border-blue-900/40 text-[11px]">
                  "{certModal.legalDeclaration}"
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
                  <span className="font-bold text-slate-500 block text-[10px]">CASE DETAILS</span>
                  <div className="font-bold text-slate-900 dark:text-white mt-1">{certModal.caseInfo.caseNumber}</div>
                  <div className="text-slate-500 truncate">{certModal.caseInfo.title}</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
                  <span className="font-bold text-slate-500 block text-[10px]">CERTIFYING CUSTODIAN</span>
                  <div className="font-bold text-slate-900 dark:text-white mt-1">{certModal.custodian.name}</div>
                  <div className="text-slate-500">{certModal.custodian.badgeNumber} • {certModal.custodian.department}</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 text-white font-mono text-[10px] space-y-1">
                <div className="text-slate-400 uppercase font-bold">Cryptographic Digest & Seal</div>
                <div className="truncate text-emerald-400">SHA-256: {certModal.evidenceExhibit.sha256Hash}</div>
                <div className="text-slate-400">Key Fingerprint: {certModal.pkiSignature.keyFingerprint} ({certModal.pkiSignature.algorithm})</div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setCertModal(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 text-xs font-bold cursor-pointer"
              >
                Close Certificate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
