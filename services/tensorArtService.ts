import { calculateSHA256 } from "./fileService";

const TENSORART_API_BASE = 'https://tensor.art/api/v1';

const urlToImageFile = async (imageUrl: string, fileName: string): Promise<File> => {
    // Tensor.Art uses a similar CDN to Civitai, add width param for better resolution
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

// Interfaces based on observed API responses from Tensor.Art
interface TensorArtImage {
    url: string;
    nsfw: boolean;
    width: number;
    height: number;
}

interface TensorArtModelInfo {
    id: number;
    name: string;
}

interface TensorArtModelVersion {
    id: number;
    modelId: number;
    name: string;
    baseModel: string;
    trainedWords: string[];
    images: TensorArtImage[];
    model: TensorArtModelInfo;
}

export const findLoraOnTensorArt = async (loraFile: File): Promise<{ previewImage: File, metadata: string, tensorArtUrl: string }> => {
    const hash = await calculateSHA256(loraFile);
    const response = await fetch(`${TENSORART_API_BASE}/model-versions/by-hash/${hash}`);

    if (!response.ok) {
        if (response.status === 404) {
            throw new Error('Model not found on Tensor.Art.');
        }
        throw new Error(`Tensor.Art API error: ${response.statusText}`);
    }

    const modelVersion: TensorArtModelVersion = await response.json();

    if (!modelVersion) {
        throw new Error('Model not found on Tensor.Art.');
    }

    // Prioritize non-NSFW images, but fall back to any image if needed
    let image = modelVersion.images?.find(img => !img.nsfw);
    if (!image && modelVersion.images && modelVersion.images.length > 0) {
        image = modelVersion.images[0];
    }

    if (!image || !image.url) {
        throw new Error('No suitable preview image found on Tensor.Art.');
    }
    
    const previewImage = await urlToImageFile(image.url, `tensorart_preview_${modelVersion.model.id}.jpg`);

    const tensorArtMetadata = {
        'tensorart_model_id': modelVersion.model.id,
        'tensorart_model_name': modelVersion.model.name,
        'tensorart_model_version_id': modelVersion.id,
        'ss_base_model': modelVersion.baseModel,
        'ss_trigger_words': modelVersion.trainedWords?.join(', '),
    };
    
    const tensorArtUrl = `https://tensor.art/models/${modelVersion.model.id}`;

    return {
        previewImage,
        metadata: JSON.stringify(tensorArtMetadata, null, 2),
        tensorArtUrl,
    };
};
