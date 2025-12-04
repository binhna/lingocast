# LingoCast.ai

LingoCast is a small end-to-end product that generates short, language-learning podcast episodes from a topic and a target vocabulary list. It outputs (1) a dialogue that uses the words naturally and (2) an audio episode you can play in a mobile-first web UI.

The goal is simple: make vocabulary stick by hearing it in realistic context, not as isolated flashcards.

---

## What It Does

- **Dialogue generation**
  - Input: a topic prompt (e.g., “a mystery in a futuristic coffee shop”)
  - Input: a list of target words
  - Output: a short dialogue where the target words appear naturally in context

- **Audio synthesis**
  - Converts the script into audio using a local TTS pipeline
  - Supports voice customization when reference samples are provided (where applicable)

- **Episode storage + delivery**
  - Stores metadata and audio artifacts in **Supabase** (Postgres + Storage)
  - Serves episodes through a lightweight web player

- **Learning-friendly playback**
  - speed control
  - looping
  - playlist/autoplay behavior

---

## Why I Built This

When I learn vocabulary, repetition in context helps me retain words far better than drilling lists. I wanted a tool where I could tightly steer the content (topic + required vocabulary) and keep the generation pipeline cost-aware—able to run locally when possible, with a cloud fallback when needed.

This project is also a practical exercise in building a complete system: UI → workflow orchestration → backend worker → storage → playback.

---

## Architecture (High Level)

**Frontend (React + TypeScript)**  
Collects the topic + vocabulary, starts a generation request, and updates the UI when the episode is ready.

**Workflow orchestration (n8n)**  
Receives the generation request and coordinates steps like branching, retries, and prompt variants without requiring frequent redeploys.

**Backend worker (Python/Flask)**  
Performs the “heavy” work:
- script generation (local model or cloud fallback)
- TTS synthesis
- uploading artifacts + metadata to Supabase

**Supabase (Postgres + Storage)**  
Acts as the system of record for episode status/metadata and stores final audio files.

---

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS
- **Workflow:** n8n (webhooks + workflow wiring)
- **Worker:** Python + Flask
- **Data/Storage:** Supabase (Postgres + Storage buckets)

---

## Getting Started (Dev)

### Prerequisites
- Node.js (frontend)
- Python environment (worker)
- Supabase project (DB + Storage)
- n8n instance (local or hosted)

### Frontend
```bash
npm install
npm run dev
```

### Environment variables
Create a `.env` file:
```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_N8N_WEBHOOK_URL=...
VITE_SETTINGS_PASSCODE=...
```
---

## Author

**An-Binh (Ben) Nguyen**  
Email: morningben96@gmail.com

Built end-to-end as a portfolio project with a product mindset: a simple learning experience on the frontend, a workflow layer for iteration, a Python worker for generation, and a storage-backed delivery flow designed to behave reliably like an internal tool.