
import React from 'react';
import type { LoraAnalysis, LLMModel } from '../types';
import LoraCard from './LoraCard';

interface AnalysisResultsProps {
  results: LoraAnalysis[];
  onDelete: (id: string) => void;
  onRetry: (result: LoraAnalysis) => void;
  canRetry: (result: LoraAnalysis) => boolean;
  activeModel?: LLMModel;
}

const AnalysisResults: React.FC<AnalysisResultsProps> = ({ results = [], onDelete, onRetry, canRetry, activeModel }) => {
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
        />
      ))}
    </div>
  );
};

export default AnalysisResults;
