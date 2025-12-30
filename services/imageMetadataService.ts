
export interface ImageMeta {
  parameters?: string; // A1111 Generation Info
  workflow?: any;      // ComfyUI Workflow (JSON)
  prompt?: any;        // ComfyUI Prompt (JSON)
  software?: string;
  [key: string]: any;
}

export const extractImageMetadata = async (file: File): Promise<ImageMeta> => {
  try {
      const buffer = await file.arrayBuffer();
      const view = new DataView(buffer);
      
      // PNG Signature: 89 50 4E 47 0D 0A 1A 0A
      if (view.getUint32(0) === 0x89504E47 && view.getUint32(4) === 0x0D0A1A0A) {
        return parsePngChunks(view);
      }
      
      // TODO: Implement JPEG/WebP logic if needed (Exif parsing is more complex without libs)
      // For now, return empty or try basic text scan (unreliable for binary formats)
      return {};
  } catch (e) {
      console.error("Failed to parse image metadata", e);
      return {};
  }
}

const parsePngChunks = (view: DataView): ImageMeta => {
  const meta: ImageMeta = {};
  let offset = 8; // Skip signature
  
  const decoder = new TextDecoder("utf-8");

  while (offset < view.byteLength) {
    if (offset + 8 > view.byteLength) break; // Safety check

    const length = view.getUint32(offset); // Chunk length (Big Endian)
    offset += 4;
    
    const type = decoder.decode(view.buffer.slice(offset, offset + 4));
    offset += 4;
    
    // Check if we care about this chunk
    if (type === 'tEXt' || type === 'iTXt') {
        try {
            const chunkData = new Uint8Array(view.buffer, offset, length);
            
            // tEXt format: Keyword + Null + Text
            // iTXt format: Keyword + Null + CompFlag + CompMethod + LangTags + Null + TransKeyword + Null + Text
            // For simplicity, we assume standard non-compressed tEXt/iTXt usage common in AI generators
            
            let nullIndex = -1;
            for(let i=0; i<chunkData.length; i++) {
                if(chunkData[i] === 0) { nullIndex = i; break; }
            }
            
            if (nullIndex > -1) {
                const keyword = decoder.decode(chunkData.slice(0, nullIndex));
                let text = "";

                if (type === 'tEXt') {
                     text = decoder.decode(chunkData.slice(nullIndex + 1));
                } else if (type === 'iTXt') {
                    // Quick parsing for iTXt, skipping compression flags etc for now as mostly uncompressed in Comfy
                    // Strictly, iTXt structure is complex. We'll do a loose parse for "workflow" keywords.
                    // Usually: keyword \0 0 0 \0 \0 text
                    const rawText = chunkData.slice(nullIndex + 1);
                    // Find the start of the actual text (after language tags etc)
                    // The spec says there are 2 more null separators before text.
                    let separatorCount = 0;
                    let textStart = 0;
                     for(let j=0; j<rawText.length; j++) {
                        if(rawText[j] === 0) separatorCount++;
                        if(separatorCount >= 2 && type === 'iTXt') { // actually iTXt has distinct structure
                             // Heuristic: Just convert rest to string and clean up if needed
                             // ComfyUI usually writes clean UTF8 here
                        }
                    }
                    // Fallback simple decode for now
                    text = decoder.decode(rawText).replace(/^[\x00\x01]+/, ''); // rough cleanup
                }
                
                // Parse JSON if possible
                if (keyword === 'workflow' || keyword === 'prompt') {
                    try {
                        meta[keyword] = JSON.parse(text);
                    } catch {
                        meta[keyword] = text;
                    }
                } else if (keyword === 'parameters') {
                    meta[keyword] = text;
                } else {
                    meta[keyword] = text;
                }
            }
        } catch (e) {
            console.warn(`Error parsing PNG chunk ${type}`, e);
        }
    }
    
    offset += length + 4; // Skip data + CRC
    
    if (type === 'IEND') break;
  }
  
  return meta;
}
