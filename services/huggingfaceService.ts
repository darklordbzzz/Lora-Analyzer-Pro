
import { calculateSHA256 } from './fileService';

interface HfModel {
    id: string; 
    tags?: string[];
    likes?: number;
    downloads?: number;
    description?: string;
    siblings?: { 
        rpath: string;
        size?: number;
        lfs?: {
            oid: string;
            size: number;
        }
    }[];
}

const HF_API_BASE = 'https://huggingface.co/api';

const urlToImageFile = async (imageUrl: string, fileName: string): Promise<File> => {
    const response = await fetch(imageUrl);
    if (!response.ok) {
        throw new Error(`Failed to download image: ${response.statusText}`);
    }
    const blob = await response.blob();
    return new File([blob], fileName, { type: blob.type || 'image/jpeg' });
};

const extractMetadataAnchors = (metadata: string): string[] => {
    const anchors: string[] = [];
    if (!metadata) return anchors;
    const civitaiPattern = /civitai:(\d+)(?:@(\d+))?/g;
    let match;
    while ((match = civitaiPattern.exec(metadata)) !== null) {
        if (match[1]) anchors.push(match[1]);
        if (match[2]) anchors.push(match[2]);
    }
    const jsonPattern = /"model":\s*"civitai:(\d+)(?:@(\d+))?"/g;
    while ((match = jsonPattern.exec(metadata)) !== null) {
        if (match[1]) anchors.push(match[1]);
        if (match[2]) anchors.push(match[2]);
    }
    return [...new Set(anchors)];
};

export const fetchMetadataByRepoId = async (repoId: string): Promise<{ previewImage: File, metadata: string, huggingfaceUrl: string }> => {
    const url = `${HF_API_BASE}/models/${repoId}?full=true`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Model ${repoId} not found on Hugging Face.`);
    
    const model: HfModel = await response.json();
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.webp'];
    const previewFile = model.siblings?.find(s => {
        const path = s.rpath.toLowerCase();
        return imageExtensions.some(ext => path.endsWith(ext));
    });

    if (!previewFile) throw new Error('No preview asset found in repository.');

    const imageUrl = `https://huggingface.co/${model.id}/resolve/main/${previewFile.rpath}`;
    const previewImage = await urlToImageFile(imageUrl, `hf_preview_${model.id.replace('/', '_')}.jpg`);

    const hfMetadata = {
        'huggingface_repo': model.id,
        'huggingface_url': `https://huggingface.co/${model.id}`,
        'huggingface_likes': model.likes,
        'huggingface_downloads': model.downloads,
        'platform_source': 'Hugging Face Hub'
    };

    return {
        previewImage,
        metadata: JSON.stringify(hfMetadata, null, 2),
        huggingfaceUrl: hfMetadata.huggingface_url,
    };
};

export const findLoraOnHuggingFace = async (loraFile: File, existingMetadata?: string): Promise<{ previewImage: File, metadata: string, huggingfaceUrl: string }> => {
    // Check if the metadata contains a direct repo link first
    const repoMatch = existingMetadata?.match(/huggingface\.co\/([^/]+\/[^/]+)/);
    if (repoMatch) {
        return await fetchMetadataByRepoId(repoMatch[1]);
    }

    const loraFileHash = await calculateSHA256(loraFile);
    const fileName = loraFile.name;
    const baseNameLower = fileName.toLowerCase();
    
    const anchors = extractMetadataAnchors(existingMetadata || '');
    const cleanName = fileName.replace(/\.(safetensors|ckpt|pt|pth|bin|gguf)$/i, '');
    const tokens = cleanName.split(/[-_ .]/).filter(t => t.length > 2);
    
    const searchTerms = [
        ...anchors,
        cleanName,
        ...tokens,
    ].filter((v, i, a) => v && a.indexOf(v) === i);

    const processedRepoIds = new Set<string>();
    
    for (const query of searchTerms) {
        const searchUrl = `${HF_API_BASE}/models?search=${encodeURIComponent(query)}&full=true&limit=30&sort=downloads&direction=-1`;
        try {
            const response = await fetch(searchUrl);
            if (!response.ok) continue;
            const models: HfModel[] = await response.json();
            
            for (const model of models) {
                if (processedRepoIds.has(model.id)) continue;
                processedRepoIds.add(model.id);

                const fileMatch = model.siblings?.find(s => {
                    const hashMatch = loraFileHash && s.lfs?.oid === loraFileHash;
                    const nameMatch = s.rpath.toLowerCase().endsWith(baseNameLower);
                    return hashMatch || nameMatch;
                });

                if (fileMatch) {
                    const imageExtensions = ['.png', '.jpg', '.jpeg', '.webp'];
                    const previewKeywords = ['preview', 'sample', 'cover', 'thumb', 'example', 'image'];
                    
                    const previewFile = model.siblings?.find(s => {
                        const path = s.rpath.toLowerCase();
                        return imageExtensions.some(ext => path.endsWith(ext)) && 
                               previewKeywords.some(key => path.includes(key));
                    }) || model.siblings?.find(s => imageExtensions.some(ext => s.rpath.toLowerCase().endsWith(ext)));

                    if (previewFile) {
                        const imageUrl = `https://huggingface.co/${model.id}/resolve/main/${previewFile.rpath}`;
                        const previewImage = await urlToImageFile(imageUrl, `hf_preview_${model.id.replace('/', '_')}.jpg`);

                        const hfMetadata = {
                            'huggingface_repo': model.id,
                            'huggingface_url': `https://huggingface.co/${model.id}`,
                            'huggingface_file': fileMatch.rpath,
                            'huggingface_likes': model.likes,
                            'huggingface_downloads': model.downloads,
                            'verification_method': loraFileHash === fileMatch.lfs?.oid ? 'Cryptographic (Hash Match)' : 'Filename Match',
                            'platform_source': 'Hugging Face Hub'
                        };

                        return {
                            previewImage,
                            metadata: JSON.stringify(hfMetadata, null, 2),
                            huggingfaceUrl: hfMetadata.huggingface_url,
                        };
                    }
                }
            }
        } catch (e) {
            console.warn(`HF Discovery error for "${query}":`, e);
        }
    }
    throw new Error('Neural identification failed. No cryptographic or ID link found on Hugging Face.');
};
