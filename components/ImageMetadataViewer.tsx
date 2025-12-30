
import React, { useState, useCallback, useEffect } from 'react';
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
    onMissingModel?: (modelName: string, apiUrl: string) => void;
    onConnectionError?: () => void;
    onImportToStudio?: (data: ImageStudioState) => void;
}

const ImageMetadataViewer: React.FC<ImageMetadataViewerProps> = ({ activeModel, onImportToStudio }) => {
    const [image, setImage] = useState<{ file: File; url: string; meta: ImageMeta } | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<ImageAnalysisResult | null>(null);
    const [analysisError, setAnalysisError] = useState<string | null>(null);
    const [activeSector, setActiveSector] = useState<'parameters' | 'workflow' | 'analysis'>('analysis');

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

    const handleAnalyzeImage = async () => {
        if (!image || !activeModel) return;
        setIsAnalyzing(true); 
        setAnalysisError(null);
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

    return (
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-140px)] animate-in fade-in duration-500">
            <div className="flex flex-col gap-4 h-full">
                <div 
                    className={`flex-grow border-2 border-dashed rounded-[2.5rem] flex flex-col items-center justify-center transition-all relative overflow-hidden bg-gray-800/20 ${isDragging ? 'border-indigo-500 bg-indigo-900/10' : 'border-gray-700/50'} ${!image ? 'cursor-pointer hover:bg-gray-800/40' : ''}`}
                    onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]); }} 
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)}
                    onClick={() => !image && document.getElementById('image-upload')?.click()}
                >
                    <input id="image-upload" type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
                    {image ? (
                        <div className="relative w-full h-full flex items-center justify-center p-8">
                            <img src={image.url} alt="Target Asset" className="max-w-full max-h-full object-contain rounded-3xl border border-white/5 shadow-2xl" />
                            <button onClick={(e) => { e.stopPropagation(); setImage(null); }} className="absolute top-6 right-6 p-3 bg-gray-950/80 backdrop-blur-xl text-white rounded-full hover:bg-red-600 shadow-2xl transition-all"><XIcon className="h-6 w-6" /></button>
                        </div>
                    ) : (
                        <div className="text-center p-12 space-y-6">
                            <ImageIcon className="h-20 w-20 text-indigo-500 opacity-20 mx-auto" />
                            <h3 className="text-2xl font-black text-gray-200 uppercase tracking-widest">Awaiting Visual Uplink</h3>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-gray-800/40 border border-gray-700/50 rounded-[2.5rem] flex flex-col h-full overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-gray-700/50 flex justify-between items-center bg-gray-900/40">
                    <h2 className="font-black text-xl flex items-center gap-3 uppercase tracking-tighter text-white">
                        <CodeBracketIcon className="h-6 w-6 text-indigo-400" /> Neural Analytics
                    </h2>
                    {image && (
                      <button onClick={handleAnalyzeImage} disabled={isAnalyzing} className="px-6 py-2.5 bg-gray-700 hover:bg-indigo-600 text-white text-[10px] font-black uppercase rounded-xl transition-all flex items-center gap-2">
                          {isAnalyzing ? <LoaderIcon className="h-4 w-4 animate-spin" /> : <RefreshIcon className="h-4 w-4" />}
                          Audit Asset
                      </button>
                    )}
                </div>

                <div className="flex-grow overflow-auto p-8 space-y-6">
                    {analysisResult ? (
                        <div className="space-y-6 animate-in fade-in">
                            <div className="p-5 bg-indigo-950/20 rounded-2xl border border-indigo-500/10">
                                <span className="text-[10px] font-black text-indigo-400 uppercase mb-2 block">Visual Description</span>
                                <p className="text-sm text-gray-200 leading-relaxed font-serif italic">"{analysisResult.imageDescriptor}"</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 bg-gray-900 rounded-xl">
                                    <span className="text-[10px] font-black text-gray-500 uppercase mb-2 block">Style Cluster</span>
                                    <p className="text-xs text-gray-300">{analysisResult.styleDescriptor}</p>
                                </div>
                                <div className="p-4 bg-gray-900 rounded-xl">
                                    <span className="text-[10px] font-black text-gray-500 uppercase mb-2 block">Suggested Artists</span>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {analysisResult.suggestedArtists?.map((a, i) => (
                                          <span key={i} className="px-2 py-1 bg-gray-800 text-[9px] font-black uppercase rounded border border-gray-700">{a}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : analysisError ? (
                        <div className="p-8 text-center space-y-4">
                            <XCircleIcon className="h-16 w-16 text-red-500 mx-auto" />
                            <p className="text-xs text-red-400 font-bold uppercase">{analysisError}</p>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center opacity-10">
                            <BoxIcon className="h-24 w-24" />
                            <p className="text-sm font-black uppercase mt-4">Buffer Clear</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ImageMetadataViewer;
