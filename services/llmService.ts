
import type { LoraFileWithPreview, LLMModel, ChatMessage, AudioAnalysisResult, ImageAnalysisResult, SoundStudioState, ImageStudioState } from '../types';
import * as vlm from './vlmService';
import { GoogleGenAI } from "@google/genai";

/* Fix: Audit analysis of LoRA metadata using VLM */
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

/* Fix: Visual analysis of image data - Enhanced for professional prompt engineering results */
export const analyzeImageWithLLM = async (imageFile: File, model: LLMModel): Promise<ImageAnalysisResult> => {
    const base64 = await fileToBase64(imageFile);
    const prompt = `Analyze visual data for professional generative AI prompt engineering. 
    Return strictly JSON with the following keys:
    1. compositionDescriptor: A detailed description of subject, positioning, and framing.
    2. artisticStyle: The specific artistic movements, genres, and styles present.
    3. lightingIllumination: Detailed audit of light sources, quality, and atmospheric effects.
    4. technique: Digital or traditional techniques detected (e.g., rendering style, brushwork).
    5. colorGamma: Predominant colors, palette characteristics, and color contrast.
    6. suggestedArtists: An array of artists (min 5) whose style aligns with this image.`;

    const text = await vlm.executeVLMAction(model, prompt, {
      json: true,
      system: "You are a World-Class Prompt Engineer and Visual Auditor. Your goal is to provide high-fidelity descriptions for reconstruction. Always return JSON.",
      images: [{ data: base64, mimeType: imageFile.type }]
    });
    const cleaned = typeof text === 'string' ? text.replace(/```json|```/g, '').trim() : JSON.stringify(text);
    return JSON.parse(cleaned);
};

/* Fix: Acoustic analysis via VLM proxy */
export const analyzeAudioWithLLM = async (audioFile: File, model: LLMModel): Promise<AudioAnalysisResult> => {
    const base64 = await fileToBase64(audioFile);
    const prompt = "Audit acoustic data. Return JSON: title, artist, album, genre, bpm (number), key, mood, instrumentation (array), lyrics, description.";
    const text = await vlm.executeVLMAction(model, prompt, {
      json: true,
      images: [{ data: base64, mimeType: audioFile.type }] // VLM vision logic used as audio proxy if supported
    });
    const cleaned = typeof text === 'string' ? text.replace(/```json|```/g, '').trim() : JSON.stringify(text);
    return JSON.parse(cleaned);
};

/* Fix: Helper for converting file to base64 */
export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = (e) => reject(e);
    });
};

/* Fix: GGUF core initialization stub */
export const initializeIntegratedCore = async (file: File): Promise<{ success: boolean; error?: string }> => {
  // Logic for GGUF mounting simulation
  return { success: true };
};

/* Fix: Probe connectivity of external model nodes */
export const probeExternalNode = async (url: string, modelName: string, apiKey?: string): Promise<'online' | 'ready' | 'offline'> => {
    try {
        const res = await fetch(`${url}/models`);
        return res.ok ? 'online' : 'offline';
    } catch { return 'offline'; }
};

/* Fix: Chat streaming logic with updated onChunk signature to handle thoughts */
export const streamChat = async (history: ChatMessage[], model: LLMModel, onChunk: (chunk: string, thought: string) => void) => {
    const lastMsg = history[history.length - 1];
    const prompt = lastMsg.content;
    const images = lastMsg.attachments?.filter(a => a.mimeType.startsWith('image/')) || [];
    
    const text = await vlm.executeVLMAction(model, prompt, {
      images: images.map(i => ({ data: i.data, mimeType: i.mimeType }))
    });
    // In current implementation executeVLMAction returns full string; satisfy the 2-arg signature
    onChunk(text, "");
};

/* Fix: Music composition blueprint generation */
export const composeMusicComposition = async (state: SoundStudioState, model?: LLMModel) => {
    const prompt = `Create a music production blueprint for a ${state.genre} track at ${state.bpm} BPM. Return JSON: blueprint, sunoPrompt.`;
    const text = await vlm.executeVLMAction(model || { id: 'def', name: 'Default', provider: 'gemini', modelName: 'gemini-3-flash-preview' }, prompt, { json: true });
    return JSON.parse(typeof text === 'string' ? text.replace(/```json|```/g, '').trim() : JSON.stringify(text));
};

/* Fix: Lyrics formatting via LLM */
export const reformatLyricsWithAI = async (lyrics: string, model?: LLMModel): Promise<string> => {
    return await vlm.executeVLMAction(model || { id: 'def', name: 'Default', provider: 'gemini', modelName: 'gemini-3-flash-preview' }, `Format these lyrics professionally with markers: \n\n${lyrics}`);
};

/* Fix: Video surface audit based on frames and file data */
export const analyzeVideoSurface = async (frames: string[], file: File, model: LLMModel): Promise<string> => {
    const prompt = `Analyze this video asset. Filename: ${file.name}, Size: ${file.size} bytes. Provide a technical audit of the visual content based on these frames.`;
    return await vlm.executeVLMAction(model, prompt, {
        images: frames.map(f => ({ data: f.split(',')[1], mimeType: 'image/jpeg' }))
    });
};

/* Fix: Video frame sequence analysis */
export const analyzeVideoFrames = async (frames: string[], model: LLMModel): Promise<string> => {
    const prompt = `Analyze these video frames and describe the motion, lighting, and subjects detected.`;
    return await vlm.executeVLMAction(model, prompt, {
        images: frames.map(f => ({ data: f.split(',')[1], mimeType: 'image/jpeg' }))
    });
};

/* Fix: Image generation logic for Studio */
export const generateImageWithAI = async (state: ImageStudioState, model?: LLMModel) => {
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
    throw new Error("No image data returned from generator.");
};

/* Fix: Image upscaling placeholder */
export const upscaleImageWithAI = async (image: string, factor: number, model?: LLMModel): Promise<string> => {
    return image;
};

/* Fix: Check local ComfyUI node connectivity */
export const checkComfyConnection = async (): Promise<'online' | 'busy' | 'offline'> => {
    try {
        const res = await fetch('http://localhost:8188/system_stats');
        return res.ok ? 'online' : 'offline';
    } catch {
        return 'offline';
    }
};

/* Fix: Reset local ComfyUI node VRAM */
export const resetComfyNode = async (): Promise<void> => {
    // Stub for node reset logic
};
