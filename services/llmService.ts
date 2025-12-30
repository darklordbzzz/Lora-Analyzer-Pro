
import { GoogleGenAI, Type, Modality } from "@google/genai";
import type { LoraFileWithPreview, LLMModel, ChatMessage, AudioAnalysisResult, ImageAnalysisResult, SoundStudioState, ImageStudioState, LoraAnalysis, AudioEngineNode } from '../types';

export type { ImageAnalysisResult };

const sanitizeValue = (val: any): string => {
    if (val === null || val === undefined) return '';
    if (typeof val === 'string') return val;
    return String(val);
};

const sanitizeArray = (val: any): string[] => {
    if (Array.isArray(val)) return val.map(v => sanitizeValue(v)).filter(v => v.trim() !== '');
    if (typeof val === 'string') return val.split(',').map(s => s.trim()).filter(s => s !== '');
    return [];
};

const sanitizeAudioResult = (raw: any): AudioAnalysisResult => ({
    title: sanitizeValue(raw.title || raw.name || 'Untitled Analysis'),
    artist: sanitizeValue(raw.artist || raw.author || 'Unknown Artist'),
    album: sanitizeValue(raw.album || 'Studio Session'),
    genre: sanitizeValue(raw.genre || 'Uncategorized'),
    bpm: typeof raw.bpm === 'number' ? raw.bpm : parseInt(sanitizeValue(raw.bpm)) || 120,
    key: sanitizeValue(raw.key || 'C Major'),
    mood: sanitizeValue(raw.mood || 'Neutral'),
    instrumentation: sanitizeArray(raw.instrumentation || raw.instruments),
    lyrics: sanitizeValue(raw.lyrics || raw.text || ''),
    description: sanitizeValue(raw.description || raw.summary || '')
});

const sanitizeLoraResult = (raw: any): Partial<LoraAnalysis> => ({
    modelType: sanitizeValue(raw.modelType || raw.type || 'LoRA'),
    modelFamily: sanitizeValue(raw.modelFamily || raw.architecture || 'SDXL'),
    baseModel: sanitizeValue(raw.baseModel || raw.version || 'Unknown'),
    triggerWords: sanitizeArray(raw.triggerWords || raw.words || raw.tags),
    usageTips: sanitizeArray(raw.usageTips || raw.tips || raw.instructions),
    tags: sanitizeArray(raw.tags || raw.keywords),
    confidence: typeof raw.confidence === 'number' ? raw.confidence : 0.95,
});

function pcmToWav(pcmBase64: string, sampleRate: number = 24000): Blob {
    const binaryString = atob(pcmBase64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
    const buffer = new ArrayBuffer(44 + bytes.length);
    const view = new DataView(buffer);
    const writeString = (offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
    };
    writeString(0, 'RIFF');
    view.setUint32(4, 32 + bytes.length, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); 
    view.setUint16(22, 1, true); 
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, bytes.length, true);
    const data = new Uint8Array(buffer, 44);
    data.set(bytes);
    return new Blob([buffer], { type: 'audio/wav' });
}

export const generateAudioAgnostic = async (prompt: string, engineId: string, signal?: AbortSignal): Promise<string> => {
    const stored = localStorage.getItem('lora-analyzer-pro-audio-nodes');
    const nodes: AudioEngineNode[] = stored ? JSON.parse(stored) : [];
    
    let node = nodes.find(n => n.modelName === engineId);

    if (node?.provider === 'huggingface' || (!node && engineId.includes('/'))) {
        const hfToken = node?.apiKey || localStorage.getItem('lora-analyzer-hf-token');
        if (!hfToken) throw new Error("Acoustic Ingestion Blocked: HF API Key required in Setup.");

        const API_URL = `https://api-inference.huggingface.co/models/${engineId}`;
        const payload: any = { inputs: prompt };
        if (engineId.includes('musicgen')) payload.parameters = { duration: 10 };
        if (engineId.includes('stable-audio')) payload.parameters = { seconds_total: 10 };

        const response = await fetch(API_URL, {
            headers: { Authorization: `Bearer ${hfToken}`, "Content-Type": "application/json" },
            method: "POST",
            body: JSON.stringify(payload),
            signal: signal 
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(`HF Node Error [${response.status}]: ${errData.error || response.statusText}`);
        }

        const result = await response.blob();
        return URL.createObjectURL(result);
    }

    if (engineId === 'suno-v3-bridge') {
        const sunoEndpoint = localStorage.getItem('lora-analyzer-suno-endpoint') || 'http://localhost:3000/api/generate';
        const response = await fetch(sunoEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, make_instrumental: true, wait_audio: true }),
            signal: signal
        });
        if (!response.ok) throw new Error("Suno Bridge unreachable.");
        const data = await response.json();
        return data[0].audio_url || data[0].url;
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Generate a high quality music description and vocal preview based on: ${prompt}` }] }],
        config: { 
            responseModalities: [Modality.AUDIO], 
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } } 
        },
    });
    const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64) return URL.createObjectURL(pcmToWav(base64));
    
    throw new Error("Acoustic synthesis pipeline failed.");
};

export const streamChat = async (history: ChatMessage[], model: LLMModel, onChunk: (chunk: string, thought?: string) => void) => {
    const isIntegrated = model.apiUrl === 'integrated://core';
    if (model.provider === 'gemini' || isIntegrated) {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContentStream({
            model: model.modelName || 'gemini-3-flash-preview',
            contents: history.map(h => ({ role: h.role === 'assistant' ? 'model' : 'user', parts: [{ text: h.content }] })),
            config: { systemInstruction: "You are a specialized AI model analyzer." }
        });
        for await (const chunk of response) onChunk(chunk.text || '');
    } else {
        const cleanUrl = (model.apiUrl || 'http://localhost:11434/v1').replace(/\/$/, '');
        const res = await fetch(`${cleanUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: model.modelName, messages: history.map(h => ({ role: h.role, content: h.content })), stream: true })
        });
        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        while (reader) {
            const { done, value } = await reader.read();
            if (done) break;
            const lines = decoder.decode(value).split('\n');
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.substring(6));
                        onChunk(data.choices[0]?.delta?.content || '');
                    } catch (e) {}
                }
            }
        }
    }
};

export const analyzeImageWithLLM = async (imageFile: File, llmModel: LLMModel): Promise<ImageAnalysisResult> => {
    const base64 = await fileToBase64(imageFile);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [ { inlineData: { mimeType: imageFile.type, data: base64 } }, { text: `Analyze image for reproduction. JSON: imageDescriptor, styleDescriptor, lightingDescriptor, techniqueDescriptor, colorGammaDescriptor, suggestedArtists (array).` } ] },
        config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || '{}');
};

export const analyzeAudioWithLLM = async (audioFile: File, model?: LLMModel): Promise<AudioAnalysisResult> => {
    if (!model) throw new Error("No model selected.");
    const base64 = await fileToBase64(audioFile);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [ { inlineData: { mimeType: audioFile.type, data: base64 } }, { text: "Analyze audio. Return JSON: title, artist, album, genre, bpm (number), key, mood, instrumentation (array), lyrics, description." } ] },
        config: { responseMimeType: "application/json" }
    });
    return sanitizeAudioResult(JSON.parse(response.text || '{}'));
};

export const analyzeVideoSurface = async (frames: string[], videoFile: File, llmModel: LLMModel): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Convert frames to Parts
    const frameParts = frames.map(f => ({
        inlineData: {
            mimeType: 'image/jpeg',
            data: f.split(',')[1]
        }
    }));
    
    // We send a slice of the video file for audio context (limit to first 10MB to be safe for inlineData)
    const videoSlice = videoFile.size > 10 * 1024 * 1024 ? videoFile.slice(0, 10 * 1024 * 1024) : videoFile;
    const videoBase64 = await fileToBase64(videoSlice as File);
    const safeMimeType = videoFile.type || 'video/mp4';

    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { 
            parts: [
                ...frameParts,
                { inlineData: { mimeType: safeMimeType, data: videoBase64 } },
                { text: "Perform an integrated 'Surface Audit' of this video asset. Analyze the visual progression through the provided 10 keyframes and cross-reference with the audio track of the video bitstream. Your report should include: 1) Visual Composition & Style, 2) Acoustic & Narrative Audit (based on audio), and 3) Final Cross-modal Conclusion. Be technical and precise." }
            ] 
        }
    });
    return response.text || 'Integrated Surface Audit inconclusive.';
};

export const analyzeVideoFrames = async (frames: string[], llmModel: LLMModel): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const parts = frames.map(f => ({
        inlineData: {
            mimeType: 'image/jpeg',
            data: f.split(',')[1]
        }
    }));
    
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { 
            parts: [
                ...parts,
                { text: "Analyze this series of frames from a video (temporal sequence). Provide a high-level 'Surface Audit' describing the visual progression, key subjects, cinematic style, and any notable motion or scene transitions observed across the sequence. Be concise but technical." }
            ] 
        }
    });
    return response.text || 'Surface Audit inconclusive.';
};

export const analyzeLoraFile = async (file: LoraFileWithPreview, hash: string, model: LLMModel) => {
    const prompt = `Perform a high-fidelity Technical Audit of file "${file.lora.name}". Header Buffer: ${file.metadata.substring(0, 5000)}. Return strictly JSON.`;
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { responseMimeType: "application/json" }
    });
    return sanitizeLoraResult(JSON.parse(response.text || '{}'));
};

export const checkComfyConnection = async (): Promise<'online' | 'busy' | 'offline'> => {
    let url = (localStorage.getItem('lora-analyzer-pro-comfy-url') || 'http://127.0.0.1:8188').replace(/\/$/, '');
    try {
        const [statsRes, queueRes] = await Promise.all([
            fetch(`${url}/system_stats`, { mode: 'cors', cache: 'no-cache' }),
            fetch(`${url}/queue`, { mode: 'cors', cache: 'no-cache' })
        ]);
        if (!statsRes.ok || !queueRes.ok) return 'offline';
        const queueData = await queueRes.json();
        return (queueData.queue_running?.length > 0) || (queueData.queue_pending?.length > 0) ? 'busy' : 'online';
    } catch (e) { return 'offline'; }
};

export const generateImageWithAI = async (state: ImageStudioState, activeModel?: LLMModel): Promise<string> => {
    if (state.provider === 'comfyui') {
        let url = (localStorage.getItem('lora-analyzer-pro-comfy-url') || 'http://127.0.0.1:8188').replace(/\/$/, '');
        const workflow = state.comfyWorkflow || {};
        const queueRes = await fetch(`${url}/prompt`, { method: 'POST', mode: 'cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: workflow }) });
        const queueData = await queueRes.json();
        return await pollComfyResults(url, queueData.prompt_id);
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash-image', contents: state.prompt, config: { imageConfig: { aspectRatio: state.aspectRatio } } });
    for (const part of response.candidates[0].content.parts) if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    throw new Error("Cloud Render Failed.");
};

async function pollComfyResults(url: string, promptId: string): Promise<string> {
    for (let i = 0; i < 120; i++) {
        const res = await fetch(`${url}/history/${promptId}`);
        if (res.ok) {
            const history = await res.json();
            if (history[promptId]) {
                const img = history[promptId].outputs[Object.keys(history[promptId].outputs)[0]].images[0];
                return `${url}/view?filename=${img.filename}&subfolder=${img.subfolder}&type=${img.type}`;
            }
        }
        await new Promise(r => setTimeout(r, 1000));
    }
    throw new Error("ComfyUI Timeout.");
}

export const reformatLyricsWithAI = async (lyrics: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: `Reformat lyrics for rhythmic clarity:\n\n${lyrics}`, });
    return response.text || lyrics;
};

export const composeMusicComposition = async (state: SoundStudioState): Promise<{ blueprint: string, sunoPrompt: string }> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({ model: 'gemini-3-pro-preview', contents: `Blueprint: ${state.title} (${state.genre}). JSON: blueprint, sunoPrompt.`, config: { responseMimeType: "application/json" } });
    const raw = JSON.parse(response.text || '{}');
    return { blueprint: sanitizeValue(raw.blueprint), sunoPrompt: sanitizeValue(raw.sunoPrompt) };
};

export const generateVocalPreview = async (lyrics: string, vocalStyle: string, bpm: number, genre: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({ model: "gemini-2.5-flash-preview-tts", contents: [{ parts: [{ text: `Style: ${vocalStyle}, Genre: ${genre}, BPM: ${bpm}. Lyrics: ${lyrics}` }] }], config: { responseModalities: [Modality.AUDIO], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } } }, });
    const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64) return URL.createObjectURL(pcmToWav(base64));
    throw new Error("Vocal sync failed.");
};

export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = (e) => reject(e);
    });
};

export const initializeIntegratedCore = async (file: File): Promise<{success: boolean, error?: string}> => {
    if (!file.name.toLowerCase().endsWith('.gguf')) return { success: false, error: "Signature Mismatch." };
    return { success: true };
};

export const probeExternalNode = async (url: string, modelName: string, apiKey?: string): Promise<'online' | 'ready' | 'offline'> => {
    try {
        const response = await fetch(`${url.replace(/\/$/, '')}/models`, { headers: { 'Content-Type': 'application/json', ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}) } });
        if (!response.ok) return 'offline';
        const data = await response.json();
        return (data.data || []).some((m: any) => String(m.id).includes(modelName)) ? 'ready' : 'online';
    } catch (e) { return 'offline'; }
};

export const resetComfyNode = async (): Promise<void> => {
    let url = (localStorage.getItem('lora-analyzer-pro-comfy-url') || 'http://127.0.0.1:8188').replace(/\/$/, '');
    try {
        await fetch(`${url}/interrupt`, { method: 'POST' });
        await fetch(`${url}/free`, { method: 'POST' });
    } catch (e) {
        console.warn("ComfyUI Reset Signal Failed", e);
    }
};

export const upscaleImageWithAI = async (image: string, factor: number, model: string): Promise<string> => {
    console.log(`Requesting ${factor}x upscale using ${model}`);
    return image;
};
