
import React, { useState, useEffect } from 'react';
import { OllamaModelEntry, OllamaPullProgress, LLMModel } from '../types';
import { getInstalledModels, pullModel, deleteModel, checkOllamaConnection, createModel } from '../services/ollamaService';
import { LoaderIcon, ServerIcon, TrashIcon, CheckCircleIcon, RefreshIcon, DownloadIcon, FolderIcon, FileIcon, BoxIcon } from './Icons';

interface OllamaManagerProps {
    onSyncModels: (models: LLMModel[]) => void;
    currentModels: LLMModel[];
}

const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const OllamaManager: React.FC<OllamaManagerProps> = ({ onSyncModels, currentModels }) => {
    const [baseUrl, setBaseUrl] = useState('http://127.0.0.1:11434');
    const [isConnected, setIsConnected] = useState(false);
    const [isChecking, setIsChecking] = useState(false);
    const [installedModels, setInstalledModels] = useState<OllamaModelEntry[]>([]);
    const [activeActionTab, setActiveActionTab] = useState<'import' | 'download'>('import');
    
    // Pull State
    const [pullModelName, setPullModelName] = useState('');
    const [isPulling, setIsPulling] = useState(false);
    const [pullProgress, setPullProgress] = useState<OllamaPullProgress | null>(null);
    
    // Import State
    const [importName, setImportName] = useState('');
    const [importPath, setImportPath] = useState('');
    const [isImporting, setIsImporting] = useState(false);
    const [importStatus, setImportStatus] = useState('');

    const [error, setError] = useState<string | null>(null);

    const checkConnection = async () => {
        setIsChecking(true);
        setError(null);
        try {
            const connected = await checkOllamaConnection(baseUrl);
            setIsConnected(connected);
            if (connected) {
                await fetchModels();
            } else {
                setError("Could not connect to local engine. Ensure it is running.");
            }
        } catch (e) {
            setError("Connection failed.");
        } finally {
            setIsChecking(false);
        }
    };

    const fetchModels = async () => {
        try {
            const response = await getInstalledModels(baseUrl);
            setInstalledModels(response.models.sort((a, b) => new Date(b.modified_at).getTime() - new Date(a.modified_at).getTime()));
        } catch (e) {
            console.error("Failed to fetch models", e);
        }
    };

    useEffect(() => {
        checkConnection();
    }, []);

    const handlePull = async () => {
        if (!pullModelName.trim()) return;
        setIsPulling(true);
        setPullProgress({ status: 'Starting...' });
        setError(null);

        try {
            await pullModel(baseUrl, pullModelName, (progress) => {
                setPullProgress(progress);
            });
            await fetchModels();
            setPullModelName('');
            setPullProgress(null);
            handleSync(); // Auto sync
        } catch (e: any) {
            setError(e.message);
            setPullProgress(null);
        } finally {
            setIsPulling(false);
        }
    };

    const handleImport = async () => {
        if (!importName.trim() || !importPath.trim()) return;
        setIsImporting(true);
        setImportStatus('Initializing...');
        setError(null);
        
        const cleanPath = importPath.replace(/^"|"$/g, '');

        try {
            await createModel(baseUrl, importName, cleanPath, (status) => {
                setImportStatus(status);
            });
            setImportStatus('Finalizing...');
            await fetchModels(); 
            handleSync(); 
            
            setImportName('');
            setImportPath('');
            setImportStatus('Success! Model loaded.');
            setTimeout(() => setImportStatus(''), 3000);
        } catch (e: any) {
            setError(e.message);
            setImportStatus('');
        } finally {
            setIsImporting(false);
        }
    };

    const handleDelete = async (name: string) => {
        if (!window.confirm(`Delete model ${name}?`)) return;
        try {
            await deleteModel(baseUrl, name);
            await fetchModels();
        } catch (e: any) {
            setError(e.message);
        }
    };

    const handleSync = () => {
        const nonOllamaModels = currentModels.filter(m => m.provider !== 'ollama');
        
        const newOllamaModels: LLMModel[] = installedModels.map(m => ({
            id: `ollama-${m.name}`,
            name: m.name, 
            provider: 'ollama',
            modelName: m.name, 
            apiUrl: `${baseUrl}/v1`, 
        }));

        onSyncModels([...nonOllamaModels, ...newOllamaModels]);
    };

    return (
        <div className="space-y-6">
            <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700/50 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                     <h3 className="text-white font-bold flex items-center gap-2">
                        <ServerIcon className={`h-5 w-5 ${isConnected ? 'text-green-500' : 'text-red-500'}`} />
                        Local Inference Engine
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">Status: {isConnected ? 'Running' : 'Stopped'}</p>
                </div>
                
                <div className="flex items-center gap-2">
                     <button 
                        onClick={checkConnection} 
                        disabled={isChecking}
                        className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-600 transition-colors"
                        title="Retry Connection"
                    >
                        {isChecking ? <LoaderIcon className="animate-spin h-4 w-4"/> : <RefreshIcon className="h-4 w-4"/>}
                    </button>
                </div>
            </div>
            
            {error && (
                <div className="text-xs text-red-300 bg-red-900/20 p-3 rounded-lg border border-red-900/30 flex gap-2 items-start">
                    <ServerIcon className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-bold">Error:</p>
                        {error}
                        {!isConnected && <p className="mt-1 opacity-70">Ensure your local engine (Ollama) is running with <code>OLLAMA_ORIGINS="*"</code>.</p>}
                    </div>
                </div>
            )}

            {isConnected && (
                <>
                    <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden">
                        <div className="flex border-b border-gray-700">
                             <button 
                                onClick={() => setActiveActionTab('import')} 
                                className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${activeActionTab === 'import' ? 'bg-indigo-600/10 text-indigo-400 border-b-2 border-indigo-500' : 'text-gray-400 hover:bg-gray-700/30'}`}
                            >
                                <FolderIcon className="h-4 w-4" />
                                Load from Disk (Path)
                            </button>
                            <button 
                                onClick={() => setActiveActionTab('download')} 
                                className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${activeActionTab === 'download' ? 'bg-indigo-600/10 text-indigo-400 border-b-2 border-indigo-500' : 'text-gray-400 hover:bg-gray-700/30'}`}
                            >
                                <DownloadIcon className="h-4 w-4" />
                                Download from Web
                            </button>
                        </div>

                        <div className="p-5">
                            {activeActionTab === 'import' && (
                                <div className="space-y-4">
                                    <div className="bg-indigo-900/20 p-4 rounded-lg border border-indigo-500/30 text-xs text-indigo-200">
                                        Paste the full path to your <code>.safetensors</code> or <code>.gguf</code> file below. We will instruct the engine to load it.
                                    </div>
                                    
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">File Path (Paste Here)</label>
                                            <div className="flex gap-2">
                                                <input 
                                                    type="text" 
                                                    value={importPath} 
                                                    onChange={(e) => setImportPath(e.target.value)} 
                                                    placeholder="e.g. C:\Users\Desktop\models\pixtral-12b.safetensors"
                                                    className="flex-grow px-3 py-2.5 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm font-mono placeholder-gray-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Name this Model</label>
                                            <input 
                                                type="text" 
                                                value={importName} 
                                                onChange={(e) => setImportName(e.target.value)} 
                                                placeholder="e.g. Pixtral"
                                                className="w-full px-3 py-2.5 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                            />
                                        </div>
                                    </div>

                                    <button 
                                        onClick={handleImport}
                                        disabled={isImporting || !importName || !importPath}
                                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 shadow-lg transition-all"
                                    >
                                        {isImporting ? <LoaderIcon className="h-5 w-5 animate-spin"/> : <CheckCircleIcon className="h-5 w-5"/>}
                                        {isImporting ? 'Loading into Memory...' : 'Load Model from Disk'}
                                    </button>
                                    
                                    {(isImporting || importStatus) && (
                                        <div className="bg-gray-900 rounded-lg p-3 text-xs font-mono border border-gray-700 text-gray-300">
                                            <span className="text-indigo-400">&gt;</span> {importStatus}
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeActionTab === 'download' && (
                                <div className="space-y-4">
                                     <div className="flex gap-2">
                                        <input 
                                            type="text" 
                                            value={pullModelName} 
                                            onChange={(e) => setPullModelName(e.target.value)} 
                                            placeholder="Library Name (e.g. llama3, mistral)"
                                            className="flex-grow px-3 py-2.5 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm"
                                            onKeyDown={(e) => e.key === 'Enter' && handlePull()}
                                        />
                                        <button 
                                            onClick={handlePull}
                                            disabled={isPulling || !pullModelName}
                                            className="px-6 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg text-sm disabled:opacity-50 transition-colors"
                                        >
                                            {isPulling ? <LoaderIcon className="h-4 w-4 animate-spin"/> : 'Pull'}
                                        </button>
                                    </div>
                                    {isPulling && pullProgress && (
                                        <div className="mt-2 space-y-2">
                                            <div className="flex justify-between text-xs text-gray-400">
                                                <span>{pullProgress.status}</span>
                                                {pullProgress.total && pullProgress.completed && (
                                                    <span>{Math.round((pullProgress.completed / pullProgress.total) * 100)}%</span>
                                                )}
                                            </div>
                                            <div className="w-full bg-gray-900 rounded-full h-1.5 overflow-hidden">
                                                {pullProgress.total && pullProgress.completed && (
                                                    <div className="bg-indigo-500 h-full transition-all duration-300" style={{ width: `${(pullProgress.completed / pullProgress.total) * 100}%` }}></div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between items-center px-1">
                             <h3 className="font-bold text-sm text-gray-300">Available Local Models</h3>
                             <button 
                                onClick={handleSync}
                                className="text-xs flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 text-white font-bold rounded-lg shadow-lg hover:bg-indigo-500 transition-all"
                             >
                                <RefreshIcon className="h-3.5 w-3.5" />
                                Sync to App
                             </button>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                            {installedModels.length === 0 ? (
                                <div className="text-center py-8 text-gray-500 bg-gray-900/30 rounded-lg border border-gray-800 border-dashed">
                                    No local models loaded. Use "Load from Disk" above.
                                </div>
                            ) : (
                                installedModels.map((model) => (
                                    <div key={model.digest} className="flex items-center justify-between bg-gray-800 p-3 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors group">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-gray-900 rounded-md">
                                                <BoxIcon className="h-5 w-5 text-gray-400" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-sm text-white">{model.name}</div>
                                                <div className="text-[10px] text-gray-500 flex gap-2 mt-0.5">
                                                    <span>{formatBytes(model.size)}</span>
                                                    <span className="text-gray-700">|</span>
                                                    <span>{model.details.parameter_size}</span>
                                                    <span className="text-gray-700">|</span>
                                                    <span>{model.details.quantization_level}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleDelete(model.name)}
                                            className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-900/20 rounded opacity-0 group-hover:opacity-100 transition-all"
                                            title="Unload/Delete"
                                        >
                                            <TrashIcon className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default OllamaManager;
