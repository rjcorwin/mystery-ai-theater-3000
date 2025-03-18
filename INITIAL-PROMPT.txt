I'd like the write an app. A fantastic app. Full of wonder. And awe. And wonder. Remember the show Mystery Science Theater 3000? I want to recreate that experience, but in a webapp, and instead of a movie, I share via my web browser a window of a video game I'm playing (poorly). We'll keep the two little robots in the front row, but instead of the robots being voiced by real life humans, it's voiced by AI! The robots will watch the game and make sarcastic comments. It's gonna be great. The little robots will watch, listen, and comment away while the user plays their game. The little robots will be henceforth referred to as... Esteemed Viewers.

Please write all the code for the frontend and the backend. Lastly provide me directions on how to get it running on my local computer so I can kick the tires.


# Mystery Game Theater 3000 - Webapp Spec

## Overview
This app aims to recreate the experience of *Mystery Science Theater 3000* but for video games. Instead of watching movies, users will stream their gameplay, and AI-powered robots—dubbed *Esteemed Viewers*—will provide sarcastic and humorous commentary. The Esteemed Viewers will analyze the game and generate real-time commentary, creating an entertaining, interactive experience.

---

## Technologies
- **Backend:** Go
- **Frontend:** React
- **AI Processing:** OpenAI API or a custom model
- **Streaming & Capture:** Browser-based screensharing APIs

---

## Frontend
The web app will serve as the viewing platform for the Esteemed Viewers. The user plays their game in another application, and the web app captures the gameplay window and processes it for AI commentary.

### Features:
1. **Game Capture & Screensharing**
   - Prompt the user to select a window to share (preferably their video game).
   - Capture the shared window at regular intervals (e.g., every few seconds).
   
2. **AI Commentary Integration**
   - Send periodic screenshots of the captured window to the backend.
   - Receive AI-generated text and audio commentary in response.
   - Commentary is marked by XML tags <viewer-1> and <viewer-2> to differentiate speakers.

3. **Esteemed Viewers Animation**
   - Display two robot sprites seated in the front row.
   - When *Esteemed Viewer 1* or *Esteemed Viewer 2* speaks, their respective sprite will jiggle up and down to simulate talking.
   - Sync speech audio with the sprite animation.

---

## Backend
The backend handles processing screenshots, analyzing gameplay, generating commentary, and sending responses back to the frontend.

### Features:
1. **Screenshot Relay & Analysis**
   - Receive periodic screenshots from the frontend.
   - Process the image using AI vision models to determine gameplay context.
   
2. **AI-Generated Commentary**
   - Use an AI model to analyze the game state and generate witty, sarcastic, or insightful comments.
   - Return responses in both text and synthesized speech.
   - Tag responses appropriately (<viewer-1> or <viewer-2>).

3. **Audio Processing**
   - Convert AI-generated text responses into speech audio.
   - Send audio back to the frontend for playback.

4. **WebSocket Streaming**
   - Maintain low-latency communication between frontend and backend.
   - Enable real-time AI responses for an immersive experience.

---

## Additional Considerations
- **Customization Options**: Users can tweak the humor style of the Esteemed Viewers (e.g., snarky, wholesome, chaotic).
- **Multiplayer Mode**: Option for multiple viewers to watch and react together.
- **Performance Optimization**: Ensure real-time processing remains smooth even for high-action games.

This app will bring the humor and charm of *MST3K* into the gaming world, creating a new way to experience gameplay with AI-driven entertainment!
