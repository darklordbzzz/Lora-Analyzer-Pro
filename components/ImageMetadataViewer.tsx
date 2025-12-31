
import React, { useState, useCallback } from 'react';
import { 
  UploadIcon, ImageIcon, XIcon, CodeBracketIcon, CopyIcon, 
  CheckCircleIcon, SaveIcon, LoaderIcon, BoxIcon, RefreshIcon, 
  PlugIcon, InfoIcon, LabIcon, SparklesIcon, XCircleIcon 
} from './Icons';
import { extractImageMetadata, ImageMeta } from '../services/imageMetadataService';
import { analyzeImageWithLLM } from '../services/llmService';
import { LLMModel, ImageStudioState, ImageAnalysisResult } from '../types';

interface ImageMetadataViewerProps {
    activeModel?: LLMModel;
    onConnectionError?: () => void;
    onImportToStudio?: (data: ImageStudioState) => void;
}

const ToggleSwitch: React.FC<{ active: boolean; onToggle: () => void }> = ({ active, onToggle }) => (
    <button 
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-300 focus:outline-none ${active ? 'bg-indigo-600' : 'bg-gray-700'}`}
    >
        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform duration-300 ${active ? 'translate-x-5.5' : 'translate-x-1'}`} />
    </button>
);

const ResultSection: React.FC<{ 
    title: string; 
    content: string | string[]; 
    isActive: boolean;
    onToggle: () => void;
    onCopy: (e: React.MouseEvent) => void; 
    isCopied: boolean;
}> = ({ title, content, isActive, onToggle, onCopy, isCopied }) => {
    const displayContent = Array.isArray(content) ? content.join(', ') : content;
    
    return (
        <div className={`transition-all duration-500 border rounded-2xl p-5 mb-4 ${isActive ? 'bg-indigo-600/5 border-indigo-500/30 shadow-lg' : 'bg-gray-950/20 border-gray-800/50 opacity-60 grayscale-[0.5]'}`}>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                    <ToggleSwitch active={isActive} onToggle={onToggle} />
                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors ${isActive ? 'text-indigo-400' : 'text-gray-600'}`}>
                        {title}
                    </span>
                </div>
                <button 
                    onClick={onCopy}
                    className={`p-2 rounded-lg border transition-all ${isCopied ? 'bg-green-600 border-green-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-500 hover:text-white hover:bg-indigo-600/20'}`}
                    title={`Copy ${title}`}
                >
                    {isCopied ? <CheckCircleIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
                </button>
            </div>
            
            {isActive && (
                <div className="animate-in fade-in slide-in-from-top-1 duration-300">
                    <div className="p-4 bg-black/40 rounded-xl border border-white/5 shadow-inner">
                        <p className="text-xs text-gray-300 leading-relaxed font-medium selection:bg-indigo-500/40">
                            {displayContent}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

const ImageMetadataViewer: React.FC<ImageMetadataViewerProps> = ({ activeModel, onImportToStudio }) => {
    const [image, setImage] = useState<{ file: File; url: string; meta: ImageMeta } | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<ImageAnalysisResult | null>(null);
    const [analysisError, setAnalysisError] = useState<string | null>(null);
    
    // Toggle state for sections
    const [activeSections, setActiveSections] = useState<Record<string, boolean>>({
        composition: true,
        style: true,
        lighting: true,
        technique: true,
        color: true,
        artists: true
    });

    const toggleSection = (id: string) => {
        setActiveSections(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleFile = useCallback(async (file: File) => {
        if (!file.type.startsWith('image/')) return alert('Upload image file.');
        const url = URL.createObjectURL(file);
        const meta = await extractImageMetadata(file);
        setImage({ file, url, meta });
        setAnalysisResult(null); 
        setAnalysisError(null);
    }, []);

    const handleAnalyzeImage = async () => {
        if (!image || !activeModel) return;
        setIsAnalyzing(true); 
        setAnalysisError(null);
        try {
            const result = await analyzeImageWithLLM(image.file, activeModel);
            setAnalysisResult(result);
            // Ensure all switches are ON after analysis
            setActiveSections({
                composition: true, style: true, lighting: true, technique: true, color: true, artists: true
            });
        } catch (e: any) {
            setAnalysisError(e.message || "Logic Pipeline Blocked.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const copyToClipboard = (text: string, id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        navigator.clipboard.writeText(text);
        setCopiedField(id);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const copyFullAudit = () => {
        if (!analysisResult) return;
        const text = `
COMPOSITION DESCRIPTOR
${analysisResult.compositionDescriptor}

ARTISTIC STYLE
${analysisResult.artisticStyle}

LIGHTING & ILLUMINATION
${analysisResult.lightingIllumination}

TECHNIQUE
${analysisResult.technique}

COLOR & GAMMA
${analysisResult.colorGamma}

SUGGESTED ARTISTS
${analysisResult.suggestedArtists.join(', ')}
        `.trim();
        copyToClipboard(text, 'full-audit');
    };

    return (
        <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-140px)] animate-in fade-in duration-500">
            {/* Visual Uplink Area - 1/3 Width */}
            <div className="lg:col-span-1 flex flex-col gap-4 h-full">
                <div 
                    className={`flex-grow border-2 border-dashed rounded-[2.5rem] flex flex-col items-center justify-center transition-all relative overflow-hidden bg-gray-800/20 ${isDragging ? 'border-indigo-500 bg-indigo-900/10' : 'border-gray-700/50'} ${!image ? 'cursor-pointer hover:bg-gray-800/40' : ''}`}
                    onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]); }} 
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)}
                    onClick={() => !image && document.getElementById('image-upload')?.click()}
                >
                    <input id="image-upload" type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
                    {image ? (
                        <div className="relative w-full h-full flex items-center justify-center p-6 animate-in zoom-in-95">
                            <img src={image.url} alt="Target Asset" className="max-w-full max-h-full object-contain rounded-3xl border border-white/5 shadow-2xl" />
                            <button onClick={(e) => { e.stopPropagation(); setImage(null); setAnalysisResult(null); }} className="absolute top-4 right-4 p-2.5 bg-gray-950/80 backdrop-blur-xl text-white rounded-full hover:bg-red-600 shadow-2xl transition-all"><XIcon className="h-5 w-5" /></button>
                        </div>
                    ) : (
                        <div className="text-center p-8 space-y-6">
                            <div className="p-10 bg-gray-900 rounded-[3rem] border border-gray-800 shadow-2xl inline-block relative group">
                                <div className="absolute inset-0 bg-indigo-500/10 rounded-[3rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <ImageIcon className="h-16 w-16 text-indigo-500 opacity-20 relative z-10" />
                            </div>
                            <h3 className="text-xl font-black text-gray-200 uppercase tracking-widest">Visual Uplink</h3>
                        </div>
                    )}
                </div>
            </div>

            {/* Neural Dossier Result Side - 2/3 Width */}
            <div className="lg:col-span-2 bg-gray-800/40 border border-gray-700/50 rounded-[2.5rem] flex flex-col h-full overflow-hidden shadow-2xl backdrop-blur-md">
                <div className="p-8 border-b border-gray-700/50 flex justify-between items-center bg-gray-900/40 sticky top-0 z-20">
                    <h2 className="font-black text-2xl flex items-center gap-4 uppercase tracking-tighter text-white">
                        <SparklesIcon className="h-7 w-7 text-indigo-400" /> Neural Dossier
                    </h2>
                    <div className="flex gap-3">
                        {analysisResult && (
                            <button 
                                onClick={copyFullAudit} 
                                className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 border ${copiedField === 'full-audit' ? 'bg-green-600 border-green-500 text-white' : 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600'}`}
                            >
                                {copiedField === 'full-audit' ? <CheckCircleIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
                                Copy Full Audit
                            </button>
                        )}
                        {image && (
                            <button 
                                onClick={handleAnalyzeImage} 
                                disabled={isAnalyzing} 
                                className="px-7 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase rounded-xl transition-all flex items-center gap-2 shadow-lg disabled:opacity-50"
                            >
                                {isAnalyzing ? <LoaderIcon className="h-4 w-4 animate-spin" /> : <RefreshIcon className="h-4 w-4" />}
                                {isAnalyzing ? 'Audit Running' : 'Initiate Neural Audit'}
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex-grow overflow-auto custom-scrollbar p-8 space-y-2">
                    {isAnalyzing && (
                        <div className="h-full flex flex-col items-center justify-center space-y-6 py-20">
                            <div className="relative">
                                <LoaderIcon className="h-16 w-16 text-indigo-500 animate-spin" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <SparklesIcon className="h-6 w-6 text-white animate-pulse" />
                                </div>
                            </div>
                            <p className="text-[12px] font-black text-indigo-400 uppercase tracking-[0.5em] animate-pulse">Scanning Visual Parameters...</p>
                        </div>
                    )}

                    {analysisResult && !isAnalyzing && (
                        <div className="animate-in fade-in duration-500 pb-10">
                            <ResultSection 
                                title="Composition Descriptor" 
                                content={analysisResult.compositionDescriptor} 
                                isActive={activeSections.composition}
                                onToggle={() => toggleSection('composition')}
                                onCopy={(e) => copyToClipboard(analysisResult.compositionDescriptor, 'composition', e)}
                                isCopied={copiedField === 'composition'}
                            />
                            <ResultSection 
                                title="Artistic Style" 
                                content={analysisResult.artisticStyle} 
                                isActive={activeSections.style}
                                onToggle={() => toggleSection('style')}
                                onCopy={(e) => copyToClipboard(analysisResult.artisticStyle, 'style', e)}
                                isCopied={copiedField === 'style'}
                            />
                            <ResultSection 
                                title="Lighting & Illumination" 
                                content={analysisResult.lightingIllumination} 
                                isActive={activeSections.lighting}
                                onToggle={() => toggleSection('lighting')}
                                onCopy={(e) => copyToClipboard(analysisResult.lightingIllumination, 'lighting', e)}
                                isCopied={copiedField === 'lighting'}
                            />
                            <ResultSection 
                                title="Technique" 
                                content={analysisResult.technique} 
                                isActive={activeSections.technique}
                                onToggle={() => toggleSection('technique')}
                                onCopy={(e) => copyToClipboard(analysisResult.technique, 'technique', e)}
                                isCopied={copiedField === 'technique'}
                            />
                            <ResultSection 
                                title="Color & Gamma" 
                                content={analysisResult.colorGamma} 
                                isActive={activeSections.color}
                                onToggle={() => toggleSection('color')}
                                onCopy={(e) => copyToClipboard(analysisResult.colorGamma, 'color', e)}
                                isCopied={copiedField === 'color'}
                            />
                            
                            {/* Suggested Artists with Switch */}
                            <div className={`transition-all duration-500 border rounded-2xl p-5 ${activeSections.artists ? 'bg-indigo-600/5 border-indigo-500/30 shadow-lg' : 'bg-gray-950/20 border-gray-800/50 opacity-60 grayscale-[0.5]'}`}>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-4">
                                        <ToggleSwitch active={activeSections.artists} onToggle={() => toggleSection('artists')} />
                                        <span className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors ${activeSections.artists ? 'text-indigo-400' : 'text-gray-600'}`}>Suggested Artists</span>
                                    </div>
                                    <button 
                                        onClick={(e) => copyToClipboard(analysisResult.suggestedArtists.join(', '), 'artists', e)}
                                        className={`p-2 rounded-lg border transition-all ${copiedField === 'artists' ? 'bg-green-600 border-green-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-500 hover:text-white hover:bg-indigo-600/20'}`}
                                    >
                                        {copiedField === 'artists' ? <CheckCircleIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
                                    </button>
                                </div>
                                {activeSections.artists && (
                                    <div className="flex flex-wrap gap-2 p-4 bg-black/40 rounded-xl border border-white/5 animate-in slide-in-from-top-1">
                                        {analysisResult.suggestedArtists.map((artist, idx) => (
                                            <span key={idx} className="px-3 py-1.5 bg-indigo-900/30 text-indigo-300 text-[10px] font-black uppercase rounded-lg border border-indigo-500/20">
                                                {artist}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {!analysisResult && !isAnalyzing && (
                        <div className="h-full flex flex-col items-center justify-center opacity-10 py-20 grayscale pointer-events-none">
                            <BoxIcon className="h-32 w-32 mb-8" />
                            <h4 className="text-2xl font-black uppercase tracking-[0.4em]">Audit Matrix Idle</h4>
                        </div>
                    )}

                    {analysisError && (
                        <div className="p-8 text-center space-y-4 bg-red-950/20 border border-red-500/20 rounded-[2rem] animate-in shake">
                            <XCircleIcon className="h-16 w-16 text-red-500 mx-auto" />
                            <p className="text-[12px] text-red-400 font-bold uppercase tracking-widest">{analysisError}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ImageMetadataViewer;
