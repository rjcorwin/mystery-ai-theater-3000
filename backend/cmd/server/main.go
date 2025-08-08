package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"

	"github.com/joho/godotenv"
	"github.com/rjcorwin/mystery-ai-theater-3000/backend/internal/ai"
	svr "github.com/rjcorwin/mystery-ai-theater-3000/backend/internal/server"
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

	log.Printf("Server listening on :%s\n", port)
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatal(err)
	}
}
