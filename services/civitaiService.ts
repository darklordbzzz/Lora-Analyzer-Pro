import { calculateSHA256 } from "./fileService";

const CIVITAI_API_BASE = 'https://civitai.com/api/v1';

const urlToImageFile = async (imageUrl: string, fileName: string): Promise<File> => {
    const url = new URL(imageUrl);
    if (!url.searchParams.has('width')) {
        url.searchParams.set('width', '1024');
    }

    const response = await fetch(url.toString());
    if (!response.ok) {
        throw new Error(`Failed to download image: ${response.statusText}`);
    }
    const blob = await response.blob();
    const mimeType = blob.type || 'image/jpeg';
    return new File([blob], fileName, { type: mimeType });
};

interface CivitaiImage {
    url: string;
    nsfw: 'None' | 'Soft' | 'Mature' | 'X' | boolean;
    width: number;
    height: number;
}

interface CivitaiModelInfo {
    id: number;
    name: string;
}

interface CivitaiModelVersion {
    id: number;
    modelId: number;
    name: string;
    baseModel: string;
    trainedWords: string[];
    images: CivitaiImage[];
    model: CivitaiModelInfo;
}

export const findLoraOnCivitai = async (loraFile: File): Promise<{ previewImage: File, metadata: string, civitaiUrl: string }> => {
    const hash = await calculateSHA256(loraFile);
    const response = await fetch(`${CIVITAI_API_BASE}/model-versions/by-hash/${hash}`);

    if (!response.ok) {
        if (response.status === 404) {
            throw new Error('Model not found on Civitai.');
        }
        throw new Error(`Civitai API error: ${response.statusText}`);
    }

    const modelVersion: CivitaiModelVersion = await response.json();

    if (!modelVersion) {
        throw new Error('Model not found on Civitai.');
    }

    let image = modelVersion.images?.find(img => img.nsfw === 'None' || img.nsfw === false);

    if (!image && modelVersion.images && modelVersion.images.length > 0) {
        image = modelVersion.images[0];
    }

    if (!image || !image.url) {
        throw new Error('No suitable preview image found on Civitai.');
    }
    
    const previewImage = await urlToImageFile(image.url, `civitai_preview_${modelVersion.model.id}.jpg`);

    const civitaiMetadata = {
        'civitai_model_id': modelVersion.model.id,
        'civitai_model_name': modelVersion.model.name,
        'civitai_model_version_id': modelVersion.id,
        'ss_base_model': modelVersion.baseModel,
        'ss_trigger_words': modelVersion.trainedWords?.join(', '),
    };
    
    const civitaiUrl = `https://civitai.com/models/${modelVersion.model.id}`;

    return {
        previewImage,
        metadata: JSON.stringify(civitaiMetadata, null, 2),
        civitaiUrl,
    };
};
