import React from 'react';

type IconProps = React.SVGProps<SVGSVGElement>;

export const LogoIcon: React.FC<IconProps> = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L2 7V17L12 22L22 17V7L12 2ZM4 8.23L12 12.51L20 8.23V15.77L12 20.05L4 15.77V8.23ZM12 11.09L5.5 7.5L12 4.02L18.5 7.5L12 11.09Z" />
  </svg>
);

export const UploadIcon: React.FC<IconProps> = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
  </svg>
);

export const FileIcon: React.FC<IconProps> = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
  </svg>
);

export const XIcon: React.FC<IconProps> = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export const ImageIcon: React.FC<IconProps> = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

export const InfoIcon: React.FC<IconProps> = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export const LoaderIcon: React.FC<IconProps> = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.75V6.25m0 11.5v1.5m8.25-13.25L19 5.5m-14 14l-1.25 1.25m15.5 0l-1.25-1.25m-14-11.5L5.5 7m11.5 11.5l1.25 1.25m-14-14L7 5.5" />
  </svg>
);

export const CheckCircleIcon: React.FC<IconProps> = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export const XCircleIcon: React.FC<IconProps> = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export const ChevronDownIcon: React.FC<IconProps> = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);

export const RequirementsIcon: React.FC<IconProps> = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

export const CompatibilityIcon: React.FC<IconProps> = (props) => (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

export const TrainingIcon: React.FC<IconProps> = (props) => (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

export const CivitaiIcon: React.FC<IconProps> = (props) => (
    <svg {...props} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M13.257 0H2.88a.3.3 0 00-.3.3v23.4a.3.3 0 00.3.3h10.377a.3.3 0 00.3-.3V.3a.3.3 0 00-.3-.3zm-1.87 18.261a.3.3 0 01-.3.3h-1.35a.3.3 0 01-.3-.3v-1.35a.3.3 0 01.3-.3h1.35a.3.3 0 01.3.3zm0-3.375a.3.3 0 01-.3.3h-1.35a.3.3 0 01-.3-.3v-1.35a.3.3 0 01.3-.3h1.35a.3.3 0 01.3.3zm0-3.375a.3.3 0 01-.3.3h-1.35a.3.3 0 01-.3-.3v-1.35a.3.3 0 01.3-.3h1.35a.3.3 0 01.3.3zm0-3.375a.3.3 0 01-.3.3h-1.35a.3.3 0 01-.3-.3V6.436a.3.3 0 01.3-.3h1.35a.3.3 0 01.3.3zm0-3.375a.3.3 0 01-.3.3h-1.35a.3.3 0 01-.3-.3V3.061a.3.3 0 01.3-.3h1.35a.3.3 0 01.3.3zM21.42 10.124h-5.003a.3.3 0 00-.3.3v3.151a.3.3 0 00.3.3h5.003a.3.3 0 00.3-.3v-3.15a.3.3 0 00-.3-.3z"/>
    </svg>
);

export const HuggingFaceIcon: React.FC<IconProps> = (props) => (
    <svg {...props} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M21.36,10.15a1.44,1.44,0,0,0-1.22-1,1.52,1.52,0,0,0-1.18.73,6.3,6.3,0,0,0-10.36,0,1.52,1.52,0,0,0-1.18-.73,1.44,1.44,0,0,0-1.22,1,1.5,1.5,0,0,0,.59,1.81,6.5,6.5,0,0,0,12.72,0,1.5,1.5,0,0,0,.59-1.81M14.73,15.1a.76.76,0,0,1-.54.22h-4a.76.76,0,0,1-.54-.22.74.74,0,0,1,0-1.09,5.2,5.2,0,0,1,5,0,.74.74,0,0,1,0,1.09m-9-3.41a1.2,1.2,0,1,1,1.2,1.2,1.2,1.2,0,0,1-1.2-1.2m7.36,0a1.2,1.2,0,1,1,1.2,1.2,1.2,1.2,0,0,1-1.2-1.2" />
    </svg>
);

export const HashIcon: React.FC<IconProps> = (props) => (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
    </svg>
);

export const TriggerWordsIcon: React.FC<IconProps> = (props) => (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
);

export const TagsIcon: React.FC<IconProps> = (props) => (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.53 0 1.04.21 1.41.59l4.59 4.59a2 2 0 010 2.82l-5 5a2 2 0 01-2.83 0l-4.59-4.59A1.99 1.99 0 013 8V3a2 2 0 012-2h2z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M14 2H9.5a4.5 4.5 0 00-3.18 7.68l6 6a4.5 4.5 0 006.36 0l2.83-2.83a4.5 4.5 0 000-6.36l-6-6A4.5 4.5 0 0014 2z" />
    </svg>
);

export const CopyIcon: React.FC<IconProps> = (props) => (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
);

export const DuplicateIcon: React.FC<IconProps> = (props) => (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15.5 2H8.6c-.4 0-.8.2-1.1.5-.3.3-.5.7-.5 1.1V14c0 .4.2.8.5 1.1.3.3.7.5 1.1.5h7.8c.4 0 .8-.2 1.1-.5.3-.3.5-.7.5-1.1V6.5L15.5 2z"></path>
      <path d="M3 7.6v12.8c0 .4.2.8.5 1.1.3.3.7.5 1.1.5h9.8"></path>
      <path d="M15 2v5h5"></path>
    </svg>
);

export const SearchIcon: React.FC<IconProps> = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

export const LinkIcon: React.FC<IconProps> = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
  </svg>
);

export const TensorArtIcon: React.FC<IconProps> = (props) => (
    <svg {...props} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2V7h6v2h-4v8z"/>
    </svg>
);

export const SeaArtIcon: React.FC<IconProps> = (props) => (
    <svg {...props} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M14.28 3.51a8.5 8.5 0 00-8.07 4.41A8.5 8.5 0 009.68 20.5a8.5 8.5 0 008.07-4.41A8.5 8.5 0 0014.28 3.5zm-2.07 13.52c-2.3 0-4.17-1.87-4.17-4.17s1.87-4.17 4.17-4.17c.55 0 1.08.1 1.56.3-.33.63-.51 1.34-.51 2.1 0 .77.18 1.48.5 2.11-.47.18-1 .26-1.55.26zm2.08-1.77c-.4.4-.88.7-1.4.88.4-.4.72-.88.94-1.4-.08.47-.13.96-.54 2.29l.06-2.3a2.1 2.1 0 00-.57-1.5c.62-.22 1.18-.58 1.67-1.06-.5.48-1.06.84-1.66 1.06.33.63.5 1.34.5 2.09z" />
    </svg>
);

export const MageSpaceIcon: React.FC<IconProps> = (props) => (
    <svg {...props} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5-10-5-10 5z" />
    </svg>
);