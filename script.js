const upload = document.getElementById('upload');
const video = document.getElementById('video');
const backBtn = document.getElementById('backward');
const forwardBtn = document.getElementById('forward');
const markStartBtn = document.getElementById('markStart');
const markEndBtn = document.getElementById('markEnd');
const calculateBtn = document.getElementById('calculate');
const result = document.getElementById('result');
const status = document.getElementById('status');
const themeToggle = document.getElementById('themeToggle');
const body = document.body;
const back10Btn = document.getElementById('backward10');
const forward10Btn = document.getElementById('forward10');
const currentPosIndicator = document.getElementById('currentPosIndicator');

const markStartIndicator = document.getElementById('markStartIndicator');
const markEndIndicator = document.getElementById('markEndIndicator');

const g = 9.81;

let jumpStartTime = null;
let jumpEndTime = null;
let fps = 30; // Default FPS fallback

// Video laden und FPS bestimmen wenn möglich
upload.addEventListener('change', () => {
  const file = upload.files[0];
  if (!file) return;

  const url = URL.createObjectURL(file);
  video.src = url;
  video.load();
  video.pause();

  jumpStartTime = null;
  jumpEndTime = null;
  updateMarks();

  // Versuche FPS zu bestimmen (funktioniert nicht in allen Browsern)
  video.addEventListener('loadedmetadata', () => {
    // Manche Videos haben 'video.playbackRate', aber keine FPS-Daten direkt
    // Alternativ kann FPS über Dauer & Anzahl Frames geschätzt werden, aber hier keine einfache Lösung.
    // Für zuverlässige Werte müsste man externe Libs nutzen oder Input abfragen.
    // Daher hier nur ein Hinweis.
    // fps bleibt 30 als Default.
  }, { once: true });
});

function skipFrames(frames) {
  video.pause();
  const frameDuration = 1 / fps;
  let newTime = video.currentTime + frames * frameDuration;

  if (newTime < 0) newTime = 0;
  if (newTime > video.duration) newTime = video.duration;

  video.currentTime = newTime;
}

backBtn.addEventListener('click', () => skipFrames(-1));
forwardBtn.addEventListener('click', () => skipFrames(1));

back10Btn.addEventListener('click', () => skipFrames(-10));
forward10Btn.addEventListener('click', () => skipFrames(10));

markStartBtn.addEventListener('click', () => {
  jumpStartTime = video.currentTime;
  status.textContent = `Start time marked at ${jumpStartTime.toFixed(2)} seconds`;
  result.textContent = '';
  updateMarks();
});

markEndBtn.addEventListener('click', () => {
  jumpEndTime = video.currentTime;
  status.textContent = `End time marked at ${jumpEndTime.toFixed(2)} seconds`;
  result.textContent = '';
  updateMarks();
});

calculateBtn.addEventListener('click', () => {
  if (jumpStartTime === null || jumpEndTime === null) {
    status.textContent = 'Bitte zuerst Start- und Endzeit markieren.';
    result.textContent = '';
    return;
  }

  const flightTime = jumpEndTime - jumpStartTime;
  if (flightTime <= 0) {
    status.textContent = 'Endzeit muss nach Startzeit liegen.';
    result.textContent = '';
    return;
  }

  const jumpHeight = (g * flightTime * flightTime) / 8;

  status.textContent = '';
  result.textContent = `Jump height: ${jumpHeight.toFixed(2)} meters`;

  // Markierungen zurücksetzen, damit keine Fehler beim nächsten Versuch
  jumpStartTime = null;
  jumpEndTime = null;
  updateMarks();
});

// Visualisiere Markierungen als Balken unter Video
function updateMarks() {
  if (!video.duration || video.duration === Infinity) {
    // Kein Video geladen oder Dauer unbekannt
    markStartIndicator.hidden = true;
    markEndIndicator.hidden = true;
    return;
  }

  if (jumpStartTime !== null) {
    markStartIndicator.style.left = (jumpStartTime / video.duration) * 100 + '%';
    markStartIndicator.hidden = false;
  } else {
    markStartIndicator.hidden = true;
  }

  if (jumpEndTime !== null) {
    markEndIndicator.style.left = (jumpEndTime / video.duration) * 100 + '%';
    markEndIndicator.hidden = false;
  } else {
    markEndIndicator.hidden = true;
  }
}

function updateCurrentPosition() {
  if (!video.duration || video.duration === Infinity) {
    currentPosIndicator.hidden = true;
    return;
  }
  currentPosIndicator.style.left = (video.currentTime / video.duration) * 100 + '%';
  currentPosIndicator.hidden = false;
}

video.addEventListener('timeupdate', () => {
  updateCurrentPosition();
  updateMarks();
});