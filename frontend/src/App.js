import React, { useState, useRef, useEffect } from 'react';
import './App.css';

function App() {
  const [ws, setWs] = useState(null);
  const [messages, setMessages] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [userName, setUserName] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(true);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const connectToChat = () => {
    if (!userName.trim()) return;
    
    const userId = `user_${Date.now()}`;
    const socketUrl = `ws://localhost:8080/ws?id=${userId}&name=${encodeURIComponent(userName)}`;
    const socket = new WebSocket(socketUrl);
    
    socket.onopen = () => {
      console.log("Connected to Mix chat");
      setIsConnected(true);
      setShowJoinForm(false);
    };
    
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      switch (message.type) {
        case 'chat':
        case 'bot_message':
        case 'user_join':
        case 'user_leave':
          setMessages(prev => [...prev, message]);
          break;
        case 'participants':
          setParticipants(message.data);
          break;
        default:
          console.log('Unknown message type:', message.type);
      }
    };
    
    socket.onclose = () => {
      console.log("Disconnected from Mix chat");
      setIsConnected(false);
      setShowJoinForm(true);
    };
    
    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
      setIsConnected(false);
    };
    
    setWs(socket);
  };

  const sendMessage = () => {
    if (!currentMessage.trim() || !ws) return;
    
    const message = {
      type: 'chat',
      content: currentMessage,
    };
    
    ws.send(JSON.stringify(message));
    setCurrentMessage('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleTimeString();
  };

  const getParticipantName = (fromId) => {
    const participant = participants.find(p => p.id === fromId);
    return participant ? participant.name : fromId;
  };

  const getParticipantType = (fromId) => {
    const participant = participants.find(p => p.id === fromId);
    return participant ? participant.type : 'unknown';
  };

  if (showJoinForm) {
    return (
      <div className="App">
        <div className="join-form">
          <h1>Mix Chat</h1>
          <p>A generic chat client for humans and AI bots</p>
          <div className="form-group">
            <label htmlFor="userName">Your Name:</label>
            <input
              id="userName"
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Enter your name"
              onKeyPress={(e) => e.key === 'Enter' && connectToChat()}
            />
          </div>
          <button onClick={connectToChat} disabled={!userName.trim()}>
            Join Chat
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <div className="chat-container">
        <div className="chat-header">
          <h1>Mix Chat</h1>
          <div className="connection-status">
            {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
          </div>
        </div>
        
        <div className="chat-main">
          <div className="participants-panel">
            <h3>Participants ({participants.length})</h3>
            <div className="participants-list">
              {participants.map(participant => (
                <div key={participant.id} className={`participant ${participant.type}`}>
                  <span className="participant-icon">
                    {participant.type === 'bot' ? '🤖' : '👤'}
                  </span>
                  <span className="participant-name">{participant.name}</span>
                  <span className="participant-status">
                    {participant.connected ? '●' : '○'}
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="messages-panel">
            <div className="messages-container">
              {messages.map((message, index) => (
                <div key={index} className={`message ${message.type}`}>
                  <div className="message-header">
                    <span className={`message-sender ${getParticipantType(message.from)}`}>
                      {getParticipantType(message.from) === 'bot' ? '🤖' : '👤'}
                      {getParticipantName(message.from)}
                    </span>
                    <span className="message-time">
                      {formatTimestamp(message.timestamp)}
                    </span>
                  </div>
                  <div className="message-content">
                    {message.content}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            
            <div className="message-input">
              <textarea
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message... (Enter to send)"
                disabled={!isConnected}
              />
              <button onClick={sendMessage} disabled={!currentMessage.trim() || !isConnected}>
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
