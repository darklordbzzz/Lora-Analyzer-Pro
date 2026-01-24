
import React, { useState, useEffect } from 'react';
import { 
  AppView, AnalyzerTuningConfig, VaultEntry, LLMModel, 
  LoraAnalysis, LoraFileWithPreview, AnalysisStatus, SoundStudioState, ActiveLora 
} from './types';
import Header from './components/Header';
import Setup from './components/Setup';
import Vault from './components/Vault';
import ChatInterface from './components/ChatInterface';
import FileUpload from './components/FileUpload';
import AnalysisResults from './components/AnalysisResults';
import ImageStudio from './components/ImageStudio';
import VideoStudio from './components/VideoStudio';
import SoundStudio from './components/SoundStudio';
import LiveSession from './components/LiveSession';
import ImageAnalyzer from './components/ImageAnalyzer';
import ImageMetadataViewer from './components/ImageMetadataViewer';
import VideoMetadataViewer from './components/VideoMetadataViewer';
import AudioMetadataViewer from './components/AudioMetadataViewer';
import PhotoRetouch from './components/PhotoRetouch';
import InpaintStudio from './components/InpaintStudio';
import HelpView from './components/HelpView';
import SettingsModal from './components/SettingsModal';
import { analyzeLoraFile } from './services/llmService';

const DEFAULT_STYLES = ["Photo", "Photorealistic", "HyperRealistic", "8k Cinematic", "Vogue Editorial", "National Geographic", "Vintage Photography", "High Fantasy", "Cyberpunk", "Studio Ghibli", "Oil Painting"];
const DEFAULT_ATMOSPHERES = ["Balanced", "Golden Hour", "Sunny", "Cloudy", "Rainy", "Snowy", "Horror", "Gloom", "Sacred", "Neon Noir", "Twilight", "Apocalyptic"];

const DEFAULT_TUNING: AnalyzerTuningConfig = {
  keywords: '',
  deepPoseAudit: true,
  appearanceAudit: true,
  unrestrictedNeuralUplink: true,
  artisticStylePreference: 'Photo',
  colorFilterPreference: 'None',
  customColorShade: '#6366f1',
  customStyleList: DEFAULT_STYLES,
  customAtmosphereList: DEFAULT_ATMOSPHERES,
  adjustments: {
    colorTemperature: 0,
    lightingIntensity: 100,
    atmosphere: 'Balanced',
    poseRigidity: 50,
    styleWeight: 100,
    weatherCondition: 'Clear',
    weatherShade: ''
  }
};

const DEFAULT_MODELS: LLMModel[] = [
  { id: 'gemini-3-flash', name: 'Gemini 3 Flash', provider: 'gemini', modelName: 'gemini-3-flash-preview' },
  { id: 'gemini-3-pro', name: 'Gemini 3 Pro', provider: 'gemini', modelName: 'gemini-3-pro-preview' }
];

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('vision-auditor');
  const [models, setModels] = useState<LLMModel[]>(() => {
    const saved = localStorage.getItem('va_models');
    return saved ? JSON.parse(saved) : DEFAULT_MODELS;
  });
  const [activeModelId, setActiveModelId] = useState(DEFAULT_MODELS[0].id);
  
  const [tuning, setTuning] = useState<AnalyzerTuningConfig>(() => {
    const saved = localStorage.getItem('va_tuning');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Robust deep merge to ensure new properties exist
        return { 
          ...DEFAULT_TUNING, 
          ...parsed,
          adjustments: { ...DEFAULT_TUNING.adjustments, ...(parsed.adjustments || {}) },
          customStyleList: parsed.customStyleList || DEFAULT_TUNING.customStyleList,
          customAtmosphereList: parsed.customAtmosphereList || DEFAULT_TUNING.customAtmosphereList
        };
      } catch (e) {
        return DEFAULT_TUNING;
      }
    }
    return DEFAULT_TUNING;
  });
  
  const [vault, setVault] = useState<VaultEntry[]>(() => {
    const saved = localStorage.getItem('va_vault');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [loraFiles, setLoraFiles] = useState<LoraFileWithPreview[]>([]);
  const [loraResults, setLoraResults] = useState<LoraAnalysis[]>([]);
  const [activeLoras, setActiveLoras] = useState<ActiveLora[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [studioSoundState, setStudioSoundState] = useState<SoundStudioState | null>(null);

  useEffect(() => {
    localStorage.setItem('va_tuning', JSON.stringify(tuning));
    localStorage.setItem('va_models', JSON.stringify(models));
    localStorage.setItem('va_vault', JSON.stringify(vault));
  }, [tuning, models, vault]);

  const activeModel = models.find(m => m.id === activeModelId) || models[0];

  const handleAnalyzeLora = async (fileId: string) => {
    const file = loraFiles.find(f => f.id === fileId);
    if (!file) return;

    setLoraResults(prev => [
      { id: file.id, fileName: file.lora.name, fileSizeMB: (file.lora.size / (1024 * 1024)).toFixed(1), status: AnalysisStatus.PENDING },
      ...prev.filter(r => r.id !== file.id)
    ]);

    try {
      const analysis = await analyzeLoraFile(file, file.hash || 'no-hash', activeModel);
      setLoraResults(prev => prev.map(r => r.id === file.id ? { ...r, ...analysis, status: AnalysisStatus.COMPLETED } : r));
    } catch (e) {
      setLoraResults(prev => prev.map(r => r.id === file.id ? { ...r, status: AnalysisStatus.FAILED } : r));
    }
  };

  const toggleLoraInjection = (lora: LoraAnalysis) => {
    setActiveLoras(prev => {
      const exists = prev.find(l => l.id === lora.id);
      if (exists) return prev.filter(l => l.id !== lora.id);
      return [...prev, {
        id: lora.id,
        fileName: lora.fileName,
        triggerWords: lora.triggerWords || [],
        weight: 1.0,
        baseModel: lora.baseModel
      }];
    });
  };

  const removeFromVault = (id: string) => setVault(prev => prev.filter(e => e.id !== id));

  return (
    <div className="min-h-screen flex flex-col bg-[#030712]">
      <Header 
        currentView={view} 
        onViewChange={setView} 
        activeModel={activeModel}
        models={models}
        onSelectModel={setActiveModelId}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />
      
      <main className="flex-grow container mx-auto px-6 py-8">
        {view === 'lora' && (
          <div className="space-y-12">
            <div className="max-w-4xl mx-auto">
              <FileUpload 
                onFilesChange={setLoraFiles} 
                onAnalyzeSingleFile={handleAnalyzeLora} 
                disabled={false}
                customIntegrations={[]}
              />
            </div>
            <AnalysisResults 
              results={loraResults} 
              onDelete={(id) => setLoraResults(prev => prev.filter(r => r.id !== id))}
              onRetry={async (r) => handleAnalyzeLora(r.id)}
              canRetry={() => true}
              activeLoras={activeLoras}
              onToggleInjection={toggleLoraInjection}
            />
          </div>
        )}

        {view === 'chat' && <ChatInterface tuning={tuning} activeModel={activeModel} />}
        {view === 'live-session' && <LiveSession tuning={tuning} />}
        {view === 'vision-auditor' && <ImageAnalyzer tuning={tuning} setTuning={setTuning} onSaveResult={(entry) => setVault(prev => [entry, ...prev])} />}
        {view === 'studio-image' && <ImageStudio activeLoras={activeLoras} setActiveLoras={setActiveLoras} tuning={tuning} />}
        {view === 'studio-video' && <VideoStudio tuning={tuning} />}
        {view === 'studio-sound' && <SoundStudio initialState={studioSoundState} activeModel={activeModel} tuning={tuning} />}
        {view === 'metadata-image' && <ImageMetadataViewer activeModel={activeModel} tuning={tuning} />}
        {view === 'metadata-video' && <VideoMetadataViewer activeModel={activeModel} tuning={tuning} />}
        {view === 'metadata-audio' && (
          <AudioMetadataViewer 
            activeModel={activeModel} 
            onImportToStudio={(data) => { setStudioSoundState(data); setView('studio-sound'); }} 
          />
        )}
        {view === 'retouch' && <PhotoRetouch activeModel={activeModel} tuning={tuning} />}
        {view === 'inpaint' && <InpaintStudio activeModel={activeModel} tuning={tuning} />}
        {view === 'vault' && <Vault vault={vault} onDelete={removeFromVault} />}
        {view === 'setup' && <Setup tuning={tuning} setTuning={setTuning} />}
        {view === 'help' && <HelpView />}
      </main>

      <footer className="py-8 border-t border-white/5 opacity-40 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.4em]">AI HUB Workstation v4.1 • Neural Integrity Active</p>
      </footer>
    </div>
  );
};

export default App;
