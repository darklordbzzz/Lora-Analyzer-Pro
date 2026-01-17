
import React, { useState } from 'react';
import { PlugIcon, CheckCircleIcon, LoaderIcon, BoxIcon, TrashIcon, XCircleIcon } from './Icons';
import { initializeIntegratedCore } from '../services/llmService';
import type { LLMModel } from '../types';

interface NeuralEngineSetupProps {
    onActivateEngine: (model: LLMModel) => void;
    allModels: LLMModel[];
    onDeleteModel: (id: string) => void;
}

const NeuralEngineSetup: React.FC<NeuralEngineSetupProps> = ({ 
    onActivateEngine, allModels, onDeleteModel 
}) => {
    const [bootStatus, setBootStatus] = useState<'idle' | 'booting' | 'ready' | 'error'>('idle');
    const [error, setError] = useState<string | null>(null);

    const handleBootFile = async (file: File) => {
        setBootStatus('booting');
        setError(null);
        
        try {
            const res = await initializeIntegratedCore(file);
            if (res.success) {
                setBootStatus('ready');
                const internalModel: LLMModel = {
                    id: `integrated-${crypto.randomUUID()}`,
                    name: `Node: ${file.name.toUpperCase().replace('.GGUF', '')}`,
                    provider: 'integrated-core', 
                    modelName: file.name, 
                    apiUrl: 'http://localhost:1234/v1' // Standard local bridge
                };
                onActivateEngine(internalModel);
            } else {
                setBootStatus('error');
            }
        } catch (e: any) {
            setBootStatus('error');
            setError(e.message);
        }
    };

    return (
        <div className="flex h-full w-full flex-col lg:flex-row overflow-hidden bg-[#111827]">
            <div className="flex-grow flex flex-col p-10 lg:p-16 overflow-y-auto">
                <div className="flex-grow flex items-center justify-center">
                    <div className="w-full max-w-4xl aspect-[2/1] border-2 border-dashed border-gray-800 rounded-[3rem] flex flex-col items-center justify-center bg-[#0B1120]/40 shadow-2xl relative">
                        {bootStatus === 'booting' ? (
                            <div className="text-center space-y-6">
                                <LoaderIcon className="h-16 w-16 text-indigo-500 animate-spin mx-auto" />
                                <p className="text-xs font-black text-indigo-400 uppercase tracking-widest">Initializing Neural Core...</p>
                            </div>
                        ) : bootStatus === 'ready' ? (
                            <div className="text-center space-y-8">
                                <CheckCircleIcon className="h-16 w-16 text-emerald-500 mx-auto" />
                                <h3 className="text-3xl font-black text-white uppercase">Kernel Active</h3>
                                <button onClick={() => setBootStatus('idle')} className="px-10 py-4 bg-gray-800 rounded-2xl text-xs font-black uppercase text-white">Mount Another</button>
                            </div>
                        ) : (
                            <div className="text-center space-y-8 p-12">
                                <PlugIcon className="h-16 w-16 text-gray-700 mx-auto" />
                                <h3 className="text-2xl font-black text-white uppercase">Cognitive Node Intake</h3>
                                <p className="text-xs text-gray-500 uppercase tracking-widest max-w-sm mx-auto">Drop GGUF binaries here to register local high-fidelity nodes.</p>
                                <button onClick={() => document.getElementById('engine-boot-sub')?.click()} className="px-12 py-5 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase rounded-2xl shadow-xl transition-all">Direct Resource Scan</button>
                                <input id="engine-boot-sub" type="file" className="hidden" accept=".gguf,.bin" onChange={(e) => e.target.files?.[0] && handleBootFile(e.target.files[0])} />
                            </div>
                        )}
                        {error && <div className="absolute bottom-8 flex items-center gap-2 text-red-500 font-bold uppercase text-[10px]"><XCircleIcon className="h-4 w-4" /> {error}</div>}
                    </div>
                </div>
            </div>

            <div className="w-full lg:w-[400px] bg-[#0B0F1A]/50 border-l border-gray-800 p-12 flex flex-col">
                <h3 className="text-sm font-black text-white uppercase tracking-widest mb-8 flex items-center gap-2"><BoxIcon className="h-5 w-5 text-indigo-400" /> Active Registry</h3>
                <div className="flex-grow space-y-3 overflow-y-auto custom-scrollbar">
                    {allModels.filter(m => m.provider === 'integrated-core').map(m => (
                        <div key={m.id} className="p-5 bg-gray-800/40 border border-gray-700 rounded-2xl flex items-center justify-between group">
                            <div className="min-w-0">
                                <span className="text-xs font-bold text-white block truncate uppercase">{m.name}</span>
                                <span className="text-[10px] text-gray-500 font-mono block truncate uppercase mt-1 opacity-50">{m.modelName}</span>
                            </div>
                            <button onClick={() => onDeleteModel(m.id)} className="p-2 text-gray-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"><TrashIcon className="h-5 w-5" /></button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default NeuralEngineSetup;
