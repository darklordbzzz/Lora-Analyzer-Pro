
import React from 'react';
import { SettingsIcon, ImageIcon, AudioIcon, ChatIcon, BoxIcon, HelpIcon, VideoIcon } from './Icons';
import type { LLMModel, AppView } from '../types';
import ModelSelector from './ModelSelector';

interface HeaderProps {
  onOpenSettings: () => void;
  onOpenHistory: () => void;
  llmModels: LLMModel[];
  selectedLlmModelId: string;
  onSelectLlmModel: (id: string) => void;
  currentView: AppView;
  onViewChange: (view: AppView) => void;
  onAddModel: (model: LLMModel) => void;
  onDeleteModel: (id: string) => void;
  onInstallModelRequest?: (modelName: string) => void;
  enableLocalModels?: boolean;
}

const Header: React.FC<HeaderProps> = ({ 
    onOpenSettings, llmModels, selectedLlmModelId, onSelectLlmModel, currentView, onViewChange, onAddModel, onDeleteModel, onInstallModelRequest, enableLocalModels = false
}) => {
  
  const handleDragOverTab = (view: AppView) => (e: React.DragEvent) => {
    e.preventDefault();
    if (currentView !== view) {
      onViewChange(view);
    }
  };

  const navButtonClass = (view: AppView) => `
    px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-2 whitespace-nowrap transition-all
    ${currentView === view 
      ? 'bg-indigo-600 text-white shadow-md ring-1 ring-indigo-400/30' 
      : 'text-gray-400 hover:text-white hover:bg-gray-700/50'}
  `;

  return (
    <header className="bg-gray-900/70 backdrop-blur-sm border-b border-gray-700/50 sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-28">
          <div className="flex items-center gap-8">
              <div className="flex items-center gap-5">
                <img src="https://media.licdn.com/dms/image/v2/C560BAQGMdd1VUNtHWg/company-logo_100_100/company-logo_100_100/0/1631356972662?e=1767225600&v=beta&t=vy9nFfwQcKTc9DmN0So8lIJ04B2sDXY1eoXbC2JSjDI" alt="Logo" className="h-20 w-20 rounded-xl shadow-xl border border-gray-700/50" />
                <div className="hidden md:block">
                  <span className="text-xl font-bold block leading-tight tracking-tight text-white">Neural Intelligence Hub</span>
                  <span className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.25em] mt-0.5 block opacity-80">Autonomous Model Control</span>
                </div>
              </div>

              <nav className="hidden lg:flex bg-gray-800/30 p-1 rounded-xl border border-gray-700/30 gap-1 overflow-x-auto custom-scrollbar no-scrollbar">
                  <button onClick={() => onViewChange('models')} onDragOver={handleDragOverTab('models')} className={navButtonClass('models')}>Model Analyzer</button>
                  <button onClick={() => onViewChange('images')} onDragOver={handleDragOverTab('images')} className={navButtonClass('images')}><ImageIcon className="h-3.5 w-3.5" />Images</button>
                  <button onClick={() => onViewChange('video')} onDragOver={handleDragOverTab('video')} className={navButtonClass('video')}><VideoIcon className="h-3.5 w-3.5" />Video</button>
                  <button onClick={() => onViewChange('audio')} onDragOver={handleDragOverTab('audio')} className={navButtonClass('audio')}><AudioIcon className="h-3.5 w-3.5" />Audio</button>
                  <button onClick={() => onViewChange('chat')} onDragOver={handleDragOverTab('chat')} className={navButtonClass('chat')}><ChatIcon className="h-3.5 w-3.5" />Chat</button>
                  <button onClick={() => onViewChange('studio')} onDragOver={handleDragOverTab('studio')} className={navButtonClass('studio')}><BoxIcon className="h-3.5 w-3.5" />Sound Studio</button>
                  <button onClick={() => onViewChange('imageStudio')} onDragOver={handleDragOverTab('imageStudio')} className={navButtonClass('imageStudio')}><BoxIcon className="h-3.5 w-3.5" />Image Studio</button>
                  <button onClick={() => onViewChange('help')} onDragOver={handleDragOverTab('help')} className={navButtonClass('help')}><HelpIcon className="h-3.5 w-3.5" />HelpIndex</button>
              </nav>
          </div>
          <div className="flex items-center gap-4">
            <ModelSelector models={llmModels} selectedModelId={selectedLlmModelId} onSelectModel={onSelectLlmModel} onAddModel={onAddModel} onDeleteModel={onDeleteModel} onInstallModelRequest={onInstallModelRequest} enableLocalModels={enableLocalModels} />
            <button onClick={onOpenSettings} className="p-2.5 text-gray-400 hover:text-white transition-colors bg-gray-800/50 rounded-xl border border-gray-700/50 hover:bg-indigo-600/20 hover:border-indigo-500/50" title="Settings"><SettingsIcon className="h-5 w-5" /></button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
