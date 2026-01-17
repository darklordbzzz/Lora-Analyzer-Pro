import React, { useState, useMemo } from 'react';
import { 
    InfoIcon, SparklesIcon, ServerIcon, HuggingFaceIcon, 
    CivitaiIcon, CodeBracketIcon, AudioIcon, BoxIcon,
    GlobeIcon, TerminalIcon, PlugIcon, SearchIcon, ChevronDownIcon,
    UserIcon, CloudIcon, DownloadIcon, ChatIcon, RobotIcon, XCircleIcon, CheckCircleIcon,
    ImageIcon, EditIcon, TargetIcon
} from './Icons';

interface ProtocolNode {
    id: string;
    category: 'System' | 'Inference' | 'Generative' | 'Refinement';
    title: string;
    icon: React.ReactNode;
    tags: string[];
    content: React.ReactNode;
    steps?: string[];
}

const PROTOCOLS: ProtocolNode[] = [
    {
        id: 'retouch-mastery',
        category: 'Refinement',
        title: 'Neural Retouch Mastery',
        icon: <EditIcon className="h-5 w-5" />,
        tags: ['Workstation', 'Restoration', 'High-Fidelity'],
        content: (
            <div className="space-y-6">
                <div className="bg-indigo-600/10 border-l-4 border-indigo-500 p-6 rounded-r-2xl">
                    <p className="text-sm text-indigo-100 font-black uppercase tracking-widest mb-3">Priority Operational Directive</p>
                    <p className="text-sm text-indigo-100/70 leading-relaxed italic">
                        The Photo Retouch module is NOT a simple filter suite. It is a sequential neural workstation. For ultimate results, you MUST follow the iterative feedback loop: Apply, Verify, Layer.
                    </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-5 bg-gray-900/50 rounded-2xl border border-gray-800">
                        <h4 className="text-[10px] font-black text-indigo-400 uppercase mb-3 flex items-center gap-2"><TargetIcon className="h-3 w-3" /> Step 1: Base Correction</h4>
                        <p className="text-[11px] text-gray-400 leading-relaxed uppercase font-bold tracking-tight">Run Focus Shift first to eliminate optical noise and motion artifacts. Do not apply detail uplift to a blurry base.</p>
                    </div>
                    <div className="p-5 bg-gray-900/50 rounded-2xl border border-gray-800">
                        <h4 className="text-[10px] font-black text-emerald-400 uppercase mb-3 flex items-center gap-2"><SparklesIcon className="h-3 w-3" /> Step 2: Detail Injection</h4>
                        <p className="text-[11px] text-gray-400 leading-relaxed uppercase font-bold tracking-tight">Apply Texture Uplift once edges are crisp. This re-synthesizes micro-level details like skin pores and fabric grain.</p>
                    </div>
                </div>
            </div>
        ),
        steps: [
            'Mount your baseline source asset.',
            'Trigger "Neural Auto Master" for immediate 4K restoration.',
            'Hold "Peek Original" to identify remaining logic gaps.',
            'Layer specific protocols (Face/Texture) to fix identified gaps.',
            'Execute "Save Master" to export the high-fidelity bitstream.'
        ]
    },
    {
        id: 'overview',
        category: 'System',
        title: 'Central Intelligence Hub',
        icon: <SparklesIcon className="h-5 w-5" />,
        tags: ['Core', 'Philosophy', 'UI'],
        content: (
            <div className="space-y-6">
                <div className="bg-gray-900/50 p-6 rounded-2xl border border-gray-800">
                    <p className="text-sm text-gray-400 leading-relaxed">
                        This cockpit provides high-level control over Gemini 3 Pro (Text/Logic) and Gemini 2.5 Flash (Vision/Audio). It is designed for technical operators who require precise, iterative control over AI asset production.
                    </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-gray-950/60 rounded-2xl border border-gray-800 shadow-inner">
                        <h4 className="text-[10px] font-black text-indigo-400 uppercase mb-2">Multimodal</h4>
                        <p className="text-[11px] text-gray-500 uppercase font-black tracking-tighter">Unified stream for Images, Video, Audio, and Logic.</p>
                    </div>
                    <div className="p-4 bg-gray-950/60 rounded-2xl border border-gray-800 shadow-inner">
                        <h4 className="text-[10px] font-black text-indigo-400 uppercase mb-2">Non-Destructive</h4>
                        <p className="text-[11px] text-gray-500 uppercase font-black tracking-tighter">Workstation-grade history stack for every modification pass.</p>
                    </div>
                    <div className="p-4 bg-gray-950/60 rounded-2xl border border-gray-800 shadow-inner">
                        <h4 className="text-[10px] font-black text-indigo-400 uppercase mb-2">Zero Auth Cloud</h4>
                        <p className="text-[11px] text-gray-500 uppercase font-black tracking-tighter">Native Gemini integration via injected environmental keys.</p>
                    </div>
                </div>
            </div>
        )
    },
    {
        id: 'model-audit',
        category: 'Inference',
        title: 'Neural Asset Audit',
        icon: <CodeBracketIcon className="h-5 w-5" />,
        tags: ['LoRA', 'GGUF', 'Safetensors'],
        content: (
            <div className="space-y-4">
                <p className="text-sm text-gray-300">The Model Analyzer utilizes a dual-path auditing protocol:</p>
                <div className="space-y-3">
                    <div className="flex gap-4 p-4 bg-gray-900 rounded-2xl border border-gray-800 items-start hover:border-indigo-500/40 transition-all group">
                        <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400 shrink-0 group-hover:scale-110 transition-transform"><SearchIcon className="h-4 w-4" /></div>
                        <div>
                            <h5 className="text-[11px] font-black uppercase text-white mb-1 tracking-widest">A: Cryptographic Hashing</h5>
                            <p className="text-xs text-gray-500 uppercase font-bold tracking-tighter">Fingerprints are compared against global registries (Civitai/HF) to verify training origin.</p>
                        </div>
                    </div>
                    <div className="flex gap-4 p-4 bg-gray-900 rounded-2xl border border-gray-800 items-start hover:border-indigo-500/40 transition-all group">
                        <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400 shrink-0 group-hover:scale-110 transition-transform"><BoxIcon className="h-4 w-4" /></div>
                        <div>
                            <h5 className="text-[11px] font-black uppercase text-white mb-1 tracking-widest">B: Header Decomposition</h5>
                            <p className="text-xs text-gray-500 uppercase font-bold tracking-tighter">Extracts architectural DNA directly from JSON segments without VRAM allocation.</p>
                        </div>
                    </div>
                </div>
            </div>
        ),
        steps: [
            'Drag LoRA/GGUF asset into Input stream.',
            'Wait for local Hashing sequence.',
            'Select "External Resolve" for trigger words.',
            'Deploy "Sequential Audit" for detailed report.'
        ]
    }
];

const HelpView: React.FC = () => {
    const [search, setSearch] = useState('');
    const [activeId, setActiveId] = useState(PROTOCOLS[0].id);

    const filteredProtocols = useMemo(() => {
        const q = search.toLowerCase();
        return PROTOCOLS.filter(p => 
            p.title.toLowerCase().includes(q) || 
            p.category.toLowerCase().includes(q) ||
            p.tags.some(t => t.toLowerCase().includes(q))
        );
    }, [search]);

    const activeNode = useMemo(() => 
        PROTOCOLS.find(p => p.id === activeId) || PROTOCOLS[0]
    , [activeId]);

    const categories = ['Refinement', 'System', 'Inference'] as const;

    return (
        <div className="max-w-7xl mx-auto h-[calc(100vh-140px)] flex gap-8 animate-in fade-in duration-500">
            {/* INDEX SIDEBAR */}
            <div className="w-80 flex flex-col gap-6 shrink-0">
                <div className="relative">
                    <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <input 
                        type="text" value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search system protocols..."
                        className="w-full bg-gray-800/40 border border-gray-700/50 rounded-2xl py-3 pl-11 pr-4 text-xs text-gray-200 outline-none focus:ring-1 focus:ring-indigo-500 shadow-xl font-black uppercase tracking-widest"
                    />
                </div>

                <div className="flex-grow bg-gray-800/20 border border-gray-700/50 rounded-[2.5rem] p-3 overflow-y-auto custom-scrollbar shadow-2xl backdrop-blur-md">
                    <div className="space-y-6">
                        {categories.map(cat => {
                            const items = filteredProtocols.filter(p => p.category === cat);
                            if (items.length === 0) return null;
                            return (
                                <div key={cat} className="space-y-1.5 px-2">
                                    <h4 className="text-[9px] font-black text-gray-600 uppercase tracking-[0.3em] px-2 mb-3">{cat} Command Set</h4>
                                    {items.map(item => (
                                        <button 
                                            key={item.id}
                                            onClick={() => setActiveId(item.id)}
                                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left group ${activeId === item.id ? 'bg-indigo-600 text-white shadow-xl' : 'text-gray-500 hover:bg-gray-800 hover:text-gray-300'}`}
                                        >
                                            <div className={`p-1.5 rounded-lg transition-colors ${activeId === item.id ? 'bg-white/20' : 'bg-gray-900 group-hover:text-indigo-400'}`}>
                                                {React.cloneElement(item.icon as React.ReactElement<any>, { className: 'h-3.5 w-3.5' })}
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-widest truncate">{item.title}</span>
                                        </button>
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-3xl p-5 shadow-xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-indigo-500/5 group-hover:scale-150 transition-transform duration-1000 blur-2xl"></div>
                    <div className="flex items-center gap-3 mb-2 relative z-10">
                        <RobotIcon className="h-4 w-4 text-indigo-400" />
                        <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Protocol v2.1.0</span>
                    </div>
                    <p className="text-[10px] text-indigo-200/50 leading-relaxed uppercase font-black tracking-tighter relative z-10">
                        Workstation directives prioritized for iterative high-fidelity synthesis.
                    </p>
                </div>
            </div>

            {/* CONTENT VIEWER */}
            <div className="flex-grow bg-gray-800/40 border border-gray-700/50 rounded-[3rem] overflow-hidden flex flex-col shadow-2xl backdrop-blur-sm relative">
                <div className="p-10 border-b border-gray-700/50 flex items-center gap-8 bg-gray-900/40 sticky top-0 z-20 backdrop-blur-xl">
                    <div className="p-5 bg-indigo-600 rounded-[1.5rem] shadow-2xl text-white">
                        {activeNode.icon}
                    </div>
                    <div className="flex-grow">
                        <div className="flex items-center gap-3 mb-2">
                            <span className="px-2 py-0.5 bg-indigo-900/50 text-indigo-400 text-[8px] font-black uppercase tracking-widest border border-indigo-500/30 rounded">
                                ACTIVE SECTOR: {activeNode.category}
                            </span>
                        </div>
                        <h2 className="text-4xl font-black text-white uppercase tracking-tighter">{activeNode.title}</h2>
                        <div className="flex gap-2 mt-4">
                            {activeNode.tags.map(t => (
                                <span key={t} className="text-[9px] font-black text-gray-500 bg-gray-950 px-2 py-0.5 rounded border border-gray-800 uppercase tracking-widest">#{t}</span>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex-grow p-12 overflow-y-auto custom-scrollbar space-y-12">
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="prose prose-invert prose-indigo max-w-none">
                            {activeNode.content}
                        </div>

                        {activeNode.steps && (
                            <div className="mt-12 space-y-6">
                                <h4 className="text-[11px] font-black text-white uppercase tracking-[0.4em] flex items-center gap-3">
                                    <TerminalIcon className="h-4 w-4 text-indigo-400" /> High-Priority Operational Workflow
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {activeNode.steps.map((step, i) => (
                                        <div key={i} className="flex gap-4 items-center p-5 bg-black/40 rounded-2xl border border-gray-800 hover:border-indigo-500/20 transition-all group">
                                            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-black text-white shrink-0 shadow-lg group-hover:scale-110 transition-transform">{i + 1}</div>
                                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-tight leading-relaxed">{step}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        <div className="mt-12 pt-8 border-t border-gray-700/50 flex justify-between items-center opacity-40">
                            <div className="flex items-center gap-3">
                                <InfoIcon className="h-4 w-4 text-gray-600" />
                                <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">End of Command Data</span>
                            </div>
                            <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="p-3 bg-gray-900 hover:bg-gray-800 text-gray-500 rounded-xl transition-all border border-gray-800">
                                <ChevronDownIcon className="h-4 w-4 rotate-180" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* DECORATIVE ELEMENT */}
                <div className="absolute top-0 right-0 p-24 opacity-[0.02] pointer-events-none select-none">
                    <BoxIcon className="h-96 w-96 text-white" />
                </div>
            </div>
        </div>
    );
};

export default HelpView;