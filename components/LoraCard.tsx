
import React, { useState } from 'react';
import type { LoraAnalysis, TrainingInfo } from '../types';
import { AnalysisStatus } from '../types';
import { LoaderIcon, CheckCircleIcon, XCircleIcon, InfoIcon, ChevronDownIcon, CompatibilityIcon, RequirementsIcon, TrainingIcon, HashIcon, TriggerWordsIcon, TagsIcon, CopyIcon, CivitaiIcon, HuggingFaceIcon, LinkIcon, TensorArtIcon, SeaArtIcon, MageSpaceIcon } from './Icons';

interface LoraCardProps {
  result: LoraAnalysis;
}

const DetailSection: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; isOpen: boolean; onToggle: () => void }> = ({ title, icon, children, isOpen, onToggle }) => (
    <div className="border-t border-gray-700/50">
        <button onClick={onToggle} className="w-full flex justify-between items-center py-3 px-4 text-left hover:bg-gray-700/30 transition-colors">
            <div className="flex items-center gap-3">
                {icon}
                <span className="font-semibold">{title}</span>
            </div>
            <ChevronDownIcon className={`h-5 w-5 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        {isOpen && (
            <div className="px-4 pb-3 text-sm text-gray-300">
                {children}
            </div>
        )}
    </div>
);

const TrainingInfoDisplay: React.FC<{ info?: TrainingInfo }> = ({ info }) => {
    if (!info || Object.keys(info).length === 0) {
        return <p>No training information available.</p>;
    }
    const relevantInfo = Object.entries(info).filter(([, value]) => value !== null && value !== undefined && value !== '');
    return (
        <ul className="space-y-1 font-mono text-xs">
            {relevantInfo.map(([key, value]) => (
                <li key={key}>
                    <span className="text-gray-400">{key}:</span> <span className="text-indigo-300">{String(value)}</span>
                </li>
            ))}
        </ul>
    );
};

const HashDisplay: React.FC<{ hash?: string }> = ({ hash }) => {
    const [copied, setCopied] = useState(false);

    if (!hash) {
        return <p>Hash not available.</p>;
    }

    const handleCopy = () => {
        navigator.clipboard.writeText(hash);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex items-center gap-2 font-mono text-xs break-all">
            <span className="flex-grow">{hash}</span>
            <button onClick={handleCopy} className="p-1.5 rounded-md bg-gray-600 hover:bg-indigo-600 transition-colors shrink-0">
                <CopyIcon className={`h-4 w-4 ${copied ? 'text-green-400' : ''}`} />
            </button>
        </div>
    )
}

const LinkDisplay: React.FC<{ url: string; icon: React.ReactNode, name?: string }> = ({ url, icon, name }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex items-center gap-2 bg-gray-900/50 p-2 rounded-md text-xs w-full">
            <div className="shrink-0 w-5 h-5 flex items-center justify-center">{icon}</div>
            <a href={url} target="_blank" rel="noopener noreferrer" className="flex-grow font-mono text-gray-400 truncate hover:text-indigo-300 transition-colors" title={url}>
                {name ? name : url}
            </a>
            <button onClick={handleCopy} className="p-1.5 rounded-md bg-gray-600 hover:bg-indigo-600 transition-colors shrink-0">
                <CopyIcon className={`h-4 w-4 ${copied ? 'text-green-400' : 'text-gray-300'}`} />
            </button>
        </div>
    );
};


const LoraCard: React.FC<LoraCardProps> = ({ result }) => {
    const [openSection, setOpenSection] = useState<string | null>(null);

    const toggleSection = (section: string) => {
        setOpenSection(prev => (prev === section ? null : section));
    };

  const getStatusContent = () => {
    switch (result.status) {
      case AnalysisStatus.PENDING:
        return (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <LoaderIcon className="h-12 w-12 animate-spin mb-4" />
            <p className="font-semibold">Awaiting Analysis...</p>
          </div>
        );
      case AnalysisStatus.FAILED:
        return (
          <div className="flex flex-col items-center justify-center h-full text-red-400 p-4">
            <XCircleIcon className="h-12 w-12 mb-4" />
            <p className="font-semibold text-center">Analysis Failed</p>
            <p className="text-xs text-center mt-2">{result.error}</p>
          </div>
        );
      case AnalysisStatus.COMPLETED:
        const confidenceColor = result.confidence && result.confidence > 0.7 ? 'text-green-400' : result.confidence && result.confidence > 0.4 ? 'text-yellow-400' : 'text-red-400';
        const hasCustomUrls = result.customUrls && Object.keys(result.customUrls).length > 0;
        return (
            <>
                <div className="p-4 border-b border-gray-700/50">
                    <div className="flex justify-between items-start gap-2">
                        <div>
                            <h3 className="font-bold text-lg text-white">{result.modelType}</h3>
                            <p className="text-sm text-gray-400">{result.modelFamily}</p>
                            {result.category && result.category !== 'Unknown' && result.category !== 'General' && (
                                <p className="text-xs font-semibold uppercase tracking-wider text-indigo-300 bg-indigo-900/50 px-2 py-0.5 rounded-full inline-block mt-2">
                                    {result.category}
                                </p>
                            )}
                        </div>
                        <div className={`text-sm font-semibold ${confidenceColor}`}>
                            {result.confidence !== undefined ? `${(result.confidence * 100).toFixed(0)}%` : ''}
                        </div>
                    </div>

                    <div className="mt-4 space-y-2 text-sm">
                        <p><strong className="font-medium text-gray-400 w-20 inline-block">Base:</strong> {result.baseModel}</p>
                        <p><strong className="font-medium text-gray-400 w-20 inline-block">Resolution:</strong> {result.resolution}</p>
                        <p><strong className="font-medium text-gray-400 w-20 inline-block">CLIP:</strong> {result.clips}</p>
                    </div>
                </div>
                
                {(result.civitaiUrl || result.huggingfaceUrl || result.tensorArtUrl || result.seaartUrl || result.mageSpaceUrl || hasCustomUrls) && (
                    <DetailSection title="Source Links" icon={<LinkIcon className="h-5 w-5 text-teal-400"/>} isOpen={openSection === 'links'} onToggle={() => toggleSection('links')}>
                        <div className="space-y-2">
                            {result.civitaiUrl && (
                                <LinkDisplay url={result.civitaiUrl} icon={<CivitaiIcon className="h-5 w-5 text-blue-400" />} name="Civitai" />
                            )}
                            {result.huggingfaceUrl && (
                                <LinkDisplay url={result.huggingfaceUrl} icon={<HuggingFaceIcon className="h-5 w-5 text-yellow-400" />} name="Hugging Face" />
                            )}
                             {result.tensorArtUrl && (
                                <LinkDisplay url={result.tensorArtUrl} icon={<TensorArtIcon className="h-5 w-5 text-green-400" />} name="Tensor.Art" />
                            )}
                            {result.seaartUrl && (
                                <LinkDisplay url={result.seaartUrl} icon={<SeaArtIcon className="h-5 w-5 text-purple-400" />} name="SeaArt" />
                            )}
                            {result.mageSpaceUrl && (
                                <LinkDisplay url={result.mageSpaceUrl} icon={<MageSpaceIcon className="h-5 w-5 text-pink-400" />} name="Mage.space" />
                            )}
                            {result.customUrls && Object.entries(result.customUrls).map(([name, url]) => (
                                <LinkDisplay key={name} url={url} icon={<LinkIcon className="h-5 w-5 text-gray-400" />} name={name} />
                            ))}
                        </div>
                    </DetailSection>
                )}

                {result.triggerWords && result.triggerWords.length > 0 && (
                    <DetailSection title="Trigger Words" icon={<TriggerWordsIcon className="h-5 w-5 text-purple-400"/>} isOpen={openSection === 'triggers'} onToggle={() => toggleSection('triggers')}>
                        <div className="flex flex-wrap gap-2">
                            {result.triggerWords.map((word, i) => (
                                <span key={i} className="px-2.5 py-1 bg-purple-900/70 text-purple-300 text-xs font-semibold rounded-full font-mono">{word}</span>
                            ))}
                        </div>
                    </DetailSection>
                )}

                {result.hash && (
                     <DetailSection title="SHA256 Hash" icon={<HashIcon className="h-5 w-5 text-gray-400"/>} isOpen={openSection === 'hash'} onToggle={() => toggleSection('hash')}>
                        <HashDisplay hash={result.hash} />
                    </DetailSection>
                )}

                {result.tags && result.tags.length > 0 && (
                     <DetailSection title="Tags" icon={<TagsIcon className="h-5 w-5 text-indigo-400"/>} isOpen={openSection === 'tags'} onToggle={() => toggleSection('tags')}>
                         <div className="flex flex-wrap gap-2">
                            {result.tags.map((tag, i) => (
                                <span key={i} className="px-2 py-1 bg-indigo-900/70 text-indigo-300 text-xs font-medium rounded-full">{tag}</span>
                            ))}
                        </div>
                    </DetailSection>
                )}

                <DetailSection title="Requirements" icon={<RequirementsIcon className="h-5 w-5 text-yellow-400"/>} isOpen={openSection === 'req'} onToggle={() => toggleSection('req')}>
                    <ul className="list-disc list-inside space-y-1">
                        {result.requirements?.map((req, i) => <li key={i}>{req}</li>)}
                    </ul>
                </DetailSection>
                <DetailSection title="Compatibility" icon={<CompatibilityIcon className="h-5 w-5 text-green-400"/>} isOpen={openSection === 'compat'} onToggle={() => toggleSection('compat')}>
                     <ul className="list-disc list-inside space-y-1">
                        {result.compatibility?.map((comp, i) => <li key={i}>{comp}</li>)}
                    </ul>
                </DetailSection>
                <DetailSection title="Training Info" icon={<TrainingIcon className="h-5 w-5 text-cyan-400"/>} isOpen={openSection === 'train'} onToggle={() => toggleSection('train')}>
                    <TrainingInfoDisplay info={result.trainingInfo} />
                </DetailSection>
            </>
        );
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden flex flex-col transition-all duration-300 hover:shadow-indigo-500/20 hover:ring-1 hover:ring-indigo-700">
      <div className="h-48 bg-gray-900 flex items-center justify-center">
        {result.previewImageUrl ? (
          <img src={result.previewImageUrl} alt={result.fileName} className="w-full h-full object-cover" />
        ) : (
          <InfoIcon className="h-10 w-10 text-gray-600" />
        )}
      </div>
      <div className="p-4 bg-gray-800/50 border-b border-t border-gray-700/50">
        <p className="text-sm font-semibold text-gray-200 truncate" title={result.fileName}>{result.fileName}</p>
        <p className="text-xs text-gray-500">{result.fileSizeMB} MB</p>
      </div>
      <div className="flex-grow">
        {getStatusContent()}
      </div>
    </div>
  );
};

export default LoraCard;
