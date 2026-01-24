import React from 'react';
import { VaultEntry } from '../types';
import { ArchiveIcon, TrashIcon, DownloadIcon, ImageIcon } from './Icons';

interface VaultProps {
  vault: VaultEntry[];
  onDelete: (id: string) => void;
}

const Vault: React.FC<VaultProps> = ({ vault, onDelete }) => {
  const downloadAudit = (entry: VaultEntry) => {
    const blob = new Blob([JSON.stringify(entry, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `VISION_AUDITOR_VAULT_${entry.fileName.split('.')[0]}_${new Date(entry.timestamp).getTime()}.auditjson`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div className="p-5 bg-indigo-600/20 rounded-3xl border border-indigo-500/30">
            <ArchiveIcon className="h-10 w-10 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Neural Vault</h2>
            <p className="text-sm font-black text-gray-500 uppercase tracking-widest mt-2 opacity-60">Persistent Audit Log ({vault.length} Entries)</p>
          </div>
        </div>
      </div>

      {vault.length === 0 ? (
        <div className="va-card p-32 rounded-[3rem] text-center opacity-20 border-dashed border-2">
          <ArchiveIcon className="h-24 w-24 mx-auto mb-8" />
          <p className="text-xl font-black uppercase tracking-[0.5em]">Vault Buffer Empty</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {vault.map(entry => (
            <div key={entry.id} className="va-card p-8 rounded-[3rem] group relative hover:border-indigo-500/40 transition-all flex flex-col h-full shadow-2xl">
              <div className="flex justify-between items-start mb-8">
                <div className="flex items-center gap-5 min-w-0">
                  <div className="p-4 bg-gray-950 rounded-2xl">
                    <ImageIcon className="h-8 w-8 text-indigo-400 opacity-60" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-black text-white truncate uppercase tracking-tight">{entry.fileName}</h3>
                    <p className="text-xs text-gray-500 uppercase font-black tracking-widest mt-2">{new Date(entry.timestamp).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="bg-black/40 p-6 rounded-3xl border border-white/5 mb-8 flex-grow shadow-inner">
                 <p className="text-sm text-gray-400 line-clamp-4 leading-relaxed">
                   {(entry as any).result?.compositionDescriptor || "No description available."}
                 </p>
                 <div className="mt-6 flex flex-wrap gap-2">
                   <span className="px-3 py-1 bg-indigo-950/40 text-indigo-400 text-xs font-black uppercase rounded border border-indigo-500/20">{(entry as any).config?.artisticStylePreference || "Photo"}</span>
                   <span className="px-3 py-1 bg-white/5 text-gray-500 text-[10px] font-black uppercase rounded border border-white/10">v{(entry as any).version || "4.0"}</span>
                 </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => downloadAudit(entry)}
                  className="flex-grow py-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95"
                >
                  <DownloadIcon className="h-5 w-5" /> Download Audit
                </button>
                <button 
                  onClick={() => onDelete(entry.id)}
                  className="p-4 bg-gray-800 hover:bg-red-600 text-gray-400 hover:text-white rounded-2xl transition-all shadow-lg active:scale-95"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Vault;