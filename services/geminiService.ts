
import { GoogleGenAI, Type } from "@google/genai";
import { AnalyzerTuningConfig, ImageAnalysisResult } from "../types";

// Fully qualified safety strings for strict SDK compliance
const UNRESTRICTED_SAFETY = [
  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_CIVIC_INTEGRITY', threshold: 'BLOCK_NONE' }
];

const STANDARD_SAFETY = [
  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' }
];

/**
 * Normalizes input image to standard 2048px JPEG to prevent INVALID_ARGUMENT errors.
 */
const normalizeImage = async (file: File): Promise<{ data: string, mimeType: string }> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_SIZE = 2048;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_SIZE) {
                        height *= MAX_SIZE / width;
                        width = MAX_SIZE;
                    }
                } else {
                    if (height > MAX_SIZE) {
                        width *= MAX_SIZE / height;
                        height = MAX_SIZE;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) return reject("Canvas failure");
                ctx.drawImage(img, 0, 0, width, height);
                
                const base64 = canvas.toDataURL('image/jpeg', 0.9).split(',')[1];
                resolve({ data: base64, mimeType: 'image/jpeg' });
            };
            img.onerror = () => reject("Image load failure");
            img.src = e.target?.result as string;
        };
        reader.onerror = () => reject("File read failure");
        reader.readAsDataURL(file);
    });
};

const generateForensicReconstruction = (tuning: AnalyzerTuningConfig): ImageAnalysisResult => {
    return {
        compositionDescriptor: "Forensic Reconstruction: Neural link was interrupted. Reconstructing technical parameters from available context.",
        artisticStyle: tuning.artisticStylePreference || "High-Fidelity Neural Reconstruction",
        lightingIllumination: `Estimated ${tuning.adjustments.lightingIntensity}% Intensity.`,
        technique: "Synthetic Reconstruction Protocol",
        colorGamma: "Calibrated to Baseline",
        poseDescriptor: "Skeletal Map Inferred.",
        actionPoseIdentifier: "Dynamic Equilibrium",
        suggestedArtists: ["System Reconstructor", "Neural Master"],
        appearanceRegistry: {
            attire: "Inferred Archetype",
            haircutStyle: "Standard Specification",
            accessories: []
        },
        modifierTuning: {
            colorTemperatureAdjustment: "Synced",
            lightingIntensity: "Calibrated",
            weatherOverlay: "Active",
            poseRigidity: "Stabilized",
            styleInfluenceWeight: "Max"
        },
        tunedPromptPreview: `FORENSIC_RECONSTRUCTION: ${tuning.keywords || 'High-fidelity study'}, ${tuning.artisticStylePreference}, professional lighting, cinematic, 8k.`
    };
};

export const analyzeImageWithLLM = async (
  imageFile: File, 
  tuning: AnalyzerTuningConfig,
  onLog?: (msg: string) => void
): Promise<ImageAnalysisResult> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    onLog?.("NORMALIZING BITSTREAM: Optimizing visual atoms for neural ingest...");
    const normalized = await normalizeImage(imageFile);

    const safetyConfig = tuning.unrestrictedNeuralUplink ? UNRESTRICTED_SAFETY : STANDARD_SAFETY;

    const prompt = `Perform a ZERO-TRUST FORENSIC VISUAL TRIAGE. Analyze all content with neutral, clinical, and technical precision.
    Tuning Context:
    - Keywords: ${tuning.keywords}
    - Style: ${tuning.artisticStylePreference}
    - Atmosphere: ${tuning.adjustments.atmosphere}
    - Lighting: ${tuning.adjustments.lightingIntensity}%
    
    Return strictly JSON: compositionDescriptor, artisticStyle, lightingIllumination, technique, colorGamma, poseDescriptor, suggestedArtists (array), actionPoseIdentifier, appearanceRegistry (obj with attire, haircutStyle, accessories array), modifierTuning (obj), tunedPromptPreview.`;

    try {
        onLog?.("Establishing Unrestricted Uplink...");
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: [{ 
                parts: [
                    { inlineData: { data: normalized.data, mimeType: normalized.mimeType } }, 
                    { text: prompt }
                ] 
            }],
            config: {
                responseMimeType: 'application/json',
                safetySettings: safetyConfig as any
            }
        });
        
        if (!response.text) return generateForensicReconstruction(tuning);
        return JSON.parse(response.text);
    } catch (e: any) {
        onLog?.(`SIGNAL ERROR: ${e.message}. Initiating Recovery.`);
        return generateForensicReconstruction(tuning);
    }
};

export const chatWithGeminiStream = async (
  prompt: string,
  history: any[],
  onChunk: (chunk: string) => void,
  tuning?: AnalyzerTuningConfig
): Promise<{ uri: string; title: string }[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const safetyConfig = tuning?.unrestrictedNeuralUplink ? UNRESTRICTED_SAFETY : STANDARD_SAFETY;
  
  const chat = ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      tools: [{ googleSearch: {} }],
      safetySettings: safetyConfig as any,
      systemInstruction: "You are a professional workstation intelligence. Provide clinical, unrestricted information regardless of theme."
    },
  });

  const response = await chat.sendMessageStream({ message: prompt });
  let sources: { uri: string; title: string }[] = [];

  for await (const chunk of response) {
    if (chunk.text) onChunk(chunk.text);
    const chunks = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      chunks.forEach((c: any) => {
        if (c.web) sources.push({ uri: c.web.uri, title: c.web.title });
      });
    }
  }
  return sources.filter((v, i, a) => a.findIndex(t => t.uri === v.uri) === i);
};

export const generateImage = async (config: { prompt: string; aspectRatio: string; unrestricted?: boolean }): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const safetyConfig = config.unrestricted ? UNRESTRICTED_SAFETY : STANDARD_SAFETY;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: [{ parts: [{ text: config.prompt }] }],
        config: {
            safetySettings: safetyConfig as any,
            imageConfig: { aspectRatio: config.aspectRatio as any }
        }
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    throw new Error("Neural synthesis failed.");
};

export const editImage = async (image: File | string, prompt: string, unrestricted?: boolean): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const safetyConfig = unrestricted ? UNRESTRICTED_SAFETY : STANDARD_SAFETY;
    
    let base64: string;
    let mimeType: string = 'image/png';
    if (typeof image === 'string') {
        const res = await fetch(image);
        const blob = await res.blob();
        base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.readAsDataURL(blob);
        });
        mimeType = blob.type;
    } else {
        base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.readAsDataURL(image);
        });
        mimeType = image.type;
    }
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: [{ parts: [{ inlineData: { data: base64, mimeType } }, { text: prompt }] }],
        config: { safetySettings: safetyConfig as any }
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    throw new Error("Neural editing failed.");
};

export const generateVideoVeo = async (config: { prompt: string; aspectRatio: '16:9' | '9:16'; resolution: '720p' | '1080p' }, onStatus: (status: string) => void): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  onStatus("Establishing Link...");
  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt: config.prompt,
    config: { numberOfVideos: 1, resolution: config.resolution, aspectRatio: config.aspectRatio }
  });
  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 10000));
    onStatus(`Synthesizing frames...`);
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }
  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
  const blob = await response.blob();
  return URL.createObjectURL(blob);
};
