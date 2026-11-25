import { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Bot, 
  User, 
  Loader2, 
  FileText, 
  ChevronRight, 
  Sparkles, 
  Scale, 
  ShieldCheck, 
  HelpCircle, 
  Copy, 
  Check,
  AlertTriangle,
  Lightbulb,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchApi } from '../services/api';
import DocumentPreviewer from './DocumentPreviewer';

const PROMPT_SUGGESTIONS = [
  { id: 1, text: "Highlight timeline gaps or contradictions in the FIR", icon: AlertTriangle },
  { id: 2, text: "Compare witness statements against forensic findings", icon: Scale },
  { id: 3, text: "List all seized ballistic & physical evidence items", icon: ShieldCheck },
  { id: 4, text: "Check admissibility under Sec 63 Bharatiya Sakshya Adhiniyam", icon: FileText }
];

export default function CaseAssistant({ caseId }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Greetings Officer. I am your NyayVault AI Legal Intelligence Assistant. I have indexed all witness statements, forensic reports, and seizure memos in this case vault. How can I assist your investigation today?',
      sources: []
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [activeSource, setActiveSource] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (customPrompt) => {
    const textToSend = typeof customPrompt === 'string' ? customPrompt : input.trim();
    if (!textToSend || loading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: textToSend }]);
    setLoading(true);

    try {
      const res = await fetchApi(`/cases/${caseId}/chat`, {
        method: 'POST',
        body: { message: textToSend }
      });
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: res.response || 'Analysis complete with no direct matches found.',
        sources: res.sources || []
      }]);
    } catch (err) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Error connecting to AI Vault: ${err.message}. Please verify local model connectivity.`,
        isError: true 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (content, idx) => {
    navigator.clipboard.writeText(content);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div className="flex gap-4 h-[650px]">
      <div className={`flex flex-col h-full border border-slate-200 dark:border-slate-800 rounded-3xl bg-white dark:bg-slate-900 overflow-hidden shadow-xl transition-all duration-300 ${activeSource ? 'w-1/2' : 'w-full'}`}>
        {/* Header with AI Engine status */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Sparkles size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                  NyayVault AI Assistant
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                  RAG Engine
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>Contextually grounded on Case #{caseId} Records</span>
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 font-mono">
            <span>Zero PII Leakage</span>
          </div>
        </div>

        {/* Suggested Quick Question Prompts */}
        <div className="px-4 py-2.5 bg-slate-100/60 dark:bg-slate-800/30 border-b border-slate-200/80 dark:border-slate-800 overflow-x-auto scrollbar-none flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0 flex items-center gap-1">
            <Lightbulb size={12} className="text-amber-500" />
            Quick Prompts:
          </span>
          {PROMPT_SUGGESTIONS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                disabled={loading}
                onClick={() => handleSend(item.text)}
                className="text-xs px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-blue-600 hover:border-blue-300 dark:hover:border-blue-700 border border-slate-200 dark:border-slate-700 font-medium shrink-0 transition-all flex items-center gap-1.5 shadow-2xs disabled:opacity-50 cursor-pointer"
              >
                <Icon size={12} className="text-blue-500" />
                <span>{item.text}</span>
              </button>
            );
          })}
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-[#fbfcfe] dark:bg-slate-950/40">
          <AnimatePresence>
            {messages.map((msg, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shadow-xs ${
                  msg.role === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-slate-900 text-white dark:bg-slate-800 border border-slate-700'
                }`}>
                  {msg.role === 'user' ? <User size={15} /> : <Bot size={15} />}
                </div>
                
                <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} ${activeSource ? 'max-w-[95%]' : 'max-w-[85%]'}`}>
                  <div className={`p-4 rounded-2xl relative group ${
                    msg.role === 'user' 
                      ? 'bg-blue-600 text-white rounded-tr-xs shadow-md shadow-blue-600/15' 
                      : msg.isError 
                        ? 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/50' 
                        : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-tl-xs border border-slate-200 dark:border-slate-800 shadow-xs'
                  }`}>
                    <p className="whitespace-pre-wrap text-xs sm:text-sm leading-relaxed">{msg.content}</p>
                    
                    {/* Quick Copy Button */}
                    {msg.role !== 'user' && (
                      <button
                        onClick={() => handleCopy(msg.content, idx)}
                        className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-opacity p-1 rounded-md cursor-pointer"
                        title="Copy response"
                      >
                        {copiedIdx === idx ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                      </button>
                    )}
                  </div>
                  
                  {/* Source Citations with Expandable Excerpts */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-2.5 space-y-1.5 w-full">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1 ml-1">
                        <FileText size={11} className="text-blue-500" />
                        Verified Document Citations ({msg.sources.length}):
                      </div>
                      <div className={`grid gap-2 ${activeSource ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
                        {msg.sources.map((src, i) => (
                          <div 
                            key={i} 
                            onClick={() => setActiveSource(src)}
                            className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 cursor-pointer transition-colors group/cite"
                          >
                            <div className="flex items-center gap-1.5 font-bold text-blue-600 dark:text-blue-400 mb-1 truncate">
                              <FileText size={12} className="shrink-0" />
                              <span className="truncate group-hover/cite:underline decoration-blue-400 underline-offset-2">{src.filename}</span>
                            </div>
                            <p className="text-[11px] text-slate-600 dark:text-slate-400 italic line-clamp-2 leading-relaxed">
                              "{src.text_snippet}"
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}

            {loading && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-3"
              >
                <div className="shrink-0 w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                  <Bot size={15} />
                </div>
                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-tl-xs flex items-center gap-3 shadow-xs">
                  <Loader2 size={16} className="animate-spin text-blue-600" />
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Retrieving evidence vectors & cross-checking statements...
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="p-3.5 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
          <div className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={loading}
              placeholder="Ask question about this case (e.g. 'Compare witness timeline')..."
              className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl py-3 pl-4 pr-12 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-50 transition-all"
            />
            <button 
              type="submit"
              disabled={!input.trim() || loading}
              className="absolute right-2 p-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl disabled:opacity-40 transition-colors shadow-xs cursor-pointer"
            >
              <Send size={15} />
            </button>
          </div>
        </form>
      </div>

      <AnimatePresence>
        {activeSource && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: '50%' }}
            exit={{ opacity: 0, width: 0 }}
            className="h-full border border-slate-200 dark:border-slate-800 rounded-3xl bg-white dark:bg-slate-900 overflow-hidden shadow-xl relative shrink-0"
          >
             <button 
                onClick={() => setActiveSource(null)} 
                className="absolute top-2 right-2 z-10 p-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm cursor-pointer transition-colors"
                title="Close split view"
             >
                <X size={16} />
             </button>
             <div className="h-full pt-10 px-2 pb-2">
                 <DocumentPreviewer 
                    documentId={activeSource.document_id} 
                    filename={activeSource.filename} 
                    searchQuery={activeSource.text_snippet} 
                 />
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
