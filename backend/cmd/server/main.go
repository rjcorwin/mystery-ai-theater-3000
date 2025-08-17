package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"path/filepath"

	"github.com/joho/godotenv"
	"github.com/rjcorwin/mystery-ai-theater-3000/backend/internal/ai"
	svr "github.com/rjcorwin/mystery-ai-theater-3000/backend/internal/server"
	"github.com/rjcorwin/mystery-ai-theater-3000/backend/internal/tts"
)

func main() {
	// Load .env if present
	_ = godotenv.Load()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	var aiClient ai.Client
	apiKey := os.Getenv("OPENAI_API_KEY")
	model := os.Getenv("OPENAI_MODEL")
	if apiKey == "" {
		log.Println("OPENAI_API_KEY not set: running in STUB mode with fake commentary")
		aiClient = ai.NewStubClient()
	} else {
		aiClient = ai.NewOpenAIClient(apiKey, model)
	}

	mux := http.NewServeMux()

	// Websocket endpoint
	handler := svr.NewHandler(aiClient)
	mux.HandleFunc("/ws", handler.WebsocketHandler)

	// Static frontend
	// Serve files from frontend directory at root path
	// Resolve frontend directory whether running from repo root or backend dir
	candidates := []string{"../frontend", "frontend"}
	var frontendDir string
	for _, c := range candidates {
		if info, err := os.Stat(c); err == nil && info.IsDir() {
			frontendDir = c
			break
		}
	}
	if frontendDir == "" {
		// fallback to absolute path from executable working dir
		cwd, _ := os.Getwd()
		p := filepath.Join(cwd, "../frontend")
		if info, err := os.Stat(p); err == nil && info.IsDir() {
			frontendDir = p
		}
	}
	if frontendDir == "" {
		log.Println("Warning: frontend directory not found; only /ws will work")
		frontendDir = "." // serve empty
	}
	fs := http.FileServer(http.Dir(frontendDir))
	mux.Handle("/", fs)

	// Optional ElevenLabs TTS endpoints
	elevenKey := os.Getenv("ELEVENLABS_API_KEY")
	elevenModel := os.Getenv("ELEVENLABS_MODEL")
	if elevenKey != "" {
		// Defer importing encoding/json until required path compiles
		mux.HandleFunc("/api/tts/voices", func(w http.ResponseWriter, r *http.Request) {
			ctx := r.Context()
			client := tts.NewElevenLabsClient(elevenKey, elevenModel)
			voices, err := client.ListVoices(ctx)
			if err != nil {
				http.Error(w, err.Error(), http.StatusBadGateway)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(voices)
		})
		mux.HandleFunc("/api/tts/speak", func(w http.ResponseWriter, r *http.Request) {
			if r.Method != http.MethodPost {
				http.Error(w, "method", http.StatusMethodNotAllowed)
				return
			}
			type reqBody struct {
				VoiceID string `json:"voiceId"`
				Text    string `json:"text"`
			}
			var body reqBody
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				http.Error(w, "bad json", http.StatusBadRequest)
				return
			}
			client := tts.NewElevenLabsClient(elevenKey, elevenModel)
			data, err := client.Synthesize(r.Context(), body.VoiceID, body.Text)
			if err != nil {
				http.Error(w, err.Error(), http.StatusBadGateway)
				return
			}
			w.Header().Set("Content-Type", "audio/mpeg")
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write(data)
		})
		log.Println("ElevenLabs TTS enabled")
	} else {
		log.Println("ELEVENLABS_API_KEY not set: ElevenLabs TTS disabled")
	}

	log.Printf("Server listening on :%s\n", port)
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatal(err)
	}
}
