
import React, { useState } from 'react';
import { SoundStudioState, LLMModel, AnalyzerTuningConfig } from '../types';
import { 
    BoxIcon, AudioIcon, LoaderIcon, RobotIcon, SparklesIcon, ChevronDownIcon 
} from './Icons';
import { composeMusicComposition } from '../services/llmService';
import * as vlm from '../services/vlmService';

// Added AnalyzerTuningConfig to props to fix assignability errors in App.tsx
interface SoundStudioProps {
    initialState: SoundStudioState | null;
    activeModel?: LLMModel;
    tuning: AnalyzerTuningConfig;
}

const GENRES = ["Synthwave", "EDM", "Techno", "Cinematic", "Lofi", "Phonk", "Pop", "Rock", "Hip Hop"];

const SoundStudio: React.FC<SoundStudioProps> = ({ initialState, activeModel, tuning }) => {
    // Removed 'album' property to match SoundStudioState interface and fix type error
    const [state, setState] = useState<SoundStudioState>(initialState || {
        title: 'New Track',
        artist: 'Various Artists',
        genre: 'Synthwave',
        bpm: 120,
        key: 'C Major',
        mood: 'Energetic',
        instrumentation: ['Synthesizer'],
        lyrics: '',
        description: '',
        isInstrumental: true,
        vocalStyle: 'Natural'
    });

    const [isGenerating, setIsGenerating] = useState(false);
    const [isVocalizing, setIsVocalizing] = useState(false);

    const handleGenerateComposition = async () => {
        setIsGenerating(true);
        try {
            const { blueprint } = await composeMusicComposition(state, activeModel);
            setState(prev => ({ ...prev, description: blueprint }));
        } catch (e) { console.error(e); } finally { setIsGenerating(false); }
    };

    const handleGenerateVocalPreview = async () => {
        if (!state.lyrics || !activeModel) return alert("Enter lyrics and select a model.");
        setIsVocalizing(true);
        try {
            const base64 = await vlm.generateTTS(state.lyrics, activeModel);
            if (base64) {
                const audio = new Audio(`data:audio/mp3;base64,${base64}`);
                audio.play();
            }
        } catch (e) { console.error(e); } finally { setIsVocalizing(false); }
    };

    return (
        <div className="max-w-7xl mx-auto flex flex-col gap-6 h-[calc(100vh-140px)] animate-in fade-in duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-grow overflow-hidden">
                <div className="lg:col-span-4 xl:col-span-3 flex flex-col gap-4 overflow-y-auto custom-scrollbar p-1">
                    <div className="bg-[#151B2B] border border-gray-800 rounded-2xl p-5 shadow-2xl space-y-6">
                        <div className="flex items-center gap-2 text-indigo-300 mb-2">
                            <BoxIcon className="h-5 w-5" />
                            <h2 className="font-bold text-lg">Studio Mixer</h2>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1">Track Title</label>
                                <input type="text" value={state.title} onChange={e => setState({ ...state, title: e.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1">Genre</label>
                                <select value={state.genre} onChange={e => setState({ ...state, genre: e.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
                                    {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                                </select>
                            </div>
                        </div>
                        <button onClick={handleGenerateComposition} disabled={isGenerating} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all">
                            {isGenerating ? <LoaderIcon className="h-4 w-4 animate-spin" /> : <SparklesIcon className="h-4 w-4" />}
                            Execute Blueprint
                        </button>
                    </div>
                </div>

                <div className="lg:col-span-8 xl:col-span-9 flex flex-col gap-6 overflow-hidden h-full">
                    <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl overflow-hidden flex flex-col h-[40%] shadow-xl">
                        <div className="px-5 py-3 border-b border-gray-700 bg-gray-800/80 flex justify-between items-center">
                            <h3 className="text-xs font-black text-green-400 uppercase tracking-widest flex items-center gap-2">
                                <AudioIcon className="h-4 w-4" /> Lyric Sheet
                            </h3>
                            <button onClick={handleGenerateVocalPreview} disabled={isVocalizing} className="text-[10px] font-black text-indigo-400 hover:text-white flex items-center gap-2 uppercase transition-all">
                                {isVocalizing ? <LoaderIcon className="h-3 w-3 animate-spin" /> : <RobotIcon className="h-3 w-3" />}
                                Studio Vocalist
                            </button>
                        </div>
                        <textarea value={state.lyrics} onChange={e => setState({ ...state, lyrics: e.target.value })} placeholder="Enter lyrics for vocalization..." className="flex-grow bg-gray-950/50 p-6 text-sm text-gray-300 font-mono focus:outline-none resize-none" />
                    </div>

                    <div className="bg-gray-900/40 border border-gray-700/50 rounded-3xl p-8 flex-grow overflow-y-auto custom-scrollbar">
                         <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] mb-4">Neural Arrangement Guide</h4>
                         <div className="prose prose-invert prose-indigo max-w-none text-sm leading-relaxed whitespace-pre-wrap">
                            {state.description || "Synthesize a blueprint to generate technical arrangement guides."}
                         </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SoundStudio;
