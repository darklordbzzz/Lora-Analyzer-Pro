export enum AnalysisStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface CustomIntegration {
  id: string;
  name: string;
  baseUrl: string;
}

export type LLMProvider = 'gemini' | 'openai';

export interface LLMModel {
  id: string;
  name: string;
  provider: LLMProvider;
  modelName: string; // e.g., 'gemini-2.5-flash' or 'llama3-70b-8192'
  apiUrl?: string; // e.g., 'https://api.openai.com/v1/chat/completions' or local server
  apiKey?: string;
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
  hash?: string;
  requirements?: string[];
  compatibility?: string[];
  trainingInfo?: TrainingInfo;
  error?: string;
  civitaiUrl?: string;
  huggingfaceUrl?: string;
  tensorArtUrl?: string;
  seaartUrl?: string;
  mageSpaceUrl?: string;
  customUrls?: Record<string, string>;
}