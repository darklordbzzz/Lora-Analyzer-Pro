
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ImageStudioState, LLMModel } from '../types';
import { BoxIcon, ImageIcon, LoaderIcon, RefreshIcon, CloudIcon, DownloadIcon, LabIcon, SparklesIcon as GlowIcon, CodeBracketIcon, LinkIcon, XIcon, ServerIcon, PlugIcon, InfoIcon, ChevronDownIcon, XCircleIcon, CheckCircleIcon, TerminalIcon, PlusIcon, EditIcon, TargetIcon, ShieldIcon, DatabaseIcon, CropIcon } from './Icons';
import { generateImageWithAI, upscaleImageWithAI, checkComfyConnection, resetComfyNode, detectRegionDetails, editImageRegion } from '../services/llmService';
import { fileToBase64 } from '../services/fileService';

interface ImageStudioProps {
  initialState: ImageStudioState | null;
  activeModel?: LLMModel;
}

const COMFY_TEMPLATES = [
    { id: 'flux-dev', name: 'FLUX.1 [dev]', nodes: 34, tip: 'High Fidelity • FP8 Weighting', ckpt: 'flux1-dev-fp8.safetensors' },
    { id: 'flux-schnell', name: 'FLUX.1 [schnell]', nodes: 28, tip: '4-Step Distilled • High Speed', ckpt: 'flux1-schnell.safetensors' },
    { id: 'pony-v6', name: 'Pony Diffusion V6 XL', nodes: 22, tip: 'Specialized Anatomy & Styling', ckpt: 'ponyDiffusionV6XL_v6StartWithThis.safetensors' },
    { id: 'illustrious', name: 'Illustrious-XL', nodes: 24, tip: 'Artistic / Painterly Excellence', ckpt: 'illustriousXL_v10.safetensors' },
    { id: 'z-image-turbo', name: 'Z-Turbo Speed', nodes: 12, tip: '1-Step Distillation', ckpt: 'z-turbo-v1.safetensors' },
    { id: 'sdxl-base', name: 'SDXL Base 1.0', nodes: 18, tip: 'Standard Foundation Archi', ckpt: 'sd_xl_base_1.0.safetensors' },
    { id: 'custom', name: 'Custom Logic Injection', nodes: 0, tip: 'Direct JSON Workflow Path', ckpt: '' }
];

const UPSCALE_MODELS = [
    { id: '4x-UltraSharp.pth', name: 'UltraSharp 4x' },
    { id: 'R-ESRGAN_4x+.pth', name: 'ESRGAN 4x+' },
    { id: 'RealESRGAN_x2plus.pth', name: 'ESRGAN x2+' }
];

const RATIO_PRESETS = [
    { label: '1:1', w: 1024, h: 1024 },
    { label: '9:16', w: 576, h: 1024 },
    { label: '16:9', w: 1024, h: 576 }
];

const PIXEL_STEP = 64;

interface VaultItem {
    id: string;
    image: string;
    parentImage: string;
    rect: { x: number, y: number, w: number, h: number };
    tags: string[];
    description: string;
    timestamp: number;
}

interface AccordionSectionProps {
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    isOpen: boolean;
    onToggle: () => void;
    indicator?: 'green' | 'orange' | 'red' | 'gray' | 'none';
    subValue?: string;
}

const AccordionSection: React.FC<AccordionSectionProps> = ({ title, icon, children, isOpen, onToggle, indicator = 'gray', subValue }) => {
    const indicatorColors = {
        green: 'bg-green-500 shadow-[0_0_8px_#22c55e]',
        orange: 'bg-orange-500 shadow-[0_0_8px_#f59e0b]',
        red: 'bg-red-500 shadow-[0_0_8px_#ef4444]',
        gray: 'bg-gray-600',
        none: 'hidden'
    };

    return (
        <div className={`flex flex-col transition-all duration-300 ${isOpen ? 'z-30' : 'z-10'}`}>
            <button 
                onClick={onToggle}
                className={`w-full flex items-center justify-between px-5 py-3.5 rounded-2xl transition-all border ${isOpen ? 'bg-indigo-600/10 border-indigo-500/40 translate-y-[-2px] shadow-xl' : 'bg-gray-800/40 border-gray-700/50 hover:bg-gray-700/40'}`}
            >
                <div className="flex items-center gap-3 min-w-0">
                    <div className={`${isOpen ? 'text-indigo-400' : 'text-gray-500'} shrink-0`}>
                        {icon}
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                        <h3 className={`text-[10px] font-black uppercase tracking-[0.15em] truncate ${isOpen ? 'text-white' : 'text-gray-400'}`}>
                            {title}
                        </h3>
                        {!isOpen && (
                            <>
                                {subValue ? (
                                    <span className="text-[9px] font-black text-indigo-400/80 bg-indigo-400/10 px-1.5 py-0.5 rounded-md border border-indigo-500/20 lowercase tracking-tight animate-in fade-in duration-300">
                                        {subValue}
                                    </span>
                                ) : indicator !== 'none' && (
                                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 transition-all duration-500 ${indicatorColors[indicator]}`} />
                                )}
                            </>
                        )}
                    </div>
                </div>
                <ChevronDownIcon className={`h-3.5 w-3.5 text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180 text-indigo-400' : ''}`} />
            </button>
            <div className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[1000px] opacity-100 overflow-visible mt-2' : 'max-h-0 opacity-0 overflow-hidden pointer-events-none'}`}>
                <div className="px-5 pb-5 pt-3 bg-gray-950/20 border border-gray-700/30 rounded-3xl space-y-5 mx-0.5 shadow-inner backdrop-blur-sm mb-4">
                    {children}
                </div>
            </div>
        </div>
    );
};

const ImageStudio: React.FC<ImageStudioProps> = ({ initialState, activeModel }) => {
  const [state, setState] = useState<ImageStudioState & { width: number; height: number; lockRatio: boolean; masteringActive: boolean }>(() => ({
    prompt: '',
    aspectRatio: '1:1',
    width: 1024,
    height: 1024,
    lockRatio: true,
    provider: 'comfyui',
    modelId: 'gemini-2.5-flash-image',
    upscaleFactor: 2,
    masteringModel: '4x-UltraSharp.pth',
    masteringActive: false,
    ...initialState
  }));

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    resource: true,
    asset: true,
    spatial: false,
    mastering: false,
    vault: false
  });

  const [isSpatialMode, setIsSpatialMode] = useState(false);
  const [currentRect, setCurrentRect] = useState<{ x: number, y: number, w: number, h: number } | null>(null);
  const [isDraggingRect, setIsDraggingRect] = useState(false);
  const [rectStart, setRectStart] = useState<{ x: number, y: number } | null>(null);
  const [detectionResults, setDetectionResults] = useState<{ tags: string[], sensitivity: number, description: string } | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [sensitivityThreshold, setSensitivityThreshold] = useState(0.5);
  const [regenPrompt, setRegenPrompt] = useState('');
  const [vault, setVault] = useState<VaultItem[]>([]);

  const canvasContainerRef = useRef<HTMLDivElement>(null);

  const toggleSection = (id: string) => setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('flux-dev');
  const [customWorkflowJson, setCustomWorkflowJson] = useState<string>('');
  const [isComboOpen, setIsComboOpen] = useState(false);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [comfyStatus, setComfyStatus] = useState<'checking' | 'online' | 'busy' | 'offline'>('checking');
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDraggingAsset, setIsDraggingAsset] = useState(false);

  const selectedTemplate = COMFY_TEMPLATES.find(t => t.id === selectedTemplateId) || COMFY_TEMPLATES[0];

  const refreshConnection = async () => {
    const status = await checkComfyConnection();
    setComfyStatus(status);
  };

  useEffect(() => {
    refreshConnection();
    const interval = setInterval(refreshConnection, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleDimensionChange = (field: 'w' | 'h', val: number) => {
    const snapped = Math.max(PIXEL_STEP, Math.round(val / PIXEL_STEP) * PIXEL_STEP);
    if (state.lockRatio) {
        const ratio = state.width / state.height;
        if (field === 'w') setState(s => ({ ...s, width: snapped, height: Math.max(PIXEL_STEP, Math.round((snapped / ratio) / PIXEL_STEP) * PIXEL_STEP) }));
        else setState(s => ({ ...s, height: snapped, width: Math.max(PIXEL_STEP, Math.round((snapped * ratio) / PIXEL_STEP) * PIXEL_STEP) }));
    } else setState(s => ({ ...s, [field === 'w' ? 'width' : 'height']: snapped }));
  };

  const handleFileChange = useCallback(async (file: File) => {
      if (!file.type.startsWith('image/')) return;
      try {
          const base64 = await fileToBase64(file);
          setState(s => ({ ...s, sourceImage: `data:${file.type};base64,${base64}` }));
          setOpenSections(prev => ({ ...prev, asset: true }));
      } catch (e) { console.error(e); }
  }, []);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      let finalWorkflow = null;
      if (selectedTemplateId === 'custom' && customWorkflowJson) {
          try { finalWorkflow = JSON.parse(customWorkflowJson); } catch (e) { throw new Error("Invalid Custom Workflow JSON syntax."); }
      } else if (selectedTemplateId !== 'custom') { (state as any).comfyHintCkpt = selectedTemplate.ckpt; }

      const url = await generateImageWithAI({ ...state, comfyWorkflow: finalWorkflow }, activeModel);
      setGeneratedImageUrl(url);
    } catch (e: any) { setError(e.message); } finally { setIsGenerating(false); }
  };

  /* SPATIAL SECTOR LOGIC */
  const startRect = (e: React.MouseEvent) => {
      if (!isSpatialMode || !canvasContainerRef.current) return;
      const rect = canvasContainerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setRectStart({ x, y });
      setIsDraggingRect(true);
      setDetectionResults(null);
  };

  const updateRect = (e: React.MouseEvent) => {
      if (!isDraggingRect || !rectStart || !canvasContainerRef.current) return;
      const rect = canvasContainerRef.current.getBoundingClientRect();
      const cx = ((e.clientX - rect.left) / rect.width) * 100;
      const cy = ((e.clientY - rect.top) / rect.height) * 100;
      setCurrentRect({ x: Math.min(rectStart.x, cx), y: Math.min(rectStart.y, cy), w: Math.abs(cx - rectStart.x), h: Math.abs(cy - rectStart.y) });
  };

  const stopRect = async () => {
      setIsDraggingRect(false);
      if (currentRect && currentRect.w > 2 && currentRect.h > 2 && generatedImageUrl && activeModel) {
          setIsDetecting(true);
          try {
              const res = await detectRegionDetails(generatedImageUrl, currentRect, activeModel);
              setDetectionResults(res);
              setRegenPrompt(res.description);
          } catch (e) { console.error(e); } finally { setIsDetecting(false); }
      }
  };

  const handleRegenSegment = async () => {
      if (!currentRect || !generatedImageUrl || !activeModel || !regenPrompt) return;
      setIsGenerating(true);
      try {
          const edited = await editImageRegion(generatedImageUrl, detectionResults?.description || "the selected region", regenPrompt, activeModel);
          const newItem: VaultItem = {
              id: crypto.randomUUID(),
              image: edited,
              parentImage: generatedImageUrl,
              rect: { ...currentRect },
              tags: detectionResults?.tags || [],
              description: regenPrompt,
              timestamp: Date.now()
          };
          setVault(prev => [newItem, ...prev]);
          setGeneratedImageUrl(edited);
          setOpenSections(prev => ({ ...prev, vault: true }));
          setIsSpatialMode(false);
          setCurrentRect(null);
      } catch (e: any) { setError(e.message); } finally { setIsGenerating(false); }
  }

  const isPromptEmpty = !state.prompt.trim();
  const isDisabled = isGenerating || isPromptEmpty;
  
  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6 h-[calc(100vh-140px)] animate-in fade-in duration-500 overflow-hidden">
      <style>{`
          @keyframes scanline { 0% { top: 0; } 100% { top: 100%; } }
          .scanline-effect { position: absolute; width: 100%; height: 2px; background: rgba(99, 102, 241, 0.4); box-shadow: 0 0 10px rgba(99, 102, 241, 0.8); animation: scanline 3s linear infinite; pointer-events: none; }
          .marching-ants { stroke-dasharray: 4; animation: ants 1s linear infinite; }
          @keyframes ants { to { stroke-dashoffset: -8; } }
      `}</style>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-grow h-full overflow-hidden">
        
        {/* SIDEBAR */}
        <div className="lg:col-span-4 xl:col-span-3 flex flex-col h-full overflow-hidden">
          <div className="flex-grow overflow-y-auto custom-scrollbar pr-2 pb-12 space-y-1">
            
            <div className="mb-6 sticky top-0 z-[60] bg-gray-900/95 backdrop-blur-md py-4 px-0.5 border-b border-gray-800/50">
                <button 
                    onClick={handleGenerate} 
                    disabled={isDisabled}
                    className={`w-full py-6 font-black uppercase tracking-[0.6em] text-[12px] rounded-[2.5rem] flex items-center justify-center gap-4 transition-all border-2 relative group overflow-hidden ${isDisabled ? 'bg-gray-800 text-gray-600 border-gray-700 opacity-40' : 'bg-gradient-to-br from-indigo-500 to-indigo-800 text-white shadow-[0_0_50px_rgba(79,70,229,0.5)] border-indigo-400 animate-pulse'}`}
                >
                    {isGenerating ? <LoaderIcon className="h-6 w-6 animate-spin" /> : <GlowIcon className="h-6 w-6" />}
                    <span className="relative z-10">{isGenerating ? 'Synthesizing' : 'Execute Genesis'}</span>
                </button>
            </div>

            <AccordionSection title="Resource Hub" icon={<CloudIcon className="h-4 w-4" />} isOpen={openSections.resource} onToggle={() => toggleSection('resource')} indicator={state.provider === 'gemini' ? 'green' : (comfyStatus === 'online' ? 'green' : 'red')}>
                <div className="flex flex-col gap-1.5 p-1.5 bg-gray-950 rounded-2xl border border-gray-800 shadow-inner">
                    <button onClick={() => setState(s => ({ ...s, provider: 'comfyui' }))} className={`flex items-center justify-between px-4 py-2.5 text-[9px] font-black uppercase rounded-xl transition-all ${state.provider === 'comfyui' ? 'bg-orange-600 text-white' : 'text-gray-500 hover:bg-gray-800'}`}>
                        <span>Local Node</span><ServerIcon className="h-3 w-3" />
                    </button>
                    <button onClick={() => setState(s => ({ ...s, provider: 'gemini' }))} className={`flex items-center justify-between px-4 py-2.5 text-[9px] font-black uppercase rounded-xl transition-all ${state.provider === 'gemini' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-800'}`}>
                        <span>Pure Cloud</span><CloudIcon className="h-3 w-3" />
                    </button>
                </div>
            </AccordionSection>

            <AccordionSection title="Spatial Grid" icon={<BoxIcon className="h-4 w-4" />} isOpen={openSections.spatial} onToggle={() => toggleSection('spatial')} subValue={`${state.width}×${state.height}px`}>
                <div className="flex gap-4">
                    <div className="flex flex-col gap-1.5 shrink-0">
                        {RATIO_PRESETS.map(p => (
                            <button key={p.label} onClick={() => setState(s => ({ ...s, aspectRatio: p.label as any, width: p.w, height: p.h }))} className={`px-2 py-3 text-[9px] font-black rounded-xl border transition-all ${state.aspectRatio === p.label ? 'bg-indigo-600 text-white' : 'bg-gray-950 border-gray-800 text-gray-600'}`}>{p.label}</button>
                        ))}
                    </div>
                    <div className="flex-grow space-y-4 pr-1">
                        <input type="number" step={PIXEL_STEP} value={state.width} onChange={e => handleDimensionChange('w', parseInt(e.target.value))} className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 text-xs text-white" />
                        <button onClick={() => setState(s => ({ ...s, lockRatio: !s.lockRatio }))} className={`w-full p-2 rounded-xl border transition-all ${state.lockRatio ? 'bg-indigo-600 text-white' : 'bg-gray-900 text-gray-500'}`}><LinkIcon className="h-4 w-4 mx-auto" /></button>
                        <input type="number" step={PIXEL_STEP} value={state.height} onChange={e => handleDimensionChange('h', parseInt(e.target.value))} className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 text-xs text-white" />
                    </div>
                </div>
            </AccordionSection>

            {/* NEURAL VAULT SECTION */}
            <AccordionSection title="Neural Vault" icon={<DatabaseIcon className="h-4 w-4" />} isOpen={openSections.vault} onToggle={() => toggleSection('vault')} indicator={vault.length > 0 ? 'green' : 'none'}>
                <div className="space-y-3">
                    {vault.length === 0 ? (
                        <p className="text-[8px] text-gray-600 uppercase font-black text-center py-4">No logic segments stored.</p>
                    ) : vault.map(item => (
                        <div key={item.id} className="p-2 bg-gray-900 border border-gray-800 rounded-xl group relative overflow-hidden">
                            <img src={item.image} className="w-full h-24 object-cover rounded-lg mb-2" />
                            <div className="space-y-1">
                                <p className="text-[8px] text-gray-400 uppercase font-black truncate">{item.description}</p>
                                <div className="flex flex-wrap gap-1">
                                    {item.tags.slice(0, 3).map(t => <span key={t} className="text-[7px] bg-indigo-900/20 text-indigo-400 px-1 py-0.5 rounded uppercase font-black">{t}</span>)}
                                </div>
                            </div>
                            <button onClick={() => setGeneratedImageUrl(item.image)} className="absolute top-2 right-2 p-1.5 bg-indigo-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"><RefreshIcon className="h-3 w-3" /></button>
                        </div>
                    ))}
                </div>
            </AccordionSection>

            <div className="pt-8 px-0.5 pb-20">
                <div className="bg-gray-800/60 border border-gray-700/50 rounded-[2.5rem] p-6 shadow-2xl backdrop-blur-sm group/prompt relative">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] mb-4 block">Inference Objective</span>
                    <textarea 
                        value={state.prompt} 
                        onChange={e => setState(s => ({ ...s, prompt: e.target.value }))}
                        placeholder="Describe the visual objective..."
                        className="w-full h-40 bg-gray-950 border border-gray-800 rounded-2xl p-5 text-sm text-gray-200 resize-none outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                </div>
            </div>
          </div>
        </div>

        {/* CANVAS */}
        <div className="lg:col-span-8 xl:col-span-9 flex flex-col h-full overflow-hidden">
            <div 
                ref={canvasContainerRef}
                className="flex-grow bg-gray-900/40 border border-gray-700/50 rounded-[4rem] flex flex-col items-center justify-center relative overflow-hidden shadow-2xl backdrop-blur-sm group/canvas"
                onMouseDown={startRect} onMouseMove={updateRect} onMouseUp={stopRect}
            >
                {isGenerating && (
                    <div className="absolute inset-0 z-[80] flex flex-col items-center justify-center bg-gray-950/95 backdrop-blur-3xl">
                        <LoaderIcon className="h-20 w-20 text-indigo-500 animate-spin mb-6" />
                        <h4 className="text-3xl font-black text-white uppercase tracking-[0.6em]">Synthesizing</h4>
                    </div>
                )}

                {generatedImageUrl ? (
                    <div className="relative w-full h-full p-12 flex items-center justify-center">
                        <img src={generatedImageUrl} alt="Neural Export" className={`max-w-full max-h-full object-contain rounded-[2.5rem] shadow-2xl ${isSpatialMode ? 'cursor-crosshair' : ''}`} />
                        
                        {/* SPATIAL OVERLAYS */}
                        {isSpatialMode && <div className="scanline-effect" />}
                        {currentRect && (
                            <div className="absolute pointer-events-none" style={{ left: `calc(12px + ${currentRect.x}%)`, top: `calc(12px + ${currentRect.y}%)`, width: `${currentRect.w}%`, height: `${currentRect.h}%` }}>
                                <svg width="100%" height="100%" className="overflow-visible">
                                    <rect x="0" y="0" width="100%" height="100%" fill="none" stroke="#6366f1" strokeWidth="2" className="marching-ants" />
                                    {isDetecting && <rect x="0" y="0" width="100%" height="100%" fill="rgba(99,102,241,0.2)" />}
                                </svg>
                                {detectionResults && detectionResults.sensitivity > sensitivityThreshold && (
                                    <div className="absolute -top-10 left-0 bg-indigo-600 text-white text-[9px] font-black px-3 py-1.5 rounded-lg shadow-2xl uppercase tracking-widest flex items-center gap-2 whitespace-nowrap animate-in slide-in-from-bottom-2">
                                        <TargetIcon className="h-3 w-3" />
                                        Detected: {detectionResults.tags[0]} ({Math.round(detectionResults.sensitivity * 100)}%)
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="absolute bottom-12 right-12 flex gap-4 opacity-0 group-hover/canvas:opacity-100 transition-all">
                            <button onClick={() => setIsSpatialMode(!isSpatialMode)} className={`p-6 rounded-3xl shadow-2xl transition-all ${isSpatialMode ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`} title="Spatial Logic Mode">
                                <TargetIcon className="h-8 w-8" />
                            </button>
                            <button onClick={() => { const a = document.createElement('a'); a.href = generatedImageUrl; a.download = `Export.png`; a.click(); }} className="p-6 bg-white text-gray-950 rounded-3xl shadow-2xl"><DownloadIcon className="h-8 w-8" /></button>
                        </div>
                    </div>
                ) : (
                    <div className="text-center opacity-10 grayscale py-20 pointer-events-none">
                        <BoxIcon className="h-48 w-48 mx-auto text-gray-500" />
                        <h4 className="text-5xl font-black uppercase tracking-[0.8em] mt-8">Canvas Idle</h4>
                    </div>
                )}

                {/* SPATIAL SECTOR HUD */}
                {isSpatialMode && currentRect && detectionResults && (
                    <div className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-gray-900/90 backdrop-blur-xl border border-indigo-500/30 p-6 rounded-[2.5rem] shadow-[0_50px_100px_rgba(0,0,0,0.8)] z-[100] w-full max-w-xl animate-in slide-in-from-bottom-10">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <TargetIcon className="h-5 w-5 text-indigo-400" />
                                <span className="text-[10px] font-black uppercase text-white tracking-widest">Logic Segment Protocol</span>
                            </div>
                            <button onClick={() => { setIsSpatialMode(false); setCurrentRect(null); }} className="text-gray-500 hover:text-white"><XIcon className="h-5 w-5" /></button>
                        </div>
                        
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-gray-500">
                                    <span>Sensitivity Threshold</span>
                                    <span className="text-indigo-400">{Math.round(sensitivityThreshold * 100)}%</span>
                                </div>
                                <input type="range" min="0" max="1" step="0.01" value={sensitivityThreshold} onChange={e => setSensitivityThreshold(parseFloat(e.target.value))} className="w-full h-1 bg-gray-800 rounded-full appearance-none accent-indigo-600 cursor-pointer" />
                            </div>

                            <div className="bg-black/40 rounded-2xl p-4 border border-gray-800">
                                <span className="text-[9px] font-black text-gray-600 uppercase mb-2 block">Neural Transformation Instruction</span>
                                <div className="flex gap-3">
                                    <input 
                                        type="text" value={regenPrompt} onChange={e => setRegenPrompt(e.target.value)}
                                        placeholder="Enter transformation prompt..."
                                        className="flex-grow bg-transparent border-none focus:ring-0 text-sm text-gray-200"
                                    />
                                    <button onClick={handleRegenSegment} disabled={isGenerating} className="px-6 py-2.5 bg-indigo-600 text-white text-[9px] font-black uppercase rounded-xl hover:bg-indigo-500 transition-all flex items-center gap-2">
                                        {isGenerating ? <LoaderIcon className="h-3 w-3 animate-spin" /> : <RefreshIcon className="h-3 w-3" />}
                                        Regen
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default ImageStudio;
