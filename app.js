'use strict';

// --- State ---
const state = {
  size: 256,
  ec: 'L',
  colorDark: '#e8e8e8',
  colorLight: '#0c0c0c',
  qr: null,
};

// --- Elements ---
const input       = document.getElementById('input');
const charCount   = document.getElementById('char-count');
const clearBtn    = document.getElementById('clear-btn');
const generateBtn = document.getElementById('generate-btn');
const qrCanvas    = document.getElementById('qr-canvas');
const outputSec   = document.getElementById('output-section');
const colorDark   = document.getElementById('color-dark');
const colorLight  = document.getElementById('color-light');
const copyBtn     = document.getElementById('copy-btn');
const dlPng       = document.getElementById('download-png');
const dlSvg       = document.getElementById('download-svg');

// --- Segmented controls ---
document.querySelectorAll('#size-select .seg-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#size-select .seg-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.size = parseInt(btn.dataset.value);
  });
});

document.querySelectorAll('#ec-select .seg-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#ec-select .seg-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.ec = btn.dataset.value;
  });
});

// --- Color inputs ---
colorDark.addEventListener('input', () => state.colorDark = colorDark.value);
colorLight.addEventListener('input', () => state.colorLight = colorLight.value);

// --- Char count ---
input.addEventListener('input', () => {
  charCount.textContent = input.value.length;
});

// --- Clear ---
clearBtn.addEventListener('click', () => {
  input.value = '';
  charCount.textContent = 0;
  input.focus();
});

// --- QR error correction map ---
const EC_MAP = {
  L: QRCode.CorrectLevel.L,
  M: QRCode.CorrectLevel.M,
  Q: QRCode.CorrectLevel.Q,
  H: QRCode.CorrectLevel.H,
};

// --- Generate ---
generateBtn.addEventListener('click', generate);
input.addEventListener('keydown', e => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) generate();
});

function generate() {
  const text = input.value.trim();
  if (!text) {
    input.focus();
    return;
  }

  // Clear previous
  qrCanvas.innerHTML = '';
  state.qr = null;

  try {
    state.qr = new QRCode(qrCanvas, {
      text,
      width: state.size,
      height: state.size,
      colorDark: state.colorDark,
      colorLight: state.colorLight,
      correctLevel: EC_MAP[state.ec],
    });

    outputSec.classList.add('visible');
  } catch (err) {
    alert('Failed to generate QR code. Input may be too long for the selected error correction level.');
  }
}

// --- Download PNG ---
dlPng.addEventListener('click', () => {
  const canvas = qrCanvas.querySelector('canvas');
  if (!canvas) return;
  const link = document.createElement('a');
  link.download = 'qr.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
});

// --- Download SVG (manual generation) ---
dlSvg.addEventListener('click', () => {
  const canvas = qrCanvas.querySelector('canvas');
  if (!canvas) return;

  const size = canvas.width;
  const ctx = canvas.getContext('2d');
  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;

  // Determine module size by scanning first row for color transitions
  const dark = hexToRgb(state.colorDark);
  let moduleSize = 1;
  for (let x = 1; x < size; x++) {
    const idx = x * 4;
    if (colorMatch(data, idx, dark)) { moduleSize = x; break; }
  }

  const modules = Math.round(size / moduleSize);
  const rects = [];

  for (let row = 0; row < modules; row++) {
    for (let col = 0; col < modules; col++) {
      const px = Math.floor(col * moduleSize + moduleSize / 2);
      const py = Math.floor(row * moduleSize + moduleSize / 2);
      const idx = (py * size + px) * 4;
      if (colorMatch(data, idx, dark)) {
        rects.push(`<rect x="${col}" y="${row}" width="1" height="1" fill="${state.colorDark}"/>`);
      }
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${modules} ${modules}" shape-rendering="crispEdges">
  <rect width="${modules}" height="${modules}" fill="${state.colorLight}"/>
  ${rects.join('\n  ')}
</svg>`;

  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = 'qr.svg';
  link.href = url;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

// --- Copy to clipboard ---
copyBtn.addEventListener('click', async () => {
  const canvas = qrCanvas.querySelector('canvas');
  if (!canvas) return;
  try {
    canvas.toBlob(async blob => {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      flash(copyBtn, 'Copied!');
    });
  } catch {
    // Fallback: copy input text
    await navigator.clipboard.writeText(input.value.trim());
    flash(copyBtn, 'Text copied');
  }
});

// --- Helpers ---
function flash(btn, label) {
  const orig = btn.textContent;
  btn.textContent = label;
  btn.classList.add('flash');
  setTimeout(() => {
    btn.textContent = orig;
    btn.classList.remove('flash');
  }, 1200);
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  return { r, g, b };
}

function colorMatch(data, idx, rgb, tolerance = 30) {
  return Math.abs(data[idx]   - rgb.r) < tolerance &&
         Math.abs(data[idx+1] - rgb.g) < tolerance &&
         Math.abs(data[idx+2] - rgb.b) < tolerance;
}
