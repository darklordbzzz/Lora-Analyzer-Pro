
import React, { useState, useEffect } from 'react';
import type { CustomIntegration, LLMModel, LLMProvider } from '../types';
import { XIcon, InfoIcon } from './Icons';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCustomIntegrations: CustomIntegration[];
  onSaveCustomIntegrations: (integrations: CustomIntegration[]) => void;
  initialModels: LLMModel[];
  onSaveModels: (models: LLMModel[]) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, onClose, 
  initialCustomIntegrations, onSaveCustomIntegrations,
  initialModels, onSaveModels
}) => {
  const [integrations, setIntegrations] = useState<CustomIntegration[]>(initialCustomIntegrations);
  const [newName, setNewName] = useState('');
  const [newBaseUrl, setNewBaseUrl] = useState('');
  const [integrationError, setIntegrationError] = useState('');

  const [models, setModels] = useState<LLMModel[]>(initialModels);
  const [newModelName, setNewModelName] = useState('');
  const [newModelProvider, setNewModelProvider] = useState<LLMProvider>('gemini');
  const [newModelApiUrl, setNewModelApiUrl] = useState('');
  const [newModelApiKey, setNewModelApiKey] = useState('');
  const [newModelIdentifier, setNewModelIdentifier] = useState('gemini-2.5-flash');
  const [modelError, setModelError] = useState('');

  useEffect(() => {
    if(isOpen) {
      setIntegrations(initialCustomIntegrations);
      setModels(initialModels);
      setNewModelProvider('gemini');
      setNewModelIdentifier('gemini-2.5-flash');
    }
  }, [initialCustomIntegrations, initialModels, isOpen]);

  if (!isOpen) return null;

  const handleAddIntegration = () => {
    if (!newName.trim() || !newBaseUrl.trim()) {
      setIntegrationError('Name and Base URL are required.');
      return;
    }
    try {
        new URL(newBaseUrl);
    } catch (_) {
        setIntegrationError('Please enter a valid URL.');
        return;
    }
    const newIntegration: CustomIntegration = {
      id: crypto.randomUUID(),
      name: newName,
      baseUrl: newBaseUrl,
    };
    const updatedIntegrations = [...integrations, newIntegration];
    setIntegrations(updatedIntegrations);
    onSaveCustomIntegrations(updatedIntegrations);
    setNewName('');
    setNewBaseUrl('');
    setIntegrationError('');
  };

  const handleDeleteIntegration = (id: string) => {
    const updatedIntegrations = integrations.filter(int => int.id !== id);
    setIntegrations(updatedIntegrations);
    onSaveCustomIntegrations(updatedIntegrations);
  };

  const handleAddModel = () => {
    setModelError('');
    if (!newModelName.trim() || !newModelIdentifier.trim()) {
        setModelError('Display Name and Model Name/ID are required.');
        return;
    }
    if (newModelProvider === 'openai' && !newModelApiUrl.trim()) {
        setModelError('API Base URL is required for OpenAI-compatible providers.');
        return;
    }
    if (newModelProvider === 'openai') {
        try {
            new URL(newModelApiUrl);
        } catch (_) {
            setModelError('Please enter a valid API Base URL.');
            return;
        }
    }

    const newModel: LLMModel = {
        id: crypto.randomUUID(),
        name: newModelName,
        provider: newModelProvider,
        modelName: newModelIdentifier,
        apiUrl: newModelProvider === 'openai' ? newModelApiUrl : undefined,
        apiKey: newModelProvider === 'openai' ? newModelApiKey : undefined,
    };
    const updatedModels = [...models, newModel];
    setModels(updatedModels);
    onSaveModels(updatedModels);

    setNewModelName('');
    setNewModelApiUrl('');
    setNewModelApiKey('');
    setNewModelIdentifier(newModelProvider === 'gemini' ? 'gemini-2.5-flash' : '');
    setModelError('');
  };

  const handleDeleteModel = (id: string) => {
    const updatedModels = models.filter(m => m.id !== id);
    setModels(updatedModels);
    onSaveModels(updatedModels);
  };

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const provider = e.target.value as LLMProvider;
    setNewModelProvider(provider);
    if (provider === 'gemini') {
        setNewModelIdentifier('gemini-2.5-flash');
    } else {
        setNewModelIdentifier('');
    }
  };


  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold">Settings</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-700">
            <XIcon className="h-6 w-6" />
          </button>
        </div>
        
        <div className="p-6 space-y-8 overflow-y-auto">
          {/* LLM Providers Section */}
          <div className="space-y-4">
            <h3 className="font-semibold text-xl text-white border-b border-gray-700 pb-2">LLM Providers</h3>
            <div className="bg-gray-900/50 p-4 rounded-lg space-y-4">
              <h4 className="font-semibold text-lg">Add New Provider</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" placeholder="Display Name (e.g., Local Llama 3)" value={newModelName} onChange={e => setNewModelName(e.target.value)} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-indigo-500 focus:border-indigo-500" />
                <select value={newModelProvider} onChange={handleProviderChange} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-indigo-500 focus:border-indigo-500">
                  <option value="gemini">Gemini</option>
                  <option value="openai">OpenAI-Compatible</option>
                </select>
              </div>
              {newModelProvider === 'openai' && (
                <div className="space-y-4">
                    <input type="text" placeholder="API Base URL (e.g., http://localhost:8000/v1)" value={newModelApiUrl} onChange={e => setNewModelApiUrl(e.target.value)} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-indigo-500 focus:border-indigo-500" />
                    <input type="password" placeholder="API Key (optional)" value={newModelApiKey} onChange={e => setNewModelApiKey(e.target.value)} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-indigo-500 focus:border-indigo-500" />
                    <div className="bg-yellow-900/30 text-yellow-200 text-xs p-2 rounded-md flex items-start gap-2">
                        <InfoIcon className="h-4 w-4 mt-0.5 shrink-0"/>
                        <p>API Keys are stored in your browser's local storage. Do not use production keys on untrusted machines.</p>
                    </div>
                </div>
              )}
              <input type="text" placeholder="Model Name/ID (e.g., gemini-2.5-flash)" value={newModelIdentifier} onChange={e => setNewModelIdentifier(e.target.value)} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-indigo-500 focus:border-indigo-500" />
              {modelError && <p className="text-red-400 text-sm">{modelError}</p>}
              <button onClick={handleAddModel} className="px-5 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-500 transition-colors">Add Provider</button>
            </div>
            <div>
              <h4 className="font-semibold text-lg mb-2">Current Providers</h4>
              <div className="space-y-2">{models.length === 0 ? <p className="text-gray-400">No providers configured.</p> : models.map(model => (
                <div key={model.id} className="bg-gray-700/50 p-3 rounded-lg flex justify-between items-center">
                  <div>
                    <p className="font-semibold">{model.name} <span className="text-xs font-normal text-gray-400 bg-gray-600 px-1.5 py-0.5 rounded-full">{model.provider}</span></p>
                    <p className="text-sm text-gray-400 font-mono">{model.modelName}</p>
                  </div>
                  <button onClick={() => handleDeleteModel(model.id)} className="px-3 py-1.5 bg-red-800/70 text-red-200 text-sm rounded-md hover:bg-red-700 transition-colors">Delete</button>
                </div>
              ))}</div>
            </div>
          </div>

          {/* Custom Integrations Section */}
          <div className="space-y-4">
            <h3 className="font-semibold text-xl text-white border-b border-gray-700 pb-2">Custom Integrations</h3>
            <div className="bg-gray-900/50 p-4 rounded-lg space-y-4">
              <h4 className="font-semibold text-lg">Add New Integration</h4>
              <div className="bg-blue-900/30 text-blue-200 text-sm p-3 rounded-md flex items-start gap-3">
                <InfoIcon className="h-5 w-5 mt-0.5 shrink-0"/>
                <p>Add custom platforms that provide a Civitai-compatible API (e.g., `.../api/v1/model-versions/by-hash/:hash`). This is experimental and may not work for all sites.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" placeholder="Platform Name (e.g., My Lora Site)" value={newName} onChange={e => setNewName(e.target.value)} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-indigo-500 focus:border-indigo-500" />
                <input type="text" placeholder="API Base URL (e.g., https://site.com/api/v1)" value={newBaseUrl} onChange={e => setNewBaseUrl(e.target.value)} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-indigo-500 focus:border-indigo-500" />
              </div>
              {integrationError && <p className="text-red-400 text-sm">{integrationError}</p>}
              <button onClick={handleAddIntegration} className="px-5 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-500 disabled:bg-gray-600 transition-colors" disabled={!newName.trim() || !newBaseUrl.trim()}>Add Integration</button>
            </div>
            <div>
              <h4 className="font-semibold text-lg mb-2">Current Integrations</h4>
              <div className="space-y-2">{integrations.length === 0 ? <p className="text-gray-400">No custom integrations added yet.</p> : integrations.map(integration => (
                <div key={integration.id} className="bg-gray-700/50 p-3 rounded-lg flex justify-between items-center">
                  <div>
                    <p className="font-semibold">{integration.name}</p>
                    <p className="text-sm text-gray-400 font-mono">{integration.baseUrl}</p>
                  </div>
                  <button onClick={() => handleDeleteIntegration(integration.id)} className="px-3 py-1.5 bg-red-800/70 text-red-200 text-sm rounded-md hover:bg-red-700 transition-colors">Delete</button>
                </div>
              ))}</div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-700 mt-auto bg-gray-800 rounded-b-lg">
          <button onClick={onClose} className="w-full px-5 py-2.5 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-500 transition-colors">Close</button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;