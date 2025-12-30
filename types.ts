
export enum AnalysisStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface CustomHeader {
  id: string;
  key: string;
  value: string;
}

export interface CustomIntegration {
  id: string;
  name: string;
  baseUrl: string;
  isEnabled: boolean;
}

export type LLMProvider = 'gemini' | 'openai' | 'ollama' | 'custom-api' | 'lm-studio' | 'huggingface';

export interface LLMModel {
  id: string;
  name: string;
  provider: LLMProvider;
  modelName: string; 
  apiUrl?: string; 
  apiKey?: string;
  customHeaders?: CustomHeader[];
}

export interface AudioEngineNode extends LLMModel {
    type: 'synthesis' | 'voice-clone' | 'mastering' | 'speech';
}

export interface AudioGeneration {
    id: string;
    title: string;
    url: string;
    engine: string;
    timestamp: number;
    prompt: string;
}

export interface SoundStudioState extends AudioAnalysisResult {
    isInstrumental: boolean;
    vocalStyle: string;
    audioEngineId?: string;
    generations?: AudioGeneration[];
}

export interface NeuralCoreConfig {
    id: string;
    name: string;
    fileName: string;
    timestamp: number;
    parameters?: string;
}

export interface LoraFileWithPreview {
  id: string;
  lora: File;
  preview: File | null;
  metadata: string;
  hash?: string;
  relativePath: string;
  civitaiUrl?: string;
  huggingfaceUrl?: string;
  tensorArtUrl?: string;
  seaartUrl?: string;
  mageSpaceUrl?: string;
  customUrls?: Record<string, string>;
}

export interface TrainingInfo {
  network_dim?: string | number;
  network_alpha?: string | number;
  lr_scheduler?: string;
  optimizer?: string;
  max_train_steps?: string | number;
  resolution?: string;
  batch_size?: string | number;
  clip_skip?: string | number;
}

export interface LoraAnalysis {
  id: string;
  status: AnalysisStatus;
  fileName: string;
  fileSizeMB: number;
  previewImageUrl?: string;
  modelType?: string;
  modelFamily?: string;
  baseModel?: string;
  category?: string;
  resolution?: string;
  clips?: string;
  version?: string;
  confidence?: number;
  tags?: string[];
  triggerWords?: string[];
  usageTips?: string[];
  hash?: string;
  requirements?: string[];
  compatibility?: string[];
  trainingInfo?: TrainingInfo;
  error?: string;
  timestamp?: number;
}

export type AppView = 'models' | 'images' | 'video' | 'audio' | 'chat' | 'studio' | 'imageStudio' | 'help';

export interface ChatAttachment {
  name: string;
  mimeType: string;
  data: string; // base64
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  thought?: string; 
  timestamp: number;
  attachments?: ChatAttachment[];
}

export interface ChatConversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  timestamp: number;
  modelId: string;
}

export interface AudioAnalysisResult {
  title: string;
  artist: string;
  album: string;
  genre: string;
  bpm: number;
  key: string;
  mood: string;
  instrumentation: string[];
  lyrics: string;
  description: string;
}

export interface ImageAnalysisResult {
  imageDescriptor: string;
  styleDescriptor: string;
  lightingDescriptor: string;
  techniqueDescriptor: string;
  colorGammaDescriptor: string;
  suggestedArtists: string[];
}

export type UpscaleFactor = 2 | 4;

export interface ImageStudioState {
  prompt: string;
  aspectRatio: "1:1" | "3:4" | "4:3" | "9:16" | "16:9";
  provider: 'gemini' | 'comfyui' | 'hybrid';
  modelId?: string;
  sourceImage?: string; // base64
  comfyWorkflow?: any; 
  upscaleFactor?: UpscaleFactor;
  localUpscalerModel?: string;
  masteringModel?: string;
}

export interface VideoStudioState {
    id: string;
    file: File | null;
    url: string | null;
    duration: number;
    width: number;
    height: number;
    size: number;
}

export interface ImagePreset extends ImageStudioState {
    id: string;
    name: string;
    timestamp: number;
}

export interface OllamaModelEntry {
  name: string;
  model: string;
  modified_at: string;
  size: number;
  digest: string;
  details: {
    parent_model: string;
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
  error?: string;
}

export interface LMStudioModuleConfig {
    id: string;
    name: string;
    enabled: boolean;
    type: 'tool' | 'context' | 'program';
}
