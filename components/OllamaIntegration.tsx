
import React, { useState, useEffect, useRef } from 'react';
import { 
    ServerIcon, LoaderIcon, CheckCircleIcon, RefreshIcon, 
    DownloadIcon, TrashIcon, TerminalIcon, BoxIcon, 
    GlobeIcon, InfoIcon, XCircleIcon, PlusIcon, PlugIcon
} from './Icons';
import { getInstalledModels, pullModel, deleteModel, checkOllamaConnection } from '../services/ollamaService';
import type { OllamaModelEntry, OllamaPullProgress, LLMModel } from '../types';

interface OllamaIntegrationProps {
    onSyncModels: (models: LLMModel[]) => void;
    currentModels: LLMModel[];
    onActivateModel?: (model: LLMModel) => void;
    activeModelId?: string;
}

const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
};

const OllamaIntegration: React.FC<OllamaIntegrationProps> = ({ onSyncModels, currentModels, onActivateModel, activeModelId }) => {
    const [baseUrl, setBaseUrl] = useState('http://127.0.0.1:11434');
    const [isConnected, setIsConnected] = useState(false);
    const [isChecking, setIsChecking] = useState(false);
    const [installedModels, setInstalledModels] = useState<OllamaModelEntry[]>([]);
    const [pullModelName, setPullModelName] = useState('');
    const [isPulling, setIsPulling] = useState(false);
    const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
    const [pullPercent, setPullPercent] = useState<number>(0);
    const [error, setError] = useState<string | null>(null);
    const consoleEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        checkConnection();
    }, []);

    useEffect(() => {
        consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [terminalLogs]);

    const addLog = (msg: string) => setTerminalLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

    const checkConnection = async () => {
        setIsChecking(true);
        setError(null);
        try {
            const connected = await checkOllamaConnection(baseUrl);
            setIsConnected(connected);
            if (connected) await fetchModels();
            else setError("Local node not responding. Ensure Ollama is running with OLLAMA_ORIGINS=\"*\".");
        } catch (e) {
            setError("Connection protocol failure.");
        } finally {
            setIsChecking(false);
        }
    };

    const fetchModels = async () => {
        try {
            const response = await getInstalledModels(baseUrl);
            const modelsRaw = response.models || [];
            const sortedModels = modelsRaw.sort((a, b) => new Date(b.modified_at).getTime() - new Date(a.modified_at).getTime());
            setInstalledModels(sortedModels);
            
            // Auto-sync with parent application
            const nonOllamaModels = currentModels.filter(m => m.provider !== 'ollama');
            const newOllamaModels: LLMModel[] = sortedModels.map(m => ({
                id: `ollama-${m.name}`,
                name: m.name, 
                provider: 'ollama',
                modelName: m.name, 
                apiUrl: `${baseUrl}/v1`, 
            }));
            onSyncModels([...nonOllamaModels, ...newOllamaModels]);
        } catch (e) {
            console.error("Registry fetch failed", e);
        }
    };

    const handlePull = async () => {
        if (!pullModelName.trim()) return;
        setIsPulling(true);
        setTerminalLogs([]);
        setPullPercent(0);
        setError(null);
        addLog(`INITIATING PULL: ${pullModelName}`);

        try {
            await pullModel(baseUrl, pullModelName, (progress) => {
                if (progress.status) addLog(progress.status.toUpperCase());
                if (progress.total && progress.completed) {
                    const percent = Math.round((progress.completed / progress.total) * 100);
                    setPullPercent(percent);
                }
            });
            addLog("PULL SEQUENCE COMPLETE.");
            await fetchModels();
            setPullModelName('');
        } catch (e: any) {
            setError(e.message);
            addLog(`ERROR: ${e.message}`);
        } finally {
            setIsPulling(false);
        }
    };

    const handleDelete = async (name: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm(`Permanently wipe model node: ${name}?`)) return;
        try {
            await deleteModel(baseUrl, name);
            await fetchModels();
        } catch (e: any) {
            setError(e.message);
        }
    };

    const handleSelectModel = (m: OllamaModelEntry) => {
        if (onActivateModel) {
            onActivateModel({
                id: `ollama-${m.name}`,
                name: m.name,
                provider: 'ollama',
                modelName: m.name,
                apiUrl: `${baseUrl}/v1`
            });
        }
    };

    return (
        <div className="h-full flex flex-col gap-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl transition-all duration-700 ${isConnected ? 'bg-green-600 text-white shadow-[0_0_15px_rgba(34,197,94,0.4)]' : 'bg-red-600 text-white'}`}>
                        <ServerIcon className="h-6 w-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-white uppercase tracking-tight">Ollama Control Plane</h2>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest opacity-80">Local Inference Service</span>
                            <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                        </div>
                    </div>
                </div>
                <button onClick={checkConnection} disabled={isChecking} className="p-3 bg-gray-800 hover:bg-gray-700 rounded-xl border border-gray-700 text-gray-400 hover:text-white transition-all active:scale-95">
                    {isChecking ? <LoaderIcon className="h-5 w-5 animate-spin" /> : <RefreshIcon className="h-5 w-5" />}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-grow">
                <div className="lg:col-span-7 flex flex-col gap-4">
                    <div className="bg-gray-950 border border-gray-800 rounded-3xl p-6 flex flex-col gap-6 shadow-2xl relative overflow-hidden h-full">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 text-indigo-400">
                                <DownloadIcon className="h-5 w-5" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Model Intake</span>
                            </div>
                            <div className="flex gap-3">
                                <input 
                                    type="text" 
                                    value={pullModelName}
                                    onChange={e => setPullModelName(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handlePull()}
                                    placeholder="e.g. llama3.2, mistral, qwen2"
                                    className="flex-grow px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-gray-200 text-xs outline-none focus:border-indigo-500 transition-all"
                                />
                                <button 
                                    onClick={handlePull}
                                    disabled={isPulling || !pullModelName}
                                    className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase text-[10px] tracking-widest rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-30"
                                >
                                    {isPulling ? <LoaderIcon className="h-4 w-4 animate-spin" /> : <PlusIcon className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="flex-grow bg-black rounded-2xl border border-gray-800 p-4 flex flex-col gap-2 overflow-hidden min-h-[200px]">
                            <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                <div className="flex items-center gap-2">
                                    <TerminalIcon className="h-3 w-3 text-emerald-500" />
                                    <span className="text-[9px] font-black text-emerald-500/60 uppercase tracking-widest">Inference Protocol Log</span>
                                </div>
                                {isPulling && (
                                    <div className="flex items-center gap-3">
                                        <div className="w-24 h-1.5 bg-gray-900 rounded-full overflow-hidden">
                                            <div className="h-full bg-indigo-500" style={{ width: `${pullPercent}%` }} />
                                        </div>
                                        <span className="text-[9px] font-black text-indigo-400">{pullPercent}%</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex-grow overflow-y-auto font-mono text-[9px] text-emerald-500/80 space-y-1 custom-scrollbar">
                                {terminalLogs.length === 0 ? (
                                    <div className="opacity-20 italic">Awaiting protocol initiation...</div>
                                ) : (
                                    terminalLogs.map((log, i) => <div key={i}>{log}</div>)
                                )}
                                <div ref={consoleEndRef} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-5 flex flex-col gap-4 h-full">
                    <div className="flex-grow bg-gray-900/40 border border-gray-800 rounded-3xl p-6 flex flex-col gap-4 overflow-hidden shadow-2xl">
                        <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] px-2">Registry Nodes</h4>
                        <div className="flex-grow overflow-y-auto custom-scrollbar space-y-2 pr-2">
                            {installedModels.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center opacity-20 gap-4">
                                    <BoxIcon className="h-12 w-12" />
                                    <p className="text-[10px] font-black uppercase tracking-widest">No local nodes found</p>
                                </div>
                            ) : (
                                installedModels.map(model => (
                                    <div 
                                        key={model.digest} 
                                        onClick={() => handleSelectModel(model)}
                                        className={`w-full p-4 rounded-2xl border transition-all text-left flex items-center justify-between group cursor-pointer ${activeModelId === `ollama-${model.name}` ? 'bg-indigo-600/10 border-indigo-500/40 shadow-lg' : 'bg-gray-950/40 border-gray-800 hover:border-gray-700'}`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`p-2 rounded-lg ${activeModelId === `ollama-${model.name}` ? 'bg-indigo-600 text-white' : 'bg-gray-900 text-gray-600 group-hover:text-gray-400'}`}>
                                                <BoxIcon className="h-4 w-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <span className="text-xs font-black text-white block truncate uppercase tracking-tight">{model.name}</span>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">{formatBytes(model.size)}</span>
                                                    <div className="w-1 h-1 rounded-full bg-gray-700" />
                                                    <span className="text-[8px] font-mono text-indigo-400/60 uppercase">{model.details.parameter_size}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {activeModelId === `ollama-${model.name}` && <CheckCircleIcon className="h-4 w-4 text-indigo-400" />}
                                            <button 
                                                onClick={(e) => handleDelete(model.name, e)}
                                                className="p-2 text-gray-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                            >
                                                <TrashIcon className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
            {error && (
                <div className="p-4 bg-red-950/20 border border-red-500/30 rounded-2xl flex items-center gap-3">
                    <XCircleIcon className="h-5 w-5 text-red-500" />
                    <p className="text-[10px] text-red-200 font-mono">{error}</p>
                </div>
            )}
        </div>
    );
};

export default OllamaIntegration;
