export interface ImageMeta {
  parameters?: string; // Raw A1111 string
  parsedParameters?: {
    prompt?: string;
    negativePrompt?: string;
    steps?: string;
    sampler?: string;
    cfgScale?: string;
    seed?: string;
    size?: string;
    modelHash?: string;
    model?: string;
    denoisingStrength?: string;
    [key: string]: string | undefined;
  };
  workflow?: any;      // ComfyUI Workflow (JSON)
  prompt?: any;        // ComfyUI Prompt (JSON)
  software?: string;
  source?: 'A1111' | 'ComfyUI' | 'Unknown';
  [key: string]: any;
}

export const extractImageMetadata = async (file: File): Promise<ImageMeta> => {
  try {
    const buffer = await file.arrayBuffer();
    const view = new DataView(buffer);
    
    // PNG Signature Check: 89 50 4E 47 0D 0A 1A 0A
    if (view.getUint32(0) === 0x89504E47 && view.getUint32(4) === 0x0D0A1A0A) {
      const rawMeta = parsePngChunks(view);
      return processRawMetadata(rawMeta);
    }
    
    return { source: 'Unknown' };
  } catch (e) {
    console.error("Failed to parse image metadata", e);
    return { source: 'Unknown' };
  }
}

const processRawMetadata = (meta: any): ImageMeta => {
  const processed: ImageMeta = { ...meta, source: 'Unknown' };

  if (meta.workflow || meta.prompt) {
    processed.source = 'ComfyUI';
  }

  if (meta.parameters) {
    processed.source = 'A1111';
    processed.parsedParameters = parseA1111Parameters(meta.parameters);
  }

  return processed;
};

const parseA1111Parameters = (raw: string) => {
  const result: any = {};
  
  // Split into Prompt, Negative Prompt (optional), and the metadata line
  const parts = raw.split('\n');
  
  // The last line usually contains the settings
  const settingsLine = parts[parts.length - 1];
  
  // Find Negative prompt if it exists
  let negIndex = -1;
  parts.forEach((p, i) => {
    if (p.startsWith('Negative prompt: ')) negIndex = i;
  });

  if (negIndex !== -1) {
    result.prompt = parts.slice(0, negIndex).join('\n').trim();
    result.negativePrompt = parts[negIndex].replace('Negative prompt: ', '').trim();
  } else {
    result.prompt = parts.slice(0, parts.length - 1).join('\n').trim();
  }

  // Parse settings line: "Steps: 20, Sampler: Euler a, CFG scale: 7, Seed: 123..."
  const settings = settingsLine.split(', ');
  settings.forEach(s => {
    const [key, value] = s.split(': ');
    if (key && value) {
      const camelKey = key.trim().toLowerCase().replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => 
        index === 0 ? word.toLowerCase() : word.toUpperCase()
      ).replace(/\s+/g, '');
      result[camelKey] = value.trim();
    }
  });

  return result;
};

const parsePngChunks = (view: DataView): Record<string, any> => {
  const meta: any = {};
  let offset = 8;
  const decoder = new TextDecoder("utf-8");

  while (offset < view.byteLength) {
    if (offset + 8 > view.byteLength) break;

    const length = view.getUint32(offset);
    offset += 4;
    
    const type = decoder.decode(view.buffer.slice(offset, offset + 4));
    offset += 4;
    
    if (type === 'tEXt' || type === 'iTXt') {
      try {
        const chunkData = new Uint8Array(view.buffer, offset, length);
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
            // Quick skip over compression flags for common AI tools
            text = decoder.decode(chunkData.slice(nullIndex + 5)).replace(/^[\x00-\x1F]+/, '');
          }
          
          if (keyword === 'workflow' || keyword === 'prompt') {
            try { meta[keyword] = JSON.parse(text); } catch { meta[keyword] = text; }
          } else {
            meta[keyword] = text;
          }
        }
      } catch (e) { console.warn(`Error parsing PNG chunk ${type}`, e); }
    }
    
    offset += length + 4; // Skip data + CRC
    if (type === 'IEND') break;
  }
  return meta;
}
