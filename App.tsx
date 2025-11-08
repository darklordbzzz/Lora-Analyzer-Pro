
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { LoraAnalysis, LoraFileWithPreview, AnalysisStatus, CustomIntegration, LLMModel } from './types';
import { analyzeLoraFile } from './services/llmService';
import Header from './components/Header';
import FileUpload from './components/FileUpload';
import AnalysisResults from './components/AnalysisResults';
import { LoaderIcon, SearchIcon } from './components/Icons';
import SettingsModal from './components/SettingsModal';

const CUSTOM_INTEGRATIONS_KEY = 'lora-analyzer-pro-custom-integrations';
const LLM_MODELS_KEY = 'lora-analyzer-pro-llm-models';

const App: React.FC = () => {
  const [loraFiles, setLoraFiles] = useState<LoraFileWithPreview[]>([]);
  const [analysisResults, setAnalysisResults] = useState<LoraAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchCategory, setSearchCategory] = useState<'name' | 'hash' | 'tags' | 'triggerWords'>('name');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [customIntegrations, setCustomIntegrations] = useState<CustomIntegration[]>([]);
  const [llmModels, setLlmModels] = useState<LLMModel[]>([]);
  const [selectedLlmModelId, setSelectedLlmModelId] = useState<string>('');
  const analysisCancelledRef = useRef(false);

  useEffect(() => {
    try {
      const storedIntegrations = localStorage.getItem(CUSTOM_INTEGRATIONS_KEY);
      if (storedIntegrations) {
        setCustomIntegrations(JSON.parse(storedIntegrations));
      }
    } catch (error) {
      console.error("Failed to load custom integrations from localStorage:", error);
    }
  }, []);

  useEffect(() => {
    try {
      const storedModels = localStorage.getItem(LLM_MODELS_KEY);
      if (storedModels) {
        const parsedModels = JSON.parse(storedModels) as LLMModel[];
        if (parsedModels.length > 0) {
          setLlmModels(parsedModels);
          setSelectedLlmModelId(parsedModels[0].id);
          return;
        }
      }
    } catch (error) {
      console.error("Failed to load LLM models from localStorage:", error);
    }

    const defaultModel: LLMModel = {
      id: crypto.randomUUID(),
      name: 'Gemini 2.5 Flash',
      provider: 'gemini',
      modelName: 'gemini-2.5-flash',
    };
    setLlmModels([defaultModel]);
    setSelectedLlmModelId(defaultModel.id);
    localStorage.setItem(LLM_MODELS_KEY, JSON.stringify([defaultModel]));
  }, []);

  const handleSaveIntegrations = (integrations: CustomIntegration[]) => {
    setCustomIntegrations(integrations);
    try {
      localStorage.setItem(CUSTOM_INTEGRATIONS_KEY, JSON.stringify(integrations));
    } catch (error) {
      console.error("Failed to save custom integrations to localStorage:", error);
    }
  };

  const handleSaveModels = (models: LLMModel[]) => {
    setLlmModels(models);
    if (!models.some(m => m.id === selectedLlmModelId) && models.length > 0) {
      setSelectedLlmModelId(models[0].id);
    }
    try {
      localStorage.setItem(LLM_MODELS_KEY, JSON.stringify(models));
    } catch (error) {
      console.error("Failed to save LLM models to localStorage:", error);
    }
  };

  const handleFilesChange = (files: LoraFileWithPreview[]) => {
    setLoraFiles(files);
    // Keep existing results for files that are still present
    setAnalysisResults(prevResults => prevResults.filter(result => files.some(f => f.id === result.id)));
    setError(null);
  };

  const analyzeSingleFile = useCallback(async (fileId: string, isBatch: boolean = false) => {
    const selectedModel = llmModels.find(m => m.id === selectedLlmModelId);
    if (!selectedModel) {
      setError("No LLM model is selected for analysis. Please configure one in the settings.");
      return;
    }

    const file = loraFiles.find(f => f.id === fileId);
    if (!file) {
      console.error("File not found for analysis:", fileId);
      return;
    }

    if (!isBatch && analysisCancelledRef.current) analysisCancelledRef.current = false;

    const existingResultIndex = analysisResults.findIndex(r => r.id === fileId);
    const initialResult: LoraAnalysis = {
        id: file.id,
        status: AnalysisStatus.PENDING,
        fileName: file.relativePath,
        fileSizeMB: parseFloat((file.lora.size / (1024 * 1024)).toFixed(2)),
        previewImageUrl: file.preview ? URL.createObjectURL(file.preview) : undefined,
        hash: file.hash,
        civitaiUrl: file.civitaiUrl,
        huggingfaceUrl: file.huggingfaceUrl,
        tensorArtUrl: file.tensorArtUrl,
        seaartUrl: file.seaartUrl,
        mageSpaceUrl: file.mageSpaceUrl,
        customUrls: file.customUrls,
    };

    setAnalysisResults(prev => {
        const newResults = [...prev];
        if (existingResultIndex > -1) {
            newResults[existingResultIndex] = initialResult;
        } else {
            newResults.push(initialResult);
        }
        return newResults.sort((a,b) => loraFiles.findIndex(f => f.id === a.id) - loraFiles.findIndex(f => f.id === b.id));
    });

    try {
        if (!file.hash) throw new Error(`Hash not ready for ${file.lora.name}.`);
        const result = await analyzeLoraFile(file, file.hash, selectedModel);
        
        if (analysisCancelledRef.current && isBatch) return;

        setAnalysisResults(prev => {
            const newResults = [...prev];
            const idx = newResults.findIndex(r => r.id === fileId);
            if (idx > -1) {
                newResults[idx] = { ...initialResult, ...result, status: AnalysisStatus.COMPLETED };
            }
            return newResults;
        });
    } catch (err: any) {
        if (analysisCancelledRef.current && isBatch) return;
        
        setAnalysisResults(prev => {
            const newResults = [...prev];
            const idx = newResults.findIndex(r => r.id === fileId);
            if (idx > -1) {
                newResults[idx] = {
                    ...initialResult,
                    status: AnalysisStatus.FAILED,
                    error: err.message || 'An unknown error occurred during analysis.'
                };
            }
            return newResults;
        });
    }
  }, [loraFiles, analysisResults, llmModels, selectedLlmModelId]);

  const handleAnalyzeBatch = useCallback(async () => {
    const filesToAnalyze = loraFiles.filter(f => !analysisResults.some(r => r.id === f.id && r.status === AnalysisStatus.COMPLETED));
    if (filesToAnalyze.length === 0) {
      setError("All files have been analyzed or no files are selected.");
      return;
    }

    analysisCancelledRef.current = false;
    setIsLoading(true);
    setError(null);
    
    for (const file of filesToAnalyze) {
        if (analysisCancelledRef.current) break;
        await analyzeSingleFile(file.id, true);
    }
    
    setIsLoading(false);
  }, [loraFiles, analysisResults, analyzeSingleFile]);

  const handleClear = () => {
    if (isLoading) {
      analysisCancelledRef.current = true;
    }
    setLoraFiles([]);
    setAnalysisResults([]);
    setIsLoading(false);
    setError(null);
    setSearchQuery('');
  };

  const filteredResults = useMemo(() => {
    if (!searchQuery.trim()) {
        return analysisResults;
    }
    const lowerCaseQuery = searchQuery.toLowerCase();
    return analysisResults.filter(result => {
        switch (searchCategory) {
            case 'name':
                return result.fileName.toLowerCase().includes(lowerCaseQuery);
            case 'hash':
                return result.hash?.toLowerCase().includes(lowerCaseQuery) ?? false;
            case 'tags':
                return result.status === AnalysisStatus.COMPLETED && result.tags?.some(tag => tag.toLowerCase().includes(lowerCaseQuery));
            case 'triggerWords':
                return result.status === AnalysisStatus.COMPLETED && result.triggerWords?.some(word => word.toLowerCase().includes(lowerCaseQuery));
            default:
                return true;
        }
    });
  }, [analysisResults, searchQuery, searchCategory]);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col">
      <Header 
        onOpenSettings={() => setIsSettingsOpen(true)}
        llmModels={llmModels}
        selectedLlmModelId={selectedLlmModelId}
        onSelectLlmModel={setSelectedLlmModelId}
      />
      <main className="flex-grow container mx-auto p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <div className="relative max-w-lg mx-auto">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <SearchIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder={`Search by ${searchCategory}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-36 py-2.5 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              />
              <div className="absolute inset-y-0 right-0 flex items-center">
                <select
                  value={searchCategory}
                  onChange={(e) => setSearchCategory(e.target.value as any)}
                  className="h-full py-0 pl-2 pr-8 border-transparent bg-transparent text-gray-400 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg"
                >
                  <option value="name">Name</option>
                  <option value="hash">Hash</option>
                  <option value="tags">Tags</option>
                  <option value="triggerWords">Trigger Words</option>
                </select>
              </div>
            </div>
          </div>

          <FileUpload onFilesChange={handleFilesChange} onAnalyzeSingleFile={analyzeSingleFile} disabled={isLoading} customIntegrations={customIntegrations} />
          
          {error && <div className="mt-4 text-center text-red-400 bg-red-900/50 p-3 rounded-lg">{error}</div>}

          <div className="mt-6 flex items-center justify-center gap-4">
            <button
              onClick={handleAnalyzeBatch}
              disabled={isLoading || loraFiles.length === 0}
              className="px-8 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-500 disabled:bg-gray-700 disabled:cursor-not-allowed transition-all duration-300 flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <LoaderIcon className="animate-spin h-5 w-5" />
                  Analyzing...
                </>
              ) : (
                'Analyze Files'
              )}
            </button>
            <button
              onClick={handleClear}
              disabled={isLoading ? false : loraFiles.length === 0 && analysisResults.length === 0}
              className={`px-6 py-3 font-semibold rounded-lg transition-colors ${
                isLoading
                  ? 'bg-red-700 text-red-100 hover:bg-red-600'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              {isLoading ? 'Cancel Analysis' : 'Clear All'}
            </button>
          </div>
          
          <AnalysisResults results={filteredResults} />
        </div>
      </main>
      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        initialCustomIntegrations={customIntegrations}
        onSaveCustomIntegrations={handleSaveIntegrations}
        initialModels={llmModels}
        onSaveModels={handleSaveModels}
      />
    </div>
  );
};

export default App;