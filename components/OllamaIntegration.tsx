
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
            else setError("Local node not responding. Ensure Ollama is running.");
        } catch (e) {
            setError("Connection protocol failure.");
        } finally {
            setIsChecking(false);
        }
    };

    const fetchModels = async () => {
        try {
            const response = await getInstalledModels(baseUrl);
            const models = response.models.sort((a, b) => new Date(b.modified_at).getTime() - new Date(a.modified_at).getTime());
            setInstalledModels(models);
            
            // Auto-sync with parent application
            const nonOllamaModels = currentModels.filter(m => m.provider !== 'ollama');
            const newOllamaModels: LLMModel[] = models.map(m => ({
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

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[450px]">
                {/* INTAKE & TERMINAL */}
                <div className="lg:col-span-7 flex flex-col gap-4 h-full">
                    <div className="flex-grow bg-gray-950 border border-gray-800 rounded-3xl p-6 flex flex-col gap-6 shadow-2xl relative overflow-hidden">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 text-indigo-400">
                                <DownloadIcon className="h-5 w-5" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Model Library Intake</span>
                            </div>
                            <div className="flex gap-3">
                                <input 
                                    type="text" 
                                    value={pullModelName}
                                    onChange={e => setPullModelName(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handlePull()}
                                    placeholder="Enter model name (e.g. llama3.2, mistral)"
                                    className="flex-grow px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-white text-xs font-mono placeholder:text-gray-700 focus:border-indigo-500 outline-none"
                                />
                                <button 
                                    onClick={handlePull}
                                    disabled={isPulling || !pullModelName.trim() || !isConnected}
                                    className="px-6 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest text-[10px] rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-30 flex items-center gap-2"
                                >
                                    {isPulling ? <LoaderIcon className="h-4 w-4 animate-spin" /> : <PlusIcon className="h-4 w-4" />}
                                    Pull Node
                                </button>
                            </div>
                        </div>

                        {/* TERMINAL UI */}
                        <div className="flex-grow flex flex-col bg-black rounded-2xl border border-gray-800 overflow-hidden group">
                            <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800">
                                <div className="flex items-center gap-2">
                                    <TerminalIcon className="h-3 w-3 text-gray-500" />
                                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Neural Pull Log</span>
                                </div>
                                {isPulling && (
                                    <span className="text-[9px] font-black text-indigo-400 animate-pulse">{pullPercent}% COMPLETED</span>
                                )}
                            </div>
                            <div className="flex-grow p-4 font-mono text-[10px] overflow-y-auto custom-scrollbar space-y-1">
                                {terminalLogs.length === 0 ? (
                                    <div className="h-full flex items-center justify-center opacity-20 italic">
                                        System idle. Awaiting pull command...
                                    </div>
                                ) : (
                                    terminalLogs.map((log, i) => (
                                        <div key={i} className="text-indigo-400/80 leading-tight">
                                            <span className="text-indigo-600 mr-2">$</span>
                                            {log}
                                        </div>
                                    ))
                                )}
                                <div ref={consoleEndRef} />
                            </div>
                            {isPulling && (
                                <div className="h-1 bg-gray-900 overflow-hidden">
                                    <div 
                                        className="h-full bg-indigo-500 transition-all duration-300 shadow-[0_0_10px_#6366f1]" 
                                        style={{ width: `${pullPercent}%` }} 
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-950/20 border border-red-500/30 rounded-2xl animate-in shake duration-500 flex items-center gap-3">
                            <XCircleIcon className="h-5 w-5 text-red-500" />
                            <p className="text-[10px] text-red-200/70 font-mono uppercase leading-relaxed">{error}</p>
                        </div>
                    )}
                </div>

                {/* REGISTRY SIDEBAR */}
                <div className="lg:col-span-5 flex flex-col gap-4 h-full">
                    <div className="bg-gray-950 border border-gray-800 rounded-3xl p-6 flex flex-col gap-6 shadow-2xl relative overflow-hidden h-full">
                        <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                            <BoxIcon className="h-4 w-4" /> Node Registry
                        </h3>
                        <div className="flex-grow overflow-y-auto custom-scrollbar space-y-2 pr-1">
                            {installedModels.length === 0 ? (
                                <div className="h-48 flex flex-col items-center justify-center text-center opacity-20 border border-dashed border-gray-700 rounded-2xl">
                                    <BoxIcon className="h-10 w-10 mb-3" />
                                    <p className="text-[9px] font-black uppercase">Registry Empty</p>
                                </div>
                            ) : (
                                installedModels.map(model => {
                                    const isCurrentlyActive = activeModelId === `ollama-${model.name}`;
                                    return (
                                        <div 
                                            key={model.digest} 
                                            onClick={() => handleSelectModel(model)}
                                            className={`p-4 bg-gray-900 border rounded-2xl flex items-center justify-between group transition-all cursor-pointer ${isCurrentlyActive ? 'border-indigo-500/50 bg-indigo-500/5 shadow-lg' : 'border-gray-800 hover:border-gray-700'}`}
                                        >
                                            <div className="flex items-center gap-4 min-w-0">
                                                <div className={`p-2 rounded-lg transition-colors ${isCurrentlyActive ? 'bg-indigo-600 text-white' : 'bg-indigo-900/20 text-indigo-400'}`}>
                                                    <BoxIcon className="h-4 w-4" />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-bold text-white block truncate uppercase tracking-tighter">{model.name}</span>
                                                        {isCurrentlyActive && <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_#22c55e]" />}
                                                    </div>
                                                    <div className="text-[8px] text-gray-500 uppercase font-mono flex gap-2 mt-1">
                                                        <span>{formatBytes(model.size)}</span>
                                                        <span>•</span>
                                                        <span>{model.details.parameter_size}</span>
                                                        <span>•</span>
                                                        <span>{model.details.quantization_level}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={(e) => handleDelete(model.name, e)} 
                                                className="p-2 text-gray-700 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <TrashIcon className="h-4 w-4" />
                                            </button>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                        <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-2xl p-4">
                            <div className="flex items-center gap-3 mb-2">
                                <InfoIcon className="h-4 w-4 text-indigo-400" />
                                <span className="text-[9px] font-black text-indigo-300 uppercase tracking-widest">Protocol Notice</span>
                            </div>
                            <p className="text-[10px] text-indigo-200/50 leading-relaxed uppercase tracking-tighter">
                                Ollama service must be reachable at 127.0.0.1:11434 with CORS enabled (OLLAMA_ORIGINS="*"). Models are persisted on local storage.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OllamaIntegration;
