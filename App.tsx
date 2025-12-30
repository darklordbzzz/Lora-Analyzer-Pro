
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
import { LoaderIcon, SearchIcon, UploadIcon, SettingsIcon } from './components/Icons';
import SettingsModal from './components/SettingsModal';
import HistoryModal from './components/HistoryModal';
import ConnectionHelpModal from './components/ConnectionHelpModal';
import ModelInstallModal from './components/ModelInstallModal';

const LLM_MODELS_KEY = 'lora-analyzer-pro-llm-models';
const SAVED_RESULTS_KEY = 'lora-analyzer-pro-saved-results';
const AUTO_SAVE_KEY = 'lora-analyzer-pro-auto-save';
const ENABLE_LOCAL_KEY = 'lora-analyzer-pro-enable-local';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>('models');
  const [studioState, setStudioState] = useState<SoundStudioState | null>(null);
  const [imageStudioState, setImageStudioState] = useState<ImageStudioState | null>(null);
  
  const [loraFiles, setLoraFiles] = useState<LoraFileWithPreview[]>([]);
  const [analysisResults, setAnalysisResults] = useState<LoraAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isConnectionHelpOpen, setIsConnectionHelpOpen] = useState(false);
  
  const [missingModel, setMissingModel] = useState<{ name: string; apiUrl: string; retryFileId?: string } | null>(null);

  const [customIntegrations, setCustomIntegrations] = useState<CustomIntegration[]>([]);
  const [llmModels, setLlmModels] = useState<LLMModel[]>([]);
  const [selectedLlmModelId, setSelectedLlmModelId] = useState<string>('');
  const [autoSave, setAutoSave] = useState<boolean>(true);
  const [enableLocalModels, setEnableLocalModels] = useState<boolean>(true); 
  
  const [progress, setProgress] = useState<{ processed: number; total: number }>({ processed: 0, total: 0 });

  const fileUploadRef = useRef<FileUploadRef>(null);

  useEffect(() => {
    try {
      const storedModels = localStorage.getItem(LLM_MODELS_KEY);
      if (storedModels) {
        const parsedModels = JSON.parse(storedModels) as LLMModel[];
        if (parsedModels.length > 0) {
          setLlmModels(parsedModels);
          setSelectedLlmModelId(parsedModels[0].id);
        } else {
             const defaultModel: LLMModel = { id: crypto.randomUUID(), name: 'Gemini 3 Flash', provider: 'gemini', modelName: 'gemini-3-flash-preview' };
            setLlmModels([defaultModel]);
            setSelectedLlmModelId(defaultModel.id);
        }
      } else {
        const defaultModel: LLMModel = { id: crypto.randomUUID(), name: 'Gemini 3 Flash', provider: 'gemini', modelName: 'gemini-3-flash-preview' };
        setLlmModels([defaultModel]);
        setSelectedLlmModelId(defaultModel.id);
        localStorage.setItem(LLM_MODELS_KEY, JSON.stringify([defaultModel]));
      }

      const storedResults = localStorage.getItem(SAVED_RESULTS_KEY);
      if (storedResults) setAnalysisResults(JSON.parse(storedResults));

      const storedAutoSave = localStorage.getItem(AUTO_SAVE_KEY);
      if (storedAutoSave !== null) setAutoSave(storedAutoSave === 'true');

    } catch (error) {
      console.error("Hub initialization failed:", error);
    }
  }, []);

  const handleActivateEngine = useCallback((model: LLMModel) => {
    setLlmModels(prev => {
        const otherModels = prev.filter(m => m.id !== 'mounted-gguf-node');
        const updated = [model, ...otherModels];
        localStorage.setItem(LLM_MODELS_KEY, JSON.stringify(updated));
        return updated;
    });
    setSelectedLlmModelId(model.id);
  }, []);

  useEffect(() => {
    (window as any).onViewChange = (view: AppView, options?: { activateModel?: LLMModel }) => {
        setCurrentView(view);
        if (options?.activateModel) {
            handleActivateEngine(options.activateModel);
        }
    };
    return () => { delete (window as any).onViewChange; };
  }, [handleActivateEngine]);

  const handleImportToStudio = (data: SoundStudioState) => { setStudioState(data); setCurrentView('studio'); };
  const handleImportToImageStudio = (data: ImageStudioState) => { setImageStudioState(data); setCurrentView('imageStudio'); };

  const handleSaveModels = (models: LLMModel[]) => {
    setLlmModels(models);
    if (!models.some(m => m.id === selectedLlmModelId) && models.length > 0) {
      setSelectedLlmModelId(models[0].id);
    }
    localStorage.setItem(LLM_MODELS_KEY, JSON.stringify(models));
  };
  
  const handleAddModel = (model: LLMModel) => {
    const newModels = [...llmModels, model];
    setLlmModels(newModels);
    setSelectedLlmModelId(model.id);
    localStorage.setItem(LLM_MODELS_KEY, JSON.stringify(newModels));
  };

  const handleDeleteModel = async (id: string) => {
    if (id === 'mounted-gguf-node') {
        if (!window.confirm("Disconnect Integrated Engine and revert to Cloud?")) return;
    }
    const newModels = llmModels.filter(m => m.id !== id);
    setLlmModels(newModels);
    localStorage.setItem(LLM_MODELS_KEY, JSON.stringify(newModels));
    if (selectedLlmModelId === id) setSelectedLlmModelId(newModels.length > 0 ? newModels[0].id : '');
  };

  const saveResultToHistory = async (result: LoraAnalysis, file?: LoraFileWithPreview) => {
      const resultToStore = { ...result, timestamp: Date.now() };
      if (file?.preview) {
          try {
              const base64Thumbnail = await createThumbnail(file.preview);
              resultToStore.previewImageUrl = base64Thumbnail;
          } catch (e) {
              if (resultToStore.previewImageUrl?.startsWith('blob:')) delete resultToStore.previewImageUrl;
          }
      }
      setAnalysisResults(prev => {
          const existingIndex = prev.findIndex(r => (result.hash && r.hash === result.hash) || r.fileName === result.fileName);
          let newResults;
          if (existingIndex > -1) { newResults = [...prev]; newResults[existingIndex] = resultToStore; }
          else { newResults = [resultToStore, ...prev]; }
          localStorage.setItem(SAVED_RESULTS_KEY, JSON.stringify(newResults));
          return newResults;
      });
  };

  const handleDeleteResult = (id: string) => {
      const newResults = analysisResults.filter(r => r.id !== id);
      setAnalysisResults(newResults);
      localStorage.setItem(SAVED_RESULTS_KEY, JSON.stringify(newResults));
  }

  const handleAnalyzeBatch = useCallback(async () => {
    if (loraFiles.length === 0) { fileUploadRef.current?.openFileDialog(); return; }
    setIsLoading(true);
    setProgress({ processed: 0, total: loraFiles.length });
    for (let i = 0; i < loraFiles.length; i++) {
        await analyzeSingleFile(loraFiles[i].id, true);
        setProgress(prev => ({ ...prev, processed: i + 1 }));
    }
    setIsLoading(false);
  }, [loraFiles]);

  const analyzeSingleFile = useCallback(async (fileId: string, isBatch: boolean = false) => {
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
        const completeResult = { ...initialResult, ...result, status: AnalysisStatus.COMPLETED, timestamp: Date.now() };
        if (autoSave) await saveResultToHistory(completeResult, file);
        else setAnalysisResults(prev => [completeResult, ...prev.filter(r => r.id !== fileId)]);
    } catch (err: any) {
        setAnalysisResults(prev => [{ ...initialResult, status: AnalysisStatus.FAILED, error: err.message, timestamp: Date.now() }, ...prev.filter(r => r.id !== fileId)]);
    }
  }, [loraFiles, llmModels, selectedLlmModelId, autoSave]);

  const activeModel = llmModels.find(m => m.id === selectedLlmModelId);

  return (
    <div className="min-h-screen bg-[#0B0F1A] text-gray-100 flex flex-col font-sans selection:bg-indigo-500/30">
      <Header 
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)} 
        llmModels={llmModels}
        selectedLlmModelId={selectedLlmModelId}
        onSelectLlmModel={setSelectedLlmModelId}
        onAddModel={handleAddModel}
        onDeleteModel={handleDeleteModel}
        currentView={currentView}
        onViewChange={setCurrentView}
        enableLocalModels={enableLocalModels}
      />
      <main className="flex-grow container mx-auto px-4 py-8 md:px-6 lg:px-8">
        <div className={currentView === 'models' ? 'block' : 'hidden'}>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-[0.4em] text-gray-500">Asset Audit Stream</h3>
                    <div className="flex gap-4">
                        <div className="relative group">
                             <SearchIcon className="absolute inset-y-0 left-3 flex items-center h-full text-gray-400" />
                             <input 
                                type="text" 
                                placeholder="Search audited nodes..." 
                                value={searchQuery} 
                                onChange={(e) => setSearchQuery(e.target.value)} 
                                className="pl-10 pr-4 py-2 bg-gray-900/50 border border-gray-800 rounded-xl text-xs text-white focus:ring-1 focus:ring-indigo-500 outline-none w-64 transition-all" 
                             />
                        </div>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <div className="lg:col-span-3">
                    <div className="bg-[#151B2B] border border-gray-800 rounded-3xl p-6 shadow-xl sticky top-36">
                       <div className="flex items-center gap-2 mb-4 text-indigo-400"><UploadIcon className="h-5 w-5" /><h2 className="font-bold text-sm uppercase tracking-widest">Input Stream</h2></div>
                       <FileUpload ref={fileUploadRef} onFilesChange={setLoraFiles} onAnalyzeSingleFile={analyzeSingleFile} disabled={isLoading} customIntegrations={customIntegrations} />
                       <div className="mt-6">
                          <button onClick={handleAnalyzeBatch} disabled={isLoading} className="w-full py-4 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-lg disabled:bg-gray-700 transition-all flex items-center justify-center gap-3 active:scale-95">
                            {isLoading ? <LoaderIcon className="animate-spin h-4 w-4" /> : 'Execute Sequential Audit'}
                          </button>
                       </div>
                    </div>
                  </div>
                  <div className="lg:col-span-9">
                    <AnalysisResults results={analysisResults.filter(r => r.fileName.toLowerCase().includes(searchQuery.toLowerCase()))} onDelete={handleDeleteResult} onRetry={(r) => analyzeSingleFile(r.id)} canRetry={() => true} />
                  </div>
                </div>
            </div>
        </div>

        <div className={currentView === 'images' ? 'block' : 'hidden'}><ImageMetadataViewer activeModel={activeModel} onConnectionError={() => setIsConnectionHelpOpen(true)} onImportToStudio={handleImportToImageStudio} /></div>
        <div className={currentView === 'video' ? 'block' : 'hidden'}><VideoMetadataViewer activeModel={activeModel} /></div>
        <div className={currentView === 'imageStudio' ? 'block' : 'hidden'}><ImageStudio initialState={imageStudioState} activeModel={activeModel} /></div>
        <div className={currentView === 'audio' ? 'block' : 'hidden'}><AudioMetadataViewer activeModel={activeModel} onImportToStudio={handleImportToStudio} /></div>
        <div className={currentView === 'studio' ? 'block' : 'hidden'}><SoundStudio initialState={studioState} /></div>
        <div className={currentView === 'chat' ? 'block' : 'hidden'}><ChatInterface activeModel={activeModel} /></div>
        <div className={currentView === 'help' ? 'block' : 'hidden'}><HelpView /></div>
      </main>

      <SettingsModal 
        isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} 
        initialCustomIntegrations={customIntegrations} onSaveCustomIntegrations={setCustomIntegrations} 
        initialModels={llmModels} onSaveModels={handleSaveModels} 
        autoSave={autoSave} onToggleAutoSave={(v) => { setAutoSave(v); localStorage.setItem(AUTO_SAVE_KEY, String(v)); }} 
        enableLocalModels={enableLocalModels} onToggleLocalModels={(v) => { setEnableLocalModels(v); localStorage.setItem(ENABLE_LOCAL_KEY, String(v)); }} 
      />
      <HistoryModal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} savedResults={analysisResults} onLoadHistory={() => setIsHistoryOpen(false)} onDeleteHistory={(ids) => ids.forEach(handleDeleteResult)} onClearHistory={() => { setAnalysisResults([]); localStorage.removeItem(SAVED_RESULTS_KEY); setIsHistoryOpen(false); }} />
      <ConnectionHelpModal isOpen={isConnectionHelpOpen} onClose={() => setIsConnectionHelpOpen(false)} />
      <ModelInstallModal isOpen={!!missingModel} onClose={() => setMissingModel(null)} modelName={missingModel?.name || ''} baseUrl={missingModel?.apiUrl || ''} onComplete={() => setMissingModel(null)} />
    </div>
  );
};

export default App;
