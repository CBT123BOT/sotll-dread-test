// =====================================================================
//  CONTROLS: keyboard + on-screen touch buttons for phones + test bot
//  Keyboard: Arrows move, Z jump, X shoot (hold UP to aim up), C slide,
//            V counter, SHIFT dash, M map, ENTER start
// =====================================================================
const KEYS = { left: 'LEFT', right: 'RIGHT', up: 'UP', down: 'DOWN', jump: 'Z', shoot: 'X', slide: 'C', counter: 'V', dash: 'SHIFT', map: 'M', start: 'ENTER' };
const TOUCH = {}, TOUCH_TAPS = {}, BOTIN = {};
for (const b in KEYS) TOUCH[b] = BOTIN[b] = false;

function makePad(scene) {
  const keys = {}, prev = {};
  for (const b in KEYS) keys[b] = scene.input.keyboard.addKey(KEYS[b], true, false);
  return {
    read() {
      const out = { held: {}, pressed: {} };
      for (const b in KEYS) {
        const tapped = TOUCH_TAPS[b]; if (tapped) TOUCH_TAPS[b] = false;
        const down = keys[b].isDown || TOUCH[b] || BOTIN[b] || tapped;
        out.held[b] = down; out.pressed[b] = down && !prev[b]; prev[b] = keys[b].isDown || TOUCH[b] || BOTIN[b];
      }
      return out;
    }
  };
}

const IS_TOUCH = ('ontouchstart' in window) || navigator.maxTouchPoints > 0 || new URLSearchParams(location.search).get('touch') === '1';

function setupTouch() {
  const unlock = () => { Sound.init(); if (Sound.ctx && Sound.ctx.state === 'suspended') Sound.ctx.resume(); };
  ['pointerdown', 'touchstart', 'keydown'].forEach(ev => window.addEventListener(ev, unlock, { passive: true }));
  const gameDiv = document.getElementById('game');
  if (gameDiv) { gameDiv.tabIndex = 0; gameDiv.addEventListener('pointerdown', () => gameDiv.focus()); }
  const fs = document.getElementById('fsBtn');
  if (fs) fs.addEventListener('click', () => {
    const el = document.documentElement;
    if (document.fullscreenElement) document.exitFullscreen();
    else if (el.requestFullscreen) el.requestFullscreen().then(() => { try { screen.orientation.lock('landscape'); } catch (e) {} }).catch(() => {});
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  });
  if (!IS_TOUCH) return;
  document.body.classList.add('touch');
  // Left thumb: d-pad zone (slide your thumb around without lifting)
  const pad = document.getElementById('dpad'), knob = document.getElementById('knob'); let padId = null;
  const setDir = e => {
    const r = pad.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2), dead = r.width * 0.14;
    TOUCH.left = dx < -dead; TOUCH.right = dx > dead; TOUCH.up = dy < -dead * 1.6; TOUCH.down = dy > dead * 1.6;
    const len = Math.min(1, Math.hypot(dx, dy) / (r.width / 2)), ang = Math.atan2(dy, dx);
    knob.style.transform = `translate(${Math.cos(ang) * len * r.width * 0.3}px, ${Math.sin(ang) * len * r.width * 0.3}px)`;
  };
  const clearDir = () => { TOUCH.left = TOUCH.right = TOUCH.up = TOUCH.down = false; knob.style.transform = ''; padId = null; };
  pad.addEventListener('pointerdown', e => { e.preventDefault(); padId = e.pointerId; try { pad.setPointerCapture(e.pointerId); } catch (_) {} setDir(e); });
  pad.addEventListener('pointermove', e => { if (e.pointerId === padId) setDir(e); });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => pad.addEventListener(ev, e => { if (e.pointerId === padId) clearDir(); }));
  // Right thumb: buttons (multi-touch works)
  document.querySelectorAll('[data-b]').forEach(el => {
    const b = el.dataset.b, fingers = new Set();
    const update = () => { TOUCH[b] = fingers.size > 0; el.classList.toggle('on', fingers.size > 0); };
    el.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); fingers.add(e.pointerId); TOUCH_TAPS[b] = true; try { el.setPointerCapture(e.pointerId); } catch (_) {} update(); if (navigator.vibrate) navigator.vibrate(10); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => el.addEventListener(ev, e => { fingers.delete(e.pointerId); update(); }));
  });
  document.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
  document.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('gesturestart', e => e.preventDefault());
}
