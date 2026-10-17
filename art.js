// =====================================================================
//  ART: all ORIGINAL, drawn with code (no image files except the leader heads).
//  Dark sleek look: glowing edges, light pools, parallax city, vignette.
// =====================================================================
const O = '#0b0b14';
function cv(scene, key, w, h, fn) { const t = scene.textures.createCanvas(key, w, h); fn(t.getContext(), w, h); t.refresh(); return t; }
function rect(c, col, x, y, w, h) { c.fillStyle = col; c.fillRect(x, y, w, h); }

function makeDreadArt(scene) {
  TEAMS.forEach(L => makeHero(scene, L));
  // soft round glow (used with ADD blend = light)
  cv(scene, 'glow', 128, 128, (c) => { const g = c.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(0.35, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 128, 128); });
  // lamp cone (light falling downward)
  cv(scene, 'cone', 160, 220, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.beginPath(); c.moveTo(w / 2 - 8, 0); c.lineTo(w / 2 + 8, 0); c.lineTo(w, h); c.lineTo(0, h); c.closePath(); c.fill(); });
  // vignette: dark edges, clear middle
  cv(scene, 'vignette', 320, 180, (c, w, h) => { const g = c.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, w * 0.62); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.78)'); c.fillStyle = g; c.fillRect(0, 0, w, h); });
  // parallax far city (white shapes, tinted per room)
  cv(scene, 'bg_far', 640, 360, (c) => {
    let x = 0, s = 7; const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    while (x < 640) { const w = 30 + rnd() * 50, h = 80 + rnd() * 170; rect(c, 'rgba(255,255,255,0.10)', x, 360 - h, w, h);
      for (let wy = 360 - h + 8; wy < 350; wy += 14) for (let wx = x + 5; wx < x + w - 6; wx += 10) if (rnd() < 0.25) rect(c, 'rgba(255,255,255,0.28)', wx, wy, 4, 5);
      x += w + 4; }
  });
  // parallax mid layer: pipes, cables, a big "LEDGER" billboard frame
  cv(scene, 'bg_mid', 640, 360, (c) => {
    rect(c, 'rgba(255,255,255,0.12)', 0, 70, 640, 10); rect(c, 'rgba(255,255,255,0.08)', 0, 250, 640, 16);
    for (let x = 40; x < 640; x += 160) { rect(c, 'rgba(255,255,255,0.10)', x, 0, 14, 360); rect(c, 'rgba(255,255,255,0.18)', x - 4, 66, 22, 18); }
    c.strokeStyle = 'rgba(255,255,255,0.10)'; c.lineWidth = 2; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(i * 170, 120); c.quadraticCurveTo(i * 170 + 85, 170, i * 170 + 170, 120); c.stroke(); }
    rect(c, 'rgba(255,255,255,0.14)', 380, 150, 150, 60); rect(c, 'rgba(0,0,0,0.3)', 386, 156, 138, 48);
  });
  // Scam Crawler: spiky beetle-bot with a "$$$" scam screen face
  cv(scene, 'crawler', 88, 32, (c) => { [0, 1].forEach(f => { const ox = f * 44;
    rect(c, O, ox + 4, 8, 36, 18); rect(c, '#3a2a4a', ox + 5, 9, 34, 16); rect(c, '#5c4470', ox + 5, 9, 34, 4);
    for (let i = 0; i < 4; i++) { rect(c, O, ox + 7 + i * 8, 4, 4, 5); rect(c, '#ff3d6e', ox + 8 + i * 8, 5, 2, 3); }
    rect(c, O, ox + 26, 12, 14, 10); rect(c, '#3dff9a', ox + 27, 13, 12, 8); c.fillStyle = O; c.font = 'bold 7px monospace'; c.fillText('$$', ox + 28, 20);
    for (let i = 0; i < 3; i++) { const lx = ox + 9 + i * 10 + (f ? 2 : -1); rect(c, O, lx, 25, 4, 7); rect(c, '#8a7aa0', lx + 1, 26, 2, 5); } }); });
  // Phish Drone: flying fish-bot with a hook
  cv(scene, 'flyer', 36, 26, (c) => { rect(c, O, 4, 6, 26, 14); rect(c, '#2a8aa8', 5, 7, 24, 12); rect(c, '#7fe9ff', 5, 7, 24, 3); rect(c, O, 0, 8, 6, 10); rect(c, '#2a8aa8', 1, 9, 4, 8);
    rect(c, '#fff', 22, 9, 5, 5); rect(c, O, 24, 10, 2, 3); rect(c, '#bbb', 17, 19, 2, 5); rect(c, '#bbb', 17, 23, 5, 2); rect(c, '#ffd34d', 12, 0, 10, 4); });
  // RUG PULLER mini-boss: big mech with a striped rug cape and a crowbar arm
  cv(scene, 'boss', 160, 84, (c) => { [0, 1].forEach(f => { const ox = f * 80;
    rect(c, O, ox + 8, 10, 46, 56); for (let i = 0; i < 6; i++) rect(c, i % 2 ? '#b8323c' : '#e8c36a', ox + 9, 11 + i * 9, 10, 9);   // rug cape
    rect(c, '#3b3f58', ox + 18, 11, 35, 54); rect(c, '#575d80', ox + 18, 11, 35, 6); rect(c, '#24273a', ox + 46, 11, 7, 54);
    rect(c, O, ox + 24, 18, 26, 14); rect(c, f ? '#fff' : '#ff3d6e', ox + 26, 20, 22, 10); rect(c, O, ox + 30, 23, 4, 4); rect(c, O, ox + 40, 23, 4, 4);   // visor eyes
    c.fillStyle = '#ffd34d'; c.font = 'bold 9px monospace'; c.fillText('RUG', ox + 23, 46);
    rect(c, O, ox + 52, 34, 24, 10); rect(c, '#9aa0b8', ox + 53, 35, 22, 8); rect(c, O, ox + 72, 28 + (f ? 0 : 4), 6, 22); rect(c, '#ff9a3d', ox + 73, 29 + (f ? 0 : 4), 4, 20);   // crowbar arm
    rect(c, O, ox + 20, 64, 12, 20); rect(c, O, ox + 38, 64, 12, 20); rect(c, '#2a2d40', ox + 21, 65, 10, 18); rect(c, '#2a2d40', ox + 39, 65, 10, 18); }); });
  // LEDGER AUDITOR: tall white egg drone, one scanning eye, clipboard arms. Unkillable.
  cv(scene, 'auditor', 104, 60, (c) => { [0, 1].forEach(f => { const ox = f * 52;
    c.fillStyle = O; c.beginPath(); c.ellipse(ox + 26, 26, 19, 24, 0, 0, 7); c.fill();
    c.fillStyle = '#e8ecf4'; c.beginPath(); c.ellipse(ox + 26, 26, 17, 22, 0, 0, 7); c.fill();
    c.fillStyle = '#b8c0d0'; c.beginPath(); c.ellipse(ox + 31, 30, 10, 17, 0, 0, 7); c.fill();
    rect(c, O, ox + 12, 16, 28, 12); rect(c, '#1a1d2e', ox + 13, 17, 26, 10); rect(c, f ? '#ff3d6e' : '#3fe0ff', ox + 22, 18, 10, 8); rect(c, '#fff', ox + 24, 19, 3, 3);
    rect(c, O, ox + 2, 30, 10, 14); rect(c, '#d9c08a', ox + 3, 31, 8, 12); rect(c, O, ox + 4, 34, 6, 1); rect(c, O, ox + 4, 37, 6, 1);   // clipboard
    rect(c, O, ox + 40, 30, 10, 4); rect(c, '#9aa0b8', ox + 41, 31, 8, 2);
    rect(c, O, ox + 20, 48, 12, 10); rect(c, f ? '#ff3d6e' : '#3fe0ff', ox + 22, 50, 8, 7); }); });
  // upgrade orb, save station, Lost Ledger goal, shots
  cv(scene, 'orb', 28, 28, (c) => { c.fillStyle = O; c.beginPath(); c.arc(14, 14, 13, 0, 7); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(14, 14, 11, 0, 7); c.fill(); c.fillStyle = 'rgba(0,0,0,0.25)'; c.beginPath(); c.arc(16, 16, 8, 0, 7); c.fill(); rect(c, '#fff', 8, 7, 4, 4); });
  cv(scene, 'station', 64, 40, (c) => { rect(c, O, 2, 24, 60, 16); rect(c, '#2a3048', 3, 25, 58, 14); rect(c, '#3fe0ff', 6, 26, 52, 3); rect(c, O, 26, 0, 12, 26); rect(c, '#3a4060', 27, 1, 10, 24); rect(c, '#3dff9a', 29, 4, 6, 6); });
  cv(scene, 'ledger', 30, 34, (c) => { rect(c, O, 2, 2, 26, 30); rect(c, '#ffd34d', 3, 3, 24, 28); rect(c, '#b8860b', 3, 3, 4, 28); rect(c, O, 11, 10, 12, 2); rect(c, O, 11, 15, 12, 2); rect(c, O, 11, 20, 8, 2); c.fillStyle = O; c.font = 'bold 9px monospace'; c.fillText('X', 15, 30); });
  cv(scene, 'shot', 14, 6, (c) => { rect(c, '#fff', 0, 1, 14, 4); rect(c, '#fff', 3, 0, 8, 6); });
  cv(scene, 'shotbig', 16, 16, (c) => { c.fillStyle = '#fff'; c.beginPath(); c.arc(8, 8, 7, 0, 7); c.fill(); });
  cv(scene, 'eshot', 10, 10, (c) => { c.fillStyle = '#ff3d6e'; c.beginPath(); c.arc(5, 5, 5, 0, 7); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(5, 5, 2, 0, 7); c.fill(); });
  cv(scene, 'px', 4, 4, (c) => rect(c, '#fff', 0, 0, 4, 4));
}

// cut the multi-frame canvases into frames 0,1,...
function addFrames(scene) {
  [['crawler', 44, 32, 2], ['boss', 80, 84, 2], ['auditor', 52, 60, 2]].forEach(([k, w, h, n]) => { const t = scene.textures.get(k); for (let i = 0; i < n; i++) t.add(i, 0, i * w, 0, w, h); });
}
