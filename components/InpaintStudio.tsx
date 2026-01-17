
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  ImageIcon, XIcon, PlusIcon, TrashIcon, 
  TargetIcon, LoaderIcon, SparklesIcon, DownloadIcon,
  RefreshIcon, InfoIcon
} from './Icons';
import * as gemini from '../services/geminiService';
import { LLMModel, InpaintRegion } from '../types';

interface InpaintStudioProps {
  activeModel?: LLMModel;
}

const InpaintStudio: React.FC<InpaintStudioProps> = ({ activeModel }) => {
  const [image, setImage] = useState<{ file: File; url: string; width: number; height: number } | null>(null);
  const [regions, setRegions] = useState<InpaintRegion[]>([]);
  const [activeRegionId, setActiveRegionId] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [globalPrompt, setGlobalPrompt] = useState('');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const startPos = useRef<{ x: number; y: number } | null>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setImage({ file, url, width: img.width, height: img.height });
      setRegions([]);
      setResultUrl(null);
    };
    img.src = url;
  };

  const getMousePos = (e: React.MouseEvent) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!image || resultUrl) return;
    const pos = getMousePos(e);
    startPos.current = pos;
    setIsDrawing(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !startPos.current || !canvasRef.current || !containerRef.current) return;
    const pos = getMousePos(e);
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    ctx.strokeStyle = '#8b5cf6';
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 2;
    ctx.strokeRect(
      startPos.current.x, 
      startPos.current.y, 
      pos.x - startPos.current.x, 
      pos.y - startPos.current.y
    );
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDrawing || !startPos.current) return;
    setIsDrawing(false);
    const pos = getMousePos(e);
    
    const x = Math.min(startPos.current.x, pos.x);
    const y = Math.min(startPos.current.y, pos.y);
    const w = Math.abs(pos.x - startPos.current.x);
    const h = Math.abs(pos.y - startPos.current.y);

    if (w > 10 && h > 10) {
      const newRegion: InpaintRegion = {
        id: crypto.randomUUID(),
        x, y, width: w, height: h,
        tag: 'describe target object...'
      };
      setRegions(prev => [...prev, newRegion]);
      setActiveRegionId(newRegion.id);
    }

    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  const updateRegionTag = (id: string, tag: string) => {
    setRegions(prev => prev.map(r => r.id === id ? { ...r, tag } : r));
  };

  const removeRegion = (id: string) => {
    setRegions(prev => prev.filter(r => r.id !== id));
  };

  const handleExecuteInpaint = async () => {
    if (!image || isGenerating) return;
    setIsGenerating(true);
    
    // Construct inpaint prompt from regions
    const regionDescriptions = regions.map(r => {
      const xPerc = ((r.x / (containerRef.current?.clientWidth || 1)) * 100).toFixed(1);
      const yPerc = ((r.y / (containerRef.current?.clientHeight || 1)) * 100).toFixed(1);
      return `at coordinates around [${xPerc}%, ${yPerc}%], change to: ${r.tag}`;
    }).join('; ');

    const fullPrompt = `INPAINT INSTRUCTION: ${globalPrompt}. Specific regional changes: ${regionDescriptions}. Maintain overall lighting and style. Return modified image.`;

    try {
      const result = await gemini.editImage(image.file, fullPrompt);
      setResultUrl(result);
    } catch (e: any) {
      alert(`Inpaint Failed: ${e.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 h-[calc(100vh-220px)] animate-in fade-in duration-500 overflow-hidden">
      {/* Workspace Sidebar */}
      <div className="lg:col-span-4 flex flex-col gap-6 h-full overflow-y-auto custom-scrollbar pr-2">
        <div className="bg-hub-cyan/5 border border-hub-cyan/20 rounded-[2.5rem] p-6 space-y-4">
          <h4 className="text-[10px] font-black text-hub-cyan uppercase tracking-[0.3em] flex items-center gap-2">
            <InfoIcon className="h-4 w-4" /> Neural Inpaint Protocol
          </h4>
          <p className="text-[10px] text-gray-400 font-bold uppercase leading-tight tracking-tight">
            Select a region on the canvas by clicking and dragging. Assign a <span className="text-white">Neural Tag</span> to describe the target transformation.
          </p>
        </div>

        <div className="bg-black/40 border border-white/5 rounded-[2.5rem] p-8 space-y-6 shadow-2xl">
          <div className="space-y-4">
             <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] ml-1">Global Context</label>
             <textarea 
                value={globalPrompt}
                onChange={e => setGlobalPrompt(e.target.value)}
                placeholder="Overall scene description or style adjustments..."
                className="w-full h-24 bg-gray-950 border border-white/5 rounded-2xl p-4 text-xs text-gray-200 resize-none outline-none focus:border-hub-accent"
             />
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] ml-1">Region Registry ({regions.length})</label>
              {regions.length > 0 && <button onClick={() => setRegions([])} className="text-[8px] font-black text-red-500 uppercase hover:underline">Clear All</button>}
            </div>
            
            <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar pr-1">
              {regions.length === 0 ? (
                <div className="py-8 text-center border border-dashed border-gray-800 rounded-2xl opacity-30">
                  <TargetIcon className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-[9px] font-black uppercase">No Regions Defined</p>
                </div>
              ) : (
                regions.map(r => (
                  <div 
                    key={r.id} 
                    className={`p-4 bg-gray-950 border rounded-2xl transition-all ${activeRegionId === r.id ? 'border-hub-accent ring-1 ring-hub-accent' : 'border-white/5'}`}
                    onMouseEnter={() => setActiveRegionId(r.id)}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[8px] font-black text-hub-accent uppercase">Sector-{r.id.substring(0,4)}</span>
                      <button onClick={() => removeRegion(r.id)} className="text-gray-600 hover:text-red-500"><TrashIcon className="h-3 w-3" /></button>
                    </div>
                    <input 
                      type="text" 
                      value={r.tag}
                      onChange={e => updateRegionTag(r.id, e.target.value)}
                      className="w-full bg-black border border-white/5 rounded-lg px-3 py-1.5 text-[10px] text-gray-200 outline-none focus:border-hub-accent"
                      placeholder="Tag this area..."
                    />
                  </div>
                ))
              )}
            </div>
          </div>

          <button 
            onClick={handleExecuteInpaint}
            disabled={!image || regions.length === 0 || isGenerating}
            className={`w-full py-5 rounded-[1.5rem] font-black uppercase tracking-[0.4em] text-xs transition-all flex items-center justify-center gap-4 border-2 ${!image || regions.length === 0 ? 'bg-gray-800 border-gray-700 text-gray-600' : 'bg-hub-accent border-hub-accent/50 hover:bg-violet-500 text-white shadow-xl active:scale-95'}`}
          >
            {isGenerating ? <LoaderIcon className="h-5 w-5 animate-spin" /> : <SparklesIcon className="h-5 w-5" />}
            {isGenerating ? 'Synthesizing...' : 'Execute Inpaint'}
          </button>
        </div>
      </div>

      {/* Main Canvas Viewport */}
      <div className="lg:col-span-8 bg-black/60 border border-white/5 rounded-[4rem] h-full flex items-center justify-center relative overflow-hidden shadow-2xl backdrop-blur-3xl group">
        
        {image ? (
          <div 
            ref={containerRef}
            className="relative max-w-full max-h-full"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            <img 
              src={resultUrl || image.url} 
              alt="Workspace" 
              className="max-w-full max-h-[70vh] rounded-[2rem] shadow-2xl border border-white/5 pointer-events-none"
            />
            
            {!resultUrl && (
              <>
                <canvas 
                  ref={canvasRef}
                  width={containerRef.current?.clientWidth || 0}
                  height={containerRef.current?.clientHeight || 0}
                  className="absolute inset-0 z-10 pointer-events-none"
                />
                
                {regions.map(r => (
                  <div 
                    key={r.id}
                    className={`absolute border-2 transition-all ${activeRegionId === r.id ? 'border-hub-accent bg-hub-accent/10 shadow-[0_0_20px_rgba(139,92,246,0.3)]' : 'border-indigo-500/40 bg-indigo-500/5'}`}
                    style={{ left: r.x, top: r.y, width: r.width, height: r.height }}
                    onMouseEnter={() => setActiveRegionId(r.id)}
                  >
                    <div className="absolute -top-6 left-0 bg-hub-accent text-white text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-widest flex items-center gap-1 shadow-lg">
                      <TargetIcon className="h-2 w-2" /> {r.tag === 'describe target object...' ? 'Sector' : r.tag.substring(0,12)}
                    </div>
                  </div>
                ))}
              </>
            )}

            {resultUrl && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-4 animate-in slide-in-from-bottom-4">
                 <button onClick={() => { const a = document.createElement('a'); a.href = resultUrl; a.download = 'inpainted_asset.png'; a.click(); }} className="px-6 py-3 bg-white text-black font-black uppercase text-[10px] tracking-widest rounded-xl shadow-2xl flex items-center gap-2 hover:scale-105 transition-all">
                    <DownloadIcon className="h-4 w-4" /> Save Master
                 </button>
                 <button onClick={() => setResultUrl(null)} className="px-6 py-3 bg-gray-900 text-white font-black uppercase text-[10px] tracking-widest rounded-xl shadow-2xl border border-white/10 flex items-center gap-2 hover:bg-gray-800 transition-all">
                    <RefreshIcon className="h-4 w-4" /> Reset Edit
                 </button>
              </div>
            )}
          </div>
        ) : (
          <div 
            className="text-center p-20 cursor-pointer group"
            onClick={() => document.getElementById('inpaint-source')?.click()}
          >
            <input id="inpaint-source" type="file" className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
            <div className="p-16 bg-gray-900 rounded-[4rem] border border-gray-800 shadow-2xl inline-block mb-10 group-hover:scale-105 transition-all">
               <ImageIcon className="h-24 w-24 text-hub-accent opacity-20" />
            </div>
            <h3 className="text-4xl font-black text-gray-500 uppercase tracking-[0.5em] group-hover:text-white transition-colors">Neural Canvas</h3>
            <p className="text-[10px] text-gray-600 font-bold uppercase tracking-[0.4em] mt-6">Mount Source Asset to Begin Tagging</p>
          </div>
        )}

        {isGenerating && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-3xl z-50 flex flex-col items-center justify-center space-y-8 animate-in fade-in">
              <LoaderIcon className="h-32 w-32 text-hub-accent animate-[spin_4s_linear_infinite]" />
              <div className="text-center space-y-4">
                  <p className="text-2xl font-black text-white uppercase tracking-[0.5em] animate-pulse">Regional Synthesis</p>
                  <p className="text-[9px] font-black text-hub-accent uppercase tracking-[0.8em] opacity-60">Rewriting Bitstream Segments</p>
              </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InpaintStudio;
