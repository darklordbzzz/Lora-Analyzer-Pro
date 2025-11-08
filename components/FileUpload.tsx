import React, { useState, useCallback, useEffect, useMemo } from 'react';
import type { LoraFileWithPreview, CustomIntegration } from '../types';
import { UploadIcon, FileIcon, XIcon, ImageIcon, InfoIcon, CivitaiIcon, LoaderIcon, HuggingFaceIcon, DuplicateIcon, TensorArtIcon, SeaArtIcon, MageSpaceIcon, LinkIcon } from './Icons';
import { findLoraOnCivitai } from '../services/civitaiService';
import { findLoraOnHuggingFace } from '../services/huggingfaceService';
import { findLoraOnTensorArt } from '../services/tensorArtService';
import { findLoraOnSeaArt } from '../services/seaartService';
import { findLoraOnMageSpace } from '../services/mageSpaceService';
import { calculateSHA256 } from '../services/fileService';
import { findLoraOnGenericPlatform } from '../services/genericIntegrationService';

interface FileUploadProps {
  onFilesChange: (files: LoraFileWithPreview[]) => void;
  onAnalyzeSingleFile: (fileId: string) => void;
  disabled: boolean;
  customIntegrations: CustomIntegration[];
}

type HashStatus = 'idle' | 'hashing' | 'done' | 'error';
interface FileListItem extends LoraFileWithPreview {
  hashStatus: HashStatus;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFilesChange, onAnalyzeSingleFile, disabled, customIntegrations }) => {
  const [fileItems, setFileItems] = useState<FileListItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [fetchStatus, setFetchStatus] = useState<Record<string, { loading: 'civitai' | 'hf' | 'tensorart' | 'seaart' | 'magespace' | string | null; error?: string }>>({});

  const updateFiles = useCallback((updatedItems: FileListItem[]) => {
    setFileItems(updatedItems);
    onFilesChange(updatedItems);
  }, [onFilesChange]);
  
  const handleFileDrop = (files: FileList) => {
    const newFiles = Array.from(files)
        .filter((file): file is File => file instanceof File && file.name.toLowerCase().endsWith('.safetensors'))
        .map(file => ({
            lora: file,
            preview: null,
            metadata: '',
            id: crypto.randomUUID(),
            hash: undefined,
            hashStatus: 'idle' as HashStatus,
            // @ts-ignore - webkitRelativePath is a non-standard property
            relativePath: file.webkitRelativePath || file.name,
        }));
    updateFiles([...fileItems, ...newFiles]);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      handleFileDrop(event.target.files);
    }
  };

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    if (event.dataTransfer.files) {
        handleFileDrop(event.dataTransfer.files)
    }
  }, [fileItems, updateFiles]);
  
  useEffect(() => {
    const itemsToHash = fileItems.filter(item => item.hashStatus === 'idle');
    if (itemsToHash.length === 0) return;

    const hashFile = async (item: FileListItem) => {
        try {
            const hash = await calculateSHA256(item.lora);
            setFileItems(prev => prev.map(i => i.id === item.id ? { ...i, hash, hashStatus: 'done' as HashStatus } : i));
        } catch (e) {
            console.error(`Error hashing ${item.lora.name}:`, e);
             setFileItems(prev => prev.map(i => i.id === item.id ? { ...i, hashStatus: 'error' as HashStatus } : i));
        }
    };

    itemsToHash.forEach(item => {
        setFileItems(prev => prev.map(i => i.id === item.id ? { ...i, hashStatus: 'hashing' as HashStatus } : i));
        hashFile(item);
    });
  }, [fileItems]);

  useEffect(() => {
    onFilesChange(fileItems);
  }, [fileItems, onFilesChange]);

  const duplicateInfo = useMemo(() => {
    const hashes: Record<string, FileListItem[]> = {};
    fileItems.forEach(item => {
        if (item.hash && item.hashStatus === 'done') {
            if (!hashes[item.hash]) hashes[item.hash] = [];
            hashes[item.hash].push(item);
        }
    });

    const duplicates: Record<string, FileListItem[]> = {};
    Object.values(hashes).forEach(items => {
        if (items.length > 1) {
            items.forEach(item => {
                duplicates[item.id] = items.filter(other => other.id !== item.id);
            });
        }
    });
    return duplicates;
  }, [fileItems]);


  const handleDragEvents = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.type === 'dragenter' || event.type === 'dragover') {
      setIsDragging(true);
    } else if (event.type === 'dragleave') {
      setIsDragging(false);
    }
  };

  const handleRemoveFile = (id: string) => {
    const newFiles = fileItems.filter(item => item.id !== id);
    updateFiles(newFiles);
    setFetchStatus(prev => {
        const newStatus = {...prev};
        delete newStatus[id];
        return newStatus;
    });
  };
  
  const handlePreviewChange = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const newItems = [...fileItems];
      const itemIndex = newItems.findIndex(item => item.id === id);
      if (itemIndex > -1) {
          newItems[itemIndex].preview = e.target.files[0];
          updateFiles(newItems);
      }
    }
  };

  const handleMetadataChange = (id: string, e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newItems = [...fileItems];
    const itemIndex = newItems.findIndex(item => item.id === id);
    if (itemIndex > -1) {
        newItems[itemIndex].metadata = e.target.value;
        updateFiles(newItems);
    }
  };
  
  const handleFindOnCivitai = async (id: string) => {
    const itemIndex = fileItems.findIndex(item => item.id === id);
    if (itemIndex === -1) return;
    setFetchStatus(prev => ({ ...prev, [id]: { loading: 'civitai', error: undefined } }));
    try {
      const { previewImage, metadata, civitaiUrl } = await findLoraOnCivitai(fileItems[itemIndex].lora);
      const newItems = [...fileItems];
      const currentItem = newItems[itemIndex];
      
      let finalPreview = currentItem.preview;
      const MIN_IMAGE_SIZE_BYTES = 1024;
      if (previewImage && previewImage.size > MIN_IMAGE_SIZE_BYTES) {
          if (!currentItem.preview || currentItem.preview.size !== previewImage.size) {
              finalPreview = previewImage;
          }
      }

      newItems[itemIndex] = { ...currentItem, preview: finalPreview, metadata: currentItem.metadata || metadata, civitaiUrl: civitaiUrl };
      updateFiles(newItems);
      setFetchStatus(prev => ({ ...prev, [id]: { loading: null } }));
      onAnalyzeSingleFile(id);
    } catch (error: any) {
      setFetchStatus(prev => ({ ...prev, [id]: { loading: null, error: error.message || 'Unknown error' } }));
    }
  };

  const handleFindOnHuggingFace = async (id: string) => {
    const itemIndex = fileItems.findIndex(item => item.id === id);
    if (itemIndex === -1) return;
    setFetchStatus(prev => ({ ...prev, [id]: { loading: 'hf', error: undefined } }));
    try {
      const { previewImage, metadata, huggingfaceUrl } = await findLoraOnHuggingFace(fileItems[itemIndex].lora);
      const newItems = [...fileItems];
      const currentItem = newItems[itemIndex];
      
      let finalPreview = currentItem.preview;
      const MIN_IMAGE_SIZE_BYTES = 1024;
      if (previewImage && previewImage.size > MIN_IMAGE_SIZE_BYTES) {
          if (!currentItem.preview || currentItem.preview.size !== previewImage.size) {
              finalPreview = previewImage;
          }
      }

      newItems[itemIndex] = { ...currentItem, preview: finalPreview, metadata: currentItem.metadata || metadata, huggingfaceUrl: huggingfaceUrl };
      updateFiles(newItems);
      setFetchStatus(prev => ({ ...prev, [id]: { loading: null } }));
      onAnalyzeSingleFile(id);
    } catch (error: any) {
      setFetchStatus(prev => ({ ...prev, [id]: { loading: null, error: error.message || 'Unknown error' } }));
    }
  };

  const handleFindOnTensorArt = async (id: string) => {
    const itemIndex = fileItems.findIndex(item => item.id === id);
    if (itemIndex === -1) return;
    setFetchStatus(prev => ({ ...prev, [id]: { loading: 'tensorart', error: undefined } }));
    try {
      const { previewImage, metadata, tensorArtUrl } = await findLoraOnTensorArt(fileItems[itemIndex].lora);
      const newItems = [...fileItems];
      const currentItem = newItems[itemIndex];
      
      let finalPreview = currentItem.preview;
      const MIN_IMAGE_SIZE_BYTES = 1024;
      if (previewImage && previewImage.size > MIN_IMAGE_SIZE_BYTES) {
          if (!currentItem.preview || currentItem.preview.size !== previewImage.size) {
              finalPreview = previewImage;
          }
      }

      newItems[itemIndex] = { ...currentItem, preview: finalPreview, metadata: currentItem.metadata || metadata, tensorArtUrl };
      updateFiles(newItems);
      setFetchStatus(prev => ({ ...prev, [id]: { loading: null } }));
      onAnalyzeSingleFile(id);
    } catch (error: any) {
      setFetchStatus(prev => ({ ...prev, [id]: { loading: null, error: error.message || 'Unknown error' } }));
    }
  };

  const handleFindOnSeaArt = async (id: string) => {
    const itemIndex = fileItems.findIndex(item => item.id === id);
    if (itemIndex === -1) return;
    setFetchStatus(prev => ({ ...prev, [id]: { loading: 'seaart', error: undefined } }));
    try {
      const { previewImage, metadata, seaartUrl } = await findLoraOnSeaArt(fileItems[itemIndex].lora);
      const newItems = [...fileItems];
      const currentItem = newItems[itemIndex];
      
      let finalPreview = currentItem.preview;
      const MIN_IMAGE_SIZE_BYTES = 1024;
      if (previewImage && previewImage.size > MIN_IMAGE_SIZE_BYTES) {
          if (!currentItem.preview || currentItem.preview.size !== previewImage.size) {
              finalPreview = previewImage;
          }
      }

      newItems[itemIndex] = { ...currentItem, preview: finalPreview, metadata: currentItem.metadata || metadata, seaartUrl };
      updateFiles(newItems);
      setFetchStatus(prev => ({ ...prev, [id]: { loading: null } }));
      onAnalyzeSingleFile(id);
    } catch (error: any) {
      setFetchStatus(prev => ({ ...prev, [id]: { loading: null, error: error.message || 'Unknown error' } }));
    }
  };

  const handleFindOnMageSpace = async (id: string) => {
    const itemIndex = fileItems.findIndex(item => item.id === id);
    if (itemIndex === -1) return;
    setFetchStatus(prev => ({ ...prev, [id]: { loading: 'magespace', error: undefined } }));
    try {
      const { previewImage, metadata, mageSpaceUrl } = await findLoraOnMageSpace(fileItems[itemIndex].lora);
      const newItems = [...fileItems];
      const currentItem = newItems[itemIndex];
      
      let finalPreview = currentItem.preview;
      const MIN_IMAGE_SIZE_BYTES = 1024;
      if (previewImage && previewImage.size > MIN_IMAGE_SIZE_BYTES) {
          if (!currentItem.preview || currentItem.preview.size !== previewImage.size) {
              finalPreview = previewImage;
          }
      }

      newItems[itemIndex] = { ...currentItem, preview: finalPreview, metadata: currentItem.metadata || metadata, mageSpaceUrl };
      updateFiles(newItems);
      setFetchStatus(prev => ({ ...prev, [id]: { loading: null } }));
      onAnalyzeSingleFile(id);
    } catch (error: any) {
      setFetchStatus(prev => ({ ...prev, [id]: { loading: null, error: error.message || 'Unknown error' } }));
    }
  };

  const handleFindOnCustomIntegration = async (id: string, integration: CustomIntegration) => {
    const itemIndex = fileItems.findIndex(item => item.id === id);
    if (itemIndex === -1) return;
    setFetchStatus(prev => ({ ...prev, [id]: { loading: integration.id, error: undefined } }));
    try {
      const { previewImage, metadata, platformUrl } = await findLoraOnGenericPlatform(fileItems[itemIndex].lora, integration.baseUrl, integration.name);
      const newItems = [...fileItems];
      const currentItem = newItems[itemIndex];
      
      let finalPreview = currentItem.preview;
      const MIN_IMAGE_SIZE_BYTES = 1024;
      if (previewImage && previewImage.size > MIN_IMAGE_SIZE_BYTES) {
          if (!currentItem.preview || currentItem.preview.size !== previewImage.size) {
              finalPreview = previewImage;
          }
      }

      const updatedItem = {
          ...currentItem,
          preview: finalPreview,
          metadata: currentItem.metadata || metadata,
          customUrls: {
            ...(currentItem.customUrls || {}),
            [integration.name]: platformUrl,
          },
      };
      newItems[itemIndex] = updatedItem;
      updateFiles(newItems);
      setFetchStatus(prev => ({ ...prev, [id]: { loading: null } }));
      onAnalyzeSingleFile(id);
    } catch (error: any) {
      setFetchStatus(prev => ({ ...prev, [id]: { loading: null, error: error.message || 'Unknown error' } }));
    }
  };

  return (
    <div className="bg-gray-800/50 border-2 border-dashed border-gray-600 rounded-xl p-6 text-center transition-all duration-300">
      <div
        onDrop={handleDrop}
        onDragEnter={handleDragEvents}
        onDragOver={handleDragEvents}
        onDragLeave={handleDragEvents}
        className={`p-8 rounded-lg transition-colors ${isDragging ? 'bg-indigo-900/50' : ''}`}
      >
        <UploadIcon className="mx-auto h-12 w-12 text-gray-500" />
        <p className="mt-2 text-lg font-semibold text-gray-300">Drop your .safetensors files or folders here</p>
        <p className="text-sm text-gray-500">or</p>
        <label htmlFor="file-upload" className={`mt-2 inline-block px-4 py-2 bg-gray-700 text-white rounded-md cursor-pointer hover:bg-gray-600 transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
          Select Files
        </label>
        <input id="file-upload" type="file" multiple accept=".safetensors" className="hidden" onChange={handleFileSelect} disabled={disabled} />
      </div>

      {fileItems.length > 0 && (
        <div className="mt-6 text-left space-y-4 max-h-[50vh] overflow-y-auto pr-2">
          {fileItems.map((file) => {
            const status = fetchStatus[file.id] || { loading: null };
            const otherDuplicates = duplicateInfo[file.id];
            
            return (
              <div key={file.id}>
                <div className="bg-gray-800 p-4 rounded-lg flex flex-col md:flex-row items-start md:items-center gap-4">
                  <div className="flex-grow flex items-center gap-3 min-w-0">
                    <FileIcon className="h-6 w-6 text-indigo-400 shrink-0"/>
                    <div className="flex-grow min-w-0">
                      <p className="font-semibold text-white break-words truncate" title={file.lora.name}>{file.lora.name}</p>
                       {file.relativePath !== file.lora.name && (
                         <p className="text-xs text-gray-500 font-mono truncate" title={file.relativePath}>{file.relativePath}</p>
                       )}
                      <div className="flex items-center gap-x-3">
                        <p className="text-sm text-gray-400">{(file.lora.size / (1024 * 1024)).toFixed(2)} MB</p>
                        {file.hashStatus === 'hashing' && <div className="flex items-center gap-1 text-xs text-cyan-400"><LoaderIcon className="h-3 w-3 animate-spin" /><span>Hashing...</span></div>}
                        {otherDuplicates && (
                            <div className="group relative flex items-center gap-1 text-xs font-semibold text-orange-400 bg-orange-900/50 px-2 py-0.5 rounded-full">
                                <DuplicateIcon className="h-3 w-3" />
                                <span>Duplicate</span>
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs bg-gray-900 text-white text-xs rounded-lg py-2 px-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg z-10">
                                    <p className="font-bold mb-1">Duplicate of:</p>
                                    <ul className="list-disc list-inside text-left">
                                        {otherDuplicates.map(d => <li key={d.id} className="font-mono">{d.relativePath}</li>)}
                                    </ul>
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                                </div>
                            </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="w-full md:w-auto flex flex-wrap items-center justify-start md:justify-end gap-3 shrink-0">
                    <div className="flex items-center gap-1 bg-gray-900/50 p-1 rounded-lg border border-gray-700" role="group" aria-label="Find model on sources">
                        <button title="Find on Civitai" onClick={() => handleFindOnCivitai(file.id)} disabled={!!status.loading} className="p-2 rounded-md hover:bg-blue-800/60 transition-colors disabled:opacity-50 disabled:cursor-wait">
                            {status.loading === 'civitai' ? <LoaderIcon className="h-5 w-5 animate-spin"/> : <CivitaiIcon className="h-5 w-5 text-blue-300" />}
                        </button>
                        <button title="Find on Hugging Face" onClick={() => handleFindOnHuggingFace(file.id)} disabled={!!status.loading} className="p-2 rounded-md hover:bg-yellow-800/60 transition-colors disabled:opacity-50 disabled:cursor-wait">
                            {status.loading === 'hf' ? <LoaderIcon className="h-5 w-5 animate-spin"/> : <HuggingFaceIcon className="h-5 w-5 text-yellow-300" />}
                        </button>
                        <button title="Find on Tensor.Art" onClick={() => handleFindOnTensorArt(file.id)} disabled={!!status.loading} className="p-2 rounded-md hover:bg-green-800/60 transition-colors disabled:opacity-50 disabled:cursor-wait">
                            {status.loading === 'tensorart' ? <LoaderIcon className="h-5 w-5 animate-spin"/> : <TensorArtIcon className="h-5 w-5 text-green-300" />}
                        </button>
                        <button title="Find on SeaArt" onClick={() => handleFindOnSeaArt(file.id)} disabled={!!status.loading} className="p-2 rounded-md hover:bg-purple-800/60 transition-colors disabled:opacity-50 disabled:cursor-wait">
                            {status.loading === 'seaart' ? <LoaderIcon className="h-5 w-5 animate-spin"/> : <SeaArtIcon className="h-5 w-5 text-purple-300" />}
                        </button>
                        <button title="Find on Mage.space" onClick={() => handleFindOnMageSpace(file.id)} disabled={!!status.loading} className="p-2 rounded-md hover:bg-pink-800/60 transition-colors disabled:opacity-50 disabled:cursor-wait">
                            {status.loading === 'magespace' ? <LoaderIcon className="h-5 w-5 animate-spin"/> : <MageSpaceIcon className="h-5 w-5 text-pink-300" />}
                        </button>
                        {customIntegrations.map(integration => (
                            <button key={integration.id} title={`Find on ${integration.name}`} onClick={() => handleFindOnCustomIntegration(file.id, integration)} disabled={!!status.loading} className="p-2 rounded-md hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-wait">
                                {status.loading === integration.id ? <LoaderIcon className="h-5 w-5 animate-spin"/> : <LinkIcon className="h-5 w-5 text-gray-300" />}
                            </button>
                        ))}
                    </div>

                    <label htmlFor={`preview-upload-${file.id}`} className="px-3 py-2 bg-gray-700 text-sm text-gray-300 rounded-md cursor-pointer hover:bg-gray-600 transition-colors flex items-center gap-2 justify-center">
                        <ImageIcon className="h-4 w-4" />
                        <span>{file.preview ? "Change" : "Add"} Preview</span>
                        <input id={`preview-upload-${file.id}`} type="file" accept="image/*" className="hidden" onChange={(e) => handlePreviewChange(file.id, e)} />
                    </label>

                    <textarea
                      placeholder="Paste metadata..."
                      value={file.metadata}
                      onChange={(e) => handleMetadataChange(file.id, e)}
                      className="w-36 h-10 py-2 px-3 bg-gray-900/80 text-gray-300 text-xs rounded-md border border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-mono resize-y"
                      rows={1}
                      onFocus={e => {e.target.rows = 4; e.target.classList.remove('h-10')}}
                      onBlur={e => {if(!e.target.value) {e.target.rows = 1; e.target.classList.add('h-10')}}}
                    ></textarea>

                    <button onClick={() => handleRemoveFile(file.id)} className="p-2.5 bg-red-800/50 text-red-300 rounded-md hover:bg-red-700/50 transition-colors flex justify-center">
                      <XIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                {status.error && <p className="text-red-400 text-xs mt-1 text-right w-full pr-2">{status.error}</p>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
