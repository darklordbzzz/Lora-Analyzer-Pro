
import { calculateSHA256 } from "./fileService";

// Re-using the Civitai structure as a baseline for the generic API response.
// This is a reasonable assumption for platforms that offer a similar service.
interface GenericImage {
    url: string;
    nsfw: 'None' | 'Soft' | 'Mature' | 'X' | boolean;
    width?: number;
    height?: number;
}

interface GenericModelInfo {
    id: number | string;
    name: string;
}

interface GenericModelVersion {
    id: number | string;
    modelId: number | string;
    name: string;
    baseModel: string;
    trainedWords: string[];
    images: GenericImage[];
    model: GenericModelInfo;
}

const urlToImageFile = async (imageUrl: string, fileName: string): Promise<File> => {
    const url = new URL(imageUrl);
    // Many image CDNs use a width param
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

export const findLoraOnGenericPlatform = async (
    loraFile: File,
    baseUrl: string,
    platformName: string
): Promise<{ previewImage: File, metadata: string, platformUrl: string }> => {
    const hash = await calculateSHA256(loraFile);
    const apiUrl = `${baseUrl.replace(/\/$/, '')}/model-versions/by-hash/${hash}`;
    const response = await fetch(apiUrl);

    if (!response.ok) {
        if (response.status === 404) {
            throw new Error(`Model not found on ${platformName}.`);
        }
        throw new Error(`${platformName} API error: ${response.statusText}`);
    }

    const modelVersion: GenericModelVersion = await response.json();

    if (!modelVersion) {
        throw new Error(`Model not found on ${platformName}.`);
    }

    let image = modelVersion.images?.find(img => img.nsfw === 'None' || img.nsfw === false);
    if (!image && modelVersion.images && modelVersion.images.length > 0) {
        image = modelVersion.images[0];
    }

    if (!image || !image.url) {
        throw new Error(`No suitable preview image found on ${platformName}.`);
    }
    
    const previewImage = await urlToImageFile(image.url, `${platformName.toLowerCase()}_preview_${modelVersion.model.id}.jpg`);

    const metadataKeyPrefix = platformName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const platformMetadata = {
        [`${metadataKeyPrefix}_model_id`]: modelVersion.model.id,
        [`${metadataKeyPrefix}_model_name`]: modelVersion.model.name,
        [`${metadataKeyPrefix}_model_version_id`]: modelVersion.id,
        'ss_base_model': modelVersion.baseModel,
        'ss_trigger_words': modelVersion.trainedWords?.join(', '),
    };
    
    // Assumption: platform URL is something like `platform.com/models/:id`
    // This constructs a plausible URL by removing common API path segments from the base URL.
    const platformUrl = `${baseUrl.replace(/\/api\/v\d+$/, '')}/models/${modelVersion.model.id}`;


    return {
        previewImage,
        metadata: JSON.stringify(platformMetadata, null, 2),
        platformUrl,
    };
};
