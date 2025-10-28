// Generate square robot sprite frames
import { createCanvas } from 'canvas';
import { writeFileSync } from 'fs';

const frames = [];
const size = 48; // Larger sprite

// Enhanced color palette
const bodyDark = '#2B4A6F';     // Dark blue base
const bodyMid = '#3D6BA3';      // Medium blue
const bodyLight = '#5B8FD6';    // Light blue highlight
const accent = '#FF6B35';       // Orange accent
const eyeColor = '#00FFFF';     // Bright cyan glow
const outline = '#1A2840';      // Very dark outline

for (let frameIdx = 0; frameIdx < 5; frameIdx++) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Transparent background
  ctx.clearRect(0, 0, size, size);

  const legOffset = [0, 1, 2, 1, 0][frameIdx];

  ctx.lineWidth = 2;

  // === MAIN BODY (large square) ===
  // Base shadow
  ctx.fillStyle = bodyDark;
  ctx.fillRect(13, 13, 22, 22);

  // Main body
  ctx.fillStyle = bodyMid;
  ctx.fillRect(13, 12, 22, 22);

  // Highlight (top-left)
  ctx.fillStyle = bodyLight;
  ctx.fillRect(13, 12, 22, 3);
  ctx.fillRect(13, 12, 3, 22);

  // Outline
  ctx.strokeStyle = outline;
  ctx.strokeRect(13, 12, 22, 22);

  // Chest panel (orange square detail)
  ctx.fillStyle = accent;
  ctx.fillRect(20, 18, 8, 8);
  ctx.strokeStyle = outline;
  ctx.strokeRect(20, 18, 8, 8);

  // Inner chest detail
  ctx.fillStyle = bodyLight;
  ctx.fillRect(22, 20, 4, 4);

  // === HEAD (smaller square) ===
  // Base
  ctx.fillStyle = bodyDark;
  ctx.fillRect(17, 3, 14, 14);

  // Main head
  ctx.fillStyle = bodyMid;
  ctx.fillRect(17, 2, 14, 14);

  // Highlight
  ctx.fillStyle = bodyLight;
  ctx.fillRect(17, 2, 14, 2);
  ctx.fillRect(17, 2, 2, 14);

  // Outline
  ctx.strokeStyle = outline;
  ctx.strokeRect(17, 2, 14, 14);

  // Eyes (bright cyan glow with outer glow effect)
  ctx.fillStyle = eyeColor;
  ctx.fillRect(20, 7, 4, 4);
  ctx.fillRect(26, 7, 4, 4);

  // Eye glow effect
  ctx.globalAlpha = 0.5;
  ctx.fillRect(19, 6, 6, 6);
  ctx.fillRect(25, 6, 6, 6);
  ctx.globalAlpha = 1.0;

  // === ARMS (square blocks) ===
  // Left arm
  ctx.fillStyle = bodyDark;
  ctx.fillRect(8, 16, 5, 10);
  ctx.fillStyle = bodyMid;
  ctx.fillRect(8, 15, 5, 10);
  ctx.fillStyle = bodyLight;
  ctx.fillRect(8, 15, 5, 2);
  ctx.strokeStyle = outline;
  ctx.strokeRect(8, 15, 5, 10);

  // Right arm
  ctx.fillStyle = bodyDark;
  ctx.fillRect(35, 16, 5, 10);
  ctx.fillStyle = bodyMid;
  ctx.fillRect(35, 15, 5, 10);
  ctx.fillStyle = bodyLight;
  ctx.fillRect(35, 15, 5, 2);
  ctx.strokeStyle = outline;
  ctx.strokeRect(35, 15, 5, 10);

  // === LEGS (animated, square style) ===
  ctx.strokeStyle = outline;

  if (legOffset === 0) {
    // Standing position
    // Left leg
    ctx.fillStyle = bodyDark;
    ctx.fillRect(16, 35, 6, 11);
    ctx.fillStyle = bodyMid;
    ctx.fillRect(16, 34, 6, 11);
    ctx.strokeRect(16, 34, 6, 11);
    // Left foot
    ctx.fillStyle = bodyDark;
    ctx.fillRect(15, 45, 8, 3);
    ctx.strokeRect(15, 45, 8, 3);

    // Right leg
    ctx.fillStyle = bodyDark;
    ctx.fillRect(26, 35, 6, 11);
    ctx.fillStyle = bodyMid;
    ctx.fillRect(26, 34, 6, 11);
    ctx.strokeRect(26, 34, 6, 11);
    // Right foot
    ctx.fillStyle = bodyDark;
    ctx.fillRect(25, 45, 8, 3);
    ctx.strokeRect(25, 45, 8, 3);

  } else if (legOffset === 1) {
    // Left leg forward
    ctx.fillStyle = bodyDark;
    ctx.fillRect(15, 35, 6, 11);
    ctx.fillStyle = bodyMid;
    ctx.fillRect(15, 34, 6, 11);
    ctx.strokeRect(15, 34, 6, 11);
    ctx.fillStyle = bodyDark;
    ctx.fillRect(14, 45, 8, 3);
    ctx.strokeRect(14, 45, 8, 3);

    // Right leg back
    ctx.fillStyle = bodyDark;
    ctx.fillRect(27, 36, 6, 9);
    ctx.fillStyle = bodyMid;
    ctx.fillRect(27, 35, 6, 9);
    ctx.strokeRect(27, 35, 6, 9);
    ctx.fillStyle = bodyDark;
    ctx.fillRect(26, 44, 8, 3);
    ctx.strokeRect(26, 44, 8, 3);

  } else {
    // Right leg forward
    ctx.fillStyle = bodyDark;
    ctx.fillRect(27, 35, 6, 11);
    ctx.fillStyle = bodyMid;
    ctx.fillRect(27, 34, 6, 11);
    ctx.strokeRect(27, 34, 6, 11);
    ctx.fillStyle = bodyDark;
    ctx.fillRect(26, 45, 8, 3);
    ctx.strokeRect(26, 45, 8, 3);

    // Left leg back
    ctx.fillStyle = bodyDark;
    ctx.fillRect(15, 36, 6, 9);
    ctx.fillStyle = bodyMid;
    ctx.fillRect(15, 35, 6, 9);
    ctx.strokeRect(15, 35, 6, 9);
    ctx.fillStyle = bodyDark;
    ctx.fillRect(14, 44, 8, 3);
    ctx.strokeRect(14, 44, 8, 3);
  }

  // Save frame
  const buffer = canvas.toBuffer('image/png');
  writeFileSync(`public/assets/player/${frameIdx + 1}.png`, buffer);
}

console.log('✓ Created 5 square robot sprite frames');
