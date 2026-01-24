
import React, { useState, useCallback, useEffect, useMemo, forwardRef, useImperativeHandle, useRef } from 'react';
import type { LoraFileWithPreview, CustomIntegration } from '../types';
import { UploadIcon, FileIcon, XIcon, ImageIcon, CivitaiIcon, LoaderIcon, HuggingFaceIcon, DuplicateIcon, TensorArtIcon, SeaArtIcon, LinkIcon, SearchIcon, ChevronDownIcon, ServerIcon, CodeBracketIcon, FolderIcon, GlobeIcon, RefreshIcon } from './Icons';
import { findLoraOnCivitai } from '../services/civitaiService';
import { findLoraOnHuggingFace } from '../services/huggingfaceService';
import { findLoraOnTensorArt } from '../services/tensorArtService';
import { findLoraOnSeaArt } from '../services/seaartService';
import { calculateSHA256 } from '../services/fileService';
import { findLoraOnGenericPlatform } from '../services/genericIntegrationService';
import { readSafetensorsHeader, extractRelevantMetadata } from '../services/safetensorsService';

interface FileUploadProps {
  onFilesChange: (files: LoraFileWithPreview[]) => void;
  onAnalyzeSingleFile: (fileId: string) => void;
  disabled: boolean;
  customIntegrations: CustomIntegration[];
}

export interface FileUploadRef {
    openFileDialog: () => void;
}

type HashStatus = 'idle' | 'hashing' | 'done' | 'error' | 'skipped';

// Added missing URL properties to fix property access errors in handleFetchMetadata
interface FileListItem extends LoraFileWithPreview {
  hashStatus: HashStatus;
  parseStatus?: 'idle' | 'parsing' | 'done' | 'error';
  civitaiUrl?: string;
  huggingfaceUrl?: string;
  tensorArtUrl?: string;
  seaartUrl?: string;
  customUrls?: Record<string, string>;
}

const SUPPORTED_EXTENSIONS = ".safetensors, .ckpt, .pt, .pth, .bin, .gguf";

const FileUpload = forwardRef<FileUploadRef, FileUploadProps>(({ onFilesChange, onAnalyzeSingleFile, disabled, customIntegrations }, ref) => {
  const [fileItems, setFileItems] = useState<FileListItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [fetchStatus, setFetchStatus] = useState<Record<string, { loading: 'civitai' | 'hf' | 'tensorart' | 'seaart' | string | null; error?: string }>>({});
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [isFetchAllOpen, setIsFetchAllOpen] = useState(false);
  const [isBatchFetching, setIsBatchFetching] = useState(false);
  const [manualDirectoryPath, setManualDirectoryPath] = useState('');
  
  const onFilesChangeRef = useRef(onFilesChange);
  useEffect(() => { onFilesChangeRef.current = onFilesChange; }, [onFilesChange]);

  const debouncedOnFilesChange = useMemo(() => {
    let timeout: any;
    return (items: FileListItem[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        onFilesChangeRef.current(items);
      }, 150);
    };
  }, []);

  useImperativeHandle(ref, () => ({
    openFileDialog: () => {
        document.getElementById('file-upload-input')?.click();
    }
  }));

  useEffect(() => {
    debouncedOnFilesChange(fileItems);
  }, [fileItems, debouncedOnFilesChange]);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        if (!target.closest('.dropdown-trigger') && !target.closest('.dropdown-menu')) {
            setOpenDropdownId(null);
        }
        if (!target.closest('.batch-fetch-trigger') && !target.closest('.batch-fetch-menu')) {
            setIsFetchAllOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isValidFile = (file: File) => {
      const name = file.name.toLowerCase();
      return name.endsWith('.safetensors') || 
             name.endsWith('.ckpt') || 
             name.endsWith('.pt') || 
             name.endsWith('.pth') || 
             name.endsWith('.bin') ||
             name.endsWith('.gguf');
  }

  const handleFileDrop = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const newFiles = fileArray
        .filter((file): file is File => file instanceof File && isValidFile(file))
        .map(file => ({
            lora: file,
            preview: null,
            metadata: '',
            id: crypto.randomUUID(),
            hash: undefined,
            hashStatus: 'idle' as HashStatus,
            parseStatus: 'idle' as 'idle',
            // @ts-ignore
            relativePath: file.webkitRelativePath || file.name,
        }));
    
    setFileItems(prev => [...prev, ...newFiles]);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      handleFileDrop(event.target.files);
    }
    event.target.value = '';
  };

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    if (event.dataTransfer.files) {
        handleFileDrop(event.dataTransfer.files)
    }
  }, []);
  
  useEffect(() => {
    const itemsToProcess = fileItems.filter(item => item.hashStatus === 'idle' || item.parseStatus === 'idle');
    if (itemsToProcess.length === 0) return;

    setFileItems(prev => prev.map(item => {
        if (itemsToProcess.find(i => i.id === item.id)) {
            return {
                ...item,
                hashStatus: item.hashStatus === 'idle' ? 'hashing' : item.hashStatus,
                parseStatus: item.parseStatus === 'idle' ? 'parsing' : item.parseStatus,
            };
        }
        return item;
    }));

    itemsToProcess.forEach(async (item) => {
        let updates: Partial<FileListItem> = {};
        if (item.hashStatus === 'idle') {
             try {
                 const hash = await calculateSHA256(item.lora);
                 updates.hash = hash;
                 updates.hashStatus = hash ? 'done' : 'skipped';
             } catch (e) {
                 updates.hashStatus = 'error';
             }
        }
        if (item.parseStatus === 'idle') {
            try {
                if (item.lora.name.endsWith('.safetensors')) {
                    const header = await readSafetensorsHeader(item.lora);
                    const extractedMeta = header ? extractRelevantMetadata(header) : '';
                    updates.metadata = extractedMeta || item.metadata;
                    updates.parseStatus = 'done';
                } else {
                    updates.parseStatus = 'done';
                }
            } catch (e) {
                updates.parseStatus = 'error';
            }
        }
        if (Object.keys(updates).length > 0) {
            setFileItems(prev => prev.map(i => i.id === item.id ? { ...i, ...updates } : i));
        }
    });
  }, [fileItems]); 

  const handleRemoveFile = (id: string) => {
    const newFiles = fileItems.filter(item => item.id !== id);
    setFileItems(newFiles);
    setFetchStatus(prev => {
        const newStatus = {...prev};
        delete newStatus[id];
        return newStatus;
    });
  };
  
  const handlePreviewChange = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFileItems(prev => prev.map(item => item.id === id ? { ...item, preview: file } : item));
      e.target.value = '';
    }
  };

  const handleMetadataChange = (id: string, e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setFileItems(prev => prev.map(item => item.id === id ? { ...item, metadata: val } : item));
    
    if (val.includes('huggingface.co/')) {
        handleFetchMetadata(id, 'hf');
    }
  };
  
  const performFetchMetadata = async (id: string, source: 'civitai' | 'hf' | 'tensorart' | 'seaart' | string, integration?: CustomIntegration) => {
      const itemIndex = fileItems.findIndex(item => item.id === id);
      if (itemIndex === -1) return;
      
      const item = fileItems[itemIndex];
      setFetchStatus(prev => ({ ...prev, [id]: { loading: source, error: undefined } }));

      try {
          let result;
          if (integration) {
               result = await findLoraOnGenericPlatform(fileItems[itemIndex].lora, integration.baseUrl, integration.name);
          } else {
              switch (source) {
                  case 'civitai': result = await findLoraOnCivitai(fileItems[itemIndex].lora); break;
                  case 'hf': result = await findLoraOnHuggingFace(fileItems[itemIndex].lora, item.metadata); break;
                  case 'tensorart': result = await findLoraOnTensorArt(fileItems[itemIndex].lora); break;
                  case 'seaart': result = await findLoraOnSeaArt(fileItems[itemIndex].lora); break;
                  default: throw new Error(`Unknown source: ${source}`);
              }
          }

          const { previewImage, metadata, civitaiUrl, huggingfaceUrl, tensorArtUrl, seaartUrl, platformUrl } = result as any;
          
          setFileItems(currentItems => {
              const idx = currentItems.findIndex(i => i.id === id);
              if (idx === -1) return currentItems;
              
              const currentItem = currentItems[idx];
              let finalPreview = currentItem.preview;
              if (previewImage) finalPreview = previewImage;

              let combinedMetadata = currentItem.metadata;
              if (metadata) {
                   try {
                       const existing = currentItem.metadata ? JSON.parse(currentItem.metadata) : {};
                       const fetched = JSON.parse(metadata);
                       const merged = { ...existing, ...fetched };
                       combinedMetadata = JSON.stringify(merged, null, 2);
                   } catch {
                       combinedMetadata = (currentItem.metadata ? currentItem.metadata + '\n\n' : '') + metadata;
                   }
              }

              const updatedItem = { 
                  ...currentItem, 
                  preview: finalPreview, 
                  metadata: combinedMetadata,
                  civitaiUrl: civitaiUrl || currentItem.civitaiUrl,
                  huggingfaceUrl: huggingfaceUrl || currentItem.huggingfaceUrl,
                  tensorArtUrl: tensorArtUrl || currentItem.tensorArtUrl,
                  seaartUrl: seaartUrl || currentItem.seaartUrl,
                  customUrls: platformUrl && integration ? { ...(currentItem.customUrls || {}), [integration.name]: platformUrl } : currentItem.customUrls
              };

              const newArr = [...currentItems];
              newArr[idx] = updatedItem;
              return newArr;
          });

          setFetchStatus(prev => ({ ...prev, [id]: { loading: null } }));
          return id; 

      } catch (error: any) {
          setFetchStatus(prev => ({ ...prev, [id]: { loading: null, error: error.message || 'Unknown error' } }));
          throw error;
      }
  };

  const handleFetchMetadata = async (id: string, source: 'civitai' | 'hf' | 'tensorart' | 'seaart' | string, integration?: CustomIntegration) => {
    setOpenDropdownId(null);
    try {
        await performFetchMetadata(id, source, integration);
        onAnalyzeSingleFile(id);
    } catch (e) {}
  };

  const handleFetchAll = async (source: 'civitai' | 'hf' | 'tensorart' | 'seaart' | string, integration?: CustomIntegration) => {
      setIsFetchAllOpen(false);
      setIsBatchFetching(true);
      const filesToProcess = fileItems.filter(f => !fetchStatus[f.id]?.loading);
      for (const file of filesToProcess) {
          try {
              const resultId = await performFetchMetadata(file.id, source, integration);
              if(resultId) onAnalyzeSingleFile(resultId);
          } catch (e) {}
          await new Promise(r => setTimeout(r, 500));
      }
      setIsBatchFetching(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <div
        onDrop={handleDrop}
        onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onClick={() => document.getElementById('file-upload-input')?.click()}
        className={`p-8 rounded-[2.5rem] transition-all border-2 border-dashed flex flex-col items-center justify-center text-center gap-4 group cursor-pointer shadow-xl ${isDragging ? 'bg-indigo-900/40 border-indigo-500' : 'bg-gray-900/30 border-gray-700 hover:bg-gray-800/50 hover:border-indigo-500/30'}`}
      >
        <div className={`p-5 rounded-3xl transition-all duration-500 ${isDragging ? 'bg-indigo-500/20 scale-110 shadow-[0_0_30px_rgba(99,102,241,0.2)]' : 'bg-gray-800 group-hover:bg-gray-700 shadow-inner'}`}>
            <UploadIcon className={`h-10 w-10 transition-colors ${isDragging ? 'text-indigo-400' : 'text-gray-500 group-hover:text-indigo-400'}`} />
        </div>
        <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-gray-300 group-hover:text-white transition-colors">Neural Asset Intake</p>
            <p className="text-[10px] text-gray-600 mt-2 uppercase font-black tracking-widest opacity-60">Safetensors / GGUF / CKPT</p>
        </div>
        <input id="file-upload-input" type="file" multiple accept={SUPPORTED_EXTENSIONS} className="hidden" onChange={handleFileSelect} disabled={disabled} />
        <input 
            id="folder-upload-input" 
            type="file" 
            {...({ webkitdirectory: "", directory: "", mozdirectory: "" } as any)} 
            className="hidden" 
            onChange={handleFileSelect} 
            disabled={disabled} 
        />
      </div>

      <div className="flex flex-col gap-3 bg-gray-900/50 p-6 rounded-[2rem] border border-gray-800 shadow-inner">
        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Volume Path Protocol (Mass Scan)</label>
        <div className="flex gap-2">
            <input 
                type="text" 
                value={manualDirectoryPath} 
                onChange={(e) => setManualDirectoryPath(e.target.value)} 
                placeholder="Paste directory path string for reference..."
                className="flex-grow px-4 py-3 bg-gray-950 border border-gray-800 rounded-xl text-xs text-indigo-400 font-mono focus:border-indigo-500 outline-none shadow-inner"
            />
        </div>
        <button 
            onClick={(e) => { e.stopPropagation(); document.getElementById('folder-upload-input')?.click(); }} 
            className="w-full flex items-center justify-center gap-3 px-6 py-4 text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 hover:text-white bg-indigo-950/20 hover:bg-indigo-600 shadow-lg rounded-2xl border border-indigo-500/20 transition-all active:scale-95 group"
        >
            <FolderIcon className="h-4 w-4 group-hover:scale-110 transition-transform" /> 
            Select Local Folder Target
        </button>
        <p className="text-[8px] text-gray-600 uppercase font-bold text-center px-4 tracking-tighter">Security Protocol: Browsers require explicit selection to recursive-scan bitstreams.</p>
      </div>

      {fileItems.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-gray-800 pb-4 px-2">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">{fileItems.length} Nodes in Buffer</span>
              <div className="relative batch-fetch-trigger">
                   <button onClick={() => setIsFetchAllOpen(!isFetchAllOpen)} disabled={isBatchFetching} className="flex items-center gap-3 px-4 py-2 bg-indigo-900/30 hover:bg-indigo-600 text-indigo-300 hover:text-white text-[10px] font-black uppercase rounded-xl border border-indigo-500/20 transition-all shadow-lg disabled:opacity-50">
                        {isBatchFetching ? <LoaderIcon className="h-4 w-4 animate-spin" /> : <RefreshIcon className="h-4 w-4" />}
                        Batch Resolve
                        <ChevronDownIcon className={`h-4 w-4 transition-transform ${isFetchAllOpen ? 'rotate-180' : ''}`} />
                   </button>
                   {isFetchAllOpen && (
                        <div className="absolute right-0 top-full mt-3 w-64 bg-gray-900 border border-gray-700 rounded-2xl shadow-[0_25px_50px_rgba(0,0,0,0.5)] z-50 overflow-hidden batch-fetch-menu animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="p-3 space-y-1.5">
                                <p className="px-4 py-3 text-[9px] text-gray-500 font-black uppercase tracking-[0.3em] border-b border-gray-800 mb-2">Target Registry</p>
                                <button onClick={() => handleFetchAll('civitai')} className="w-full flex items-center gap-4 px-4 py-3 text-[11px] font-black uppercase tracking-tighter text-gray-400 hover:bg-indigo-600 hover:text-white rounded-xl transition-all text-left"><CivitaiIcon className="h-4 w-4" /> Civitai Bridge</button>
                                <button onClick={() => handleFetchAll('hf')} className="w-full flex items-center gap-4 px-4 py-3 text-[11px] font-black uppercase tracking-tighter text-gray-400 hover:bg-indigo-600 hover:text-white rounded-xl transition-all text-left"><HuggingFaceIcon className="h-4 w-4" /> Hugging Face</button>
                                <button onClick={() => handleFetchAll('tensorart')} className="w-full flex items-center gap-4 px-4 py-3 text-[11px] font-black uppercase tracking-tighter text-gray-400 hover:bg-indigo-600 hover:text-white rounded-xl transition-all text-left"><TensorArtIcon className="h-4 w-4" /> Tensor.Art</button>
                                <button onClick={() => handleFetchAll('seaart')} className="w-full flex items-center gap-4 px-4 py-3 text-[11px] font-black uppercase tracking-tighter text-gray-400 hover:bg-indigo-600 hover:text-white rounded-xl transition-all text-left"><SeaArtIcon className="h-4 w-4" /> SeaArt Hub</button>
                            </div>
                        </div>
                    )}
              </div>
          </div>

          <div className="space-y-4 max-h-[550px] overflow-y-auto pr-2 pb-32 custom-scrollbar">
            {fileItems.map((file) => {
              const status = fetchStatus[file.id] || { loading: null };
              const isHashing = file.hashStatus === 'hashing';
              const isParsing = file.parseStatus === 'parsing';
              return (
                <div key={file.id} className="bg-gray-800/40 border border-gray-700/50 rounded-3xl p-5 shadow-xl hover:border-indigo-500/30 transition-all group relative">
                  <div className="flex items-start gap-5 mb-5">
                      <div className="p-3 bg-gray-950 rounded-2xl shrink-0 shadow-inner">
                          {isHashing || isParsing ? <LoaderIcon className="h-6 w-6 text-indigo-400 animate-spin"/> : <FileIcon className="h-6 w-6 text-indigo-500 opacity-60"/>}
                      </div>
                      <div className="min-w-0 flex-grow">
                          <p className="font-black text-white text-[13px] truncate uppercase tracking-tight" title={file.relativePath}>{file.relativePath.split(/[\\/]/).pop()}</p>
                          <div className="flex items-center gap-3 text-[10px] font-black uppercase text-gray-500 mt-2 tracking-widest">
                              <span className="bg-gray-900/80 px-2 py-1 rounded-lg text-gray-400 border border-gray-700/30">{(file.lora.size / (1024 * 1024)).toFixed(1)} MB</span>
                              {file.hash && <span className="font-mono bg-indigo-900/10 px-2 py-1 rounded-lg text-indigo-400 border border-indigo-500/10">{file.hash.substring(0,12)}</span>}
                          </div>
                      </div>
                      <button onClick={() => handleRemoveFile(file.id)} className="text-gray-600 hover:text-white p-3 bg-gray-950 hover:bg-red-600 rounded-2xl transition-all shadow-lg active:scale-90"><XIcon className="h-4 w-4" /></button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                      <div className="relative dropdown-trigger">
                          <button 
                              onClick={(e) => { e.stopPropagation(); setOpenDropdownId(openDropdownId === file.id ? null : file.id); }}
                              className="w-full flex items-center justify-between px-4 py-3 bg-gray-950/60 hover:bg-indigo-600 hover:text-white text-[10px] font-black uppercase tracking-widest text-gray-400 rounded-2xl border border-gray-800 transition-all disabled:opacity-50 shadow-inner"
                              disabled={!!status.loading}
                          >
                              <span className="flex items-center gap-3">
                                  {status.loading ? <LoaderIcon className="h-4 w-4 animate-spin" /> : <GlobeIcon className="h-4 w-4" />}
                                  {status.loading ? 'Sync' : 'Resolve'}
                              </span>
                              <ChevronDownIcon className={`h-4 w-4 transition-transform ${openDropdownId === file.id ? 'rotate-180' : ''}`} />
                          </button>
                          {openDropdownId === file.id && (
                              <div className="absolute left-0 right-0 top-full mt-2 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl z-50 overflow-hidden dropdown-menu animate-in fade-in slide-in-from-top-1 duration-200">
                                  <div className="p-2 space-y-1">
                                      <button onClick={() => handleFetchMetadata(file.id, 'civitai')} className="w-full flex items-center gap-4 px-4 py-3 text-[11px] font-black uppercase tracking-tighter text-gray-400 hover:bg-indigo-600 hover:text-white rounded-xl transition-all text-left">Civitai Bridge</button>
                                      <button onClick={() => handleFetchMetadata(file.id, 'hf')} className="w-full flex items-center gap-4 px-4 py-3 text-[11px] font-black uppercase tracking-tighter text-gray-400 hover:bg-indigo-600 hover:text-white rounded-xl transition-all text-left">Hugging Face</button>
                                      <button onClick={() => handleFetchMetadata(file.id, 'tensorart')} className="w-full flex items-center gap-4 px-4 py-3 text-[11px] font-black uppercase tracking-tighter text-gray-400 hover:bg-indigo-600 hover:text-white rounded-xl transition-all text-left">Tensor.Art</button>
                                  </div>
                              </div>
                          )}
                      </div>

                      <label className="flex items-center justify-center gap-3 px-4 py-3 bg-gray-950/60 hover:bg-gray-800 text-[10px] font-black uppercase tracking-widest text-gray-400 rounded-2xl cursor-pointer border border-gray-800 transition-all shadow-inner">
                          <ImageIcon className={`h-4 w-4 ${file.preview ? 'text-green-500' : 'text-indigo-500'}`} />
                          {file.preview ? 'Ready' : 'Cover'}
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePreviewChange(file.id, e)} />
                      </label>
                  </div>
                  
                  <div className="mt-3">
                    <textarea
                          placeholder="Intelligence DNA or Repository URL..."
                          value={file.metadata}
                          onChange={(e) => handleMetadataChange(file.id, e)}
                          className="w-full py-3 px-4 bg-gray-950 text-indigo-300 text-[10px] rounded-2xl border border-gray-800 focus:border-indigo-500 focus:ring-0 resize-none font-mono custom-scrollbar h-12 shadow-inner leading-relaxed"
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  );
});

FileUpload.displayName = 'FileUpload';
export default FileUpload;
