const preview = document.getElementById('preview');
const shareBtn = document.getElementById('shareBtn');
const stopBtn = document.getElementById('stopBtn');
const pauseBtn = document.getElementById('pauseBtn');
const muteBtn = document.getElementById('muteBtn');
const intervalInput = document.getElementById('intervalInput');
const historyInput = document.getElementById('historyInput');
const modeSelect = document.getElementById('modeSelect');
const commentNowBtn = document.getElementById('commentNowBtn');
const commentStatus = document.getElementById('commentStatus');
const hidePreviewChk = document.getElementById('hidePreviewChk');
const captureCanvas = document.getElementById('captureCanvas');
const logEl = document.getElementById('log');
const viewer1 = document.getElementById('viewer1');
const viewer2 = document.getElementById('viewer2');
// Voice controls
const voice1Select = document.getElementById('voice1Select');
const voice2Select = document.getElementById('voice2Select');
const voice1Pitch = document.getElementById('voice1Pitch');
const voice2Pitch = document.getElementById('voice2Pitch');
const voice1Rate = document.getElementById('voice1Rate');
const voice2Rate = document.getElementById('voice2Rate');
const voice1PitchVal = document.getElementById('voice1PitchVal');
const voice2PitchVal = document.getElementById('voice2PitchVal');
const voice1RateVal = document.getElementById('voice1RateVal');
const voice2RateVal = document.getElementById('voice2RateVal');
const voice1Vol = document.getElementById('voice1Vol');
const voice2Vol = document.getElementById('voice2Vol');
const voice1VolVal = document.getElementById('voice1VolVal');
const voice2VolVal = document.getElementById('voice2VolVal');
const voice1Test = document.getElementById('voice1Test');
const voice2Test = document.getElementById('voice2Test');
const voiceRefresh = document.getElementById('voiceRefresh');
const settingsToggle = document.getElementById('settingsToggle');
const settingsDrawer = document.getElementById('settingsDrawer');
const drawerToggle = document.getElementById('drawerToggle');
const miniToggle = document.getElementById('miniToggle');
const miniHeaderToggle = document.getElementById('miniHeaderToggle');
const appHeader = document.getElementById('appHeader');

let stream = null;
let ws = null;
let captureTimer = null;
let isMuted = false;
let voices = [];
let mode = 'interval';
let capturePaused = false;

const LS_KEYS = {
  voice1: 'mit3k.voice1',
  voice2: 'mit3k.voice2',
  pitch1: 'mit3k.pitch1',
  pitch2: 'mit3k.pitch2',
  rate1: 'mit3k.rate1',
  rate2: 'mit3k.rate2',
  history: 'mit3k.history',
	interval: 'mit3k.interval',
	mode: 'mit3k.mode',
	mini: 'mit3k.mini'
};

function setButtonsState(capturing) {
  shareBtn.disabled = !!capturing;
  stopBtn.disabled = !capturing;
  if (pauseBtn) pauseBtn.disabled = !capturing;
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

// Ensure the chat stays pinned to bottom whenever content is added/resized
function scrollLogToBottom() {
  if (!logEl) return;
  requestAnimationFrame(() => {
    logEl.scrollTop = logEl.scrollHeight;
  });
}

function resolveVoice(which) {
  const sel = which === 1 ? voice1Select : voice2Select;
  const name = sel?.value;
  if (!name) return null;
  return voices.find(v => v.name === name) || null;
}

function speak(text, which) {
  if (isMuted) return;
  if (!('speechSynthesis' in window)) return;
  const utter = new SpeechSynthesisUtterance(text);
  const v = resolveVoice(which);
  if (v) utter.voice = v;
  utter.rate = which === 1 ? Number(voice1Rate.value || 1.1) : Number(voice2Rate.value || 1.1);
  utter.pitch = which === 1 ? Number(voice1Pitch.value || 1.2) : Number(voice2Pitch.value || 0.9);
  utter.volume = which === 1 ? Number(voice1Vol.value || 1.0) : Number(voice2Vol.value || 1.0);
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
    // apply current hide/show preference
    if (hidePreviewChk) preview.style.display = hidePreviewChk.checked ? 'none' : '';
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
  if (mode === 'interval' && !capturePaused) {
    const interval = Math.max(500, Number(intervalInput.value) || 2500);
    captureTimer = setInterval(captureAndSend, interval);
  }
}

function captureAndSend() {
  if (capturePaused) return;
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
    if (commentStatus.dataset.busy === '1') {
      commentStatus.textContent = '';
      commentStatus.dataset.busy = '0';
      commentNowBtn.disabled = mode !== 'manual';
    }
    // Reset pause button if stream ends elsewhere
    capturePaused = false;
    if (pauseBtn) pauseBtn.textContent = 'Pause Capture';
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
          scrollLogToBottom();
        });
        if (commentStatus.dataset.busy === '1') {
          commentStatus.textContent = '';
          commentStatus.dataset.busy = '0';
          commentNowBtn.disabled = mode !== 'manual';
        }
      }
    } catch (err) {
      console.error('bad message', err);
    }
  };
}

shareBtn.addEventListener('click', async () => { await ensureVoicesLoaded(true); startShare(); });
stopBtn.addEventListener('click', stopShare);
if (pauseBtn) {
  pauseBtn.addEventListener('click', () => {
    capturePaused = !capturePaused;
    pauseBtn.textContent = capturePaused ? 'Resume Capture' : 'Pause Capture';
    scheduleCapture();
  });
}
intervalInput.addEventListener('change', scheduleCapture);
intervalInput.addEventListener('input', scheduleCapture);
historyInput.addEventListener('change', () => {});
historyInput.addEventListener('input', () => {});
modeSelect.addEventListener('change', () => {
  mode = modeSelect.value;
  commentNowBtn.disabled = mode !== 'manual';
  scheduleCapture();
});
commentNowBtn.addEventListener('click', () => {
  if (mode !== 'manual') return;
  // give immediate UI feedback
  commentNowBtn.disabled = true;
  commentStatus.textContent = 'Waiting for commentary…';
  commentStatus.dataset.busy = '1';
  captureAndSend();
});
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

// Voice population and persistence
function populateVoices() {
  voices = speechSynthesis.getVoices() || [];
  const opts = voices.map(v => {
    const o = document.createElement('option');
    o.value = v.name;
    o.textContent = `${v.name} (${v.lang})${v.default ? ' • default' : ''}`;
    return o;
  });
  [voice1Select, voice2Select].forEach((sel, idx) => {
    if (!sel) return;
    const prev = localStorage.getItem(idx === 0 ? LS_KEYS.voice1 : LS_KEYS.voice2);
    sel.innerHTML = '';
    if (opts.length) {
      opts.forEach(o => sel.appendChild(o.cloneNode(true)));
    } else {
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = '(No voices found)';
      sel.appendChild(placeholder);
    }
    let chosen = prev;
    if (!chosen || !Array.from(sel.options).some(o => o.value === chosen)) {
      // pick defaults: try default voice for first, a different one for second
      if (voices.length > 0) {
        if (idx === 0) {
          const def = voices.find(v => v.default) || voices[0];
          chosen = def.name;
        } else {
          const def = voices.find(v => v.default);
          const alt = voices.find(v => !def || v.name !== def.name) || voices[0];
          chosen = alt.name;
        }
      }
    }
    if (chosen) sel.value = chosen;
    localStorage.setItem(idx === 0 ? LS_KEYS.voice1 : LS_KEYS.voice2, sel.value || '');
  });
}

function waitForVoices(maxWaitMs = 10000) {
  return new Promise((resolve) => {
    const start = Date.now();
    function check() {
      const list = speechSynthesis.getVoices();
      if (list && list.length) {
        voices = list;
        resolve(list);
        return;
      }
      if (Date.now() - start > maxWaitMs) {
        resolve(list || []);
        return;
      }
      setTimeout(check, 100);
    }
    // attach event as well
    const onChange = () => {
      const list = speechSynthesis.getVoices();
      if (list && list.length) {
        voices = list;
        speechSynthesis.onvoiceschanged = null;
        resolve(list);
      }
    };
    if ('speechSynthesis' in window) {
      speechSynthesis.onvoiceschanged = onChange;
    }
    // trigger
    check();
  });
}

function primeSpeechEngine() {
  try {
    const u = new SpeechSynthesisUtterance('.')
    u.volume = 0;
    u.rate = 1;
    u.pitch = 1;
    speechSynthesis.speak(u);
    setTimeout(() => { try { speechSynthesis.cancel(); } catch {} }, 150);
  } catch {}
}

async function ensureVoicesLoaded(force = false) {
  if (voices && voices.length) return true;
  if (force) primeSpeechEngine();
  await waitForVoices(10000);
  populateVoices();
  return voices.length > 0;
}

function loadPersisted() {
  const h = localStorage.getItem(LS_KEYS.history);
  if (h) historyInput.value = h;
  const it = localStorage.getItem(LS_KEYS.interval);
  if (it) intervalInput.value = it;
	const m = localStorage.getItem(LS_KEYS.mode);
	if (m === 'manual' || m === 'interval') {
		mode = m;
		if (modeSelect) modeSelect.value = m;
		if (commentNowBtn) commentNowBtn.disabled = mode !== 'manual';
	}
  const p1 = localStorage.getItem(LS_KEYS.pitch1); if (p1) voice1Pitch.value = p1;
  const p2 = localStorage.getItem(LS_KEYS.pitch2); if (p2) voice2Pitch.value = p2;
  const r1 = localStorage.getItem(LS_KEYS.rate1); if (r1) voice1Rate.value = r1;
  const r2 = localStorage.getItem(LS_KEYS.rate2); if (r2) voice2Rate.value = r2;
  const v1 = localStorage.getItem('mit3k.vol1'); if (v1) voice1Vol.value = v1;
  const v2 = localStorage.getItem('mit3k.vol2'); if (v2) voice2Vol.value = v2;
  voice1PitchVal.textContent = voice1Pitch.value;
  voice2PitchVal.textContent = voice2Pitch.value;
  voice1RateVal.textContent = voice1Rate.value;
  voice2RateVal.textContent = voice2Rate.value;
  voice1VolVal.textContent = Number(voice1Vol.value).toFixed(2);
  voice2VolVal.textContent = Number(voice2Vol.value).toFixed(2);
	const mini = localStorage.getItem(LS_KEYS.mini) === '1';
	document.documentElement.classList.toggle('mini', mini);
	if (miniToggle) miniToggle.textContent = mini ? 'Exit Mini' : 'Mini Mode';
}

function persistLive() {
  historyInput.addEventListener('input', () => localStorage.setItem(LS_KEYS.history, historyInput.value));
  intervalInput.addEventListener('input', () => localStorage.setItem(LS_KEYS.interval, intervalInput.value));
	modeSelect.addEventListener('change', () => localStorage.setItem(LS_KEYS.mode, modeSelect.value));
  voice1Pitch.addEventListener('input', () => { voice1PitchVal.textContent = voice1Pitch.value; localStorage.setItem(LS_KEYS.pitch1, voice1Pitch.value); });
  voice2Pitch.addEventListener('input', () => { voice2PitchVal.textContent = voice2Pitch.value; localStorage.setItem(LS_KEYS.pitch2, voice2Pitch.value); });
  voice1Rate.addEventListener('input', () => { voice1RateVal.textContent = voice1Rate.value; localStorage.setItem(LS_KEYS.rate1, voice1Rate.value); });
  voice2Rate.addEventListener('input', () => { voice2RateVal.textContent = voice2Rate.value; localStorage.setItem(LS_KEYS.rate2, voice2Rate.value); });
  voice1Select.addEventListener('change', () => localStorage.setItem(LS_KEYS.voice1, voice1Select.value));
  voice2Select.addEventListener('change', () => localStorage.setItem(LS_KEYS.voice2, voice2Select.value));
  voice1Vol.addEventListener('input', () => { voice1VolVal.textContent = Number(voice1Vol.value).toFixed(2); localStorage.setItem('mit3k.vol1', voice1Vol.value); });
  voice2Vol.addEventListener('input', () => { voice2VolVal.textContent = Number(voice2Vol.value).toFixed(2); localStorage.setItem('mit3k.vol2', voice2Vol.value); });
}

function testVoice(which) {
  const text = which === 1 ? 'Viewer one, systems nominal.' : 'Viewer two, sarcasm thrusters online.';
  speak(text, which);
}

voice1Test.addEventListener('click', async () => { await ensureVoicesLoaded(true); testVoice(1); });
voice2Test.addEventListener('click', async () => { await ensureVoicesLoaded(true); testVoice(2); });

// initialize
loadPersisted();
(async () => { await ensureVoicesLoaded(false); })();
persistLive();
// honor initial hide preview state on load
if (hidePreviewChk) {
  document.documentElement.classList.toggle('no-stage', hidePreviewChk.checked);
  hidePreviewChk.addEventListener('change', () => {
    document.documentElement.classList.toggle('no-stage', hidePreviewChk.checked);
  });
}

// Manual refresh and focus refresh for voices
voiceRefresh.addEventListener('click', async () => {
  await ensureVoicesLoaded(true);
  populateVoices();
});

window.addEventListener('focus', async () => {
  await ensureVoicesLoaded(false);
  populateVoices();
});

// Drawer/collapsible controls
function setDrawer(open) {
  settingsDrawer.classList.toggle('collapsed', !open);
  drawerToggle.textContent = open ? 'Collapse' : 'Expand';
}
let drawerOpen = false;
if (settingsToggle) {
  settingsToggle.addEventListener('click', () => { drawerOpen = !drawerOpen; setDrawer(drawerOpen); });
}
if (drawerToggle) {
  drawerToggle.addEventListener('click', () => { drawerOpen = !drawerOpen; setDrawer(drawerOpen); });
}

// Mini mode toggle
miniToggle.addEventListener('click', () => {
  const next = !document.documentElement.classList.contains('mini');
  document.documentElement.classList.toggle('mini', next);
  miniToggle.textContent = next ? 'Exit Mini' : 'Mini Mode';
  localStorage.setItem(LS_KEYS.mini, next ? '1' : '0');
});

// Collapse header controls in mini mode
// Header emoji toggles the top Button Drawer
miniHeaderToggle.addEventListener('click', () => {
  drawerOpen = !drawerOpen;
  setDrawer(drawerOpen);
  miniHeaderToggle.setAttribute('aria-expanded', String(drawerOpen));
});

// Manual refresh and focus refresh
voiceRefresh.addEventListener('click', async () => {
  primeSpeechEngine();
  await new Promise(r => setTimeout(r, 200));
  voices = speechSynthesis.getVoices() || [];
  populateVoices();
});
window.addEventListener('focus', async () => {
  voices = speechSynthesis.getVoices() || voices;
  populateVoices();
});


