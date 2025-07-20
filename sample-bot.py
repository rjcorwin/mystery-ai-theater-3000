#!/usr/bin/env python3
"""
Sample Bot for Mix Chat System

This demonstrates how AI bots can connect to the Mix chat system as remote participants.
The bot registers itself and then listens for messages to respond to.
"""

import asyncio
import json
import random
import time
from datetime import datetime
import aiohttp
import websockets
from typing import Dict, List, Optional

class MixChatBot:
    def __init__(self, name: str, description: str, server_url: str = "http://localhost:8080"):
        self.name = name
        self.description = description
        self.server_url = server_url
        self.bot_id: Optional[str] = None
        self.websocket: Optional[websockets.WebSocketServerProtocol] = None
        self.capabilities = ["chat", "respond_to_mentions"]
        self.running = False
        
        # Sample responses for demonstration
        self.responses = [
            "That's an interesting point! 🤔",
            "I see what you mean. Let me think about that...",
            "Great question! In my experience...",
            "That reminds me of something I learned recently.",
            "I have a different perspective on that topic.",
            "Could you elaborate on that? I'd love to learn more.",
            "That's a fascinating way to look at it!",
            "I completely agree with that sentiment.",
            "Let me offer a counterpoint to consider...",
            "That's exactly what I was thinking!"
        ]
        
        self.greetings = [
            f"Hello everyone! I'm {self.name}, an AI bot ready to chat! 🤖",
            f"Greetings humans! {self.name} here, excited to join the conversation!",
            f"Hey there! {self.name} reporting for duty. What are we talking about?",
            f"Good to be here! I'm {self.name}, your friendly neighborhood AI bot.",
        ]

    async def register(self) -> bool:
        """Register the bot with the Mix chat server"""
        try:
            registration_data = {
                "name": self.name,
                "description": self.description,
                "capabilities": self.capabilities,
                "webhook_url": ""  # We'll use WebSocket instead
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.server_url}/api/bots/register",
                    json=registration_data
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        self.bot_id = data["bot_id"]
                        print(f"✅ Bot registered successfully with ID: {self.bot_id}")
                        return True
                    else:
                        print(f"❌ Registration failed: {response.status}")
                        return False
        except Exception as e:
            print(f"❌ Registration error: {e}")
            return False

    async def connect_websocket(self) -> bool:
        """Connect to the chat via WebSocket"""
        try:
            ws_url = f"ws://localhost:8080/ws?id={self.bot_id}&name={self.name}"
            self.websocket = await websockets.connect(ws_url)
            print(f"✅ WebSocket connected for bot: {self.name}")
            return True
        except Exception as e:
            print(f"❌ WebSocket connection error: {e}")
            return False

    async def send_message(self, content: str, message_type: str = "chat") -> bool:
        """Send a message to the chat"""
        if not self.websocket:
            return False
            
        try:
            message = {
                "type": message_type,
                "content": content,
                "timestamp": int(time.time())
            }
            
            await self.websocket.send(json.dumps(message))
            print(f"📤 Sent: {content}")
            return True
        except Exception as e:
            print(f"❌ Send message error: {e}")
            return False

    async def send_bot_message_http(self, content: str) -> bool:
        """Send a message via HTTP API (alternative to WebSocket)"""
        try:
            message_data = {
                "from": self.bot_id,
                "content": content,
                "type": "bot_message"
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.server_url}/api/bots/message",
                    json=message_data
                ) as response:
                    if response.status == 200:
                        print(f"📤 HTTP message sent: {content}")
                        return True
                    else:
                        print(f"❌ HTTP message failed: {response.status}")
                        return False
        except Exception as e:
            print(f"❌ HTTP message error: {e}")
            return False

    def should_respond_to_message(self, message: Dict) -> bool:
        """Determine if the bot should respond to a message"""
        # Don't respond to own messages
        if message.get("from") == self.bot_id:
            return False
            
        # Don't respond to system messages
        if message.get("from") == "system":
            return False
        
        # Respond to mentions
        if self.name.lower() in message.get("content", "").lower():
            return True
            
        # Respond to direct questions (messages ending with ?)
        if message.get("content", "").strip().endswith("?"):
            return True
            
        # Random chance to respond to keep conversation flowing
        return random.random() < 0.3

    def generate_response(self, message: Dict) -> str:
        """Generate a response to a message"""
        content = message.get("content", "")
        
        # Handle greetings
        if any(word in content.lower() for word in ["hello", "hi", "hey", "greetings"]):
            return random.choice([
                "Hello there! 👋",
                "Hey! Great to see you!",
                "Hi! How's everyone doing?",
                "Greetings! What's the topic of discussion?"
            ])
        
        # Handle questions
        if content.strip().endswith("?"):
            return random.choice([
                "That's a great question! Let me think...",
                "Interesting question! From my perspective...",
                "Good question! I think...",
                "That's something I've been pondering too.",
            ]) + " " + random.choice(self.responses)
        
        # Handle mentions
        if self.name.lower() in content.lower():
            return random.choice([
                f"Thanks for mentioning me! {random.choice(self.responses)}",
                f"You called? {random.choice(self.responses)}",
                f"I'm here! {random.choice(self.responses)}",
            ])
        
        # General response
        return random.choice(self.responses)

    async def handle_message(self, message: Dict):
        """Handle an incoming message"""
        try:
            message_type = message.get("type")
            
            if message_type in ["chat", "bot_message"]:
                if self.should_respond_to_message(message):
                    # Wait a bit to seem more natural
                    await asyncio.sleep(random.uniform(1.0, 3.0))
                    
                    response = self.generate_response(message)
                    await self.send_message(response)
                    
            elif message_type == "user_join":
                # Welcome new users
                if random.random() < 0.7:  # 70% chance to welcome
                    await asyncio.sleep(random.uniform(0.5, 2.0))
                    welcome_msg = random.choice([
                        "Welcome to the chat! 🎉",
                        "Hey there! Welcome aboard!",
                        "Great to have you here!",
                        "Welcome! Feel free to jump into the conversation!"
                    ])
                    await self.send_message(welcome_msg)
                    
        except Exception as e:
            print(f"❌ Error handling message: {e}")

    async def listen_for_messages(self):
        """Listen for incoming messages via WebSocket"""
        try:
            async for message in self.websocket:
                data = json.loads(message)
                print(f"📥 Received: {data.get('type')} - {data.get('content', '')[:50]}...")
                await self.handle_message(data)
        except websockets.exceptions.ConnectionClosed:
            print("🔌 WebSocket connection closed")
        except Exception as e:
            print(f"❌ Listen error: {e}")

    async def start(self):
        """Start the bot"""
        print(f"🚀 Starting bot: {self.name}")
        
        # Register with the server
        if not await self.register():
            print("❌ Failed to register bot")
            return
            
        # Connect via WebSocket
        if not await self.connect_websocket():
            print("❌ Failed to connect WebSocket")
            return
            
        # Send initial greeting
        await asyncio.sleep(1)
        greeting = random.choice(self.greetings)
        await self.send_message(greeting)
        
        # Start listening for messages
        self.running = True
        print(f"✅ Bot {self.name} is now active!")
        
        try:
            await self.listen_for_messages()
        except KeyboardInterrupt:
            print(f"\n🛑 Bot {self.name} shutting down...")
        finally:
            self.running = False
            if self.websocket:
                await self.websocket.close()

async def main():
    """Main function to run the bot"""
    # Create different bot personalities
    bots = [
        MixChatBot("Einstein", "A curious AI that loves discussing science and philosophy"),
        MixChatBot("Socrates", "An AI that asks thoughtful questions and challenges ideas"),
        MixChatBot("Maya", "A friendly AI that loves helping people and sharing knowledge"),
    ]
    
    # You can run multiple bots or just one
    selected_bot = bots[0]  # Change index to select different bot
    
    try:
        await selected_bot.start()
    except KeyboardInterrupt:
        print("\n👋 Bot shutting down gracefully...")

if __name__ == "__main__":
    print("🤖 Mix Chat Bot Client")
    print("This bot will connect to the Mix chat system and participate in conversations.")
    print("Press Ctrl+C to stop the bot.\n")
    
    # Install dependencies reminder
    print("📦 Make sure you have the required dependencies:")
    print("pip install aiohttp websockets")
    print()
    
    asyncio.run(main())