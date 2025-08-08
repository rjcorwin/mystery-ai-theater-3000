package server

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
	"github.com/rjcorwin/mystery-ai-theater-3000/backend/internal/ai"
)

type Handler struct {
	ai ai.Client
}

func NewHandler(aiClient ai.Client) *Handler {
	return &Handler{ai: aiClient}
}

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin:     func(r *http.Request) bool { return true },
}

// Incoming image payloads from the browser
type FrameMessage struct {
	Type string `json:"type"` // "frame"
	// PNG data URL or base64 payload
	ImageBase64 string `json:"imageBase64"`
}

// Outgoing commentary
type CommentaryMessage struct {
	Type string `json:"type"` // "commentary"
	XML  string `json:"xml"`
}

func (h *Handler) WebsocketHandler(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		http.Error(w, "upgrade failed", http.StatusBadRequest)
		return
	}
	defer conn.Close()

	// read loop: receive frames, send commentary
	for {
		_, data, err := conn.ReadMessage()
		if err != nil {
			log.Println("ws read error:", err)
			return
		}
		var msg FrameMessage
		if err := json.Unmarshal(data, &msg); err != nil {
			log.Println("bad json:", err)
			continue
		}
		if msg.Type != "frame" || msg.ImageBase64 == "" {
			continue
		}

		// call AI with timeout
		ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
		xml, err := h.ai.GenerateCommentary(ctx, msg.ImageBase64)
		cancel()
		if err != nil {
			log.Println("ai error:", err)
			continue
		}

		out := CommentaryMessage{Type: "commentary", XML: xml}
		payload, _ := json.Marshal(out)
		if err := conn.WriteMessage(websocket.TextMessage, payload); err != nil {
			log.Println("ws write error:", err)
			return
		}
	}
}
