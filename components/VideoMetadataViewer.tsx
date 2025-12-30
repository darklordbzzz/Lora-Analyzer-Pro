import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
    UploadIcon, VideoIcon, XIcon, InfoIcon, LoaderIcon, BoxIcon, 
    XCircleIcon, TerminalIcon, SparklesIcon, PlugIcon, RefreshIcon, 
    LabIcon, ChevronDownIcon, AudioIcon, DownloadIcon, GlobeIcon, 
    LinkIcon, SettingsIcon, CheckCircleIcon, SaveIcon, CropIcon, TargetIcon 
} from './Icons';
import { LLMModel } from '../types';
import { analyzeVideoSurface, analyzeVideoFrames, upscaleVideoFrame, transformVideoFrame } from '../services/llmService';

interface VideoMetadataViewerProps {
    activeModel?: LLMModel;
}

interface CropRegion {
    x: number; y: number; w: number; h: number;
}

type UpscaleQuality = 'standard' | 'neural' | 'ultra';

const VideoMetadataViewer: React.FC<VideoMetadataViewerProps> = ({ activeModel }) => {
    const [video, setVideo] = useState<{ file: File | null; url: string; duration: number; width: number; height: number; size: number; isLive?: boolean } | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isCapturing, setIsCapturing] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [isAuditing, setIsAuditing] = useState(false);
    const [videoUrlInput, setVideoUrlInput] = useState('');
    const [error, setError] = useState<{ msg: string; type: 'error' | 'warning' | 'info' } | null>(null);
    const [frames, setFrames] = useState<string[]>([]);
    const [auditResult, setAuditResult] = useState<string | null>(null);
    
    // Pro Features State
    const [isNeuralProcessing, setIsNeuralProcessing] = useState(false); 
    const [upscaleProgress, setUpscaleProgress] = useState(0);
    const [upscaleQuality, setUpscaleQuality] = useState<UpscaleQuality>('standard');
    const [upscaleFactor, setUpscaleFactor] = useState(2);

    // Transformation State
    const [isTransforming, setIsTransforming] = useState(false);
    const [transformPrompt, setTransformPrompt] = useState('');
    const [transformProgress, setTransformProgress] = useState(0);
    
    const [isCropMode, setIsCropMode] = useState(false);
    const [crop, setCrop] = useState<CropRegion | null>(null);
    const [isDraggingCrop, setIsDraggingCrop] = useState(false);
    const [cropStart, setCropStart] = useState<{x: number, y: number} | null>(null);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const previewContainerRef = useRef<HTMLDivElement>(null);

    const cleanupLiveStream = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (recorderRef.current && recorderRef.current.state !== 'inactive') {
            recorderRef.current.stop();
        }
        setIsCropMode(false);
        setCrop(null);
    };

    const handleFile = async (file: File | string, isUrl = false) => {
        setError(null);
        setFrames([]);
        setAuditResult(null);
        if (!isUrl) cleanupLiveStream();
        
        let url = typeof file === 'string' ? file : URL.createObjectURL(file);
        
        const tempVideo = document.createElement('video');
        tempVideo.crossOrigin = "anonymous";
        tempVideo.src = url;
        
        tempVideo.onloadedmetadata = () => {
            setVideo({
                file: isUrl ? null : (file as File),
                url,
                duration: tempVideo.duration,
                width: tempVideo.videoWidth,
                height: tempVideo.videoHeight,
                size: isUrl ? 0 : (file as File).size,
                isLive: false
            });
        };
        tempVideo.onerror = () => {
            setError({ msg: "Uplink Failure: File inaccessible or CORS blocked.", type: 'error' });
        };
    };

    const handleUrlIngestion = () => {
        if (!videoUrlInput.trim()) return;
        handleFile(videoUrlInput, true);
        setVideoUrlInput('');
    };

    const handleLiveCapture = async () => {
        try {
            setError(null);
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: { cursor: "always" } as any,
                audio: true
            });
            
            streamRef.current = stream;
            const videoTrack = stream.getVideoTracks()[0];
            const settings = videoTrack.getSettings();

            setVideo({
                file: null, url: '', duration: 0,
                width: settings.width || 1920, height: settings.height || 1080,
                size: 0, isLive: true
            });

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
            }

            videoTrack.onended = () => { setVideo(null); cleanupLiveStream(); };
        } catch (e: any) {
            setError({ msg: "Capture Protocol Refused.", type: 'error' });
        }
    };

    const startCrop = (e: React.MouseEvent) => {
        if (!isCropMode || !previewContainerRef.current) return;
        const rect = previewContainerRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setCropStart({ x, y });
        setIsDraggingCrop(true);
        setCrop({ x, y, w: 0, h: 0 });
    };

    const updateCrop = (e: React.MouseEvent) => {
        if (!isDraggingCrop || !cropStart || !previewContainerRef.current) return;
        const rect = previewContainerRef.current.getBoundingClientRect();
        const currentX = ((e.clientX - rect.left) / rect.width) * 100;
        const currentY = ((e.clientY - rect.top) / rect.height) * 100;
        
        setCrop({
            x: Math.min(cropStart.x, currentX),
            y: Math.min(cropStart.y, currentY),
            w: Math.abs(currentX - cropStart.x),
            h: Math.abs(currentY - cropStart.y)
        });
    };

    const stopCrop = () => { setIsDraggingCrop(false); };

    const startRecording = () => {
        if (!streamRef.current || !videoRef.current) return;
        
        chunksRef.current = [];
        const recorder = new MediaRecorder(streamRef.current, { mimeType: 'video/webm;codecs=vp9,opus' });
        
        recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
        recorder.onstop = () => {
            const blob = new Blob(chunksRef.current, { type: 'video/webm' });
            const file = new File([blob], `capture_${Date.now()}.webm`, { type: 'video/webm' });
            handleFile(file);
        };

        recorderRef.current = recorder;
        recorder.start();
        setIsRecording(true);
        setRecordingTime(0);
    };

    const stopRecording = () => {
        if (recorderRef.current) { recorderRef.current.stop(); setIsRecording(false); }
    };

    useEffect(() => {
        let interval: any;
        if (isRecording) {
            interval = setInterval(() => {
                setRecordingTime(t => t + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isRecording]);

    const captureSeries = async () => {
        if (!video || !videoRef.current || !canvasRef.current || !previewContainerRef.current) return;
        
        setIsCapturing(true);
        const capturedFrames: string[] = [];
        const v = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        const scale = 1; 
        const vRect = v.getBoundingClientRect();
        const cRect = previewContainerRef.current.getBoundingClientRect();

        let sX = 0, sY = 0, sW = video.width, sH = video.height;

        if (crop) {
            const cropLeftPx = (crop.x / 100) * cRect.width;
            const cropTopPx = (crop.y / 100) * cRect.height;
            const cropWidthPx = (crop.w / 100) * cRect.width;
            const cropHeightPx = (crop.h / 100) * cRect.height;
            const videoLeftInContainer = vRect.left - cRect.left;
            const videoTopInContainer = vRect.top - cRect.top;
            const relX = Math.max(0, cropLeftPx - videoLeftInContainer);
            const relY = Math.max(0, cropTopPx - videoTopInContainer);
            const relW = Math.min(vRect.width - relX, cropWidthPx);
            const relH = Math.min(vRect.height - relY, cropHeightPx);
            sX = (relX / vRect.width) * video.width;
            sY = (relY / vRect.height) * video.height;
            sW = (relW / vRect.width) * video.width;
            sH = (relH / vRect.height) * video.height;
        }

        canvas.width = sW * scale;
        canvas.height = sH * scale;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        try {
            const count = 10;
            if (video.isLive) {
                for (let i = 0; i < count; i++) {
                    ctx.drawImage(v, sX, sY, sW, sH, 0, 0, canvas.width, canvas.height);
                    capturedFrames.push(canvas.toDataURL('image/jpeg', 0.9));
                    await new Promise(r => setTimeout(r, 600)); 
                }
            } else {
                const interval = video.duration / count;
                for (let i = 0; i < count; i++) {
                    v.currentTime = i * interval;
                    await new Promise<void>(resolve => {
                        const onSeeked = () => { v.removeEventListener('seeked', onSeeked); resolve(); };
                        v.addEventListener('seeked', onSeeked);
                    });
                    ctx.drawImage(v, sX, sY, sW, sH, 0, 0, canvas.width, canvas.height);
                    capturedFrames.push(canvas.toDataURL('image/jpeg', 0.9));
                }
            }
            setFrames(capturedFrames);
        } finally {
            setIsCapturing(false);
        }
    };

    const handleSurfaceAudit = async () => {
        if (frames.length === 0 || !activeModel || !video) return;
        setIsAuditing(true);
        setError(null);
        try {
            let summary = "";
            if (video.file && video.file.size > 0) summary = await analyzeVideoSurface(frames, video.file, activeModel);
            else summary = await analyzeVideoFrames(frames, activeModel);
            setAuditResult(summary);
        } catch (e: any) {
            setError({ msg: `Inference Failed: ${e.message}`, type: 'error' });
        } finally {
            setIsAuditing(false);
        }
    };

    const launchNeuralUpscale = async () => {
        if (frames.length === 0 || !activeModel) return;
        setIsNeuralProcessing(true);
        setUpscaleProgress(0);
        setError(null);

        const enhancedFrames: string[] = [];
        try {
            for (let i = 0; i < frames.length; i++) {
                const enhanced = await upscaleVideoFrame(frames[i], upscaleFactor, upscaleQuality, activeModel);
                enhancedFrames.push(enhanced);
                setUpscaleProgress(Math.round(((i + 1) / frames.length) * 100));
            }
            setFrames(enhancedFrames);
        } catch (e: any) {
            setError({ msg: `Upscale Protocol Interrupted: ${e.message}`, type: 'error' });
        } finally {
            setIsNeuralProcessing(false);
        }
    };

    const launchNeuralTransformation = async () => {
        if (frames.length === 0 || !activeModel || !transformPrompt.trim()) return;
        setIsTransforming(true);
        setTransformProgress(0);
        setError(null);

        const transformedFrames: string[] = [];
        try {
            for (let i = 0; i < frames.length; i++) {
                const transformed = await transformVideoFrame(frames[i], transformPrompt, activeModel);
                transformedFrames.push(transformed);
                setTransformProgress(Math.round(((i + 1) / frames.length) * 100));
            }
            setFrames(transformedFrames);
        } catch (e: any) {
            setError({ msg: `Transformation Sequence Error: ${e.message}`, type: 'error' });
        } finally {
            setIsTransforming(false);
        }
    };

    const downloadFrame = (frame: string, index: number) => {
        const link = document.createElement('a');
        link.href = frame;
        link.download = `frame_${index}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 h-[calc(100vh-140px)] animate-in fade-in duration-500 overflow-hidden">
            <style>{`
                @keyframes marching-ants { to { stroke-dashoffset: -10; } }
                .marching-ants { stroke-dasharray: 5; animation: marching-ants 0.5s linear infinite; }
            `}</style>

            <div className="lg:col-span-6 flex flex-col gap-4 h-full overflow-hidden">
                <div 
                    ref={previewContainerRef}
                    className={`flex-grow border-2 border-dashed rounded-[2.5rem] flex flex-col items-center justify-center transition-all relative overflow-hidden bg-gray-800/20 ${isDragging ? 'border-indigo-500 bg-indigo-900/10' : 'border-gray-700/50'} ${!video ? 'cursor-pointer hover:bg-gray-800/40' : ''}`}
                    onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]); }} 
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)}
                    onClick={() => !video && document.getElementById('video-upload')?.click()}
                >
                    <input id="video-upload" type="file" className="hidden" accept="video/*" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
                    
                    {video ? (
                        <div className="relative w-full h-full flex items-center justify-center p-8">
                            <video ref={videoRef} src={video.url} crossOrigin="anonymous" controls={!video.isLive && !isCropMode} className="max-w-full max-h-full rounded-3xl shadow-2xl border border-white/5" />
                            
                            {isCropMode && (
                                <div 
                                    className="absolute inset-0 z-40 cursor-crosshair"
                                    onMouseDown={startCrop}
                                    onMouseMove={updateCrop}
                                    onMouseUp={stopCrop}
                                />
                            )}

                            {isCropMode && crop && (
                                <div className="absolute inset-0 z-50 pointer-events-none">
                                    <svg width="100%" height="100%" className="absolute inset-0">
                                        <defs>
                                            <mask id="crop-mask">
                                                <rect width="100%" height="100%" fill="white" />
                                                <rect x={`${crop.x}%`} y={`${crop.y}%`} width={`${crop.w}%`} height={`${crop.h}%`} fill="black" />
                                            </mask>
                                        </defs>
                                        <rect width="100%" height="100%" fill="rgba(0,0,0,0.7)" mask="url(#crop-mask)" />
                                        <rect x={`${crop.x}%`} y={`${crop.y}%`} width={`${crop.w}%`} height={`${crop.h}%`} fill="none" stroke="#6366f1" strokeWidth="2" className="marching-ants" />
                                    </svg>
                                </div>
                            )}

                            <div className="absolute top-6 left-6 flex items-center gap-3 z-[60]">
                                {video.isLive && <div className="px-3 py-1.5 bg-red-600 rounded-full text-[9px] font-black uppercase animate-pulse shadow-lg border border-red-400/30">Live Link</div>}
                                <button 
                                    onClick={() => { setIsCropMode(!isCropMode); if (isCropMode) setCrop(null); }}
                                    className={`px-4 py-2 rounded-xl transition-all shadow-xl border flex items-center gap-2 text-[10px] font-black uppercase ${isCropMode ? 'bg-indigo-600 text-white border-indigo-400' : 'bg-gray-950/80 text-gray-400 border-gray-700 hover:text-white'}`}
                                >
                                    <CropIcon className="h-4 w-4" />
                                    {isCropMode ? 'Exit Region focus' : 'Spatial Filter'}
                                </button>

                                {video.isLive && (
                                    isRecording ? (
                                        <button onClick={stopRecording} className="px-5 py-2.5 bg-white text-red-600 rounded-xl text-[10px] font-black uppercase flex items-center gap-3 shadow-2xl animate-in slide-in-from-left-2 ring-2 ring-red-500/20">
                                            <div className="w-2.5 h-2.5 bg-red-600 rounded-full animate-ping" />
                                            Terminate Buffer ({recordingTime}s)
                                        </button>
                                    ) : (
                                        <button onClick={startRecording} className="px-5 py-2.5 bg-gray-950/90 text-indigo-400 border border-indigo-500/20 rounded-xl text-[10px] font-black uppercase flex items-center gap-3 hover:bg-indigo-600 hover:text-white transition-all shadow-xl">
                                            <SaveIcon className="h-4 w-4" /> Cache Bitstream
                                        </button>
                                    )
                                )}
                            </div>

                            <button onClick={(e) => { e.stopPropagation(); setVideo(null); setFrames([]); cleanupLiveStream(); }} className="absolute top-6 right-6 p-3 bg-gray-950/80 backdrop-blur-xl text-white rounded-full hover:bg-red-600 shadow-2xl transition-all hover:scale-110 active:scale-90 z-[60] border border-white/5"><XIcon className="h-6 w-6" /></button>
                        </div>
                    ) : (
                        <div className="text-center p-12 space-y-6 pointer-events-none">
                            <div className="p-10 bg-gray-900 rounded-[3rem] border border-gray-800 shadow-2xl inline-block relative group">
                                <VideoIcon className="h-20 w-20 text-indigo-500 opacity-20 relative z-10" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-gray-200 uppercase tracking-widest">Temporal Intake</h3>
                                <p className="text-gray-500 mt-2 text-[10px] font-black uppercase tracking-[0.3em]">Direct Mount or Live Tab Sync</p>
                            </div>
                        </div>
                    )}

                    {!video && (
                        <div className="absolute bottom-8 left-8 right-8 space-y-3" onClick={(e) => e.stopPropagation()}>
                            <div className="bg-gray-950/90 backdrop-blur-xl border border-gray-700/50 p-2 rounded-[1.5rem] flex gap-2 shadow-2xl">
                                <input 
                                    type="text" value={videoUrlInput} onChange={(e) => setVideoUrlInput(e.target.value)}
                                    placeholder="Bitstream Mount URL (.mp4)..."
                                    className="flex-grow bg-transparent border-none focus:ring-0 text-xs text-gray-200 px-4"
                                    onKeyDown={e => e.key === 'Enter' && handleUrlIngestion()}
                                />
                                <button onClick={handleUrlIngestion} className="px-5 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-all font-black text-[10px] uppercase shadow-lg"><LinkIcon className="h-4 w-4" /></button>
                            </div>
                            <button onClick={handleLiveCapture} className="w-full py-4 bg-gray-800/80 hover:bg-indigo-600/20 text-gray-400 hover:text-white rounded-[1.5rem] border border-gray-700/50 transition-all font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3">
                                <GlobeIcon className="h-4 w-4" /> Sync Remote Window
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* ANALYSIS SIDEBAR */}
            <div className="lg:col-span-6 flex flex-col gap-6 h-full overflow-hidden">
                <div className="bg-gray-800/40 border border-gray-700/50 rounded-[2.5rem] flex flex-col flex-grow overflow-hidden shadow-2xl backdrop-blur-md relative">
                    <div className="p-6 border-b border-gray-700/50 flex justify-between items-center bg-gray-900/40 sticky top-0 z-20">
                        <h2 className="font-black text-xl flex items-center gap-3 uppercase tracking-tighter text-white">
                            <SparklesIcon className="h-6 w-6 text-indigo-400" /> Temporal Audit
                        </h2>
                        <div className="flex gap-2">
                             {frames.length > 0 && (
                                <button onClick={handleSurfaceAudit} disabled={isAuditing} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase rounded-xl shadow-xl transition-all active:scale-95 flex items-center gap-2 border border-white/10">
                                    {isAuditing ? <LoaderIcon className="h-4 w-4 animate-spin" /> : <RefreshIcon className="h-4 w-4" />}
                                    Analyze Frames
                                </button>
                            )}
                            <button 
                                onClick={captureSeries} 
                                disabled={!video || isCapturing}
                                className="px-5 py-2.5 bg-gray-700 hover:bg-indigo-600 text-white text-[10px] font-black uppercase rounded-xl shadow-xl disabled:opacity-50 transition-all flex items-center gap-2"
                            >
                                {isCapturing ? <LoaderIcon className="h-4 w-4 animate-spin" /> : <RefreshIcon className="h-4 w-4" />}
                                {isCapturing ? 'Buffering' : 'Sample Stream'}
                            </button>
                        </div>
                    </div>

                    <div className="flex-grow overflow-y-auto custom-scrollbar p-6 space-y-8 pb-32">
                        {/* TRANSFORMATION CONTROLS */}
                        {frames.length > 0 && (
                            <div className="bg-indigo-900/10 border border-indigo-500/20 rounded-3xl p-6 space-y-6">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                                        <SparklesIcon className="h-4 w-4" /> Neural Transformation Protocol
                                    </h4>
                                </div>
                                <div className="space-y-3">
                                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Regeneration Instruction</span>
                                    <textarea 
                                        value={transformPrompt}
                                        onChange={e => setTransformPrompt(e.target.value)}
                                        placeholder="Describe the new visual objective for the stream..."
                                        className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-4 text-xs text-gray-200 resize-none h-24 focus:ring-2 focus:ring-indigo-500/50 outline-none"
                                    />
                                </div>
                                <button 
                                    onClick={launchNeuralTransformation}
                                    disabled={isTransforming || !transformPrompt.trim()}
                                    className="w-full py-4 bg-gradient-to-r from-indigo-600 to-indigo-800 hover:from-indigo-500 hover:to-indigo-700 text-white font-black uppercase tracking-[0.4em] text-[10px] rounded-2xl shadow-2xl transition-all active:scale-95 disabled:opacity-50 flex flex-col items-center gap-2"
                                >
                                    {isTransforming ? (
                                        <>
                                            <LoaderIcon className="h-5 w-5 animate-spin" />
                                            <span>Transforming Sequence: {transformProgress}%</span>
                                        </>
                                    ) : (
                                        <>
                                            <SparklesIcon className="h-5 w-5" />
                                            <span>Execute Neural Regen</span>
                                        </>
                                    )}
                                </button>
                                {isTransforming && (
                                    <div className="w-full bg-black/50 rounded-full h-1.5 overflow-hidden">
                                        <div className="bg-indigo-500 h-full transition-all duration-300" style={{ width: `${transformProgress}%` }} />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* UPSCALING CONTROLS */}
                        {frames.length > 0 && (
                            <div className="bg-indigo-900/10 border border-indigo-500/20 rounded-3xl p-6 space-y-6">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                                        <RefreshIcon className="h-4 w-4" /> Neural Upscale Pipeline
                                    </h4>
                                    <div className="flex items-center gap-2 bg-black/40 px-2 py-1 rounded-lg">
                                        <span className="text-[9px] font-black text-gray-500">{upscaleFactor}X</span>
                                        <input type="range" min="2" max="4" step="2" value={upscaleFactor} onChange={e => setUpscaleFactor(parseInt(e.target.value))} className="w-12" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    {(['standard', 'neural', 'ultra'] as UpscaleQuality[]).map(q => (
                                        <button 
                                            key={q} onClick={() => setUpscaleQuality(q)}
                                            className={`py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${upscaleQuality === q ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg' : 'bg-gray-900/50 text-gray-500 border-gray-800'}`}
                                        >
                                            {q}
                                        </button>
                                    ))}
                                </div>
                                <button 
                                    onClick={launchNeuralUpscale}
                                    disabled={isNeuralProcessing || upscaleQuality === 'standard'}
                                    className="w-full py-4 bg-gray-800 hover:bg-gray-700 text-white font-black uppercase tracking-[0.4em] text-[10px] rounded-2xl shadow-xl transition-all active:scale-95 disabled:opacity-50 flex flex-col items-center gap-2"
                                >
                                    {isNeuralProcessing ? (
                                        <>
                                            <LoaderIcon className="h-5 w-5 animate-spin" />
                                            <span>Upscaling Stream: {upscaleProgress}%</span>
                                        </>
                                    ) : (
                                        <>
                                            <RefreshIcon className="h-5 w-5" />
                                            <span>Execute Neural Mastering</span>
                                        </>
                                    )}
                                </button>
                                {isNeuralProcessing && (
                                    <div className="w-full bg-black/50 rounded-full h-1.5 overflow-hidden">
                                        <div className="bg-indigo-500 h-full transition-all duration-300" style={{ width: `${upscaleProgress}%` }} />
                                    </div>
                                )}
                            </div>
                        )}

                        {auditResult && (
                            <div className="p-6 bg-gray-950/40 rounded-3xl border border-gray-800 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-lg"><TerminalIcon className="h-4 w-4" /></div>
                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Hub Inference Report</span>
                                </div>
                                <div className="prose prose-invert prose-indigo max-w-none text-xs leading-relaxed text-gray-300 whitespace-pre-wrap font-sans">
                                    {auditResult}
                                </div>
                            </div>
                        )}

                        {frames.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                {frames.map((f, i) => (
                                    <div key={i} className="group relative aspect-video bg-gray-900 rounded-xl overflow-hidden border border-gray-800 hover:border-indigo-500/50 transition-all shadow-lg">
                                        <img src={f} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                            <button onClick={() => downloadFrame(f, i)} className="p-2 bg-indigo-600 text-white rounded-lg shadow-lg hover:bg-indigo-500 transition-all"><DownloadIcon className="h-4 w-4" /></button>
                                        </div>
                                        <span className="absolute bottom-1 right-1 text-[8px] font-black text-white/40 bg-black/40 px-1 rounded uppercase tracking-tighter">00:0{i}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center opacity-10 grayscale py-12">
                                <BoxIcon className="h-24 w-24 mb-6" />
                                <h4 className="text-xl font-black uppercase tracking-[0.4em]">Analytics Buffer Empty</h4>
                                <p className="text-[10px] font-black uppercase tracking-widest mt-2">Buffer sample bitstreams to begin visual audit</p>
                            </div>
                        )}
                    </div>

                    <canvas ref={canvasRef} className="hidden" />
                </div>
            </div>
        </div>
    );
};

export default VideoMetadataViewer;