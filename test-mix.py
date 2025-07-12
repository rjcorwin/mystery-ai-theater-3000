#!/usr/bin/env python3
"""
Mix Chat System Test Script

This script tests the basic functionality of the Mix chat system:
- Backend server connectivity
- Bot registration API
- WebSocket connection
- Message sending
"""

import asyncio
import aiohttp
import websockets
import json
import time

async def test_backend_connection():
    """Test if the backend server is running"""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get("http://localhost:8080/api/participants") as response:
                if response.status == 200:
                    print("✅ Backend server is running")
                    return True
                else:
                    print(f"❌ Backend server returned status {response.status}")
                    return False
    except Exception as e:
        print(f"❌ Cannot connect to backend server: {e}")
        return False

async def test_bot_registration():
    """Test bot registration API"""
    try:
        registration_data = {
            "name": "TestBot",
            "description": "A test bot for verification",
            "capabilities": ["chat", "test"],
            "webhook_url": ""
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                "http://localhost:8080/api/bots/register",
                json=registration_data
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    bot_id = data.get("bot_id")
                    print(f"✅ Bot registration successful: {bot_id}")
                    return bot_id
                else:
                    print(f"❌ Bot registration failed: {response.status}")
                    return None
    except Exception as e:
        print(f"❌ Bot registration error: {e}")
        return None

async def test_websocket_connection(bot_id):
    """Test WebSocket connection"""
    try:
        ws_url = f"ws://localhost:8080/ws?id={bot_id}&name=TestBot"
        async with websockets.connect(ws_url) as websocket:
            print("✅ WebSocket connection successful")
            
            # Send a test message
            test_message = {
                "type": "chat",
                "content": "Hello from test bot! 🧪",
                "timestamp": int(time.time())
            }
            
            await websocket.send(json.dumps(test_message))
            print("✅ Test message sent")
            
            # Listen for a short time to see if we get responses
            try:
                message = await asyncio.wait_for(websocket.recv(), timeout=2.0)
                data = json.loads(message)
                print(f"✅ Received message: {data.get('type')} - {data.get('content', '')[:50]}...")
            except asyncio.TimeoutError:
                print("⏱️  No immediate response (this is normal)")
            
            return True
    except Exception as e:
        print(f"❌ WebSocket connection error: {e}")
        return False

async def test_http_message_api(bot_id):
    """Test HTTP message API"""
    try:
        message_data = {
            "from": bot_id,
            "content": "Test message via HTTP API! 📡",
            "type": "bot_message"
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                "http://localhost:8080/api/bots/message",
                json=message_data
            ) as response:
                if response.status == 200:
                    print("✅ HTTP message API working")
                    return True
                else:
                    print(f"❌ HTTP message API failed: {response.status}")
                    return False
    except Exception as e:
        print(f"❌ HTTP message API error: {e}")
        return False

async def main():
    print("🧪 Mix Chat System Test")
    print("========================")
    print("Testing basic functionality...\n")
    
    # Test backend connection
    if not await test_backend_connection():
        print("\n❌ Backend test failed. Make sure the server is running with 'go run main.go' in the backend directory.")
        return
    
    # Test bot registration
    bot_id = await test_bot_registration()
    if not bot_id:
        print("\n❌ Bot registration test failed.")
        return
    
    # Test WebSocket connection
    if not await test_websocket_connection(bot_id):
        print("\n❌ WebSocket test failed.")
        return
    
    # Test HTTP message API
    if not await test_http_message_api(bot_id):
        print("\n❌ HTTP message API test failed.")
        return
    
    print("\n🎉 All tests passed! Mix Chat system is working correctly.")
    print("\n📝 Next steps:")
    print("  1. Open http://localhost:3000 in your browser")
    print("  2. Join the chat with your name")
    print("  3. Run 'python sample-bot.py' to add AI bots")
    print("  4. Start chatting!")

if __name__ == "__main__":
    print("📦 Make sure you have the required dependencies:")
    print("pip install aiohttp websockets")
    print()
    
    asyncio.run(main())