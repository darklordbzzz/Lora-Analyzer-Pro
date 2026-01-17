import { GoogleGenAI, Modality } from "@google/genai";
import type { LLMModel } from '../types';

export interface VLMResponse {
  text: string;
  telemetry: {
    latency: number;
    provider: string;
  };
}

export const executeVLMAction = async (
  model: LLMModel,
  prompt: string,
  options: { 
    system?: string, 
    images?: { data: string, mimeType: string }[],
    json?: boolean,
    onStep?: (step: string) => void
  } = {}
): Promise<VLMResponse> => {
  const startTime = Date.now();
  
  if (model.provider === 'gemini') {
    const key = process.env.API_KEY;
    if (!key) throw new Error("Cloud Node Error: API Key missing from environment.");
    
    const ai = new GoogleGenAI({ apiKey: key });
    const parts: any[] = (options.images || []).map(img => ({
      inlineData: { data: img.data, mimeType: img.mimeType }
    }));
    parts.push({ text: prompt });

    try {
      const response = await ai.models.generateContent({
        model: model.modelName || 'gemini-3-flash-preview',
        contents: { parts },
        config: { 
          systemInstruction: options.system,
          responseMimeType: options.json ? "application/json" : undefined,
        }
      });

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

  const baseUrl = (model.apiUrl || 'http://localhost:1234/v1').replace(/\/$/, '');
  const isOllamaNative = model.provider === 'ollama' && !baseUrl.includes('/v1');
  const endpoint = isOllamaNative ? `${baseUrl}/api/chat` : `${baseUrl}/chat/completions`;

  const payload = isOllamaNative ? {
    model: model.modelName,
    messages: [{
        role: 'user',
        content: prompt,
        images: (options.images || []).map(i => i.data)
    }],
    stream: false,
    options: { temperature: 0.7 }
  } : {
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
        const errText = await response.text();
        throw new Error(`Inference Rejected: [${response.status}] ${errText || 'Verify local GGUF engine state.'}`);
    }

    const data = await response.json();
    const text = isOllamaNative ? data.message?.content : data.choices?.[0]?.message?.content;

    return {
      text: text || '',
      telemetry: {
        latency: Date.now() - startTime,
        provider: `Local Node (${model.name})`
      }
    };
  } catch (e: any) {
    if (e.name === 'TypeError' || e.message.includes('Failed to fetch')) {
        throw new Error(`PIPELINE SEVERED: Node at ${baseUrl} is unreachable. Ensure your GGUF engine is running and CORS is enabled.`);
    }
    throw e;
  }
};

export const generateTTS = async (text: string, model: LLMModel) => {
  if (model.provider === 'gemini') {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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