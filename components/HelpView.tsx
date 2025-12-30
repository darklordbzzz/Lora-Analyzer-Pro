
import React, { useState, useMemo } from 'react';
import { 
    InfoIcon, SparklesIcon, ServerIcon, HuggingFaceIcon, 
    CivitaiIcon, CodeBracketIcon, AudioIcon, BoxIcon,
    GlobeIcon, TerminalIcon, PlugIcon, SearchIcon, ChevronDownIcon,
    UserIcon, CloudIcon, DownloadIcon, ChatIcon, RobotIcon, XCircleIcon, CheckCircleIcon,
    ImageIcon
} from './Icons';

interface ProtocolNode {
    id: string;
    category: 'System' | 'Inference' | 'Generative' | 'Networking';
    title: string;
    icon: React.ReactNode;
    tags: string[];
    content: React.ReactNode;
    steps?: string[];
}

const PROTOCOLS: ProtocolNode[] = [
    {
        id: 'overview',
        category: 'System',
        title: 'Central Processing Hub',
        icon: <SparklesIcon className="h-5 w-5" />,
        tags: ['Core', 'Philosophy', 'UI'],
        content: (
            <div className="space-y-6">
                <div className="bg-indigo-600/10 border-l-4 border-indigo-500 p-6 rounded-r-2xl">
                    <p className="text-sm text-indigo-100/90 leading-relaxed italic">
                        The Neural Intelligence Hub is a decentralized interface for cross-modal AI asset auditing and generation. It merges browser-native capabilities with cloud-scale LLMs and local generative backends.
                    </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-gray-900/50 rounded-2xl border border-gray-800">
                        <h4 className="text-[10px] font-black text-indigo-400 uppercase mb-2">Omni-Channel</h4>
                        <p className="text-[11px] text-gray-400">Drag-and-drop assets into any sector for immediate metadata extraction.</p>
                    </div>
                    <div className="p-4 bg-gray-900/50 rounded-2xl border border-gray-800">
                        <h4 className="text-[10px] font-black text-indigo-400 uppercase mb-2">Zero-Auth</h4>
                        <p className="text-[11px] text-gray-400">Gemini 3 Pro/Flash nodes are pre-authenticated for seamless inference.</p>
                    </div>
                    <div className="p-4 bg-gray-900/50 rounded-2xl border border-gray-800">
                        <h4 className="text-[10px] font-black text-indigo-400 uppercase mb-2">Local Sync</h4>
                        <p className="text-[11px] text-gray-400">Bridge directly to Ollama and ComfyUI via specialized socket routing.</p>
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
                <p className="text-sm">The Model Analyzer utilizes a dual-path auditing protocol:</p>
                <div className="space-y-3">
                    <div className="flex gap-4 p-4 bg-gray-900 rounded-2xl border border-gray-800 items-start">
                        <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400 shrink-0"><SearchIcon className="h-4 w-4" /></div>
                        <div>
                            <h5 className="text-[11px] font-black uppercase text-white mb-1">Path A: Cryptographic Hashing</h5>
                            <p className="text-xs text-gray-500">SHA256 fingerprints are generated locally. This hash is compared against global registry signatures on Civitai and Hugging Face to identify the exact training origin.</p>
                        </div>
                    </div>
                    <div className="flex gap-4 p-4 bg-gray-900 rounded-2xl border border-gray-800 items-start">
                        <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400 shrink-0"><BoxIcon className="h-4 w-4" /></div>
                        <div>
                            <h5 className="text-[11px] font-black uppercase text-white mb-1">Path B: Header Decomposition</h5>
                            <p className="text-xs text-gray-500">For <code>.safetensors</code>, the app reads the JSON header segment without loading weights into VRAM, extracting <code>ss_</code> metadata keys (network dim, alpha, learning rate).</p>
                        </div>
                    </div>
                </div>
            </div>
        ),
        steps: [
            'Drag LoRA file into "Input Stream".',
            'Wait for local Hashing sequence to complete.',
            'Select "External Resolve" to pull triggers/previews.',
            'Launch "Sequential Audit" for AI architectural report.'
        ]
    },
    {
        id: 'virtual-kernel',
        category: 'Inference',
        title: 'Virtual Kernel Mounting',
        icon: <PlugIcon className="h-5 w-5" />,
        tags: ['Integrated', 'GGUF', 'Performance'],
        content: (
            <div className="space-y-4">
                <p className="text-sm text-gray-400 leading-relaxed">
                    By mounting a <b>GGUF executable node</b>, the Hub creates a virtual memory map (mmap) allowing the Chat Interface to leverage specialized model biases for logic tasks.
                </p>
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl">
                    <h4 className="text-[10px] font-black text-red-400 uppercase mb-2 flex items-center gap-2"><InfoIcon className="h-3 w-3" /> Technical Limitation</h4>
                    <p className="text-xs text-red-100/60 leading-relaxed italic">
                        This environment simulates local execution through browser-based tensor buffering. For large 70B+ models, use the **Ollama Connector** for native GPU offloading.
                    </p>
                </div>
            </div>
        )
    },
    {
        id: 'image-logic',
        category: 'Generative',
        title: 'Image Studio Rendering',
        icon: <ImageIcon className="h-5 w-5" />,
        tags: ['Flux', 'Pony', 'Illustrious'],
        content: (
            <div className="space-y-6">
                <p className="text-sm">Image Studio supports two primary pipelines:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gradient-to-br from-indigo-900/30 to-gray-900 p-5 rounded-2xl border border-indigo-500/20">
                        <h4 className="text-xs font-black text-indigo-400 uppercase mb-3">Cloud Route (Gemini)</h4>
                        <ul className="text-[11px] text-gray-400 space-y-2">
                            <li>• Zero latency for 1K/2K renders.</li>
                            <li>• Native multimodal understanding.</li>
                            <li>• Supports aspect ratio manipulation.</li>
                        </ul>
                    </div>
                    <div className="bg-gradient-to-br from-orange-900/30 to-gray-900 p-5 rounded-2xl border border-orange-500/20">
                        <h4 className="text-xs font-black text-orange-400 uppercase mb-3">Local Route (ComfyUI)</h4>
                        <ul className="text-[11px] text-gray-400 space-y-2">
                            <li>• Access to FLUX.1 and Pony XL.</li>
                            <li>• Custom JSON Logic Injection.</li>
                            <li>• Specialized Lora triggering.</li>
                        </ul>
                    </div>
                </div>
            </div>
        )
    },
    {
        id: 'network-troubleshoot',
        category: 'Networking',
        title: 'Security & CORS Protocol',
        icon: <GlobeIcon className="h-5 w-5" />,
        tags: ['Fix', 'SSL', 'Security'],
        content: (
            <div className="space-y-4">
                <div className="p-4 bg-red-950/30 border border-red-500/30 rounded-2xl">
                    <h4 className="text-[11px] font-black text-red-500 uppercase flex items-center gap-2 mb-3">
                        <XCircleIcon className="h-4 w-4" /> Protocol Blockade (Mixed Content)
                    </h4>
                    <p className="text-xs text-red-200/70 leading-relaxed mb-4">
                        Modern browsers prevent <b>HTTPS</b> sites (like this Hub) from communicating with <b>HTTP</b> local nodes (like Ollama/ComfyUI default settings).
                    </p>
                    <div className="space-y-4">
                        <div className="bg-black/40 p-4 rounded-xl border border-gray-800">
                            <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block mb-2">Protocol Override Solution</span>
                            <ol className="text-[11px] text-gray-300 space-y-2 list-decimal pl-4">
                                <li>Click the <b>Lock Icon</b> in the browser address bar.</li>
                                <li>Navigate to <b>Site Settings</b>.</li>
                                <li>Change <b>Insecure Content</b> from 'Block' to <b>Allow</b>.</li>
                                <li>Refresh the Hub application.</li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>
        )
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

    const categories = ['System', 'Inference', 'Generative', 'Networking'] as const;

    return (
        <div className="max-w-7xl mx-auto h-[calc(100vh-140px)] flex gap-8 animate-in fade-in duration-500">
            {/* INDEX SIDEBAR */}
            <div className="w-80 flex flex-col gap-6 shrink-0">
                <div className="relative">
                    <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <input 
                        type="text" 
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search protocols..."
                        className="w-full bg-gray-800/40 border border-gray-700/50 rounded-2xl py-3 pl-11 pr-4 text-xs text-gray-200 outline-none focus:ring-1 focus:ring-indigo-500 shadow-xl"
                    />
                </div>

                <div className="flex-grow bg-gray-800/20 border border-gray-700/50 rounded-[2.5rem] p-3 overflow-y-auto custom-scrollbar shadow-2xl backdrop-blur-md">
                    <div className="space-y-6">
                        {categories.map(cat => {
                            const items = filteredProtocols.filter(p => p.category === cat);
                            if (items.length === 0) return null;
                            return (
                                <div key={cat} className="space-y-1.5 px-2">
                                    <h4 className="text-[9px] font-black text-gray-600 uppercase tracking-[0.3em] px-2 mb-3">{cat} Sector</h4>
                                    {items.map(item => (
                                        <button 
                                            key={item.id}
                                            onClick={() => setActiveId(item.id)}
                                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${activeId === item.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-800 hover:text-gray-300'}`}
                                        >
                                            <div className={`p-1.5 rounded-lg ${activeId === item.id ? 'bg-white/20' : 'bg-gray-900'}`}>
                                                {React.cloneElement(item.icon as React.ReactElement, { className: 'h-3.5 w-3.5' })}
                                            </div>
                                            <span className="text-[11px] font-black uppercase tracking-tight truncate">{item.title}</span>
                                        </button>
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-3xl p-5 shadow-xl">
                    <div className="flex items-center gap-3 mb-2">
                        <RobotIcon className="h-4 w-4 text-indigo-400" />
                        <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Protocol v1.4.2</span>
                    </div>
                    <p className="text-[10px] text-indigo-200/50 leading-relaxed uppercase font-bold tracking-tighter">
                        Instructional sets synced with latest GGUF v3 architecture and FLUX.1 hybrid pipelines.
                    </p>
                </div>
            </div>

            {/* CONTENT VIEWER */}
            <div className="flex-grow bg-gray-800/40 border border-gray-700/50 rounded-[3rem] overflow-hidden flex flex-col shadow-2xl backdrop-blur-sm relative">
                <div className="p-10 border-b border-gray-700/50 flex items-center gap-8 bg-gray-900/40 sticky top-0 z-20">
                    <div className="p-5 bg-indigo-600 rounded-[1.5rem] shadow-2xl text-white">
                        {activeNode.icon}
                    </div>
                    <div className="flex-grow">
                        <div className="flex items-center gap-3 mb-2">
                            <span className="px-2 py-0.5 bg-indigo-900/50 text-indigo-400 text-[8px] font-black uppercase tracking-widest border border-indigo-500/30 rounded">
                                {activeNode.category} Protocol
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
                                    <TerminalIcon className="h-4 w-4 text-indigo-400" /> Operational Steps
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {activeNode.steps.map((step, i) => (
                                        <div key={i} className="flex gap-4 items-center p-4 bg-gray-950 rounded-2xl border border-gray-800">
                                            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-black text-white shrink-0 shadow-lg">{i + 1}</div>
                                            <p className="text-xs text-gray-400 font-bold uppercase tracking-tight leading-relaxed">{step}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        <div className="mt-12 pt-8 border-t border-gray-700/50 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <InfoIcon className="h-4 w-4 text-gray-600" />
                                <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">End of Protocol Sector</span>
                            </div>
                            <button 
                                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                                className="p-3 bg-gray-900 hover:bg-gray-800 text-gray-500 rounded-xl transition-all border border-gray-800"
                            >
                                <ChevronDownIcon className="h-4 w-4 rotate-180" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* DECORATIVE ELEMENT */}
                <div className="absolute top-0 right-0 p-24 opacity-[0.03] pointer-events-none pointer-events-none select-none">
                    <BoxIcon className="h-96 w-96 text-white" />
                </div>
            </div>
        </div>
    );
};

export default HelpView;
