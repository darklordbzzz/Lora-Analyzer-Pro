
import { OllamaTagsResponse, OllamaPullProgress } from '../types';

// Robust fetch helper that retries with 127.0.0.1 if localhost fails (common node/browser issue)
const robustFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    // Helper to attempt a fetch
    const attempt = async (u: string) => {
        try {
            const res = await fetch(u, options);
            return res;
        } catch (e: any) {
            throw e;
        }
    };

    try {
        return await attempt(url);
    } catch (error: any) {
        const isNetworkError = error.message?.toLowerCase().includes('failed to fetch') || 
                               error.name === 'TypeError' || 
                               error.message?.includes('NetworkError');
        
        if (isNetworkError) {
            let altUrl: string | null = null;
            // Toggle between localhost and 127.0.0.1 to bypass potential host file issues
            if (url.includes('localhost')) altUrl = url.replace('localhost', '127.0.0.1');
            else if (url.includes('127.0.0.1')) altUrl = url.replace('127.0.0.1', 'localhost');

            if (altUrl) {
                console.warn(`Primary fetch failed, retrying with: ${altUrl}`);
                try {
                    return await attempt(altUrl);
                } catch (retryError) {
                    // Determine if this is likely a CORS error (Browser blocking local connection)
                    const corsError = new Error("Connection Blocked by Browser (CORS)");
                    (corsError as any).code = 'OLLAMA_CORS_ERROR';
                    throw corsError;
                }
            }
        }
        throw error;
    }
};

export const checkOllamaConnection = async (baseUrl: string): Promise<boolean> => {
    try {
        const cleanUrl = baseUrl.replace(/\/$/, '');
        const response = await robustFetch(`${cleanUrl}/api/tags`);
        return response.ok;
    } catch (e) {
        return false;
    }
};

export const getInstalledModels = async (baseUrl: string): Promise<OllamaTagsResponse> => {
    const cleanUrl = baseUrl.replace(/\/$/, '');
    const response = await robustFetch(`${cleanUrl}/api/tags`);
    if (!response.ok) throw new Error("Failed to fetch models");
    return await response.json();
};

export const deleteModel = async (baseUrl: string, modelName: string): Promise<void> => {
    const cleanUrl = baseUrl.replace(/\/$/, '');
    const response = await robustFetch(`${cleanUrl}/api/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName })
    });
    if (!response.ok) throw new Error("Failed to delete model");
};

export const pullModel = async (
    baseUrl: string, 
    modelName: string, 
    onProgress: (progress: OllamaPullProgress) => void
): Promise<void> => {
    const cleanUrl = baseUrl.replace(/\/$/, '');
    
    // Add :latest if no tag provided, standard Ollama behavior expectation
    const name = modelName.includes(':') ? modelName : `${modelName}:latest`;

    const response = await robustFetch(`${cleanUrl}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name })
    });

    if (!response.ok || !response.body) {
        const text = await response.text();
        throw new Error(`Failed to pull model: ${text || response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            // Handle multiple JSON objects in one chunk
            const lines = chunk.split('\n').filter(line => line.trim() !== '');
            
            for (const line of lines) {
                try {
                    const json = JSON.parse(line);
                    onProgress(json);
                    if (json.error) throw new Error(json.error);
                } catch (e) {
                    // Ignore JSON parse errors for partial chunks
                }
            }
        }
    } catch (e) {
        throw e;
    } finally {
        reader.releaseLock();
    }
};

export const createModel = async (
    baseUrl: string,
    modelName: string,
    filePath: string,
    onProgress: (status: string) => void
): Promise<void> => {
    const cleanUrl = baseUrl.replace(/\/$/, '');
    
    const modelfileContent = `FROM "${filePath}"`;

    const response = await robustFetch(`${cleanUrl}/api/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            name: modelName, 
            modelfile: modelfileContent,
            stream: true
        })
    });

    if (!response.ok || !response.body) {
        const text = await response.text();
        throw new Error(`Failed to create model: ${text || response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter(line => line.trim() !== '');
            
            for (const line of lines) {
                try {
                    const json = JSON.parse(line);
                    if (json.status) onProgress(json.status);
                    if (json.error) throw new Error(json.error);
                } catch (e) {
                }
            }
        }
    } catch (e) {
        throw e;
    } finally {
        reader.releaseLock();
    }
};
