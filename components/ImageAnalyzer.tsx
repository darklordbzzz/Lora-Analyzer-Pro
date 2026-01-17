
import React, { useState, useEffect, useCallback } from 'react';
import { 
  ImageIcon, XIcon, CopyIcon, 
  CheckCircleIcon, LoaderIcon, BoxIcon, 
  SparklesIcon, XCircleIcon, TerminalIcon,
  LabIcon, TargetIcon, RefreshIcon, InfoIcon,
  CodeBracketIcon, GlobeIcon, UserIcon, EditIcon
} from './Icons';
import { extractImageMetadata, ImageMeta } from '../services/imageMetadataService';
import { analyzeImageWithLLM } from '../services/llmService';
import { LLMModel, ImageAnalysisResult, AnalyzerTuningConfig } from '../types';

interface ImageAnalyzerProps {
    activeModel?: LLMModel;
}

const SECTION_HEADERS = {
  comp: "COMPOSITION DESCRIPTOR",
  style: "ARTISTIC STYLE",
  light: "LIGHTING & ILLUMINATION",
  tech: "TECHNIQUE",
  colors: "COLOR & GAMMA",
  pose: "DETAILED POSE DESCRIPTOR",
  action: "ACTION POSE IDENTIFIER",
  appearance: "APPEARANCE REGISTRY",
  preview: "TUNED PROMPT PREVIEW",
  artists: "SUGGESTED ARTISTS"
};

const ImageAnalyzer: React.FC<ImageAnalyzerProps> = ({ activeModel }) => {
    const [image, setImage] = useState<{ file: File; url: string; meta: ImageMeta } | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [result, setResult] = useState<ImageAnalysisResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [showRawMeta, setShowRawMeta] = useState(false);
    
    // Tuning Configuration State
    const [tuning, setTuning] = useState<AnalyzerTuningConfig>({
      keywords: '',
      deepPoseAudit: true,
      appearanceAudit: true,
      adjustments: {
        colorTemperature: 0,
        lightingIntensity: 100,
        weatherCondition: 'Clear',
        poseRigidity: 50,
        styleWeight: 100
      }
    });

    const [toggles, setToggles] = useState<Record<string, boolean>>({
      comp: true, style: true, light: true, tech: true, colors: true, pose: true, action: true, appearance: true, preview: true, artists: true
    });

    const handleFile = useCallback(async (file: File) => {
        if (!file.type.startsWith('image/')) return;
        const url = URL.createObjectURL(file);
        const meta = await extractImageMetadata(file);
        setImage({ file, url, meta });
        setResult(null);
        setError(null);
        setShowRawMeta(false);
    }, []);

    // Global Paste Listener
    useEffect(() => {
        const onPaste = (e: ClipboardEvent) => {
            const items = e.clipboardData?.items;
            if (!items) return;
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    const blob = items[i].getAsFile();
                    if (blob) handleFile(blob);
                }
            }
        };
        window.addEventListener('paste', onPaste);
        return () => window.removeEventListener('paste', onPaste);
    }, [handleFile]);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const files = e.dataTransfer.files;
        if (files && files[0]) {
            handleFile(files[0]);
        }
    };

    const handleAnalyze = async () => {
        if (!image || !activeModel) return;
        setIsAnalyzing(true);
        setError(null);
        setResult(null);

        try {
            const data = await analyzeImageWithLLM(image.file, activeModel, undefined, tuning);
            setResult(data);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleCopySection = (id: keyof typeof SECTION_HEADERS, content: any) => {
        const header = SECTION_HEADERS[id];
        let body = "";
        if (typeof content === 'string') body = content;
        else if (Array.isArray(content)) body = content.join(', ');
        else if (typeof content === 'object') body = JSON.stringify(content, null, 2);
        
        copyToClipboard(`${header}\n${body}`, id);
    };

    const handleCopyAll = () => {
        if (!result) return;
        let finalString = "";
        
        const sections: [keyof typeof SECTION_HEADERS, any][] = [
            ['comp', result.compositionDescriptor],
            ['style', result.artisticStyle],
            ['light', result.lightingIllumination],
            ['tech', result.technique],
            ['colors', result.colorGamma],
            ['pose', result.poseDescriptor],
            ['action', result.actionPoseIdentifier],
            ['appearance', result.appearanceRegistry],
            ['preview', result.tunedPromptPreview],
            ['artists', result.suggestedArtists]
        ];

        sections.forEach(([id, content]) => {
            if (toggles[id] && content) {
                let body = "";
                if (typeof content === 'string') body = content;
                else if (Array.isArray(content)) body = content.join(', ');
                else if (typeof content === 'object') body = JSON.stringify(content, null, 2);
                finalString += `${SECTION_HEADERS[id]}\n${body}\n\n`;
            }
        });

        copyToClipboard(finalString.trim(), 'all');
    };

    const ToggleSwitch = ({ id }: { id: string }) => (
        <button 
            onClick={() => setToggles(prev => ({ ...prev, [id]: !prev[id] }))}
            className={`w-8 h-4 rounded-full transition-all relative ${toggles[id] ? 'bg-hub-accent' : 'bg-gray-800'}`}
        >
            <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${toggles[id] ? 'left-4.5' : 'left-0.5'}`} style={{ left: toggles[id] ? '18px' : '2px' }} />
        </button>
    );

    const ControlSlider = ({ label, value, min, max, onChange }: { label: string, value: number, min: number, max: number, onChange: (v: number) => void }) => (
      <div className="space-y-2">
        <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-gray-500">
          <span>{label}</span>
          <span className="text-hub-accent">{value}</span>
        </div>
        <input 
          type="range" min={min} max={max} value={value} 
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="w-full h-1 bg-gray-900 rounded-lg appearance-none cursor-pointer accent-hub-accent"
        />
      </div>
    );

    return (
        <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 h-[calc(100vh-220px)] animate-in fade-in duration-500 overflow-hidden">
            {/* Sidebar Controls */}
            <div className="lg:col-span-4 flex flex-col gap-6 h-full overflow-y-auto custom-scrollbar pr-2 pb-12">
                
                <div 
                    className={`shrink-0 h-48 border-2 border-dashed rounded-[3rem] flex flex-col items-center justify-center transition-all relative overflow-hidden ${isDragging ? 'bg-hub-accent/20 border-hub-accent shadow-[0_0_30px_rgba(139,92,246,0.2)]' : 'bg-gray-800/10 border-gray-700/50 hover:bg-gray-800/20'}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => !image && document.getElementById('audit-upload')?.click()}
                >
                    <input id="audit-upload" type="file" className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
                    {image ? (
                        <div className="w-full h-full p-8 relative flex items-center justify-center animate-in zoom-in-95 duration-500">
                            <img src={image.url} alt="Target" className="max-w-full max-h-full object-contain rounded-[2rem] shadow-2xl border border-white/5" />
                            <button onClick={(e) => { e.stopPropagation(); setImage(null); setResult(null); }} className="absolute top-10 right-10 p-4 bg-gray-950/80 backdrop-blur-xl text-white rounded-full hover:bg-red-600 shadow-2xl active:scale-90 transition-all z-10"><XIcon className="h-6 w-6" /></button>
                            <div className="scanning-line opacity-30 pointer-events-none"></div>
                        </div>
                    ) : (
                        <div className="text-center p-12 space-y-6 cursor-pointer group">
                            <div className="p-10 bg-gray-900 rounded-[3rem] border border-gray-800 shadow-xl inline-block relative overflow-hidden transition-transform group-hover:scale-105">
                                <ImageIcon className={`h-16 w-16 relative z-10 transition-colors ${isDragging ? 'text-hub-accent' : 'text-hub-accent/40 group-hover:text-hub-accent'}`} />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-black text-gray-500 uppercase tracking-widest transition-colors group-hover:text-gray-300">Visual Target</h3>
                                <p className="text-[10px] text-gray-600 font-bold uppercase tracking-[0.2em]">Click, Drag, or Paste (Ctrl+V)</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Neural Tuning Configuration */}
                <div className="bg-gray-950/40 border border-white/10 rounded-[2.5rem] p-8 space-y-8 shadow-2xl">
                    <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                        <EditIcon className="h-5 w-5 text-hub-accent" />
                        <h4 className="text-[11px] font-black text-white uppercase tracking-[0.3em]">Neural Tuner</h4>
                    </div>

                    {/* Custom Keywords */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Contextual Injection</label>
                        <textarea 
                          value={tuning.keywords}
                          onChange={(e) => setTuning({...tuning, keywords: e.target.value})}
                          placeholder="Inject keywords (e.g. Cyberpunk, 8k, cinematic, futuristic)..."
                          className="w-full h-24 bg-black/40 border border-white/5 rounded-2xl p-4 text-[10px] text-gray-200 outline-none focus:border-hub-accent transition-all resize-none shadow-inner"
                        />
                    </div>

                    {/* Specialized Audits */}
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 block mb-2">Detailed Protocol Audits</label>
                        <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                            <div className="flex items-center gap-3">
                                <TargetIcon className="h-4 w-4 text-hub-accent" />
                                <span className="text-[10px] font-black text-gray-300 uppercase">Kinetic Pose Audit</span>
                            </div>
                            <button 
                                onClick={() => setTuning({...tuning, deepPoseAudit: !tuning.deepPoseAudit})}
                                className={`w-8 h-4 rounded-full transition-all relative ${tuning.deepPoseAudit ? 'bg-hub-accent' : 'bg-gray-800'}`}
                            >
                                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${tuning.deepPoseAudit ? 'left-4.5' : 'left-0.5'}`} style={{ left: tuning.deepPoseAudit ? '18px' : '2px' }} />
                            </button>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                            <div className="flex items-center gap-3">
                                <UserIcon className="h-4 w-4 text-hub-accent" />
                                <span className="text-[10px] font-black text-gray-300 uppercase">Appearance Registry</span>
                            </div>
                            <button 
                                onClick={() => setTuning({...tuning, appearanceAudit: !tuning.appearanceAudit})}
                                className={`w-8 h-4 rounded-full transition-all relative ${tuning.appearanceAudit ? 'bg-hub-accent' : 'bg-gray-800'}`}
                            >
                                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${tuning.appearanceAudit ? 'left-4.5' : 'left-0.5'}`} style={{ left: tuning.appearanceAudit ? '18px' : '2px' }} />
                            </button>
                        </div>
                    </div>

                    {/* Adjustment Matrix */}
                    <div className="space-y-6">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Synthesis Adjusters</label>
                        <ControlSlider label="Color Temperature" min={-100} max={100} value={tuning.adjustments.colorTemperature} onChange={(v) => setTuning({...tuning, adjustments: {...tuning.adjustments, colorTemperature: v}})} />
                        <ControlSlider label="Lighting Intensity" min={0} max={200} value={tuning.adjustments.lightingIntensity} onChange={(v) => setTuning({...tuning, adjustments: {...tuning.adjustments, lightingIntensity: v}})} />
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Weather Condition</label>
                          <select 
                            value={tuning.adjustments.weatherCondition} 
                            onChange={(e) => setTuning({...tuning, adjustments: {...tuning.adjustments, weatherCondition: e.target.value}})}
                            className="w-full bg-black/60 border border-white/5 rounded-xl px-3 py-2 text-[10px] text-white outline-none focus:border-hub-accent"
                          >
                            <option value="Clear">Clear</option>
                            <option value="Cloudy">Cloudy</option>
                            <option value="Stormy">Stormy</option>
                            <option value="Foggy">Foggy</option>
                            <option value="Cyberpunk Neon">Cyberpunk Neon</option>
                            <option value="Apocalyptic">Apocalyptic</option>
                          </select>
                        </div>
                        <ControlSlider label="Pose Rigidity" min={0} max={100} value={tuning.adjustments.poseRigidity} onChange={(v) => setTuning({...tuning, adjustments: {...tuning.adjustments, poseRigidity: v}})} />
                        <ControlSlider label="Style weight" min={0} max={100} value={tuning.adjustments.styleWeight} onChange={(v) => setTuning({...tuning, adjustments: {...tuning.adjustments, styleWeight: v}})} />
                    </div>
                </div>

                <div className="bg-gray-950/60 border border-gray-800 rounded-[2.5rem] p-8 space-y-4 shadow-2xl">
                    <button 
                        onClick={handleAnalyze} 
                        disabled={!image || isAnalyzing}
                        className={`w-full py-5 rounded-[1.5rem] font-black uppercase tracking-[0.4em] text-xs transition-all flex items-center justify-center gap-4 border-2 ${!image ? 'bg-gray-800 text-gray-600 border-gray-700' : 'bg-hub-accent border-hub-accent/50 hover:bg-violet-500 text-white shadow-xl active:scale-95'}`}
                    >
                        {isAnalyzing ? <LoaderIcon className="h-5 w-5 animate-spin" /> : <SparklesIcon className="h-5 w-5" />}
                        {isAnalyzing ? 'Processing' : 'Initiate Tuned Audit'}
                    </button>
                    <p className="text-[9px] text-gray-600 text-center font-bold uppercase tracking-widest opacity-60">Engine: {activeModel?.name || 'Offline'}</p>
                </div>
            </div>

            {/* Analysis Results View */}
            <div className="lg:col-span-8 bg-gray-900/40 border border-gray-700/50 rounded-[4rem] flex flex-col h-full overflow-hidden shadow-2xl backdrop-blur-md">
                <div className="p-10 border-b border-gray-700/50 bg-gray-900/60 backdrop-blur-xl sticky top-0 z-30 flex justify-between items-center">
                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-4">
                        <BoxIcon className="h-8 w-8 text-hub-accent" /> Vision Auditor
                    </h2>
                    {result && (
                      <button 
                        onClick={handleCopyAll}
                        className="px-8 py-3.5 bg-white text-black font-black uppercase tracking-widest text-[10px] rounded-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 shadow-xl"
                      >
                        {copiedId === 'all' ? <CheckCircleIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
                        {copiedId === 'all' ? 'Packet Copied' : 'Copy Full Analysis'}
                      </button>
                    )}
                </div>

                <div className="flex-grow p-12 overflow-y-auto custom-scrollbar">
                    {isAnalyzing ? (
                        <div className="h-full flex flex-col items-center justify-center space-y-12">
                            <LoaderIcon className="h-32 w-32 text-hub-accent animate-[spin_3s_linear_infinite]" />
                            <h3 className="text-3xl font-black text-white uppercase tracking-[0.4em] animate-pulse text-center leading-tight">Interrogating Visual <br/>Bitstream...</h3>
                        </div>
                    ) : result ? (
                        <div className="space-y-8 animate-in fade-in duration-1000 pb-20">
                            
                            {/* Tuned Prompt Preview Section - Primary */}
                            {result.tunedPromptPreview && (
                              <div className={`p-8 rounded-[3rem] border transition-all bg-hub-accent/10 border-hub-accent/30 shadow-[0_0_40px_rgba(139,92,246,0.1)] relative overflow-hidden group ${toggles.preview ? '' : 'opacity-40 grayscale'}`}>
                                <div className="absolute top-0 right-0 p-12 opacity-[0.05] pointer-events-none group-hover:scale-150 transition-transform duration-[3s]">
                                    <SparklesIcon className="h-48 w-48 text-white" />
                                </div>
                                <div className="flex justify-between items-center mb-6 relative z-10">
                                  <div className="flex items-center gap-3">
                                    <SparklesIcon className="h-5 w-5 text-hub-accent" />
                                    <span className="text-[11px] font-black text-white uppercase tracking-[0.4em]">Tuned Prompt Preview</span>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <button onClick={() => handleCopySection('preview', result.tunedPromptPreview)} className="text-gray-500 hover:text-white transition-colors">
                                      {copiedId === 'preview' ? <CheckCircleIcon className="h-5 w-5 text-green-500" /> : <CopyIcon className="h-5 w-5" />}
                                    </button>
                                    <ToggleSwitch id="preview" />
                                  </div>
                                </div>
                                <div className="bg-black/40 p-6 rounded-2xl border border-white/5 relative z-10">
                                  <p className="text-lg text-white leading-relaxed font-mono italic">"{result.tunedPromptPreview}"</p>
                                </div>
                              </div>
                            )}

                            {/* Appearance Registry Section */}
                            {result.appearanceRegistry && (
                              <div className={`p-8 rounded-[2.5rem] border transition-all ${toggles.appearance ? 'bg-gray-950/40 border-gray-800' : 'bg-gray-900/20 border-gray-900/50 opacity-40'}`}>
                                <div className="flex justify-between items-center mb-6">
                                  <div className="flex items-center gap-3">
                                    <UserIcon className="h-5 w-5 text-hub-accent" />
                                    <span className="text-[11px] font-black text-hub-accent uppercase tracking-[0.3em]">Appearance Registry</span>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <button onClick={() => handleCopySection('appearance', result.appearanceRegistry)} className="text-gray-500 hover:text-white transition-colors">
                                      {copiedId === 'appearance' ? <CheckCircleIcon className="h-5 w-5 text-green-500" /> : <CopyIcon className="h-5 w-5" />}
                                    </button>
                                    <ToggleSwitch id="appearance" />
                                  </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                  <div className="space-y-4">
                                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block">Attire Architecture</span>
                                    <p className="text-sm text-gray-200 leading-relaxed">{result.appearanceRegistry.attire}</p>
                                  </div>
                                  <div className="space-y-4">
                                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block">Hair & Styling</span>
                                    <p className="text-sm text-gray-200 leading-relaxed">{result.appearanceRegistry.haircutStyle}</p>
                                  </div>
                                </div>
                                <div className="mt-8 pt-6 border-t border-white/5">
                                  <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-4">Accessories</span>
                                  <div className="flex flex-wrap gap-2">
                                    {(result.appearanceRegistry.accessories || []).map((acc, i) => (
                                      <span key={i} className="px-3 py-1 bg-gray-900 text-gray-400 text-[10px] font-bold uppercase rounded-lg border border-white/5">{acc}</span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Action Pose Identifier */}
                            {result.actionPoseIdentifier && (
                              <div className={`p-8 rounded-[2.5rem] border transition-all ${toggles.action ? 'bg-gray-950/40 border-gray-800' : 'bg-gray-900/20 border-gray-900/50 opacity-40'}`}>
                                <div className="flex justify-between items-center mb-6">
                                  <div className="flex items-center gap-3">
                                    <TargetIcon className="h-5 w-5 text-hub-accent" />
                                    <span className="text-[11px] font-black text-hub-accent uppercase tracking-[0.3em]">Kinetic Pose Audit</span>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <button onClick={() => handleCopySection('action', result.actionPoseIdentifier)} className="text-gray-500 hover:text-white transition-colors">
                                      {copiedId === 'action' ? <CheckCircleIcon className="h-5 w-5 text-green-500" /> : <CopyIcon className="h-5 w-5" />}
                                    </button>
                                    <ToggleSwitch id="action" />
                                  </div>
                                </div>
                                <div className="p-6 bg-black/40 rounded-2xl border border-white/5">
                                  <p className="text-sm text-white font-medium italic leading-relaxed">{result.actionPoseIdentifier}</p>
                                </div>
                              </div>
                            )}

                            {/* Standard Analysis Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {[
                                { id: 'comp', title: 'Composition Blueprint', content: result.compositionDescriptor, icon: <TargetIcon className="h-4 w-4" /> },
                                { id: 'style', title: 'Architectural Style', content: result.artisticStyle, icon: <BoxIcon className="h-4 w-4" /> }
                              ].map(sec => (
                                <div key={sec.id} className={`p-8 rounded-[2.5rem] border transition-all ${toggles[sec.id] ? 'bg-gray-950/40 border-gray-800' : 'bg-gray-900/20 border-gray-900/50 opacity-40'}`}>
                                  <div className="flex justify-between items-center mb-6">
                                    <div className="flex items-center gap-3">
                                      <div className="text-hub-accent">{sec.icon}</div>
                                      <span className="text-[10px] font-black text-hub-accent uppercase tracking-[0.3em]">{sec.title}</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                      <button onClick={() => handleCopySection(sec.id as any, sec.content)} className="text-gray-500 hover:text-white transition-colors">
                                        {copiedId === sec.id ? <CheckCircleIcon className="h-4 w-4 text-green-500" /> : <CopyIcon className="h-4 w-4" />}
                                      </button>
                                      <ToggleSwitch id={sec.id} />
                                    </div>
                                  </div>
                                  <p className="text-sm text-gray-100 leading-relaxed font-medium">{sec.content}</p>
                                </div>
                              ))}
                            </div>

                            {[
                              { id: 'pose', title: 'Static Pose Registry', content: result.poseDescriptor, icon: <UserIcon className="h-4 w-4" /> },
                              { id: 'light', title: 'Illumination Matrix', content: result.lightingIllumination, icon: <SparklesIcon className="h-4 w-4" /> },
                              { id: 'tech', title: 'Synthesis Technique', content: result.technique, icon: <LabIcon className="h-4 w-4" /> },
                              { id: 'colors', title: 'Colorimetric Gamma', content: result.colorGamma, icon: <ImageIcon className="h-4 w-4" /> }
                            ].map(sec => (
                              <div key={sec.id} className={`p-8 rounded-[2.5rem] border transition-all ${toggles[sec.id] ? 'bg-gray-950/40 border-gray-800' : 'bg-gray-900/20 border-gray-900/50 opacity-40'}`}>
                                <div className="flex justify-between items-center mb-4">
                                  <div className="flex items-center gap-3">
                                    <div className="text-hub-accent">{sec.icon}</div>
                                    <span className="text-[10px] font-black text-hub-accent uppercase tracking-[0.3em]">{sec.title}</span>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <button onClick={() => handleCopySection(sec.id as any, sec.content)} className="text-gray-500 hover:text-white transition-colors">
                                      {copiedId === sec.id ? <CheckCircleIcon className="h-4 w-4 text-green-500" /> : <CopyIcon className="h-4 w-4" />}
                                    </button>
                                    <ToggleSwitch id={sec.id} />
                                  </div>
                                </div>
                                <p className="text-sm text-gray-100 leading-relaxed">{sec.content}</p>
                              </div>
                            ))}

                            <div className={`p-8 rounded-[2.5rem] border transition-all ${toggles.artists ? 'bg-gray-950/40 border-gray-800' : 'bg-gray-900/20 border-gray-900/50 opacity-40'}`}>
                                <div className="flex justify-between items-center mb-6">
                                  <div className="flex items-center gap-3">
                                    <SparklesIcon className="h-4 w-4 text-hub-accent" />
                                    <span className="text-[10px] font-black text-hub-accent uppercase tracking-[0.3em]">Inferred Aesthetic Artists</span>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <button onClick={() => handleCopySection('artists', result.suggestedArtists)} className="text-gray-500 hover:text-white transition-colors">
                                      {copiedId === 'artists' ? <CheckCircleIcon className="h-4 w-4 text-green-500" /> : <CopyIcon className="h-4 w-4" />}
                                    </button>
                                    <ToggleSwitch id="artists" />
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    {(result.suggestedArtists || []).map((artist, i) => (
                                        <span key={i} className="px-5 py-2 bg-hub-accent/10 text-hub-accent text-[10px] font-black uppercase tracking-widest rounded-xl border border-hub-accent/20">
                                            {artist}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center opacity-10 grayscale">
                            <BoxIcon className="h-48 w-48 mb-8" />
                            <h4 className="text-4xl font-black uppercase tracking-[0.5em] text-white">Kernel Idle</h4>
                            <p className="text-[11px] font-black uppercase tracking-[0.3em] mt-4">Load Target Bitstream to Initiate Audit</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ImageAnalyzer;
