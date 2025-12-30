
import React, { useState } from 'react';
import type { LoraAnalysis } from '../types';
import { XIcon, TrashIcon, InfoIcon, UploadIcon, SearchIcon, ImageIcon } from './Icons';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedResults: LoraAnalysis[];
  onLoadHistory: (results: LoraAnalysis[]) => void;
  onDeleteHistory: (ids: string[]) => void;
  onClearHistory: () => void;
}

const HistoryModal: React.FC<HistoryModalProps> = ({ 
  isOpen, onClose, savedResults, onLoadHistory, onDeleteHistory, onClearHistory 
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const filteredResults = savedResults.filter(result => 
    result.fileName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    result.modelType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    result.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredResults.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredResults.map(r => r.id)));
    }
  };

  const handleLoadSelected = () => {
    const selected = savedResults.filter(r => selectedIds.has(r.id));
    onLoadHistory(selected);
    onClose();
    setSelectedIds(new Set());
  };

  const handleDeleteSelected = () => {
    onDeleteHistory(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold flex items-center gap-2">
            Analysis History
            <span className="text-xs font-normal text-gray-400 bg-gray-700 px-2 py-1 rounded-full">{savedResults.length}</span>
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-700">
            <XIcon className="h-6 w-6" />
          </button>
        </div>
        
        <div className="p-4 border-b border-gray-700 flex flex-col md:flex-row gap-4 justify-between items-center">
             <div className="relative w-full md:w-64">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <SearchIcon className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search history..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            
            <div className="flex gap-2 w-full md:w-auto">
                <button 
                    onClick={handleLoadSelected} 
                    disabled={selectedIds.size === 0}
                    className="flex-1 md:flex-none px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-500 disabled:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                    <UploadIcon className="h-4 w-4" />
                    Load Selected ({selectedIds.size})
                </button>
                <button 
                    onClick={handleDeleteSelected} 
                    disabled={selectedIds.size === 0}
                    className="px-3 py-2 bg-red-900/50 text-red-300 text-sm font-semibold rounded-lg hover:bg-red-900 disabled:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <TrashIcon className="h-4 w-4" />
                </button>
            </div>
        </div>

        <div className="flex-grow overflow-y-auto p-4">
            {savedResults.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    <InfoIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No analysis history found.</p>
                    <p className="text-sm mt-1">Successfully analyzed files will appear here automatically.</p>
                </div>
            ) : filteredResults.length === 0 ? (
                 <div className="text-center py-12 text-gray-500">
                    <p>No results match your search.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    <div className="flex items-center gap-4 px-4 py-2 text-sm text-gray-400 font-semibold border-b border-gray-700">
                        <input 
                            type="checkbox" 
                            checked={selectedIds.size === filteredResults.length && filteredResults.length > 0}
                            onChange={toggleSelectAll}
                            className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div className="w-12">Preview</div>
                        <div className="flex-grow">Name / Hash</div>
                        <div className="w-24 hidden md:block">Type</div>
                        <div className="w-24 hidden md:block">Base</div>
                    </div>
                    {filteredResults.map(result => (
                        <div 
                            key={result.id} 
                            onClick={() => toggleSelect(result.id)}
                            className={`flex items-center gap-4 p-3 rounded-lg border cursor-pointer transition-colors ${selectedIds.has(result.id) ? 'bg-indigo-900/20 border-indigo-500/50' : 'bg-gray-700/30 border-gray-700 hover:bg-gray-700/50'}`}
                        >
                             <input 
                                type="checkbox" 
                                checked={selectedIds.has(result.id)}
                                onChange={() => toggleSelect(result.id)}
                                className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-indigo-600 focus:ring-indigo-500"
                            />
                            <div className="w-12 h-12 shrink-0 bg-gray-800 rounded-md overflow-hidden flex items-center justify-center">
                                {result.previewImageUrl ? (
                                    <img src={result.previewImageUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <ImageIcon className="h-6 w-6 text-gray-600" />
                                )}
                            </div>
                            <div className="flex-grow min-w-0">
                                <h4 className="font-semibold text-white truncate" title={result.fileName}>{result.fileName}</h4>
                                <p className="text-xs text-gray-400 font-mono truncate" title={result.hash}>{result.hash}</p>
                            </div>
                            <div className="w-24 hidden md:block text-sm text-gray-300 truncate">{result.modelType}</div>
                            <div className="w-24 hidden md:block text-sm text-gray-300 truncate">{result.baseModel}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>

        <div className="p-4 border-t border-gray-700 bg-gray-800 rounded-b-lg flex justify-between items-center">
            <button 
                onClick={() => { if(window.confirm('Are you sure you want to clear all history?')) onClearHistory(); }}
                className="text-red-400 text-sm hover:text-red-300 hover:underline"
                disabled={savedResults.length === 0}
            >
                Clear All History
            </button>
            <button onClick={onClose} className="px-5 py-2.5 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-500 transition-colors">Close</button>
        </div>
      </div>
    </div>
  );
};

export default HistoryModal;
