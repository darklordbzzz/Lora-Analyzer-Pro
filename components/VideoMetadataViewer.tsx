
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { UploadIcon, VideoIcon, XIcon, InfoIcon, LoaderIcon, BoxIcon, XCircleIcon, TerminalIcon, SparklesIcon, PlugIcon, RefreshIcon, LabIcon, ChevronDownIcon, AudioIcon, DownloadIcon, GlobeIcon, LinkIcon, SettingsIcon, CheckCircleIcon, SaveIcon, CropIcon, TargetIcon } from './Icons';
import { LLMModel } from '../types';
import { analyzeVideoSurface, analyzeVideoFrames } from '../services/llmService';

interface VideoMetadataViewerProps {
    activeModel?: LLMModel;
}

interface CropRegion {
    x: number; y: number; w: number; h: number;
}

const VideoMetadataViewer: React.FC<VideoMetadataViewerProps> = ({ activeModel }) => {
    const [video, setVideo] = useState<{ file: File | null; url: string; duration: number; width: number; height: number; size: number; isTainted?: boolean; isLive?: boolean }> (null as any);
    const [isDragging, setIsDragging] = useState(false);
    const [isCapturing, setIsCapturing] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [isAuditing, setIsAuditing] = useState(false);
    const [isFetching, setIsFetching] = useState(false);
    const [videoUrlInput, setVideoUrlInput] = useState('');
    const [error, setError] = useState<{ msg: string; type: 'error' | 'warning' | 'info' } | null>(null);
    const [frames, setFrames] = useState<string[]>([]);
    const [auditResult, setAuditResult] = useState<string | null>(null);
    
    // Pro Features State
    const [isUpscaling, setIsUpscaling] = useState(false);
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
            setError({ msg: "Uplink Failure: File inaccessible.", type: 'error' });
        };
    };

    // Define handleUrlIngestion for URL input handling
    const handleUrlIngestion = () => {
        if (!videoUrlInput.trim()) return;
        handleFile(videoUrlInput, true);
        setVideoUrlInput('');
    };

    const handleLiveCapture = async () => {
        try {
            setError(null);
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: { cursor: "always", displaySurface: "browser" } as any,
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

            videoTrack.onended = () => { setVideo(null as any); cleanupLiveStream(); };
        } catch (e: any) {
            setError({ msg: "Capture Protocol Refused.", type: 'error' });
        }
    };

    // Region Selection Logic
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
        // If cropped, we use a separate hidden canvas to record just the region
        // Simplified: Standard recorder, but for the "clip" we will record the whole tab.
        // For actual element-extraction, we'd capture the canvas stream.
        const recorder = new MediaRecorder(streamRef.current, { mimeType: 'video/webm;codecs=vp9,opus' });
        
        recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
        recorder.onstop = () => {
            const blob = new Blob(chunksRef.current, { type: 'video/webm' });
            const file = new File([blob], `cut_${Date.now()}.webm`, { type: 'video/webm' });
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
                if (recordingTime >= 15) stopRecording(); 
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isRecording, recordingTime]);

    const captureSeries = async () => {
        if (!video || !videoRef.current || !canvasRef.current) return;
        
        setIsCapturing(true);
        const capturedFrames: string[] = [];
        const v = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        // Upscaling Factor
        const scale = isUpscaling ? 2 : 1;
        
        // Target Dimensions based on Crop
        let sX = 0, sY = 0, sW = video.width, sH = video.height;
        if (crop) {
            sX = (crop.x / 100) * video.width;
            sY = (crop.y / 100) * video.height;
            sW = (crop.w / 100) * video.width;
            sH = (crop.h / 100) * video.height;
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

    // Define downloadFrame for frame downloading
    const downloadFrame = (src: string, index: number) => {
        const link = document.createElement('a');
        link.href = src;
        link.download = `frame_${index}_${Date.now()}.jpg`;
        link.click();
    };

    return (
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 h-[calc(100vh-140px)] animate-in fade-in duration-500 overflow-hidden">
            {/* LEFT: LIVE UPLINK & PREVIEW */}
            <div className="lg:col-span-6 flex flex-col gap-4 h-full overflow-hidden">
                <div 
                    ref={previewContainerRef}
                    className={`flex-grow border-2 border-dashed rounded-[2.5rem] flex flex-col items-center justify-center transition-all relative overflow-hidden bg-gray-800/20 ${isDragging ? 'border-indigo-500 bg-indigo-900/10' : 'border-gray-700/50'} ${!video ? 'cursor-pointer hover:bg-gray-800/40' : ''} ${isCropMode ? 'cursor-crosshair' : ''}`}
                    onMouseDown={startCrop} onMouseMove={updateCrop} onMouseUp={stopCrop}
                    onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]); }} 
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)}
                    onClick={() => !video && document.getElementById('video-upload')?.click()}
                >
                    <input id="video-upload" type="file" className="hidden" accept="video/*" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
                    
                    {video ? (
                        <div className="relative w-full h-full flex items-center justify-center p-8 animate-in zoom-in-95 duration-500 pointer-events-none">
                            <video ref={videoRef} src={video.url} crossOrigin="anonymous" controls={!video.isLive} className="max-w-full max-h-full rounded-3xl shadow-2xl border border-white/5" />
                            
                            {/* CROP OVERLAY */}
                            {crop && (
                                <div 
                                    className="absolute border-2 border-indigo-500 bg-indigo-500/10 shadow-[0_0_20px_#6366f1] z-10"
                                    style={{ left: `${crop.x}%`, top: `${crop.y}%`, width: `${crop.w}%`, height: `${crop.h}%` }}
                                >
                                    <div className="absolute -top-6 left-0 bg-indigo-600 text-white text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-widest flex items-center gap-1 shadow-lg">
                                        <TargetIcon className="h-2 w-2" /> Focus Region
                                    </div>
                                </div>
                            )}

                            {/* CONTROLS OVERLAY */}
                            <div className="absolute top-6 left-6 flex items-center gap-2 pointer-events-auto">
                                {video.isLive && (
                                    <>
                                        <div className="px-3 py-1 bg-red-600 rounded-full text-[8px] font-black uppercase animate-pulse shadow-lg">Live Feed</div>
                                        <button 
                                            onClick={() => { setIsCropMode(!isCropMode); if (isCropMode) setCrop(null); }}
                                            className={`p-2 rounded-xl transition-all shadow-xl border ${isCropMode ? 'bg-indigo-600 text-white border-indigo-400' : 'bg-gray-900/80 text-gray-400 border-gray-700 hover:text-white'}`}
                                            title="Toggle Region Focus"
                                        >
                                            <CropIcon className="h-4 w-4" />
                                        </button>
                                        {isRecording ? (
                                            <button onClick={stopRecording} className="px-4 py-2 bg-white text-red-600 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 shadow-2xl animate-in slide-in-from-left-2">
                                                <div className="w-2.5 h-2.5 bg-red-600 rounded-full animate-ping" />
                                                Terminate ({15 - recordingTime}s)
                                            </button>
                                        ) : (
                                            <button onClick={startRecording} className="px-4 py-2 bg-gray-950/90 text-indigo-400 border border-indigo-500/20 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-indigo-600 hover:text-white transition-all shadow-xl">
                                                <SaveIcon className="h-4 w-4" /> Clip Bitstream
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>

                            <button onClick={(e) => { e.stopPropagation(); setVideo(null as any); setFrames([]); cleanupLiveStream(); }} className="absolute top-6 right-6 p-3 bg-gray-950/80 backdrop-blur-xl text-white rounded-full hover:bg-red-600 shadow-2xl transition-all hover:scale-110 active:scale-90 pointer-events-auto"><XIcon className="h-6 w-6" /></button>
                        </div>
                    ) : (
                        <div className="text-center p-12 space-y-6 pointer-events-none">
                            <div className="p-10 bg-gray-900 rounded-[3rem] border border-gray-800 shadow-2xl inline-block relative group">
                                <div className="absolute inset-0 bg-indigo-500/10 rounded-[3rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
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
                                    className="flex-grow bg-transparent border-none focus:ring-0 text-xs text-gray-300 font-mono px-4"
                                />
                                <button onClick={handleUrlIngestion} className="px-6 py-2 bg-gray-800 text-white text-[10px] font-black uppercase rounded-xl hover:bg-gray-700">Link</button>
                                <button onClick={handleLiveCapture} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase rounded-xl transition-all shadow-lg flex items-center gap-2">
                                    <TerminalIcon className="h-4 w-4" /> Capture Tab
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT: BUFFER & ANALYTICS */}
            <div className="lg:col-span-6 bg-gray-800/40 border border-gray-700/50 rounded-[2.5rem] flex flex-col h-full overflow-hidden shadow-2xl backdrop-blur-md">
                <div className="p-6 border-b border-gray-700/50 flex justify-between items-center bg-gray-900/40">
                    <div className="flex flex-col">
                        <h2 className="font-black text-xl flex items-center gap-3 uppercase tracking-tighter text-white leading-none">
                            <BoxIcon className="h-6 w-6 text-indigo-400" /> Frame Buffer
                        </h2>
                        <div className="flex items-center gap-2 mt-2">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input type="checkbox" checked={isUpscaling} onChange={e => setIsUpscaling(e.target.checked)} className="sr-only" />
                                <div className={`w-7 h-4 rounded-full transition-all border ${isUpscaling ? 'bg-indigo-600 border-indigo-400' : 'bg-gray-800 border-gray-700'}`}>
                                    <div className={`w-2.5 h-2.5 bg-white rounded-full mt-0.5 transition-transform ${isUpscaling ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                                </div>
                                <span className={`text-[8px] font-black uppercase tracking-widest ${isUpscaling ? 'text-indigo-400' : 'text-gray-600 group-hover:text-gray-400'}`}>X-Res Sync</span>
                            </label>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {video && (
                            <button onClick={captureSeries} disabled={isCapturing || isAuditing} className="px-6 py-2.5 bg-gray-700 hover:bg-indigo-600 text-white text-[10px] font-black uppercase rounded-xl shadow-xl disabled:opacity-50 transition-all flex items-center gap-2">
                                {isCapturing ? <LoaderIcon className="h-4 w-4 animate-spin" /> : <RefreshIcon className="h-4 w-4" />}
                                Sync Logic
                            </button>
                        )}
                        {frames.length > 0 && (
                            <button onClick={handleSurfaceAudit} disabled={isAuditing || isCapturing} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase rounded-xl shadow-xl disabled:opacity-50 transition-all flex items-center gap-2">
                                {isAuditing ? <LoaderIcon className="h-4 w-4 animate-spin" /> : <LabIcon className="h-4 w-4" />}
                                Surface Audit
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex-grow p-6 space-y-6 overflow-y-auto custom-scrollbar">
                    <div className="space-y-3">
                        <div className="flex justify-between items-center px-1">
                            <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] flex items-center gap-2">
                                <TerminalIcon className="h-3.5 w-3.5" /> Bitstream Series
                            </h4>
                            {crop && <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Region Focused</span>}
                        </div>
                        <div className="flex gap-4 overflow-x-auto p-1 custom-scrollbar snap-x pb-4">
                            {frames.length > 0 ? frames.map((src, i) => (
                                <div key={i} className="snap-start shrink-0 h-36 bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden relative group shadow-2xl" style={{ aspectRatio: crop ? `${crop.w}/${crop.h}` : video ? `${video.width}/${video.height}` : '16/9' }}>
                                    <img src={src} className="w-full h-full object-cover" alt="" />
                                    <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                                        <button onClick={() => downloadFrame(src, i)} className="p-2 bg-indigo-600 text-white rounded-lg shadow-xl hover:scale-110 active:scale-90 transition-all"><DownloadIcon className="h-3.5 w-3.5" /></button>
                                    </div>
                                    {isUpscaling && <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-indigo-900/80 text-indigo-300 text-[6px] font-black rounded uppercase border border-indigo-500/30">X-Res</div>}
                                </div>
                            )) : (
                                <div className="w-full h-36 border border-dashed border-gray-800 rounded-[2rem] flex flex-col items-center justify-center gap-3 opacity-20">
                                    <BoxIcon className="h-8 w-8" />
                                    <p className="text-[9px] font-black uppercase tracking-[0.4em]">Empty Temporal Segment</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-3">
                         <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] px-1">
                            <LabIcon className="h-3.5 w-3.5 inline mr-2" /> Neural Intelligence Report
                         </h4>
                         <div className="bg-gray-950/60 p-8 rounded-[2.5rem] border border-gray-800 shadow-inner min-h-[250px] relative overflow-hidden group">
                            {isAuditing && (
                                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gray-950/80 backdrop-blur-sm animate-in fade-in">
                                    <LoaderIcon className="h-10 w-10 text-indigo-500 animate-spin mb-4" />
                                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.5em] animate-pulse">Running Vision Logic</span>
                                </div>
                            )}
                            {auditResult ? (
                                <p className="text-[12px] font-mono text-gray-300 leading-relaxed whitespace-pre-wrap selection:bg-indigo-500/30">{auditResult}</p>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center opacity-10 py-12">
                                    <SparklesIcon className="h-12 w-12 mb-6" />
                                    <p className="text-[10px] font-black uppercase tracking-[0.5em]">Execute Audit to Synthesize Insights</p>
                                </div>
                            )}
                         </div>
                    </div>
                </div>
            </div>
            <canvas ref={canvasRef} className="hidden" />
        </div>
    );
};

export default VideoMetadataViewer;
