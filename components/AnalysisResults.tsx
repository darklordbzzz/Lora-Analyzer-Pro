
import React from 'react';
import type { LoraAnalysis } from '../types';
import LoraCard from './LoraCard';

interface AnalysisResultsProps {
  results: LoraAnalysis[];
}

const AnalysisResults: React.FC<AnalysisResultsProps> = ({ results }) => {
  if (results.length === 0) {
    return null;
  }

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold text-center mb-6">Analysis Results</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {results.map((result) => (
          <LoraCard key={result.id} result={result} />
        ))}
      </div>
    </div>
  );
};

export default AnalysisResults;
