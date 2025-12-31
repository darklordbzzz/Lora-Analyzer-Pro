export const calculateSHA256 = async (file: File): Promise<string | undefined> => {
    // Large file handling strategy:
    // 1. Files > 2GB can crash some browser environments if read at once.
    // 2. We use a "Quick Hash" (Header + Tail) for identification of extremely large files.
    // 3. For standard assets, we do full hash for best identification.
    
    // Increased to 1GB to support larger LoRAs and standard SDXL checkpoints.
    const FULL_HASH_LIMIT = 1024 * 1024 * 1024; 

    if (file.size > FULL_HASH_LIMIT) {
        return calculateQuickHash(file);
    }

    try {
        const buffer = await file.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
        console.warn(`Full hash failed for ${file.name}, falling back to quick hash.`, e);
        return calculateQuickHash(file);
    }
};

const calculateQuickHash = async (file: File): Promise<string> => {
    // "Quick Hash" - Hashes the first 256KB and last 256KB of the file.
    try {
        const CHUNK_SIZE = 256 * 1024; // 256KB
        const start = file.slice(0, CHUNK_SIZE);
        const end = file.slice(Math.max(0, file.size - CHUNK_SIZE), file.size);
        
        const startBuffer = await start.arrayBuffer();
        const endBuffer = await end.arrayBuffer();
        
        const combined = new Uint8Array(startBuffer.byteLength + endBuffer.byteLength);
        combined.set(new Uint8Array(startBuffer), 0);
        combined.set(new Uint8Array(endBuffer), startBuffer.byteLength);
        
        const hashBuffer = await crypto.subtle.digest('SHA-256', combined);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return 'quick-' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
        console.error("Quick hash failed", e);
        return undefined as any;
    }
}

export const createThumbnail = (file: File, maxWidth: number = 320, quality: number = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error("Could not get canvas context"));
                    return;
                }
                
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = () => reject(new Error("Failed to load image for thumbnail"));
            img.src = e.target?.result as string;
        };
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
    });
};