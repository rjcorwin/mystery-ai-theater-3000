const preview = document.getElementById('preview');
const shareBtn = document.getElementById('shareBtn');
const stopBtn = document.getElementById('stopBtn');
const pauseBtn = document.getElementById('pauseBtn');
const muteBtn = document.getElementById('muteBtn');
const muteBtnTop = document.getElementById('muteBtnTop');
const intervalInput = document.getElementById('intervalInput');
const settingsSaveBtn = document.getElementById('settingsSaveBtn');
const historyInput = document.getElementById('historyInput');
const modeSelect = document.getElementById('modeSelect');
const commentNowBtn = document.getElementById('commentNowBtn');
const commentNowHeaderBtn = document.getElementById('commentNowHeaderBtn');
const commentStatus = document.getElementById('commentStatus');
const hidePreviewChk = document.getElementById('hidePreviewChk');
const captureCanvas = document.getElementById('captureCanvas');
const logEl = document.getElementById('log');
const viewer1 = document.getElementById('viewer1');
const viewer2 = document.getElementById('viewer2');
// Voice controls
const voice1Select = document.getElementById('voice1Select');
const voice2Select = document.getElementById('voice2Select');
const voice1Eleven = document.getElementById('voice1Eleven');
const voice2Eleven = document.getElementById('voice2Eleven');
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
const miniHeaderToggle = document.getElementById('miniHeaderToggle');
const appHeader = document.getElementById('appHeader');
const stageResizer = document.getElementById('stageResizer');
const themeSelect = document.getElementById('themeSelect');

// Stage height persistence and drag-resize
const STAGE_H_KEY = 'mit3k.stageH';
function setStageHeightCss(px) {
  const minPx = 240;
  const maxPx = Math.round(window.innerHeight * 0.9);
  const clamped = Math.max(minPx, Math.min(maxPx, px));
  document.documentElement.style.setProperty('--stage-h', clamped + 'px');
  localStorage.setItem(STAGE_H_KEY, String(clamped));
}
function loadStageHeight() {
  const v = Number(localStorage.getItem(STAGE_H_KEY) || 0);
  if (v > 0) {
    document.documentElement.style.setProperty('--stage-h', v + 'px');
  }
}
loadStageHeight();

if (stageResizer) {
  let dragging = false;
  let startY = 0;
  let startH = 0;
  const stageEl = document.querySelector('.stage');
  const onMove = (e) => {
    if (!dragging) return;
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    const dy = y - startY;
    setStageHeightCss(startH + dy);
  };
  const onUp = () => {
    dragging = false;
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
    window.removeEventListener('touchmove', onMove);
    window.removeEventListener('touchend', onUp);
  };
  const onDown = (e) => {
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    startY = y;
    startH = stageEl.getBoundingClientRect().height;
    dragging = true;
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
  };
  stageResizer.addEventListener('mousedown', onDown);
  stageResizer.addEventListener('touchstart', onDown, { passive: true });
}

let stream = null;
let ws = null;
let captureTimer = null;
let isMuted = false;
let voices = [];
let mode = 'interval';
let capturePaused = false;

// Single-channel TTS queue to avoid overlapping playback
const ttsQueue = [];
let ttsPlaying = false;
// Track currently playing ElevenLabs audio so we can stop it on mute
let currentAudio = null;
let currentAudioUrl = null;
let resolveCurrentAudioEnd = null;
let audioUnlocked = false;

async function unlockAudio() {
  if (audioUnlocked) return true;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { audioUnlocked = true; return true; }
    const ctx = new AC();
    await ctx.resume();
    const buffer = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    src.start(0);
    audioUnlocked = true;
    setTimeout(() => { try { ctx.close(); } catch {} }, 50);
    return true;
  } catch {
    return false;
  }
}
function enqueueSpeak(which, text) {
  ttsQueue.push({ which, text });
  drainTtsQueue();
}
async function drainTtsQueue() {
  if (ttsPlaying) return;
  const next = ttsQueue.shift();
  if (!next) return;
  ttsPlaying = true;
  try {
    await performSpeak(next.which, next.text);
  } catch {}
  ttsPlaying = false;
  drainTtsQueue();
}

// Keep only English voices (Safari-compatible locales like en-US, en-GB, en-AU)
function filterEnglishVoices(list) {
  return (list || []).filter(v => {
    const lang = (v.lang || '').toLowerCase();
    return lang.startsWith('en');
  });
}

const LS_KEYS = {
  voice1: 'mit3k.voice1',
  voice2: 'mit3k.voice2',
  voice1Eleven: 'mit3k.voice1.eleven',
  voice2Eleven: 'mit3k.voice2.eleven',
  pitch1: 'mit3k.pitch1',
  pitch2: 'mit3k.pitch2',
  rate1: 'mit3k.rate1',
  rate2: 'mit3k.rate2',
  history: 'mit3k.history',
	interval: 'mit3k.interval',
	mode: 'mit3k.mode',
  theme: 'mit3k.theme'
};

function setButtonsState(capturing) {
  shareBtn.disabled = !!capturing;
  stopBtn.disabled = !capturing;
  if (pauseBtn) pauseBtn.disabled = !capturing;
}

function getViewerLabel(which) {
  const selEleven = which === 1 ? voice1Eleven : voice2Eleven;
  if (selEleven && selEleven.value) {
    const opt = selEleven.options[selEleven.selectedIndex];
    if (opt && opt.textContent) return opt.textContent;
  }
  const sel = which === 1 ? voice1Select : voice2Select;
  if (sel) {
    const opt = sel.options[sel.selectedIndex];
    if (opt && opt.textContent) return opt.textContent;
  }
  return `Viewer ${which}`;
}

function appendLine(who, text) {
  const div = document.createElement('div');
  div.className = 'line';
  const whoEl = document.createElement('span');
  whoEl.className = 'who';
  let labelText = who;
  if (who !== 'System') {
    const which = String(who).includes('1') ? 1 : 2;
    labelText = getViewerLabel(which);
  }
  whoEl.textContent = labelText + ':';
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
  enqueueSpeak(which, text);
}

async function performSpeak(which, text) {
  if (isMuted) return;
  const elevenSel = which === 1 ? voice1Eleven : voice2Eleven;
  const elevenId = elevenSel && elevenSel.value ? elevenSel.value : '';
  const speakingEl = which === 1 ? viewer1 : viewer2;
  if (elevenId) {
    speakingEl.classList.add('speaking');
    try {
      const ok = await (async () => {
        await unlockAudio();
        const res = await fetch('/api/tts/speak', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ voiceId: elevenId, text }) });
        if (!res.ok) return false;
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        // Apply UI rate/volume to remote audio
        const vol = which === 1 ? Number(voice1Vol.value || 1.0) : Number(voice2Vol.value || 1.0);
        const rate = which === 1 ? Number(voice1Rate.value || 1.1) : Number(voice2Rate.value || 1.1);
        audio.volume = Math.max(0, Math.min(1, vol));
        // playbackRate affects speed and pitch together; ElevenLabs API does not expose separate pitch here
        audio.playbackRate = Math.max(0.5, Math.min(2, rate));
        currentAudio = audio; currentAudioUrl = url;
        await audio.play();
        await new Promise(resolve => { resolveCurrentAudioEnd = resolve; audio.onended = () => resolve(); });
        if (currentAudioUrl) { try { URL.revokeObjectURL(currentAudioUrl); } catch {} }
        currentAudio = null; currentAudioUrl = null; resolveCurrentAudioEnd = null;
        return true;
      })();
      if (!ok) await speakWithBrowser(which, text);
    } catch {
      await speakWithBrowser(which, text);
    }
    speakingEl.classList.remove('speaking');
    return;
  }
  await speakWithBrowser(which, text);
}

function speakWithBrowser(which, text) {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) { resolve(); return; }
    const utter = new SpeechSynthesisUtterance(text);
    const v = resolveVoice(which);
    if (v) utter.voice = v;
    utter.rate = which === 1 ? Number(voice1Rate.value || 1.1) : Number(voice2Rate.value || 1.1);
    utter.pitch = which === 1 ? Number(voice1Pitch.value || 1.2) : Number(voice2Pitch.value || 0.9);
    utter.volume = which === 1 ? Number(voice1Vol.value || 1.0) : Number(voice2Vol.value || 1.0);
    utter.onstart = () => { (which === 1 ? viewer1 : viewer2).classList.add('speaking'); };
    utter.onend = () => { (which === 1 ? viewer1 : viewer2).classList.remove('speaking'); resolve(); };
    speechSynthesis.speak(utter);
  });
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
    // Convert seconds to ms
    const secs = Math.max(0.5, Number(intervalInput.value) || 2.5);
    const intervalMs = Math.round(secs * 1000);
    captureTimer = setInterval(captureAndSend, intervalMs);
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
        // Reset header button loading state if we were in manual request
        if (commentStatus.dataset.busy === '1') {
          if (commentNowHeaderBtn) { commentNowHeaderBtn.disabled = false; commentNowHeaderBtn.textContent = 'Comment Now'; }
        }
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
// Defer applying changes until Save is clicked
function saveSettings() {
  localStorage.setItem(LS_KEYS.history, historyInput.value);
  localStorage.setItem(LS_KEYS.interval, intervalInput.value);
  localStorage.setItem(LS_KEYS.mode, modeSelect.value);
  // re-schedule capture with new settings
  scheduleCapture();
}
settingsSaveBtn.addEventListener('click', saveSettings);
// Light immediate UI feedback only (no network/capture reschedule until Save)
historyInput.addEventListener('input', () => {});
modeSelect.addEventListener('change', () => {
  mode = modeSelect.value;
  commentNowBtn.disabled = mode !== 'manual';
});
commentNowBtn.addEventListener('click', () => {
  if (mode !== 'manual') return;
  // give immediate UI feedback
  commentNowBtn.disabled = true;
  commentStatus.textContent = 'Waiting for commentary…';
  commentStatus.dataset.busy = '1';
  captureAndSend();
  // Ensure audio is unlocked prior to first manual speak
  unlockAudio();
});

if (commentNowHeaderBtn) {
  commentNowHeaderBtn.addEventListener('click', () => {
    if (mode !== 'manual') return;
    // Indicate loading on header button and status line
    commentNowHeaderBtn.disabled = true;
    commentNowHeaderBtn.textContent = 'Commenting…';
    commentStatus.textContent = 'Waiting for commentary…';
    commentStatus.dataset.busy = '1';
    captureAndSend();
    unlockAudio();
  });
}
function toggleMute() {
  isMuted = !isMuted;
  const label = isMuted ? '🔊 Unmute' : '🔇 Mute';
  if (muteBtn) muteBtn.textContent = label;
  if (muteBtnTop) muteBtnTop.textContent = label;
  // Stop any in-flight playback immediately
  try { speechSynthesis.cancel(); } catch {}
  if (currentAudio) { try { currentAudio.pause(); currentAudio.currentTime = 0; } catch {} }
  if (resolveCurrentAudioEnd) { try { resolveCurrentAudioEnd(); } catch {} }
  viewer1.classList.remove('speaking');
  viewer2.classList.remove('speaking');
}
if (muteBtn) muteBtn.addEventListener('click', toggleMute);
if (muteBtnTop) muteBtnTop.addEventListener('click', toggleMute);

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
  voices = filterEnglishVoices(speechSynthesis.getVoices() || []);
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
      const list = filterEnglishVoices(speechSynthesis.getVoices());
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
      const list = filterEnglishVoices(speechSynthesis.getVoices());
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

// ElevenLabs integration
async function fetchElevenVoices() {
  try {
    const res = await fetch('/api/tts/voices');
    if (!res.ok) return [];
    return await res.json();
  } catch { return []; }
}

async function speakWithEleven(voiceId, text) {
  try {
    const res = await fetch('/api/tts/speak', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voiceId, text })
    });
    if (!res.ok) return false;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    await audio.play();
    return true;
  } catch { return false; }
}

function loadPersisted() {
  const h = localStorage.getItem(LS_KEYS.history);
  if (h) historyInput.value = h;
  const it = localStorage.getItem(LS_KEYS.interval);
  if (it) intervalInput.value = it; // stored in seconds
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
  const e1 = localStorage.getItem(LS_KEYS.voice1Eleven); if (e1 && voice1Eleven) voice1Eleven.value = e1;
  const e2 = localStorage.getItem(LS_KEYS.voice2Eleven); if (e2 && voice2Eleven) voice2Eleven.value = e2;
  voice1PitchVal.textContent = voice1Pitch.value;
  voice2PitchVal.textContent = voice2Pitch.value;
  voice1RateVal.textContent = voice1Rate.value;
  voice2RateVal.textContent = voice2Rate.value;
  voice1VolVal.textContent = Number(voice1Vol.value).toFixed(2);
  voice2VolVal.textContent = Number(voice2Vol.value).toFixed(2);
  const theme = localStorage.getItem(LS_KEYS.theme) || 'default';
  applyTheme(theme);
  if (themeSelect) themeSelect.value = theme;
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
  if (voice1Eleven) voice1Eleven.addEventListener('change', () => localStorage.setItem(LS_KEYS.voice1Eleven, voice1Eleven.value));
  if (voice2Eleven) voice2Eleven.addEventListener('change', () => localStorage.setItem(LS_KEYS.voice2Eleven, voice2Eleven.value));
  voice1Vol.addEventListener('input', () => { voice1VolVal.textContent = Number(voice1Vol.value).toFixed(2); localStorage.setItem('mit3k.vol1', voice1Vol.value); });
  voice2Vol.addEventListener('input', () => { voice2VolVal.textContent = Number(voice2Vol.value).toFixed(2); localStorage.setItem('mit3k.vol2', voice2Vol.value); });
  if (themeSelect) themeSelect.addEventListener('change', () => { const t = themeSelect.value; localStorage.setItem(LS_KEYS.theme, t); applyTheme(t); });
}

function applyTheme(theme) {
  const html = document.documentElement;
  html.classList.remove('theme-unicorn','theme-ocean','theme-sunset','theme-forest','theme-terminal','theme-vaporwave','theme-solarized','theme-mono');
  switch (theme) {
    case 'unicorn': html.classList.add('theme-unicorn'); break;
    case 'ocean': html.classList.add('theme-ocean'); break;
    case 'sunset': html.classList.add('theme-sunset'); break;
    case 'forest': html.classList.add('theme-forest'); break;
    case 'terminal': html.classList.add('theme-terminal'); break;
    case 'vaporwave': html.classList.add('theme-vaporwave'); break;
    case 'solarized': html.classList.add('theme-solarized'); break;
    case 'mono': html.classList.add('theme-mono'); break;
    default: /* default theme */ break;
  }
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
// Load ElevenLabs voices into selects if backend is configured
(async () => {
  const list = await fetchElevenVoices();
  [voice1Eleven, voice2Eleven].forEach((sel, idx) => {
    if (!sel) return;
    sel.innerHTML = '';
    if (!list.length) {
      const o = document.createElement('option'); o.value=''; o.textContent='(Disabled)'; sel.appendChild(o); return;
    }
    list.forEach(v => {
      const id = v.voice_id || v.VoiceID || v.id || v.voiceId;
      const name = v.name || v.Name || 'Voice';
      const o = document.createElement('option'); o.value = id; o.textContent = name; sel.appendChild(o);
    });
    const key = idx === 0 ? LS_KEYS.voice1Eleven : LS_KEYS.voice2Eleven;
    const prev = localStorage.getItem(key);
    if (prev) sel.value = prev;
  });
})();
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
  voices = filterEnglishVoices(speechSynthesis.getVoices() || []);
  populateVoices();
});

window.addEventListener('focus', async () => {
  await ensureVoicesLoaded(false);
  voices = filterEnglishVoices(speechSynthesis.getVoices() || voices);
  populateVoices();
});

// Drawer/collapsible controls
function setDrawer(open) {
  settingsDrawer.classList.toggle('collapsed', !open);
}
let drawerOpen = false;
if (settingsToggle) {
  settingsToggle.addEventListener('click', () => { drawerOpen = !drawerOpen; setDrawer(drawerOpen); });
}

// No mini mode; responsive layout handles 1/2 columns

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
  voices = filterEnglishVoices(speechSynthesis.getVoices() || []);
  populateVoices();
});
window.addEventListener('focus', async () => {
  voices = filterEnglishVoices(speechSynthesis.getVoices() || voices);
  populateVoices();
});


