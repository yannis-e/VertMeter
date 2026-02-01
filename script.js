// ---------- DOM ----------
const upload = document.getElementById('upload');
const video = document.getElementById('video');

const buttons = {
  back: document.getElementById('backward'),
  forward: document.getElementById('forward'),
  back10: document.getElementById('backward10'),
  forward10: document.getElementById('forward10'),
  markStart: document.getElementById('markStart'),
  markEnd: document.getElementById('markEnd'),
  calculate: document.getElementById('calculate'),
};·

const indicators = {
  start: document.getElementById('markStartIndicator'),
  end: document.getElementById('markEndIndicator'),
  current: document.getElementById('currentPosIndicator'),
};

const fpsSelect = document.getElementById('fpsSelect');
const standingReach = document.getElementById('reach');
const status = document.getElementById('status');
const result = document.getElementById('result');

// ---------- Constants ----------
const g = 9.81;

// ---------- State ----------
let startFrame = null;
let endFrame = null;

let fps = Number(fpsSelect.value) || 30; // initial von Dropdown

// ---------- Helpers ----------
function resetMarks() {
  startFrame = null;
  endFrame = null;
  updateMarks();
}

function currentFrame() {
  return Math.round(video.currentTime * fps);
}

function setStatus(text = '') {
  status.textContent = text;
}

function setResult(text = '') {
  result.textContent = text;
}

function skipFrames(frames) {
  video.pause();
  const dt = frames / fps;
  video.currentTime = Math.min(
    Math.max(video.currentTime + dt, 0),
    video.duration || 0
  );
}

// ---------- Video ----------
upload.addEventListener('change', () => {
  const file = upload.files[0];
  if (!file) return;

  video.src = URL.createObjectURL(file);
  video.load();
  video.pause();

  resetMarks();
  setResult();
  setStatus();
});

video.addEventListener('timeupdate', updateIndicators);

// ---------- Buttons ----------
buttons.back.addEventListener('click', () => skipFrames(-1));
buttons.forward.addEventListener('click', () => skipFrames(1));
buttons.back10.addEventListener('click', () => skipFrames(-10));
buttons.forward10.addEventListener('click', () => skipFrames(10));

buttons.markStart.addEventListener('click', () => {
  startFrame = currentFrame();
  setStatus(`Start marked at frame ${startFrame}`);
  setResult();
  updateMarks();
});

buttons.markEnd.addEventListener('click', () => {
  endFrame = currentFrame();
  setStatus(`End marked at frame ${endFrame}`);
  setResult();
  updateMarks();
});

buttons.calculate.addEventListener('click', calculateJump);

// ---------- Calculation ----------
function calculateJump() {
  if (startFrame === null || endFrame === null) {
    setStatus('Mark start and end first.');
    return;
  }

  const frameCount = endFrame - startFrame;
  const flightTime = frameCount / fps;

  if (flightTime <= 0) {
    setStatus('End must be after start.');
    return;
  }

  const jumpHeight = (g * flightTime ** 2) / 8;
  const takeoffVelocity = (g * flightTime) / 2;

  const jumpHeightCm = jumpHeight * 100;
  const reachCm = Number(standingReach.value) || 0;

  setStatus();
  setResult(
    `Time of flight: ${flightTime.toFixed(2)} s\n` +
    `Takeoff velocity: ${takeoffVelocity.toFixed(2)} m/s\n` +
    `Jump height: ${jumpHeightCm.toFixed(1)} cm\n` +
    `Estimated max reach: ${(jumpHeightCm + reachCm).toFixed(1)} cm`
  );

  resetMarks();
}

// ---------- Indicators ----------
function updateMarks() {
  if (!video.duration) return hideIndicators();

  toggleIndicator(indicators.start, startFrame !== null ? startFrame / fps : null);
  toggleIndicator(indicators.end, endFrame !== null ? endFrame / fps : null);
}

function updateIndicators() {
  if (!video.duration) return hideIndicators();

  indicators.current.style.left =
    (video.currentTime / video.duration) * 100 + '%';
  indicators.current.hidden = false;

  updateMarks();
}

function toggleIndicator(el, time) {
  if (time === null) {
    el.hidden = true;
    return;
  }
  el.style.left = (time / video.duration) * 100 + '%';
  el.hidden = false;
}

function hideIndicators() {
  Object.values(indicators).forEach(i => (i.hidden = true));
}

// ---------- FPS Dropdown ----------
fpsSelect.addEventListener('change', () => {
  fps = Number(fpsSelect.value);
});
