
import React, { useState } from 'react';
// Added XCircleIcon to imports
import { XIcon, ServerIcon, CopyIcon, CheckCircleIcon, InfoIcon, CloudIcon, TerminalIcon, BoxIcon, GlobeIcon, PlugIcon, XCircleIcon } from './Icons';

interface ConnectionHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ConnectionHelpModal: React.FC<ConnectionHelpModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'lmstudio' | 'ollama' | 'httpmode'>('httpmode');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 backdrop-blur-xl animate-in fade-in duration-300" onClick={onClose}>
      <div className="bg-[#111827] rounded-[3rem] shadow-[0_0_100px_rgba(239,68,68,0.2)] w-full max-w-3xl border border-red-500/30 flex flex-col overflow-hidden animate-in zoom-in-95 duration-500" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="bg-red-950/20 p-10 border-b border-gray-800 flex gap-8 items-center">
            <div className="p-5 bg-red-500/10 rounded-3xl shrink-0 text-red-500 border border-red-500/20 shadow-2xl">
                <XCircleIcon className="h-10 w-10" />
            </div>
            <div className="flex-grow">
                <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tighter">Security Blockade Detected</h2>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest opacity-60">
                    The browser is preventing uplink to local nodes due to protocol mismatch.
                </p>
            </div>
            <button onClick={onClose} className="p-3 bg-gray-800 text-gray-500 hover:text-white rounded-full transition-all hover:rotate-90 shadow-xl">
                <XIcon className="h-6 w-6" />
            </button>
        </div>

        {/* Content */}
        <div className="p-10 space-y-10 max-h-[60vh] overflow-y-auto custom-scrollbar">
            
            {/* Nav Tabs */}
            <div className="flex gap-2 bg-gray-950 p-2 rounded-2xl border border-gray-800">
                <button 
                    onClick={() => setActiveTab('httpmode')}
                    className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'httpmode' ? 'bg-indigo-600 text-white shadow-xl' : 'text-gray-600 hover:text-gray-300'}`}
                >
                    HTTP Mode (Fix)
                </button>
                <button 
                    onClick={() => setActiveTab('lmstudio')}
                    className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'lmstudio' ? 'bg-indigo-600 text-white shadow-xl' : 'text-gray-600 hover:text-gray-300'}`}
                >
                    LM Studio
                </button>
                <button 
                    onClick={() => setActiveTab('ollama')}
                    className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'ollama' ? 'bg-indigo-600 text-white shadow-xl' : 'text-gray-600 hover:text-gray-300'}`}
                >
                    Ollama Node
                </button>
            </div>

            {activeTab === 'httpmode' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                    <div className="bg-indigo-600/10 border border-indigo-500/30 p-8 rounded-[2rem] shadow-inner">
                        <h4 className="text-sm font-black text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-3">
                             <PlugIcon className="h-5 w-5" /> The Local Uplink Solution
                        </h4>
                        <p className="text-sm text-gray-300 leading-relaxed mb-6 font-medium">
                            To communicate with ComfyUI or Ollama without CORS errors, the Hub must run on the same protocol as your nodes (<b>HTTP</b>). 
                        </p>
                        <div className="bg-black/60 p-6 rounded-2xl border border-indigo-500/20 space-y-4">
                            <span className="text-[10px] text-indigo-400 font-black uppercase tracking-widest block mb-2">Deployment Strategy</span>
                            <p className="text-xs text-gray-500 leading-relaxed uppercase font-bold tracking-tighter">Download this application and run it locally with a standard web server:</p>
                            <code className="block bg-gray-900 p-4 rounded-xl text-green-400 font-mono text-xs border border-green-500/10">npx serve . --port 8080</code>
                            <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest">THEN ACCESS VIA: <span className="text-white">http://localhost:8080</span></p>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'lmstudio' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                    <div className="bg-gray-800/40 p-8 rounded-[2rem] border border-gray-700 shadow-inner">
                        <h3 className="font-black text-white mb-6 uppercase text-sm tracking-[0.2em] flex items-center gap-3">
                            <TerminalIcon className="h-5 w-5 text-indigo-400" /> LM Studio Configuration
                        </h3>
                        <ul className="text-xs text-gray-400 space-y-6 list-none uppercase font-black tracking-widest opacity-80">
                            <li className="flex gap-5 items-center">
                                <span className="shrink-0 w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs shadow-lg">1</span>
                                <div>Open LM Studio "Local Server" tab.</div>
                            </li>
                            <li className="flex gap-5 items-center">
                                <span className="shrink-0 w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs shadow-lg">2</span>
                                <div>Enable <span className="text-indigo-400">Cross-Origin Resource Sharing (CORS)</span>.</div>
                            </li>
                            <li className="flex gap-5 items-center">
                                <span className="shrink-0 w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs shadow-lg">3</span>
                                <div>Set Server Port to <span className="text-indigo-400">1234</span> and press START.</div>
                            </li>
                        </ul>
                    </div>
                </div>
            )}

            {activeTab === 'ollama' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                     <div className="bg-gray-800/40 rounded-[2rem] p-8 border border-gray-700 shadow-inner">
                        <h3 className="font-black text-white mb-6 uppercase text-sm tracking-[0.2em] flex items-center gap-3">
                            <TerminalIcon className="h-5 w-5 text-indigo-400" /> Unlocking Network Origins
                        </h3>
                        <p className="text-[11px] text-gray-500 mb-6 leading-relaxed uppercase font-black tracking-widest">
                            Run this command in terminal to permit Hub access to your local Ollama node:
                        </p>
                        <div className="relative group">
                            <pre className="bg-black/60 text-emerald-400 font-mono text-[11px] p-8 rounded-2xl border border-gray-800 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                                {`OLLAMA_ORIGINS="*" ollama serve`}
                            </pre>
                            <button 
                                onClick={() => { navigator.clipboard.writeText('OLLAMA_ORIGINS="*" ollama serve'); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                                className="absolute top-4 right-4 p-3 bg-gray-800 hover:bg-indigo-600 text-white rounded-xl transition-all shadow-xl flex items-center gap-2"
                            >
                                {copied ? <CheckCircleIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
                                <span className="text-[9px] font-black uppercase tracking-widest">Copy</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
        
        <div className="p-8 bg-gray-900 border-t border-gray-800 flex justify-between items-center px-12">
            <span className="text-[10px] text-gray-600 font-black uppercase tracking-[0.4em] flex items-center gap-3">
                <GlobeIcon className="h-4 w-4" /> Cognitive Protocol Aid
            </span>
            <button onClick={onClose} className="px-10 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest text-[11px] rounded-[1.5rem] transition-all active:scale-95 shadow-[0_20px_40px_rgba(79,70,229,0.3)]">
                Protocol Acknowledged
            </button>
        </div>
      </div>
    </div>
  );
};

export default ConnectionHelpModal;
