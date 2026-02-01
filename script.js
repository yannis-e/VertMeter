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
};

const indicators = {
  start: document.getElementById('markStartIndicator'),
  end: document.getElementById('markEndIndicator'),
  current: document.getElementById('currentPosIndicator'),
};

const fpsDisplay = document.getElementById('fpsDisplay');
const fpsAutoOption = document.getElementById('fpsAutoOption');
const fpsSelect = document.getElementById('fpsSelect');
const standingReach = document.getElementById('reach');
const status = document.getElementById('status');
const result = document.getElementById('result');

// ---------- Constants ----------
const g = 9.81;

// ---------- State ----------
let jumpStartTime = null;
let jumpEndTime = null;

let fps = 30;
let autoFps = null;

// ---------- Helpers ----------
function resetMarks() {
  jumpStartTime = null;
  jumpEndTime = null;
  updateMarks();
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

function estimateFPS(video, samples = 20) {
  return new Promise(resolve => {
    let lastTime = null;
    let deltas = [];
    let count = 0;

    function step(now, metadata) {
      if (lastTime !== null) {
        deltas.push(metadata.mediaTime - lastTime);
        count++;
      }
      lastTime = metadata.mediaTime;

      if (count >= samples) {
        const avgDelta =
          deltas.reduce((a, b) => a + b, 0) / deltas.length;
        resolve(1 / avgDelta);
        return;
      }
      video.requestVideoFrameCallback(step);
    }

    video.requestVideoFrameCallback(step);
  });
}

// ---------- Video ----------
upload.addEventListener('change', async () => {
  const file = upload.files[0];
  if (!file) return;

  video.src = URL.createObjectURL(file);
  await video.play();
  video.pause();

  autoFps = await estimateFPS(video);
  if (fpsSelect.value === 'auto') {
    fps = autoFps ? autoFps : 30;
  }

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
  jumpStartTime = video.currentTime;
  setStatus(`Start marked at ${jumpStartTime.toFixed(2)} s`);
  setResult();
  updateMarks();
});

buttons.markEnd.addEventListener('click', () => {
  jumpEndTime = video.currentTime;
  setStatus(`End marked at ${jumpEndTime.toFixed(2)} s`);
  setResult();
  updateMarks();
});

buttons.calculate.addEventListener('click', calculateJump);

// ---------- Calculation ----------
function calculateJump() {
  if (jumpStartTime === null || jumpEndTime === null) {
    setStatus('Mark start and end first.');
    return;
  }

  const flightTime = jumpEndTime - jumpStartTime;
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

  toggleIndicator(indicators.start, jumpStartTime);
  toggleIndicator(indicators.end, jumpEndTime);
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

fpsSelect.addEventListener('change', () => {
  if (fpsSelect.value === 'auto') {
    fps = autoFps ? autoFps : 30;
  } else {
    fps = Number(fpsSelect.value);
  }

  fpsDisplay.textContent = `${fps} fps`;

});
