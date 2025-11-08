import { calculateSHA256 } from './fileService';

interface HfModel {
    id: string; // This is the repo_id e.g., "stabilityai/stable-diffusion-xl-base-1.0"
}

interface HfFile {
    type: 'file' | 'directory';
    path: string;
    lfs?: {
        oid: string; // This is the SHA256 hash
        size: number;
        pointerSize: number;
    }
}

const HF_API_BASE = 'https://huggingface.co/api';

const createSearchQuery = (fileName: string): string => {
    return fileName
        .toLowerCase()
        .replace(/\.safetensors$/, '')
        .replace(/[-_]/g, ' ')
        .trim();
};

const urlToImageFile = async (imageUrl: string, fileName: string): Promise<File> => {
    const response = await fetch(imageUrl);
    if (!response.ok) {
        throw new Error(`Failed to download image: ${response.statusText}`);
    }
    const blob = await response.blob();
    return new File([blob], fileName, { type: blob.type || 'image/jpeg' });
};

export const findLoraOnHuggingFace = async (loraFile: File): Promise<{ previewImage: File, metadata: string, huggingfaceUrl: string }> => {
    const loraFileHash = await calculateSHA256(loraFile);
    const originalQuery = createSearchQuery(loraFile.name);
    if (!originalQuery) {
        throw new Error('Invalid filename for searching.');
    }

    const queries: string[] = [originalQuery];
    const queryParts = originalQuery.split(' ');
    // Create fallback queries by progressively removing the first word
    if (queryParts.length > 2) {
        for (let i = 1; i < queryParts.length - 1; i++) {
            queries.push(queryParts.slice(i).join(' '));
        }
    }

    const processedRepoIds = new Set<string>();

    for (const query of queries) {
        const searchUrl = `${HF_API_BASE}/models?search=${encodeURIComponent(query)}&sort=likes&direction=-1&limit=10&filter=lora`;
        let searchResults: HfModel[] = [];

        try {
            const searchResponse = await fetch(searchUrl);
            if (searchResponse.ok) {
                searchResults = await searchResponse.json();
            }
        } catch (e) {
            console.warn(`HF search query failed for "${query}":`, e);
            continue;
        }

        for (const model of searchResults) {
            if (processedRepoIds.has(model.id)) continue;
            processedRepoIds.add(model.id);

            const repoId = model.id;
            const treeUrl = `${HF_API_BASE}/models/${repoId}/tree/main`;
            
            try {
                const treeResponse = await fetch(treeUrl);
                if (!treeResponse.ok) continue;

                const files: HfFile[] = await treeResponse.json();

                const loraFileInRepo = files.find(f => 
                    f.type === 'file' && 
                    ((f.lfs && f.lfs.oid === loraFileHash) || f.path === loraFile.name)
                );

                if (loraFileInRepo) {
                    const imageExtensions = ['.png', '.jpg', '.jpeg', '.webp'];
                    const previewKeywords = ['preview', 'sample', 'cover', 'thumb', 'example'];
                    
                    let imageFile: HfFile | undefined;
                    
                    imageFile = files.find(f => 
                        f.type === 'file' &&
                        imageExtensions.some(ext => f.path.toLowerCase().endsWith(ext)) &&
                        previewKeywords.some(key => f.path.toLowerCase().includes(key))
                    );

                    if (!imageFile) {
                        imageFile = files.find(f => 
                            f.type === 'file' &&
                            imageExtensions.some(ext => f.path.toLowerCase().endsWith(ext))
                        );
                    }

                    if (imageFile) {
                        const imageUrl = `https://huggingface.co/${repoId}/resolve/main/${imageFile.path}`;
                        const previewImage = await urlToImageFile(imageUrl, `hf_preview_${repoId.replace('/', '_')}.jpg`);

                        const hfMetadata = {
                            'huggingface_model_id': repoId,
                            'huggingface_lora_file': loraFileInRepo.path,
                        };
                        
                        const huggingfaceUrl = `https://huggingface.co/${repoId}`;

                        return {
                            previewImage,
                            metadata: JSON.stringify(hfMetadata, null, 2),
                            huggingfaceUrl,
                        };
                    }
                }
            } catch (e) {
                console.warn(`Error processing HF repo "${repoId}":`, e);
                continue;
            }
        }
    }
    
    throw new Error('Model not found on Hugging Face.');
};
