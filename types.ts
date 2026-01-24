
export enum AnalysisStatus {
  IDLE = 'IDLE',
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface ImageAnalysisResult {
  compositionDescriptor: string;
  artisticStyle: string;
  lightingIllumination: string;
  technique: string;
  colorGamma: string;
  poseDescriptor: string;
  suggestedArtists: string[];
  actionPoseIdentifier?: string;
  appearanceRegistry?: {
    attire: string;
    haircutStyle: string;
    accessories: string[];
  };
  modifierTuning?: {
    colorTemperatureAdjustment: string;
    lightingIntensity: string;
    weatherOverlay: string;
    poseRigidity: string;
    styleInfluenceWeight: string;
  };
  tunedPromptPreview?: string;
}

export interface AnalyzerTuningConfig {
  keywords: string;
  deepPoseAudit: boolean;
  appearanceAudit: boolean;
  unrestrictedNeuralUplink: boolean;
  artisticStylePreference: string;
  colorFilterPreference: string;
  customColorShade: string;
  customStyleList: string[];
  customAtmosphereList: string[];
  downloadFolderPath?: string;
  adjustments: {
    colorTemperature: number;
    lightingIntensity: number;
    atmosphere: string;
    poseRigidity: number;
    styleWeight: number;
    weatherCondition: string;
    weatherShade?: string;
  };
}

export interface VaultEntry {
  id: string;
  timestamp: string;
  fileName: string;
  result: ImageAnalysisResult;
  config: AnalyzerTuningConfig;
  sourceImageBase64?: string;
  version: string;
}

export type AppView = 
  | 'lora' 
  | 'chat' 
  | 'vision-auditor'
  | 'studio-image' 
  | 'studio-video'
  | 'studio-sound' 
  | 'live-session'
  | 'metadata-image' 
  | 'metadata-video' 
  | 'metadata-audio' 
  | 'retouch' 
  | 'inpaint' 
  | 'vault' 
  | 'setup' 
  | 'help';

export type LLMProvider = 'gemini' | 'openai' | 'ollama' | 'integrated-core' | 'huggingface';

export interface LLMModel {
  id: string;
  name: string;
  provider: LLMProvider;
  modelName: string;
  apiUrl?: string;
  apiKey?: string;
}

export interface ActiveLora {
  id: string;
  fileName: string;
  triggerWords: string[];
  weight: number;
  baseModel?: string;
}

export interface LoraFileWithPreview {
  lora: File;
  preview: File | null;
  metadata: string;
  id: string;
  hash?: string;
  relativePath: string;
}

export interface LoraAnalysis {
  id: string;
  fileName: string;
  fileSizeMB: string;
  status: AnalysisStatus;
  modelType?: string;
  modelFamily?: string;
  baseModel?: string;
  triggerWords?: string[];
  trainingInfo?: Record<string, any>;
  usageTips?: string[];
  tags?: string[];
  confidence?: number;
  previewImageUrl?: string;
  hash?: string;
}

export interface SoundStudioState {
  title: string;
  artist: string;
  genre: string;
  bpm: number;
  key: string;
  mood: string;
  instrumentation: string[];
  lyrics: string;
  description: string;
  isInstrumental: boolean;
  vocalStyle: string;
}

export interface InpaintRegion {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  tag: string;
}

export interface CustomHeader {
  key: string;
  value: string;
}

export interface CustomIntegration {
  id: string;
  name: string;
  baseUrl: string;
}

export interface OllamaModelEntry {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details: {
    format: string;
    family: string;
    families: string[] | null;
    parameter_size: string;
    quantization_level: string;
  };
}

export interface OllamaTagsResponse {
  models: OllamaModelEntry[];
}

export interface OllamaPullProgress {
  status: string;
  digest?: string;
  total?: number;
  completed?: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  attachments?: { data: string; mimeType: string }[];
}

export interface AudioAnalysisResult {
  title: string;
  artist: string;
  genre: string;
  bpm: number;
  key: string;
  mood: string;
  instrumentation: string[];
  lyrics: string;
}

export interface AudioEngineNode {
  id: string;
  name: string;
  provider: LLMProvider;
  modelName: string;
  apiKey?: string;
  type: 'synthesis' | 'analysis';
}

export interface ImageStudioState {
  prompt: string;
  aspectRatio: string;
  provider: 'gemini' | 'local';
}
