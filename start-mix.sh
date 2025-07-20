#!/bin/bash
# Mix Chat Startup Script

echo "🚀 Starting Mix Chat System"
echo "=========================="

# Check if required tools are installed
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo "❌ $1 is not installed. Please install it first."
        exit 1
    fi
}

echo "📋 Checking prerequisites..."
check_command go
check_command node
check_command npm

echo "✅ All prerequisites found"

# Function to start backend
start_backend() {
    echo "🔧 Starting backend server..."
    cd backend
    go mod tidy
    go run main.go &
    BACKEND_PID=$!
    cd ..
    echo "✅ Backend server started (PID: $BACKEND_PID)"
}

# Function to start frontend
start_frontend() {
    echo "🎨 Starting frontend development server..."
    cd frontend
    npm install
    npm start &
    FRONTEND_PID=$!
    cd ..
    echo "✅ Frontend server started (PID: $FRONTEND_PID)"
}

# Function to start sample bot
start_bot() {
    echo "🤖 Starting sample bot..."
    if command -v python3 &> /dev/null; then
        python3 sample-bot.py &
        BOT_PID=$!
        echo "✅ Sample bot started (PID: $BOT_PID)"
    else
        echo "⚠️  Python3 not found. Install Python and run 'python sample-bot.py' manually to test bots."
    fi
}

# Cleanup function
cleanup() {
    echo ""
    echo "🛑 Shutting down Mix Chat..."
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
        echo "✅ Backend server stopped"
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
        echo "✅ Frontend server stopped"
    fi
    if [ ! -z "$BOT_PID" ]; then
        kill $BOT_PID 2>/dev/null
        echo "✅ Sample bot stopped"
    fi
    echo "👋 Mix Chat shutdown complete"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start services
start_backend
sleep 2  # Give backend time to start
start_frontend
sleep 3  # Give frontend time to start

echo ""
echo "🎉 Mix Chat is starting up!"
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:8080"
echo ""
echo "📖 Usage:"
echo "  1. Open http://localhost:3000 in your browser"
echo "  2. Enter your name and join the chat"
echo "  3. Start chatting!"
echo ""
echo "🤖 Want to test with bots?"
echo "  Run this in another terminal:"
echo "  python sample-bot.py"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Ask if user wants to start a sample bot
read -p "🤖 Start a sample bot now? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    start_bot
    echo ""
    echo "🎊 Mix Chat with sample bot is ready!"
else
    echo "🔧 Mix Chat is ready without bots!"
fi

echo ""
echo "🔄 Services running. Press Ctrl+C to stop all services."

# Wait for user to stop services
while true; do
    sleep 1
done