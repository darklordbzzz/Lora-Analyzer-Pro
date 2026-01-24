
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { AnalyzerTuningConfig, ImageAnalysisResult, AnalysisStatus } from '../types';
import { analyzeImageWithLLM } from '../services/geminiService';
import { 
  ImageIcon, LoaderIcon, SparklesIcon, XIcon, ChevronDownIcon, 
  CopyIcon, CheckIcon, TargetIcon, PaletteIcon, 
  RefreshIcon, UploadIcon, UserIcon, BoxIcon, DuplicateIcon,
  PlusIcon, TrashIcon, DownloadIcon, SearchIcon
} from './Icons';

interface ImageAnalyzerProps {
  tuning: AnalyzerTuningConfig;
  setTuning: React.Dispatch<React.SetStateAction<AnalyzerTuningConfig>>;
  onSaveResult: (entry: any) => void;
}

const WEATHER_SHADES = [
  { name: 'Warm', color: '#ffb347' },
  { name: 'Cool', color: '#89cff0' },
  { name: 'Neutral', color: '#ffffff' },
  { name: 'Ethereal', color: '#e0b0ff' },
  { name: 'Cyber', color: '#00ff41' },
  { name: 'Toxic', color: '#adff2f' },
  { name: 'Sunset', color: '#ff5e5e' },
  { name: 'None', color: 'transparent' }
];

const LogicToggle = ({ active, onChange }: { active: boolean, onChange: () => void }) => (
  <label className="inline-flex items-center cursor-pointer scale-100">
    <input type="checkbox" className="sr-only peer" checked={active} onChange={onChange} />
    <div className="relative w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 shadow-inner"></div>
  </label>
);

const ComboboxField = ({ label, value, options = [], onSelect, onAdd, onRemove }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = (options || []).filter((opt: string) => 
    opt.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = () => {
    const val = search.trim();
    if (val && !(options || []).includes(val)) {
      onAdd(val);
      onSelect(val);
      setSearch('');
      setIsOpen(false);
    }
  };

  return (
    <div className="space-y-2 relative" ref={wrapperRef}>
      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1 block">{label}</label>
      <div className="flex gap-2">
        <div className="relative flex-grow group">
          <input 
            type="text" 
            value={isOpen ? search : (value || '')} 
            onFocus={() => { setIsOpen(true); setSearch(''); }}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder={`Type ${label.toLowerCase()}...`}
            className="w-full bg-gray-900 border border-white/10 rounded-xl px-4 py-3 text-xs text-indigo-300 outline-none focus:border-indigo-500 transition-all shadow-inner"
          />
          <button 
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-indigo-400"
          >
            <ChevronDownIcon className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
        <button 
          onClick={handleAdd}
          disabled={!search.trim()}
          className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-30 disabled:grayscale"
          title="Add to library"
        >
          <PlusIcon className="h-4 w-4" />
        </button>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="max-h-60 overflow-y-auto custom-scrollbar p-1.5">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt: string) => (
                <div 
                  key={opt}
                  className={`flex items-center justify-between p-2.5 rounded-xl transition-all group/item ${value === opt ? 'bg-indigo-600/20 text-indigo-300' : 'hover:bg-white/5 text-gray-400 hover:text-gray-200'}`}
                >
                  <button 
                    className="flex-grow text-left text-[11px] font-black uppercase tracking-tight"
                    onClick={() => { onSelect(opt); setIsOpen(false); setSearch(''); }}
                  >
                    {opt}
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onRemove(opt); }}
                    className="p-1 text-gray-600 hover:text-red-400 opacity-0 group-hover/item:opacity-100 transition-opacity"
                  >
                    <XIcon className="h-3 w-3" />
                  </button>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-[10px] text-gray-600 uppercase font-black tracking-widest italic">
                {search ? "No matching logic - press [+] to add" : "Protocol empty"}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const Accordion = ({ id, title, icon: Icon, children, openSections, toggleSection, compact = false }: any) => (
  <div className={`va-card rounded-[1.5rem] overflow-hidden mb-3 border transition-all ${openSections.has(id) ? 'border-indigo-500/30 bg-indigo-950/10' : 'border-white/5'}`}>
    <div className={`flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer ${compact ? 'p-3 px-5' : 'p-4 px-6'}`} onClick={() => toggleSection(id)}>
      <div className="flex items-center gap-4">
        <div className={`p-2 rounded-xl ${openSections.has(id) ? 'bg-indigo-600 text-white' : 'bg-indigo-500/10 text-indigo-400'}`}>
          <Icon className={compact ? "h-5 w-5" : "h-6 w-6"} />
        </div>
        <span className={`font-black uppercase tracking-widest text-white ${compact ? 'text-xs' : 'text-sm'}`}>{title}</span>
      </div>
      <ChevronDownIcon className={`h-5 w-5 text-gray-500 transition-transform ${openSections.has(id) ? 'rotate-180' : ''}`} />
    </div>
    {openSections.has(id) && (
      <div className={`${compact ? 'p-3 px-5 pt-0' : 'p-4 px-6 pt-0'} border-t border-white/5 animate-in slide-in-from-top-1 duration-200`}>
        {children}
      </div>
    )}
  </div>
);

const EditableField = ({ label, value, onChange, onCopy, active, onToggle }: any) => (
  <div className={`space-y-1.5 group relative mt-2 transition-opacity ${active ? 'opacity-100' : 'opacity-40'}`}>
    <div className="flex justify-between items-center px-1">
      <div className="flex items-center gap-3">
        <span className="text-[11px] font-black text-indigo-500/60 uppercase tracking-[0.2em]">{label}</span>
        <LogicToggle active={active} onChange={onToggle} />
      </div>
      <button onClick={onCopy} className="p-1 hover:text-indigo-400 text-gray-600 transition-colors opacity-0 group-hover:opacity-100">
        <CopyIcon className="h-4 w-4" />
      </button>
    </div>
    <textarea 
      disabled={!active}
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-gray-200 font-medium resize-none outline-none focus:border-indigo-500/50 focus:bg-black/60 transition-all custom-scrollbar"
      rows={Math.max(2, Math.ceil((value?.length || 0) / 80) || 1)}
    />
  </div>
);

const ImpactGauge = ({ label, value, min, max, onChange }: any) => (
  <div className="space-y-2">
    <div className="flex justify-between items-center px-1">
      <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest">{label}</span>
      <span className="text-indigo-400 font-mono text-sm font-bold">{value}%</span>
    </div>
    <input type="range" min={min} max={max} value={value} onChange={e => onChange(parseInt(e.target.value))} className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
  </div>
);

const ImageAnalyzer: React.FC<ImageAnalyzerProps> = ({ tuning, setTuning, onSaveResult }) => {
  const [image, setImage] = useState<{ file: File; url: string; base64?: string } | null>(null);
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [result, setResult] = useState<ImageAnalysisResult | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['input', 'results-foundation', 'results-subject', 'results-synthesis']));
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeToggles, setActiveToggles] = useState<Record<string, boolean>>({
    composition: true, style: true, lighting: true, technique: true, colors: true, 
    pose: true, kinetic: true, attire: true, hair: true, synthesis: true
  });

  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs]);
  const addLog = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const toggleSection = (id: string) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => setImage({ file, url: URL.createObjectURL(file), base64: e.target?.result as string });
    reader.readAsDataURL(file);
    setResult(null); setLogs([]); setStatus(AnalysisStatus.IDLE);
  };

  const handleAnalyze = async () => {
    if (!image) return;
    setStatus(AnalysisStatus.PENDING);
    setLogs(["PROTOCOL INITIALIZED: Awaiting neural tunnel..."]);
    try {
      const data = await analyzeImageWithLLM(image.file, tuning, (msg) => addLog(msg));
      setResult(data);
      setStatus(AnalysisStatus.COMPLETED);
      addLog("SUCCESS: Neural audit protocol finalized.");
      
      const v4_scheme = {
        tuning: JSON.parse(JSON.stringify(tuning)),
        result: data,
        version: "4.1",
        exportedAt: new Date().toISOString()
      };
      onSaveResult({ ...v4_scheme, id: crypto.randomUUID(), fileName: image.file.name, sourceImageBase64: image.base64 });
    } catch (e: any) {
      addLog(`SIGNAL_FAILURE: ${e.message}`); 
      setStatus(AnalysisStatus.FAILED);
    }
  };

  const handleResultChange = (path: string, val: any) => {
    if (!result) return;
    const updated = JSON.parse(JSON.stringify(result));
    const keys = path.split('.');
    let current: any = updated;
    for (let i = 0; i < keys.length - 1; i++) current = current[keys[i]];
    current[keys[keys.length - 1]] = val;
    setResult(updated);
  };

  const copyField = (text: string, id: string) => {
    navigator.clipboard.writeText(text); setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyV4Scheme = () => {
    if (!result) return;
    const v4_scheme = {
      tuning: JSON.parse(JSON.stringify(tuning)),
      result: result,
      version: "4.1",
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(v4_scheme, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AI_HUB_AUDIT_${image?.file.name.split('.')[0] || 'ARCHIVE'}.auditjson`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyAll = () => {
    if (!result) return;
    let text = "";
    if (activeToggles.composition) text += `[COMPOSITION]: ${result.compositionDescriptor}\n\n`;
    if (activeToggles.style) text += `[ARTISTIC LOGIC]: ${result.artisticStyle}\n\n`;
    if (activeToggles.lighting) text += `[LIGHTING PROTOCOL]: ${result.lightingIllumination}\n\n`;
    if (activeToggles.technique) text += `[EXECUTION METHOD]: ${result.technique}\n\n`;
    if (activeToggles.colors) text += `[COLOR CALIBRATION]: ${result.colorGamma}\n\n`;
    
    if (result.suggestedArtists && result.suggestedArtists.length > 0) {
      text += `Suggested Artists: ${result.suggestedArtists.join(', ')}\n\n`;
    }

    if (activeToggles.pose) text += `[LIMBS POSITION DETAIL]: ${result.poseDescriptor}\n\n`;
    if (activeToggles.kinetic) text += `[KINETIC STATE]: ${result.actionPoseIdentifier}\n\n`;
    if (activeToggles.attire) text += `[ATTIRE ARCHETYPE]: ${result.appearanceRegistry?.attire}\n\n`;
    if (activeToggles.hair) text += `[GROOMING SPECS]: ${result.appearanceRegistry?.haircutStyle}\n\n`;
    if (result.appearanceRegistry?.accessories && result.appearanceRegistry.accessories.length > 0) {
      text += `[ACCESSORY REGISTRY]: ${result.appearanceRegistry.accessories.join(', ')}\n\n`;
    }
    if (activeToggles.synthesis) text += `[MASTER GENERATION PROMPT]\n${result.tunedPromptPreview}\n\n`;
    
    navigator.clipboard.writeText(text.trim());
    setCopiedId('copy-all');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleImportAudit = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.tuning) setTuning(prev => ({ ...prev, ...data.tuning }));
        if (data.result) setResult(data.result);
        addLog("SUCCESS: Archive imported.");
      } catch (err) {
        addLog("ERROR: Import failed. Invalid structure.");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleResetCanvas = () => {
    setImage(null);
    setResult(null);
    setStatus(AnalysisStatus.IDLE);
    setLogs([]);
  };

  return (
    <div className="max-w-[1500px] mx-auto space-y-6 animate-in fade-in duration-500 pb-12">
      {/* Primary Status & Action Deck */}
      <div className="flex items-center justify-between bg-gray-900/80 p-4 rounded-2xl border border-white/10 sticky top-24 z-40 backdrop-blur-2xl shadow-2xl">
        <div className="flex items-center gap-8 px-4">
          <div className="flex items-center gap-4">
            <div className={`w-3 h-3 rounded-full ${status === AnalysisStatus.PENDING ? 'bg-indigo-500 animate-pulse shadow-[0_0_10px_#6366f1]' : status === AnalysisStatus.COMPLETED ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : status === AnalysisStatus.FAILED ? 'bg-red-500' : 'bg-gray-600'}`} />
            <span className="text-xs font-black uppercase tracking-widest text-gray-400">Node Status: {status}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 border border-white/5 cursor-pointer">
            <UploadIcon className="h-3 w-3" />
            Import
            <input type="file" className="hidden" accept=".auditjson,.json" onChange={handleImportAudit} />
          </label>
          {result && (
            <button 
              onClick={handleCopyV4Scheme}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 border border-white/5"
            >
              <DownloadIcon className="h-3 w-3" />
              Export Archive
            </button>
          )}
          <button onClick={handleAnalyze} disabled={!image || status === AnalysisStatus.PENDING} className={`px-10 py-3 rounded-xl font-black uppercase text-sm tracking-[0.2em] transition-all flex items-center gap-3 shadow-xl ${!image || status === AnalysisStatus.PENDING ? 'bg-gray-800 text-gray-600' : 'bg-indigo-600 text-white hover:bg-indigo-500 active:scale-95'}`}>
            {status === AnalysisStatus.PENDING ? <LoaderIcon className="h-5 w-5 animate-spin" /> : <SparklesIcon className="h-5 w-5" />}
            {status === AnalysisStatus.PENDING ? 'Analyzing...' : 'Initiate Audit'}
          </button>
        </div>
      </div>

      {/* Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 flex flex-col gap-4">
          <Accordion id="input" title="Input Stream" icon={ImageIcon} openSections={openSections} toggleSection={toggleSection}>
            <div className={`h-64 border-2 border-dashed rounded-3xl flex items-center justify-center transition-all cursor-pointer relative overflow-hidden bg-gray-950/40 ${!image ? 'border-gray-800 hover:border-indigo-500/50' : 'border-indigo-500/30'}`} onClick={() => document.getElementById('va-upload')?.click()}>
              <input id="va-upload" type="file" className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
              {image ? (
                <>
                  <img src={image.url} className="w-full h-full object-contain p-2 relative z-10" alt="Source" />
                  {status === AnalysisStatus.PENDING && <div className="scanning-line z-20"></div>}
                  <div className="absolute inset-0 bg-black/20 z-0"></div>
                </>
              ) : (
                <div className="text-center opacity-30"><UploadIcon className="h-12 w-12 mx-auto mb-3 text-indigo-400" /><p className="text-xs font-black uppercase tracking-widest">Load Source Bitstream</p></div>
              )}
            </div>
          </Accordion>

          <div className="va-card rounded-2xl overflow-hidden border border-white/10 bg-black/60 p-4 h-48 overflow-y-auto custom-scrollbar font-mono text-[10px] text-emerald-500/80 space-y-1.5 shadow-inner">
            <p className="opacity-40 italic mb-2">// NODE LOG SESSION START</p>
            {logs.map((log, i) => <div key={i}>{log}</div>) || <div className="opacity-20 italic">Awaiting protocol...</div>}
            <div ref={logEndRef} />
          </div>
        </div>

        <div className="lg:col-span-8">
          <Accordion id="tuning" title="Neural Adjustments" icon={PaletteIcon} openSections={openSections} toggleSection={toggleSection}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-2">
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest px-1">Context Injection</label>
                  <textarea value={tuning.keywords} onChange={e => setTuning({...tuning, keywords: e.target.value})} placeholder="Keywords for injection..." className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm text-indigo-300 font-mono resize-none outline-none focus:border-indigo-500/50 h-32 shadow-inner" />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1 block">Weather Shade Injection</label>
                  <div className="flex flex-wrap gap-2 px-1">
                    {WEATHER_SHADES.map(s => (
                      <button 
                        key={s.name} 
                        onClick={() => setTuning({...tuning, adjustments: {...tuning.adjustments, weatherShade: s.color}})}
                        className={`w-8 h-8 rounded-full border-2 transition-all relative group ${tuning.adjustments.weatherShade === s.color ? 'border-white scale-110 shadow-[0_0_10px_rgba(255,255,255,0.4)]' : 'border-transparent opacity-50 hover:opacity-100'}`}
                        style={{ backgroundColor: s.color === 'transparent' ? 'transparent' : s.color }}
                        title={s.name}
                      >
                        {s.color === 'transparent' && <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_45%,red_45%,red_55%,transparent_55%)]"></div>}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <ComboboxField 
                  label="Style Bias" 
                  value={tuning.artisticStylePreference} 
                  options={tuning.customStyleList || []} 
                  onSelect={(opt: string) => setTuning({...tuning, artisticStylePreference: opt})}
                  onAdd={(v: string) => v && !(tuning.customStyleList || []).includes(v) && setTuning({...tuning, customStyleList: [...(tuning.customStyleList || []), v]})}
                  onRemove={(v: string) => setTuning({...tuning, customStyleList: (tuning.customStyleList || []).filter(s => s !== v)})}
                />
                <ComboboxField 
                  label="Atmosphere Seed" 
                  value={tuning.adjustments.atmosphere} 
                  options={tuning.customAtmosphereList || []} 
                  onSelect={(opt: string) => setTuning({...tuning, adjustments: {...tuning.adjustments, atmosphere: opt}})}
                  onAdd={(v: string) => v && !(tuning.customAtmosphereList || []).includes(v) && setTuning({...tuning, customAtmosphereList: [...(tuning.customAtmosphereList || []), v]})}
                  onRemove={(v: string) => setTuning({...tuning, customAtmosphereList: (tuning.customAtmosphereList || []).filter(s => s !== v)})}
                />
                <div className="space-y-5 pt-4 border-t border-white/5">
                   <ImpactGauge label="Lighting Intensity" value={tuning.adjustments.lightingIntensity} min={0} max={200} onChange={(v: number) => setTuning({...tuning, adjustments: {...tuning.adjustments, lightingIntensity: v}})} />
                   <ImpactGauge label="Pose Integrity" value={tuning.adjustments.poseRigidity} min={0} max={100} onChange={(v: number) => setTuning({...tuning, adjustments: {...tuning.adjustments, poseRigidity: v}})} />
                </div>
              </div>
            </div>
          </Accordion>
        </div>
      </div>

      {/* Expansive Results View (Width under 'Copy All') */}
      <div className="col-span-12">
        {!result ? (
          <div className="va-card min-h-[400px] flex flex-col items-center justify-center text-center p-20 opacity-10 grayscale border-dashed border-2 border-indigo-500/20 rounded-[3rem]">
            <TargetIcon className="h-32 w-32 mb-8 text-white animate-pulse" />
            <h3 className="text-4xl font-black uppercase tracking-[0.5em] text-white">Logic Idle</h3>
            <p className="text-sm font-black uppercase tracking-widest mt-6">Awaiting bitstream for forensic analysis</p>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-6">
            <div className="flex items-center justify-between p-4 bg-gray-900/40 rounded-[1.5rem] border border-white/10">
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleCopyAll}
                  className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg"
                >
                  {copiedId === 'copy-all' ? <CheckIcon className="h-4 w-4" /> : <DuplicateIcon className="h-4 w-4" />}
                  Copy Raw Technical Data
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleResetCanvas}
                  className="p-2 bg-white/5 hover:bg-red-600/20 text-gray-500 hover:text-red-500 rounded-lg transition-all border border-white/5"
                  title="Wipe Canvas"
                >
                  <RefreshIcon className="h-4 w-4" />
                </button>
              </div>
            </div>

            <Accordion id="results-foundation" title="Architectural Foundation" icon={BoxIcon} openSections={openSections} toggleSection={toggleSection} compact>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2 pb-6">
                <EditableField label="Composition Map" value={result.compositionDescriptor} onChange={(v: string) => handleResultChange('compositionDescriptor', v)} onCopy={() => copyField(result.compositionDescriptor, 'comp')} active={activeToggles.composition} onToggle={() => setActiveToggles(p => ({...p, composition: !p.composition}))} />
                <EditableField label="Artistic Logic" value={result.artisticStyle} onChange={(v: string) => handleResultChange('artisticStyle', v)} onCopy={() => copyField(result.artisticStyle, 'style')} active={activeToggles.style} onToggle={() => setActiveToggles(p => ({...p, style: !p.style}))} />
                <EditableField label="Lighting Protocol" value={result.lightingIllumination} onChange={(v: string) => handleResultChange('lightingIllumination', v)} onCopy={() => copyField(result.lightingIllumination, 'light')} active={activeToggles.lighting} onToggle={() => setActiveToggles(p => ({...p, lighting: !p.lighting}))} />
                <EditableField label="Execution Method" value={result.technique} onChange={(v: string) => handleResultChange('technique', v)} onCopy={() => copyField(result.technique, 'tech')} active={activeToggles.technique} onToggle={() => setActiveToggles(p => ({...p, technique: !p.technique}))} />
                <EditableField label="Color Calibration" value={result.colorGamma} onChange={(v: string) => handleResultChange('colorGamma', v)} onCopy={() => copyField(result.colorGamma, 'color')} active={activeToggles.colors} onToggle={() => setActiveToggles(p => ({...p, colors: !p.colors}))} />
                <div className="pt-3">
                  <span className="text-[11px] font-black text-indigo-500/60 uppercase tracking-[0.2em] px-1">Suggested Artists</span>
                  <div className="flex flex-wrap gap-2.5 mt-3">
                      {(result.suggestedArtists || []).map((a, i) => <span key={i} className="px-4 py-1.5 bg-indigo-900/30 text-indigo-400 text-xs font-black rounded-lg uppercase border border-indigo-500/20">{a}</span>)}
                  </div>
                </div>
              </div>
            </Accordion>
            
            <Accordion id="results-subject" title="Subject & Anatomy" icon={UserIcon} openSections={openSections} toggleSection={toggleSection} compact>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2 pb-6">
                  <EditableField label="Pose Detail" value={result.poseDescriptor} onChange={(v: string) => handleResultChange('poseDescriptor', v)} onCopy={() => copyField(result.poseDescriptor, 'pose')} active={activeToggles.pose} onToggle={() => setActiveToggles(p => ({...p, pose: !p.pose}))} />
                  <EditableField label="Kinetic State" value={result.actionPoseIdentifier} onChange={(v: string) => handleResultChange('actionPoseIdentifier', v)} onCopy={() => copyField(result.actionPoseIdentifier, 'kinetic')} active={activeToggles.kinetic} onToggle={() => setActiveToggles(p => ({...p, kinetic: !p.kinetic}))} />
                  <EditableField label="Attire Archetype" value={result.appearanceRegistry?.attire} onChange={(v: string) => handleResultChange('appearanceRegistry.attire', v)} onCopy={() => copyField(result.appearanceRegistry?.attire, 'attire')} active={activeToggles.attire} onToggle={() => setActiveToggles(p => ({...p, attire: !p.attire}))} />
                  <EditableField label="Grooming Specs" value={result.appearanceRegistry?.haircutStyle} onChange={(v: string) => handleResultChange('appearanceRegistry.haircutStyle', v)} onCopy={() => copyField(result.appearanceRegistry?.haircutStyle, 'hair')} active={activeToggles.hair} onToggle={() => setActiveToggles(p => ({...p, hair: !p.hair}))} />
                <div className="pt-3 md:col-span-2">
                  <span className="text-[11px] font-black text-indigo-500/60 uppercase tracking-[0.2em] px-1">Accessory Registry</span>
                  <div className="flex flex-wrap gap-2.5 mt-3">
                      {(result.appearanceRegistry?.accessories || []).map((acc, i) => <span key={i} className="px-4 py-1.5 bg-gray-800 text-gray-400 text-xs font-black rounded-lg uppercase border border-white/5">{acc}</span>)}
                  </div>
                </div>
              </div>
            </Accordion>
            
            <Accordion id="results-synthesis" title="Generation Blueprint" icon={SparklesIcon} openSections={openSections} toggleSection={toggleSection} compact>
              <div className="space-y-6 pb-6">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {Object.entries(result.modifierTuning || {}).map(([key, val]) => (
                    <div key={key} className="bg-black/40 p-4 rounded-xl border border-white/5 flex flex-col shadow-inner"><span className="text-[10px] font-black text-gray-600 uppercase truncate mb-1.5">{key.replace(/([A-Z])/g, ' $1')}</span><span className="text-xs text-indigo-400 font-bold truncate">{val as string}</span></div>
                  ))}
                </div>
                <div className={`relative group transition-opacity ${activeToggles.synthesis ? 'opacity-100' : 'opacity-40'}`}>
                  <div className="flex items-center gap-4 mb-4 px-1"><span className="text-xs font-black text-emerald-500/70 uppercase tracking-[0.3em]">Master Generation Prompt</span><LogicToggle active={activeToggles.synthesis} onChange={() => setActiveToggles(p => ({...p, synthesis: !p.synthesis}))} /></div>
                  <textarea disabled={!activeToggles.synthesis} value={result.tunedPromptPreview} onChange={(e) => handleResultChange('tunedPromptPreview', e.target.value)} className="w-full bg-indigo-600/5 border border-indigo-500/20 rounded-2xl p-8 text-sm text-white font-mono italic leading-relaxed outline-none focus:border-indigo-500 shadow-[inset_0_0_40px_rgba(99,102,241,0.1)] h-56 resize-none" />
                  <button onClick={() => copyField(result.tunedPromptPreview || '', 'prompt')} className="absolute bottom-6 right-6 p-5 bg-indigo-600 text-white rounded-2xl shadow-2xl opacity-0 group-hover:opacity-100 active:scale-95 transition-all hover:bg-indigo-500">
                    {copiedId === 'prompt' ? <CheckIcon className="h-6 w-6" /> : <CopyIcon className="h-6 w-6" />}
                  </button>
                </div>
              </div>
            </Accordion>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageAnalyzer;
