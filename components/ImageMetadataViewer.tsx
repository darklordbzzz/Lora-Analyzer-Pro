
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { UploadIcon, ImageIcon, XIcon, CodeBracketIcon, CopyIcon, CheckCircleIcon, SaveIcon, FileIcon, SettingsIcon, ServerIcon, InfoIcon, TrainingIcon, LoaderIcon, UserIcon, BoxIcon, RefreshIcon, PlugIcon, ChevronDownIcon, XCircleIcon, SparklesIcon, LabIcon, TerminalIcon, GlobeIcon, PlusIcon } from './Icons';
import { extractImageMetadata, ImageMeta } from '../services/imageMetadataService';
import { analyzeImageWithLLM, ImageAnalysisResult } from '../services/llmService';
import { LLMModel, ImageStudioState } from '../types';

interface ImageMetadataViewerProps {
    activeModel?: LLMModel;
    onMissingModel?: (modelName: string, apiUrl: string) => void;
    onConnectionError?: () => void;
    onImportToStudio?: (data: ImageStudioState) => void;
}

const ImageMetadataViewer: React.FC<ImageMetadataViewerProps> = ({ activeModel, onMissingModel, onConnectionError, onImportToStudio }) => {
    const [image, setImage] = useState<{ file: File; url: string; meta: ImageMeta } | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<ImageAnalysisResult | null>(null);
    const [analysisError, setAnalysisError] = useState<string | null>(null);
    const [activeSector, setActiveSector] = useState<'parameters' | 'workflow' | 'analysis'>('analysis');
    
    const [visibleSections, setVisibleSections] = useState<Record<string, boolean>>({
        composition: true,
        style: true,
        lighting: true,
        technique: true,
        gamma: true,
        artists: true
    });

    const toggleSection = (section: string) => {
        setVisibleSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const handleFile = useCallback(async (file: File) => {
        if (!file.type.startsWith('image/')) return alert('Upload image file.');
        const url = URL.createObjectURL(file);
        const meta = await extractImageMetadata(file);
        setImage({ file, url, meta });
        setAnalysisResult(null); 
        setAnalysisError(null);
        if (meta.workflow || meta.prompt) setActiveSector('workflow');
        else if (meta.parameters) setActiveSector('parameters');
        else setActiveSector('analysis');
    }, []);

    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

            const items = e.clipboardData?.items;
            if (items) {
                for (let i = 0; i < items.length; i++) {
                    if (items[i].type.indexOf('image') !== -1) {
                        const blob = items[i].getAsFile();
                        if (blob) handleFile(blob);
                    }
                }
            }
        };
        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [handleFile]);

    const handleAnalyzeImage = async () => {
        if (!image || !activeModel) return;
        setIsAnalyzing(true); setAnalysisError(null);
        try {
            const result = await analyzeImageWithLLM(image.file, activeModel);
            setAnalysisResult(result);
            setActiveSector('analysis');
        } catch (e: any) {
            setAnalysisError(e.message || "Logic Pipeline Blocked.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(id);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const saveToProductionConfig = () => {
        if (!analysisResult) return;
        const configData = {
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            source_meta: image?.meta || {},
            analysis: analysisResult,
            label: `Config_${image?.file.name.split('.')[0] || 'Asset'}`
        };
        const blob = new Blob([JSON.stringify(configData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${configData.label}_setup.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const copyFullAudit = () => {
        if (!analysisResult) return;
        const text = `
COMPOSITION DESCRIPTOR
${analysisResult.imageDescriptor}

ARTISTIC STYLE
${analysisResult.styleDescriptor}

LIGHTING & ILLUMINATION
${analysisResult.lightingDescriptor}

TECHNIQUE
${analysisResult.techniqueDescriptor}

COLOR & GAMMA
${analysisResult.colorGammaDescriptor}

SUGGESTED ARTISTS
${analysisResult.suggestedArtists.join(', ')}
        `.trim();
        copyToClipboard(text, 'full-audit');
    };

    const isIntegrated = activeModel?.apiUrl === 'integrated://core';

    return (
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-140px)] animate-in fade-in duration-500">
            {/* LEFT: DROP ZONE */}
            <div className="flex flex-col gap-4 h-full">
                <div 
                    className={`flex-grow border-2 border-dashed rounded-[2.5rem] flex flex-col items-center justify-center transition-all relative overflow-hidden bg-gray-800/20 ${isDragging ? 'border-indigo-500 bg-indigo-900/10' : 'border-gray-700/50'} ${!image ? 'cursor-pointer hover:bg-gray-800/40 hover:border-indigo-500/30' : ''}`}
                    onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]); }} 
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)}
                    onClick={() => !image && document.getElementById('image-upload')?.click()}
                >
                    <input id="image-upload" type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
                    {image ? (
                        <div className="relative w-full h-full flex items-center justify-center p-8 animate-in zoom-in-95 duration-500">
                            <img src={image.url} alt="Target Asset" className="max-w-full max-h-full object-contain shadow-[0_35px_60px_-15px_rgba(0,0,0,0.6)] rounded-3xl border border-white/5" />
                            <button onClick={(e) => { e.stopPropagation(); setImage(null); setAnalysisResult(null); }} className="absolute top-6 right-6 p-3 bg-gray-950/80 backdrop-blur-xl text-white rounded-full hover:bg-red-600 shadow-2xl transition-all hover:scale-110 active:scale-90"><XIcon className="h-6 w-6" /></button>
                        </div>
                    ) : (
                        <div className="text-center p-12 space-y-6">
                            <div className="p-10 bg-gray-900 rounded-[3rem] border border-gray-800 shadow-2xl inline-block relative group">
                                <div className="absolute inset-0 bg-indigo-500/10 rounded-[3rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <ImageIcon className="h-20 w-20 text-indigo-500 opacity-20 relative z-10" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-gray-200 uppercase tracking-widest">Drag-n-Drop Image</h3>
                                <p className="text-gray-500 mt-2 text-[10px] font-black uppercase tracking-[0.3em]">PNG / WEBP / CLIPBOARD DATA</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT: METADATA & ANALYSIS */}
            <div className="bg-gray-800/40 border border-gray-700/50 rounded-[2.5rem] flex flex-col h-full overflow-hidden shadow-2xl backdrop-blur-md">
                <div className="p-6 border-b border-gray-700/50 flex justify-between items-center bg-gray-900/40">
                    <div className="flex flex-col">
                        <h2 className="font-black text-xl flex items-center gap-3 uppercase tracking-tighter text-white">
                            <CodeBracketIcon className="h-6 w-6 text-indigo-400" /> Neural Analytics
                        </h2>
                        {isIntegrated && (
                            <span className="text-[9px] font-black text-green-400 uppercase tracking-widest mt-1 flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_5px_#22c55e]"></div>
                                Virtual Hub Sensor Online
                            </span>
                        )}
                    </div>
                    <div className="flex gap-3">
                        {analysisResult && (
                             <button onClick={saveToProductionConfig} className="px-5 py-2.5 bg-gray-700 hover:bg-gray-600 text-white text-[10px] font-black uppercase rounded-xl shadow-xl transition-all active:scale-95 flex items-center gap-2">
                                <SaveIcon className="h-4 w-4" /> Export Setup
                             </button>
                        )}
                        {image && (
                            <button onClick={() => onImportToStudio?.({ prompt: image.meta.parameters || '', aspectRatio: '1:1', provider: 'comfyui' })} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase rounded-xl shadow-xl transition-all active:scale-95">Send to Studio</button>
                        )}
                        {image && activeModel && (
                            <button onClick={handleAnalyzeImage} disabled={isAnalyzing} className="px-6 py-2.5 bg-gray-700 hover:bg-indigo-600 text-white text-[10px] font-black uppercase rounded-xl shadow-xl disabled:opacity-50 transition-all flex items-center gap-2">
                                {isAnalyzing ? <LoaderIcon className="h-4 w-4 animate-spin" /> : <RefreshIcon className="h-4 w-4" />}
                                Initiate Audit
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex bg-gray-950/50 border-b border-gray-700/50 p-1">
                    <button onClick={() => setActiveSector('analysis')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all rounded-xl ${activeSector === 'analysis' ? 'bg-indigo-600/10 text-indigo-400' : 'text-gray-500 hover:text-gray-300'}`}>AI Analysis</button>
                    <button onClick={() => setActiveSector('parameters')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all rounded-xl ${activeSector === 'parameters' ? 'bg-indigo-600/10 text-indigo-400' : 'text-gray-500 hover:text-gray-300'}`}>Raw Params</button>
                    <button onClick={() => setActiveSector('workflow')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all rounded-xl ${activeSector === 'workflow' ? 'bg-indigo-600/10 text-indigo-400' : 'text-gray-500 hover:text-gray-300'}`}>Logic Schema (JSON)</button>
                </div>

                {activeSector === 'analysis' && analysisResult && (
                    <div className="flex flex-wrap gap-2 p-3 bg-gray-900/60 border-b border-gray-700/50 justify-center">
                        {[
                            {id: 'composition', label: 'Narrative'},
                            {id: 'style', label: 'Style'},
                            {id: 'lighting', label: 'Lighting'},
                            {id: 'technique', label: 'Medium'},
                            {id: 'gamma', label: 'Color'},
                            {id: 'artists', label: 'Artists'}
                        ].map(sec => (
                            <button 
                                key={sec.id}
                                onClick={() => toggleSection(sec.id)}
                                className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter transition-all border ${visibleSections[sec.id] ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300' : 'bg-transparent border-gray-700 text-gray-600'}`}
                            >
                                {sec.label}
                            </button>
                        ))}
                    </div>
                )}

                <div className="flex-grow overflow-auto custom-scrollbar bg-gray-900/10">
                    {!image ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-700 space-y-6 grayscale opacity-10">
                             <BoxIcon className="h-24 w-24" />
                             <p className="text-sm font-black uppercase tracking-[0.5em]">Awaiting Uplink</p>
                        </div>
                    ) : (
                        <div className="animate-in fade-in duration-500">
                            
                            {activeSector === 'analysis' && (
                                <div className="divide-y divide-gray-800/30">
                                    {analysisResult ? (
                                        <>
                                            <div className="bg-gray-950/40 p-3 border-b border-gray-800/50 flex justify-between items-center sticky top-0 z-10 backdrop-blur-md">
                                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Inference Report</span>
                                                <button onClick={copyFullAudit} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600/10 text-indigo-400 text-[10px] font-black uppercase rounded-lg border border-indigo-500/20 hover:bg-indigo-600 hover:text-white transition-all">
                                                    {copiedField === 'full-audit' ? <CheckCircleIcon className="h-3 w-3" /> : <CopyIcon className="h-3 w-3" />}
                                                    {copiedField === 'full-audit' ? 'Copied' : 'Copy All'}
                                                </button>
                                            </div>

                                            {visibleSections.composition && (
                                                <div className="p-5 space-y-2">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] flex items-center gap-2">
                                                            <InfoIcon className="h-3.5 w-3.5" /> Composition Descriptor
                                                        </span>
                                                        <button onClick={() => copyToClipboard(analysisResult.imageDescriptor, 'comp')} className="text-gray-600 hover:text-indigo-400 transition-all"><CopyIcon className="h-3.5 w-3.5" /></button>
                                                    </div>
                                                    <div className="bg-indigo-950/20 p-4 rounded-2xl border border-indigo-500/10 shadow-inner">
                                                        <p className="text-sm text-indigo-50 leading-relaxed font-serif italic">"{analysisResult.imageDescriptor}"</p>
                                                    </div>
                                                </div>
                                            )}

                                            {visibleSections.style && (
                                                <div className="p-5 space-y-2">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-[10px] font-black text-purple-400 uppercase tracking-[0.3em] flex items-center gap-2">
                                                            <LabIcon className="h-3.5 w-3.5" /> Artistic Style
                                                        </span>
                                                        <button onClick={() => copyToClipboard(analysisResult.styleDescriptor, 'style')} className="text-gray-600 hover:text-purple-400 transition-all"><CopyIcon className="h-3.5 w-3.5" /></button>
                                                    </div>
                                                    <div className="bg-gray-950/40 p-4 rounded-2xl border border-gray-700/50 leading-relaxed text-sm text-gray-300">
                                                        {analysisResult.styleDescriptor}
                                                    </div>
                                                </div>
                                            )}

                                            {visibleSections.lighting && (
                                                <div className="p-5 space-y-2">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-[10px] font-black text-orange-400 uppercase tracking-[0.3em] flex items-center gap-2">
                                                            <SparklesIcon className="h-3.5 w-3.5" /> Lighting & Illumination
                                                        </span>
                                                        <button onClick={() => copyToClipboard(analysisResult.lightingDescriptor, 'light')} className="text-gray-600 hover:text-orange-400 transition-all"><CopyIcon className="h-3.5 w-3.5" /></button>
                                                    </div>
                                                    <div className="bg-gray-950/40 p-4 rounded-2xl border border-gray-700/50 leading-relaxed text-sm text-gray-300">
                                                        {analysisResult.lightingDescriptor}
                                                    </div>
                                                </div>
                                            )}

                                            {visibleSections.technique && (
                                                <div className="p-5 space-y-2">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] flex items-center gap-2">
                                                            <CodeBracketIcon className="h-3.5 w-3.5" /> Technique
                                                        </span>
                                                        <button onClick={() => copyToClipboard(analysisResult.techniqueDescriptor, 'tech')} className="text-gray-600 hover:text-blue-400 transition-all"><CopyIcon className="h-3.5 w-3.5" /></button>
                                                    </div>
                                                    <div className="bg-gray-950/40 p-4 rounded-2xl border border-gray-700/50 leading-relaxed text-sm text-gray-300">
                                                        {analysisResult.techniqueDescriptor}
                                                    </div>
                                                </div>
                                            )}

                                            {visibleSections.gamma && (
                                                <div className="p-5 space-y-2">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-[10px] font-black text-teal-400 uppercase tracking-[0.3em] flex items-center gap-2">
                                                            <RefreshIcon className="h-3.5 w-3.5" /> Color & Gamma
                                                        </span>
                                                        <button onClick={() => copyToClipboard(analysisResult.colorGammaDescriptor, 'gamma')} className="text-gray-600 hover:text-teal-400 transition-all"><CopyIcon className="h-3.5 w-3.5" /></button>
                                                    </div>
                                                    <div className="bg-gray-950/40 p-4 rounded-2xl border border-gray-700/50 leading-relaxed text-sm text-gray-300">
                                                        {analysisResult.colorGammaDescriptor}
                                                    </div>
                                                </div>
                                            )}

                                            {visibleSections.artists && (
                                                <div className="p-5 space-y-3 pb-12">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-[10px] font-black text-green-400 uppercase tracking-[0.3em] flex items-center gap-2">
                                                            <UserIcon className="h-3.5 w-3.5" /> Suggested Artists
                                                        </span>
                                                        <button onClick={() => copyToClipboard(analysisResult.suggestedArtists?.join(', ') || '', 'art')} className="text-gray-600 hover:text-green-400 transition-all"><CopyIcon className="h-3.5 w-3.5" /></button>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {analysisResult.suggestedArtists?.map((artist, i) => (
                                                            <span key={i} className="px-3 py-1.5 bg-green-950/20 text-green-400 text-[9px] font-black uppercase rounded-lg border border-green-500/10 transition-all cursor-default hover:bg-green-600 hover:text-white">
                                                                {artist}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    ) : analysisError ? (
                                        <div className="p-12 text-center space-y-4">
                                            <XCircleIcon className="h-16 w-16 text-red-500 mx-auto opacity-50" />
                                            <p className="text-xs text-red-200/80 font-bold uppercase leading-loose">{analysisError}</p>
                                            <button onClick={() => window.location.reload()} className="px-8 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase transition-all shadow-xl">Reset Hub</button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-80 text-gray-600 space-y-4 opacity-30 grayscale">
                                            <div className="p-8 bg-gray-950 rounded-[3rem] border border-gray-800 shadow-2xl"><InfoIcon className="h-12 w-12" /></div>
                                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-center max-w-xs leading-relaxed">Initiate Audit Sequence to reveal neural DNA sectors</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeSector === 'parameters' && (
                                <div className="p-5 space-y-4">
                                    <div className="flex justify-between items-center">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Raw Parameters (D-DNA)</span>
                                            <span className="text-[8px] font-black text-indigo-500/60 uppercase tracking-widest mt-1">Direct Inference Instructions Protocol</span>
                                        </div>
                                        <button onClick={() => copyToClipboard(image.meta.parameters || '', 'p')} className="text-gray-400 hover:text-indigo-400 transition-all">
                                            {copiedField === 'p' ? <CheckCircleIcon className="h-5 w-5 text-green-500"/> : <CopyIcon className="h-5 w-5"/>}
                                        </button>
                                    </div>
                                    <div className="bg-black/60 p-5 rounded-2xl border border-gray-800 font-mono text-[11px] text-gray-400 whitespace-pre-wrap leading-relaxed shadow-inner min-h-[300px]">
                                        {image.meta.parameters || '// No A1111/Generation parameters found in file headers.'}
                                    </div>
                                    <div className="bg-indigo-900/10 p-4 rounded-xl border border-indigo-500/10">
                                        <p className="text-[9px] text-indigo-300/50 uppercase font-black tracking-widest leading-relaxed">
                                            <span className="text-indigo-400 mr-1">Note:</span> 
                                            Raw Params provide the exact samplers, seed, and CFG used by the renderer. Use these to recreate the noise pattern of this specific generation.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {activeSector === 'workflow' && (
                                <div className="p-5 space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black text-orange-400 uppercase tracking-[0.3em]">ComfyUI Logic Graph</span>
                                        <button onClick={() => copyToClipboard(JSON.stringify(image.meta.workflow || image.meta.prompt || {}, null, 2), 'w')} className="text-gray-400 hover:text-orange-400 transition-all">
                                            {copiedField === 'w' ? <CheckCircleIcon className="h-5 w-5 text-green-500"/> : <CopyIcon className="h-5 w-5"/>}
                                        </button>
                                    </div>
                                    <div className="bg-gray-950 p-6 rounded-2xl border border-gray-800 font-mono text-[10px] text-orange-200/40 whitespace-pre leading-normal overflow-x-auto custom-scrollbar shadow-inner min-h-[400px]">
                                        {image.meta.workflow || image.meta.prompt 
                                            ? JSON.stringify(image.meta.workflow || image.meta.prompt, null, 2) 
                                            : '// No ComfyUI Graph Nodes found.'}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ImageMetadataViewer;
