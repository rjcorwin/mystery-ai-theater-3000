package main

import (
	"encoding/json"
	"log"
	"math/rand"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
)

// Message represents the incoming JSON message (screenshot data).
type Message struct {
	ImageData string `json:"imageData"`
}

// Commentary is the response containing AI commentary.
type Commentary struct {
	Text string `json:"text"`
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		// Allow connections from any origin (for development)
		return true
	},
}

func main() {
	http.HandleFunc("/ws", handleWebSocket)

	// Serve static files (your React build and robot images) from ./public
	fs := http.FileServer(http.Dir("./public"))
	http.Handle("/", fs)

	log.Println("Server started on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
	// Upgrade initial GET request to a websocket
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("WebSocket upgrade error:", err)
		return
	}
	defer conn.Close()

	// Read messages in a loop
	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			log.Println("WebSocket read error:", err)
			break
		}

		// Decode JSON message (which contains the screenshot as base64)
		var m Message
		if err := json.Unmarshal(msg, &m); err != nil {
			log.Println("JSON unmarshal error:", err)
			continue
		}

		log.Println("Received screenshot data (length):", len(m.ImageData))
		// In a real app, here you would process the image to determine game context.

		// Simulate AI commentary generation
		commentary := generateCommentary()

		// Prepare and send the response
		resp := Commentary{Text: commentary}
		respJSON, _ := json.Marshal(resp)
		time.Sleep(1 * time.Second) // simulate processing delay
		if err := conn.WriteMessage(websocket.TextMessage, respJSON); err != nil {
			log.Println("WebSocket write error:", err)
			break
		}
	}
}

func generateCommentary() string {
	// Two sample sets of comments for our Esteemed Viewers
	commentsViewer1 := []string{
		"<viewer-1> Wow, that move was... something.",
		"<viewer-1> Really? You call that gameplay?",
		"<viewer-1> I’m not sure even a novice would try that.",
	}
	commentsViewer2 := []string{
		"<viewer-2> And there goes another brilliant decision!",
		"<viewer-2> That was almost impressive… almost.",
		"<viewer-2> You might want to try a different tactic next time.",
	}

	// Randomly choose one comment from each viewer and combine them
	rand.Seed(time.Now().UnixNano())
	c1 := commentsViewer1[rand.Intn(len(commentsViewer1))]
	c2 := commentsViewer2[rand.Intn(len(commentsViewer2))]
	return c1 + " " + c2
}
