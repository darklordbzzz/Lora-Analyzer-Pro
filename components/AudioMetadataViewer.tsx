import React, { useState, useCallback, useRef } from 'react';
import { LoaderIcon, AudioIcon, XIcon, CopyIcon, CheckCircleIcon, RefreshIcon, BoxIcon, XCircleIcon } from './Icons';
import { analyzeAudioWithLLM, reformatLyricsWithAI } from '../services/llmService';
import { AudioAnalysisResult, SoundStudioState, LLMModel } from '../types';

interface AudioMetadataViewerProps {
    activeModel?: LLMModel;
    onImportToStudio?: (data: SoundStudioState) => void;
}

const AudioMetadataViewer: React.FC<AudioMetadataViewerProps> = ({ activeModel, onImportToStudio }) => {
    const [audio, setAudio] = useState<{ file: File; url: string } | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisPhase, setAnalysisPhase] = useState<'idle' | 'scanning' | 'inferring'>('idle');
    const [isReformatting, setIsReformatting] = useState(false);
    const [analysis, setAnalysis] = useState<AudioAnalysisResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement>(null);

    const renderSafe = (val: any) => {
        if (typeof val === 'string' || typeof val === 'number') return val;
        if (!val) return '';
        return JSON.stringify(val);
    };

    const handleFile = async (file: File) => {
        if (!file.type.startsWith('audio/')) return alert('Upload audio file.');
        setAudio({ file, url: URL.createObjectURL(file) });
        setAnalysis(null); 
        setError(null);
        setAnalysisPhase('idle');
    };

    const handleAnalyze = async () => {
        if (!audio) return;
        setIsAnalyzing(true); 
        setError(null);
        
        const isLocal = activeModel?.provider !== 'gemini' && activeModel?.apiUrl !== 'integrated://core';
        
        try { 
            if (isLocal) {
                setAnalysisPhase('scanning');
                await new Promise(r => setTimeout(r, 800));
                setAnalysisPhase('inferring');
            }
            
            const result = await analyzeAudioWithLLM(audio.file, activeModel); 
            setAnalysis(result); 
        } 
        catch (e: any) { 
            setError(e.message || "Acoustic analysis failed."); 
        } finally { 
            setIsAnalyzing(false); 
            setAnalysisPhase('idle');
        }
    };

    const handleReformat = async () => {
        if (!analysis?.lyrics) return;
        setIsReformatting(true);
        try { 
            const formatted = await reformatLyricsWithAI(analysis.lyrics);
            setAnalysis(prev => prev ? { ...prev, lyrics: formatted } : null);
        } catch (e) { console.error(e); } finally { setIsReformatting(false); }
    };

    const copyText = (text: string, id: string) => {
        navigator.clipboard.writeText(text); setCopied(id);
        setTimeout(() => setCopied(null), 2000);
    };

    const handleExportToStudio = () => {
        if (!analysis || !onImportToStudio) return;
        
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }

        onImportToStudio({
            ...analysis,
            isInstrumental: (analysis.lyrics || '').length < 5,
            vocalStyle: 'Natural',
            description: `Acoustic analysis export for ${analysis.title} by ${analysis.artist}. BPM: ${analysis.bpm}. Protocol: Reconstructive.`
        });
    };

    return (
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-140px)] animate-in fade-in duration-500">
            <div 
                className={`border-2 border-dashed rounded-[2.5rem] flex flex-col items-center justify-center bg-gray-800/30 transition-all ${isDragging ? 'border-indigo-500 bg-indigo-900/10' : 'border-gray-700'} ${!audio ? 'cursor-pointer hover:bg-gray-800/50' : ''}`}
                onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]); }}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)}
                onClick={() => !audio && document.getElementById('audio-upload')?.click()}
            >
                <input id="audio-upload" type="file" className="hidden" accept="audio/*" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
                {audio ? (
                    <div className="p-8 flex flex-col items-center gap-8 w-full relative">
                        <div className={`w-64 h-64 bg-gray-900 rounded-[3rem] flex items-center justify-center shadow-2xl border border-gray-800 animate-in zoom-in duration-500 relative overflow-hidden group ${analysisPhase !== 'idle' ? 'ring-2 ring-indigo-500 ring-offset-4 ring-offset-gray-900' : ''}`}>
                            {analysisPhase !== 'idle' && (
                                <div className="absolute inset-0 bg-indigo-500/10 animate-pulse"></div>
                            )}
                            <AudioIcon className={`h-32 w-32 transition-all duration-700 ${analysisPhase === 'scanning' ? 'text-indigo-400 scale-110' : analysisPhase === 'inferring' ? 'text-emerald-400 scale-95 animate-pulse' : 'text-indigo-400 opacity-60'}`} />
                        </div>
                        <div className="text-center space-y-2">
                            <h3 className="font-black text-white truncate max-w-sm uppercase tracking-tight text-xl">{renderSafe(audio.file.name)}</h3>
                            <p className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.4em]">Acoustic Asset Linked</p>
                        </div>
                        <div className="w-full max-w-md bg-gray-950/80 p-6 rounded-3xl border border-gray-800 shadow-2xl backdrop-blur-xl">
                            <audio ref={audioRef} src={audio.url} controls className="w-full h-10 custom-audio-player" />
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); setAudio(null); setAnalysis(null); }} className="absolute top-6 right-6 p-3 bg-gray-950/80 backdrop-blur-xl text-gray-500 rounded-full hover:bg-red-600 hover:text-white shadow-2xl transition-all hover:scale-110 active:scale-90"><XIcon className="h-6 w-6" /></button>
                    </div>
                ) : (
                    <div className="text-center p-12 space-y-6">
                        <div className="p-10 bg-gray-900 rounded-[3rem] inline-block border border-gray-800 shadow-2xl relative group">
                            <div className="absolute inset-0 bg-indigo-500/5 rounded-[3rem] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <AudioIcon className="h-20 w-20 text-indigo-400 opacity-20 relative z-10" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-black text-gray-200 uppercase tracking-widest">Mount Audio Master</h3>
                            <p className="text-gray-500 text-xs font-black uppercase tracking-[0.3em]">WAV / MP3 / STUDIO FLAC</p>
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-gray-800/40 border border-gray-700/50 rounded-[2.5rem] flex flex-col overflow-hidden shadow-2xl backdrop-blur-md">
                <div className="p-6 border-b border-gray-700/50 flex justify-between items-center bg-gray-900/40 sticky top-0 z-10 backdrop-blur-md">
                    <div className="flex flex-col">
                        <h2 className="font-black text-xl flex items-center gap-3 uppercase tracking-tighter text-white">
                            <AudioIcon className="h-6 w-6 text-indigo-400" /> Acoustic DNA
                        </h2>
                    </div>
                    <div className="flex gap-3">
                         {analysis && (
                            <button onClick={handleExportToStudio} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase rounded-xl shadow-xl transition-all active:scale-95 flex items-center gap-2 border border-white/10">
                                <BoxIcon className="h-4 w-4" />
                                Send to Studio
                            </button>
                        )}
                        {audio && (
                            <button onClick={handleAnalyze} disabled={isAnalyzing} className="px-5 py-2.5 bg-gray-700 hover:bg-indigo-600 text-white text-[10px] font-black uppercase rounded-xl shadow-xl disabled:opacity-50 transition-all flex items-center gap-2 border border-white/5">
                                {isAnalyzing ? <LoaderIcon className="h-4 w-4 animate-spin" /> : <RefreshIcon className="h-4 w-4" />}
                                Initiate Audit
                            </button>
                        )}
                    </div>
                </div>
                <div className="flex-grow overflow-auto custom-scrollbar">
                    {error && (
                        <div className="p-8 bg-red-950/20 border-b border-red-500/20 text-red-300 text-sm font-mono animate-in slide-in-from-top-4">
                             <div className="flex items-center gap-2 mb-3">
                                <XCircleIcon className="h-5 w-5 text-red-500" />
                                <span className="font-black uppercase text-red-500 tracking-widest">Protocol Fault</span>
                             </div>
                            {renderSafe(error)}
                        </div>
                    )}
                    {analysis ? (
                        <div className="animate-in fade-in duration-700 divide-y divide-gray-800/30 pb-12">
                            <div className="p-8 grid grid-cols-2 gap-6 bg-gray-950/20">
                                <div className="bg-gray-900/60 p-5 rounded-2xl border border-gray-800 shadow-inner">
                                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] block mb-2 opacity-50">Track Identity</span>
                                    <p className="text-base font-black text-white uppercase truncate tracking-tight">{renderSafe(analysis.title)}</p>
                                </div>
                                <div className="bg-gray-900/60 p-5 rounded-2xl border border-gray-800 shadow-inner">
                                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] block mb-2 opacity-50">Primary Artist</span>
                                    <p className="text-base font-black text-white uppercase truncate tracking-tight">{renderSafe(analysis.artist)}</p>
                                </div>
                            </div>

                            <div className="p-8 grid grid-cols-3 gap-6">
                                <div className="text-center">
                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">BPM</span>
                                    <p className="text-2xl font-black text-white font-mono">{renderSafe(analysis.bpm)}</p>
                                </div>
                                <div className="text-center">
                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Key</span>
                                    <p className="text-2xl font-black text-white font-mono">{renderSafe(analysis.key)}</p>
                                </div>
                                <div className="text-center">
                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Mood</span>
                                    <p className="text-sm font-black text-white uppercase pt-2">{renderSafe(analysis.mood)}</p>
                                </div>
                            </div>
                            
                            <div className="p-8">
                                <div className="flex justify-between items-center mb-6">
                                    <span className="text-[11px] font-black text-gray-500 uppercase tracking-[0.3em]">Instrumentation</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {(analysis.instrumentation || []).map((inst, i) => (
                                        <button key={i} onClick={() => copyText(String(inst), `i-${i}`)} className="px-4 py-2 bg-indigo-950/20 text-indigo-300 text-[11px] font-black uppercase rounded-xl border border-indigo-500/10 flex items-center gap-2 hover:bg-indigo-600 hover:text-white transition-all shadow-md">
                                            {renderSafe(inst)}
                                            {copied === `i-${i}` ? <CheckCircleIcon className="h-3 w-3" /> : <CopyIcon className="h-3 w-3 opacity-30" />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <div className="px-8 py-5 bg-gray-900/40 border-b border-gray-800 flex justify-between items-center backdrop-blur-md sticky top-[-1px] z-10">
                                    <span className="text-[11px] font-black text-green-400 uppercase tracking-[0.3em]">Lyric Structure</span>
                                    <div className="flex gap-4">
                                        <button onClick={handleReformat} disabled={isReformatting} className="text-[11px] font-black text-indigo-400 uppercase flex items-center gap-2 disabled:opacity-50 hover:text-indigo-300 transition-all">
                                            {isReformatting ? <LoaderIcon className="animate-spin h-3.5 w-3.5" /> : <RefreshIcon className="h-3.5 w-3.5" />}
                                            Normalize
                                        </button>
                                    </div>
                                </div>
                                <div className="p-8 text-sm font-mono whitespace-pre-wrap text-gray-300 leading-relaxed bg-black/10 shadow-inner">
                                    {renderSafe(analysis.lyrics) || '// No lyrical content detected.'}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-12 space-y-6 opacity-40 grayscale py-40">
                             <BoxIcon className="h-20 w-20 text-indigo-400 opacity-20" />
                             <h4 className="text-2xl font-black uppercase tracking-[0.3em] text-gray-500">Analytics Idle</h4>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AudioMetadataViewer;