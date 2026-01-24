
import type { LoraFileWithPreview, LLMModel, ChatMessage, AudioAnalysisResult, ImageAnalysisResult, SoundStudioState, ImageStudioState, AnalyzerTuningConfig } from '../types';
import * as vlm from './vlmService';
import { GoogleGenAI } from "@google/genai";

// Analyze a LoRA file's metadata and structure with deep heuristic audit
export const analyzeLoraFile = async (file: LoraFileWithPreview, hash: string, model: LLMModel) => {
    const prompt = `Perform a forensic architectural audit of the following Safetensors/GGUF resource:
    - Filename: "${file.lora.name}"
    - Cryptographic Hash: ${hash}
    - Raw Header Snippet: ${file.metadata.substring(0, 4000)}

    Goal: Reconstruct the training profile. 
    Provide strict JSON including: 
    - modelType: (e.g. LoRA, Checkpoint, GGUF)
    - modelFamily: (e.g. SDXL, Pony, FLUX.1, Llama-3)
    - baseModel: (The version it was trained on)
    - triggerWords: (ARRAY - exhaustively find words that trigger this model's specific effect)
    - usageTips: (ARRAY - technical parameters for best result)
    - confidence: (0.0 to 1.0)
    - tags: (ARRAY - aesthetic categories)`;

    const res = await vlm.executeVLMAction(model, prompt, { 
      json: true, 
      system: "You are the AI HUB Neural Auditor. You excel at extracting meaning from binary headers and metadata strings. If information is missing, use technical inference based on file size and naming conventions." 
    });
    try {
        const cleaned = typeof res.text === 'string' ? res.text.replace(/```json|```/g, '').trim() : JSON.stringify(res.text);
        return JSON.parse(cleaned);
    } catch (e) {
        return { modelType: 'Neural Asset', confidence: 0.1, error: "Metadata parsing failed." };
    }
};

// Complex image analysis using Multimodal LLM
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
      if (tuning.artisticStylePreference && tuning.artisticStylePreference !== 'None') {
        instructions += `\nARTISTIC STYLE PREFERENCE: Analyze and describe the image leaning towards a '${tuning.artisticStylePreference}' aesthetic if plausible.`;
      }
      if (tuning.colorFilterPreference && tuning.colorFilterPreference !== 'None') {
        instructions += `\nCOLOR GRADE PREFERENCE: Apply a '${tuning.colorFilterPreference}' filter analysis to your description.`;
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
      
      Finally, provide a 'tunedPromptPreview' field which is a single, high-fidelity prompt for an image generator (like SDXL or Midjourney) that represents this image but with all the tuning adjustments applied. Incorporate the artistic style ('${tuning.artisticStylePreference}') and color filter ('${tuning.colorFilterPreference}') into this prompt.`;
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

export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = (e) => reject(e);
    });
};

export const generateImageWithAI = async (state: ImageStudioState, model?: LLMModel, activeLoras: any[] = []) => {
  if (state.provider === 'gemini') {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Augment prompt with LoRA triggers for Gemini
    const loraTriggers = activeLoras.flatMap(l => l.triggerWords).join(', ');
    const finalPrompt = loraTriggers ? `${loraTriggers}, ${state.prompt}` : state.prompt;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts: [{ text: finalPrompt }] },
      config: { imageConfig: { aspectRatio: state.aspectRatio as any, imageSize: "1K" } }
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            return `data:image/png;base64,${part.inlineData.data}`;
        }
    }
    throw new Error("Cloud generation failed to return image data.");
  } else {
    // Structural ComfyUI API Call
    const workflow = {
        "3": {
            "inputs": { "seed": Math.floor(Math.random() * 1000000), "steps": 25, "cfg": 7, "sampler_name": "euler_ancestral", "scheduler": "normal", "denoise": 1, "model": ["4", 0], "positive": ["6", 0], "negative": ["7", 0], "latent_image": ["5", 0] },
            "class_type": "KSampler"
        },
        "4": { "inputs": { "model_name": "v1-5-pruned-emaonly.safetensors" }, "class_type": "CheckpointLoaderSimple" },
        "6": { "inputs": { "text": state.prompt, "clip": ["4", 1] }, "class_type": "CLIPTextEncode" },
        "7": { "inputs": { "text": "blurry, low quality, distorted", "clip": ["4", 1] }, "class_type": "CLIPTextEncode" },
        "5": { "inputs": { "width": 512, "height": 512, "batch_size": 1 }, "class_type": "EmptyLatentImage" }
    };

    const res = await fetch('http://localhost:8188/prompt', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: workflow }) 
    });
    if (!res.ok) throw new Error("Local ComfyUI node not responding. Check OLLAMA_ORIGINS=\"*\" or equivalent.");
    return "comfy-task-queued";
  }
};

export const analyzeAudioWithLLM = async (audioFile: File, model: LLMModel): Promise<AudioAnalysisResult> => {
  const base64 = await fileToBase64(audioFile);
  const prompt = `Acoustic audit. Based on this audio resource, predict: title, artist, genre, bpm, key, mood, instrumentation (array), lyrics. Return JSON.`;
  const res = await vlm.executeVLMAction(model, prompt, {
    json: true,
    system: "Expert acoustic analyst. Return JSON only.",
    images: [] // placeholder for future multimodal audio support if needed
  });
  const cleaned = typeof res.text === 'string' ? res.text.replace(/```json|```/g, '').trim() : JSON.stringify(res.text);
  return JSON.parse(cleaned);
};

// Added probeExternalNode logic for custom LLM nodes
export const probeExternalNode = async (apiUrl: string, modelName: string, apiKey?: string): Promise<'online' | 'ready' | 'offline'> => {
    try {
        const response = await fetch(`${apiUrl.replace(/\/$/, '')}/models`, {
            headers: apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}
        });
        if (response.ok) return 'ready';
        return 'online';
    } catch (e) {
        return 'offline';
    }
};

// Added reformatLyricsWithAI using Gemini 3 Flash
export const reformatLyricsWithAI = async (lyrics: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Normalize and reformat the following song lyrics for professional sheet music layout. Correct typos and structure into verses/chorus:\n\n${lyrics}`,
    });
    return response.text || lyrics;
};

// Added composeMusicComposition for sound studio blueprints
export const composeMusicComposition = async (state: SoundStudioState, model?: LLMModel): Promise<{ blueprint: string }> => {
    const instructions = `Generate a detailed technical musical arrangement blueprint for a ${state.genre} track titled "${state.title}" at ${state.bpm} BPM in the key of ${state.key}. Mood: ${state.mood}. Instrumentation: ${state.instrumentation.join(', ')}. Lyrics context: ${state.lyrics}`;
    
    const res = await vlm.executeVLMAction(model || { id: 'default', name: 'Gemini 3 Flash', provider: 'gemini', modelName: 'gemini-3-flash-preview' } as any, instructions, {
      system: "Expert musical composer and arrangement strategist. Provide a structured, technical guide for DAW production."
    });
    return { blueprint: res.text };
};

// Added initializeIntegratedCore simulated sequence
export const initializeIntegratedCore = async (file: File): Promise<{ success: boolean }> => {
    // Simulated boot sequence for local node intake
    return new Promise((resolve) => {
        setTimeout(() => resolve({ success: true }), 2000);
    });
};

// Added analyzeVideoFrames for temporal frame sequence audit
export const analyzeVideoFrames = async (frames: string[], model: LLMModel): Promise<string> => {
    const prompt = `Perform a temporal audit of these sequential video frames. Describe the action, scene changes, and cinematic quality.`;
    const images = frames.map(f => ({ data: f.split(',')[1], mimeType: 'image/jpeg' }));
    
    const res = await vlm.executeVLMAction(model, prompt, {
      system: "Professional video analyst and temporal auditor.",
      images
    });
    return res.text;
};

// Added analyzeVideoSurface combining visual frames with file metadata
export const analyzeVideoSurface = async (frames: string[], videoFile: File, model: LLMModel): Promise<string> => {
    const prompt = `Perform a high-fidelity temporal and technical audit of this video asset. 
    Filename: ${videoFile.name}
    Size: ${(videoFile.size / (1024 * 1024)).toFixed(2)} MB
    Analyze the provided frames for motion, composition, and logical consistency.`;
    
    const images = frames.map(f => ({ data: f.split(',')[1], mimeType: 'image/jpeg' }));
    
    const res = await vlm.executeVLMAction(model, prompt, {
      system: "Professional video analyst and technical auditor. Combine visual frame analysis with file metadata insights.",
      images
    });
    return res.text;
};
