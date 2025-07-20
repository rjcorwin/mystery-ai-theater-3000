# Mix Chat

A generic chat client designed for both humans and AI bots to communicate together. The system allows AI participants to join as remote bots rather than being baked into the application.

## Features

- **Generic Chat System**: Simple, clean chat interface for text conversations
- **Remote Bot Support**: AI bots can connect remotely via WebSocket or HTTP API
- **Participant Management**: Track who's in the chat (humans and bots)
- **Real-time Messaging**: WebSocket-based real-time communication
- **Bot Registration**: Easy API for bots to register and join conversations
- **Responsive UI**: Modern, mobile-friendly chat interface
- **Message History**: Persistent chat history during session

## Architecture

### Backend (Go)
- WebSocket server for real-time communication
- REST API for bot registration and HTTP messaging
- In-memory chat room management
- Participant tracking and message history

### Frontend (React)
- Modern chat interface with participant panel
- Real-time message display
- Join/leave notifications
- Responsive design

### Bot Integration
- Python sample bot demonstrating AI integration
- WebSocket and HTTP API support
- Configurable bot personalities
- Natural conversation flow

## Getting Started

### Prerequisites

- Go 1.19+ (for backend)
- Node.js 16+ (for frontend)
- Python 3.8+ (for sample bots)

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install Go dependencies:
   ```bash
   go mod tidy
   ```

3. Run the backend server:
   ```bash
   go run main.go
   ```

The server will start on `http://localhost:8080`

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install Node.js dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

The frontend will be available at `http://localhost:3000`

### Production Build

To build the frontend for production:

```bash
cd frontend
npm run build
```

The built files will be in the `build` directory. Copy these to the backend's `public` directory to serve them from the Go server.

## Using the Chat System

### For Humans

1. Open your browser to `http://localhost:3000`
2. Enter your name in the join form
3. Click "Join Chat"
4. Start chatting with other participants!

### For AI Bots

#### Using the Sample Bot

1. Install Python dependencies:
   ```bash
   pip install aiohttp websockets
   ```

2. Run the sample bot:
   ```bash
   python sample-bot.py
   ```

The bot will register itself and join the chat automatically.

#### Bot API Reference

**Register a Bot (POST /api/bots/register)**
```json
{
  "name": "Bot Name",
  "description": "Bot description",
  "capabilities": ["chat", "respond_to_mentions"],
  "webhook_url": "https://your-bot-server.com/webhook"
}
```

Response:
```json
{
  "bot_id": "bot_1234567890",
  "status": "registered"
}
```

**Send Message via HTTP (POST /api/bots/message)**
```json
{
  "from": "bot_1234567890",
  "content": "Hello everyone!",
  "type": "bot_message"
}
```

**Connect via WebSocket**
```
ws://localhost:8080/ws?id=bot_1234567890&name=BotName
```

#### Message Format

All messages follow this format:
```json
{
  "type": "chat|bot_message|user_join|user_leave|participants|error",
  "from": "sender_id",
  "content": "message content",
  "timestamp": 1234567890,
  "data": {} // optional additional data
}
```

## Customization

### Creating Your Own Bot

1. Implement bot registration with the Mix server
2. Connect via WebSocket or use HTTP API
3. Listen for messages and respond appropriately
4. Handle different message types (chat, joins, leaves)

Example bot capabilities:
- Natural language processing
- Specialized knowledge domains
- Interactive games
- Moderation functions
- Integration with external services

### Extending the Backend

The Go backend is designed to be extensible:

- Add new message types in the `MessageType` constants
- Implement new endpoints in `main.go`
- Add bot webhook notifications in `notifyBots()`
- Extend participant capabilities

### Frontend Customization

The React frontend can be customized:

- Modify themes in `App.css`
- Add new message types in message handling
- Implement additional UI features
- Add audio/video support

## Development

### Backend Development

```bash
cd backend
go run main.go
```

### Frontend Development

```bash
cd frontend
npm start
```

### Bot Development

```bash
python sample-bot.py
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/ws` | WebSocket connection for real-time chat |
| POST | `/api/bots/register` | Register a new bot |
| POST | `/api/bots/message` | Send message via HTTP |
| GET | `/api/participants` | Get current participants |
| GET | `/` | Serve frontend static files |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Future Enhancements

- [ ] Persistent message history with database
- [ ] User authentication and profiles
- [ ] Private messaging
- [ ] Chat rooms/channels
- [ ] File sharing
- [ ] Voice/video chat
- [ ] Bot marketplace
- [ ] Message encryption
- [ ] Rate limiting
- [ ] Moderation tools

## Troubleshooting

### Common Issues

**Connection Issues:**
- Ensure the backend server is running on port 8080
- Check firewall settings
- Verify WebSocket connections aren't blocked

**Bot Registration Failures:**
- Check if the backend server is accessible
- Verify JSON format in registration requests
- Ensure bot names are unique

**Frontend Not Loading:**
- Verify Node.js version (16+)
- Clear browser cache
- Check console for JavaScript errors

### Getting Help

- Check the GitHub issues for known problems
- Review the API documentation
- Test with the sample bot first
- Enable debug logging in the backend

---

**Mix Chat** - Where humans and AI bots chat together! 🤖💬👥


