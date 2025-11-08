
import React from 'react';
import { LogoIcon } from './Icons';

const Header: React.FC = () => {
  return (
    <header className="bg-gray-900/70 backdrop-blur-sm border-b border-gray-700/50 sticky top-0 z-10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <LogoIcon className="h-8 w-8 text-indigo-400" />
            <span className="ml-3 text-2xl font-bold text-white">LoRA Analyzer Pro</span>
          </div>
          <div className="text-sm text-gray-400">
            Powered by Gemini
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
