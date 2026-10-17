// Hero body art reused from the 3D TwiN preview (original pixel art drawn in code)
const HW = 48, HH = 64;
const HERO_FRAMES = ['idle', 'idle2', 'run1', 'run2', 'run3', 'run4', 'run5', 'run6', 'jump', 'fall', 'punch', 'shoot', 'hurt'];
const hx = c => '#' + (c >>> 0).toString(16).padStart(6, '0');
const shade = (c, f) => { const r = Math.min(255, ((c >> 16) & 255) * f) | 0, g = Math.min(255, ((c >> 8) & 255) * f) | 0, b = Math.min(255, (c & 255) * f) | 0; return (r << 16) | (g << 8) | b; };

// Draw a chunky limb from (x0,y0) to (x1,y1)
function limb(ctx, x0, y0, x1, y1, w, color, outline) {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
  for (const [col, ww] of [[outline, w + 2], [color, w]]) {
    ctx.fillStyle = col;
    for (let i = 0; i <= steps; i++) {
      const x = Math.round(x0 + (x1 - x0) * i / steps), y = Math.round(y0 + (y1 - y0) * i / steps);
      ctx.fillRect(x - (ww >> 1), y - (ww >> 1), ww, ww);
    }
  }
}

// Hero poses (facing right). Shoulder ~ (24,34), hip ~ (24,48)
const HERO_POSES = {
  idle:  { fa: [30, 46], ba: [17, 46], fl: [29, 63], bl: [19, 63] },
  idle2: { fa: [31, 47], ba: [16, 47], fl: [29, 63], bl: [19, 63], dy: 1 },
  run1:  { fa: [34, 40], ba: [14, 46], fl: [36, 61], bl: [12, 60] },
  run2:  { fa: [31, 43], ba: [17, 45], fl: [32, 63], bl: [16, 58], dy: 1 },
  run3:  { fa: [24, 46], ba: [26, 43], fl: [24, 62], bl: [26, 57], dy: -1 },
  run4:  { fa: [14, 46], ba: [34, 40], fl: [12, 60], bl: [36, 61] },
  run5:  { fa: [17, 45], ba: [31, 43], fl: [16, 58], bl: [32, 63], dy: 1 },
  run6:  { fa: [26, 43], ba: [24, 46], fl: [26, 57], bl: [24, 62], dy: -1 },
  jump:  { fa: [34, 28], ba: [12, 32], fl: [31, 56], bl: [17, 52] },
  fall:  { fa: [36, 36], ba: [12, 36], fl: [30, 63], bl: [16, 60] },
  punch: { fa: [46, 36], ba: [18, 42], fl: [33, 63], bl: [15, 63] },
  shoot: { fa: [44, 38], ba: [18, 44], fl: [30, 63], bl: [18, 63], gun: true },
  hurt:  { fa: [10, 30], ba: [14, 34], fl: [30, 63], bl: [18, 63], lean: -3 }
};

function makeHero(scene, L) {
  const tex = scene.textures.createCanvas('hero_' + L.key, HW * HERO_FRAMES.length, HH), ctx = tex.getContext();
  const main = hx(L.color), dark = hx(L.dark), hi = hx(shade(L.color, 1.35)), O = '#0b0b14';
  const pants = '#1e1e3a', pantsD = '#14142a', boot = '#2a1a10', skin = '#d9a066';
  HERO_FRAMES.forEach((f, i) => {
    const p = HERO_POSES[f], ox = i * HW, lean = p.lean || 0, sx = ox + 24 + lean, sy = 34 + (p.dy || 0), hipx = ox + 24, hipy = 48 + (p.dy || 0);
    const o = pt => [ox + pt[0], pt[1]];
    // back leg & arm
    let [bx, by] = o(p.bl); limb(ctx, hipx - 3, hipy, (hipx - 3 + bx) / 2, (hipy + by) / 2 + 1, 6, pantsD, O); limb(ctx, (hipx - 3 + bx) / 2, (hipy + by) / 2 + 1, bx, by - 3, 6, pantsD, O);
    ctx.fillStyle = O; ctx.fillRect(bx - 5, by - 5, 11, 6); ctx.fillStyle = boot; ctx.fillRect(bx - 4, by - 4, 9, 4);
    [bx, by] = o(p.ba); limb(ctx, sx - 6, sy, (sx - 6 + bx) / 2, (sy + by) / 2 + 2, 5, dark, O); limb(ctx, (sx - 6 + bx) / 2, (sy + by) / 2 + 2, bx, by, 5, dark, O);
    ctx.fillStyle = O; ctx.fillRect(bx - 3, by - 3, 7, 7); ctx.fillStyle = '#eee'; ctx.fillRect(bx - 2, by - 2, 5, 5);   // glove
    // torso: jacket with highlight, shadow, zip, gold chain
    ctx.fillStyle = O; ctx.fillRect(sx - 10, sy - 6, 20, 20);
    ctx.fillStyle = main; ctx.fillRect(sx - 9, sy - 5, 18, 18);
    ctx.fillStyle = hi; ctx.fillRect(sx - 9, sy - 5, 4, 14);
    ctx.fillStyle = dark; ctx.fillRect(sx + 5, sy - 5, 4, 18); ctx.fillRect(sx - 9, sy + 10, 18, 3);
    ctx.fillStyle = '#ffd700'; ctx.fillRect(sx - 5, sy - 4, 10, 2); ctx.fillRect(sx - 1, sy - 2, 3, 4);   // chain + X pendant
    ctx.fillStyle = '#ffd700'; ctx.fillRect(sx - 2, sy + 10, 4, 3);                                       // belt buckle
    // front leg
    [bx, by] = o(p.fl); limb(ctx, hipx + 3, hipy, (hipx + 3 + bx) / 2 + 1, (hipy + by) / 2, 6, pants, O); limb(ctx, (hipx + 3 + bx) / 2 + 1, (hipy + by) / 2, bx, by - 3, 6, pants, O);
    ctx.fillStyle = O; ctx.fillRect(bx - 5, by - 5, 12, 6); ctx.fillStyle = boot; ctx.fillRect(bx - 4, by - 4, 10, 4); ctx.fillStyle = '#fff'; ctx.fillRect(bx - 4, by - 2, 10, 1);
    // front arm (+ arm blaster when shooting, Mega Man style)
    [bx, by] = o(p.fa); limb(ctx, sx + 6, sy, (sx + 6 + bx) / 2, (sy + by) / 2 + 2, 5, main, O); limb(ctx, (sx + 6 + bx) / 2, (sy + by) / 2 + 2, bx, by, 5, main, O);
    if (p.gun) { ctx.fillStyle = O; ctx.fillRect(bx - 6, by - 5, 12, 10); ctx.fillStyle = hx(L.glow); ctx.fillRect(bx - 5, by - 4, 10, 8); ctx.fillStyle = dark; ctx.fillRect(bx + 2, by - 2, 3, 4); }
    else { ctx.fillStyle = O; ctx.fillRect(bx - 4, by - 4, 8, 8); ctx.fillStyle = '#eee'; ctx.fillRect(bx - 3, by - 3, 6, 6); }
    polish(ctx, ox, 0, HW, HH, L.glow);
    tex.add(f, 0, ox, 0, HW, HH);
  });
  tex.refresh();
}

function polish(ctx, x0, y0, w, h, rim, frameW) {
  const img = ctx.getImageData(x0, y0, w, h), d = img.data, src = new Uint8ClampedArray(d);
  const fw = frameW || w, rr = (rim >> 16) & 255, rg = (rim >> 8) & 255, rb = rim & 255;
  const A = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? 0 : src[(y * w + x) * 4 + 3];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    if (src[i + 3] < 128) {   // bold cartoon outline (2px, like the CBH art) around the sprite
      let n = false; for (let oy = -2; oy <= 2 && !n; oy++) for (let ox = -2; ox <= 2; ox++) if (Math.abs(ox) + Math.abs(oy) <= 2 && A(x + ox, y + oy) > 127) { n = true; break; }
      if (n) { d[i] = 8; d[i + 1] = 6; d[i + 2] = 12; d[i + 3] = 255; }
      continue;
    }
    const lx = (x % fw) / fw, ly = y / h;
    const v = 1.14 - ly * 0.32 - lx * 0.08; let f = v > 1.02 ? 1.12 : v > 0.9 ? 0.98 : 0.8;   // cartoon (cel) shading bands, light from top-left
    let r = src[i] * f, g = src[i + 1] * f, b = src[i + 2] * f;
    if (A(x, y - 1) < 128) { r += 45; g += 45; b += 45; } // specular top edge
    if (A(x - 1, y) < 128) { r = r * 0.45 + rr * 0.55; g = g * 0.45 + rg * 0.55; b = b * 0.45 + rb * 0.55; } // rim light (back edge)
    d[i] = r; d[i + 1] = g; d[i + 2] = b;
  }
  ctx.putImageData(img, x0, y0);
}

// radial glow sprite (used with ADD blend for light pools, auras, muzzle flash)
