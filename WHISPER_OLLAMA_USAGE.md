# Whisper and Ollama Usage in sk-cinema

## Table of Contents
1. [Introduction](#introduction)
2. [What is Whisper?](#what-is-whisper)
3. [What is Ollama?](#what-is-ollama)
4. [How Whisper is Used in sk-cinema](#how-whisper-is-used-in-sk-cinema)
    - [Integration Points](#whisper-integration-points)
    - [Workflow](#whisper-workflow)
    - [Code References](#whisper-code-references)
5. [How Ollama is Used in sk-cinema](#how-ollama-is-used-in-sk-cinema)
    - [Integration Points](#ollama-integration-points)
    - [Workflow](#ollama-workflow)
    - [Code References](#ollama-code-references)
6. [Combined Usage: AI Video Metadata and Suggestions](#combined-usage)
7. [Extending or Modifying the Integration](#extending-or-modifying)
8. [Summary](#summary)

---

## 1. Introduction
This document explains how the Whisper and Ollama AI models are integrated and used within the sk-cinema project, including their roles, workflows, and code locations.

---

## 2. What is Whisper?
**Whisper** is an automatic speech recognition (ASR) system developed by OpenAI. It transcribes spoken audio into text, supporting multiple languages and robust to various audio qualities.

---

## 3. What is Ollama?
**Ollama** is a framework for running large language models (LLMs) locally or in the cloud. It enables natural language processing tasks such as summarization, question answering, and content generation.

---

## 4. How Whisper is Used in sk-cinema
### Whisper Integration Points
- **Purpose**: Transcribe audio from uploaded videos to generate subtitles, searchable transcripts, and enable AI-powered metadata extraction.
- **Likely Usage Locations**:
    - Backend services: `src/services/ffmpeg.service.ts`, `src/services/video-processing.service.ts`, `src/utils/extract-audio.ts`
    - AI module: `src/modules/ai/`

### Whisper Workflow
1. **Audio Extraction**: When a video is uploaded, its audio track is extracted (using FFmpeg).
2. **Transcription**: The extracted audio is sent to the Whisper model (either via API or local inference).
3. **Result Handling**: The transcribed text is saved as subtitles, transcript, or used for further AI processing.

### Whisper Code References
- `extract-audio.ts`: Extracts audio from video files for transcription.
- `video-processing.service.ts`: Orchestrates the pipeline, calling Whisper for transcription.
- `ai/` module: May use Whisper output for metadata extraction or AI suggestions.

---

## 5. How Ollama is Used in sk-cinema
### Ollama Integration Points
- **Purpose**: Analyze transcribed text, generate metadata, suggest tags, summarize content, or provide AI-powered recommendations.
- **Likely Usage Locations**:
    - Backend AI module: `src/modules/ai/`
    - Services: `src/services/video-processing.service.ts`, `src/services/ffmpeg.service.ts`

### Ollama Workflow
1. **Input**: Receives transcribed text from Whisper or other video metadata.
2. **Processing**: Uses LLMs (via Ollama) to analyze, summarize, or generate suggestions.
3. **Output**: Stores AI-generated metadata, tags, or suggestions in the database for use in the frontend.

### Ollama Code References
- `ai/` module: Handles LLM interactions and stores results.
- `video-processing.service.ts`: Coordinates the flow between transcription and LLM analysis.

---

## 6. Combined Usage: AI Video Metadata and Suggestions
- **Pipeline**: Video upload → Audio extraction → Whisper transcription → Ollama LLM analysis → Store metadata/suggestions.
- **Benefits**: Enables advanced search, recommendations, and accessibility features.

---

## 7. Extending or Modifying the Integration
- **To change the model**: Update the service or module that calls Whisper or Ollama.
- **To add new AI features**: Extend the `ai/` module and update the video processing pipeline.
- **To run locally**: Ensure Whisper and Ollama are installed and accessible to the backend (update environment/config as needed).

---

## 8. Summary
Whisper and Ollama are used together in sk-cinema to automate video transcription and AI-powered metadata generation. Whisper handles speech-to-text, while Ollama provides advanced language understanding and content generation, making the platform smarter and more user-friendly.

For exact code, see the referenced files and modules in the backend `src/` directory.