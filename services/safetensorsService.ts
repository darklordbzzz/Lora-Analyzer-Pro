export const readSafetensorsHeader = async (file: File): Promise<Record<string, any> | null> => {
  const HEADER_SIZE_LENGTH = 8;
  if (file.size < HEADER_SIZE_LENGTH) return null;

  try {
    const sizeBuffer = await file.slice(0, HEADER_SIZE_LENGTH).arrayBuffer();
    const dataView = new DataView(sizeBuffer);
    const headerSize = Number(dataView.getBigUint64(0, true));

    if (headerSize <= 0 || headerSize > 100 * 1024 * 1024) return null;

    const headerBuffer = await file.slice(HEADER_SIZE_LENGTH, HEADER_SIZE_LENGTH + headerSize).arrayBuffer();
    const decoder = new TextDecoder('utf-8');
    const jsonString = decoder.decode(headerBuffer);

    return JSON.parse(jsonString);
  } catch (error) {
    console.warn("Safetensors header parse failure:", error);
    return null;
  }
};

export const extractRelevantMetadata = (rawHeader: Record<string, any>): string => {
   if (!rawHeader) return '';

   const metadata = rawHeader['__metadata__'] || {};
   const cleanMetadata: Record<string, any> = {};

   const keysToExclude = [
       'ss_tag_frequency', 
       'ss_bucket_info', 
       'ss_dataset_dirs',
       'ss_caption_dropout_rate'
   ];

   // Search in both root and __metadata__ for platform identification keys
   const source = Object.keys(metadata).length > 0 ? metadata : rawHeader;

   Object.keys(source).forEach(key => {
       const isExclude = keysToExclude.some(exclude => key.includes(exclude));
       const isInteresting = 
            key.startsWith('ss_') || 
            key === 'model_id' || // Critical for cross-platform linking
            key.includes('civitai') ||
            key === 'modelspec.title' ||
            key.includes('epoch') || 
            key.includes('step');

       if (!isExclude && isInteresting) {
            const value = source[key];
            // If it's a JSON string (common for model_id), try to keep it as is
            if (typeof value === 'string' && value.length > 2000) {
                 cleanMetadata[key] = value.substring(0, 2000) + '...';
            } else {
                 cleanMetadata[key] = value;
            }
       }
   });

   return JSON.stringify(cleanMetadata, null, 2);
};