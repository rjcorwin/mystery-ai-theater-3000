package main

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"
	"fmt"
	"github.com/gorilla/websocket"
)

// Message types
type MessageType string

const (
	MessageTypeChat         MessageType = "chat"
	MessageTypeUserJoin     MessageType = "user_join"
	MessageTypeUserLeave    MessageType = "user_leave"
	MessageTypeBotRegister  MessageType = "bot_register"
	MessageTypeBotMessage   MessageType = "bot_message"
	MessageTypeParticipants MessageType = "participants"
	MessageTypeError        MessageType = "error"
)

// Participant types
type ParticipantType string

const (
	ParticipantTypeHuman ParticipantType = "human"
	ParticipantTypeBot   ParticipantType = "bot"
)

// Message represents any message in the chat system
type Message struct {
	Type      MessageType `json:"type"`
	From      string      `json:"from"`
	Content   string      `json:"content"`
	Timestamp int64       `json:"timestamp"`
	Data      interface{} `json:"data,omitempty"`
}

// Participant represents a chat participant
type Participant struct {
	ID          string          `json:"id"`
	Name        string          `json:"name"`
	Type        ParticipantType `json:"type"`
	Connected   bool            `json:"connected"`
	LastSeen    int64           `json:"last_seen"`
	Capabilities []string       `json:"capabilities,omitempty"`
}

// BotRegistration represents a bot registration request
type BotRegistration struct {
	Name         string   `json:"name"`
	Description  string   `json:"description"`
	Capabilities []string `json:"capabilities"`
	WebhookURL   string   `json:"webhook_url,omitempty"`
}

// ChatRoom manages the chat state
type ChatRoom struct {
	participants map[string]*Participant
	connections  map[string]*websocket.Conn
	botEndpoints map[string]string // bot ID -> webhook URL
	messages     []Message
	mu           sync.RWMutex
}

func NewChatRoom() *ChatRoom {
	return &ChatRoom{
		participants: make(map[string]*Participant),
		connections:  make(map[string]*websocket.Conn),
		botEndpoints: make(map[string]string),
		messages:     make([]Message, 0),
	}
}

func (cr *ChatRoom) AddParticipant(participant *Participant, conn *websocket.Conn) {
	cr.mu.Lock()
	defer cr.mu.Unlock()
	
	cr.participants[participant.ID] = participant
	if conn != nil {
		cr.connections[participant.ID] = conn
	}
	
	// Broadcast join message
	joinMsg := Message{
		Type:      MessageTypeUserJoin,
		From:      "system",
		Content:   fmt.Sprintf("%s joined the chat", participant.Name),
		Timestamp: time.Now().Unix(),
		Data:      participant,
	}
	cr.broadcastMessage(joinMsg)
}

func (cr *ChatRoom) RemoveParticipant(participantID string) {
	cr.mu.Lock()
	defer cr.mu.Unlock()
	
	if participant, exists := cr.participants[participantID]; exists {
		delete(cr.participants, participantID)
		delete(cr.connections, participantID)
		delete(cr.botEndpoints, participantID)
		
		// Broadcast leave message
		leaveMsg := Message{
			Type:      MessageTypeUserLeave,
			From:      "system",
			Content:   fmt.Sprintf("%s left the chat", participant.Name),
			Timestamp: time.Now().Unix(),
		}
		cr.broadcastMessage(leaveMsg)
	}
}

func (cr *ChatRoom) BroadcastMessage(msg Message) {
	cr.mu.Lock()
	defer cr.mu.Unlock()
	
	// Store message in history
	cr.messages = append(cr.messages, msg)
	
	// Keep only last 100 messages
	if len(cr.messages) > 100 {
		cr.messages = cr.messages[len(cr.messages)-100:]
	}
	
	cr.broadcastMessage(msg)
}

func (cr *ChatRoom) broadcastMessage(msg Message) {
	msgJSON, _ := json.Marshal(msg)
	
	// Send to all connected WebSocket clients
	for _, conn := range cr.connections {
		if err := conn.WriteMessage(websocket.TextMessage, msgJSON); err != nil {
			log.Printf("Error sending message to WebSocket client: %v", err)
		}
	}
	
	// Send to bot webhooks
	cr.notifyBots(msg)
}

func (cr *ChatRoom) notifyBots(msg Message) {
	// TODO: Implement HTTP webhook notifications to remote bots
	// For now, just log that we would notify bots
	if len(cr.botEndpoints) > 0 {
		log.Printf("Would notify %d bots about message: %s", len(cr.botEndpoints), msg.Content)
	}
}

func (cr *ChatRoom) GetParticipants() []Participant {
	cr.mu.RLock()
	defer cr.mu.RUnlock()
	
	participants := make([]Participant, 0, len(cr.participants))
	for _, p := range cr.participants {
		participants = append(participants, *p)
	}
	return participants
}

func (cr *ChatRoom) GetRecentMessages() []Message {
	cr.mu.RLock()
	defer cr.mu.RUnlock()
	
	// Return last 50 messages
	start := 0
	if len(cr.messages) > 50 {
		start = len(cr.messages) - 50
	}
	return cr.messages[start:]
}

var chatRoom = NewChatRoom()

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func main() {
	http.HandleFunc("/ws", handleWebSocket)
	http.HandleFunc("/api/bots/register", handleBotRegister)
	http.HandleFunc("/api/bots/message", handleBotMessage)
	http.HandleFunc("/api/participants", handleGetParticipants)
	
	// Serve static files from ./public
	fs := http.FileServer(http.Dir("./public"))
	http.Handle("/", fs)
	
	log.Println("Mix chat server started on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("WebSocket upgrade error:", err)
		return
	}
	defer conn.Close()
	
	// Get or create participant
	participantID := r.URL.Query().Get("id")
	participantName := r.URL.Query().Get("name")
	
	if participantID == "" {
		participantID = fmt.Sprintf("user_%d", time.Now().UnixNano())
	}
	if participantName == "" {
		participantName = "Anonymous"
	}
	
	participant := &Participant{
		ID:        participantID,
		Name:      participantName,
		Type:      ParticipantTypeHuman,
		Connected: true,
		LastSeen:  time.Now().Unix(),
	}
	
	chatRoom.AddParticipant(participant, conn)
	defer chatRoom.RemoveParticipant(participantID)
	
	// Send recent messages and participant list to new user
	recentMessages := chatRoom.GetRecentMessages()
	participants := chatRoom.GetParticipants()
	
	for _, msg := range recentMessages {
		msgJSON, _ := json.Marshal(msg)
		conn.WriteMessage(websocket.TextMessage, msgJSON)
	}
	
	participantsMsg := Message{
		Type:      MessageTypeParticipants,
		From:      "system",
		Content:   "Participant list",
		Timestamp: time.Now().Unix(),
		Data:      participants,
	}
	msgJSON, _ := json.Marshal(participantsMsg)
	conn.WriteMessage(websocket.TextMessage, msgJSON)
	
	// Handle incoming messages
	for {
		_, msgBytes, err := conn.ReadMessage()
		if err != nil {
			log.Printf("WebSocket read error: %v", err)
			break
		}
		
		var msg Message
		if err := json.Unmarshal(msgBytes, &msg); err != nil {
			log.Printf("JSON unmarshal error: %v", err)
			continue
		}
		
		msg.From = participantID
		msg.Timestamp = time.Now().Unix()
		
		chatRoom.BroadcastMessage(msg)
	}
}

func handleBotRegister(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	
	var botReg BotRegistration
	if err := json.NewDecoder(r.Body).Decode(&botReg); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}
	
	// Create bot participant
	botID := fmt.Sprintf("bot_%d", time.Now().UnixNano())
	bot := &Participant{
		ID:           botID,
		Name:         botReg.Name,
		Type:         ParticipantTypeBot,
		Connected:    true,
		LastSeen:     time.Now().Unix(),
		Capabilities: botReg.Capabilities,
	}
	
	chatRoom.AddParticipant(bot, nil)
	
	// Store webhook URL if provided
	if botReg.WebhookURL != "" {
		chatRoom.mu.Lock()
		chatRoom.botEndpoints[botID] = botReg.WebhookURL
		chatRoom.mu.Unlock()
	}
	
	response := map[string]string{
		"bot_id": botID,
		"status": "registered",
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func handleBotMessage(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	
	var msg Message
	if err := json.NewDecoder(r.Body).Decode(&msg); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}
	
	msg.Type = MessageTypeBotMessage
	msg.Timestamp = time.Now().Unix()
	
	chatRoom.BroadcastMessage(msg)
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "sent"})
}

func handleGetParticipants(w http.ResponseWriter, r *http.Request) {
	participants := chatRoom.GetParticipants()
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(participants)
}
