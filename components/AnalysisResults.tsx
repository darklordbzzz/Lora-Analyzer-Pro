
import React from 'react';
import type { LoraAnalysis, LLMModel, ActiveLora } from '../types';
import LoraCard from './LoraCard';

interface AnalysisResultsProps {
  results: LoraAnalysis[];
  onDelete: (id: string) => void;
  onRetry: (result: LoraAnalysis) => void;
  canRetry: (result: LoraAnalysis) => boolean;
  activeModel?: LLMModel;
  activeLoras?: ActiveLora[];
  onToggleInjection?: (lora: LoraAnalysis) => void;
}

const AnalysisResults: React.FC<AnalysisResultsProps> = ({ 
  results = [], onDelete, onRetry, canRetry, activeModel, activeLoras = [], onToggleInjection 
}) => {
  if (!results || results.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {results.map((result) => (
        <LoraCard 
            key={result.id} 
            result={result} 
            onDelete={() => onDelete(result.id)}
            onRetry={() => onRetry(result)}
            canRetry={canRetry(result)}
            activeModel={activeModel}
            isInjected={!!activeLoras.find(l => l.id === result.id)}
            onToggleInjection={() => onToggleInjection?.(result)}
        />
      ))}
    </div>
  );
};

export default AnalysisResults;
