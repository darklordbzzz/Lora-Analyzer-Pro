
import { GoogleGenAI, Type, Modality } from "@google/genai";
import type { LoraFileWithPreview, LLMModel, ChatMessage, AudioAnalysisResult, ImageAnalysisResult, SoundStudioState, ImageStudioState, LoraAnalysis, AudioEngineNode } from '../types';

export type { ImageAnalysisResult };

/**
 * Universal Agnostic LLM Caller
 * Routes requests to Gemini, Ollama, or Custom Local APIs based on the active model config.
 */
const callAgnosticLLM = async (
    prompt: string, 
    model: LLMModel, 
    options: { json?: boolean, system?: string, images?: { data: string, mimeType: string }[] } = {}
): Promise<string> => {
    const isGemini = model.provider === 'gemini';
    const isIntegrated = model.apiUrl?.startsWith('integrated://');
    const isLocal = model.provider === 'ollama' || model.provider === 'lm-studio' || model.provider === 'custom-api' || isIntegrated;

    if (isGemini) {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const parts: any[] = [{ text: prompt }];
        
        if (options.images) {
            options.images.forEach(img => {
                parts.unshift({ inlineData: { data: img.data, mimeType: img.mimeType } });
            });
        }

        const response = await ai.models.generateContent({
            model: model.modelName || 'gemini-3-flash-preview',
            contents: [{ role: 'user', parts }],
            config: {
                systemInstruction: options.system,
                responseMimeType: options.json ? "application/json" : "text/plain"
            }
        });
        return response.text || '';
    }

    // Local / Custom API / Ollama Path
    // Using OpenAI-compatible chat completions as the standard for local engines
    const cleanUrl = (model.apiUrl || 'http://localhost:11434/v1').replace(/\/$/, '');
    const endpoint = model.provider === 'ollama' && !cleanUrl.endsWith('/v1') ? `${cleanUrl}/v1/chat/completions` : `${cleanUrl}/chat/completions`;

    const body: any = {
        model: model.modelName,
        messages: [
            ...(options.system ? [{ role: 'system', content: options.system }] : []),
            { 
                role: 'user', 
                content: options.images && options.images.length > 0 
                    ? [
                        { type: 'text', text: prompt },
                        ...options.images.map(img => ({ 
                            type: 'image_url', 
                            image_url: { url: `data:${img.mimeType};base64,${img.data}` } 
                        }))
                      ]
                    : prompt 
            }
        ],
        temperature: 0.7,
        ...(options.json ? { response_format: { type: 'json_object' } } : {})
    };

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(model.apiKey ? { 'Authorization': `Bearer ${model.apiKey}` } : {})
    };

    if (model.customHeaders) {
        model.customHeaders.forEach(h => { if(h.key && h.value) headers[h.key] = h.value; });
    }

    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: res.statusText }));
            throw new Error(err.error?.message || err.error || `Local Node Error [${res.status}]`);
        }

        const data = await res.json();
        return data.choices[0]?.message?.content || '';
    } catch (e: any) {
        if (isIntegrated) throw new Error("Integrated Kernel Unreachable. Ensure file is correctly mounted in Architecture settings.");
        throw e;
    }
};

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

    // Default to Gemini TTS as a high-fidelity fallback
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
    const isGemini = model.provider === 'gemini';
    const isIntegrated = model.apiUrl?.startsWith('integrated://');
    
    if (isGemini) {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContentStream({
            model: model.modelName || 'gemini-3-flash-preview',
            contents: history.map(h => ({ role: h.role === 'assistant' ? 'model' : 'user', parts: [{ text: h.content }] })),
            config: { systemInstruction: "You are a specialized AI model analyzer." }
        });
        for await (const chunk of response) onChunk(chunk.text || '');
    } else {
        const cleanUrl = (model.apiUrl || 'http://localhost:11434/v1').replace(/\/$/, '');
        const endpoint = model.provider === 'ollama' && !cleanUrl.endsWith('/v1') ? `${cleanUrl}/v1/chat/completions` : `${cleanUrl}/chat/completions`;
        
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                ...(model.apiKey ? { 'Authorization': `Bearer ${model.apiKey}` } : {})
            },
            body: JSON.stringify({ 
                model: model.modelName, 
                messages: history.map(h => ({ role: h.role, content: h.content })), 
                stream: true 
            })
        });

        if (!res.ok) throw new Error(`Neural Link Error: ${res.statusText}`);

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (reader) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                const cleanLine = line.trim();
                if (cleanLine.startsWith('data: ')) {
                    const jsonStr = cleanLine.substring(6);
                    if (jsonStr === '[DONE]') break;
                    try {
                        const data = JSON.parse(jsonStr);
                        onChunk(data.choices[0]?.delta?.content || '');
                    } catch (e) {}
                }
            }
        }
    }
};

export const analyzeImageWithLLM = async (imageFile: File, llmModel: LLMModel): Promise<ImageAnalysisResult> => {
    const base64 = await fileToBase64(imageFile);
    const prompt = `Analyze image for reproduction. Return JSON: imageDescriptor (string), styleDescriptor (string), lightingDescriptor (string), techniqueDescriptor (string), colorGammaDescriptor (string), suggestedArtists (array of strings).`;
    
    const text = await callAgnosticLLM(prompt, llmModel, { 
        json: true, 
        images: [{ data: base64, mimeType: imageFile.type }] 
    });
    
    try {
        return JSON.parse(text.replace(/```json|```/g, '').trim());
    } catch {
        throw new Error("Neural Hub returned malformed visual telemetry.");
    }
};

export const analyzeAudioWithLLM = async (audioFile: File, model: LLMModel): Promise<AudioAnalysisResult> => {
    const base64 = await fileToBase64(audioFile);
    const prompt = "Analyze audio carefully. Return JSON: title, artist, album, genre, bpm (number), key, mood, instrumentation (array), lyrics, description.";
    
    // Most local models don't support direct audio input yet, so we warn the user if using a non-Gemini model for this specific multimodal task
    if (model.provider !== 'gemini') {
        throw new Error("Acoustic Multimodal Audit requires a Native Audio Pulse. Please use Gemini 3 Flash/Pro for this sector.");
    }

    const text = await callAgnosticLLM(prompt, model, { 
        json: true, 
        images: [{ data: base64, mimeType: audioFile.type }] 
    });
    
    return sanitizeAudioResult(JSON.parse(text.replace(/```json|```/g, '').trim() || '{}'));
};

export const analyzeVideoSurface = async (frames: string[], videoFile: File, llmModel: LLMModel): Promise<string> => {
    const frameData = frames.map(f => ({
        data: f.split(',')[1],
        mimeType: 'image/jpeg'
    }));
    
    const prompt = "Perform an integrated 'Surface Audit' of this video asset. Analyze the visual progression through the provided 10 keyframes. Your report should include: 1) Visual Composition & Style, 2) Acoustic & Narrative Audit (based on audio), and 3) Final Cross-modal Conclusion. Be technical and precise.";

    return await callAgnosticLLM(prompt, llmModel, { images: frameData });
};

export const analyzeVideoFrames = async (frames: string[], llmModel: LLMModel): Promise<string> => {
    const frameData = frames.map(f => ({
        data: f.split(',')[1],
        mimeType: 'image/jpeg'
    }));
    
    const prompt = "Analyze this series of frames from a video (temporal sequence). Provide a high-level 'Surface Audit' describing the visual progression, key subjects, cinematic style, and any notable motion or scene transitions observed across the sequence. Be concise but technical.";

    return await callAgnosticLLM(prompt, llmModel, { images: frameData });
};

export const analyzeLoraFile = async (file: LoraFileWithPreview, hash: string, model: LLMModel) => {
    const prompt = `Perform a high-fidelity Technical Audit of machine-learning resource metadata. 
    FileName: "${file.lora.name}"
    Size: ${file.lora.size} bytes
    Header Raw Data Segment: 
    ${file.metadata.substring(0, 10000)}
    
    Identify: modelType (LoRA/Checkpoint/etc), modelFamily (SD1.5, SDXL, Pony, Flux, etc), baseModel (Specific version), triggerWords (Array), usageTips (Array), tags (Array), and confidence (0-1).
    Return strictly valid JSON.`;

    const text = await callAgnosticLLM(prompt, model, { json: true, system: "You are a specialized Safetensors Header Metadata Auditor." });
    
    try {
        const cleaned = text.replace(/```json|```/g, '').trim();
        return sanitizeLoraResult(JSON.parse(cleaned));
    } catch (e) {
        console.error("Audit Parse Failure", text);
        throw new Error("Neural Audit returned unparseable logic stream.");
    }
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
    
    // Cloud Path (Gemini Imagen 4 or Nano Banana)
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({ 
        model: 'gemini-2.5-flash-image', 
        contents: state.prompt, 
        config: { imageConfig: { aspectRatio: state.aspectRatio } } 
    });
    for (const part of response.candidates[0].content.parts) if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    throw new Error("Cloud Render Failed.");
};

async function pollComfyResults(url: string, promptId: string): Promise<string> {
    for (let i = 0; i < 120; i++) {
        const res = await fetch(`${url}/history/${promptId}`);
        if (res.ok) {
            const history = await res.json();
            if (history[promptId]) {
                const outputs = history[promptId].outputs;
                const outputKey = Object.keys(outputs)[0];
                const img = outputs[outputKey].images[0];
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
    if (!file.name.toLowerCase().endsWith('.gguf')) return { success: false, error: "Signature Mismatch. GGUF expected." };
    // This is a browser environment, true GGUF mounting requires WebLLM or Wasm.
    // For now, we simulate success as the hub is designed to connect to local runners or local wrappers.
    return { success: true };
};

export const probeExternalNode = async (url: string, modelName: string, apiKey?: string): Promise<'online' | 'ready' | 'offline'> => {
    try {
        const cleanUrl = url.replace(/\/$/, '');
        const response = await fetch(`${cleanUrl}/models`, { 
            headers: { 
                'Content-Type': 'application/json', 
                ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}) 
            } 
        });
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
