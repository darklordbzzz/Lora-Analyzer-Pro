
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  UploadIcon, ImageIcon, XIcon, CodeBracketIcon, CopyIcon, 
  CheckCircleIcon, SaveIcon, LoaderIcon, BoxIcon, RefreshIcon, 
  PlugIcon, InfoIcon, LabIcon, SparklesIcon, XCircleIcon, TerminalIcon
} from './Icons';
import { extractImageMetadata, ImageMeta } from '../services/imageMetadataService';
import { analyzeImageWithLLM } from '../services/llmService';
import { LLMModel, ImageAnalysisResult } from '../types';

interface ImageMetadataViewerProps {
    activeModel?: LLMModel;
}

const ImageMetadataViewer: React.FC<ImageMetadataViewerProps> = ({ activeModel }) => {
    const [image, setImage] = useState<{ file: File; url: string; meta: ImageMeta } | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [result, setResult] = useState<ImageAnalysisResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const handleFile = async (file: File) => {
        if (!file.type.startsWith('image/')) return;
        const url = URL.createObjectURL(file);
        const meta = await extractImageMetadata(file);
        setImage({ file, url, meta });
        setResult(null);
        setError(null);
    };

    const handleAnalyze = async () => {
        if (!image || !activeModel) return;
        setIsAnalyzing(true);
        setError(null);
        setResult(null);
        
        try {
            const data = await analyzeImageWithLLM(image.file, activeModel);
            setResult(data);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleCopyFix = () => {
        const cmd = 'OLLAMA_ORIGINS="*" ollama serve';
        navigator.clipboard.writeText(cmd);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 h-[calc(100vh-140px)] animate-in fade-in duration-500 overflow-hidden">
            {/* Sidebar Uplink */}
            <div className="lg:col-span-4 flex flex-col gap-6 h-full">
                <div 
                    className={`flex-grow border-2 border-dashed rounded-[3rem] bg-gray-800/20 flex flex-col items-center justify-center transition-all relative overflow-hidden ${isDragging ? 'border-indigo-500 bg-indigo-500/10' : 'border-gray-700/50'}`}
                    onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]); }}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onClick={() => !image && document.getElementById('audit-upload')?.click()}
                >
                    <input id="audit-upload" type="file" className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
                    {image ? (
                        <div className="w-full h-full p-8 relative flex items-center justify-center animate-in zoom-in-95 duration-500">
                            <img src={image.url} alt="Target" className="max-w-full max-h-full object-contain rounded-[2rem] shadow-[0_40px_80px_rgba(0,0,0,0.8)] border border-white/5" />
                            <button onClick={(e) => { e.stopPropagation(); setImage(null); setResult(null); setError(null); }} className="absolute top-10 right-10 p-4 bg-gray-950/80 backdrop-blur-xl text-white rounded-full hover:bg-red-600 transition-all shadow-2xl active:scale-90"><XIcon className="h-6 w-6" /></button>
                        </div>
                    ) : (
                        <div className="text-center p-12 space-y-8 cursor-pointer group">
                            <div className="p-12 bg-gray-900 rounded-[3rem] border border-gray-800 shadow-2xl inline-block relative overflow-hidden">
                                <div className="absolute inset-0 bg-indigo-500/10 group-hover:scale-150 transition-transform duration-1000 blur-3xl opacity-0 group-hover:opacity-100"></div>
                                <ImageIcon className="h-20 w-20 text-indigo-500/40 relative z-10 group-hover:text-indigo-400 transition-colors" />
                            </div>
                            <h3 className="text-3xl font-black text-gray-400 uppercase tracking-[0.2em] group-hover:text-white transition-colors">Visual Target</h3>
                        </div>
                    )}
                </div>

                <div className="bg-gray-950/60 border border-gray-800 rounded-[2.5rem] p-8 space-y-4 shadow-2xl">
                    <button 
                        onClick={handleAnalyze} 
                        disabled={!image || isAnalyzing}
                        className={`w-full py-5 rounded-[1.5rem] font-black uppercase tracking-[0.4em] text-xs transition-all flex items-center justify-center gap-4 border-2 ${!image ? 'bg-gray-800 text-gray-600 border-gray-700' : 'bg-indigo-600 border-indigo-500 hover:bg-indigo-500 text-white shadow-[0_20px_50px_rgba(99,102,241,0.3)] active:scale-95'}`}
                    >
                        {isAnalyzing ? <LoaderIcon className="h-5 w-5 animate-spin" /> : <SparklesIcon className="h-5 w-5" />}
                        {isAnalyzing ? 'Processing' : 'Initiate Audit'}
                    </button>
                    <div className="flex items-center justify-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${activeModel?.apiUrl ? 'bg-orange-500 shadow-[0_0_5px_#f59e0b]' : 'bg-indigo-500'}`} />
                        <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest opacity-60 truncate">Active Node: {activeModel?.name || 'Disconnected'}</p>
                    </div>
                </div>
            </div>

            {/* Main Result Display */}
            <div className="lg:col-span-8 bg-gray-900/40 border border-gray-700/50 rounded-[4rem] flex flex-col h-full overflow-hidden shadow-2xl relative backdrop-blur-md">
                <div className="p-10 border-b border-gray-700/50 bg-gray-900/60 backdrop-blur-xl sticky top-0 z-30 flex justify-between items-center">
                    <div>
                        <h2 className="text-4xl font-black text-white uppercase tracking-tighter flex items-center gap-5">
                            <BoxIcon className="h-10 w-10 text-indigo-400" /> Neural Dossier
                        </h2>
                    </div>
                </div>

                <div className="flex-grow p-12 overflow-y-auto custom-scrollbar">
                    {error ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-10 animate-in shake duration-500">
                            <div className="p-10 bg-red-500/10 rounded-[3rem] border border-red-500/20 shadow-2xl">
                                <XCircleIcon className="h-16 w-16 text-red-500" />
                            </div>
                            <div className="space-y-6 max-w-lg">
                                <h3 className="text-3xl font-black text-white uppercase tracking-tighter">Local Pipeline Severed</h3>
                                
                                <div className="text-sm text-red-200/60 leading-relaxed font-mono bg-red-950/20 p-8 rounded-3xl border border-red-500/10 text-left">
                                    {error}
                                </div>

                                <div className="bg-gray-950 p-8 rounded-[2rem] border border-gray-800 text-left space-y-6 shadow-inner">
                                    <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-3">
                                        <TerminalIcon className="h-4 w-4" /> Node Repair Protocol
                                    </h4>
                                    <p className="text-[11px] text-gray-500 font-bold uppercase leading-tight tracking-tight">
                                        If using Ollama, ensure your server permits requests from this origin. Deploy the following command in terminal:
                                    </p>
                                    <div className="relative group">
                                        <code className="block bg-black p-5 rounded-xl text-emerald-400 font-mono text-[10px] border border-gray-800 overflow-x-auto whitespace-pre">
                                            OLLAMA_ORIGINS="*" ollama serve
                                        </code>
                                        <button onClick={handleCopyFix} className="absolute top-2 right-2 p-2 bg-gray-800 hover:bg-indigo-600 text-white rounded-lg transition-all shadow-xl">
                                            {copied ? <CheckCircleIcon className="h-3 w-3" /> : <CopyIcon className="h-3 w-3" />}
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-gray-600 font-bold uppercase italic">
                                        Note: If using LM Studio, ensure "Local Server" is active and "CORS" is toggled ON.
                                    </p>
                                </div>

                                <div className="pt-4 flex flex-col items-center gap-6">
                                    <button 
                                        onClick={handleAnalyze} 
                                        className="px-12 py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[1.5rem] text-[11px] font-black uppercase tracking-[0.3em] transition-all shadow-[0_20px_50px_rgba(99,102,241,0.3)] active:scale-95"
                                    >
                                        Re-Probe Local Uplink
                                    </button>
                                    <button onClick={() => (window as any).onViewChange?.('help')} className="text-[10px] font-black uppercase tracking-widest text-gray-600 hover:text-indigo-400 transition-colors">Access Technical Documentation</button>
                                </div>
                            </div>
                        </div>
                    ) : result ? (
                        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 pb-20">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="bg-gray-950/40 p-10 rounded-[3rem] border border-gray-800 shadow-inner group transition-all hover:bg-gray-950/60">
                                    <span className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.4em] block mb-6 opacity-60">Composition Blueprint</span>
                                    <p className="text-lg text-gray-100 leading-relaxed font-medium">{result.compositionDescriptor}</p>
                                </div>
                                <div className="bg-gray-950/40 p-10 rounded-[3rem] border border-gray-800 shadow-inner group transition-all hover:bg-gray-950/60">
                                    <span className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.4em] block mb-6 opacity-60">Architectural DNA</span>
                                    <p className="text-lg text-gray-100 leading-relaxed font-medium">{result.artisticStyle}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div className="p-8 bg-gray-900/60 border border-gray-800 rounded-[2.5rem]">
                                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-[0.3em] block mb-4">Illumination</span>
                                    <p className="text-sm text-gray-300 font-bold tracking-tight">{result.lightingIllumination}</p>
                                </div>
                                <div className="p-8 bg-gray-900/60 border border-gray-800 rounded-[2.5rem]">
                                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-[0.3em] block mb-4">Technique</span>
                                    <p className="text-sm text-gray-300 font-bold tracking-tight">{result.technique}</p>
                                </div>
                                <div className="p-8 bg-gray-900/60 border border-gray-800 rounded-[2.5rem]">
                                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-[0.3em] block mb-4">Color Palette</span>
                                    <p className="text-sm text-gray-300 font-bold tracking-tight">{result.colorGamma}</p>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <h4 className="text-[11px] font-black text-white uppercase tracking-[0.4em] flex items-center gap-4">
                                    <div className="h-[1px] flex-grow bg-gray-800"></div>
                                    Inferred Artists
                                    <div className="h-[1px] flex-grow bg-gray-800"></div>
                                </h4>
                                <div className="flex flex-wrap justify-center gap-4">
                                    {result.suggestedArtists.map((artist, i) => (
                                        <span key={i} className="px-8 py-3 bg-indigo-600/10 text-indigo-400 text-[11px] font-black uppercase tracking-[0.2em] rounded-full border border-indigo-500/20 hover:bg-indigo-600 hover:text-white transition-all cursor-default">
                                            {artist}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : isAnalyzing ? (
                        <div className="h-full flex flex-col items-center justify-center space-y-12 py-20">
                            <div className="relative">
                                <LoaderIcon className="h-40 w-40 text-indigo-500 animate-[spin_3s_linear_infinite]" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <SparklesIcon className="h-12 w-12 text-white animate-pulse" />
                                </div>
                            </div>
                            <div className="text-center space-y-4">
                                <h3 className="text-4xl font-black text-white uppercase tracking-[0.4em] animate-pulse">Analyzing</h3>
                                <p className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.8em] opacity-60">Local Neural Archi In Sequence</p>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center opacity-10 grayscale py-40 select-none pointer-events-none">
                            <BoxIcon className="h-48 w-48 mb-12" />
                            <h4 className="text-5xl font-black uppercase tracking-[0.8em] mb-4 text-white">Node Idle</h4>
                            <p className="text-sm font-black uppercase tracking-[0.4em] opacity-40">Load Asset to Initiate Local Inference</p>
                        </div>
                    )}
                </div>

                {/* Decorative Grid Overlay */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:20px_20px] z-10"></div>
            </div>
        </div>
    );
};

export default ImageMetadataViewer;
