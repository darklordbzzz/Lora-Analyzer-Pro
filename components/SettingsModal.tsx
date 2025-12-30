
import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { CustomIntegration, LLMModel, LLMProvider, CustomHeader, AudioEngineNode } from '../types';
import { XIcon, SettingsIcon, TrashIcon, ServerIcon, FolderIcon, BoxIcon, AudioIcon, CheckCircleIcon, CloudIcon, PlusIcon, EditIcon, LinkIcon, CodeBracketIcon, InfoIcon, TerminalIcon, GlobeIcon, LoaderIcon, RefreshIcon, XCircleIcon, PlugIcon, ChevronDownIcon } from './Icons';
import OllamaIntegration from './OllamaIntegration';
import NeuralEngineSetup from './LMStudioIntegration';
import { probeExternalNode } from '../services/llmService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCustomIntegrations: CustomIntegration[];
  onSaveCustomIntegrations: (integrations: CustomIntegration[]) => void;
  initialModels: LLMModel[];
  onSaveModels: (models: LLMModel[]) => void;
  autoSave: boolean;
  onToggleAutoSave: (value: boolean) => void;
  enableLocalModels?: boolean;
  onToggleLocalModels?: (value: boolean) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, onClose, 
  initialModels, onSaveModels,
  autoSave, onToggleAutoSave
}) => {
  const [activeTab, setActiveTab] = useState<'core' | 'google' | 'audio' | 'other' | 'local' | 'general'>('core');
  const [models, setModels] = useState<LLMModel[]>(initialModels);
  const [audioNodes, setAudioNodes] = useState<AudioEngineNode[]>([]);
  const [nodeStatus, setNodeStatus] = useState<Record<string, 'checking' | 'online' | 'ready' | 'offline'>>({});
  
  const [newModel, setNewModel] = useState({
    name: '', modelId: '', apiUrl: '', apiKey: '', provider: 'openai' as const, headers: [] as CustomHeader[]
  });

  const [newAudioNode, setNewAudioNode] = useState({
      name: '', repoId: '', apiKey: '', provider: 'huggingface' as const
  });

  useEffect(() => {
    if(isOpen) {
      setModels(initialModels);
      const storedAudio = localStorage.getItem('lora-analyzer-pro-audio-nodes');
      if (storedAudio) setAudioNodes(JSON.parse(storedAudio));
      checkAllNodeConnectivity();
    }
  }, [initialModels, isOpen]);

  const checkAllNodeConnectivity = async () => {
      const otherModels = initialModels.filter(m => m.provider !== 'gemini' && m.provider !== 'ollama');
      const results: Record<string, 'online' | 'ready' | 'offline'> = {};
      await Promise.all(otherModels.map(async (m) => {
          results[m.id] = await probeExternalNode(m.apiUrl || 'http://localhost:1234/v1', m.modelName, m.apiKey);
      }));
      setNodeStatus(prev => ({ ...prev, ...results }));
  };

  const handleAddModel = (m_param?: LLMModel) => {
    const updated = [...models, m_param || {
      id: crypto.randomUUID(), name: newModel.name, provider: newModel.provider, modelName: newModel.modelId, apiUrl: newModel.apiUrl, apiKey: newModel.apiKey, customHeaders: []
    }];
    setModels(updated);
    onSaveModels(updated);
    if (!m_param) setNewModel({ name: '', modelId: '', apiUrl: '', apiKey: '', provider: 'openai', headers: [] });
  };

  const handleAddAudioNode = () => {
      const node: AudioEngineNode = {
          id: crypto.randomUUID(),
          name: newAudioNode.name,
          provider: 'huggingface',
          modelName: newAudioNode.repoId,
          apiKey: newAudioNode.apiKey,
          type: 'synthesis'
      };
      const updated = [...audioNodes, node];
      setAudioNodes(updated);
      localStorage.setItem('lora-analyzer-pro-audio-nodes', JSON.stringify(updated));
      setNewAudioNode({ name: '', repoId: '', apiKey: '', provider: 'huggingface' });
  };

  const handleDeleteModel = (id: string) => {
    const updated = models.filter(m => m.id !== id);
    setModels(updated);
    onSaveModels(updated);
  };

  const handleActivateEngine = (model: LLMModel) => {
      (window as any).onViewChange?.('chat', { activateModel: model });
      onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#0B0F1A]/95 z-[9999] flex items-center justify-center p-0 md:p-8 backdrop-blur-xl animate-in fade-in duration-300">
      <div 
        className="bg-[#111827] w-full h-full max-w-[1440px] max-h-[900px] flex flex-col border border-gray-800 shadow-[0_0_100px_rgba(0,0,0,0.8)] rounded-none md:rounded-[3rem] overflow-hidden animate-in zoom-in-95 duration-500 relative" 
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-8 right-8 z-[200] p-4 rounded-full bg-gray-800 hover:bg-red-600 transition-all text-gray-400 hover:text-white active:scale-90 hover:rotate-90 shadow-2xl border border-gray-700">
          <XIcon className="h-8 w-8" />
        </button>

        <div className="flex justify-between items-center px-12 py-10 border-b border-gray-800 bg-[#111827] sticky top-0 z-[100]">
          <div className="flex items-center gap-6">
            <div className="p-4 bg-indigo-600/20 rounded-2xl text-indigo-400 border border-indigo-500/20 shadow-inner">
              <SettingsIcon className="h-10 w-10" />
            </div>
            <div>
              <h2 className="text-4xl font-black uppercase tracking-[0.2em] text-white leading-none">System Architecture</h2>
              <p className="text-[12px] text-gray-500 font-black uppercase tracking-widest mt-2 opacity-60">Neural Uplink & Node Registry</p>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col lg:flex-row flex-grow overflow-hidden">
            <div className="w-full lg:w-[360px] bg-[#0B0F1A]/50 border-b lg:border-b-0 lg:border-r border-gray-800 p-10 flex lg:flex-col gap-4 overflow-x-auto lg:overflow-y-auto shrink-0 custom-scrollbar">
                <span className="hidden lg:block text-[10px] font-black text-gray-700 uppercase tracking-[0.3em] mb-4 px-2">Compute Nodes</span>
                <button onClick={() => setActiveTab('core')} className={`flex items-center gap-4 px-6 py-5 rounded-[1.5rem] text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'core' ? 'bg-indigo-600 text-white shadow-xl scale-[1.02]' : 'text-gray-500 hover:bg-gray-800/50 hover:text-gray-300'}`}>
                    <PlugIcon className="h-6 w-6" /> Integrated Core
                </button>
                <div className="hidden lg:block h-4"></div>
                <span className="hidden lg:block text-[10px] font-black text-gray-700 uppercase tracking-[0.3em] mb-4 px-2">Multimodal Hubs</span>
                <button onClick={() => setActiveTab('audio')} className={`flex items-center gap-4 px-6 py-5 rounded-[1.5rem] text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'audio' ? 'bg-indigo-600 text-white shadow-xl' : 'text-gray-500 hover:bg-gray-800/50 hover:text-gray-300'}`}>
                    <AudioIcon className="h-6 w-6" /> Sound Nodes
                </button>
                <button onClick={() => setActiveTab('google')} className={`flex items-center gap-4 px-6 py-5 rounded-[1.5rem] text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'google' ? 'bg-indigo-600 text-white shadow-xl' : 'text-gray-500 hover:bg-gray-800/50 hover:text-gray-300'}`}>
                    <CloudIcon className="h-6 w-6" /> Google Gemini
                </button>
                <button onClick={() => setActiveTab('other')} className={`flex items-center gap-4 px-6 py-5 rounded-[1.5rem] text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'other' ? 'bg-indigo-600 text-white shadow-xl' : 'text-gray-500 hover:bg-gray-800/50 hover:text-gray-300'}`}>
                    <ServerIcon className="h-6 w-6" /> Custom Logic
                </button>
                <button onClick={() => setActiveTab('local')} className={`flex items-center gap-4 px-6 py-5 rounded-[1.5rem] text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'local' ? 'bg-indigo-600 text-white shadow-xl' : 'text-gray-500 hover:bg-gray-800/50 hover:text-gray-300'}`}>
                    <BoxIcon className="h-6 w-6" /> Ollama Hub
                </button>
                <div className="hidden lg:block flex-grow"></div>
                <button onClick={() => setActiveTab('general')} className={`flex items-center gap-4 px-6 py-5 rounded-[1.5rem] text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'general' ? 'bg-gray-800 text-white shadow-xl' : 'text-gray-500 hover:bg-gray-800/50 hover:text-gray-300'}`}>
                    <SettingsIcon className="h-6 w-6" /> General
                </button>
            </div>

            <div className="flex-grow overflow-y-auto custom-scrollbar bg-[#111827]">
                {activeTab === 'audio' && (
                    <div className="p-16 space-y-12 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="flex justify-between items-center">
                            <h3 className="text-4xl font-black text-white uppercase tracking-tighter">Acoustic Logic Engines</h3>
                            <div className="flex items-center gap-2 bg-indigo-600/10 px-4 py-2 rounded-xl border border-indigo-500/20">
                                <InfoIcon className="h-4 w-4 text-indigo-400" />
                                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Hugging Face API Recommended</span>
                            </div>
                        </div>

                        <div className="bg-[#151B2B] border border-gray-800 rounded-[2.5rem] p-10 space-y-8 shadow-2xl">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Display Name</label>
                                    <input type="text" value={newAudioNode.name} onChange={e => setNewAudioNode({...newAudioNode, name: e.target.value})} placeholder="e.g. My Stable Audio Open" className="w-full px-5 py-4 bg-gray-950 border border-gray-800 rounded-2xl text-white outline-none focus:border-indigo-500 transition-all font-bold" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Repo ID / Endpoint</label>
                                    <input type="text" value={newAudioNode.repoId} onChange={e => setNewAudioNode({...newAudioNode, repoId: e.target.value})} placeholder="stabilityai/stable-audio-open-1.0" className="w-full px-5 py-4 bg-gray-950 border border-gray-800 rounded-2xl text-white outline-none focus:border-indigo-500 transition-all font-mono text-sm" />
                                </div>
                             </div>
                             <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">HF API Key (Secret)</label>
                                <input type="password" value={newAudioNode.apiKey} onChange={e => setNewAudioNode({...newAudioNode, apiKey: e.target.value})} placeholder="hf_xxxxxxxxxxxxxxxxxxxxxxxx" className="w-full px-5 py-4 bg-gray-950 border border-gray-800 rounded-2xl text-white outline-none focus:border-indigo-500 transition-all font-mono" />
                             </div>
                             <button onClick={handleAddAudioNode} disabled={!newAudioNode.name || !newAudioNode.repoId} className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-[0.4em] text-xs rounded-2xl shadow-xl transition-all active:scale-[0.98] disabled:opacity-50">
                                Register Sound Node
                             </button>
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-xs font-black text-gray-500 uppercase tracking-[0.3em] px-2 mb-4">Acoustic Registry</h4>
                            {audioNodes.map(node => (
                                <div key={node.id} className="p-8 bg-[#151B2B] border border-gray-800 rounded-[2rem] flex items-center justify-between group hover:border-indigo-500/30 transition-all shadow-xl">
                                    <div className="flex items-center gap-6">
                                        <div className="p-4 bg-indigo-900/20 text-indigo-400 rounded-2xl shadow-inner"><AudioIcon className="h-8 w-8" /></div>
                                        <div>
                                            <span className="text-lg font-black text-white block uppercase tracking-tight">{node.name}</span>
                                            <span className="text-[11px] text-gray-500 font-mono mt-1.5 block opacity-60 lowercase tracking-tighter">{node.modelName}</span>
                                        </div>
                                    </div>
                                    <button onClick={() => {
                                        const updated = audioNodes.filter(n => n.id !== node.id);
                                        setAudioNodes(updated);
                                        localStorage.setItem('lora-analyzer-pro-audio-nodes', JSON.stringify(updated));
                                    }} className="p-4 text-gray-700 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100">
                                        <TrashIcon className="h-6 w-6" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                {activeTab === 'core' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 h-full">
                        <NeuralEngineSetup 
                          onActivateEngine={handleActivateEngine} 
                          activeModelId={models.find(m => m.apiUrl === 'integrated://core')?.id} 
                          allModels={models}
                          onAddModel={handleAddModel}
                          onDeleteModel={handleDeleteModel}
                        />
                    </div>
                )}

                {activeTab === 'other' && (
                    <div className="p-16 space-y-12 animate-in fade-in slide-in-from-right-4 duration-300">
                        <h3 className="text-4xl font-black text-white uppercase tracking-tighter">Logic Pipeline Nodes</h3>
                        <div className="space-y-4">
                            {models.filter(m => m.provider !== 'gemini' && m.provider !== 'ollama' && m.apiUrl !== 'integrated://core').map(m => (
                                <div key={m.id} className="p-8 bg-[#151B2B] border border-gray-800 rounded-[2rem] flex items-center justify-between group transition-all hover:border-indigo-500/30 shadow-xl">
                                    <div className="flex items-center gap-6">
                                        <div className="p-4 bg-indigo-900/20 text-indigo-400 rounded-2xl"><ServerIcon className="h-8 w-8" /></div>
                                        <div>
                                            <span className="text-lg font-black text-white block uppercase tracking-tight">{m.name}</span>
                                            <span className="text-xs text-gray-500 font-mono mt-1 block">{m.apiUrl}</span>
                                        </div>
                                    </div>
                                    <button onClick={() => handleDeleteModel(m.id)} className="p-4 text-gray-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"><TrashIcon className="h-6 w-6" /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                {activeTab === 'local' && (
                    <div className="p-16 h-full">
                        <OllamaIntegration onSyncModels={onSaveModels} currentModels={models} onActivateModel={handleActivateEngine} activeModelId={initialModels.find(m => m.provider === 'ollama')?.id} />
                    </div>
                )}

                {activeTab === 'general' && (
                    <div className="p-16 space-y-8 max-w-4xl">
                        <h3 className="text-4xl font-black text-white uppercase tracking-tighter">Environment Control</h3>
                        <div className="flex items-center justify-between p-10 bg-gray-800/40 rounded-[3rem] border border-gray-700/50 shadow-2xl">
                            <div>
                                <span className="text-2xl font-black text-white block">Auto-Save Memory</span>
                                <span className="text-sm text-gray-500 font-bold uppercase mt-2 block tracking-wider">Persist telemetry and audit results locally</span>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer scale-125">
                                <input type="checkbox" className="sr-only peer" checked={autoSave} onChange={e => onToggleAutoSave(e.target.checked)} />
                                <div className="w-16 h-9 bg-gray-700 rounded-full peer peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-7 after:w-7 after:transition-all peer-checked:after:translate-x-full shadow-inner"></div>
                            </label>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
