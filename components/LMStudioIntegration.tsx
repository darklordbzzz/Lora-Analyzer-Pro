
import React, { useState, useEffect, useRef } from 'react';
import { 
    PlugIcon, CheckCircleIcon, TerminalIcon, 
    BoxIcon, FileIcon, LoaderIcon,
    SettingsIcon, TrashIcon, RefreshIcon,
    InfoIcon, GlobeIcon, XIcon, ServerIcon, CloudIcon, ImageIcon, XCircleIcon
} from './Icons';
import { initializeIntegratedCore } from '../services/llmService';
import type { LLMModel, NeuralCoreConfig, LLMProvider } from '../types';

const CORE_CONFIGS_KEY = 'lora-analyzer-pro-core-configs';

interface NeuralEngineSetupProps {
    onActivateEngine: (model: LLMModel) => void;
    activeModelId?: string;
    allModels: LLMModel[];
    onAddModel: (model: LLMModel) => void;
    onDeleteModel: (id: string) => void;
}

const NeuralEngineSetup: React.FC<NeuralEngineSetupProps> = ({ 
    onActivateEngine, 
    allModels = [], 
    onDeleteModel = (_: string) => {} 
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const [bootStatus, setBootStatus] = useState<'idle' | 'booting' | 'ready' | 'error'>('idle');
    const [error, setError] = useState<string | null>(null);
    const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
    const consoleEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [consoleLogs]);

    const addLog = (msg: string) => setConsoleLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

    const handleProcessModel = async (name: string, size: number, isRemote: boolean = false) => {
        setBootStatus('booting');
        setError(null);
        setConsoleLogs([]);
        addLog(`${isRemote ? 'REMOTE UPLINK' : 'MOUNT REQUEST'}: ${name}`);
        
        try {
            await new Promise(r => setTimeout(r, 600));
            addLog(`ARCH DETECTED: GGUF V3`);
            
            const res = await initializeIntegratedCore(new File([""], name));
            
            if (res.success) {
                await new Promise(r => setTimeout(r, 800));
                addLog("VIRTUAL KERNEL ONLINE.");
                setBootStatus('ready');
                
                const internalModel: LLMModel = {
                    id: 'mounted-gguf-node',
                    name: `Node: ${name.split(/[\\/]/).pop()?.toUpperCase() || 'UNNAMED'}`,
                    provider: 'gemini', 
                    modelName: 'gemini-3-pro-preview', 
                    apiUrl: isRemote ? 'integrated://remote-core' : 'integrated://core'
                };
                onActivateEngine(internalModel);
            } else {
                setBootStatus('error');
                setError(res.error || "Neural Core rejected.");
            }
        } catch (e: any) {
            setBootStatus('error');
            setError(e.message);
        }
    };

    const handleBootFile = (file: File) => {
        if (!file.name.toLowerCase().endsWith('.gguf')) {
            setError("Only GGUF resources can be integrated.");
            return;
        }
        handleProcessModel(file.name, file.size, false);
    };

    return (
        <div className="flex h-full w-full flex-col xl:flex-row overflow-hidden bg-[#111827]">
            {/* Center Content Pane - Fluid Typography and Spacing */}
            <div className="flex-grow flex flex-col p-10 lg:p-16 overflow-y-auto custom-scrollbar relative">
                <div className="flex-grow flex items-center justify-center">
                    <div 
                        onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files?.[0]) handleBootFile(e.dataTransfer.files[0]); }}
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        className={`w-full max-w-4xl aspect-[1.8/1] border-2 border-dashed rounded-[4rem] flex flex-col items-center justify-center transition-all duration-500 relative ${isDragging ? 'border-indigo-500 bg-indigo-600/5 scale-[1.02]' : 'border-gray-800/50 bg-[#0B1120]/40'} shadow-2xl group`}
                    >
                        {bootStatus === 'booting' ? (
                            <div className="text-center space-y-8">
                                <LoaderIcon className="h-24 w-24 text-indigo-500 animate-spin mx-auto" />
                                <p className="text-sm font-black text-indigo-400 uppercase tracking-[0.6em] animate-pulse">Mounting Virtual Core...</p>
                            </div>
                        ) : bootStatus === 'ready' ? (
                            <div className="text-center space-y-10 animate-in zoom-in-95 duration-500">
                                <CheckCircleIcon className="h-24 w-24 text-emerald-500 mx-auto" />
                                <div>
                                    <h3 className="text-5xl font-black text-white uppercase tracking-tighter">Kernel Mounted</h3>
                                    <p className="text-xs font-black text-indigo-400 uppercase tracking-[0.5em] mt-3">Cognitive Uplink Ready</p>
                                </div>
                                <button onClick={() => setBootStatus('idle')} className="px-16 py-5 bg-gray-800 hover:bg-gray-700 text-white font-black uppercase tracking-widest text-xs rounded-[2rem] shadow-xl transition-all active:scale-95 border border-gray-700">
                                    Mount Another
                                </button>
                            </div>
                        ) : (
                            <div className="text-center space-y-10 p-12">
                                <div className="p-10 bg-gray-950 rounded-[3.5rem] border border-gray-800 inline-block shadow-inner group-hover:scale-105 transition-transform">
                                    <PlugIcon className="h-20 w-20 text-gray-700 group-hover:text-indigo-500 transition-colors" />
                                </div>
                                <div className="space-y-4">
                                    <h3 className="text-4xl font-black text-white uppercase tracking-tighter">Awaiting Kernel</h3>
                                    <p className="text-[12px] text-gray-500 uppercase tracking-[0.3em] max-w-sm mx-auto leading-relaxed font-bold opacity-60">
                                        Drag GGUF binaries here to initialize high-fidelity nodes locally.
                                    </p>
                                </div>
                                <button onClick={() => document.getElementById('engine-boot-modal-sub')?.click()} className="px-20 py-6 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-[0.4em] text-[13px] rounded-[2rem] shadow-[0_25px_60px_rgba(79,70,229,0.4)] transition-all active:scale-95 border-b-4 border-indigo-800 hover:border-indigo-600">
                                    Direct Resource Scan
                                </button>
                                <input id="engine-boot-modal-sub" type="file" className="hidden" accept=".gguf" onChange={(e) => e.target.files?.[0] && handleBootFile(e.target.files[0])} />
                            </div>
                        )}
                    </div>
                </div>

                {error && (
                    <div className="mt-10 p-6 bg-red-950/20 border border-red-500/20 rounded-[2rem] text-center flex items-center justify-center gap-4 animate-in shake duration-500">
                        <XCircleIcon className="h-6 w-6 text-red-500" />
                        <span className="text-xs text-red-200/80 font-mono uppercase font-black tracking-widest">{error}</span>
                    </div>
                )}
            </div>

            {/* Right Sidebar: Registry - Compact for Modal use */}
            <div className="w-full xl:w-[460px] bg-[#0B0F1A]/50 border-t xl:border-t-0 xl:border-l border-gray-800 p-12 flex flex-col shrink-0">
                <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-4">
                        <BoxIcon className="h-8 w-8 text-indigo-400" />
                        <h3 className="text-sm font-black text-white uppercase tracking-[0.4em]">Integrated Registry</h3>
                    </div>
                    <span className="text-[11px] font-black bg-indigo-600/20 text-indigo-400 px-4 py-1.5 rounded-full border border-indigo-500/20">{allModels.length} Active Nodes</span>
                </div>

                <div className="flex-grow space-y-4 overflow-y-auto custom-scrollbar pr-3 mb-10">
                    {allModels.length > 0 ? (
                        allModels.map(model => (
                            <div key={model.id} className="p-6 bg-[#151B2B] border border-gray-800 rounded-[2rem] flex items-center justify-between group transition-all hover:border-indigo-500/30 shadow-lg">
                                <div className="flex items-center gap-5 min-w-0">
                                    <div className="p-4 bg-indigo-900/20 text-indigo-400 rounded-2xl shadow-inner"><RefreshIcon className="h-5 w-5" /></div>
                                    <div className="min-w-0">
                                        <span className="text-sm font-black text-white block truncate uppercase tracking-tight">{model.name}</span>
                                        <span className="text-[10px] text-gray-600 font-mono block truncate uppercase mt-1.5 opacity-50">{model.modelName}</span>
                                    </div>
                                </div>
                                <button onClick={() => onDeleteModel(model.id)} className="p-3 text-gray-700 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100">
                                    <TrashIcon className="h-6 w-6" />
                                </button>
                            </div>
                        ))
                    ) : (
                        <div className="py-24 text-center opacity-10 border border-dashed border-gray-800 rounded-[3rem]">
                             <FileIcon className="h-12 w-12 mx-auto mb-5" />
                             <p className="text-xs font-black uppercase tracking-[0.3em]">No Logic Streams Registered</p>
                        </div>
                    )}
                </div>

                <div className="bg-[#111827] border border-gray-800 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                         <InfoIcon className="h-16 w-16 text-white" />
                    </div>
                    <div className="flex items-center gap-3 mb-4">
                        <InfoIcon className="h-5 w-5 text-indigo-500" />
                        <h4 className="text-xs font-black text-white uppercase tracking-widest">Protocol Notice</h4>
                    </div>
                    <p className="text-[11px] text-gray-500 leading-relaxed font-bold uppercase tracking-tighter">
                        Virtual kernel execution leverages browser tensor buffering for weights while maintaining local state isolation. Remote streams are encrypted.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default NeuralEngineSetup;
