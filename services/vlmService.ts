
import { GoogleGenAI, Modality } from "@google/genai";
import type { LLMModel } from '../types';

/**
 * Enhanced Universal Multimodal Request Bridge
 * Handles routing to Gemini, Ollama (Vision), and OpenAI-compatible endpoints.
 */
export const executeVLMAction = async (
  model: LLMModel,
  prompt: string,
  options: { 
    system?: string, 
    images?: { data: string, mimeType: string }[],
    json?: boolean,
    audio?: boolean,
    temperature?: number
  } = {}
) => {
  const provider = model.provider;

  // 1. GEMINI NATIVE ROUTING
  if (provider === 'gemini') {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const parts: any[] = (options.images || []).map(img => ({
      inlineData: { data: img.data, mimeType: img.mimeType }
    }));
    parts.push({ text: prompt });

    const response = await ai.models.generateContent({
      model: model.modelName || 'gemini-3-flash-preview',
      contents: { parts },
      config: { 
        systemInstruction: options.system,
        responseMimeType: options.json ? "application/json" : undefined,
        temperature: options.temperature ?? 0.7
      }
    });
    return response.text;
  }

  // 2. UNIVERSAL PROVIDER (OpenAI / Ollama / Custom API)
  const baseUrl = (model.apiUrl || (provider === 'ollama' ? 'http://localhost:11434/v1' : '')).replace(/\/$/, '');
  const endpoint = options.audio ? `${baseUrl}/audio/speech` : `${baseUrl}/chat/completions`;

  const messages: any[] = [];
  if (options.system) messages.push({ role: 'system', content: options.system });

  // Handle Vision capability detection for non-Gemini models
  const hasImages = options.images && options.images.length > 0;
  let userContent: any;

  if (hasImages) {
    userContent = [{ type: 'text', text: prompt }];
    options.images?.forEach(img => {
      userContent.push({
        type: 'image_url',
        image_url: { url: `data:${img.mimeType};base64,${img.data}` }
      });
    });
  } else {
    userContent = prompt;
  }

  messages.push({ role: 'user', content: userContent });

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(model.apiKey ? { 'Authorization': `Bearer ${model.apiKey}` } : {}),
      ...(model.customHeaders?.reduce((acc, h) => ({ ...acc, [h.key]: h.value }), {}) || {})
    },
    body: JSON.stringify({
      model: model.modelName,
      messages,
      response_format: options.json ? { type: 'json_object' } : undefined,
      temperature: options.temperature ?? 0.7,
      stream: false
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Kernel Error (${provider}): ${err || response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
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
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } }
        }
      }
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  }

  // Fallback: OpenAI-compatible /v1/audio/speech
  const baseUrl = model.apiUrl?.replace(/\/v1\/?$/, '') || 'http://localhost:11434';
  try {
    const response = await fetch(`${baseUrl}/v1/audio/speech`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(model.apiKey ? { 'Authorization': `Bearer ${model.apiKey}` } : {})
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: 'alloy'
      })
    });
    
    if (response.ok) {
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(blob);
      });
    }
  } catch (e) {
    console.warn("TTS Backend unreachable.");
  }
  return null;
};
