# Multimodal AI Intelligence Hub

The ultimate browser-based cockpit for analyzing AI assets and producing high-fidelity multimodal content. This application bridges the gap between cloud-scale intelligence (Gemini 3 Pro) and local generative workflows (ComfyUI/Ollama).

## 🚀 Core Features

### 🔍 Deep Model Analysis
- **LoRA Scanner**: Exhaustive architectural analysis of `.safetensors`, `.gguf`, and `.ckpt` files.
- **Neural Trigger Extraction**: Automatically identifies and categorizes trigger words and usage protocols.
- **External Integration**: One-click lookup for Civitai, HuggingFace, and Tensor.Art.

### 🎨 Image Studio Pro
- **Multi-Engine Support**: Switch between **Gemini 2.5/3** cloud generation and **ComfyUI** local node-based execution.
- **Model Family Optimizers**: Native support for **Pony XL**, **Illustrious XL**, and **Z-Image Turbo** with automatic prompt augmentation.
- **Mastering Suite**: High-fidelity upscaling using ESRGAN pipelines or Gemini 3 Pro cloud mastering.

### 🎵 Sound Studio Master
- **Audio Intelligence**: BPM, Key, and Genre detection via multimodal audio analysis.
- **Production Blueprints**: AI-generated arrangement guides and technical prompts for the Suno music engine.
- **Studio Vocalist**: High-quality TTS previews for lyrics using specialized performance voices.

### 💬 Intelligence Hub
- **Cognitive Chat**: Multi-turn conversation with image/file attachment support.
- **Thinking Trace**: Visualized internal reasoning chains for complex technical queries.

## 🛠 Technical Requirements

### Local Inference (Optional)
To unlock local generative power, ensure the following are running:
- **Ollama**: For local LLM analysis (Run with `OLLAMA_ORIGINS="*"`)
- **ComfyUI**: For local image generation via API.

### Cloud Inference
- **Google Gemini API**: A valid API key is required (configured automatically in the AiStudio environment).

## 📥 Installation

1. Clone the environment.
2. Ensure you have Node.js 18+ installed.
3. Access the hub via the `index.html` entry point.
