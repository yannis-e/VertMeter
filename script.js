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
  share: document.getElementById('share'),
};

const indicators = {
  start: document.getElementById('markStartIndicator'),
  end: document.getElementById('markEndIndicator'),
  current: document.getElementById('currentPosIndicator'),
};

const fpsSelect = document.getElementById('fpsSelect');
const standingReach = document.getElementById('reach');
const status = document.getElementById('status');
const result = document.getElementById('result');

const canvas = document.getElementById('shareCanvas');
const ctx = canvas.getContext('2d');

// ---------- Constants ----------
const g = 9.81;

// ---------- State ----------
let startFrame = null;
let endFrame = null;
let fps = Number(fpsSelect.value) || 30;

// 👉 EINZIGER Mess-State
let lastMeasurement = null;

// ---------- Helpers ----------
function setStatus(text = '') {
  status.textContent = text;
}

function setResult(text = '') {
  result.textContent = text;
}

function currentFrame() {
  return Math.round(video.currentTime * fps);
}

function skipFrames(frames) {
  video.pause();
  video.currentTime = Math.min(
    Math.max(video.currentTime + frames / fps, 0),
    video.duration || 0
  );
}

function resetMarks() {
  startFrame = null;
  endFrame = null;
  updateMarks();
}

// ---------- Video ----------
upload.addEventListener('change', () => {
  const file = upload.files[0];
  if (!file) return;

  video.src = URL.createObjectURL(file);
  video.load();
  video.pause();

  resetMarks();
  lastMeasurement = null;
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
buttons.share.addEventListener('click', shareJump);

// ---------- Calculation ----------
function calculateJump() {
  if (startFrame === null || endFrame === null) {
    setStatus('Mark start and end first.');
    return;
  }

  const frameCount = endFrame - startFrame;
  if (frameCount <= 0) {
    setStatus('End must be after start.');
    return;
  }

  const flightTime = frameCount / fps;
  const jumpHeight = (g * flightTime ** 2) / 8;
  const takeoffVelocity = (g * flightTime) / 2;

  const jumpHeightCm = jumpHeight * 100;
  const reachCm = Number(standingReach.value) || 0;

  // 🔒 PEAK EINMALIG FESTLEGEN
  const peakFrame = Math.round((startFrame + endFrame) / 2);
  const peakTime = peakFrame / fps;

  lastMeasurement = {
    startFrame,
    endFrame,
    peakFrame,
    peakTime,
    fps,
    jumpHeightCm,
    flightTime,
  };

  setStatus();
  setResult(
    `Time of flight: ${flightTime.toFixed(2)} s\n` +
    `Takeoff velocity: ${takeoffVelocity.toFixed(2)} m/s\n` +
    `Jump height: ${jumpHeightCm.toFixed(1)} cm\n` +
    `Estimated max reach: ${(jumpHeightCm + reachCm).toFixed(1)} cm`
  );

  resetMarks();
}

// ---------- Share ----------
async function renderShareImage() {
  const peakFrame = lastMeasurement.peakFrame;
  const peakTime = peakFrame / lastMeasurement.fps;

  video.pause();
  video.currentTime = peakTime;

  await new Promise(r => {
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked);
      setTimeout(r, 50);
    };
    video.addEventListener('seeked', onSeeked, { once: false });
  });

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  // Draw video frame
  ctx.drawImage(video, 0, 0);

  // Add a subtle dark overlay
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Bottom section with dark background - reduced height
  const overlayHeight = Math.max(120, canvas.height * 0.15);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.fillRect(0, canvas.height - overlayHeight, canvas.width, overlayHeight);

  // Accent line
  ctx.fillStyle = '#00d8ff';
  ctx.fillRect(0, canvas.height - overlayHeight, canvas.width, 4);

  // Text positioning
  const padding = 30;
  const topPadding = canvas.height - overlayHeight + 18;

  // Title (now descriptive)
  ctx.fillStyle = '#00d8ff';
  const titleFontSize = Math.max(18, Math.round(canvas.width * 0.045));
  ctx.font = 'bold ' + titleFontSize + 'px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('Vertical Jump Height', padding, topPadding);

  // Jump height result (prominent)
  ctx.fillStyle = '#ffffff';
  const measureFontSize = Math.max(28, Math.round(canvas.width * 0.08));
  ctx.font = 'bold ' + measureFontSize + 'px sans-serif';
  const measureY = topPadding + titleFontSize + 12;
  ctx.fillText(lastMeasurement.jumpHeightCm.toFixed(1) + ' cm', padding, measureY);

  // Small grey link on the right side of the overlay
  const link = 'https://yannis-e.github.io/VertMeter/';
  ctx.fillStyle = '#bfbfbf';
  const linkFontSize = Math.max(12, Math.round(canvas.width * 0.028));
  ctx.font = linkFontSize + 'px sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillText(link, canvas.width - padding, canvas.height - 8);
  // restore left alignment for further drawing
  ctx.textAlign = 'left';
}

async function shareJump() {
  if (!lastMeasurement) {
    setStatus('Calculate jump first.');
    return;
  }

  await renderShareImage();

  canvas.toBlob(async blob => {
    const file = new File([blob], 'vertmeter.png', { type: 'image/png' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title: 'My Vertical Jump',
        text: 'Measured with VertMeter',
        files: [file],
      });
    } else {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'vertmeter.png';
      a.click();
    }
  });
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

// ---------- FPS ----------
fpsSelect.addEventListener('change', () => {
  fps = Number(fpsSelect.value);
});
