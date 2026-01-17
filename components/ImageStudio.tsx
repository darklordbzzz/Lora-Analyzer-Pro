
import React, { useState } from 'react';
import * as gemini from '../services/geminiService';
import { LoaderIcon, SparklesIcon, DownloadIcon, RefreshIcon, BoxIcon } from './Icons';

const ImageStudio: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setResultUrl(null);
    try {
      const url = await gemini.generateImage({ prompt, aspectRatio });
      setResultUrl(url);
    } catch (e: any) {
      alert(`Synthesis Failed: ${e.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 h-full animate-in fade-in duration-700">
      <div className="lg:col-span-4 xl:col-span-3 space-y-6">
        <div className="glass-card p-8 rounded-[3rem] border border-white/5 space-y-8 shadow-2xl relative overflow-hidden">
          <div className="scanning-line opacity-10"></div>
          
          <div className="space-y-5">
            <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-black text-hub-accent uppercase tracking-[0.4em]">Visual Prompt</label>
                <div className="flex gap-2">
                    <span className="text-[8px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded uppercase font-bold">Flash-Image 2.5</span>
                </div>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the neural projection in detail..."
              className="w-full h-48 bg-black/40 border border-white/5 rounded-[2rem] p-6 text-sm text-gray-200 outline-none focus:border-hub-accent transition-all resize-none shadow-inner font-medium placeholder:text-gray-700"
            />
            
            <div className="space-y-2">
              <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-2">Aspect Ratio</label>
              <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-xs text-white appearance-none cursor-pointer focus:border-hub-accent outline-none">
                <option value="1:1">Square 1:1</option>
                <option value="16:9">Wide 16:9</option>
                <option value="9:16">Portrait 9:16</option>
                <option value="4:3">Classic 4:3</option>
                <option value="3:4">Portrait 3:4</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className={`w-full py-5 rounded-2xl font-black uppercase tracking-[0.4em] text-[11px] flex items-center justify-center gap-4 transition-all active:scale-95 border-2 ${
              isGenerating || !prompt.trim() 
                ? 'bg-gray-800 border-gray-700 text-gray-600 cursor-not-allowed' 
                : 'bg-hub-accent border-hub-accent/50 hover:bg-violet-500 text-white shadow-2xl shadow-violet-500/30'
            }`}
          >
            {isGenerating ? <LoaderIcon className="h-5 w-5 animate-spin" /> : <SparklesIcon className="h-5 w-5" />}
            {isGenerating ? 'Synthesizing...' : 'Execute Genesis'}
          </button>
        </div>
        
        <div className="p-6 bg-hub-cyan/5 border border-hub-cyan/20 rounded-3xl flex items-center gap-4">
            <div className="p-3 bg-hub-cyan/10 rounded-xl">
                <BoxIcon className="h-5 w-5 text-hub-cyan" />
            </div>
            <div>
                <p className="text-[10px] font-black text-white uppercase tracking-widest">Free Tier Optimized</p>
                <p className="text-[8px] font-bold text-hub-cyan uppercase tracking-widest opacity-60">High-Speed Flash Inference</p>
            </div>
        </div>
      </div>

      <div className="lg:col-span-8 xl:col-span-9">
        <div className="bg-black/60 border border-white/5 rounded-[4rem] h-[720px] flex items-center justify-center relative overflow-hidden shadow-2xl group group-hover:border-hub-accent/30 transition-all backdrop-blur-3xl">
          {isGenerating && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-xl z-20 flex flex-col items-center justify-center space-y-8 animate-in fade-in">
              <div className="relative">
                <LoaderIcon className="h-32 w-32 text-hub-accent animate-[spin_4s_linear_infinite]" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <SparklesIcon className="h-10 w-10 text-white animate-pulse" />
                </div>
              </div>
              <div className="text-center space-y-4">
                <p className="text-xl font-black text-white uppercase tracking-[0.5em] animate-pulse neon-text">Genesis Initiated</p>
                <p className="text-[9px] font-black text-hub-accent uppercase tracking-[1em] opacity-60">Flash Image Core Engaged</p>
              </div>
            </div>
          )}

          {resultUrl ? (
            <div className="relative w-full h-full p-10 flex items-center justify-center animate-in zoom-in-95 duration-1000">
              <img src={resultUrl} alt="Synthesis" className="max-w-full max-h-full object-contain rounded-[3rem] shadow-[0_50px_100px_rgba(0,0,0,0.8)] border border-white/10" />
              
              <div className="absolute bottom-16 flex gap-6 opacity-0 group-hover:opacity-100 transition-all translate-y-8 group-hover:translate-y-0 duration-500">
                <a 
                    href={resultUrl} 
                    download={`genesis_${Date.now()}.png`} 
                    className="flex items-center gap-3 px-8 py-4 bg-white text-black font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-2xl hover:scale-110 active:scale-95 transition-all"
                >
                    <DownloadIcon className="h-4 w-4" /> Save Asset
                </a>
                <button 
                    onClick={() => setResultUrl(null)} 
                    className="flex items-center gap-3 px-8 py-4 bg-gray-900 text-white border border-white/10 font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-2xl hover:scale-110 active:scale-95 transition-all"
                >
                    <RefreshIcon className="h-4 w-4" /> Reset Canvas
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center opacity-10 select-none group-hover:opacity-20 transition-opacity">
              <SparklesIcon className="h-48 w-48 mx-auto mb-10 text-white" />
              <h3 className="text-5xl font-black uppercase tracking-[0.8em] text-white">Neural Void</h3>
              <p className="text-sm font-black uppercase tracking-[0.4em] mt-6">Awaiting Flash projection</p>
            </div>
          )}
          
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#8b5cf6_1px,transparent_1px)] [background-size:20px_20px]"></div>
        </div>
      </div>
    </div>
  );
};

export default ImageStudio;
