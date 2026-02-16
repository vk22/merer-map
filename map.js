/* =========================================================
   MERED MAP — Canvas Animated Map (Clouds + Markers + Zoom)
   Pure JS / Client Ready
   ========================================================= */

/* =========================
   CONFIG
   ========================= */
const CONFIG = {
  overscan: 1.15,
  parallax: 30,
  zoomScale: 1.15,
  zoomSmooth: 0.03,
  mouseSmooth: 0.06,
  cloudSpeed: 0.06,
  cloudAlpha: 0.95,
};

/* =========================
   CANVAS / DPI
   ========================= */
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

let dpr = window.devicePixelRatio || 1;
let viewW = 0;
let viewH = 0;

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  dpr = window.devicePixelRatio || 1;

  viewW = rect.width;
  viewH = rect.height;

  canvas.width = Math.round(viewW * dpr);
  canvas.height = Math.round(viewH * dpr);
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

/* =========================
   HELPERS
   ========================= */
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

/* Rounded rectangle path */
function roundRectPath(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);

  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/* =========================
   ASSETS
   ========================= */
const Assets = {
  map: new Image(),
  clouds: new Image(),
};

Assets.map.src = 'map.jpg';
Assets.clouds.src = 'clouds_big.png';

/* =========================
   MOUSE (Parallax)
   ========================= */
const Mouse = {
  x: 0,
  y: 0,
  tx: 0,
  ty: 0,
};

canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();

  Mouse.tx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
  Mouse.ty = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
});
// Pointer cursor on marker hover
canvas.addEventListener('mousemove', (e) => {
  if (!RenderState.mapRect) return;

  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  // world coords (match your click logic)
  const wx = (mx - Camera.x) / Camera.scale;
  const wy = (my - Camera.y) / Camera.scale;

  let hovering = false;

  for (const m of markers) {
    const px = RenderState.mapRect.x + m.x * RenderState.mapRect.w;
    const py = RenderState.mapRect.y + m.y * RenderState.mapRect.h;
    const box = m.getHitBox(px, py);

    if (wx >= box.x && wx <= box.x + box.w && wy >= box.y && wy <= box.y + box.h) {
      hovering = true;
      break;
    }
  }

  canvas.style.cursor = hovering ? 'pointer' : 'default';
});

/* =========================
   CAMERA
   ========================= */
const Camera = {
  scale: 1,
  x: 0,
  y: 0,

  targetScale: 1,
  targetX: 0,
  targetY: 0,

  activeMarker: null,
};

function resetZoom() {
  Camera.activeMarker = null;
  Camera.targetScale = 1;
  Camera.targetX = 0;
  Camera.targetY = 0;
}

function clampCameraToMap(mapRect) {
  const scaledW = mapRect.w * Camera.targetScale;
  const scaledH = mapRect.h * Camera.targetScale;

  const minX = viewW - (mapRect.x + scaledW);
  const maxX = -mapRect.x;

  const minY = viewH - (mapRect.y + scaledH);
  const maxY = -mapRect.y;

  Camera.targetX = clamp(Camera.targetX, minX, maxX);
  Camera.targetY = clamp(Camera.targetY, minY, maxY);
}

function zoomToMarker(marker, px, py) {
  if (Camera.activeMarker === marker) {
    resetZoom();
    return;
  }

  Camera.activeMarker = marker;
  Camera.targetScale = CONFIG.zoomScale;

  // center marker
  Camera.targetX = viewW / 2 - px * Camera.targetScale;
  Camera.targetY = viewH / 2 - py * Camera.targetScale;

  clampCameraToMap(RenderState.mapRect);
}

/* =========================
   MARKERS
   ========================= */
const markers = [
  {
    x: 0.61,
    y: 0.32,
    logo: 'iconic-logo.png',
    url: 'https://mered.edirectstaging.uk/dashboard/projects/d/16',
    w: 120,
    h: 55,
    delay: 0.4,
  },
  {
    x: 0.312,
    y: 0.722,
    logo: 'rivera-logo.png',
    url: 'https://mered.edirectstaging.uk/dashboard/projects/d/24',
    w: 120,
    h: 55,
    delay: 0.8,
  },
];

markers.forEach((m) => {
  m.img = new Image();
  m.img.src = m.logo;

  m.getHitBox = (px, py) => ({
    x: px - m.w / 1.75 - 16,
    y: py - 150,
    w: m.w + 55,
    h: m.h + 32,
  });
});

function drawMarker(marker, time, mapRect) {
  if (!marker.img.complete) return;

  const px = mapRect.x + marker.x * mapRect.w;
  const py = mapRect.y + marker.y * mapRect.h;

  const appear = Math.min(1, Math.max(0, (time - marker.delay) / 0.8));
  const alpha = easeOutCubic(appear);
  const float = Math.sin(time * 1.4 + marker.delay * 4) * 4;

  // line
  ctx.strokeStyle = `rgba(21,24,37,${0.4 * alpha})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.lineTo(px, py - 65 * alpha);
  ctx.stroke();

  // dot
  ctx.fillStyle = `rgba(21,24,37,${0.9 * alpha})`;
  ctx.beginPath();
  ctx.arc(px, py, 4, 0, Math.PI * 2);
  ctx.fill();

  // label
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(21,24,37,0.85)';
  roundRectPath(
    ctx,
    px - marker.w / 1.75 - 16,
    py - 150 + float,
    marker.w + 55,
    marker.h + 32,
    14,
  );
  ctx.fill();

  // logo
  ctx.drawImage(
    marker.img,
    px - marker.w / 2.2,
    py - 132 + float,
    marker.w,
    marker.h,
  );

  ctx.globalAlpha = 1;
}

/* =========================
   MAP DRAW
   ========================= */
function drawMapCover(img) {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;

  const baseScale = Math.max(viewW / iw, viewH / ih);
  const scale = baseScale * CONFIG.overscan;

  const w = iw * scale;
  const h = ih * scale;

  const x = (viewW - w) / 2;
  const y = (viewH - h) / 2;

  ctx.drawImage(img, x, y, w, h);
  return { x, y, w, h };
}

/* =========================
   RENDER STATE
   ========================= */
const RenderState = {
  startTime: performance.now(),
  cloudX: 0,
  mapRect: null,
};

/* =========================
   MAIN LOOP
   ========================= */
function renderFrame(now) {
  const t = (now - RenderState.startTime) / 1000;

  // clear
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // camera smooth
  Camera.scale = lerp(Camera.scale, Camera.targetScale, CONFIG.zoomSmooth);
  Camera.x = lerp(Camera.x, Camera.targetX, CONFIG.zoomSmooth);
  Camera.y = lerp(Camera.y, Camera.targetY, CONFIG.zoomSmooth);

  // mouse smooth
  Mouse.x = lerp(Mouse.x, Mouse.tx, CONFIG.mouseSmooth);
  Mouse.y = lerp(Mouse.y, Mouse.ty, CONFIG.mouseSmooth);

  // apply transform
  ctx.setTransform(
    Camera.scale * dpr,
    0,
    0,
    Camera.scale * dpr,
    (Camera.x + Mouse.x * CONFIG.parallax) * dpr,
    (Camera.y + Mouse.y * CONFIG.parallax) * dpr,
  );

  // map
  RenderState.mapRect = drawMapCover(Assets.map);

  // clouds
  RenderState.cloudX += CONFIG.cloudSpeed;
  if (RenderState.cloudX > viewW) RenderState.cloudX = 0;

  ctx.globalAlpha = CONFIG.cloudAlpha;
  ctx.drawImage(
    Assets.clouds,
    RenderState.cloudX,
    -RenderState.cloudX * 0.4,
    viewW,
    viewH,
  );
  ctx.drawImage(
    Assets.clouds,
    RenderState.cloudX - viewW,
    -RenderState.cloudX * 0.4,
    viewW,
    viewH,
  );
  ctx.globalAlpha = 1;

  // markers
  markers.forEach((m) => drawMarker(m, t, RenderState.mapRect));

  requestAnimationFrame(renderFrame);
}

/* =========================
   CLICK EVENT
   ========================= */
canvas.addEventListener('click', (e) => {
  if (!RenderState.mapRect) return;

  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  // world coords
  const wx = (mx - Camera.x) / Camera.scale;
  const wy = (my - Camera.y) / Camera.scale;

  for (const m of markers) {
    const px = RenderState.mapRect.x + m.x * RenderState.mapRect.w;
    const py = RenderState.mapRect.y + m.y * RenderState.mapRect.h;

    const box = m.getHitBox(px, py);

    if (
      wx >= box.x &&
      wx <= box.x + box.w &&
      wy >= box.y &&
      wy <= box.y + box.h
    ) {
      if (m.url) {
        window.location.href = m.url;
      } else {
        zoomToMarker(m, px, py);
      }
      break;
    }
  }
});

/* =========================
   START
   ========================= */
Promise.all([
  new Promise((r) => (Assets.map.onload = r)),
  new Promise((r) => (Assets.clouds.onload = r)),
]).then(() => requestAnimationFrame(renderFrame));
