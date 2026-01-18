
import React, { useState, useCallback, useMemo } from 'react';
import { AppView, ImageSubView, LoraFileWithPreview, LoraAnalysis, AnalysisStatus, LLMModel, AnalyzerTuningConfig } from './types';
import * as gemini from './services/geminiService';
import Header from './components/Header';
import FileUpload from './components/FileUpload';
import AnalysisResults from './components/AnalysisResults';
import ImageStudio from './components/ImageStudio';
import SoundStudio from './components/SoundStudio';
import ChatInterface from './components/ChatInterface';
import HelpView from './components/HelpView';
import VideoMetadataViewer from './components/VideoMetadataViewer';
import AudioMetadataViewer from './components/AudioMetadataViewer';
import ImageAnalyzer from './components/ImageAnalyzer';
import PhotoRetouch from './components/PhotoRetouch';
import InpaintStudio from './components/InpaintStudio';
import { SparklesIcon, SearchIcon, EditIcon, BoxIcon, TerminalIcon, TargetIcon } from './components/Icons';

const DEFAULT_MODEL: LLMModel = {
  id: 'gemini-3-flash-preview',
  name: 'Gemini 3 Flash',
  provider: 'gemini',
  modelName: 'gemini-3-flash-preview'
};

const DEFAULT_TUNING: AnalyzerTuningConfig = {
  keywords: '',
  deepPoseAudit: true,
  appearanceAudit: true,
  artisticStylePreference: 'Photo',
  colorFilterPreference: 'None',
  adjustments: {
    colorTemperature: 0,
    lightingIntensity: 100,
    weatherCondition: 'Sunny',
    poseRigidity: 50,
    styleWeight: 100
  }
};

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>('images');
  const [imageSubView, setImageSubView] = useState<ImageSubView>('analyzer');
  const [loraFiles, setLoraFiles] = useState<LoraFileWithPreview[]>([]);
  const [analysisResults, setAnalysisResults] = useState<LoraAnalysis[]>([]);
  const [activeModel, setActiveModel] = useState<LLMModel>(DEFAULT_MODEL);
  
  // Persistent tuning state for ImageAnalyzer
  const [analyzerTuning, setAnalyzerTuning] = useState<AnalyzerTuningConfig>(DEFAULT_TUNING);
  const [analyzerToggles, setAnalyzerToggles] = useState<Record<string, boolean>>({
    comp: true, style: true, light: true, tech: true, colors: true, pose: true, action: true, appearance: true, preview: true, artists: true
  });

  const analyzeFile = useCallback(async (fileId: string) => {
    const file = loraFiles.find(f => f.id === fileId);
    if (!file) return;

    const initial: LoraAnalysis = {
      id: fileId,
      status: AnalysisStatus.PENDING,
      fileName: file.relativePath,
      fileSizeMB: parseFloat((file.lora.size / (1024 * 1024)).toFixed(2)),
      previewImageUrl: file.preview ? URL.createObjectURL(file.preview) : undefined,
      timestamp: Date.now()
    };

    setAnalysisResults(prev => [initial, ...prev.filter(r => r.id !== fileId)]);

    try {
      let previewData = "";
      if (file.preview) {
        const reader = new FileReader();
        previewData = await new Promise((resolve) => {
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(file.preview!);
        });
      }

      const result = await gemini.analyzeModel({ 
        name: file.lora.name, 
        metadata: file.metadata,
        previewData 
      });

      setAnalysisResults(prev => prev.map(r => r.id === fileId ? { ...r, ...result, status: AnalysisStatus.COMPLETED } : r));
    } catch (e: any) {
      setAnalysisResults(prev => prev.map(r => r.id === fileId ? { ...r, status: AnalysisStatus.FAILED, error: e.message } : r));
    }
  }, [loraFiles]);

  const renderImageModule = () => {
    return (
      <div className="flex flex-col gap-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 bg-black/40 p-1 rounded-2xl border border-white/5 self-start mb-2 glass overflow-x-auto max-w-full">
          {[
            { id: 'analyzer', label: 'Vision Auditor', icon: SearchIcon },
            { id: 'studio', label: 'Image Studio', icon: SparklesIcon },
            { id: 'inpaint', label: 'Local Inpaint', icon: TargetIcon },
            { id: 'retouch', label: 'Neural Retouch', icon: EditIcon },
          ].map((sub) => (
            <button
              key={sub.id}
              onClick={() => setImageSubView(sub.id as ImageSubView)}
              className={`px-6 py-2.5 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
                imageSubView === sub.id ? 'bg-hub-accent text-white shadow-lg glow-accent' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <sub.icon className="h-4 w-4" />
              {sub.label}
            </button>
          ))}
        </div>
        
        <div className="animate-slide-up">
          {imageSubView === 'analyzer' && (
            <ImageAnalyzer 
              activeModel={activeModel} 
              tuning={analyzerTuning}
              setTuning={setAnalyzerTuning}
              toggles={analyzerToggles}
              setToggles={setAnalyzerToggles}
            />
          )}
          {imageSubView === 'studio' && <ImageStudio />}
          {imageSubView === 'retouch' && <PhotoRetouch activeModel={activeModel} />}
          {imageSubView === 'inpaint' && <InpaintStudio activeModel={activeModel} />}
        </div>
      </div>
    );
  }

  const renderDashboard = () => (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-slide-up">
      <div className="lg:col-span-4 xl:col-span-3 space-y-6">
        <div className="glass-card p-6 rounded-[2rem] space-y-6">
          <div className="flex items-center gap-3 border-b border-white/5 pb-4">
            <BoxIcon className="h-6 w-6 text-hub-accent" />
            <h2 className="font-black uppercase tracking-widest text-sm">Asset Intake</h2>
          </div>
          <FileUpload onFilesChange={setLoraFiles} onAnalyzeSingleFile={analyzeFile} disabled={false} customIntegrations={[]} />
        </div>
        
        <div className="glass-card p-6 rounded-[2rem] bg-hub-cyan/5 border-hub-cyan/20">
          <div className="flex items-center gap-3 mb-4">
            <TerminalIcon className="h-5 w-5 text-hub-cyan" />
            <h3 className="text-[11px] font-black uppercase tracking-widest text-hub-cyan">System Telemetry</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
              <span className="text-gray-500">Core Engine</span>
              <span className="text-white">Gemini 3 Flash</span>
            </div>
            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
              <span className="text-gray-500">Multimodal Uplink</span>
              <span className="text-emerald-500">Active</span>
            </div>
            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
              <span className="text-gray-500">AI HUB Buffer</span>
              <span className="text-white">{loraFiles.length} Nodes</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="lg:col-span-8 xl:col-span-9 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black uppercase tracking-tighter text-white neon-text">Analysis Matrix</h2>
          <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/10">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Sort By:</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-hub-accent">Timestamp</span>
          </div>
        </div>
        {analysisResults.length === 0 ? (
          <div className="h-[400px] glass-card rounded-[3rem] flex flex-col items-center justify-center opacity-20 border-dashed border-2">
            <BoxIcon className="h-24 w-24 mb-6" />
            <p className="font-black uppercase tracking-[0.5em] text-sm">Awaiting Neural Input</p>
          </div>
        ) : (
          <AnalysisResults results={analysisResults} onDelete={(id) => setAnalysisResults(p => p.filter(r => r.id !== id))} onRetry={() => {}} canRetry={() => false} activeModel={activeModel} />
        )}
      </div>
    </div>
  );

  const renderCurrentView = () => {
    switch (currentView) {
      case 'images':
        return renderImageModule();
      case 'models':
        return renderDashboard();
      case 'video':
        return <VideoMetadataViewer activeModel={activeModel} />;
      case 'audio':
        return <AudioMetadataViewer activeModel={activeModel} />;
      case 'studio':
        return <SoundStudio initialState={null} activeModel={activeModel} />;
      case 'chat':
        return <ChatInterface />;
      case 'help':
        return <HelpView />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col selection:bg-hub-accent/40 selection:text-white">
      <Header currentView={currentView} onViewChange={setCurrentView} />
      
      <main className="flex-grow container mx-auto px-6 py-8">
        {renderCurrentView()}
      </main>

      <footer className="py-12 border-t border-white/5 bg-black/40 backdrop-blur-xl">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-8 opacity-40 grayscale hover:grayscale-0 transition-all duration-700">
            <div className="flex items-center gap-4">
              <p className="text-gray-400 font-black text-[10px] uppercase tracking-[0.4em]">Hub Status</p>
              <div className="status-dot"></div>
            </div>
            <div className="w-px h-4 bg-white/10"></div>
            <p className="text-gray-400 font-black text-[10px] uppercase tracking-[0.4em]">Optimized AI HUB Pipeline 4.0</p>
          </div>
          
          <div className="text-gray-600 font-bold text-[10px] uppercase tracking-[0.2em]">
            &copy; 2025 AI HUB PRO • Powered by Gemini 3 & Veo 3.1
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
