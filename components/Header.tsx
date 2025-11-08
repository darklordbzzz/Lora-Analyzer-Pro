
import React from 'react';
import { LogoIcon, SettingsIcon } from './Icons';
import type { LLMModel } from '../types';

interface HeaderProps {
  onOpenSettings: () => void;
  llmModels: LLMModel[];
  selectedLlmModelId: string;
  onSelectLlmModel: (id: string) => void;
}

const Header: React.FC<HeaderProps> = ({ onOpenSettings, llmModels, selectedLlmModelId, onSelectLlmModel }) => {
  const selectedModel = llmModels.find(m => m.id === selectedLlmModelId);
  const providerName = selectedModel ? (selectedModel.provider.charAt(0).toUpperCase() + selectedModel.provider.slice(1)) : 'LLM';

  return (
    <header className="bg-gray-900/70 backdrop-blur-sm border-b border-gray-700/50 sticky top-0 z-10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <LogoIcon className="h-8 w-8 text-indigo-400" />
            <span className="ml-3 text-2xl font-bold text-white">LoRA Analyzer Pro</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="text-sm text-gray-400">
                Powered by {providerName}
              </div>
              <select
                value={selectedLlmModelId}
                onChange={(e) => onSelectLlmModel(e.target.value)}
                className="bg-gray-800 border border-gray-600 rounded-md text-sm text-white py-1 pl-2 pr-8 focus:ring-indigo-500 focus:border-indigo-500"
                aria-label="Select LLM Model"
              >
                {llmModels.map(model => (
                  <option key={model.id} value={model.id}>{model.name}</option>
                ))}
              </select>
            </div>
            <button
              onClick={onOpenSettings}
              className="p-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
              aria-label="Open settings"
            >
              <SettingsIcon className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;