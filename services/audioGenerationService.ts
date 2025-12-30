
import { generateProceduralAudio } from './webAudioSynth';

/**
 * Free Audio Generation Pipeline
 * Attempts public AI inference, falls back to Procedural Synthesis
 */
export const generateStudioAudio = async (prompt: string, options: { genre: string, bpm: number }): Promise<string> => {
    try {
        // Attempting Public MusicGen Bridge (Gradio)
        // This targets a common community-hosted MusicGen space
        const response = await fetch('https://facebook-musicgen.hf.space/run/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                data: [
                    prompt,            // Text prompt
                    null,              // Input audio (melody)
                    "facebook/musicgen-small", // Model
                    10,                // Duration
                    250,               // Top-k
                    0,                 // Top-p
                    1,                 // Temperature
                    3                  // Classifier-free guidance
                ]
            })
        });

        if (response.ok) {
            const result = await response.json();
            if (result.data && result.data[0] && result.data[0].name) {
                // Return URL to the generated file on the HF CDN
                return `https://facebook-musicgen.hf.space/file=${result.data[0].name}`;
            }
        }
    } catch (e) {
        console.warn("AI Inference Bridge failed, falling back to Procedural Synthesis.", e);
    }

    // ULTIMATE FALLBACK: Procedural Web Audio Generation
    // This works offline and requires no keys or credits.
    return await generateProceduralAudio(options.genre, options.bpm);
};
