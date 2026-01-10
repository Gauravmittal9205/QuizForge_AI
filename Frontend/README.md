# QuizForge AI (Frontend)

## Requirements

- Node.js (LTS recommended)
- Ollama (for the local AI Tutor chatbot)

## Setup

1. Install frontend dependencies

```bash
npm install
```

2. Start the frontend

```bash
npm run dev
```

## Local AI Tutor (Ollama) Setup

The AI Tutor uses a **local Ollama server** running on:

`http://localhost:11434`

1. Install Ollama

https://ollama.ai

2. Start Ollama (if it isn't already running)

- On Windows/macOS, launching the Ollama app is usually enough.
- You can verify it's running by opening:

`http://localhost:11434/api/tags`

3. Pull at least one model

```bash
ollama pull llama2
```

Optional models supported by the dropdown:

```bash
ollama pull mistral
ollama pull gemma
```

## Using the AI Tutor

- Navigate to **Dashboard -> AI Tutor**.
- Select a model from the dropdown.
- Type a message and press:
  - `Enter` to send
  - `Shift+Enter` for a new line

### Notes

- The frontend tries Ollama's `/api/generate` endpoint first, and automatically falls back to `/api/chat` if needed.
- If you see "Connected" but messages fail with `404`, it typically means a different service is running on port `11434` or Ollama isn't reachable at that URL.

## Troubleshooting

- If AI Tutor says Ollama is not running:
  - Ensure Ollama is running and reachable at `http://localhost:11434`.
  - Ensure a model is pulled (e.g. `ollama pull llama2`).
- If messages still fail:
  - Check the browser console Network tab for the failing URL and status code.
