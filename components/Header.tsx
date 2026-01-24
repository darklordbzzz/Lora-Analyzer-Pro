import React, { useState } from 'react';
import { AppView, LLMModel } from '../types';
import { 
  SparklesIcon, CogIcon, ArchiveIcon, ChatIcon, 
  VideoIcon, AudioIcon, ImageIcon, LabIcon, 
  BoxIcon, InfoIcon, EditIcon, CropIcon, ChevronDownIcon,
  RobotIcon, TargetIcon
} from './Icons';
import ModelSelector from './ModelSelector';

interface HeaderProps {
  currentView: AppView;
  onViewChange: (view: AppView) => void;
  activeModel: LLMModel;
  models: LLMModel[];
  onSelectModel: (id: string) => void;
  onOpenSettings: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
  currentView, onViewChange, activeModel, models, onSelectModel, onOpenSettings 
}) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const NavButton = ({ id, label, icon: Icon }: { id: AppView, label: string, icon: any }) => (
    <button
      onClick={() => { onViewChange(id); setActiveMenu(null); }}
      className={`px-5 py-3 text-sm font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-3 ${
        currentView === id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
      }`}
    >
      <Icon className="h-5 w-5" />
      {label}
    </button>
  );

  const GroupDropdown = ({ label, icon: Icon, children, id }: any) => {
    const isActive = activeMenu === id;
    return (
      <div className="relative">
        <button
          onClick={() => setActiveMenu(isActive ? null : id)}
          className={`px-5 py-3 text-sm font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-3 ${
            isActive ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
          }`}
        >
          <Icon className="h-5 w-5" />
          {label}
          <ChevronDownIcon className={`h-4 w-4 transition-transform ${isActive ? 'rotate-180' : ''}`} />
        </button>
        {isActive && (
          <div className="absolute top-full left-0 mt-3 w-64 bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl z-[100] p-3 flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
            {children}
          </div>
        )}
      </div>
    );
  };

  return (
    <header className="glass sticky top-0 z-[100] border-b border-white/5">
      <div className="container mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-10">
          <div className="flex items-center gap-5 group cursor-pointer" onClick={() => onViewChange('vision-auditor')}>
            <div className="p-4 bg-indigo-600/10 rounded-2xl border border-indigo-500/20 group-hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all">
              <SparklesIcon className="h-8 w-8 text-indigo-500" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">AI HUB</h1>
              <span className="text-xs font-black text-indigo-400 uppercase tracking-[0.4em] mt-1.5 block opacity-60">Neural Workstation</span>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-2 bg-black/40 p-1.5 rounded-2xl border border-white/5">
            <GroupDropdown label="Auditors" icon={InfoIcon} id="auditors">
              <NavButton id="vision-auditor" label="Vision Analyzer" icon={TargetIcon} />
              <NavButton id="metadata-image" label="Image Metadata" icon={ImageIcon} />
              <NavButton id="metadata-video" label="Temporal Audit" icon={VideoIcon} />
              <NavButton id="metadata-audio" label="Acoustic Audit" icon={AudioIcon} />
            </GroupDropdown>

            <GroupDropdown label="Logic" icon={ChatIcon} id="logic">
              <NavButton id="lora" label="LoRA Browser" icon={BoxIcon} />
              <NavButton id="chat" label="Intelligence" icon={ChatIcon} />
              <NavButton id="live-session" label="Live Neural" icon={RobotIcon} />
            </GroupDropdown>

            <GroupDropdown label="Studios" icon={LabIcon} id="studios">
              <NavButton id="studio-image" label="Image Genesis" icon={ImageIcon} />
              <NavButton id="studio-video" label="Veo Sequence" icon={VideoIcon} />
              <NavButton id="studio-sound" label="Sound Master" icon={AudioIcon} />
              <NavButton id="inpaint" label="Inpaint Canvas" icon={CropIcon} />
              <NavButton id="retouch" label="Photo Darkroom" icon={EditIcon} />
            </GroupDropdown>
            
            <div className="w-[1px] h-8 bg-white/5 mx-3" />
            
            <NavButton id="vault" label="Archive" icon={ArchiveIcon} />
            <button onClick={onOpenSettings} className="p-3 text-gray-500 hover:text-white transition-all"><CogIcon className="h-5 w-5" /></button>
          </nav>
        </div>

        <div className="flex items-center gap-6">
          <ModelSelector 
            models={models}
            selectedModelId={activeModel.id}
            onSelectModel={onSelectModel}
            onAddModel={() => {}}
            enableLocalModels={true}
          />
          <button onClick={() => onViewChange('help')} className="p-4 bg-white/5 rounded-xl text-indigo-400 hover:bg-white/10 transition-all border border-white/5">
            <InfoIcon className="h-6 w-6" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;