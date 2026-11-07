const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const BASE_DIR = path.resolve(__dirname);
const LOGO_DIR = path.join(BASE_DIR, 'assets', 'logos');
const ICON_DIR = path.join(BASE_DIR, 'assets', 'icons');

// Helper to write file
function write(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
  console.log('Created:', path.relative(BASE_DIR, filePath));
}

// 1. SX Monogram SVG (Base)
const sxMonogramSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%">
  <defs>
    <linearGradient id="sx-blue-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="50%" stop-color="#2563eb" />
      <stop offset="100%" stop-color="#1d4ed8" />
    </linearGradient>
    <linearGradient id="sx-violet-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#c084fc" />
      <stop offset="50%" stop-color="#8b5cf6" />
      <stop offset="100%" stop-color="#6d28d9" />
    </linearGradient>
    <linearGradient id="sx-glow-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#60a5fa" stop-opacity="0.8" />
      <stop offset="100%" stop-color="#a855f7" stop-opacity="0.1" />
    </linearGradient>
    <radialGradient id="ring-glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.35" />
      <stop offset="70%" stop-color="#8b5cf6" stop-opacity="0.08" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </radialGradient>
    <filter id="liquid-glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
    <filter id="intense-glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="12" result="blur1" />
      <feGaussianBlur stdDeviation="4" result="blur2" />
      <feMerge>
        <feMergeNode in="blur1" />
        <feMergeNode in="blur2" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>

  <!-- Ambient Glow Ring -->
  <circle cx="100" cy="100" r="92" fill="url(#ring-glow)" />
  <circle cx="100" cy="100" r="88" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1.5" />
  <circle cx="100" cy="100" r="84" fill="none" stroke="url(#sx-blue-grad)" stroke-width="1" stroke-dasharray="8 6" opacity="0.6" />

  <!-- S Curve Shape (Liquid Glass) -->
  <path d="M 68 52 C 104 38, 142 54, 134 82 C 128 102, 70 98, 66 122 C 60 148, 102 166, 132 148"
        fill="none"
        stroke="url(#sx-blue-grad)"
        stroke-width="15"
        stroke-linecap="round"
        filter="url(#liquid-glow)" />

  <!-- Intersecting X Slash (Violet Beam) -->
  <path d="M 136 54 L 64 146"
        fill="none"
        stroke="url(#sx-violet-grad)"
        stroke-width="15"
        stroke-linecap="round"
        filter="url(#liquid-glow)" />

  <!-- Overlapping Intersection Accent -->
  <path d="M 92 92 L 108 108"
        fill="none"
        stroke="#ffffff"
        stroke-width="6"
        stroke-linecap="round"
        opacity="0.9" />

  <!-- Connecting Nodes / Sparks -->
  <circle cx="68" cy="52" r="5" fill="#38bdf8" filter="url(#intense-glow)" />
  <circle cx="132" cy="148" r="5" fill="#38bdf8" filter="url(#intense-glow)" />
  <circle cx="136" cy="54" r="5" fill="#c084fc" filter="url(#intense-glow)" />
  <circle cx="64" cy="146" r="5" fill="#c084fc" filter="url(#intense-glow)" />
</svg>`;

// 2. Full ShareX Logo SVG (Monogram + Text + Tagline)
const fullLogoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 140" width="100%" height="100%">
  <defs>
    <linearGradient id="fl-blue" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#2563eb" />
    </linearGradient>
    <linearGradient id="fl-xgrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#60a5fa" />
      <stop offset="50%" stop-color="#8b5cf6" />
      <stop offset="100%" stop-color="#ec4899" />
    </linearGradient>
    <filter id="logo-glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="4" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Monogram embedded at left -->
  <g transform="translate(10, 10) scale(0.6)">
    <!-- S Curve -->
    <path d="M 68 52 C 104 38, 142 54, 134 82 C 128 102, 70 98, 66 122 C 60 148, 102 166, 132 148"
          fill="none" stroke="url(#fl-blue)" stroke-width="16" stroke-linecap="round" />
    <!-- X Slash -->
    <path d="M 136 54 L 64 146"
          fill="none" stroke="url(#fl-xgrad)" stroke-width="16" stroke-linecap="round" />
    <!-- Spark points -->
    <circle cx="68" cy="52" r="5" fill="#38bdf8" />
    <circle cx="132" cy="148" r="5" fill="#38bdf8" />
    <circle cx="136" cy="54" r="5" fill="#c084fc" />
    <circle cx="64" cy="146" r="5" fill="#c084fc" />
  </g>

  <!-- Typography: ShareX -->
  <text x="145" y="78" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', 'Segoe UI', sans-serif" font-size="52" font-weight="800" fill="#ffffff" letter-spacing="-1">
    Share<tspan fill="url(#fl-xgrad)">X</tspan>
  </text>

  <!-- Tagline -->
  <text x="148" y="104" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Inter', 'Segoe UI', sans-serif" font-size="13" font-weight="600" fill="rgba(255,255,255,0.6)" letter-spacing="4">
    BEYOND SHARING. EXPERIENCE SHARING.
  </text>
</svg>`;

// 3. Splash Logo SVG
const splashLogoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" width="100%" height="100%">
  <defs>
    <linearGradient id="splash-s" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#2563eb" />
    </linearGradient>
    <linearGradient id="splash-x" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#c084fc" />
      <stop offset="100%" stop-color="#7c3aed" />
    </linearGradient>
    <radialGradient id="splash-halo" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.45" />
      <stop offset="50%" stop-color="#8b5cf6" stop-opacity="0.15" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </radialGradient>
    <filter id="splash-glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Radial Halo Light Ring -->
  <circle cx="160" cy="160" r="140" fill="url(#splash-halo)" />
  <circle cx="160" cy="160" r="130" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="2" />
  <circle cx="160" cy="160" r="122" fill="none" stroke="url(#splash-s)" stroke-width="1.5" stroke-dasharray="12 8" opacity="0.75" />

  <!-- Monogram centered -->
  <g transform="translate(60, 60)">
    <path d="M 68 52 C 104 38, 142 54, 134 82 C 128 102, 70 98, 66 122 C 60 148, 102 166, 132 148"
          fill="none" stroke="url(#splash-s)" stroke-width="16" stroke-linecap="round" filter="url(#splash-glow)" />
    <path d="M 136 54 L 64 146"
          fill="none" stroke="url(#splash-x)" stroke-width="16" stroke-linecap="round" filter="url(#splash-glow)" />
    <circle cx="68" cy="52" r="6" fill="#38bdf8" />
    <circle cx="132" cy="148" r="6" fill="#38bdf8" />
    <circle cx="136" cy="54" r="6" fill="#c084fc" />
    <circle cx="64" cy="146" r="6" fill="#c084fc" />
  </g>
</svg>`;

// 4. OpenGraph Social Card (1200 x 630)
const ogPreviewSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <radialGradient id="og-bg" cx="50%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#111827" />
      <stop offset="100%" stop-color="#030712" />
    </radialGradient>
    <radialGradient id="og-glow" cx="50%" cy="40%" r="40%">
      <stop offset="0%" stop-color="#2563eb" stop-opacity="0.35" />
      <stop offset="60%" stop-color="#7c3aed" stop-opacity="0.15" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </radialGradient>
    <linearGradient id="og-grad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="50%" stop-color="#818cf8" />
      <stop offset="100%" stop-color="#c084fc" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#og-bg)" />
  <circle cx="600" cy="260" r="380" fill="url(#og-glow)" />

  <!-- Monogram Logo -->
  <g transform="translate(500, 70) scale(1.0)">
    <circle cx="100" cy="100" r="88" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="2" />
    <circle cx="100" cy="100" r="82" fill="none" stroke="#38bdf8" stroke-width="1.5" stroke-dasharray="10 6" opacity="0.6" />
    <path d="M 68 52 C 104 38, 142 54, 134 82 C 128 102, 70 98, 66 122 C 60 148, 102 166, 132 148"
          fill="none" stroke="#38bdf8" stroke-width="16" stroke-linecap="round" />
    <path d="M 136 54 L 64 146"
          fill="none" stroke="#a855f7" stroke-width="16" stroke-linecap="round" />
    <circle cx="68" cy="52" r="5" fill="#38bdf8" />
    <circle cx="132" cy="148" r="5" fill="#38bdf8" />
    <circle cx="136" cy="54" r="5" fill="#c084fc" />
    <circle cx="64" cy="146" r="5" fill="#c084fc" />
  </g>

  <!-- Title -->
  <text x="600" y="360" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="76" font-weight="900" fill="#ffffff" letter-spacing="-1.5">
    Share<tspan fill="url(#og-grad)">X</tspan>
  </text>

  <!-- Tagline -->
  <text x="600" y="415" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="600" fill="rgba(255,255,255,0.8)" letter-spacing="6">
    BEYOND SHARING. EXPERIENCE SHARING.
  </text>

  <!-- Features Badges -->
  <g transform="translate(240, 480)">
    <!-- Badge 1 -->
    <rect x="0" y="0" width="220" height="48" rx="24" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" />
    <text x="110" y="30" text-anchor="middle" font-family="sans-serif" font-size="16" font-weight="600" fill="#38bdf8">Direct P2P WebRTC</text>

    <!-- Badge 2 -->
    <rect x="250" y="0" width="220" height="48" rx="24" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" />
    <text x="360" y="30" text-anchor="middle" font-family="sans-serif" font-size="16" font-weight="600" fill="#a855f7">Zero Cloud Storage</text>

    <!-- Badge 3 -->
    <rect x="500" y="0" width="220" height="48" rx="24" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" />
    <text x="610" y="30" text-anchor="middle" font-family="sans-serif" font-size="16" font-weight="600" fill="#34d399">In-Browser Stream</text>
  </g>
</svg>`;

// Write all SVGs
write(path.join(LOGO_DIR, 'sx-monogram.svg'), sxMonogramSvg);
write(path.join(LOGO_DIR, 'sx-monogram-blue.svg'), sxMonogramSvg.replace(/#c084fc/g, '#38bdf8').replace(/#8b5cf6/g, '#2563eb'));
write(path.join(LOGO_DIR, 'sx-monogram-violet.svg'), sxMonogramSvg.replace(/#38bdf8/g, '#c084fc').replace(/#2563eb/g, '#8b5cf6'));
write(path.join(LOGO_DIR, 'logo.svg'), fullLogoSvg);
write(path.join(LOGO_DIR, 'splash-logo.svg'), splashLogoSvg);
write(path.join(LOGO_DIR, 'og-preview.svg'), ogPreviewSvg);
write(path.join(ICON_DIR, 'favicon.svg'), sxMonogramSvg);

// Now write a robust pure-node PNG writer for icon-192.png and icon-512.png
function createPng(width, height, pixelFn) {
  const rowSize = width * 4 + 1;
  const rawData = Buffer.alloc(rowSize * height);
  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixelFn(x, y, width, height);
      const px = rowOffset + 1 + x * 4;
      rawData[px] = r;
      rawData[px + 1] = g;
      rawData[px + 2] = b;
      rawData[px + 3] = a;
    }
  }

  const deflated = zlib.deflateSync(rawData, { level: 9 });

  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }

  function crc32(buf) {
    let crc = 0 ^ (-1);
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
    }
    return (crc ^ (-1)) >>> 0;
  }

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    const toCrc = Buffer.concat([typeBuf, data]);
    crcBuf.writeUInt32BE(crc32(toCrc), 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflated),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

// Generate icon image renderer (Liquid Glass dark badge with glowing S and X)
function renderIconPixel(x, y, w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const nx = (x - cx) / (w / 2);
  const ny = (y - cy) / (h / 2);
  const dist = Math.sqrt(nx * nx + ny * ny);

  // Background: Rounded Dark Glass squircle
  const squircle = Math.pow(Math.abs(nx), 4) + Math.pow(Math.abs(ny), 4);
  if (squircle > 1.0) {
    return [0, 0, 0, 0]; // Transparent outer
  }

  // Base background color with subtle radial gradient
  let r = Math.floor(10 + (1 - dist) * 15);
  let g = Math.floor(14 + (1 - dist) * 18);
  let b = Math.floor(26 + (1 - dist) * 35);
  let a = 255;

  // Squircle border
  if (squircle > 0.88 && squircle <= 1.0) {
    return [56, 189, 248, Math.floor(255 * (1 - (squircle - 0.88) / 0.12))];
  }

  // Diagonal slash 1: (x - y) line (Violet)
  const d1 = Math.abs((nx + 0.1) - (ny + 0.05));
  if (d1 < 0.22 && dist < 0.68) {
    const intensity = 1 - d1 / 0.22;
    r = Math.min(255, Math.floor(r + 192 * intensity));
    g = Math.min(255, Math.floor(g + 132 * intensity));
    b = Math.min(255, Math.floor(b + 252 * intensity));
  }

  // S curve approximation: two loops
  const topLoop = Math.sqrt(Math.pow(nx + 0.15, 2) + Math.pow(ny + 0.25, 2));
  const botLoop = Math.sqrt(Math.pow(nx - 0.15, 2) + Math.pow(ny - 0.25, 2));

  if (Math.abs(topLoop - 0.32) < 0.12 && nx < 0.35) {
    const sInt = 1 - Math.abs(topLoop - 0.32) / 0.12;
    r = Math.min(255, Math.floor(r + 56 * sInt));
    g = Math.min(255, Math.floor(g + 189 * sInt));
    b = Math.min(255, Math.floor(b + 248 * sInt));
  }

  if (Math.abs(botLoop - 0.32) < 0.12 && nx > -0.35) {
    const sInt = 1 - Math.abs(botLoop - 0.32) / 0.12;
    r = Math.min(255, Math.floor(r + 37 * sInt));
    g = Math.min(255, Math.floor(g + 99 * sInt));
    b = Math.min(255, Math.floor(b + 235 * sInt));
  }

  return [r, g, b, a];
}

console.log('Generating PNG icons...');
const png192 = createPng(192, 192, renderIconPixel);
write(path.join(ICON_DIR, 'icon-192.png'), png192);

const png512 = createPng(512, 512, renderIconPixel);
write(path.join(ICON_DIR, 'icon-512.png'), png512);

// Favicon 32x32 PNG
const png32 = createPng(32, 32, renderIconPixel);
write(path.join(ICON_DIR, 'favicon-32.png'), png32);
write(path.join(ICON_DIR, 'favicon.ico'), png32); // Valid PNG data in .ico format accepted by modern browsers

console.log('Asset generation completed successfully.');
