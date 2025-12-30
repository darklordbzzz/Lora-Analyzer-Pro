
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { LLMModel, DatasetItem, TrainingLabState } from '../types';
import { 
    FolderIcon, ImageIcon, LoaderIcon, CheckCircleIcon, SparklesIcon, 
    DownloadIcon, TrashIcon, TerminalIcon, TargetIcon, BoxIcon, 
    SettingsIcon, ShieldIcon, DatabaseIcon, PlusIcon, RefreshIcon, XIcon,
    EditIcon, LabIcon, ChevronDownIcon, CodeBracketIcon
} from './Icons';
import { tagImageForDataset, createSafetensorsContainer } from '../services/datasetService';
import { createThumbnail } from '../services/fileService';

interface DatasetStudioProps {
    activeModel?: LLMModel;
}

const TRAINING_TEMPLATES = [
    { id: 'style', name: 'Aesthetic Capture', desc: 'Focus on colors, textures, and lighting.', epochs: 10, rank: 32 },
    { id: 'concept', name: 'Conceptual Logic', desc: 'Captures an idea or object behavior.', epochs: 20, rank: 16 },
    { id: 'character', name: 'Biological Profile', desc: 'Strict anatomy and specific features.', epochs: 15, rank: 64 }
];

const DatasetStudio: React.FC<DatasetStudioProps> = ({ activeModel }) => {
    const [items, setItems] = useState<DatasetItem[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processLog, setProcessLog] = useState<string[]>([]);
    const [activeTab, setActiveTab] = useState<'dataset' | 'training'>('dataset');
    const [config, setConfig] = useState<TrainingLabState>({
        baseModel: 'SDXL 1.0',
        trainingType: 'Style',
        optimizer: 'AdamW8bit',
        epochs: 10,
        rank: 32,
        alpha: 16
    });

    const log = (msg: string) => setProcessLog(p => [...p, `[${new Date().toLocaleTimeString()}] ${msg}`]);

    const handleFolderSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = (Array.from(e.target.files || []) as File[]).filter(f => f.type.startsWith('image/'));
        if (files.length === 0) return;

        log(`Scanning directory: Detected ${files.length} visual resources.`);
        const newItems: DatasetItem[] = await Promise.all(files.map(async f => ({
            id: crypto.randomUUID(),
            file: f,
            thumbnail: await createThumbnail(f),
            tags: [],
            caption: '',
            status: 'idle' as const
        })));

        setItems(prev => [...prev, ...newItems]);
    };

    const runSemanticAudit = async () => {
        if (!activeModel) return alert("Cognitive Node Disconnected. Connect a VLM to begin audit.");
        setIsProcessing(true);
        log(`Initiating Semantic Alignment with ${activeModel.name}...`);

        const updatedItems = [...items];
        for (let i = 0; i < updatedItems.length; i++) {
            if (updatedItems[i].status === 'done') continue;
            
            try {
                updatedItems[i].status = 'processing';
                setItems([...updatedItems]);
                
                const result = await tagImageForDataset(updatedItems[i].file, activeModel);
                updatedItems[i].tags = result.tags;
                updatedItems[i].caption = result.caption;
                updatedItems[i].status = 'done';
                log(`Asset ${i + 1}/${items.length} synchronized: [${result.tags.slice(0, 2).join(', ')}...]`);
            } catch (e) {
                updatedItems[i].status = 'error';
                log(`Protocol fault on block ${i + 1}.`);
            }
            setItems([...updatedItems]);
        }
        setIsProcessing(false);
        log("Full Semantic Dataset Alignment Complete.");
    };

    const handleExport = async () => {
        log("Packaging Safetensors metadata container...");
        const blob = await createSafetensorsContainer(items, config);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `HUB_LAB_${config.trainingType.toUpperCase()}_${Date.now()}.safetensors`;
        a.click();
        log("Protocol export successful.");
    };

    const applyTemplate = (tpl: typeof TRAINING_TEMPLATES[0]) => {
        setConfig({ ...config, trainingType: tpl.id as any, epochs: tpl.epochs, rank: tpl.rank });
        log(`Applied Training Template: ${tpl.name}`);
    };

    return (
        <div className="max-w-7xl mx-auto flex flex-col gap-6 h-[calc(100vh-140px)] animate-in fade-in duration-500 overflow-hidden">
            
            {/* LAB HEADER */}
            <div className="flex justify-between items-center bg-gray-900/40 p-6 rounded-[2.5rem] border border-gray-800 shadow-xl backdrop-blur-md">
                <div className="flex items-center gap-6">
                    <div className="p-4 bg-indigo-600/20 text-indigo-400 rounded-2xl border border-indigo-500/20">
                        <LabIcon className="h-8 w-8" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">Dataset Forge Pro</h2>
                        <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest opacity-60">Neural Logic Preparation</span>
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        </div>
                    </div>
                </div>

                <div className="flex gap-2 p-1.5 bg-gray-950 rounded-2xl border border-gray-800 shadow-inner">
                    <button onClick={() => setActiveTab('dataset')} className={`px-6 py-2.5 text-[10px] font-black uppercase rounded-xl transition-all ${activeTab === 'dataset' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>Visual Volume</button>
                    <button onClick={() => setActiveTab('training')} className={`px-6 py-2.5 text-[10px] font-black uppercase rounded-xl transition-all ${activeTab === 'training' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>Training Logic</button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-grow overflow-hidden">
                
                {/* SIDEBAR: CONTROL CENTER */}
                <div className="lg:col-span-4 xl:col-span-3 flex flex-col gap-6 overflow-hidden">
                    <div className="flex-grow overflow-y-auto custom-scrollbar pr-2 space-y-6">
                        
                        {/* INPUT SECTOR */}
                        <div className="bg-[#151B2B] border border-gray-800 rounded-[2.5rem] p-8 shadow-2xl space-y-6">
                            <div className="flex items-center gap-3 text-indigo-400">
                                <BoxIcon className="h-5 w-5" />
                                <span className="text-[11px] font-black uppercase tracking-widest">Resource Intake</span>
                            </div>
                            
                            <button 
                                onClick={() => document.getElementById('dataset-folder-sub')?.click()}
                                className="w-full py-6 bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white rounded-3xl border-2 border-dashed border-gray-800 hover:border-indigo-500/50 transition-all flex flex-col items-center justify-center gap-3 group"
                            >
                                <FolderIcon className="h-10 w-10 text-gray-700 group-hover:text-indigo-500 transition-colors" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Mount Local Folder</span>
                            </button>
                            <input id="dataset-folder-sub" type="file" multiple {...({ webkitdirectory: "", directory: "" } as any)} className="hidden" onChange={handleFolderSelect} />

                            <div className="space-y-3 pt-4">
                                <button 
                                    onClick={runSemanticAudit}
                                    disabled={items.length === 0 || isProcessing}
                                    className={`w-full py-5 rounded-2xl font-black uppercase tracking-[0.4em] text-[10px] transition-all shadow-xl flex items-center justify-center gap-3 ${isProcessing ? 'bg-indigo-900/50 text-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20'}`}
                                >
                                    {isProcessing ? <LoaderIcon className="h-4 w-4 animate-spin" /> : <SparklesIcon className="h-4 w-4" />}
                                    Sync Semantic Data
                                </button>
                                <button 
                                    onClick={handleExport}
                                    disabled={items.length === 0 || isProcessing}
                                    className="w-full py-4 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-500 hover:text-white border border-emerald-500/20 rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] transition-all flex items-center justify-center gap-3"
                                >
                                    <DownloadIcon className="h-4 w-4" /> Export Protocol
                                </button>
                            </div>
                        </div>

                        {/* CONFIG SECTOR: ONLY IN TRAINING TAB */}
                        <div className={`bg-[#151B2B] border border-gray-800 rounded-[2.5rem] p-8 shadow-2xl space-y-8 transition-all ${activeTab === 'training' ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                            <div className="flex items-center gap-3 text-indigo-400">
                                <SettingsIcon className="h-5 w-5" />
                                <span className="text-[11px] font-black uppercase tracking-widest">Training Params</span>
                            </div>

                            <div className="space-y-4">
                                {TRAINING_TEMPLATES.map(tpl => (
                                    <button key={tpl.id} onClick={() => applyTemplate(tpl)} className={`w-full p-4 rounded-2xl border text-left transition-all ${config.trainingType === tpl.id ? 'bg-indigo-600/10 border-indigo-500/50' : 'bg-gray-900/50 border-gray-800 hover:bg-gray-800'}`}>
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-[11px] font-black text-white uppercase tracking-tight">{tpl.name}</span>
                                            {config.trainingType === tpl.id && <CheckCircleIcon className="h-4 w-4 text-indigo-400" />}
                                        </div>
                                        <p className="text-[9px] text-gray-500 font-bold uppercase tracking-tighter leading-tight">{tpl.desc}</p>
                                    </button>
                                ))}
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest ml-1">Rank</label>
                                    <input type="number" value={config.rank} onChange={e => setConfig({...config, rank: parseInt(e.target.value)})} className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-xs text-white font-mono" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest ml-1">Epochs</label>
                                    <input type="number" value={config.epochs} onChange={e => setConfig({...config, epochs: parseInt(e.target.value)})} className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-xs text-white font-mono" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* TERMINAL LOG */}
                    <div className="bg-black/40 border border-gray-800 rounded-[2rem] p-6 flex flex-col h-48 shadow-inner shrink-0">
                        <div className="flex items-center gap-2 mb-4 opacity-50">
                            <TerminalIcon className="h-3.5 w-3.5" />
                            <span className="text-[9px] font-black uppercase tracking-widest">Protocol Console</span>
                        </div>
                        <div className="flex-grow overflow-y-auto custom-scrollbar font-mono text-[9px] text-indigo-400/70 space-y-1">
                            {processLog.map((l, i) => <div key={i} className="leading-tight"><span className="text-indigo-600 mr-2">»</span>{l}</div>)}
                            {processLog.length === 0 && <div className="opacity-20 italic">Awaiting intake instruction...</div>}
                        </div>
                    </div>
                </div>

                {/* MAIN GRID: ASSET VIEWER */}
                <div className="lg:col-span-8 xl:col-span-9 flex flex-col bg-gray-800/20 border border-gray-700/50 rounded-[3rem] overflow-hidden shadow-2xl backdrop-blur-sm relative">
                    {items.length === 0 ? (
                        <div className="flex-grow flex flex-col items-center justify-center text-center opacity-10 grayscale py-20 pointer-events-none select-none">
                            <div className="p-12 bg-gray-900 rounded-[4rem] border border-gray-800 mb-10">
                                <DatabaseIcon className="h-32 w-32" />
                            </div>
                            <h4 className="text-5xl font-black uppercase tracking-[0.5em]">Forge Idle</h4>
                            <p className="text-sm font-black uppercase tracking-[0.2em] mt-6">Mount a visual volume to initiate audit</p>
                        </div>
                    ) : (
                        <div className="flex-grow overflow-y-auto custom-scrollbar p-10">
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                                {items.map((item) => (
                                    <div key={item.id} className={`group bg-gray-950 border rounded-[2.5rem] overflow-hidden transition-all hover:scale-[1.02] ${item.status === 'processing' ? 'border-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.2)]' : 'border-gray-800'}`}>
                                        <div className="aspect-square relative overflow-hidden">
                                            <img src={item.thumbnail} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-700" alt="" />
                                            {item.status === 'processing' && (
                                                <div className="absolute inset-0 bg-indigo-950/60 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
                                                    <LoaderIcon className="h-10 w-10 text-indigo-400 animate-spin" />
                                                    <span className="text-[10px] font-black text-white uppercase tracking-[0.4em]">Analyzing</span>
                                                </div>
                                            )}
                                            {item.status === 'done' && (
                                                <div className="absolute top-4 right-4 bg-emerald-500 text-white p-2 rounded-full shadow-2xl animate-in zoom-in-50">
                                                    <CheckCircleIcon className="h-4 w-4" />
                                                </div>
                                            )}
                                            <button onClick={() => setItems(items.filter(i => i.id !== item.id))} className="absolute top-4 left-4 p-2.5 bg-black/60 text-white rounded-xl opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-xl">
                                                <TrashIcon className="h-4 w-4" />
                                            </button>
                                        </div>
                                        <div className="p-6 space-y-4">
                                            <div className="flex flex-wrap gap-2 max-h-20 overflow-hidden">
                                                {item.tags.length > 0 ? item.tags.slice(0, 8).map(t => (
                                                    <span key={t} className="px-2.5 py-1 bg-indigo-950/40 text-indigo-400 text-[9px] font-black uppercase rounded-lg border border-indigo-500/10 tracking-tighter">{t}</span>
                                                )) : <span className="text-[9px] text-gray-700 font-black uppercase tracking-widest py-1">Metadata Buffer Empty</span>}
                                            </div>
                                            <div className="bg-gray-900/60 p-4 rounded-2xl border border-gray-800/50 shadow-inner">
                                                <p className="text-[11px] text-gray-400 line-clamp-3 italic leading-relaxed font-serif">
                                                    {item.caption || "Awaiting visual inference sequence..."}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* STATUS FOOTER BAR */}
                    {items.length > 0 && (
                        <div className="p-8 bg-gray-950/80 border-t border-gray-800 flex justify-between items-center backdrop-blur-2xl z-20">
                            <div className="flex items-center gap-10">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-lg"><DatabaseIcon className="h-4 w-4" /></div>
                                    <span className="text-[11px] font-black text-white uppercase tracking-widest">{items.length} Semantic Assets</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-emerald-600/20 text-emerald-400 rounded-lg"><CheckCircleIcon className="h-4 w-4" /></div>
                                    <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest">{items.filter(i => i.status === 'done').length} Blocks Validated</span>
                                </div>
                            </div>
                            <div className="flex gap-6 items-center">
                                <button onClick={() => setItems([])} className="text-[10px] font-black text-gray-600 hover:text-red-400 uppercase tracking-widest transition-colors flex items-center gap-2">
                                    <TrashIcon className="h-3.5 w-3.5" /> Wipe Workspace
                                </button>
                                <div className="h-4 w-px bg-gray-800" />
                                <div className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl shadow-lg border border-indigo-400/30">
                                    <CodeBracketIcon className="h-4 w-4" />
                                    <span className="text-[10px] font-black uppercase">v1.2.0</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DatasetStudio;
