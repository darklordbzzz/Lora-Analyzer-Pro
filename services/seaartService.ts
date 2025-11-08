import { calculateSHA256 } from "./fileService";

const SEAART_API_BASE = 'https://www.seaart.ai/api/v1';

const urlToImageFile = async (imageUrl: string, fileName: string): Promise<File> => {
    const response = await fetch(imageUrl);
    if (!response.ok) {
        throw new Error(`Failed to download image: ${response.statusText}`);
    }
    const blob = await response.blob();
    return new File([blob], fileName, { type: blob.type || 'image/jpeg' });
};

// Interfaces based on observed API responses from SeaArt.ai
interface SeaArtModelItem {
    id: string;
    name: string;
    cover_url: string;
    type: string;
}

interface SeaArtModelDetail {
    data: {
        name: string;
        id: string;
        base_model: string;
        prompt_suggestion: string;
        model_gallery: { url: string; }[];
    }
}

const createSearchQuery = (fileName: string): string => {
    return fileName
        .toLowerCase()
        .replace(/\.safetensors$/, '')
        .replace(/[-_]/g, ' ')
        .trim();
};

export const findLoraOnSeaArt = async (loraFile: File): Promise<{ previewImage: File, metadata: string, seaartUrl: string }> => {
    const query = createSearchQuery(loraFile.name);
    if (!query) {
        throw new Error('Invalid filename for searching.');
    }
    
    // SeaArt search API requires a POST request
    const searchResponse = await fetch(`${SEAART_API_BASE}/model/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            keyword: query,
            page: 1,
            page_size: 10,
            sort: "1", // Sort by hot
            type_list: ["lora"],
        }),
    });

    if (!searchResponse.ok) {
        throw new Error(`SeaArt API search error: ${searchResponse.statusText}`);
    }

    const searchResult = await searchResponse.json();
    const models: SeaArtModelItem[] = searchResult?.data?.items || [];
    
    if (models.length === 0) {
        throw new Error('Model not found on SeaArt.ai.');
    }

    // Since we can't search by hash, we'll have to take the first result as the most likely candidate.
    const topMatch = models[0];

    const detailResponse = await fetch(`${SEAART_API_BASE}/model/detail?id=${topMatch.id}`);
     if (!detailResponse.ok) {
        throw new Error('Could not fetch model details from SeaArt.ai.');
    }
    
    const modelDetail: SeaArtModelDetail = await detailResponse.json();
    
    let imageUrl = modelDetail.data?.model_gallery?.[0]?.url || topMatch.cover_url;

    if (!imageUrl) {
        throw new Error('No suitable preview image found on SeaArt.ai.');
    }

    // SeaArt URLs might not have a protocol, so we add it.
    if (imageUrl.startsWith('//')) {
        imageUrl = 'https:' + imageUrl;
    }

    const previewImage = await urlToImageFile(imageUrl, `seaart_preview_${topMatch.id}.jpg`);
    
    const triggerWords = modelDetail.data?.prompt_suggestion
        ?.match(/<lora:.*?:1>(.*)/)?.[1]
        ?.split(',')
        .map(s => s.trim())
        .filter(Boolean) || [];

    const seaartMetadata = {
        'seaart_model_id': topMatch.id,
        'seaart_model_name': topMatch.name,
        'ss_base_model': modelDetail.data.base_model,
        'ss_trigger_words': triggerWords.join(', '),
    };

    const seaartUrl = `https://www.seaart.ai/models/detail/${topMatch.id}`;

    return {
        previewImage,
        metadata: JSON.stringify(seaartMetadata, null, 2),
        seaartUrl,
    };
};
