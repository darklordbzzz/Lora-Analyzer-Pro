
import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { LLMModel } from '../types';
import { ChevronDownIcon, SearchIcon, CheckCircleIcon, ServerIcon, CloudIcon, RobotIcon, DownloadIcon, BoxIcon, TrashIcon, LoaderIcon, InfoIcon, XCircleIcon, PlugIcon, LinkIcon, PlusIcon, GlobeIcon } from './Icons';
import { getInstalledModels, checkOllamaConnection } from '../services/ollamaService';
import { resolveModelUrl } from '../services/urlResolverService';

interface ModelSelectorProps {
    models: LLMModel[];
    selectedModelId: string;
    onSelectModel: (id: string) => void;
    onAddModel: (model: LLMModel) => void;
    onDeleteModel?: (id: string) => void;
    onInstallModelRequest?: (modelName: string) => void;
    enableLocalModels?: boolean;
}

interface CuratedModel {
    id: string;
    name: string;
    description: string;
    tags: string[];
    provider: 'ollama' | 'gemini' | 'openai';
    modelId: string;
    size?: string;
}

const CURATED_MODELS: CuratedModel[] = [
    { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash', description: 'Fastest Google Cloud Model', tags: ['Google', 'Cloud'], provider: 'gemini', modelId: 'gemini-3-flash-preview' },
    { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro', description: 'Complex Reasoning & Large Context', tags: ['Google', 'Cloud'], provider: 'gemini', modelId: 'gemini-3-pro-preview' },
    { id: 'gpt-4o', name: 'GPT-4o', description: 'OpenAI Flagship', tags: ['OpenAI', 'Cloud'], provider: 'openai', modelId: 'gpt-4o' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast & Cost Effective', tags: ['OpenAI', 'Cloud'], provider: 'openai', modelId: 'gpt-4o-mini' },
    { id: 'deepseek-r1', name: 'DeepSeek R1', description: 'State-of-the-art Reasoning', tags: ['Reasoning', 'Local'], provider: 'ollama', modelId: 'deepseek-r1', size: '7B/8B' },
    { id: 'llama3.2', name: 'Llama 3.2', description: 'Fast, Efficient, Multilingual', tags: ['Meta', 'Fast', 'Local'], provider: 'ollama', modelId: 'llama3.2', size: '3B' },
];

const ModelSelector: React.FC<ModelSelectorProps> = ({ 
    models, selectedModelId, onSelectModel, onAddModel, onDeleteModel, onInstallModelRequest, enableLocalModels = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [importUrl, setImportUrl] = useState('');
    const [isResolving, setIsResolving] = useState(false);
    const [installedOllamaModels, setInstalledOllamaModels] = useState<Set<string>>(new Set());
    const [ollamaStatus, setOllamaStatus] = useState<'checking' | 'connected' | 'error'>('checking');
    const wrapperRef = useRef<HTMLDivElement>(null);

    const activeModel = (models || []).find(m => m.id === selectedModelId);
    const isIntegrated = activeModel?.apiUrl === 'integrated://core';
    
    const isLocalNode = useMemo(() => {
        if (!activeModel) return false;
        if (isIntegrated) return true;
        if (activeModel.provider === 'ollama') return true;
        const url = activeModel.apiUrl?.toLowerCase() || '';
        return url.includes('localhost') || url.includes('127.0.0.1');
    }, [activeModel, isIntegrated]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleUrlImport = async () => {
        if (!importUrl.trim()) return;
        setIsResolving(true);
        try {
            const resolved = await resolveModelUrl(importUrl);
            if (resolved) {
                const newModel: LLMModel = {
                    id: crypto.randomUUID(),
                    name: resolved.name,
                    provider: resolved.provider,
                    modelName: resolved.modelId,
                    apiUrl: resolved.apiUrl
                };
                onAddModel(newModel);
                setImportUrl('');
            } else {
                alert("URL Protocol not recognized. Try a Hugging Face, Ollama, or GGUF link.");
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsResolving(false);
        }
    };

    const sections = useMemo(() => {
        const q = search.toLowerCase();
        const modelsList = models || [];
        const activeMatches = modelsList.filter(m => m.name.toLowerCase().includes(q) || m.modelName.toLowerCase().includes(q));
        const activeModelIds = new Set(modelsList.map(m => m.modelName));
        const allDiscovery = CURATED_MODELS.filter(m => (m.name.toLowerCase().includes(q) || m.description.toLowerCase().includes(q)) && !activeModelIds.has(m.modelId) && !activeModelIds.has(`${m.modelId}:latest`));
        return { activeMatches, cloudDiscovery: allDiscovery.filter(m => m.provider !== 'ollama'), localDiscovery: allDiscovery.filter(m => m.provider === 'ollama' && enableLocalModels) };
    }, [models, search, enableLocalModels]);

    const headerLabel = isIntegrated ? 'SYSTEM KERNEL' : isLocalNode ? 'LOCAL NODE' : 'CLOUD HUB';

    return (
        <div className="relative" ref={wrapperRef}>
            <button onClick={() => setIsOpen(!isOpen)} className={`flex items-center gap-4 px-4 py-2 bg-gray-900/80 hover:bg-gray-800 border rounded-xl transition-all group min-w-[240px] max-w-[320px] justify-between shadow-xl ${isIntegrated ? 'border-green-500/50' : 'border-gray-700'}`}>
                <div className="flex items-center gap-3 truncate">
                    <div className={`p-1.5 rounded-lg shrink-0 transition-all duration-700 ${isIntegrated ? 'bg-green-600 text-white shadow-[0_0_10px_rgba(34,197,94,0.4)]' : activeModel?.provider === 'gemini' ? 'bg-indigo-900/50 text-indigo-400' : isLocalNode ? 'bg-orange-900/50 text-orange-400' : 'bg-green-900/50 text-green-400'}`}>
                        {isIntegrated ? <PlugIcon className="h-4 w-4" /> : isLocalNode ? <ServerIcon className="h-4 w-4" /> : <RobotIcon className="h-4 w-4" />}
                    </div>
                    <div className="flex flex-col items-start truncate text-left">
                        <span className="block text-sm font-black text-gray-100 truncate leading-none">{activeModel?.name || 'Select Node'}</span>
                        <span className={`text-[8px] truncate leading-none mt-1.5 uppercase font-black tracking-[0.2em] ${isIntegrated ? 'text-green-400' : 'text-gray-500'}`}>{headerLabel}</span>
                    </div>
                </div>
                <ChevronDownIcon className="h-4 w-4 text-gray-500 group-hover:text-white transition-colors" />
            </button>
            {isOpen && (
                <div className="absolute top-full right-0 mt-3 w-[28rem] bg-gray-950 border border-gray-800 rounded-3xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="p-4 border-b border-gray-800 bg-gray-900/50 space-y-3">
                        <div className="relative">
                            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                            <input type="text" placeholder="Search cognitive nodes..." value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-gray-950 border border-gray-800 rounded-2xl py-3 pl-11 pr-4 text-xs text-gray-200 outline-none focus:ring-1 focus:ring-indigo-500" />
                        </div>
                        <div className="flex gap-2">
                             <div className="relative flex-grow">
                                <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-indigo-500" />
                                <input 
                                    type="text" 
                                    placeholder="Import from URL (HF, Ollama, GGUF)..." 
                                    value={importUrl}
                                    onChange={e => setImportUrl(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleUrlImport()}
                                    className="w-full bg-gray-950 border border-gray-800 rounded-xl py-2.5 pl-10 pr-4 text-[10px] text-gray-300 outline-none focus:border-indigo-500 transition-all font-mono" 
                                />
                             </div>
                             <button 
                                onClick={handleUrlImport}
                                disabled={isResolving || !importUrl.trim()}
                                className="px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-30"
                             >
                                {isResolving ? <LoaderIcon className="h-3.5 w-3.5 animate-spin" /> : <PlusIcon className="h-3.5 w-3.5" />}
                             </button>
                        </div>
                    </div>
                    
                    <div className="overflow-y-auto custom-scrollbar flex-grow p-3 space-y-5">
                        {sections.activeMatches.length > 0 && (
                            <div>
                                <h4 className="px-3 mb-3 text-[9px] font-black text-gray-600 uppercase tracking-[0.3em]">Active Intelligence</h4>
                                <div className="space-y-1">
                                    {(sections.activeMatches || []).map(model => (
                                        <button key={model.id} onClick={() => { onSelectModel(model.id); setIsOpen(false); }} className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all text-left group ${selectedModelId === model.id ? 'bg-indigo-600/10 border border-indigo-500/30' : 'hover:bg-gray-800 border border-transparent'}`}>
                                            <div className={`p-2.5 rounded-xl transition-colors ${selectedModelId === model.id ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-900 text-gray-600 group-hover:text-gray-400'}`}>
                                                {model.apiUrl === 'integrated://core' ? <PlugIcon className="h-4 w-4"/> : model.provider === 'ollama' || (model.apiUrl?.includes('localhost')) ? <ServerIcon className="h-4 w-4"/> : <CloudIcon className="h-4 w-4"/>}
                                            </div>
                                            <div className="flex-grow min-w-0">
                                                <div className="font-black text-xs text-white uppercase tracking-wider">{model.name}</div>
                                                <div className="text-[9px] text-gray-500 truncate font-mono mt-0.5">{model.modelName}</div>
                                            </div>
                                            {selectedModelId === model.id && <CheckCircleIcon className="h-4 w-4 text-indigo-400" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {sections.cloudDiscovery.length > 0 && (
                            <div>
                                <h4 className="px-3 mb-3 text-[9px] font-black text-gray-600 uppercase tracking-[0.3em]">Cloud Discovery</h4>
                                <div className="space-y-1">
                                    {sections.cloudDiscovery.map(model => (
                                        <button key={model.id} onClick={() => { 
                                            onAddModel({ id: crypto.randomUUID(), name: model.name, provider: model.provider, modelName: model.modelId });
                                            setIsOpen(false);
                                        }} className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all text-left group hover:bg-gray-800">
                                            <div className="p-2.5 rounded-xl bg-gray-900 text-gray-600 group-hover:text-green-400 transition-colors">
                                                <GlobeIcon className="h-4 w-4"/>
                                            </div>
                                            <div className="flex-grow min-w-0">
                                                <div className="font-black text-xs text-gray-400 group-hover:text-white transition-colors uppercase tracking-wider">{model.name}</div>
                                                <div className="text-[8px] text-gray-600 font-bold uppercase mt-0.5">{model.description}</div>
                                            </div>
                                            <PlusIcon className="h-4 w-4 text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
export default ModelSelector;
