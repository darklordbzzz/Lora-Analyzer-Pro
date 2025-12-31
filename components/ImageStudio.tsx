
import React, { useState, useEffect, useCallback } from 'react';
import { ImageStudioState, LLMModel } from '../types';
import { BoxIcon, ImageIcon, LoaderIcon, RefreshIcon, CloudIcon, DownloadIcon, LabIcon, SparklesIcon as GlowIcon, CodeBracketIcon, LinkIcon, XIcon, ServerIcon, PlugIcon, InfoIcon, ChevronDownIcon, XCircleIcon, CheckCircleIcon, TerminalIcon, PlusIcon, EditIcon } from './Icons';
import { generateImageWithAI, upscaleImageWithAI, checkComfyConnection, resetComfyNode, fileToBase64 } from '../services/llmService';

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
    blueprint: false,
    spatial: false,
    mastering: false
  });

  const toggleSection = (id: string) => {
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

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

  const handleResetRealloc = async () => {
      setIsResetting(true);
      await resetComfyNode();
      await new Promise(r => setTimeout(r, 800));
      await refreshConnection();
      setIsResetting(false);
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
      } catch (e) {
          console.error("Asset mapping failed", e);
      }
  }, []);

  // Clipboard Paste Integration for Studio
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

        const items = e.clipboardData?.items;
        if (items) {
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    const blob = items[i].getAsFile();
                    if (blob) handleFileChange(blob);
                }
            }
        }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handleFileChange]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      let finalWorkflow = null;
      if (selectedTemplateId === 'custom' && customWorkflowJson) {
          try {
              finalWorkflow = JSON.parse(customWorkflowJson);
          } catch (e) {
              throw new Error("Invalid Custom Workflow JSON syntax.");
          }
      } else if (selectedTemplateId !== 'custom') {
          (state as any).comfyHintCkpt = selectedTemplate.ckpt;
      }

      const url = await generateImageWithAI({ ...state, comfyWorkflow: finalWorkflow }, activeModel);
      setGeneratedImageUrl(url);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * ACTIVE-FIRST LOGIC
   * We trust the user over the background status pings. 
   * If a prompt exists, the button is ARMED and ALIVE.
   */
  const isPromptEmpty = !state.prompt.trim();
  const isDisabled = isGenerating || isPromptEmpty;
  
  const getButtonLabel = () => {
    if (isGenerating) return 'Synthesizing';
    if (isPromptEmpty) return 'Awaiting Logic';
    if (state.provider === 'comfyui') {
        if (comfyStatus === 'offline') return 'Force Local Link';
        if (comfyStatus === 'busy') return 'Queue Genesis';
    }
    return 'Execute Genesis';
  };

  const getButtonStyles = () => {
      if (isDisabled) return 'bg-gray-800 text-gray-600 border-gray-700 opacity-40 cursor-not-allowed';
      
      // Hyper-vivid "Armed" state purely based on user intent (prompt entry)
      if (state.provider === 'gemini') {
          return 'bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-800 text-white shadow-[0_0_50px_rgba(79,70,229,0.5)] border-indigo-400 animate-pulse';
      }
      return 'bg-gradient-to-br from-orange-500 via-red-600 to-red-800 text-white shadow-[0_0_50px_rgba(234,88,12,0.5)] border-orange-400 animate-pulse';
  };

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6 h-[calc(100vh-140px)] animate-in fade-in duration-500 overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-grow h-full overflow-hidden">
        
        {/* UNIFIED SIDEBAR ZONE */}
        <div className="lg:col-span-4 xl:col-span-3 flex flex-col h-full overflow-hidden">
          
          {/* SINGLE SCROLL AREA FOR ALL CONTROLS */}
          <div className="flex-grow overflow-y-auto custom-scrollbar pr-2 pb-12 space-y-1">
            
            {/* STICKY ACTION BUTTON - UNLOCKED & ARMED */}
            <div className="mb-6 sticky top-0 z-[60] bg-gray-900/95 backdrop-blur-md py-4 px-0.5 border-b border-gray-800/50">
                <button 
                    onClick={handleGenerate} 
                    disabled={isDisabled}
                    className={`w-full py-6 font-black uppercase tracking-[0.6em] text-[12px] rounded-[2.5rem] flex items-center justify-center gap-4 transition-all border-2 relative group overflow-hidden ${getButtonStyles()}`}
                >
                    <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    {isGenerating ? <LoaderIcon className="h-6 w-6 animate-spin" /> : <GlowIcon className="h-6 w-6" />}
                    <span className="relative z-10 antialiased drop-shadow-lg">{getButtonLabel()}</span>
                </button>
                {!isPromptEmpty && comfyStatus === 'offline' && state.provider === 'comfyui' && (
                    <p className="text-[8px] text-orange-500 font-black uppercase tracking-widest text-center mt-3 animate-bounce">
                        Protocol Override: Attempting Blind Uplink
                    </p>
                )}
            </div>

            <AccordionSection 
                title="Resource Hub" 
                icon={<CloudIcon className="h-4 w-4" />}
                isOpen={openSections.resource}
                onToggle={() => toggleSection('resource')}
                indicator={state.provider === 'gemini' ? 'green' : (comfyStatus === 'online' ? 'green' : comfyStatus === 'busy' ? 'orange' : 'red')}
            >
                <div className="flex flex-col gap-1.5 p-1.5 bg-gray-950 rounded-2xl border border-gray-800 shadow-inner">
                    <button onClick={() => setState(s => ({ ...s, provider: 'comfyui' }))} className={`flex items-center justify-between px-4 py-2.5 text-[9px] font-black uppercase rounded-xl transition-all ${state.provider === 'comfyui' ? 'bg-orange-600 text-white shadow-xl' : 'text-gray-500 hover:bg-gray-800'}`}>
                        <span>Local Node</span>
                        <ServerIcon className="h-3 w-3" />
                    </button>
                    <button onClick={() => setState(s => ({ ...s, provider: 'gemini' }))} className={`flex items-center justify-between px-4 py-2.5 text-[9px] font-black uppercase rounded-xl transition-all ${state.provider === 'gemini' ? 'bg-indigo-600 text-white shadow-xl' : 'text-gray-500 hover:bg-gray-800'}`}>
                        <span>Pure Cloud</span>
                        <CloudIcon className="h-3 w-3" />
                    </button>
                </div>

                <div className="border border-gray-700/50 rounded-2xl p-4 bg-gray-950/40 relative group">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest">Node Status</span>
                        <div className={`w-1.5 h-1.5 rounded-full ${comfyStatus === 'online' ? 'bg-green-500 animate-pulse shadow-[0_0_8px_#22c55e]' : comfyStatus === 'busy' ? 'bg-orange-500' : 'bg-red-500'}`} />
                    </div>
                    <p className={`text-[8px] font-black uppercase tracking-wider mb-4 ${comfyStatus === 'online' ? 'text-green-400' : comfyStatus === 'busy' ? 'text-orange-400' : 'text-red-400'}`}>
                        {comfyStatus === 'online' ? 'Local GPU IDLE / READY.' : comfyStatus === 'busy' ? 'Local GPU BUSY / QUEUING.' : 'Local Node OFFLINE.'}
                    </p>
                    <button onClick={handleResetRealloc} disabled={isResetting} className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 text-[8px] font-black uppercase rounded-lg border border-gray-700 transition-all flex items-center justify-center gap-1.5 active:scale-95">
                        {isResetting ? <LoaderIcon className="h-2.5 w-2.5 animate-spin" /> : <RefreshIcon className="h-2.5 w-2.5" />}
                        Flush VRAM
                    </button>
                </div>
            </AccordionSection>

            <AccordionSection 
                title="Source Asset" 
                icon={<ImageIcon className="h-4 w-4" />}
                isOpen={openSections.asset}
                onToggle={() => toggleSection('asset')}
                indicator={state.sourceImage ? 'green' : 'gray'}
            >
                <div className="flex flex-col gap-4">
                    {state.sourceImage ? (
                        <div className="relative group/asset-preview">
                            <div className="w-full aspect-square rounded-2xl bg-gray-950 border-2 border-indigo-500/20 overflow-hidden flex items-center justify-center shadow-inner relative">
                                <img src={state.sourceImage} alt="Ref Asset" className="w-full h-full object-cover" />
                            </div>
                            <div className="absolute inset-0 bg-gray-950/60 opacity-0 group-hover/asset-preview:opacity-100 transition-all flex items-center justify-center rounded-2xl">
                                <button onClick={() => setState(s => ({ ...s, sourceImage: undefined }))} className="p-3 bg-red-600 text-white rounded-full shadow-2xl hover:scale-110 active:scale-90 transition-all">
                                    <XIcon className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div 
                            onClick={() => document.getElementById('studio-input-sub')?.click()}
                            className="w-full py-12 border-2 border-dashed border-gray-800 hover:border-indigo-500/40 hover:bg-indigo-500/5 rounded-3xl transition-all flex flex-col items-center justify-center cursor-pointer group"
                        >
                            <div className="p-5 bg-gray-900 rounded-2xl border border-gray-800 mb-4 group-hover:scale-110 transition-transform">
                                <ImageIcon className="h-8 w-8 text-gray-700 group-hover:text-indigo-400" />
                            </div>
                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Awaiting Reference</p>
                        </div>
                    )}
                    <input id="studio-input-sub" type="file" className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && handleFileChange(e.target.files[0])} />
                </div>
            </AccordionSection>

            <AccordionSection 
                title="Logic Blueprint" 
                icon={<LabIcon className="h-4 w-4" />}
                isOpen={openSections.blueprint}
                onToggle={() => toggleSection('blueprint')}
                indicator={selectedTemplateId === 'custom' ? 'orange' : 'green'}
            >
                <div className="relative z-[100]">
                    <button 
                        onClick={() => setIsComboOpen(!isComboOpen)}
                        className="w-full px-4 py-3.5 bg-gray-950 border border-gray-800 rounded-2xl flex items-center justify-between group hover:border-indigo-500/30 transition-all shadow-inner"
                    >
                        <div className="text-left min-w-0">
                            <div className="text-[10px] font-black uppercase text-indigo-400 truncate tracking-tight">{selectedTemplate.name}</div>
                            <div className="text-[8px] opacity-40 font-bold uppercase truncate tracking-tighter">{selectedTemplate.tip}</div>
                        </div>
                        <ChevronDownIcon className={`h-4 w-4 text-gray-600 transition-transform ${isComboOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isComboOpen && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border border-gray-700 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.8)] z-[200] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-2 space-y-1">
                                {COMFY_TEMPLATES.map(t => (
                                    <button 
                                        key={t.id} 
                                        onClick={() => { setSelectedTemplateId(t.id); setIsComboOpen(false); }}
                                        className={`w-full px-4 py-3 rounded-xl flex items-center justify-between transition-all text-left ${selectedTemplateId === t.id ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-gray-800 text-gray-400'}`}
                                    >
                                        <div>
                                            <div className="text-[9px] font-black uppercase tracking-tight">{t.name}</div>
                                            <div className={`text-[8px] font-bold uppercase ${selectedTemplateId === t.id ? 'text-indigo-200' : 'opacity-40'}`}>{t.tip}</div>
                                        </div>
                                        {selectedTemplateId === t.id && <CheckCircleIcon className="h-4 w-4 text-indigo-400" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {selectedTemplateId === 'custom' && (
                    <div className="animate-in slide-in-from-top-2 duration-300 pt-1">
                        <textarea 
                            value={customWorkflowJson}
                            onChange={(e) => setCustomWorkflowJson(e.target.value)}
                            placeholder='Paste Workflow API JSON here...'
                            className="w-full h-32 bg-gray-950 border border-gray-800 rounded-2xl p-4 text-[10px] font-mono text-indigo-300/70 focus:border-indigo-500/50 outline-none resize-none custom-scrollbar"
                        />
                    </div>
                )}
            </AccordionSection>

            <AccordionSection 
                title="Spatial Grid" 
                icon={<BoxIcon className="h-4 w-4" />}
                isOpen={openSections.spatial}
                onToggle={() => toggleSection('spatial')}
                subValue={`${state.width}×${state.height}px`}
            >
                <div className="flex gap-4">
                    <div className="flex flex-col gap-1.5 shrink-0">
                        {RATIO_PRESETS.map(p => (
                            <button key={p.label} onClick={() => setState(s => ({ ...s, aspectRatio: p.label as any, width: p.w, height: p.h }))} className={`px-2 py-3 text-[9px] font-black rounded-xl border transition-all ${state.aspectRatio === p.label ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-gray-950 border-gray-800 text-gray-600'}`}>
                                {p.label}
                            </button>
                        ))}
                    </div>
                    <div className="flex-grow space-y-4 pr-1">
                        <div className="space-y-1 relative group">
                            <label className="text-[8px] font-black text-gray-600 uppercase ml-1">Width Axis</label>
                            <input type="number" step={PIXEL_STEP} value={state.width} onChange={e => handleDimensionChange('w', parseInt(e.target.value))} className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-white focus:ring-1 focus:ring-indigo-500 outline-none font-mono" />
                        </div>
                        
                        <div className="flex items-center justify-center py-1">
                            <button 
                                onClick={() => setState(s => ({ ...s, lockRatio: !s.lockRatio }))} 
                                title={state.lockRatio ? "Unlock Aspect Ratio" : "Lock Aspect Ratio"}
                                className={`p-2.5 rounded-full border shadow-lg transition-all z-10 ${state.lockRatio ? 'bg-indigo-600 border-indigo-400 text-white shadow-indigo-600/30' : 'bg-gray-900 border-gray-700 text-gray-600'}`}
                            >
                                <LinkIcon className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[8px] font-black text-gray-600 uppercase ml-1">Height Axis</label>
                            <input type="number" step={PIXEL_STEP} value={state.height} onChange={e => handleDimensionChange('h', parseInt(e.target.value))} className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-white focus:ring-1 focus:ring-indigo-500 outline-none font-mono" />
                        </div>
                    </div>
                </div>
            </AccordionSection>

            <AccordionSection 
                title="Mastering & Upscale" 
                icon={<GlowIcon className="h-4 w-4" />}
                isOpen={openSections.mastering}
                onToggle={() => toggleSection('mastering')}
                subValue={state.masteringActive ? `${state.upscaleFactor}x • ${UPSCALE_MODELS.find(m => m.id === state.masteringModel)?.name.split(' ')[0]}` : 'OFF'}
            >
                <div className="space-y-5">
                    <div className="flex items-center justify-between p-3 bg-gray-950 border border-gray-800 rounded-xl">
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Neural Mastering</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={state.masteringActive} onChange={e => setState(s => ({ ...s, masteringActive: e.target.checked }))} />
                            <div className="w-9 h-5 bg-gray-700 rounded-full peer peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"></div>
                        </label>
                    </div>

                    <div className={state.masteringActive ? 'space-y-4 opacity-100 transition-opacity' : 'opacity-30 pointer-events-none'}>
                        <div className="grid grid-cols-2 gap-2">
                            {[2, 4].map(f => (
                                <button key={f} onClick={() => setState(s => ({ ...s, upscaleFactor: f as any }))} className={`py-2 rounded-xl text-[10px] font-black border transition-all ${state.upscaleFactor === f ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg' : 'bg-gray-900 border-gray-800 text-gray-500 hover:text-gray-300'}`}>
                                    Upscale {f}x
                                </button>
                            ))}
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[8px] font-black text-gray-600 uppercase ml-1">Inference Model</label>
                            <select value={state.masteringModel} onChange={e => setState(s => ({ ...s, masteringModel: e.target.value }))} className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-[10px] text-white outline-none focus:border-indigo-500">
                                {UPSCALE_MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
            </AccordionSection>

            {/* INTEGRATED PROMPT BOX - ARMED & LOADED */}
            <div className="pt-8 px-0.5 pb-20">
                <div className="bg-gray-800/60 border border-gray-700/50 rounded-[2.5rem] p-6 shadow-2xl backdrop-blur-sm group/prompt relative">
                    <div className="flex justify-between items-center px-1 mb-4">
                        <div className="flex flex-col">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em]">Inference Objective</h3>
                            <span className="text-[8px] font-black text-indigo-500/50 uppercase tracking-widest mt-1">Logic Sensor Active</span>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-md border uppercase mb-1 transition-colors ${state.prompt ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'text-gray-600 border-gray-800'}`}>Tokens: {state.prompt.length}</span>
                            <div className="w-24 h-1 bg-gray-900 rounded-full overflow-hidden">
                                <div className={`h-full transition-all duration-500 ${state.provider === 'gemini' ? 'bg-indigo-500 shadow-[0_0_10px_rgba(79,70,229,0.5)]' : 'bg-orange-500 shadow-[0_0_10px_rgba(234,88,12,0.5)]'}`} style={{ width: `${Math.min(100, state.prompt.length / 5)}%` }} />
                            </div>
                        </div>
                    </div>
                    <textarea 
                        value={state.prompt} 
                        onChange={e => setState(s => ({ ...s, prompt: e.target.value }))}
                        placeholder="Describe the neural visual objective..."
                        className="w-full h-40 bg-gray-950 border border-gray-800 rounded-2xl p-5 text-sm text-gray-200 resize-none outline-none focus:ring-2 focus:ring-indigo-500/50 leading-relaxed custom-scrollbar shadow-inner transition-all placeholder:opacity-30"
                    />
                    <div className="mt-4 flex items-center justify-between px-1">
                        <div className="flex items-center gap-2 opacity-40 group-hover/prompt:opacity-100 transition-opacity">
                            <div className={`w-1.5 h-1.5 rounded-full ${state.prompt ? 'bg-indigo-500 animate-pulse shadow-[0_0_10px_#6366f1]' : 'bg-gray-600'}`} />
                            <span className={`text-[8px] font-black uppercase tracking-[0.2em] ${state.prompt ? 'text-indigo-400' : 'text-gray-500'}`}>{state.provider === 'gemini' ? 'Cloud Synthesis Route' : 'Local VRAM Engine Route'}</span>
                        </div>
                        {state.provider === 'comfyui' && (
                            <div className="flex items-center gap-2">
                                <div className={`w-1.5 h-1.5 rounded-full ${comfyStatus === 'offline' ? 'bg-red-500 shadow-[0_0_5px_#ef4444]' : 'bg-green-500 shadow-[0_0_5px_#22c55e]'}`} />
                                <span className={`text-[8px] font-black uppercase tracking-widest ${comfyStatus === 'offline' ? 'text-orange-500' : 'text-green-500'}`}>
                                    {comfyStatus === 'offline' ? 'UPLINK MANUALLY BYPASSED' : 'UPLINK ESTABLISHED'}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
          </div>
        </div>

        {/* CANVAS WORKSPACE ZONE */}
        <div className="lg:col-span-8 xl:col-span-9 flex flex-col h-full overflow-hidden">
            <div className="flex-grow bg-gray-900/40 border border-gray-700/50 rounded-[4rem] flex flex-col items-center justify-center relative overflow-hidden shadow-2xl backdrop-blur-sm group/canvas">
                {isGenerating && (
                    <div className="absolute inset-0 z-[80] flex flex-col items-center justify-center bg-gray-950/95 backdrop-blur-3xl animate-in fade-in duration-500">
                        <div className="relative">
                            <LoaderIcon className="h-32 w-32 text-indigo-500 animate-spin mb-8" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <GlowIcon className="h-8 w-8 text-white animate-pulse" />
                            </div>
                        </div>
                        <h4 className="text-4xl font-black text-white uppercase tracking-[0.6em] text-center">Synthesizing</h4>
                        <p className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.8em] mt-4 opacity-70">
                            {state.provider === 'comfyui' ? `Local Node • ${selectedTemplate.name}` : 'Cloud Logic Pipeline Active'}
                        </p>
                    </div>
                )}

                {generatedImageUrl ? (
                    <div className="relative w-full h-full p-12 flex items-center justify-center animate-in zoom-in-95 duration-700">
                        <img src={generatedImageUrl} alt="Neural Export" className="max-w-full max-h-full object-contain rounded-[2.5rem] shadow-[0_50px_100px_rgba(0,0,0,0.9)] border border-white/5" />
                        <div className="absolute bottom-12 right-12 flex gap-4 opacity-0 group-hover/canvas:opacity-100 transition-all translate-y-8 group-hover/canvas:translate-y-0 duration-500">
                            <button onClick={() => { const a = document.createElement('a'); a.href = generatedImageUrl; a.download = `StudioExport_${Date.now()}.png`; a.click(); }} className="p-6 bg-white text-gray-950 rounded-3xl shadow-2xl transition-all hover:scale-110 active:scale-90"><DownloadIcon className="h-8 w-8" /></button>
                            <button onClick={() => setGeneratedImageUrl(null)} className="p-6 bg-gray-900 border border-gray-700 text-red-500 rounded-3xl shadow-2xl transition-all hover:scale-110 active:scale-90"><RefreshIcon className="h-8 w-8" /></button>
                        </div>
                    </div>
                ) : error ? (
                    <div className="h-full flex flex-col items-center justify-center p-12 text-center animate-in zoom-in-95">
                        <XCircleIcon className="h-20 w-20 text-red-500 mb-6 opacity-80" />
                        <h3 className="text-3xl font-black text-white uppercase tracking-[0.3em] mb-6">Pipeline Failure</h3>
                        <div className="bg-red-950/20 border border-red-500/20 p-8 rounded-[2rem] max-w-2xl mb-8 font-mono text-xs text-red-200 leading-relaxed shadow-inner">
                            {error}
                        </div>
                        <div className="flex gap-4">
                            <button onClick={() => setError(null)} className="px-12 py-4 bg-gray-800 text-white font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-gray-700 transition-all">Clear Buffer</button>
                            <button onClick={handleResetRealloc} className="px-12 py-4 bg-red-600 text-white font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-red-500 transition-all">Node Reset</button>
                        </div>
                    </div>
                ) : (
                    <div 
                        onDrop={(e) => { e.preventDefault(); setIsDraggingAsset(false); if (e.dataTransfer.files?.[0]) handleFileChange(e.dataTransfer.files[0]); }}
                        onDragOver={(e) => { e.preventDefault(); setIsDraggingAsset(true); }}
                        onDragLeave={() => setIsDraggingAsset(false)}
                        className={`h-full w-full flex flex-col items-center justify-center transition-all duration-500 cursor-pointer ${isDraggingAsset ? 'bg-indigo-600/10' : ''}`}
                        onClick={() => document.getElementById('studio-input-main')?.click()}
                    >
                        <input id="studio-input-main" type="file" className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && handleFileChange(e.target.files[0])} />
                        <div className="text-center opacity-10 grayscale py-20 pointer-events-none">
                            <div className="relative mb-8">
                                <BoxIcon className="h-48 w-48 mx-auto text-gray-500" />
                                <div className="absolute inset-0 bg-indigo-500 blur-[120px] opacity-20 animate-pulse"></div>
                            </div>
                            <h4 className="text-5xl font-black uppercase tracking-[0.8em] mb-4 text-gray-100">Canvas Idle</h4>
                            <p className="text-sm font-black uppercase tracking-[0.5em] opacity-60 leading-loose text-gray-400">Establish Architecture • Deploy Prompt • Synthesize</p>
                        </div>
                        {isDraggingAsset && (
                            <div className="absolute inset-0 border-4 border-dashed border-indigo-500/50 rounded-[4rem] animate-pulse m-8"></div>
                        )}
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default ImageStudio;
