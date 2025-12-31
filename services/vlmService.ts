
import { GoogleGenAI, Modality } from "@google/genai";
import type { LLMModel, ChatMessage } from '../types';

/**
 * Universal Multimodal Request Bridge
 */
export const executeVLMAction = async (
  model: LLMModel,
  prompt: string,
  options: { 
    system?: string, 
    images?: { data: string, mimeType: string }[],
    json?: boolean,
    audio?: boolean
  } = {}
) => {
  const provider = model.provider;

  // 1. GEMINI ROUTING (Native SDK)
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
        responseMimeType: options.json ? "application/json" : undefined
      }
    });
    return response.text;
  }

  // 2. OPENAI / OLLAMA / CUSTOM ROUTING (Standard API)
  const baseUrl = (model.apiUrl || (provider === 'ollama' ? 'http://localhost:11434/v1' : '')).replace(/\/$/, '');
  const endpoint = options.audio ? `${baseUrl}/audio/speech` : `${baseUrl}/chat/completions`;

  const messages: any[] = [];
  if (options.system) messages.push({ role: 'system', content: options.system });

  const userContent: any[] = [{ type: 'text', text: prompt }];
  if (options.images) {
    options.images.forEach(img => {
      userContent.push({
        type: 'image_url',
        image_url: { url: `data:${img.mimeType};base64,${img.data}` }
      });
    });
  }

  messages.push({ role: 'user', content: userContent });

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(model.apiKey ? { 'Authorization': `Bearer ${model.apiKey}` } : {})
    },
    body: JSON.stringify({
      model: model.modelName,
      messages,
      response_format: options.json ? { type: 'json_object' } : undefined,
      stream: false
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`VLM Provider Error: ${err}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
};

export const generateTTS = async (text: string, model: LLMModel) => {
  // If Gemini, use the native audio modality
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

  // Fallback to OpenAI-compatible TTS if available
  const baseUrl = model.apiUrl?.replace(/\/v1\/?$/, '') || '';
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
  return null;
};
