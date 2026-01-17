
export enum AnalysisStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
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
  customUrls?: Record<string, string>;
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
  triggerWords?: string[];
  usageTips?: string[];
  tags?: string[];
  confidence?: number;
  error?: string;
  timestamp?: number;
  trainingInfo?: Record<string, any>;
  hash?: string;
}

export type AppView = 'models' | 'images' | 'video' | 'audio' | 'chat' | 'studio' | 'help';
export type ImageSubView = 'studio' | 'analyzer' | 'retouch' | 'inpaint';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  attachments?: { name: string; mimeType: string; data: string }[];
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

export interface SoundStudioState extends AudioAnalysisResult {
    isInstrumental: boolean;
    vocalStyle: string;
    description: string;
    album?: string;
}

export type LLMProvider = 'gemini' | 'openai' | 'ollama' | 'custom-api' | 'integrated-core' | 'huggingface';

export interface CustomHeader {
  key: string;
  value: string;
}

export interface LLMModel {
  id: string;
  name: string;
  provider: LLMProvider;
  modelName: string;
  apiUrl?: string;
  apiKey?: string;
  customHeaders?: CustomHeader[];
}

export interface ImageAnalysisResult {
  compositionDescriptor: string;
  artisticStyle: string;
  lightingIllumination: string;
  technique: string;
  colorGamma: string;
  poseDescriptor: string;
  suggestedArtists: string[];
  // New detailed audit fields
  actionPoseIdentifier?: string;
  appearanceRegistry?: {
    attire: string;
    haircutStyle: string;
    accessories: string[];
  };
  tunedPromptPreview?: string;
}

export interface AnalyzerTuningConfig {
  keywords: string;
  deepPoseAudit: boolean;
  appearanceAudit: boolean;
  adjustments: {
    colorTemperature: number; // -100 to 100
    lightingIntensity: number;
    weatherCondition: string;
    poseRigidity: number;
    styleWeight: number;
  };
}

export interface InpaintRegion {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  tag: string;
}

export interface ImageStudioState {
  prompt: string;
  aspectRatio: "1:1" | "3:4" | "4:3" | "9:16" | "16:9";
  imageSize: "1K" | "2K" | "4K";
  quality: "standard" | "high";
  provider?: 'gemini' | 'local';
}

/**
 * Interface for custom platform integrations.
 */
export interface CustomIntegration {
  name: string;
  baseUrl: string;
}

/**
 * Interface for an audio processing node.
 */
export interface AudioEngineNode {
  id: string;
  name: string;
  provider: string;
  modelName: string;
  apiKey?: string;
  type: string;
}

/**
 * Metadata details for an Ollama model.
 */
export interface OllamaModelDetails {
  parent_model: string;
  format: string;
  family: string;
  families: string[];
  parameter_size: string;
  quantization_level: string;
}

/**
 * Entry structure for a locally installed Ollama model.
 */
export interface OllamaModelEntry {
  name: string;
  model: string;
  modified_at: string;
  size: number;
  digest: string;
  details: OllamaModelDetails;
}

/**
 * Response structure from Ollama's /api/tags endpoint.
 */
export interface OllamaTagsResponse {
  models: OllamaModelEntry[];
}

/**
 * Progress updates from Ollama's /api/pull endpoint.
 */
export interface OllamaPullProgress {
  status: string;
  digest?: string;
  total?: number;
  completed?: number;
  error?: string;
}
