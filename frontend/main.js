const preview = document.getElementById('preview');
const shareBtn = document.getElementById('shareBtn');
const stopBtn = document.getElementById('stopBtn');
const muteBtn = document.getElementById('muteBtn');
const intervalInput = document.getElementById('intervalInput');
const historyInput = document.getElementById('historyInput');
const captureCanvas = document.getElementById('captureCanvas');
const logEl = document.getElementById('log');
const viewer1 = document.getElementById('viewer1');
const viewer2 = document.getElementById('viewer2');

let stream = null;
let ws = null;
let captureTimer = null;
let isMuted = false;

function setButtonsState(capturing) {
  shareBtn.disabled = !!capturing;
  stopBtn.disabled = !capturing;
}

function appendLine(who, text) {
  const div = document.createElement('div');
  div.className = 'line';
  const whoEl = document.createElement('span');
  whoEl.className = 'who';
  whoEl.textContent = who + ':';
  const textEl = document.createElement('span');
  textEl.textContent = ' ' + text;
  div.appendChild(whoEl);
  div.appendChild(textEl);
  logEl.appendChild(div);
  logEl.scrollTop = logEl.scrollHeight;
}

function speak(text, which) {
  if (isMuted) return;
  if (!('speechSynthesis' in window)) return;
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 1.1;
  utter.pitch = which === 1 ? 1.2 : 0.9;
  utter.onstart = () => {
    (which === 1 ? viewer1 : viewer2).classList.add('speaking');
  };
  utter.onend = () => {
    (which === 1 ? viewer1 : viewer2).classList.remove('speaking');
  };
  speechSynthesis.speak(utter);
}

function parseXMLLines(xml) {
  // Parse in-order by scanning for matching tags
  const lines = [];
  const re = /<(viewer-1|viewer-2)>([\s\S]*?)<\/\1>/gi;
  let m;
  while ((m = re.exec(xml))) {
    const who = m[1] === 'viewer-1' ? 1 : 2;
    lines.push({ who, text: m[2].trim() });
  }
  return lines;
}

async function startShare() {
  try {
    stream = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: 30, displaySurface: 'window' },
      audio: false,
    });
    preview.srcObject = stream;
    openSocket();
    scheduleCapture();
    setButtonsState(true);
  } catch (err) {
    console.error('Share failed', err);
    alert('Failed to share window: ' + err.message);
  }
}

function scheduleCapture() {
  if (captureTimer) clearInterval(captureTimer);
  const interval = Math.max(500, Number(intervalInput.value) || 2500);
  captureTimer = setInterval(captureAndSend, interval);
}

function captureAndSend() {
  if (!stream || !ws || ws.readyState !== WebSocket.OPEN) return;
  const track = stream.getVideoTracks()[0];
  if (!track) return;
  const settings = track.getSettings();

  // Resize canvas to a manageable resolution
  const maxW = 640;
  const scale = Math.min(1, maxW / (settings.width || 1280));
  const w = Math.floor((settings.width || 1280) * scale);
  const h = Math.floor((settings.height || 720) * scale);
  captureCanvas.width = w;
  captureCanvas.height = h;

  const ctx = captureCanvas.getContext('2d');
  ctx.drawImage(preview, 0, 0, w, h);
  captureCanvas.toBlob(
    (blob) => {
      if (!blob) return;
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result.split(',')[1];
        const historyCount = Math.max(0, Math.min(100, Number(historyInput.value) || 0));
        const payload = JSON.stringify({ type: 'frame', imageBase64: base64, historyCount });
        try { ws.send(payload); } catch {}
      };
      reader.readAsDataURL(blob);
    },
    'image/png',
    0.9
  );
}

function openSocket() {
  const url = (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws';
  ws = new WebSocket(url);
  ws.onopen = () => {
    appendLine('System', 'Connected to commentary service.');
  };
  ws.onclose = () => {
    appendLine('System', 'Disconnected.');
  };
  ws.onerror = (e) => {
    console.error('ws error', e);
  };
  ws.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data);
      if (msg.type === 'commentary') {
        const lines = parseXMLLines(msg.xml);
        // speak in order 1 then 2; interleave if both present
        lines.forEach(({ who, text }) => {
          appendLine(`Viewer ${who}`, text);
          speak(text, who);
        });
      }
    } catch (err) {
      console.error('bad message', err);
    }
  };
}

shareBtn.addEventListener('click', startShare);
stopBtn.addEventListener('click', stopShare);
intervalInput.addEventListener('change', scheduleCapture);
intervalInput.addEventListener('input', scheduleCapture);
historyInput.addEventListener('change', () => {});
historyInput.addEventListener('input', () => {});
muteBtn.addEventListener('click', () => {
  isMuted = !isMuted;
  muteBtn.textContent = isMuted ? '🔊 Unmute' : '🔇 Mute';
  try { speechSynthesis.cancel(); } catch {}
  viewer1.classList.remove('speaking');
  viewer2.classList.remove('speaking');
});

function stopShare() {
  if (captureTimer) {
    clearInterval(captureTimer);
    captureTimer = null;
  }
  if (ws && ws.readyState === WebSocket.OPEN) {
    try { ws.close(); } catch {}
  }
  ws = null;
  if (stream) {
    try { stream.getTracks().forEach(t => t.stop()); } catch {}
  }
  stream = null;
  preview.srcObject = null;
  try { speechSynthesis.cancel(); } catch {}
  viewer1.classList.remove('speaking');
  viewer2.classList.remove('speaking');
  setButtonsState(false);
}


