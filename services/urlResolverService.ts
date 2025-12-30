
import type { LLMProvider, LLMModel } from '../types';

export interface ResolvedURLModel {
    name: string;
    modelId: string;
    apiUrl?: string;
    provider: LLMProvider;
    type: 'api' | 'gguf' | 'ollama';
}

export const resolveModelUrl = async (url: string): Promise<ResolvedURLModel | null> => {
    const trimmed = url.trim();
    if (!trimmed) return null;

    // 1. Hugging Face Resolver
    const hfMatch = trimmed.match(/huggingface\.co\/([^/]+\/[^/]+)/);
    if (hfMatch) {
        const repoId = hfMatch[1];
        const isGGUF = trimmed.toLowerCase().includes('gguf');
        return {
            name: repoId.split('/')[1],
            modelId: repoId,
            provider: isGGUF ? 'openai' : 'gemini', // Internal fallback routing
            type: isGGUF ? 'gguf' : 'api',
            apiUrl: isGGUF ? undefined : `https://api-inference.huggingface.co/models/${repoId}`
        };
    }

    // 2. Ollama Resolver
    const ollamaMatch = trimmed.match(/ollama\.com\/library\/([^/]+)/);
    if (ollamaMatch) {
        const modelName = ollamaMatch[1];
        return {
            name: modelName,
            modelId: modelName,
            provider: 'ollama',
            type: 'ollama',
            apiUrl: 'http://localhost:11434/v1'
        };
    }

    // 3. Custom OpenAI/v1 Resolver
    if (trimmed.includes('/v1')) {
        return {
            name: 'Remote API Node',
            modelId: 'detect-on-link',
            provider: 'openai',
            type: 'api',
            apiUrl: trimmed
        };
    }

    // 4. Direct GGUF link
    if (trimmed.toLowerCase().endsWith('.gguf')) {
        const fileName = trimmed.split('/').pop() || 'Remote_Node.gguf';
        return {
            name: fileName.replace('.gguf', ''),
            modelId: fileName,
            provider: 'openai', // Route through custom logic
            type: 'gguf',
            apiUrl: trimmed
        };
    }

    return null;
};
