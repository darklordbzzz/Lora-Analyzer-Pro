
import React, { useState, useEffect } from 'react';
import { SparklesIcon, VideoIcon, LoaderIcon, DownloadIcon, RefreshIcon, InfoIcon } from './Icons';
import { generateVideoVeo } from '../services/geminiService';
import { AnalyzerTuningConfig } from '../types';

// Added AnalyzerTuningConfig to props to fix assignability errors in App.tsx
interface VideoStudioProps {
  tuning: AnalyzerTuningConfig;
}

const VideoStudio: React.FC<VideoStudioProps> = ({ tuning }) => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [resolution, setResolution] = useState<'720p' | '1080p'>('720p');
  const [status, setStatus] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    // Billing check for Veo
    if (!(window as any).aistudio || !await (window as any).aistudio.hasSelectedApiKey()) {
      if (confirm("Veo generation requires a paid API key. Open selection dialog?")) {
        await (window as any).aistudio.openSelectKey();
      }
      return;
    }

    setIsGenerating(true);
    setVideoUrl(null);
    try {
      const url = await generateVideoVeo({ prompt, aspectRatio, resolution }, setStatus);
      setVideoUrl(url);
    } catch (e: any) {
      alert(`Synthesis Failed: ${e.message}`);
    } finally {
      setIsGenerating(false);
      setStatus('');
    }
  };

  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 h-full animate-in fade-in duration-700">
      <div className="lg:col-span-4 xl:col-span-3 space-y-6">
        <div className="glass-card p-8 rounded-[3rem] border border-white/5 space-y-8 shadow-2xl relative overflow-hidden">
          <div className="scanning-line opacity-10"></div>
          
          <div className="space-y-5">
            <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em]">Temporal Instruction</label>
                <span className="text-[8px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded uppercase font-bold">VEO 3.1</span>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the cinematic sequence in high detail..."
              className="w-full h-48 bg-black/40 border border-white/5 rounded-[2rem] p-6 text-sm text-gray-200 outline-none focus:border-indigo-500 transition-all resize-none shadow-inner font-medium placeholder:text-gray-700"
            />
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-2">Aspect Ratio</label>
                <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value as any)} className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-xs text-white appearance-none cursor-pointer focus:border-indigo-500 outline-none">
                  <option value="16:9">Wide 16:9</option>
                  <option value="9:16">Portrait 9:16</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-2">Resolution</label>
                <select value={resolution} onChange={(e) => setResolution(e.target.value as any)} className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-xs text-white appearance-none cursor-pointer focus:border-indigo-500 outline-none">
                  <option value="720p">720p (Fast)</option>
                  <option value="1080p">1080p (Pro)</option>
                </select>
              </div>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className={`w-full py-5 rounded-2xl font-black uppercase tracking-[0.4em] text-[11px] flex items-center justify-center gap-4 transition-all active:scale-95 border-2 ${
              isGenerating || !prompt.trim() 
                ? 'bg-gray-800 border-gray-700 text-gray-600 cursor-not-allowed' 
                : 'bg-indigo-600 border-indigo-500/50 hover:bg-violet-500 text-white shadow-2xl shadow-violet-500/30'
            }`}
          >
            {isGenerating ? <LoaderIcon className="h-5 w-5 animate-spin" /> : <VideoIcon className="h-5 w-5" />}
            {isGenerating ? 'Synthesizing...' : 'Execute Sequence'}
          </button>
        </div>
        
        <div className="p-6 bg-amber-500/5 border border-amber-500/20 rounded-3xl flex items-center gap-4">
            <div className="p-3 bg-amber-500/10 rounded-xl">
                <InfoIcon className="h-5 w-5 text-amber-500" />
            </div>
            <div>
                <p className="text-[10px] font-black text-white uppercase tracking-widest">Veo Protocol Active</p>
                <p className="text-[8px] font-bold text-amber-500 uppercase tracking-widest opacity-60">Paid Tier Credentials Required</p>
            </div>
        </div>
      </div>

      <div className="lg:col-span-8 xl:col-span-9">
        <div className="bg-black/60 border border-white/5 rounded-[4rem] h-[720px] flex items-center justify-center relative overflow-hidden shadow-2xl group transition-all backdrop-blur-3xl">
          {isGenerating && (
            <div className="absolute inset-0 bg-black/90 backdrop-blur-xl z-20 flex flex-col items-center justify-center space-y-8 animate-in fade-in">
              <div className="relative">
                <LoaderIcon className="h-40 w-40 text-indigo-500 animate-[spin_6s_linear_infinite]" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <VideoIcon className="h-12 w-12 text-white animate-pulse" />
                </div>
              </div>
              <div className="text-center space-y-4">
                <p className="text-2xl font-black text-white uppercase tracking-[0.5em] animate-pulse neon-text">Temporal Synthesis</p>
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] opacity-80">{status}</p>
              </div>
            </div>
          )}

          {videoUrl ? (
            <div className="relative w-full h-full p-10 flex items-center justify-center animate-in zoom-in-95 duration-1000">
              <video src={videoUrl} controls autoPlay loop className="max-w-full max-h-full rounded-[3rem] shadow-[0_50px_100px_rgba(0,0,0,0.8)] border border-white/10" />
              
              <div className="absolute bottom-16 flex gap-6 opacity-0 group-hover:opacity-100 transition-all translate-y-8 group-hover:translate-y-0 duration-500">
                <a 
                    href={videoUrl} 
                    download={`veo_${Date.now()}.mp4`} 
                    className="flex items-center gap-3 px-8 py-4 bg-white text-black font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-2xl hover:scale-110 active:scale-95 transition-all"
                >
                    <DownloadIcon className="h-4 w-4" /> Export Bitstream
                </a>
                <button 
                    onClick={() => setVideoUrl(null)} 
                    className="flex items-center gap-3 px-8 py-4 bg-gray-900 text-white border border-white/10 font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-2xl hover:scale-110 active:scale-95 transition-all"
                >
                    <RefreshIcon className="h-4 w-4" /> Reset Workspace
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center opacity-10 select-none group-hover:opacity-20 transition-opacity">
              <VideoIcon className="h-48 w-48 mx-auto mb-10 text-white" />
              <h3 className="text-5xl font-black uppercase tracking-[0.8em] text-white">Video Terminal</h3>
              <p className="text-sm font-black uppercase tracking-[0.4em] mt-6">Awaiting cinematic projection</p>
            </div>
          )}
          
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:20px_20px]"></div>
        </div>
      </div>
    </div>
  );
};

export default VideoStudio;
