
/**
 * Zero-API Procedural Audio Engine
 * Generates a genre-appropriate loop using Web Audio API
 */
export const generateProceduralAudio = async (genre: string, bpm: number): Promise<string> => {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContext();
    const duration = 4; // 4 seconds loop
    const sampleRate = ctx.sampleRate;
    const offlineCtx = new OfflineAudioContext(2, sampleRate * duration, sampleRate);

    // Dynamic Sound Design based on Genre
    const isElectronic = ['Synthwave', 'EDM', 'Techno', 'Phonk'].includes(genre);
    
    // Create Bass/Synth
    const osc = offlineCtx.createOscillator();
    const filter = offlineCtx.createBiquadFilter();
    const gain = offlineCtx.createGain();

    osc.type = genre === 'Lofi' ? 'sine' : isElectronic ? 'sawtooth' : 'triangle';
    
    // A simple rhythmic pattern logic
    const now = 0;
    const beatLen = 60 / bpm;
    
    for (let i = 0; i < 8; i++) {
        const time = now + (i * beatLen / 2);
        osc.frequency.setValueAtTime(isElectronic ? 55 : 110, time);
        if (i % 2 === 0) {
            osc.frequency.exponentialRampToValueAtTime(isElectronic ? 110 : 220, time + 0.1);
        }
        
        // Volume envelope
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.3, time + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, time + (beatLen / 2.1));
    }

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isElectronic ? 800 : 400, 0);
    filter.frequency.exponentialRampToValueAtTime(isElectronic ? 2500 : 1200, duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(offlineCtx.destination);

    osc.start();
    osc.stop(duration);

    const renderedBuffer = await offlineCtx.startRendering();
    
    // Convert Buffer to Wav Blob
    return bufferToWave(renderedBuffer, sampleRate * duration);
};

// Helper: AudioBuffer to WAV Base64
function bufferToWave(abuffer: AudioBuffer, len: number) {
    let numOfChan = abuffer.numberOfChannels,
        length = len * numOfChan * 2 + 44,
        buffer = new ArrayBuffer(length),
        view = new DataView(buffer),
        channels = [], i, sample,
        offset = 0,
        pos = 0;

    setUint32(0x46464952);                         // "RIFF"
    setUint32(length - 8);                         // file length - 8
    setUint32(0x45564157);                         // "WAVE"

    setUint32(0x20746d66);                         // "fmt " chunk
    setUint32(16);                                 // length = 16
    setUint16(1);                                  // PCM (uncompressed)
    setUint16(numOfChan);
    setUint32(abuffer.sampleRate);
    setUint32(abuffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
    setUint16(numOfChan * 2);                      // block-align
    setUint16(16);                                 // 16-bit (hardcoded)

    setUint32(0x61746164);                         // "data" - chunk
    setUint32(length - pos - 4);                   // chunk length

    for(i = 0; i < abuffer.numberOfChannels; i++)
        channels.push(abuffer.getChannelData(i));

    while(pos < length) {
        for(i = 0; i < numOfChan; i++) {             // interleave channels
            sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp
            sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767)|0; // scale to 16-bit signed int
            view.setInt16(pos, sample, true);          // write 16-bit sample
            pos += 2;
        }
        offset++;                                     // next sample index
    }

    function setUint16(data: number) {
        view.setUint16(pos, data, true);
        pos += 2;
    }

    function setUint32(data: number) {
        view.setUint32(pos, data, true);
        pos += 4;
    }

    const blob = new Blob([buffer], {type: "audio/wav"});
    return URL.createObjectURL(blob);
}
