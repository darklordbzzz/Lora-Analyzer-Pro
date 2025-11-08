
import React, { useState, useEffect } from 'react';
import type { CustomIntegration } from '../types';
import { XIcon, InfoIcon } from './Icons';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialIntegrations: CustomIntegration[];
  onSave: (integrations: CustomIntegration[]) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, initialIntegrations, onSave }) => {
  const [integrations, setIntegrations] = useState<CustomIntegration[]>(initialIntegrations);
  const [newName, setNewName] = useState('');
  const [newBaseUrl, setNewBaseUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setIntegrations(initialIntegrations);
  }, [initialIntegrations, isOpen]);

  if (!isOpen) return null;

  const handleAdd = () => {
    if (!newName.trim() || !newBaseUrl.trim()) {
      setError('Name and Base URL are required.');
      return;
    }
    try {
        new URL(newBaseUrl);
    } catch (_) {
        setError('Please enter a valid URL.');
        return;
    }
    const newIntegration: CustomIntegration = {
      id: crypto.randomUUID(),
      name: newName,
      baseUrl: newBaseUrl,
    };
    const updatedIntegrations = [...integrations, newIntegration];
    setIntegrations(updatedIntegrations);
    onSave(updatedIntegrations);
    setNewName('');
    setNewBaseUrl('');
    setError('');
  };

  const handleDelete = (id: string) => {
    const updatedIntegrations = integrations.filter(int => int.id !== id);
    setIntegrations(updatedIntegrations);
    onSave(updatedIntegrations);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold">Manage Integrations</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-700">
            <XIcon className="h-6 w-6" />
          </button>
        </div>
        
        <div className="p-6 space-y-6 overflow-y-auto">
            <div className="bg-gray-900/50 p-4 rounded-lg space-y-4">
                <h3 className="font-semibold text-lg">Add New Integration</h3>
                 <div className="bg-blue-900/30 text-blue-200 text-sm p-3 rounded-md flex items-start gap-3">
                    <InfoIcon className="h-5 w-5 mt-0.5 shrink-0"/>
                    <p>Add custom platforms that provide a Civitai-compatible API (e.g., `.../api/v1/model-versions/by-hash/:hash`). This is experimental and may not work for all sites.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                    type="text"
                    placeholder="Platform Name (e.g., My Lora Site)"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <input
                    type="text"
                    placeholder="API Base URL (e.g., https://site.com/api/v1)"
                    value={newBaseUrl}
                    onChange={e => setNewBaseUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>
                 {error && <p className="text-red-400 text-sm">{error}</p>}
                <button
                    onClick={handleAdd}
                    className="px-5 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-500 disabled:bg-gray-600 transition-colors"
                    disabled={!newName.trim() || !newBaseUrl.trim()}
                >
                    Add Integration
                </button>
            </div>
          
            <div>
                <h3 className="font-semibold text-lg mb-2">Current Integrations</h3>
                <div className="space-y-2">
                {integrations.length === 0 ? (
                    <p className="text-gray-400">No custom integrations added yet.</p>
                ) : (
                    integrations.map(integration => (
                    <div key={integration.id} className="bg-gray-700/50 p-3 rounded-lg flex justify-between items-center">
                        <div>
                        <p className="font-semibold">{integration.name}</p>
                        <p className="text-sm text-gray-400 font-mono">{integration.baseUrl}</p>
                        </div>
                        <button
                        onClick={() => handleDelete(integration.id)}
                        className="px-3 py-1.5 bg-red-800/70 text-red-200 text-sm rounded-md hover:bg-red-700 transition-colors"
                        >
                        Delete
                        </button>
                    </div>
                    ))
                )}
                </div>
            </div>
        </div>

        <div className="p-4 border-t border-gray-700 mt-auto bg-gray-800 rounded-b-lg">
             <button
                onClick={onClose}
                className="w-full px-5 py-2.5 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-500 transition-colors"
             >
                Close
            </button>
        </div>

      </div>
    </div>
  );
};

export default SettingsModal;
