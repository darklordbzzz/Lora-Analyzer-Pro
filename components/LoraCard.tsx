
import React, { useState } from 'react';
import type { LoraAnalysis, LLMModel } from '../types';
import { AnalysisStatus } from '../types';
import { 
    LoaderIcon, CheckCircleIcon, ChevronDownIcon, 
    TrashIcon, BoxIcon, PlugIcon, TriggerWordsIcon, TrainingIcon, RequirementsIcon, TagsIcon, CopyIcon
} from './Icons';
import { initializeIntegratedCore } from '../services/llmService';

interface LoraCardProps {
  result: LoraAnalysis;
  onDelete?: () => void;
  onRetry?: () => void;
  canRetry?: boolean;
  activeModel?: LLMModel;
}

const DetailSection: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; isOpen: boolean; onToggle: () => void; count?: number }> = ({ title, icon, children, isOpen, onToggle, count }) => (
    <div className="border-t border-gray-700/50">
        <button onClick={onToggle} className="w-full flex justify-between items-center py-3 px-4 text-left hover:bg-gray-700/30 transition-colors">
            <div className="flex items-center gap-3">
                <div className="text-gray-500">{icon}</div>
                <span className="font-black uppercase text-[10px] tracking-widest text-gray-400">{title}</span>
            </div>
            <div className="flex items-center gap-2">
                {count !== undefined && <span className="text-[9px] font-black text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">{count}</span>}
                <ChevronDownIcon className={`h-4 w-4 text-gray-600 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
        </button>
        {isOpen && <div className="px-4 pb-4 text-xs text-gray-300 animate-in slide-in-from-top-1 duration-200">{children}</div>}
    </div>
);

const LoraCard: React.FC<LoraCardProps> = ({ result, onDelete }) => {
    const [openSection, setOpenSection] = useState<string | null>(null);
    const [isIntegrating, setIsIntegrating] = useState(false);
    const [intStatus, setIntStatus] = useState<'idle' | 'success' | 'error'>('idle');

    const renderValue = (val: any) => {
        if (val === null || val === undefined || val === '') return <span className="opacity-20 italic">N/A</span>;
        return String(val);
    };

    const toggleSection = (section: string) => setOpenSection(prev => (prev === section ? null : section));

    const handleIntegrate = async () => {
        setIsIntegrating(true);
        setIntStatus('idle');
        try {
            const mockFile = new File([""], result.fileName, { type: "application/octet-stream" });
            const res = await initializeIntegratedCore(mockFile);
            if (res.success) {
                setIntStatus('success');
                const modelName = String(result.fileName).split(/[\\/]/).pop() || 'local-node';
                const model: LLMModel = {
                    id: 'mounted-gguf-node',
                    name: `Node: ${modelName.toUpperCase()}`,
                    provider: 'custom-api',
                    modelName: modelName,
                    apiUrl: 'integrated://core'
                };
                // Global hook provided by App.tsx
                if ((window as any).onViewChange) {
                    (window as any).onViewChange('chat', { activateModel: model });
                }
            } else { setIntStatus('error'); }
        } catch (e) { setIntStatus('error'); }
        finally { setIsIntegrating(false); setTimeout(() => setIntStatus('idle'), 3000); }
    };

    const isGGUF = String(result.fileName || '').toLowerCase().endsWith('.gguf');
    const isPending = result.status === AnalysisStatus.PENDING;

    return (
        <div className="bg-gray-800/40 backdrop-blur-sm rounded-3xl border border-gray-700/50 overflow-hidden flex flex-col transition-all hover:shadow-2xl hover:border-indigo-500/40 group h-full">
            <div className="h-48 bg-gray-950 flex items-center justify-center relative overflow-hidden">
                {result.previewImageUrl ? (
                    <img src={result.previewImageUrl} alt={result.fileName} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-700" />
                ) : (
                    <BoxIcon className={`h-16 w-16 ${isPending ? 'text-indigo-500 animate-pulse' : 'text-gray-800'}`} />
                )}
                
                {isPending && (
                    <div className="absolute inset-0 bg-gray-950/60 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
                        <LoaderIcon className="h-10 w-10 text-indigo-400 animate-spin" />
                        <span className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.4em]">Scanning Sector</span>
                    </div>
                )}

                <div className="absolute top-4 right-4">
                    <span className="text-[9px] font-black text-indigo-400 uppercase bg-gray-950/90 px-2.5 py-1.5 rounded-lg border border-indigo-500/30 backdrop-blur-md">
                        {String(result.fileName).split('.').pop() || 'NODE'}
                    </span>
                </div>
            </div>

            <div className="p-5 bg-gray-950/60 border-b border-gray-700/50">
                <p className="text-[13px] font-black text-white truncate uppercase tracking-tight" title={result.fileName}>{String(result.fileName).split(/[\\/]/).pop()}</p>
                <p className="text-[9px] text-gray-500 uppercase font-black tracking-[0.2em] mt-1">{result.fileSizeMB} MB NEURAL ASSET</p>
            </div>

            <div className="flex-grow">
                {!isPending && (
                    <div className="animate-in fade-in duration-500">
                        <div className="p-5 border-b border-gray-700/50 flex justify-between items-center">
                            <div>
                                <h3 className="font-black text-[11px] text-white uppercase tracking-widest">{renderValue(result.modelType)}</h3>
                                <p className="text-[9px] text-indigo-400 font-black uppercase tracking-[0.2em] mt-1 opacity-70">{renderValue(result.modelFamily)}</p>
                            </div>
                            <div className="text-[9px] font-black text-gray-400 bg-gray-800/80 px-2.5 py-1 rounded-md uppercase border border-gray-700/50">{renderValue(result.baseModel)}</div>
                        </div>

                        {result.triggerWords && result.triggerWords.length > 0 && (
                            <DetailSection title="Trigger Words" icon={<TriggerWordsIcon className="h-3.5 w-3.5"/>} isOpen={openSection === 'triggers'} onToggle={() => toggleSection('triggers')} count={result.triggerWords.length}>
                                <div className="flex flex-wrap gap-1.5 py-1">
                                    {result.triggerWords.map((word, i) => (
                                        <span key={i} className="px-2 py-1 bg-indigo-900/20 text-indigo-300 text-[9px] font-black uppercase rounded-md border border-indigo-500/10">{word}</span>
                                    ))}
                                </div>
                            </DetailSection>
                        )}

                        {result.trainingInfo && (
                            <DetailSection title="Architecture" icon={<TrainingIcon className="h-3.5 w-3.5"/>} isOpen={openSection === 'training'} onToggle={() => toggleSection('training')}>
                                <div className="grid grid-cols-2 gap-y-3 gap-x-4 py-2">
                                    {Object.entries(result.trainingInfo).map(([key, val]) => (
                                        <div key={key}>
                                            <span className="text-[8px] text-gray-500 uppercase font-black block mb-0.5 tracking-tighter">{key.replace('ss_', '')}</span>
                                            <span className="text-[10px] text-gray-300 font-mono">{renderValue(val)}</span>
                                        </div>
                                    ))}
                                </div>
                            </DetailSection>
                        )}
                    </div>
                )}
            </div>

            <div className="p-4 bg-gray-900/40 space-y-3 mt-auto">
                <div className="flex gap-2">
                    {isGGUF ? (
                        <button
                            onClick={handleIntegrate}
                            disabled={isIntegrating || isPending}
                            className={`flex-grow flex items-center justify-center gap-2 px-4 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-xl active:scale-95 border ${intStatus === 'success' ? 'bg-green-600 border-green-500 text-white' : 'bg-indigo-600 border-indigo-500 hover:bg-indigo-500 text-white disabled:opacity-50'}`}
                        >
                            {isIntegrating ? <LoaderIcon className="h-3.5 w-3.5 animate-spin" /> : intStatus === 'success' ? <CheckCircleIcon className="h-3.5 w-3.5" /> : <PlugIcon className="h-3.5 w-3.5" />}
                            {isIntegrating ? 'Mounting' : intStatus === 'success' ? 'Core Active' : 'Integrate Core'}
                        </button>
                    ) : (
                        <div className="flex-grow flex items-center justify-center px-4 py-3 bg-gray-800/40 text-[9px] font-black text-gray-600 uppercase tracking-widest rounded-xl border border-gray-700/50">
                            Neural Asset Locked
                        </div>
                    )}
                    <button onClick={onDelete} className="p-3 bg-gray-800 text-gray-500 hover:text-red-400 border border-gray-700 rounded-xl transition-all"><TrashIcon className="h-4 w-4" /></button>
                </div>
            </div>
        </div>
    );
};

export default LoraCard;
