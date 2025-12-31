
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { LoraAnalysis, LoraFileWithPreview, AnalysisStatus, CustomIntegration, LLMModel, AppView, SoundStudioState, ImageStudioState } from './types';
import { analyzeLoraFile } from './services/llmService';
import { createThumbnail } from './services/fileService';
import Header from './components/Header';
import FileUpload, { FileUploadRef } from './components/FileUpload';
import AnalysisResults from './components/AnalysisResults';
import ImageMetadataViewer from './components/ImageMetadataViewer';
import AudioMetadataViewer from './components/AudioMetadataViewer';
import VideoMetadataViewer from './components/VideoMetadataViewer';
import SoundStudio from './components/SoundStudio';
import ImageStudio from './components/ImageStudio';
import ChatInterface from './components/ChatInterface';
import HelpView from './components/HelpView';
import { LoaderIcon, SearchIcon, UploadIcon } from './components/Icons';
import SettingsModal from './components/SettingsModal';
import HistoryModal from './components/HistoryModal';
import ConnectionHelpModal from './components/ConnectionHelpModal';
import ModelInstallModal from './components/ModelInstallModal';

const LLM_MODELS_KEY = 'lora-analyzer-pro-llm-models';
const SAVED_RESULTS_KEY = 'lora-analyzer-pro-saved-results';
const LOCAL_BRIDGE_KEY = 'lora-analyzer-pro-local-bridge';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>('models');
  const [studioState, setStudioState] = useState<SoundStudioState | null>(null);
  const [imageStudioState, setImageStudioState] = useState<ImageStudioState | null>(null);
  
  const [loraFiles, setLoraFiles] = useState<LoraFileWithPreview[]>([]);
  const [analysisResults, setAnalysisResults] = useState<LoraAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isConnectionHelpOpen, setIsConnectionHelpOpen] = useState(false);
  
  const [llmModels, setLlmModels] = useState<LLMModel[]>([]);
  const [selectedLlmModelId, setSelectedLlmModelId] = useState<string>('');
  const [autoSave, setAutoSave] = useState<boolean>(true);
  const [enableLocalModels, setEnableLocalModels] = useState<boolean>(true); 
  
  const fileUploadRef = useRef<FileUploadRef>(null);

  useEffect(() => {
    try {
      const storedModels = localStorage.getItem(LLM_MODELS_KEY);
      if (storedModels) {
        const parsed = JSON.parse(storedModels) as LLMModel[];
        setLlmModels(parsed);
        if (parsed.length > 0) setSelectedLlmModelId(parsed[0].id);
      } else {
        const defaultModel: LLMModel = { id: crypto.randomUUID(), name: 'Gemini 3 Flash', provider: 'gemini', modelName: 'gemini-3-flash-preview' };
        setLlmModels([defaultModel]);
        setSelectedLlmModelId(defaultModel.id);
        localStorage.setItem(LLM_MODELS_KEY, JSON.stringify([defaultModel]));
      }
      
      const storedResults = localStorage.getItem(SAVED_RESULTS_KEY);
      if (storedResults) setAnalysisResults(JSON.parse(storedResults));

    } catch (error) {
      console.error("Hub init failed:", error);
    }
  }, []);

  // Neural Sync Logic: Switches everything from Gemini when a local node is active
  const handleActivateEngine = useCallback((model: LLMModel) => {
    setLlmModels(prev => {
        const others = prev.filter(m => m.id !== model.id);
        const updated = [model, ...others];
        localStorage.setItem(LLM_MODELS_KEY, JSON.stringify(updated));
        return updated;
    });
    setSelectedLlmModelId(model.id);
  }, []);

  useEffect(() => {
    (window as any).onViewChange = (view: AppView, options?: { activateModel?: LLMModel }) => {
        setCurrentView(view);
        if (options?.activateModel) handleActivateEngine(options.activateModel);
    };
    return () => { delete (window as any).onViewChange; };
  }, [handleActivateEngine]);

  const activeModel = useMemo(() => llmModels.find(m => m.id === selectedLlmModelId), [llmModels, selectedLlmModelId]);

  const analyzeSingleFile = useCallback(async (fileId: string) => {
    const selectedModel = llmModels.find(m => m.id === selectedLlmModelId);
    if (!selectedModel) return;
    const file = loraFiles.find(f => f.id === fileId);
    if (!file) return;

    const initialResult: LoraAnalysis = {
        id: fileId, status: AnalysisStatus.PENDING, fileName: file.relativePath,
        fileSizeMB: parseFloat((file.lora.size / (1024 * 1024)).toFixed(2)),
        previewImageUrl: file.preview ? URL.createObjectURL(file.preview) : undefined,
        hash: file.hash, timestamp: Date.now()
    };
    setAnalysisResults(prev => [initialResult, ...prev.filter(r => r.id !== fileId)]);

    try {
        const result = await analyzeLoraFile(file, file.hash || '', selectedModel);
        const complete = { ...initialResult, ...result, status: AnalysisStatus.COMPLETED };
        setAnalysisResults(prev => [complete, ...prev.filter(r => r.id !== fileId)]);
        if (autoSave) {
             const stored = JSON.parse(localStorage.getItem(SAVED_RESULTS_KEY) || '[]');
             localStorage.setItem(SAVED_RESULTS_KEY, JSON.stringify([complete, ...stored.filter((r: any) => r.id !== fileId)]));
        }
    } catch (err: any) {
        setAnalysisResults(prev => [{ ...initialResult, status: AnalysisStatus.FAILED, error: err.message }, ...prev.filter(r => r.id !== fileId)]);
    }
  }, [loraFiles, llmModels, selectedLlmModelId, autoSave]);

  return (
    <div className="min-h-screen bg-[#0B0F1A] text-gray-100 flex flex-col font-sans selection:bg-indigo-500/30">
      <Header 
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)} 
        llmModels={llmModels}
        selectedLlmModelId={selectedLlmModelId}
        onSelectLlmModel={setSelectedLlmModelId}
        onAddModel={(m) => { setLlmModels(p => [...p, m]); setSelectedLlmModelId(m.id); }}
        onDeleteModel={(id) => setLlmModels(p => p.filter(m => m.id !== id))}
        currentView={currentView}
        onViewChange={setCurrentView}
        enableLocalModels={enableLocalModels}
      />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className={currentView === 'models' ? 'block' : 'hidden'}>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-3">
                <div className="bg-[#151B2B] border border-gray-800 rounded-3xl p-6 shadow-xl sticky top-36">
                   <div className="flex items-center gap-2 mb-4 text-indigo-400"><UploadIcon className="h-5 w-5" /><h2 className="font-bold text-sm uppercase tracking-widest">Input Stream</h2></div>
                   <FileUpload ref={fileUploadRef} onFilesChange={setLoraFiles} onAnalyzeSingleFile={analyzeSingleFile} disabled={isLoading} customIntegrations={[]} />
                </div>
              </div>
              <div className="lg:col-span-9">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xs font-black uppercase tracking-[0.4em] text-gray-500">Node Audit Log</h3>
                    <div className="relative">
                         <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                         <input type="text" placeholder="Search audited nodes..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 pr-4 py-2 bg-gray-900 border border-gray-800 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-500" />
                    </div>
                </div>
                <AnalysisResults results={analysisResults.filter(r => r.fileName.toLowerCase().includes(searchQuery.toLowerCase()))} onDelete={(id) => setAnalysisResults(p => p.filter(r => r.id !== id))} onRetry={(r) => analyzeSingleFile(r.id)} canRetry={() => true} activeModel={activeModel} />
              </div>
            </div>
        </div>

        <div className={currentView === 'images' ? 'block' : 'hidden'}><ImageMetadataViewer activeModel={activeModel} onConnectionError={() => setIsConnectionHelpOpen(true)} onImportToStudio={(d) => { setImageStudioState(d); setCurrentView('imageStudio'); }} /></div>
        <div className={currentView === 'video' ? 'block' : 'hidden'}><VideoMetadataViewer activeModel={activeModel} /></div>
        <div className={currentView === 'audio' ? 'block' : 'hidden'}><AudioMetadataViewer activeModel={activeModel} onImportToStudio={(d) => { setStudioState(d); setCurrentView('studio'); }} /></div>
        <div className={currentView === 'chat' ? 'block' : 'hidden'}><ChatInterface activeModel={activeModel} /></div>
        <div className={currentView === 'studio' ? 'block' : 'hidden'}><SoundStudio initialState={studioState} /></div>
        <div className={currentView === 'imageStudio' ? 'block' : 'hidden'}><ImageStudio initialState={imageStudioState} activeModel={activeModel} /></div>
        <div className={currentView === 'help' ? 'block' : 'hidden'}><HelpView /></div>
      </main>

      <SettingsModal 
        isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} 
        initialCustomIntegrations={[]} onSaveCustomIntegrations={() => {}} 
        initialModels={llmModels} onSaveModels={(m) => { setLlmModels(m); localStorage.setItem(LLM_MODELS_KEY, JSON.stringify(m)); }} 
        autoSave={autoSave} onToggleAutoSave={setAutoSave} 
      />
      <ConnectionHelpModal isOpen={isConnectionHelpOpen} onClose={() => setIsConnectionHelpOpen(false)} />
    </div>
  );
};

export default App;
