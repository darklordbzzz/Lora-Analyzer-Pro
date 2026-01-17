
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
    <div className="border-t border-white/5">
        <button onClick={onToggle} className="w-full flex justify-between items-center py-4 px-5 text-left hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-3">
                <div className="text-hub-accent opacity-70">{icon}</div>
                <span className="font-black uppercase text-[10px] tracking-widest text-gray-400">{title}</span>
            </div>
            <div className="flex items-center gap-2">
                {count !== undefined && <span className="text-[9px] font-black text-hub-accent bg-hub-accent/10 px-2 py-0.5 rounded-full">{count}</span>}
                <ChevronDownIcon className={`h-4 w-4 text-gray-600 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
        </button>
        {isOpen && <div className="px-5 pb-5 text-xs text-gray-300 animate-in slide-in-from-top-2 duration-300">{children}</div>}
    </div>
);

const LoraCard: React.FC<LoraCardProps> = ({ result, onDelete }) => {
    const [openSection, setOpenSection] = useState<string | null>(null);
    const [isIntegrating, setIsIntegrating] = useState(false);
    const [intStatus, setIntStatus] = useState<'idle' | 'success' | 'error'>('idle');

    const renderValue = (val: any) => {
        if (val === null || val === undefined || val === '') return <span className="opacity-20 italic">VOID</span>;
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
            } else { setIntStatus('error'); }
        } catch (e) { setIntStatus('error'); }
        finally { setIsIntegrating(false); setTimeout(() => setIntStatus('idle'), 3000); }
    };

    const isGGUF = String(result.fileName || '').toLowerCase().endsWith('.gguf');
    const isPending = result.status === AnalysisStatus.PENDING;

    return (
        <div className="glass-card rounded-[2.5rem] overflow-hidden flex flex-col transition-all hover:shadow-[0_20px_60px_rgba(0,0,0,0.5)] hover:border-hub-accent/40 group h-full relative">
            <div className="h-56 bg-black flex items-center justify-center relative overflow-hidden">
                {result.previewImageUrl ? (
                    <img src={result.previewImageUrl} alt={result.fileName} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-1000" />
                ) : (
                    <div className="flex flex-col items-center gap-4">
                        <BoxIcon className={`h-16 w-16 ${isPending ? 'text-hub-accent animate-pulse' : 'text-gray-800'}`} />
                        {isPending && <p className="text-[10px] font-black uppercase text-hub-accent tracking-widest animate-pulse">Scanning Sector</p>}
                    </div>
                )}
                
                {isPending && <div className="scanning-line"></div>}

                <div className="absolute top-4 right-4 flex gap-2">
                    <span className="text-[9px] font-black text-white uppercase bg-hub-accent/80 px-3 py-1.5 rounded-xl border border-white/20 backdrop-blur-md shadow-lg">
                        {String(result.fileName).split('.').pop() || 'NODE'}
                    </span>
                </div>
                
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80"></div>
                <div className="absolute bottom-4 left-6 right-6">
                    <p className="text-[14px] font-bold text-white truncate uppercase tracking-tight" title={result.fileName}>{String(result.fileName).split(/[\\/]/).pop()}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[9px] text-hub-accent uppercase font-black tracking-widest">{result.fileSizeMB} MB</span>
                        <div className="w-1 h-1 rounded-full bg-white/20"></div>
                        <span className="text-[9px] text-gray-400 uppercase font-black tracking-widest">Confidence: {(result.confidence || 0) * 100}%</span>
                    </div>
                </div>
            </div>

            <div className="flex-grow flex flex-col">
                {!isPending && (
                    <div className="animate-in fade-in duration-500 flex flex-col h-full">
                        <div className="p-6 bg-white/2 space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="font-black text-[12px] text-white uppercase tracking-widest">{renderValue(result.modelType)}</h3>
                                <div className="text-[9px] font-black text-hub-cyan bg-hub-cyan/10 px-3 py-1 rounded-lg border border-hub-cyan/20">{renderValue(result.baseModel)}</div>
                            </div>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-relaxed">Family: <span className="text-gray-300">{renderValue(result.modelFamily)}</span></p>
                        </div>

                        <div className="flex-grow">
                            {result.triggerWords && result.triggerWords.length > 0 && (
                                <DetailSection title="Neural Triggers" icon={<TriggerWordsIcon className="h-4 w-4"/>} isOpen={openSection === 'triggers'} onToggle={() => toggleSection('triggers')} count={result.triggerWords.length}>
                                    <div className="flex flex-wrap gap-2 py-1">
                                        {result.triggerWords.map((word, i) => (
                                            <button key={i} onClick={() => navigator.clipboard.writeText(word)} className="px-3 py-1.5 bg-hub-accent/10 hover:bg-hub-accent/30 text-hub-accent text-[9px] font-black uppercase rounded-lg border border-hub-accent/10 transition-all active:scale-90 flex items-center gap-2">
                                                {word}
                                                <CopyIcon className="h-2.5 w-2.5 opacity-40" />
                                            </button>
                                        ))}
                                    </div>
                                </DetailSection>
                            )}

                            {result.trainingInfo && (
                                <DetailSection title="Architecture DNA" icon={<TrainingIcon className="h-4 w-4"/>} isOpen={openSection === 'training'} onToggle={() => toggleSection('training')}>
                                    <div className="grid grid-cols-2 gap-y-4 gap-x-6 py-2">
                                        {Object.entries(result.trainingInfo).slice(0, 8).map(([key, val]) => (
                                            <div key={key}>
                                                <span className="text-[8px] text-gray-500 uppercase font-black block mb-1 tracking-tighter opacity-60">{key.replace('ss_', '')}</span>
                                                <span className="text-[10px] text-white font-mono truncate block">{renderValue(val)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </DetailSection>
                            )}
                            
                            {result.usageTips && result.usageTips.length > 0 && (
                                <DetailSection title="Optimization Tips" icon={<RequirementsIcon className="h-4 w-4"/>} isOpen={openSection === 'usage'} onToggle={() => toggleSection('usage')}>
                                    <ul className="space-y-2 list-none">
                                        {result.usageTips.map((tip, i) => (
                                            <li key={i} className="text-[10px] text-gray-400 font-medium leading-relaxed flex gap-2">
                                                <span className="text-hub-cyan">•</span> {tip}
                                            </li>
                                        ))}
                                    </ul>
                                </DetailSection>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="p-6 bg-black/40 border-t border-white/5 mt-auto">
                <div className="flex gap-3">
                    <button
                        onClick={handleIntegrate}
                        disabled={isIntegrating || isPending}
                        className={`flex-grow flex items-center justify-center gap-3 px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl active:scale-95 border ${
                            intStatus === 'success' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-hub-accent border-hub-accent/50 hover:bg-violet-500 text-white disabled:opacity-30'
                        }`}
                    >
                        {isIntegrating ? <LoaderIcon className="h-4 w-4 animate-spin" /> : intStatus === 'success' ? <CheckCircleIcon className="h-4 w-4" /> : <PlugIcon className="h-4 w-4" />}
                        {isIntegrating ? 'Mounting...' : intStatus === 'success' ? 'Core Online' : 'Inject Logic'}
                    </button>
                    <button onClick={onDelete} className="p-4 bg-gray-800/80 hover:bg-red-600 text-gray-400 hover:text-white border border-white/5 rounded-2xl transition-all active:scale-90 shadow-lg">
                        <TrashIcon className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LoraCard;
