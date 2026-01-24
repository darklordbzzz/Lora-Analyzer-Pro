
import React, { useState } from 'react';
import { AnalyzerTuningConfig } from '../types';
import { CogIcon, InfoIcon, TargetIcon, UserIcon, FolderIcon, DownloadIcon, SparklesIcon, SaveIcon, RefreshIcon, UploadIcon } from './Icons';

interface SetupProps {
  tuning: AnalyzerTuningConfig;
  setTuning: React.Dispatch<React.SetStateAction<AnalyzerTuningConfig>>;
}

const Setup: React.FC<SetupProps> = ({ tuning, setTuning }) => {
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const exportConfig = () => {
    const blob = new Blob([JSON.stringify(tuning, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AI_HUB_Tuning_Preset_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        setTuning(prev => ({ ...prev, ...data }));
        setSaveStatus('Import Successful');
        setTimeout(() => setSaveStatus(null), 2000);
      } catch (err) {
        setSaveStatus('Import Failed: Invalid JSON');
        setTimeout(() => setSaveStatus(null), 2000);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-12">
        <div className="flex items-center gap-6">
          <div className="p-4 bg-indigo-600/20 rounded-3xl border border-indigo-500/30 shadow-xl">
            <CogIcon className="h-10 w-10 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-4xl font-black text-white uppercase tracking-tighter">System Architecture</h2>
            <p className="text-xs font-black text-gray-500 uppercase tracking-widest mt-2 opacity-60">Protocols & Volume Mappings</p>
          </div>
        </div>
        <div className="flex gap-3">
          <label className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-2xl text-[10px] font-black uppercase transition-all flex items-center gap-3 border border-white/5 cursor-pointer shadow-xl">
            <UploadIcon className="h-4 w-4" /> Import Preset
            <input type="file" className="hidden" accept=".json" onChange={importConfig} />
          </label>
          <button onClick={exportConfig} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase transition-all flex items-center gap-3 border border-indigo-500/30 shadow-xl active:scale-95">
            <DownloadIcon className="h-4 w-4" /> Export Preset
          </button>
        </div>
      </div>

      {saveStatus && (
        <div className="p-4 bg-indigo-600/10 border border-indigo-500/30 rounded-2xl text-center text-xs font-black text-indigo-400 uppercase tracking-widest animate-pulse">
          {saveStatus}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="va-card p-10 rounded-[3rem] space-y-8 shadow-2xl">
          <div className="flex items-center gap-4 border-b border-white/5 pb-6">
            <TargetIcon className="h-6 w-6 text-indigo-400" />
            <h3 className="text-lg font-black text-white uppercase tracking-widest">Auditor Logic</h3>
          </div>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between p-6 bg-white/2 rounded-3xl border border-white/5 hover:border-indigo-500/30 transition-all">
              <div className="flex items-center gap-4">
                <TargetIcon className="h-5 w-5 text-indigo-400 opacity-60" />
                <div>
                  <span className="text-white font-black text-[11px] uppercase tracking-widest">Kinetic Pose Audit</span>
                  <p className="text-[9px] text-gray-500 uppercase mt-1">Extract deep skeletal dynamics</p>
                </div>
              </div>
              <button 
                onClick={() => setTuning({...tuning, deepPoseAudit: !tuning.deepPoseAudit})}
                className={`w-10 h-5 rounded-full transition-all relative ${tuning.deepPoseAudit ? 'bg-indigo-600 shadow-[0_0_10px_#6366f1]' : 'bg-gray-800'}`}
              >
                <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all shadow-md`} style={{ left: tuning.deepPoseAudit ? '24px' : '4px' }} />
              </button>
            </div>

            <div className="flex items-center justify-between p-6 bg-white/2 rounded-3xl border border-white/5 hover:border-indigo-500/30 transition-all">
              <div className="flex items-center gap-4">
                <UserIcon className="h-5 w-5 text-indigo-400 opacity-60" />
                <div>
                  <span className="text-white font-black text-[11px] uppercase tracking-widest">Appearance Registry</span>
                  <p className="text-[9px] text-gray-500 uppercase mt-1">Forensic attire identification</p>
                </div>
              </div>
              <button 
                onClick={() => setTuning({...tuning, appearanceAudit: !tuning.appearanceAudit})}
                className={`w-10 h-5 rounded-full transition-all relative ${tuning.appearanceAudit ? 'bg-indigo-600 shadow-[0_0_10px_#6366f1]' : 'bg-gray-800'}`}
              >
                <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all shadow-md`} style={{ left: tuning.appearanceAudit ? '24px' : '4px' }} />
              </button>
            </div>

            <div className="flex items-center justify-between p-6 bg-red-600/5 rounded-3xl border border-red-500/10 hover:border-red-500/30 transition-all group">
              <div className="flex items-center gap-4">
                <SparklesIcon className="h-5 w-5 text-red-400 opacity-60 group-hover:animate-pulse" />
                <div>
                  <span className="text-white font-black text-[11px] uppercase tracking-widest">Unrestricted Neural Uplink</span>
                  <p className="text-[9px] text-gray-500 uppercase mt-1">Deactivate Cloud Safety Suppression</p>
                </div>
              </div>
              <button 
                onClick={() => setTuning({...tuning, unrestrictedNeuralUplink: !tuning.unrestrictedNeuralUplink})}
                className={`w-10 h-5 rounded-full transition-all relative ${tuning.unrestrictedNeuralUplink ? 'bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.5)]' : 'bg-gray-800'}`}
              >
                <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all shadow-md`} style={{ left: tuning.unrestrictedNeuralUplink ? '24px' : '4px' }} />
              </button>
            </div>
          </div>
        </div>

        <div className="va-card p-10 rounded-[3rem] space-y-8 shadow-2xl">
          <div className="flex items-center gap-4 border-b border-white/5 pb-6">
            <FolderIcon className="h-6 w-6 text-indigo-400" />
            <h3 className="text-lg font-black text-white uppercase tracking-widest">Volume Mapping</h3>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                <DownloadIcon className="h-3 w-3" /> Target Download Registry
              </label>
              <input 
                type="text"
                value={tuning.downloadFolderPath || ''}
                onChange={e => setTuning({...tuning, downloadFolderPath: e.target.value})}
                placeholder="e.g. C:\AI_ASSETS\AUDITS"
                className="w-full bg-gray-950 border border-white/5 rounded-2xl px-5 py-4 text-xs text-indigo-100 font-mono outline-none focus:border-indigo-500/50 shadow-inner"
              />
              <p className="text-[8px] text-gray-600 font-bold uppercase tracking-tighter ml-2">
                Note: Browsers cannot force system paths; this string is used for metadata headers.
              </p>
            </div>

            <div className="p-6 bg-indigo-600/5 rounded-3xl border border-indigo-500/10 space-y-4">
              <div className="flex items-center gap-3">
                <InfoIcon className="h-4 w-4 text-indigo-400" />
                <span className="text-[10px] font-black text-white uppercase tracking-widest">Persistence Engine</span>
              </div>
              <p className="text-[9px] text-gray-500 font-bold uppercase tracking-tight leading-relaxed">
                Bitstream and Audit logic are persisted to the local secure hub. Clearing site data will wipe the vault.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Setup;
