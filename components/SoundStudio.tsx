
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { SoundStudioState, AudioEngineNode, AudioGeneration } from '../types';
import { 
    BoxIcon, AudioIcon, LoaderIcon, RefreshIcon, CheckCircleIcon, 
    CopyIcon, TrashIcon, CloudIcon, UserIcon, SendIcon, 
    InfoIcon, RobotIcon, DownloadIcon, SparklesIcon, LabIcon, ChevronDownIcon, PlugIcon, GlobeIcon, SettingsIcon, FolderIcon, FileIcon, SearchIcon, XIcon, XCircleIcon
} from './Icons';
import { composeMusicComposition, generateVocalPreview, reformatLyricsWithAI, generateAudioAgnostic } from '../services/llmService';

interface SoundStudioProps {
    initialState: SoundStudioState | null;
}

const GENRES = ["Synthwave", "EDM", "Techno", "Cinematic", "Lofi", "Phonk", "Hardstyle", "Pop", "Rock", "Metal", "Jazz", "Ambient", "Classical", "Hip Hop", "R&B"];
const KEYS = ["C Major", "G Major", "D Major", "A Major", "E Major", "B Major", "F# Major", "F Major", "A Minor", "E Minor", "B Minor", "D Minor"];
const VOCAL_STYLES = ["Natural", "Gritty", "Ethereal", "Aggressive", "Whispering", "Auto-tuned", "Spoken Word"];

const BUILTIN_AUDIO_ENGINES = [
    { id: 'stabilityai/stable-audio-open-1.0', name: 'Stable Audio Open 1.0', tag: 'Stability AI', category: 'Synthesis' },
    { id: 'facebook/musicgen-large', name: 'Meta MusicGen Large', tag: 'Meta AI', category: 'Synthesis' },
    { id: 'facebook/audiogen-medium', name: 'Meta AudioGen', tag: 'FX Synthesis', category: 'Synthesis' },
    { id: 'nvidia/music-flamingo', name: 'Music Flamingo (MF)', tag: 'Nvidia Research', category: 'Trending', experimental: true },
    { id: 'cvssp/audioldm2-music', name: 'AudioLDM 2 Music', tag: 'CVSSP', category: 'Synthesis' },
    { id: 'suno-v3-bridge', name: 'Suno v3 Bridge', tag: 'Suno API', category: 'Trending', experimental: true },
    { id: 'suno/bark', name: 'Bark Synthesis', tag: 'Suno / AudioBox', category: 'Speech' },
    { id: 'AIspeech/vits', name: 'VITS Neural TTS', tag: 'Multi-speaker', category: 'Speech' },
    { id: 'elevenlabs/audio-native', name: 'ElevenLabs Bridge', tag: 'External API', category: 'Speech', experimental: true }
];

type SynthesisStage = 'idle' | 'initializing' | 'mapping' | 'synthesis' | 'finalizing' | 'success' | 'error' | 'aborted';

const SoundStudio: React.FC<SoundStudioProps> = ({ initialState }) => {
    const [state, setState] = useState<SoundStudioState>(initialState || {
        title: 'New Track',
        artist: 'Various Artists',
        album: 'Studio Session',
        genre: 'Synthwave',
        bpm: 120,
        key: 'C Major',
        mood: 'Energetic',
        instrumentation: ['Synthesizer', 'Drum Machine'],
        lyrics: '',
        description: '',
        isInstrumental: true,
        vocalStyle: 'Natural',
        audioEngineId: 'stabilityai/stable-audio-open-1.0',
        generations: []
    });

    const [isGenerating, setIsGenerating] = useState(false);
    const [isVocalizing, setIsVocalizing] = useState(false);
    const [isCloudProducing, setIsCloudProducing] = useState(false);
    const [isEngineMenuOpen, setIsEngineMenuOpen] = useState(false);
    const [isExplorerOpen, setIsExplorerOpen] = useState(false);
    
    const [synthesisStage, setSynthesisStage] = useState<SynthesisStage>('idle');
    const [synthesisProgress, setSynthesisProgress] = useState(0);
    const [synthesisError, setSynthesisError] = useState<string | null>(null);
    
    const [blueprint, setBlueprint] = useState<string | null>(null);
    const [sunoPrompt, setSunoPrompt] = useState<string | null>(null);
    const [audioPreview, setAudioPreview] = useState<string | null>(null);
    const [cloudAudioUrl, setCloudAudioUrl] = useState<string | null>(null);

    const abortControllerRef = useRef<AbortController | null>(null);
    const isFirstMount = useRef(true);

    const customNodes = useMemo(() => {
        const stored = localStorage.getItem('lora-analyzer-pro-audio-nodes');
        return stored ? JSON.parse(stored) as AudioEngineNode[] : [];
    }, []);

    const allEngines = useMemo(() => [
        ...BUILTIN_AUDIO_ENGINES,
        ...customNodes.map(n => ({ id: n.modelName, name: n.name, tag: 'Custom Node', category: n.type === 'speech' ? 'Speech' : 'Synthesis', experimental: true }))
    ], [customNodes]);

    const activeEngine = allEngines.find(e => e.id === state.audioEngineId) || allEngines[0];

    const handleGenerateComposition = async () => {
        setIsGenerating(true);
        try {
            const { blueprint, sunoPrompt } = await composeMusicComposition(state);
            setBlueprint(blueprint);
            setSunoPrompt(sunoPrompt);
            setSynthesisStage('idle');
            setSynthesisProgress(0);
        } catch (e) { console.error(e); } finally { setIsGenerating(false); }
    };

    useEffect(() => {
        if (isFirstMount.current) {
            isFirstMount.current = false;
            return;
        }

        const handleEngineSwitch = async () => {
            if (isCloudProducing && synthesisProgress < 90) {
                if (abortControllerRef.current) {
                    abortControllerRef.current.abort();
                    setSynthesisStage('aborted');
                    await new Promise(r => setTimeout(r, 400));
                }
            }

            setSunoPrompt(null);
            setBlueprint(null);
            setCloudAudioUrl(null);
            setSynthesisProgress(0);
            
            handleGenerateComposition();
        };

        handleEngineSwitch();
    }, [state.audioEngineId]);

    const handleProduceCloudTrack = async () => {
        if (!sunoPrompt) return;
        
        if (abortControllerRef.current) abortControllerRef.current.abort();
        abortControllerRef.current = new AbortController();

        setIsCloudProducing(true);
        setSynthesisStage('initializing');
        setSynthesisProgress(5);
        setSynthesisError(null);

        const progressInterval = setInterval(() => {
            setSynthesisProgress(prev => {
                if (prev < 20) return prev + 1;
                if (prev < 45) return prev + 0.5;
                if (prev < 85) return prev + 0.2;
                if (prev < 95) return prev + 0.1;
                return prev;
            });
        }, 200);

        try {
            const url = await generateAudioAgnostic(
                sunoPrompt, 
                state.audioEngineId || 'stabilityai/stable-audio-open-1.0',
                abortControllerRef.current.signal
            );
            
            clearInterval(progressInterval);
            setSynthesisProgress(100);
            setSynthesisStage('success');
            setCloudAudioUrl(url);
            
            const newGen: AudioGeneration = {
                id: crypto.randomUUID(),
                title: `${state.title} (${activeEngine.name})`,
                url: url,
                engine: activeEngine.name,
                timestamp: Date.now(),
                prompt: sunoPrompt
            };
            setState(prev => ({ ...prev, generations: [newGen, ...(prev.generations || [])] }));
            
            setTimeout(() => {
                setSynthesisStage('idle');
            }, 5000);

        } catch (e: any) { 
            clearInterval(progressInterval);
            if (e.name === 'AbortError') {
                setSynthesisStage('idle');
            } else {
                setSynthesisStage('error');
                setSynthesisError(e.message);
            }
        } finally { 
            setIsCloudProducing(false); 
            abortControllerRef.current = null;
        }
    };

    const getStageLabel = () => {
        switch (synthesisStage) {
            case 'aborted': return 'Process Terminated';
            case 'initializing': return 'Pipeline Intake...';
            case 'mapping': return 'Neural Mapping...';
            case 'synthesis': return 'Diffusing Bitstream...';
            case 'finalizing': return 'Summing Signals...';
            case 'success': return '100% Logic Synced';
            case 'error': return 'Terminal Error';
            default: return 'Execute Synthesis';
        }
    };

    return (
        <div className="max-w-7xl mx-auto flex flex-col gap-6 h-[calc(100vh-140px)] animate-in fade-in duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-grow overflow-hidden">
                {/* MIXER CONTROLS */}
                <div className="lg:col-span-4 xl:col-span-3 flex flex-col gap-4 overflow-y-auto custom-scrollbar p-1">
                    
                    <div className="bg-[#151B2B] border border-gray-800 rounded-2xl p-5 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">Acoustic Engine</span>
                            <button onClick={() => setIsExplorerOpen(true)} className="p-2 bg-indigo-600/10 text-indigo-400 rounded-lg hover:bg-indigo-600 hover:text-white transition-all shadow-lg flex items-center gap-2" title="Project Explorer">
                                <FolderIcon className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="relative">
                            <button 
                                onClick={() => setIsEngineMenuOpen(!isEngineMenuOpen)}
                                className={`w-full px-4 py-3.5 bg-gray-950 border rounded-xl flex items-center justify-between group hover:border-indigo-500/30 transition-all shadow-inner ${activeEngine.experimental ? 'border-orange-500/30' : 'border-gray-800'}`}
                            >
                                <div className="text-left min-w-0">
                                    <div className="flex items-center gap-2">
                                        <div className="text-[11px] font-black uppercase text-white truncate tracking-tight">{activeEngine.name}</div>
                                        {activeEngine.experimental && (
                                            <span className="text-[7px] font-black text-orange-500 bg-orange-500/10 px-1 py-0.5 rounded border border-orange-500/20 uppercase tracking-tighter">BETA</span>
                                        )}
                                    </div>
                                    <div className="text-[8px] text-gray-500 font-bold uppercase truncate tracking-tighter mt-1">{activeEngine.tag} • {activeEngine.category}</div>
                                </div>
                                <ChevronDownIcon className={`h-4 w-4 text-gray-500 transition-transform ${isEngineMenuOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isEngineMenuOpen && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border border-gray-700 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.8)] z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar p-2 space-y-1">
                                        {allEngines.map(e => (
                                            <button 
                                                key={e.id} 
                                                onClick={() => { setState({...state, audioEngineId: e.id}); setIsEngineMenuOpen(false); }}
                                                className={`w-full px-4 py-3 rounded-xl flex items-center justify-between transition-all text-left ${state.audioEngineId === e.id ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-gray-800 text-gray-400'}`}
                                            >
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="text-[10px] font-black uppercase tracking-tight">{e.name}</div>
                                                        {e.experimental && <span className="text-[6px] font-black text-orange-400 bg-black/40 px-1 rounded">PROTOTYPE</span>}
                                                    </div>
                                                    <div className={`text-[8px] font-bold uppercase ${state.audioEngineId === e.id ? 'text-indigo-200' : 'opacity-40'}`}>{e.tag}</div>
                                                </div>
                                                {state.audioEngineId === e.id && <CheckCircleIcon className="h-4 w-4 text-white" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-5 shadow-xl space-y-6">
                        <div className="flex items-center gap-2 text-indigo-300 mb-2">
                            <BoxIcon className="h-5 w-5" />
                            <h2 className="font-bold text-lg">Inference Mixer</h2>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1">Track Title</label>
                                <input type="text" value={state.title} onChange={e => setState({ ...state, title: e.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1">BPM</label>
                                    <input type="number" value={state.bpm} onChange={e => setState({ ...state, bpm: parseInt(e.target.value) })} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1">Scale</label>
                                    <select value={state.key} onChange={e => setState({ ...state, key: e.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none">
                                        {KEYS.map(k => <option key={k} value={k}>{k}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-xl border border-gray-700">
                                <span className="text-xs font-semibold">Instrumental</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" checked={state.isInstrumental} onChange={e => setState({ ...state, isInstrumental: e.target.checked })} />
                                    <div className="w-10 h-5 bg-gray-700 rounded-full peer peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"></div>
                                </label>
                            </div>
                        </div>
                        <div className="pt-4 border-t border-gray-700 space-y-3">
                            <button onClick={handleGenerateComposition} disabled={isGenerating} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50">
                                {isGenerating ? <LoaderIcon className="h-4 w-4 animate-spin" /> : <SparklesIcon className="h-4 w-4" />}
                                Analyze Production Blueprint
                            </button>
                        </div>
                    </div>
                </div>

                {/* STUDIO VIEWPORT */}
                <div className="lg:col-span-8 xl:col-span-9 flex flex-col gap-6 overflow-hidden h-full">
                    <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl overflow-hidden flex flex-col h-[35%] shadow-xl backdrop-blur-sm">
                        <div className="px-5 py-3 border-b border-gray-700 bg-gray-800/80 flex justify-between items-center">
                            <h3 className="text-xs font-black text-green-400 uppercase tracking-widest flex items-center gap-2">
                                <AudioIcon className="h-4 w-4" /> Global Style Tags & Libretto
                            </h3>
                            <button onClick={() => setState(prev => ({ ...prev, lyrics: '' }))} className="text-[10px] font-black text-red-400 hover:text-red-300 flex items-center gap-1.5 uppercase transition-colors">
                                <TrashIcon className="h-3 w-3" /> Clear
                            </button>
                        </div>
                        <textarea value={state.lyrics} onChange={e => setState({ ...state, lyrics: e.target.value })} placeholder="Inject lyrics or descriptive style tags..." className="flex-grow bg-gray-950/50 p-6 text-sm text-gray-300 font-mono focus:outline-none resize-none selection:bg-indigo-500/30 custom-scrollbar leading-relaxed" />
                    </div>

                    <div className="flex-grow overflow-y-auto custom-scrollbar space-y-6 pb-12 pr-1">
                        {cloudAudioUrl && (
                            <div className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border border-indigo-500/40 p-8 rounded-3xl flex flex-col gap-6 animate-in zoom-in-95 duration-500 shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10"><SparklesIcon className="h-32 w-32 text-white" /></div>
                                <div className="flex items-center gap-6">
                                    <div className="w-24 h-24 bg-indigo-600 rounded-[2rem] flex items-center justify-center shadow-2xl border border-indigo-400/50"><AudioIcon className="h-12 w-12 text-white" /></div>
                                    <div className="flex-grow min-w-0">
                                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                                            <span className="px-2 py-0.5 bg-green-500 text-black text-[9px] font-black uppercase rounded tracking-widest shrink-0">MASTER READY</span>
                                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter truncate">{state.title}</h3>
                                        </div>
                                        <p className="text-xs font-black text-indigo-300 uppercase tracking-widest opacity-80">{activeEngine.name} Output</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => setIsExplorerOpen(true)} className="p-4 bg-gray-800 text-indigo-400 rounded-3xl hover:bg-gray-700 transition-all shadow-xl" title="Find in Explorer">
                                            <FolderIcon className="h-8 w-8" />
                                        </button>
                                        <button onClick={() => { const a = document.createElement('a'); a.href = cloudAudioUrl; a.download = `${state.title.replace(/\s+/g, '_')}_Synthesized.wav`; a.click(); }} className="p-6 bg-white text-indigo-600 rounded-3xl hover:bg-indigo-50 transition-all shadow-xl active:scale-95 group shrink-0">
                                            <DownloadIcon className="h-8 w-8 group-hover:scale-110 transition-transform" />
                                        </button>
                                    </div>
                                </div>
                                <div className="bg-black/40 p-4 rounded-2xl border border-white/5"><audio src={cloudAudioUrl} controls className="w-full h-10 custom-audio-player" /></div>
                            </div>
                        )}
                        
                        {sunoPrompt && (
                            <div className={`bg-[#1F2937]/30 border rounded-2xl overflow-hidden animate-in fade-in shadow-xl group transition-all duration-700 ${synthesisStage === 'success' ? 'border-green-500/50 bg-green-950/10' : synthesisStage === 'error' ? 'border-red-500/50 bg-red-950/10' : synthesisStage === 'aborted' ? 'border-orange-500/30 bg-orange-950/10' : 'border-indigo-500/20'}`}>
                                <div className="px-5 py-4 bg-gray-900/40 border-b border-gray-800 flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2.5 h-2.5 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)] ${synthesisStage === 'success' ? 'bg-green-500 shadow-green-500' : synthesisStage === 'error' ? 'bg-red-500 shadow-red-500' : synthesisStage === 'aborted' ? 'bg-orange-500 animate-pulse' : isCloudProducing ? 'bg-indigo-500 animate-pulse' : 'bg-gray-700'}`} />
                                        <div className="flex flex-col">
                                            <h3 className="text-xs font-black text-indigo-300 uppercase tracking-[0.2em]">Synthesis Vector</h3>
                                            {isCloudProducing && (
                                                <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest mt-1 animate-pulse">Processing Block {Math.round(synthesisProgress)}%</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        {synthesisStage === 'success' ? (
                                            <div className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white text-[10px] font-black uppercase rounded-lg shadow-lg animate-in zoom-in">
                                                <CheckCircleIcon className="h-4 w-4" /> 100% Synced
                                            </div>
                                        ) : synthesisStage === 'error' ? (
                                            <button onClick={handleProduceCloudTrack} className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white text-[10px] font-black uppercase rounded-lg shadow-lg">
                                                <RefreshIcon className="h-4 w-4" /> Retry Link
                                            </button>
                                        ) : (
                                            <button onClick={handleProduceCloudTrack} disabled={isCloudProducing || isGenerating} className={`flex items-center gap-3 px-8 py-2.5 rounded-xl transition-all shadow-2xl disabled:opacity-50 active:scale-95 relative overflow-hidden min-w-[200px] justify-center ${activeEngine.category === 'Speech' ? 'bg-orange-600 hover:bg-orange-500' : 'bg-indigo-600 hover:bg-indigo-500'} text-white text-[10px] font-black uppercase tracking-[0.2em]`}>
                                                {isCloudProducing && (
                                                    <div className="absolute inset-0 bg-white/10" style={{ width: `${synthesisProgress}%`, transition: 'width 0.3s ease' }} />
                                                )}
                                                <span className="relative z-10 flex items-center gap-2">
                                                    {isCloudProducing ? <LoaderIcon className="h-4 w-4 animate-spin" /> : <RefreshIcon className="h-4 w-4" />}
                                                    {getStageLabel()}
                                                </span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="p-6 text-[11px] font-mono text-gray-400 bg-gray-950/80 leading-relaxed italic group-hover:text-gray-200 transition-colors">
                                    {synthesisError ? (
                                        <div className="flex items-start gap-3 text-red-400">
                                            <XCircleIcon className="h-4 w-4 mt-0.5 shrink-0" />
                                            <span>{synthesisError}</span>
                                        </div>
                                    ) : (
                                        `"${sunoPrompt}"`
                                    )}
                                </div>
                                {isCloudProducing && (
                                    <div className="h-1 bg-gray-800 w-full overflow-hidden">
                                        <div 
                                            className={`h-full transition-all duration-300 ${synthesisStage === 'aborted' ? 'bg-orange-500' : 'bg-gradient-to-r from-indigo-600 to-indigo-400'}`}
                                            style={{ width: `${synthesisProgress}%` }}
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* PROJECT EXPLORER MODAL */}
            {isExplorerOpen && (
                <div className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center p-8 backdrop-blur-2xl animate-in fade-in duration-300">
                    <div className="bg-[#111827] border border-gray-800 rounded-[3rem] shadow-[0_0_100px_rgba(0,0,0,1)] w-full max-w-5xl h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-500">
                        <div className="p-10 border-b border-gray-800 bg-[#151B2B] flex justify-between items-center">
                            <div className="flex items-center gap-6">
                                <div className="p-5 bg-indigo-600/20 rounded-[1.5rem] border border-indigo-500/20 text-indigo-400 shadow-inner">
                                    <FolderIcon className="h-10 w-10" />
                                </div>
                                <div>
                                    <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Project Explorer</h2>
                                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-2">Active Generation Buffer • Session Persistent</p>
                                </div>
                            </div>
                            <button onClick={() => setIsExplorerOpen(false)} className="p-4 bg-gray-800 text-gray-400 hover:text-white rounded-full transition-all hover:rotate-90">
                                <XIcon className="h-8 w-8" />
                            </button>
                        </div>

                        <div className="flex-grow overflow-y-auto custom-scrollbar p-10 space-y-6">
                            {(state.generations || []).length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center opacity-10 grayscale py-40">
                                    <BoxIcon className="h-40 w-40 mb-8" />
                                    <h3 className="text-4xl font-black uppercase tracking-[0.4em]">Explorer Empty</h3>
                                    <p className="text-sm font-black uppercase tracking-[0.2em] mt-4">Generate assets to populate the Project Buffer</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {(state.generations || []).map(gen => (
                                        <div key={gen.id} className="bg-gray-800/40 border border-gray-700/50 p-6 rounded-3xl group hover:border-indigo-500/30 transition-all flex flex-col gap-4 shadow-xl">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-4 min-w-0">
                                                    <div className="p-3 bg-gray-900 rounded-2xl border border-gray-700 text-indigo-500 shadow-inner group-hover:scale-110 transition-transform">
                                                        <FileIcon className="h-6 w-6" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h4 className="text-sm font-black text-white uppercase truncate tracking-tight">{gen.title}</h4>
                                                        <p className="text-[10px] text-gray-500 font-mono mt-1">{gen.engine} • {new Date(gen.timestamp).toLocaleTimeString()}</p>
                                                    </div>
                                                </div>
                                                <button onClick={() => {
                                                    const a = document.createElement('a'); a.href = gen.url; a.download = `${gen.title}.wav`; a.click();
                                                }} className="p-3 bg-indigo-600 text-white rounded-xl shadow-lg hover:scale-110 active:scale-95 transition-all">
                                                    <DownloadIcon className="h-4 w-4" />
                                                </button>
                                            </div>
                                            <div className="bg-black/40 p-3 rounded-2xl border border-white/5">
                                                <audio src={gen.url} controls className="w-full h-8 custom-audio-player opacity-60 hover:opacity-100 transition-opacity" />
                                            </div>
                                            <div className="bg-gray-900/60 p-3 rounded-xl border border-gray-800/50">
                                                <p className="text-[9px] text-gray-500 font-mono italic truncate">"{gen.prompt}"</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-8 bg-gray-900 border-t border-gray-800 flex justify-between items-center px-12">
                             <div className="flex items-center gap-3">
                                <InfoIcon className="h-5 w-5 text-indigo-500" />
                                <span className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em]">Path: Virtual:/generations/session_delta/ (UNDER DEVELOPMENT)</span>
                             </div>
                             <button onClick={() => window.open('https://huggingface.co/', '_blank')} className="px-10 py-4 bg-gray-800 hover:bg-gray-700 text-white font-black uppercase tracking-widest text-[11px] rounded-[1.5rem] transition-all border border-gray-700 shadow-2xl flex items-center gap-3">
                                <GlobeIcon className="h-4 w-4" /> Open HF Registry
                             </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SoundStudio;
