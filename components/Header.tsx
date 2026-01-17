
import React from 'react';
import { AppView } from '../types';
import { SparklesIcon, ChatIcon, ImageIcon, AudioIcon, BoxIcon, HelpIcon, VideoIcon } from './Icons';

interface HeaderProps {
  currentView: AppView;
  onViewChange: (view: AppView) => void;
}

const Header: React.FC<HeaderProps> = ({ currentView, onViewChange }) => {
  const navItems: { view: AppView; icon: any; label: string }[] = [
    { view: 'models', icon: BoxIcon, label: 'Asset Matrix' },
    { view: 'images', icon: ImageIcon, label: 'Vision' },
    { view: 'video', icon: VideoIcon, label: 'Temporal' },
    { view: 'audio', icon: AudioIcon, label: 'Acoustic' },
    { view: 'chat', icon: ChatIcon, label: 'Intelligence' },
    { view: 'help', icon: HelpIcon, label: 'Protocols' },
  ];

  return (
    <header className="glass sticky top-0 z-50 border-b border-white/5">
      <div className="container mx-auto px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4 group cursor-pointer" onClick={() => onViewChange('models')}>
          <div className="p-3 bg-hub-accent/10 rounded-2xl border border-hub-accent/20 group-hover:glow-accent transition-all duration-500">
            <SparklesIcon className="h-6 w-6 text-hub-accent" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white uppercase tracking-tighter leading-none neon-text">AI HUB</h1>
            <span className="text-[9px] font-black text-hub-cyan uppercase tracking-[0.4em] mt-1.5 block opacity-60">Neural Cockpit v4</span>
          </div>
        </div>

        <nav className="flex items-center gap-1 bg-black/40 p-1.5 rounded-2xl border border-white/5 flex-wrap justify-center glass">
          {navItems.map((item) => (
            <button
              key={item.view}
              onClick={() => onViewChange(item.view)}
              className={`px-5 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
                currentView === item.view ? 'bg-hub-accent text-white shadow-lg glow-accent' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
};

export default Header;
