const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#13151f"/>
      <stop offset="100%" stop-color="#1A1D2E"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)" rx="96"/>
  <g transform="translate(256,256)" text-anchor="middle" dominant-baseline="central">
    <text font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-weight="800" font-size="200" fill="#2A6FBB" dy="15">R</text>
    <circle cx="100" cy="80" r="18" fill="#E8634B"/>
    <circle cx="-90" cy="-70" r="10" fill="#5A7D3F" opacity="0.8"/>
  </g>
</svg>
`;

const iconsDir = path.join(__dirname, '..', 'public', 'icons');
fs.mkdirSync(iconsDir, { recursive: true });

async function render() {
  const buffer = Buffer.from(svg.trim());
  await sharp(buffer, { density: 144 }).resize(192, 192).png().toFile(path.join(iconsDir, 'icon-192.png'));
  await sharp(buffer, { density: 144 }).resize(512, 512).png().toFile(path.join(iconsDir, 'icon-512.png'));
  fs.writeFileSync(path.join(iconsDir, 'icon-192.svg'), svg.trim());
  console.log('Icons generated in public/icons/');
}

render().catch((err) => { console.error(err); process.exit(1); });
