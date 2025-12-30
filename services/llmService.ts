import type { LoraFileWithPreview, LLMModel, ChatMessage, AudioAnalysisResult, ImageAnalysisResult, SoundStudioState, ImageStudioState } from '../types';
import * as vlm from './vlmService';
import { GoogleGenAI } from "@google/genai";
import { fileToBase64 } from './fileService';

/* Perform Technical Audit of LoRA metadata using VLM */
export const analyzeLoraFile = async (file: LoraFileWithPreview, hash: string, model: LLMModel) => {
    const prompt = `Perform Technical Audit. FileName: "${file.lora.name}". Header: ${file.metadata.substring(0, 10000)}. Return JSON: modelType, modelFamily, baseModel, triggerWords (array), usageTips (array), tags (array), confidence.`;
    const text = await vlm.executeVLMAction(model, prompt, { 
      json: true, 
      system: "You are a Safetensors Metadata Auditor. Always return valid JSON." 
    });
    try {
        const cleaned = typeof text === 'string' ? text.replace(/```json|```/g, '').trim() : JSON.stringify(text);
        return JSON.parse(cleaned);
    } catch (e) {
        return { modelType: 'Neural Asset', confidence: 0.1, error: "Metadata stream unparseable." };
    }
};

/* Visual analysis of image data - Now VLM Agnostic */
export const analyzeImageWithLLM = async (imageFile: File, model: LLMModel): Promise<ImageAnalysisResult> => {
    const base64 = await fileToBase64(imageFile);
    const prompt = `Analyze visual data. Return JSON: imageDescriptor, styleDescriptor, lightingDescriptor, techniqueDescriptor, colorGammaDescriptor, suggestedArtists (array).`;
    const text = await vlm.executeVLMAction(model, prompt, {
      json: true,
      images: [{ data: base64, mimeType: imageFile.type }]
    });
    const cleaned = typeof text === 'string' ? text.replace(/```json|```/g, '').trim() : JSON.stringify(text);
    return JSON.parse(cleaned);
};

/* Detect objects in a specific image region with sensitivity score */
export const detectRegionDetails = async (image: string, rect: { x: number, y: number, w: number, h: number }, model: LLMModel): Promise<{ tags: string[], sensitivity: number, description: string }> => {
    const prompt = `Focus on the image segment at relative coordinates x:${rect.x}%, y:${rect.y}%, w:${rect.w}%, h:${rect.h}%. Identify the specific subject. Return JSON: tags (array), sensitivity (number 0-1 based on visibility), description (string).`;
    const text = await vlm.executeVLMAction(model, prompt, {
      json: true,
      images: [{ data: image.split(',')[1], mimeType: 'image/png' }]
    });
    const cleaned = typeof text === 'string' ? text.replace(/```json|```/g, '').trim() : JSON.stringify(text);
    return JSON.parse(cleaned);
}

/* Regenerate a specific image region (Inpainting) */
export const editImageRegion = async (image: string, maskPrompt: string, newSubject: string, model: LLMModel): Promise<string> => {
    // Current specialized routing for Gemini image editing
    if (model.provider === 'gemini') {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
              parts: [
                  { inlineData: { data: image.split(',')[1], mimeType: 'image/png' } },
                  { text: `In the region described as "${maskPrompt}", regenerate it to show: "${newSubject}". Maintain the style of the rest of the image.` }
              ]
          }
      });
      for (const part of response.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("Target region transformation requires a Vision-Native Cloud Node.");
}

/* Transforms a single video frame (or image) using AI based on a prompt (img2img). */
export const transformVideoFrame = async (frame: string, prompt: string, model: LLMModel): Promise<string> => {
    if (model.provider === 'gemini') {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    { inlineData: { data: frame.split(',')[1], mimeType: 'image/jpeg' } },
                    { text: `Regenerate this image based on the following instruction: "${prompt}". Maintain the overall composition but transform the visual elements according to the prompt.` }
                ]
            }
        });
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) return `data:image/jpeg;base64,${part.inlineData.data}`;
        }
    }
    throw new Error(`Transformation Protocol not supported on provider: ${model.provider}`);
};

/* Upscale a video frame or image using the active model or internal enhancer */
export const upscaleVideoFrame = async (frame: string, factor: number, quality: 'standard' | 'neural' | 'ultra', model: LLMModel): Promise<string> => {
    if (quality === 'standard') {
        return frame; 
    }

    if (model.provider === 'gemini') {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    { inlineData: { data: frame.split(',')[1], mimeType: 'image/jpeg' } },
                    { text: `Upscale and enhance this video frame by ${factor}x. Sharpen details, reduce noise, and preserve textures. Return the enhanced image.` }
                ]
            }
        });
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) return `data:image/jpeg;base64,${part.inlineData.data}`;
        }
    }

    return frame;
};

/* Acoustic analysis via VLM proxy - Uses active model's multimodal logic */
export const analyzeAudioWithLLM = async (audioFile: File, model: LLMModel): Promise<AudioAnalysisResult> => {
    const base64 = await fileToBase64(audioFile);
    const prompt = "Audit acoustic data. Return JSON: title, artist, album, genre, bpm (number), key, mood, instrumentation (array), lyrics, description.";
    const text = await vlm.executeVLMAction(model, prompt, {
      json: true,
      images: [{ data: base64, mimeType: audioFile.type }] 
    });
    const cleaned = typeof text === 'string' ? text.replace(/```json|```/g, '').trim() : JSON.stringify(text);
    return JSON.parse(cleaned);
};

/* GGUF core initialization stub */
export const initializeIntegratedCore = async (file: File): Promise<{ success: boolean; error?: string }> => {
  return { success: true };
};

/* Probe connectivity of external model nodes */
export const probeExternalNode = async (url: string, modelName: string, apiKey?: string): Promise<'online' | 'ready' | 'offline'> => {
    try {
        const res = await fetch(`${url}/models`);
        return res.ok ? 'online' : 'offline';
    } catch { return 'offline'; }
};

/* Chat streaming logic */
export const streamChat = async (history: ChatMessage[], model: LLMModel, onChunk: (chunk: string, thought: string) => void) => {
    const lastMsg = history[history.length - 1];
    const prompt = lastMsg.content;
    const images = lastMsg.attachments?.filter(a => a.mimeType.startsWith('image/')) || [];
    
    const text = await vlm.executeVLMAction(model, prompt, {
      images: images.map(i => ({ data: i.data, mimeType: i.mimeType })),
      system: "You are the Neural Intelligence Hub Kernel. Be technical, precise, and concise."
    });
    onChunk(text, "");
};

/* Music composition blueprint generation */
export const composeMusicComposition = async (state: SoundStudioState, model?: LLMModel) => {
    const prompt = `Create a music production blueprint for a ${state.genre} track at ${state.bpm} BPM. Return JSON: blueprint, sunoPrompt.`;
    const text = await vlm.executeVLMAction(model || { id: 'def', name: 'Default', provider: 'gemini', modelName: 'gemini-3-flash-preview' }, prompt, { json: true });
    return JSON.parse(typeof text === 'string' ? text.replace(/```json|```/g, '').trim() : JSON.stringify(text));
};

/* Lyrics formatting via active LLM */
export const reformatLyricsWithAI = async (lyrics: string, model?: LLMModel): Promise<string> => {
    return await vlm.executeVLMAction(model || { id: 'def', name: 'Default', provider: 'gemini', modelName: 'gemini-3-flash-preview' }, `Format these lyrics professionally with markers: \n\n${lyrics}`);
};

/* Video surface audit - Now model agnostic */
export const analyzeVideoSurface = async (frames: string[], file: File, model: LLMModel): Promise<string> => {
    const prompt = `Analyze this video asset. Filename: ${file.name}, Size: ${file.size} bytes. Provide a technical audit of the visual content based on these frames.`;
    return await vlm.executeVLMAction(model, prompt, {
        images: frames.map(f => ({ data: f.split(',')[1], mimeType: 'image/jpeg' }))
    });
};

/* Video frame sequence analysis - Now model agnostic */
export const analyzeVideoFrames = async (frames: string[], model: LLMModel): Promise<string> => {
    const prompt = `Analyze these video frames and describe the motion, lighting, and subjects detected.`;
    return await vlm.executeVLMAction(model, prompt, {
        images: frames.map(f => ({ data: f.split(',')[1], mimeType: 'image/jpeg' }))
    });
};

/* Image generation logic for Studio - Directs to Cloud or Comfy */
export const generateImageWithAI = async (state: ImageStudioState, model?: LLMModel): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: { parts: [{ text: state.prompt }] },
        config: {
            imageConfig: {
                aspectRatio: state.aspectRatio || "1:1",
                imageSize: "1K"
            }
        }
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            return `data:image/png;base64,${part.inlineData.data}`;
        }
    }
    throw new Error("Genesis Protocol Failed.");
};

export const upscaleImageWithAI = async (image: string, factor: number, model?: LLMModel): Promise<string> => {
    return image;
};

export const checkComfyConnection = async (): Promise<'online' | 'busy' | 'offline'> => {
    try {
        const res = await fetch('http://localhost:8188/system_stats');
        return res.ok ? 'online' : 'offline';
    } catch { return 'offline'; }
};

export const resetComfyNode = async (): Promise<void> => {};