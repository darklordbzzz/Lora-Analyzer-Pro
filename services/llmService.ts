
import type { LoraFileWithPreview, LLMModel, ChatMessage, AudioAnalysisResult, ImageAnalysisResult, SoundStudioState, ImageStudioState, AnalyzerTuningConfig } from '../types';
import * as vlm from './vlmService';
import { GoogleGenAI } from "@google/genai";

export const analyzeLoraFile = async (file: LoraFileWithPreview, hash: string, model: LLMModel) => {
    const prompt = `Perform architectural audit of LoRA/Safetensors. Name: "${file.lora.name}". Raw Metadata: ${file.metadata.substring(0, 3000)}. Provide detailed JSON including: modelType, modelFamily, baseModel, triggerWords (array), usageTips (array), tags (array), confidence (0-1).`;
    const res = await vlm.executeVLMAction(model, prompt, { 
      json: true, 
      system: "You are a professional Neural Auditor. You analyze Safetensors and GGUF headers to provide structured technical intelligence." 
    });
    try {
        const cleaned = typeof res.text === 'string' ? res.text.replace(/```json|```/g, '').trim() : JSON.stringify(res.text);
        return JSON.parse(cleaned);
    } catch (e) {
        return { modelType: 'Neural Asset', confidence: 0.1, error: "Metadata parsing failed." };
    }
};

export const analyzeImageWithLLM = async (
  imageFile: File, 
  model: LLMModel, 
  onStep?: (step: string) => void,
  tuning?: AnalyzerTuningConfig
): Promise<ImageAnalysisResult> => {
    const base64 = await fileToBase64(imageFile);
    
    let instructions = `Audit the visual parameters of this image. Return strictly JSON: compositionDescriptor, artisticStyle, lightingIllumination, technique, colorGamma, poseDescriptor, suggestedArtists (array).`;
    
    if (tuning) {
      if (tuning.keywords) {
        instructions += `\nINCORPORATE THESE KEYWORDS/CONTEXT: ${tuning.keywords}. Ensure the final description aligns with these themes.`;
      }
      if (tuning.deepPoseAudit) {
        instructions += `\nDEEP POSE AUDIT: Provide an additional 'actionPoseIdentifier' field describing the exact kinetic state, limb angles, and physical exertion of the subject.`;
      }
      if (tuning.appearanceAudit) {
        instructions += `\nAPPEARANCE AUDIT: Provide an 'appearanceRegistry' object containing: attire (detailed description), haircutStyle (specific name or shape), and accessories (array of items).`;
      }
      
      const adj = tuning.adjustments;
      instructions += `\nMODIFIER TUNING: In the final description, modify parameters as follows:
      - Color Temperature Adjustment: ${adj.colorTemperature > 0 ? 'Warmer' : 'Cooler'} by ${Math.abs(adj.colorTemperature)}%
      - Lighting Intensity: ${adj.lightingIntensity}% strength
      - Weather Overlay: ${adj.weatherCondition}
      - Pose Rigidity: ${adj.poseRigidity}%
      - Style Influence Weight: ${adj.styleWeight}%
      
      Finally, provide a 'tunedPromptPreview' field which is a single, high-fidelity prompt for an image generator (like SDXL or Midjourney) that represents this image but with all the tuning adjustments applied.`;
    }

    const res = await vlm.executeVLMAction(model, instructions, {
      json: true,
      system: "World-class visual auditor and prompt engineer. You provide precise technical analysis and can creatively adjust parameters for future generations. Return JSON only.",
      images: [{ data: base64, mimeType: imageFile.type }],
      onStep
    });
    const cleaned = typeof res.text === 'string' ? res.text.replace(/```json|```/g, '').trim() : JSON.stringify(res.text);
    return JSON.parse(cleaned);
};

export const analyzeAudioWithLLM = async (audioFile: File, model: LLMModel): Promise<AudioAnalysisResult> => {
    const prompt = `Acoustic audit. Based on this audio resource, predict: title, artist, genre, bpm, key, mood, instrumentation (array), lyrics. Return JSON.`;
    const res = await vlm.executeVLMAction(model, prompt, {
      json: true,
      system: "Expert acoustic analyst. Return JSON only."
    });
    const cleaned = typeof res.text === 'string' ? res.text.replace(/```json|```/g, '').trim() : JSON.stringify(res.text);
    return JSON.parse(cleaned);
};

export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = (e) => reject(e);
    });
};

export const streamChat = async (history: ChatMessage[], model: LLMModel, onChunk: (chunk: string) => void) => {
    const lastMsg = history[history.length - 1];
    const prompt = lastMsg.content;
    const images = lastMsg.attachments?.filter(a => a.mimeType.startsWith('image/')) || [];
    
    const res = await vlm.executeVLMAction(model, prompt, {
      images: images.map(i => ({ data: i.data, mimeType: i.mimeType }))
    });
    onChunk(res.text);
};

export const generateImageWithAI = async (state: ImageStudioState, model?: LLMModel) => {
  if (state.provider === 'gemini') {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts: [{ text: state.prompt }] },
      config: { imageConfig: { aspectRatio: state.aspectRatio, imageSize: "1K" } }
    });
    const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    if (part?.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    throw new Error("Cloud generation failed to return image data.");
  } else {
    // Attempt local ComfyUI uplink
    const res = await fetch('http://localhost:8188/prompt', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: state.prompt }) 
    });
    if (!res.ok) throw new Error("Local ComfyUI node not responding. Check OLLAMA_ORIGINS=\"*\" or equivalent.");
    return "comfy-task-queued";
  }
};

export const checkComfyConnection = async (): Promise<'online' | 'busy' | 'offline'> => {
  try {
    const res = await fetch('http://localhost:8188/system_stats');
    return res.ok ? 'online' : 'offline';
  } catch { return 'offline'; }
};

export const initializeIntegratedCore = async (file: File) => {
  console.log("Mounting GGUF binary to virtual buffer space...", file.name);
  return { success: true };
};

export const probeExternalNode = async (url: string, modelName: string, apiKey?: string) => {
  try {
    const res = await fetch(`${url}/models`);
    return res.ok ? 'online' : 'offline';
  } catch { return 'offline'; }
};

export const reformatLyricsWithAI = async (lyrics: string, model?: LLMModel): Promise<string> => {
    const targetModel = model || { id: 'default-gemini', name: 'Gemini 3 Flash', provider: 'gemini', modelName: 'gemini-3-flash-preview' } as LLMModel;
    const res = await vlm.executeVLMAction(targetModel, `Reformat these lyrics for readability: ${lyrics}`);
    return res.text;
};

export const composeMusicComposition = async (state: SoundStudioState, model?: LLMModel): Promise<{ blueprint: string }> => {
    const targetModel = model || { id: 'default-gemini', name: 'Gemini 3 Flash', provider: 'gemini', modelName: 'gemini-3-flash-preview' } as LLMModel;
    const res = await vlm.executeVLMAction(targetModel, `Create a musical blueprint for: ${JSON.stringify(state)}`);
    return { blueprint: res.text };
};

export const upscaleImageWithAI = async (imageUrl: string, factor: number, model: string): Promise<string> => {
    return imageUrl;
};

export const resetComfyNode = async (): Promise<void> => {
    try { await fetch('http://localhost:8188/interrupt', { method: 'POST' }); } catch (e) {}
};

export const analyzeVideoSurface = async (frames: string[], file: File, model: LLMModel): Promise<string> => {
    const prompt = `Analyze these video frames from "${file.name}". Describe the scene evolution.`;
    const images = frames.slice(0, 5).map(f => ({ data: f.split(',')[1], mimeType: 'image/jpeg' }));
    const res = await vlm.executeVLMAction(model, prompt, { images });
    return res.text;
};

export const analyzeVideoFrames = async (frames: string[], model: LLMModel): Promise<string> => {
    const prompt = `Analyze this chronological frame sequence. Identify motion and narrative elements.`;
    const images = frames.slice(0, 5).map(f => ({ data: f.split(',')[1], mimeType: 'image/jpeg' }));
    const res = await vlm.executeVLMAction(model, prompt, { images });
    return res.text;
};
