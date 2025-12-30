
import React, { useEffect, useState, useRef } from 'react';
// Added missing XCircleIcon to imports
import { LoaderIcon, DownloadIcon, CheckCircleIcon, XIcon, ServerIcon, InfoIcon, CopyIcon, CloudIcon, XCircleIcon } from './Icons';
import { pullModel } from '../services/ollamaService';
import { OllamaPullProgress } from '../types';

interface ModelInstallModalProps {
    isOpen: boolean;
    onClose: () => void;
    modelName: string;
    baseUrl: string;
    onComplete: () => void;
    onConnectionError?: () => void;
    onSkipToCloud?: () => void;
}

const ModelInstallModal: React.FC<ModelInstallModalProps> = ({ isOpen, onClose, modelName, baseUrl, onComplete, onConnectionError, onSkipToCloud }) => {
    const [progress, setProgress] = useState<OllamaPullProgress | null>(null);
    const [status, setStatus] = useState<'starting' | 'downloading' | 'verifying' | 'done' | 'error' | 'cors_error'>('starting');
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const hasStartedRef = useRef(false);
    const isMountedRef = useRef(true);

    const corsCommand = `OLLAMA_ORIGINS="*" ollama serve`;

    const handleCopy = () => {
        navigator.clipboard.writeText(corsCommand);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    useEffect(() => {
        isMountedRef.current = true;
        return () => { isMountedRef.current = false; };
    }, []);

    useEffect(() => {
        if (!isOpen) {
            hasStartedRef.current = false;
            setProgress(null);
            setStatus('starting');
            setError(null);
            return;
        }

        if (hasStartedRef.current) return;
        hasStartedRef.current = true;

        const startDownload = async () => {
            try {
                const cleanBaseUrl = baseUrl.replace(/\/v1\/?$/, '');
                setStatus('downloading');
                
                await pullModel(cleanBaseUrl, modelName, (p) => {
                    if (!isMountedRef.current) return;
                    setProgress(p);
                    if (p.status === 'success') {
                        setStatus('done');
                        setTimeout(() => { if (isMountedRef.current) onComplete(); }, 800);
                    }
                    if (p.status.includes('verifying') || p.status.includes('digest')) setStatus('verifying');
                });
                
                if (!isMountedRef.current) return;
                setStatus('done');
                setTimeout(() => { if (isMountedRef.current) onComplete(); }, 1200);
            } catch (e: any) {
                if (!isMountedRef.current) return;
                if (e.code === 'OLLAMA_CORS_ERROR' || e.message.includes('Failed to fetch') || e.message.includes('NetworkError')) {
                    setStatus('cors_error');
                } else {
                    setStatus('error');
                }
                setError(e.message || "Installation Interrupted.");
            }
        };

        startDownload();
    }, [isOpen, modelName, baseUrl, onComplete]);

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300" 
            onClick={onClose}
        >
            <div 
                className="bg-[#111827] rounded-[2.5rem] shadow-2xl w-full max-w-xl border border-gray-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-500" 
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-[#1F2937]/50 p-8 border-b border-gray-800 flex justify-between items-center">
                    <div className="flex items-center gap-5">
                        <div className={`p-4 rounded-2xl ${status.includes('error') ? 'bg-red-500/20 text-red-500' : 'bg-indigo-500/20 text-indigo-500'}`}>
                            {status.includes('error') ? <XIcon className="h-6 w-6"/> : <DownloadIcon className="h-6 w-6" />}
                        </div>
                        <div>
                            <h3 className="font-black text-white uppercase tracking-tighter text-xl">
                                {status === 'cors_error' ? 'Connection Fault' : status === 'error' ? 'Install Error' : status === 'done' ? 'Install Success' : 'Intake Sequence'}
                            </h3>
                            <p className="text-[9px] text-indigo-400 font-black uppercase tracking-[0.4em] mt-1">{modelName}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 bg-gray-800 text-gray-500 hover:text-white rounded-full transition-all hover:rotate-90">
                        <XIcon className="h-6 w-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-10 space-y-8">
                    {status === 'cors_error' ? (
                        <div className="space-y-6">
                            <div className="bg-red-950/20 p-6 rounded-2xl border border-red-500/20 text-center">
                                <p className="text-red-400 text-xs font-black uppercase tracking-widest mb-3">Browser Protocol Lock</p>
                                <p className="text-gray-400 text-[11px] leading-relaxed uppercase font-bold tracking-tighter">Site settings are blocking the local node connection. Deploy the bypass command in terminal:</p>
                            </div>

                            <div className="relative group">
                                <pre className="bg-black/60 text-emerald-400 font-mono text-[11px] p-6 rounded-2xl border border-gray-800 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                                    {corsCommand}
                                </pre>
                                <button 
                                    onClick={handleCopy}
                                    className="absolute top-4 right-4 p-3 bg-gray-800 hover:bg-indigo-600 text-white rounded-xl transition-all shadow-xl flex items-center gap-2"
                                >
                                    {copied ? <CheckCircleIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
                                    <span className="text-[9px] font-black uppercase tracking-widest">{copied ? 'Copied' : 'Copy'}</span>
                                </button>
                            </div>

                            <div className="flex flex-col gap-3 pt-4">
                                <button onClick={() => onSkipToCloud?.()} className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-[0.3em] text-[10px] rounded-2xl shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3">
                                    <CloudIcon className="h-4 w-4" /> Switch to Cloud Instance
                                </button>
                                <p className="text-[8px] text-center text-gray-600 uppercase font-black tracking-widest">Local assets remain in storage until protocol is cleared.</p>
                            </div>
                        </div>
                    ) : status === 'error' ? (
                        <div className="text-center space-y-6 py-10">
                            <div className="p-8 bg-red-500/10 rounded-full inline-block">
                                <XCircleIcon className="h-16 w-16 text-red-500" />
                            </div>
                            <div className="space-y-2">
                                <p className="text-sm text-gray-300 font-mono uppercase tracking-tighter bg-gray-950 p-6 rounded-2xl border border-gray-800 max-w-sm mx-auto">
                                    {error}
                                </p>
                            </div>
                            <button onClick={onClose} className="px-12 py-4 bg-gray-800 hover:bg-gray-700 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white transition-all shadow-xl">
                                Terminate Sequence
                            </button>
                        </div>
                    ) : status === 'done' ? (
                        <div className="text-center space-y-6 py-10 animate-in zoom-in-95 duration-500">
                            <div className="p-8 bg-emerald-500/10 rounded-full inline-block animate-pulse">
                                <CheckCircleIcon className="h-16 w-16 text-emerald-500" />
                            </div>
                            <div>
                                <h4 className="text-3xl font-black text-white uppercase tracking-tighter">Ready to Deploy</h4>
                                <p className="text-[10px] text-emerald-500 font-black uppercase tracking-[0.4em] mt-2">Asset integration complete.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-8 py-4">
                            <div className="flex justify-between items-end">
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">{progress?.status || 'INITIALIZING...'}</span>
                                {progress?.total && progress?.completed && (
                                    <span className="text-indigo-400 font-mono text-xl font-black">
                                        {Math.round((progress.completed / progress.total) * 100)}%
                                    </span>
                                )}
                            </div>

                            <div className="h-4 w-full bg-gray-950 rounded-full overflow-hidden border border-gray-800 relative shadow-inner">
                                {progress?.total && progress?.completed ? (
                                    <div 
                                        className="h-full bg-indigo-500 transition-all duration-700 ease-out shadow-[0_0_15px_#6366f1]"
                                        style={{ width: `${(progress.completed / progress.total) * 100}%` }}
                                    />
                                ) : (
                                    <div className="h-full bg-indigo-600/30 w-full animate-pulse" />
                                )}
                            </div>
                            
                            <p className="text-[8px] text-gray-600 text-center uppercase font-black tracking-widest">
                                The ingestion pipeline will continue operating if this interface is collapsed.
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-[#1F2937]/30 p-4 border-t border-gray-800 flex justify-between items-center px-10">
                    <span className="flex items-center gap-3 text-[10px] font-black text-gray-600 uppercase tracking-widest">
                        <ServerIcon className="h-4 w-4" />
                        {baseUrl}
                    </span>
                    {status === 'downloading' && (
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Bitstream Active</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ModelInstallModal;
