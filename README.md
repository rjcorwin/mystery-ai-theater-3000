Mystery AI Theater 3000
=======================

A local prototype of a web app inspired by MST3K for video games. The browser shares a game window; two "Esteemed Viewers" (AI robots) provide sarcastic commentary with animated sprites and text-to-speech.

Quick start
-----------

1) Backend setup
- Install Go 1.22+
- Copy `backend/ENV.example` to `backend/.env` (or export env vars) and set `OPENAI_API_KEY`
- Install deps and run server:

```
cd backend && go mod tidy && go run ./cmd/server
```

2) Frontend
- Open `frontend/index.html` in your browser (served by backend on `http://localhost:8080/`).

3) Use
- Click "Share Game Window" and pick your game window.
- You will see two robots at the bottom; when they speak, they jiggle. Commentary text appears in the log; browser TTS reads lines.
 - Controls: "Stop Share" ends screensharing; "Mute/Unmute" toggles TTS; changing "Interval (ms)" updates capture cadence live.

Development notes
-----------------
- Backend: Go, serves static assets and a WebSocket at `/ws`.
- Frontend: Vanilla HTML + React via CDN, no build step.
- Commentary: Sends periodic screenshots to backend; backend calls OpenAI for structured MST3K-style replies tagged `<viewer-1>` / `<viewer-2>`.

Environment
-----------
- `OPENAI_API_KEY`: your OpenAI key
- Optional: `PORT` (default `8080`)

Security & Privacy
------------------
- Screenshots are generated client-side and sent to the backend you run locally.
- Do not expose this dev server to the internet without hardening.

License
-------
MIT