import { GoogleGenAI, Type, Modality } from "@google/genai";

// Initialize AI client lazily to ensure environment variables are loaded
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export interface AnalysisResult {
  modelType: string;
  modelFamily: string;
  baseModel: string;
  triggerWords: string[];
  usageTips: string[];
  tags: string[];
  confidence: number;
}

/**
 * Technical audit of AI assets (Safetensors, GGUF, etc.)
 */
export const analyzeModel = async (file: { name: string; metadata: string; previewData?: string }): Promise<AnalysisResult> => {
  const ai = getAI();
  const prompt = `Perform a professional audit of this AI model asset. 
    Name: ${file.name}
    Metadata Sample: ${file.metadata.substring(0, 8000)}
    Analyze technical headers to identify architecture and usage. Return structured JSON.`;

  const parts: any[] = [{ text: prompt }];
  if (file.previewData) {
    parts.push({ 
      inlineData: { 
        data: file.previewData, 
        mimeType: 'image/png' 
      } 
    });
  }

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts },
    config: { 
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          modelType: { type: Type.STRING },
          modelFamily: { type: Type.STRING },
          baseModel: { type: Type.STRING },
          triggerWords: { type: Type.ARRAY, items: { type: Type.STRING } },
          usageTips: { type: Type.ARRAY, items: { type: Type.STRING } },
          tags: { type: Type.ARRAY, items: { type: Type.STRING } },
          confidence: { type: Type.NUMBER }
        },
        required: ["modelType", "modelFamily", "baseModel", "triggerWords", "confidence"]
      }
    }
  });

  try {
    return JSON.parse(response.text || '{}');
  } catch (err) {
    console.error("Failed to parse analysis result:", err);
    throw new Error("Neural analysis parsing failed.");
  }
};

/**
 * High-speed image synthesis using Gemini Flash Image
 */
export const generateImage = async (state: { prompt: string; aspectRatio: string }) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: [{ text: state.prompt }] },
    config: {
      imageConfig: {
        aspectRatio: state.aspectRatio as any
      }
    }
  });

  const imagePart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
  if (imagePart?.inlineData) {
    return `data:image/png;base64,${imagePart.inlineData.data}`;
  }
  
  throw new Error("Neural synthesis failed: No image data returned.");
};

/**
 * Specialized image-to-image editing for retouching tasks
 */
export const editImage = async (imageFile: File | string, prompt: string, referenceFiles: File[] = []) => {
  const ai = getAI();
  
  const fileToPart = async (file: File | string): Promise<any> => {
    if (typeof file === 'string' && file.startsWith('data:')) {
      return { inlineData: { data: file.split(',')[1], mimeType: 'image/png' } };
    }
    const reader = new FileReader();
    const base64 = await new Promise<string>((resolve) => {
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(file as File);
    });
    return { inlineData: { data: base64, mimeType: (file as File).type } };
  };

  const sourcePart = await fileToPart(imageFile);
  const refParts = await Promise.all(referenceFiles.map(f => fileToPart(f)));

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        sourcePart,
        ...refParts,
        { text: prompt }
      ]
    }
  });

  const imagePart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
  if (imagePart?.inlineData) {
    return `data:image/png;base64,${imagePart.inlineData.data}`;
  }
  
  throw new Error("Retouch protocol failed: No enhanced image returned.");
};

/**
 * Interactive chat with Google Search grounding
 */
export const chatWithGeminiStream = async (message: string, history: any[], onChunk: (text: string) => void) => {
  const ai = getAI();
  const chat = ai.chats.create({
    model: 'gemini-3-pro-preview',
    config: { 
      tools: [{ googleSearch: {} }],
      systemInstruction: "You are the Intelligence Core of the Neural Hub. You provide technical, accurate, and concise insights. Use Google Search for the latest AI trends."
    }
  });

  const stream = await chat.sendMessageStream({ message });
  
  let groundingLinks: {uri: string, title: string}[] = [];

  for await (const chunk of stream) {
    const text = chunk.text || '';
    onChunk(text);
    
    const chunks = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
        chunks.forEach((c: any) => {
            if (c.web?.uri) {
                groundingLinks.push({ uri: c.web.uri, title: c.web.title || 'Source' });
            }
        });
    }
  }
  return groundingLinks;
};