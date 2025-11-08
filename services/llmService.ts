import { GoogleGenAI, Type } from "@google/genai";
import type { LoraFileWithPreview, LLMModel } from '../types';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const withRetry = async <T>(fn: () => Promise<T>, retries = 3, initialDelay = 1500): Promise<T> => {
    let attempt = 0;
    while (true) {
        try {
            return await fn();
        } catch (error: any) {
            attempt++;
            
            const isRateLimitError = (error.toString && error.toString().includes('429')) || (error.message && error.message.includes('429'));

            if (isRateLimitError && attempt < retries) {
                // Exponential backoff with jitter
                const waitTime = initialDelay * Math.pow(2, attempt - 1) + (Math.random() - 0.5) * 1000;
                console.warn(`Rate limit hit. Retrying in ${Math.round(waitTime / 1000)}s... (Attempt ${attempt}/${retries})`);
                await delay(waitTime);
            } else {
                // For other errors or after all retries, fail.
                throw error;
            }
        }
    }
};

const LORA_ANALYZER_PYTHON_SCRIPT = `
import os
import json
import hashlib
import re
from pathlib import Path
from typing import Dict, List, Optional, Set

class LoRAAnalyzer:
    MODEL_TYPES = {
        "SDXL": {"keywords": ["sdxl", "sd_xl", "xl_", "1024"], "resolution": "1024x1024", "base_models": ["SDXL 1.0", "SDXL 0.9"], "clips": "CLIP-L + CLIP-G", "version": "2.0"},
        "SD1.5": {"keywords": ["1.5", "v1.5", "sd_1.5", "512"], "resolution": "512x512", "base_models": ["SD 1.5"], "clips": "OpenAI CLIP-L", "version": "1.5"},
        "SD3": {"keywords": ["sd3", "sd_3"], "resolution": "1024x1024", "base_models": ["SD3 Medium"], "clips": "CLIP-G + CLIP-L + T5-XXL", "version": "3.0"},
        "FLUX": {"keywords": ["flux", "flux.1"], "resolution": "1024x1024", "base_models": ["FLUX.1-dev"], "clips": "T5-XXL", "version": "FLUX"},
        "SD2.x": {"keywords": ["sd2", "sd_2", "768"], "resolution": "512x512 or 768x768", "base_models": ["SD 2.0", "SD 2.1"], "clips": "OpenAI CLIP-L", "version": "2.x"},
        "Pony": {"keywords": ["pony"], "resolution": "1024x1024", "base_models": ["Pony"], "clips": "CLIP-L", "version": "Pony"},
        "PlaygroundV2": {"keywords": ["playground", "pgv2"], "resolution": "1024x1024", "base_models": ["Playground V2"], "clips": "CLIP-G + CLIP-L", "version": "Playground"},
        "MajicMix": {"keywords": ["majicmix"], "resolution": "512x512", "base_models": ["MajicMix"], "clips": "OpenAI CLIP-L", "version": "MajicMix"},
        "AnythingV5": {"keywords": ["anythingv5"], "resolution": "512x512", "base_models": ["Anything V5"], "clips": "OpenAI CLIP-L", "version": "AnythingV5"},
        "RealisticVision": {"keywords": ["realisticvision", "rv"], "resolution": "512x512", "base_models": ["Realistic Vision"], "clips": "OpenAI CLIP-L", "version": "RealisticVision"}
    }
    MODEL_FAMILIES = {
        "Stable Diffusion": ["SD1.5", "SD2.x", "SD3", "SDXL"],
        "FLUX": ["FLUX"],
        "Specialized Models": ["Pony", "PlaygroundV2", "MajicMix", "AnythingV5", "RealisticVision"],
    }
    CATEGORIES = {
        "Style": ["style", "artstyle", "aesthetic", "vibe"],
        "Character": ["character", "char", "oc", "person", "celebrity"],
        "Object": ["object", "item", "prop", "thing"],
        "Pose": ["pose", "action", "gesture", "position"],
        "Outfit/Fashion/Appearance": ["outfit", "clothing", "fashion", "clothes", "dress", "costume", "armor", "appearance"],
        "Expression": ["expression", "emotion", "face", "feeling"]
    }
    def analyze_lora_file(file_name, file_size_mb, metadata_str, hash_str):
        analysis = {
            "fileName": file_name, "fileSizeMB": file_size_mb, "hash": hash_str,
            "modelType": "Unknown", "modelFamily": "Unknown", "baseModel": "Unknown",
            "resolution": "Unknown", "clips": "Unknown", "version": "Unknown",
            "category": "Unknown", "trainingInfo": {}, "tags": [],
            "triggerWords": [], "requirements": [], "compatibility": [], "confidence": 0.0
        }
        metadata = json.loads(metadata_str) if metadata_str else {}
        if metadata:
            analysis.update(LoRAAnalyzer.parse_training_metadata(metadata))
            if 'ss_trigger_words' in metadata and metadata['ss_trigger_words']:
                analysis['triggerWords'] = [word.strip() for word in str(metadata['ss_trigger_words']).split(',')]
        
        if not analysis['triggerWords']:
            analysis['triggerWords'] = LoRAAnalyzer.extract_trigger_words_from_filename(file_name)

        if analysis["modelType"] == "Unknown":
            analysis.update(LoRAAnalyzer.analyze_filename_comprehensive(file_name))
        
        analysis["tags"] = LoRAAnalyzer.extract_comprehensive_tags(file_name)
        analysis["category"] = LoRAAnalyzer.determine_category(file_name, analysis["tags"])
        analysis["requirements"] = LoRAAnalyzer.determine_comprehensive_requirements(analysis)
        analysis["compatibility"] = LoRAAnalyzer.determine_compatibility(analysis)
        return analysis

    @staticmethod
    def extract_trigger_words_from_filename(file_name: str) -> List[str]:
        # Look for words enclosed in <...> which is a common pattern for triggers
        triggers = re.findall(r'<(.*?)>', file_name)
        if triggers:
            return triggers
        return []

    @staticmethod
    def determine_category(file_name: str, tags: List[str]) -> str:
        name_lower = file_name.lower()
        search_text = name_lower + " " + " ".join(tags)
        scores = {category: 0 for category in LoRAAnalyzer.CATEGORIES.keys()}
        for category, keywords in LoRAAnalyzer.CATEGORIES.items():
            for keyword in keywords:
                if keyword in search_text: scores[category] += 1
        for category, keywords in LoRAAnalyzer.CATEGORIES.items():
            for keyword in keywords:
                if keyword in name_lower: scores[category] += 1
        best_category = "Unknown"
        max_score = 0
        for category, score in scores.items():
            if score > max_score:
                max_score = score
                best_category = category
        return best_category if max_score > 0 else "General"
    @staticmethod
    def analyze_filename_comprehensive(file_name: str) -> Dict:
        name_lower = file_name.lower()
        analysis = {"modelType": "Unknown", "modelFamily": "Unknown", "baseModel": "Unknown", "resolution": "Unknown", "clips": "Unknown", "version": "Unknown", "confidence": 0.0}
        best_match = None; best_score = 0
        for model_type, details in LoRAAnalyzer.MODEL_TYPES.items():
            score = 0
            for keyword in details["keywords"]:
                if keyword in name_lower: score += 1
            if score > best_score:
                best_score = score
                best_match = {"model_type": model_type, "details": details}
        if best_match and best_score > 0:
            analysis["modelType"] = best_match["model_type"]
            analysis["baseModel"] = best_match["details"].get("base_models", ["Unknown"])[0]
            analysis["resolution"] = best_match["details"].get("resolution", "Unknown")
            analysis["clips"] = best_match["details"].get("clips", "Unknown")
            analysis["version"] = best_match["details"].get("version", "Unknown")
            analysis["confidence"] = min(best_score / (len(best_match["details"]["keywords"])), 1.0)
            for family, types in LoRAAnalyzer.MODEL_FAMILIES.items():
                if best_match["model_type"] in types: analysis["modelFamily"] = family; break
        return analysis
    @staticmethod
    def parse_training_metadata(metadata: Dict) -> Dict:
        analysis = {"trainingInfo": {}}
        metadata_mappings = {'ss_network_dim': 'network_dim', 'ss_network_alpha': 'network_alpha', 'ss_lr_scheduler': 'lr_scheduler', 'ss_optimizer': 'optimizer', 'ss_max_train_steps': 'max_train_steps', 'ss_resolution': 'resolution', 'ss_batch_size': 'batch_size', 'ss_clip_skip': 'clip_skip'}
        for key, value in metadata.items():
            if 'ss_' in key:
                clean_key = key.replace('ss_', '')
                analysis["trainingInfo"][metadata_mappings.get(key, clean_key)] = str(value)
        if 'ss_base_model' in metadata and any(indicator in str(metadata['ss_base_model']).lower() for indicator in ['sdxl', 'xl']):
            analysis["modelType"] = "SDXL"; analysis["baseModel"] = "SDXL"
        return analysis
    @staticmethod
    def extract_comprehensive_tags(file_name: str) -> List[str]:
        name = re.sub(r'\\.[^/.]+$', '', file_name)
        words = re.split(r'[_\\-\\s\\.]+', name.lower())
        tag_words = ['anime', 'realistic', 'digital', 'oil', 'girl', 'boy', 'character', 'portrait', 'face', 'landscape', 'city', 'fantasy', 'sci-fi']
        tags = [word for word in words if len(word) > 2 and word in tag_words]
        return list(set(tags))[:5]
    @staticmethod
    def determine_comprehensive_requirements(analysis: Dict) -> List[str]:
        reqs = []; mt = analysis.get("modelType", "Unknown")
        if mt == "SDXL": reqs.extend(["SDXL base model", "1024x1024+ resolution", "8GB+ VRAM"])
        elif mt == "SD1.5": reqs.extend(["SD1.5 base model", "512x512 resolution", "4GB+ VRAM"])
        elif mt == "SD3": reqs.extend(["SD3 base model", "1024x1024 resolution", "12GB+ VRAM"])
        elif mt == "FLUX": reqs.extend(["FLUX base model", "1024x1024 resolution", "12GB+ VRAM"])
        else: reqs.append(f"{mt} base model required")
        return reqs[:3]
    @staticmethod
    def determine_compatibility(analysis: Dict) -> List[str]:
        compat = []; mt = analysis.get("modelType", "Unknown")
        if mt == "SD1.5": compat.extend(["Compatible: SD1.5, SD1.4", "Incompatible: SDXL, SD3, FLUX"])
        elif mt == "SDXL": compat.extend(["Compatible: SDXL 1.0, SDXL 0.9", "Incompatible: SD3, FLUX"])
        elif mt == "FLUX": compat.extend(["Compatible: FLUX.1 models", "Incompatible: All SD models"])
        elif mt == "SD3": compat.extend(["Compatible: SD3 models", "Incompatible: SD1.5, SDXL, FLUX"])
        else: compat.append(f"Compatible with: {analysis.get('baseModel', 'Unknown')} models")
        return compat[:2]
`;

const geminiResponseSchema = {
    type: Type.OBJECT,
    properties: {
        fileName: { type: Type.STRING },
        fileSizeMB: { type: Type.NUMBER },
        modelType: { type: Type.STRING },
        modelFamily: { type: Type.STRING },
        baseModel: { type: Type.STRING },
        category: { type: Type.STRING },
        resolution: { type: Type.STRING },
        clips: { type: Type.STRING },
        version: { type: Type.STRING },
        confidence: { type: Type.NUMBER },
        tags: { type: Type.ARRAY, items: { type: Type.STRING } },
        triggerWords: { type: Type.ARRAY, items: { type: Type.STRING } },
        hash: { type: Type.STRING },
        requirements: { type: Type.ARRAY, items: { type: Type.STRING } },
        compatibility: { type: Type.ARRAY, items: { type: Type.STRING } },
        trainingInfo: {
            type: Type.OBJECT,
            properties: {
                network_dim: { type: Type.STRING, nullable: true },
                network_alpha: { type: Type.STRING, nullable: true },
                lr_scheduler: { type: Type.STRING, nullable: true },
                optimizer: { type: Type.STRING, nullable: true },
                max_train_steps: { type: Type.STRING, nullable: true },
                resolution: { type: Type.STRING, nullable: true },
                batch_size: { type: Type.STRING, nullable: true },
                clip_skip: { type: Type.STRING, nullable: true },
            },
        },
        civitaiUrl: { type: Type.STRING, nullable: true },
        huggingfaceUrl: { type: Type.STRING, nullable: true },
        tensorArtUrl: { type: Type.STRING, nullable: true },
        seaartUrl: { type: Type.STRING, nullable: true },
        mageSpaceUrl: { type: Type.STRING, nullable: true },
    },
    required: ["fileName", "fileSizeMB", "modelType", "modelFamily", "baseModel", "category", "resolution", "clips", "version", "confidence", "tags", "triggerWords", "hash", "requirements", "compatibility", "trainingInfo"],
};

const getSystemPrompt = () => `
You are an expert LoRA file analyzer. Your logic is based on the following Python script:
\`\`\`python
${LORA_ANALYZER_PYTHON_SCRIPT}
\`\`\`
Strictly follow the logic in the script to determine all fields. Return the analysis as a JSON object.
`;

const getUserPrompt = (file: LoraFileWithPreview, hash: string) => `
Now, analyze the following LoRA file based on its filename, file size, SHA256 hash, and provided metadata.

File Information:
- Filename: "${file.lora.name}"
- File Size (MB): ${parseFloat((file.lora.size / (1024 * 1024)).toFixed(2))}
- SHA256 Hash: "${hash}"
- Safetensors Metadata: ${file.metadata || '{}'}
- Civitai URL: "${file.civitaiUrl || ''}"
- Hugging Face URL: "${file.huggingfaceUrl || ''}"
- Tensor.Art URL: "${file.tensorArtUrl || ''}"
- SeaArt.ai URL: "${file.seaartUrl || ''}"
- Mage.space URL: "${file.mageSpaceUrl || ''}"

Perform the analysis and provide the JSON output. If any platform URLs (Civitai, Hugging Face, Tensor.Art, SeaArt.ai, Mage.space) were provided in the file information, you MUST include them in the final JSON output under their respective keys.
`;

const callGeminiAPI = async (file: LoraFileWithPreview, hash: string, llmModel: LLMModel) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    const fullPrompt = `${getSystemPrompt()}\n${getUserPrompt(file, hash)}`;
    
    const response = await ai.models.generateContent({
        model: llmModel.modelName,
        contents: fullPrompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: geminiResponseSchema,
        }
    });

    const jsonText = response.text.trim();
    return JSON.parse(jsonText);
};

const callOpenAIAPI = async (file: LoraFileWithPreview, hash: string, llmModel: LLMModel) => {
    if (!llmModel.apiUrl) {
        throw new Error("API URL is not configured for this OpenAI-compatible model.");
    }
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };
    if (llmModel.apiKey) {
        headers['Authorization'] = `Bearer ${llmModel.apiKey}`;
    }

    const body = {
        model: llmModel.modelName,
        messages: [
            { role: 'system', content: getSystemPrompt() },
            { role: 'user', content: getUserPrompt(file, hash) }
        ],
        response_format: { type: 'json_object' }
    };

    const response = await fetch(llmModel.apiUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`API call failed with status ${response.status}: ${errorBody}`);
    }

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
};

export const analyzeLoraFile = async (file: LoraFileWithPreview, hash: string, llmModel: LLMModel) => {
    const apiCall = () => {
        if (llmModel.provider === 'gemini') {
            return callGeminiAPI(file, hash, llmModel);
        } else if (llmModel.provider === 'openai') {
            return callOpenAIAPI(file, hash, llmModel);
        } else {
            return Promise.reject(new Error(`Unsupported LLM provider: ${llmModel.provider}`));
        }
    };

    try {
        const result = await withRetry(apiCall);
        
        // Manually add custom URLs as they are not part of the AI's response schema
        result.customUrls = file.customUrls;
        return result;

    } catch (error: any) {
        console.error(`Error analyzing ${file.lora.name} with ${llmModel.name}:`, error);
        
        let errorMessage = 'Failed to analyze file. Please check console for details.';
        
        const errorString = error.message || error.toString();
        
        if (errorString.includes('quota')) {
            errorMessage = 'API quota exceeded. Please check your plan and billing details.';
        } else if (errorString.includes('429')) {
            errorMessage = 'Rate limit exceeded. Please try again in a few moments.';
        } else {
            try {
                // Attempt to parse Gemini's JSON error format from the message
                const errorJson = JSON.parse(errorString);
                if (errorJson.error && errorJson.error.message) {
                    errorMessage = `API Error: ${errorJson.error.message}`;
                }
            } catch (e) {
                // Not a JSON error, use the string directly if it's not too long and is informative
                if (errorString.length < 150 && !errorString.toLowerCase().includes('failed to fetch')) {
                    errorMessage = errorString;
                }
            }
        }

        throw new Error(errorMessage);
    }
};
