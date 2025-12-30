
import { GoogleGenAI, Modality, Type } from "@google/genai";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateText = async (prompt: string, model: string = 'gemini-3-flash-preview', systemInstruction?: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: { systemInstruction }
  });
  return response.text;
};

export const generateTextStream = async (prompt: string, model: string = 'gemini-3-flash-preview', systemInstruction?: string, onChunk?: (text: string) => void) => {
  const ai = getAI();
  const response = await ai.models.generateContentStream({
    model,
    contents: prompt,
    config: { systemInstruction }
  });
  for await (const chunk of response) {
    if (onChunk) onChunk(chunk.text || '');
  }
};

export const analyzeMultimodal = async (prompt: string, parts: any[], model: string = 'gemini-3-flash-preview') => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model,
    contents: { parts: [...parts, { text: prompt }] },
  });
  return response.text;
};

export const generateImage = async (prompt: string, aspectRatio: "1:1" | "3:4" | "4:3" | "9:16" | "16:9" = "1:1") => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: { parts: [{ text: prompt }] },
    config: {
      imageConfig: { aspectRatio, imageSize: "1K" }
    }
  });
  
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No image data returned from Gemini");
};

export const generateVocalDuo = async (text: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        multiSpeakerVoiceConfig: {
          speakerVoiceConfigs: [
            { speaker: 'Joe', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
            { speaker: 'Jane', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } }
          ]
        }
      }
    }
  });
  return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
};

export const decodeAudioPCM = async (base64Data: string, sampleRate: number = 24000) => {
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate });
  const dataInt16 = new Int16Array(bytes.buffer);
  const frameCount = dataInt16.length;
  const buffer = ctx.createBuffer(1, frameCount, sampleRate);
  const channelData = buffer.getChannelData(0);
  
  for (let i = 0; i < frameCount; i++) {
    channelData[i] = dataInt16[i] / 32768.0;
  }
  return { buffer, ctx };
};
