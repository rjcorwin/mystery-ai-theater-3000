import React, { useState, useRef, useEffect } from 'react';
import './App.css';

function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [ws, setWs] = useState(null);
  const [commentary, setCommentary] = useState("");
  const [animatingViewer1, setAnimatingViewer1] = useState(false);
  const [animatingViewer2, setAnimatingViewer2] = useState(false);

  useEffect(() => {
    // Open WebSocket connection to the backend
    const socket = new WebSocket("ws://localhost:8080/ws");
    socket.onopen = () => {
      console.log("WebSocket connection established");
    };
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setCommentary(data.text);
      // Trigger animations based on viewer tags
      if (data.text.includes("<viewer-1>")) {
        setAnimatingViewer1(true);
        setTimeout(() => setAnimatingViewer1(false), 500);
      }
      if (data.text.includes("<viewer-2>")) {
        setAnimatingViewer2(true);
        setTimeout(() => setAnimatingViewer2(false), 500);
      }
    };
    socket.onclose = () => {
      console.log("WebSocket connection closed");
    };
    setWs(socket);
  }, []);

  const startCapture = async () => {
    try {
      // Prompt user to share a screen or window
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      // Begin periodic screenshot capture every 3 seconds
      setInterval(sendScreenshot, 3000);
    } catch (err) {
      console.error("Error capturing screen: ", err);
    }
  };

  const sendScreenshot = () => {
    if (!videoRef.current || !canvasRef.current || !ws) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    // Convert canvas image to base64 PNG
    const imageData = canvas.toDataURL("image/png");
    ws.send(JSON.stringify({ imageData }));
  };

  return (
    <div className="App">
      <h1>Mystery Game Theater 3000</h1>
      <button onClick={startCapture}>Start Game Capture</button>
      <div className="video-container">
        <video
          ref={videoRef}
          autoPlay
          muted
          style={{ width: "80%", border: "1px solid black" }}
        />
      </div>
      <canvas ref={canvasRef} style={{ display: "none" }} />
      <div className="commentary">
        <h2>Esteemed Viewers Commentary:</h2>
        <p>{commentary}</p>
      </div>
      <div className="viewers">
        <div className={`viewer ${animatingViewer1 ? "talking" : ""}`}>
          <img src="/robot1.png" alt="Esteemed Viewer 1" />
        </div>
        <div className={`viewer ${animatingViewer2 ? "talking" : ""}`}>
          <img src="/robot2.png" alt="Esteemed Viewer 2" />
        </div>
      </div>
    </div>
  );
}

export default App;
