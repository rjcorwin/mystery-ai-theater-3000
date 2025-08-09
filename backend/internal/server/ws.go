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
	ImageBase64  string `json:"imageBase64"`
	HistoryCount int    `json:"historyCount"`
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

	// Per-connection rolling history of XML assistant outputs
	var history []string

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

		// Clamp requested history count (0-100), slice from tail
		n := msg.HistoryCount
		if n < 0 {
			n = 0
		} else if n > 100 {
			n = 100
		}
		recent := history
		if n < len(history) {
			recent = history[len(history)-n:]
		}

		// call AI with timeout
		ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
		xml, err := h.ai.GenerateCommentary(ctx, msg.ImageBase64, recent)
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

		// append to history and cap to 200 stored
		history = append(history, xml)
		if len(history) > 200 {
			history = history[len(history)-200:]
		}
	}
}
