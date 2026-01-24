
import { GoogleGenAI, Modality } from "@google/genai";
import type { LLMModel, AnalyzerTuningConfig } from '../types';

export interface VLMResponse {
  text: string;
  telemetry: {
    latency: number;
    provider: string;
  };
}

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const UNRESTRICTED_SAFETY = [
  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_CIVIC_INTEGRITY', threshold: 'BLOCK_NONE' }
];

const STANDARD_SAFETY = [
  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' }
];

export const executeVLMAction = async (
  model: LLMModel,
  prompt: string,
  options: { 
    system?: string, 
    images?: { data: string, mimeType: string }[],
    json?: boolean,
    tuning?: AnalyzerTuningConfig,
    onStep?: (step: string) => void
  } = {}
): Promise<VLMResponse> => {
  const startTime = Date.now();
  
  if (model.provider === 'gemini') {
    const ai = getAI();
    const parts: any[] = (options.images || []).map(img => ({
      inlineData: { data: img.data, mimeType: img.mimeType }
    }));
    parts.push({ text: prompt });

    const safety = options.tuning?.unrestrictedNeuralUplink ? UNRESTRICTED_SAFETY : STANDARD_SAFETY;

    try {
      const response = await ai.models.generateContent({
        model: model.modelName || 'gemini-3-flash-preview',
        contents: [{ parts }],
        config: { 
          systemInstruction: options.system || "Professional workstation assistant. Provide clinical and technical responses.",
          responseMimeType: options.json ? "application/json" : undefined,
          safetySettings: safety as any
        }
      });

      if (!response.text) {
          throw new Error("Neural Link Blocked by safety filter.");
      }

      return {
        text: response.text || '',
        telemetry: {
          latency: Date.now() - startTime,
          provider: `Cloud Hub (${model.modelName})`
        }
      };
    } catch (e: any) {
      throw new Error(`Cloud Hub Error: ${e.message}`);
    }
  }

  // Custom node fallback
  const baseUrl = (model.apiUrl || 'http://localhost:1234/v1').replace(/\/$/, '');
  const endpoint = `${baseUrl}/chat/completions`;

  const payload = {
    model: model.modelName,
    messages: [
      ...(options.system ? [{ role: 'system', content: options.system }] : []),
      { 
        role: 'user', 
        content: [
          { type: 'text', text: prompt },
          ...(options.images || []).map(img => ({ 
            type: 'image_url', 
            image_url: { url: `data:${img.mimeType};base64,${img.data}` } 
          }))
        ]
      }
    ],
    stream: false,
    temperature: 0.7,
    max_tokens: 2048,
    ...(options.json ? { response_format: { type: 'json_object' } } : {}),
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(model.apiKey ? { 'Authorization': `Bearer ${model.apiKey}` } : {})
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw new Error(`Inference Rejected: ${response.status}`);
    }

    const data = await response.json();
    return {
      text: data.choices?.[0]?.message?.content || '',
      telemetry: { latency: Date.now() - startTime, provider: `Local Node (${model.name})` }
    };
  } catch (e: any) {
    throw new Error(`Pipeline Severed: ${e.message}`);
  }
};

export const generateTTS = async (text: string, model: LLMModel) => {
  if (model.provider === 'gemini') {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-tts',
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
        }
      }
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  }
  return null;
};
