// =====================================================================
//  CRYPTO BROS: Streets of the Lost Ledger — DREAD EXPERIMENT (game logic)
//  Explore 10 connected rooms, find SLIDE / DASH / TWIN JUMP, counter
//  enemies, escape the Ledger Auditor, beat the Rug Puller, find the Ledger.
// =====================================================================
const T = 32, RW = 20, RH = 11, GW = 640, GH = 360, ROOM_H = RH * T;
const Q = new URLSearchParams(location.search);
const DEBUG = Q.get('debug') === '1', BOT = Q.get('bot') === '1';
const CELL = {}; for (const k in ROOMS) CELL[ROOMS[k].cx + ',' + ROOMS[k].cy] = k;
const RUN = { team: null, ups: { slide: false, dash: false, twin: false }, got: {}, bossDown: false, save: START_ROOM, visited: {},
  chase: { active: false, counters: 0 }, deaths: 0, t0: 0, done: false, log: [] };
if (Q.get('bossdown') === '1') RUN.bossDown = true;
(Q.get('ups') || '').split(',').filter(Boolean).forEach(u => RUN.ups[u] = true);
const tx = s => ({ fontFamily: 'monospace', fontStyle: 'bold', fontSize: s + 'px', color: '#ffffff' });
const log = m => { RUN.log.push(Math.round(performance.now()) + ' ' + m); if (DEBUG) console.log('[dread]', m); };

// ---------------------------------------------------------------------
class Boot extends Phaser.Scene {
  constructor() { super('Boot'); }
  preload() { TEAMS.forEach(L => this.load.image('head_' + L.key, 'assets/head_' + L.key + '.png')); }
  create() {
    const t0 = performance.now(); makeDreadArt(this); addFrames(this); window.ART_MS = Math.round(performance.now() - t0);
    setupTouch();
    const pick = TEAMS.find(L => L.key === Q.get('pick'));
    if (pick) { RUN.team = pick; this.scene.start('Play'); } else this.scene.start('Title');
  }
}

// ---------------------------------------------------------------------
class Title extends Phaser.Scene {
  constructor() { super('Title'); }
  create() {
    this.pad = makePad(this); this.sel = 0;
    const g = this.add.graphics(); g.fillGradientStyle(LOOK.BG_TOP, LOOK.BG_TOP, LOOK.BG_BOTTOM, LOOK.BG_BOTTOM, 1); g.fillRect(0, 0, GW, GH);
    this.add.tileSprite(0, 0, GW, GH, 'bg_far').setOrigin(0).setTint(0x3fe0ff).setAlpha(0.6);
    this.add.text(GW / 2, 46, SETTINGS.TITLE_TEXT, tx(40)).setOrigin(0.5).setColor(SETTINGS.TITLE_COLOR).setShadow(0, 0, SETTINGS.TITLE_COLOR, 14, true, true);
    this.add.text(GW / 2, 84, SETTINGS.SUBTITLE_TEXT, tx(18)).setOrigin(0.5);
    this.add.text(GW / 2, 106, SETTINGS.EDITION_TEXT, tx(11)).setOrigin(0.5).setColor('#ff3d6e');
    this.add.text(GW / 2, 136, 'PICK YOUR TEAM', tx(12)).setOrigin(0.5).setColor('#9aa0b8');
    this.heroes = TEAMS.map((L, i) => {
      const x = 96 + i * 112, y = 220;
      const glow = this.add.image(x, y, 'glow').setTint(L.glow).setBlendMode('ADD').setScale(1.4).setAlpha(0.2);
      const h = this.add.image(x, y, 'hero_' + L.key, 'idle').setScale(1.5).setInteractive();
      const head = this.add.image(x, y - 33, 'head_' + L.key).setScale(1.5);
      const t = this.add.text(x, y + 60, L.team.toUpperCase(), tx(10)).setOrigin(0.5).setColor(Phaser.Display.Color.IntegerToColor(L.glow).rgba);
      this.add.text(x, y + 74, L.shot.name, tx(9)).setOrigin(0.5).setColor('#9aa0b8');
      h.on('pointerdown', () => { if (this.sel === i) this.go(); else { this.sel = i; Sound.select(); } });
      return { glow, h, head, t };
    });
    this.add.text(GW / 2, 336, IS_TOUCH ? 'TAP A TEAM, TAP AGAIN TO START' : '◀ ▶ CHOOSE    Z / ENTER START', tx(11)).setOrigin(0.5).setColor('#7fe9ff');
  }
  go() { if (this.started) return; this.started = true; RUN.team = TEAMS[this.sel]; Sound.select(); this.cameras.main.fadeOut(300); this.time.delayedCall(320, () => this.scene.start('Play')); }
  update(time) {
    const i = this.pad.read();
    if (i.pressed.left) { this.sel = (this.sel + 4) % 5; Sound.select(); }
    if (i.pressed.right) { this.sel = (this.sel + 1) % 5; Sound.select(); }
    if (i.pressed.jump || i.pressed.start || i.pressed.shoot) this.go();
    this.heroes.forEach((o, k) => { const on = k === this.sel; o.glow.setAlpha(on ? 0.55 + Math.sin(time / 200) * 0.15 : 0.12); o.h.setFrame(on ? (Math.floor(time / 400) % 2 ? 'idle' : 'idle2') : 'idle').setAlpha(on ? 1 : 0.55); o.head.setAlpha(on ? 1 : 0.55); });
  }
}

// ---------------------------------------------------------------------
class Play extends Phaser.Scene {
  constructor() { super('Play'); }
  create() {
    window.STAGE = this; window.RUN = RUN; RUN.t0 = this.time.now;
    this.pad = makePad(this); this.L = RUN.team;
    this.physics.world.gravity.y = SETTINGS.GRAVITY;
    // layers
    this.bgG = this.add.graphics().setDepth(0);
    this.far = this.add.tileSprite(0, 0, GW, GH, 'bg_far').setOrigin(0).setDepth(1);
    this.mid = this.add.tileSprite(0, 0, GW, GH, 'bg_mid').setOrigin(0).setDepth(2);
    this.tileG = this.add.graphics().setDepth(5);
    this.glowG = this.add.graphics().setDepth(6).setBlendMode('ADD');
    this.fxG = this.add.graphics().setDepth(30);
    this.add.image(0, 0, 'vignette').setOrigin(0).setScale(2).setDepth(50);
    this.solids = this.physics.add.staticGroup(); this.oneway = this.physics.add.staticGroup(); this.barriers = this.physics.add.staticGroup();
    this.foes = this.physics.add.group(); this.shots = this.physics.add.group({ allowGravity: false }); this.eshots = this.physics.add.group({ allowGravity: false });
    this.roomObjs = [];
    // player (invisible physics box) + what you see (body + NFT head)
    const p = this.player = this.physics.add.sprite(64, 280, 'hero_' + this.L.key, 'idle').setVisible(false);
    p.body.setSize(20, 50).setOffset(14, 14); p.body.setMaxVelocityY(900);
    Object.assign(p, { facing: 1, hp: SETTINGS.MAX_HP, inv: 0, nextShot: 0, slideUntil: 0, sliding: false, dashUntil: 0, airDash: true, jumps: 0, lastGround: 0, dropUntil: 0, hurtUntil: 0, shotAt: 0, punchAt: 0, counterCd: 0 });
    this.light = this.add.image(0, 0, 'glow').setBlendMode('ADD').setTint(this.L.glow).setScale(2.2).setAlpha(0.22).setDepth(9);
    this.hv = this.add.sprite(0, 0, 'hero_' + this.L.key, 'idle').setDepth(10);
    this.head = this.add.image(0, 0, 'head_' + this.L.key).setDepth(11);
    // collisions
    this.physics.add.collider(p, this.solids);
    this.physics.add.collider(p, this.oneway, null, (pl) => this.time.now > pl.dropUntil && pl.body.velocity.y >= 0);
    this.physics.add.collider(p, this.barriers, null, (pl, bar) => { if (this.time.now < pl.dashUntil) { this.breakBarriers(); return false; } return true; });
    this.physics.add.collider(this.foes, this.solids); this.physics.add.collider(this.foes, this.barriers); this.physics.add.collider(this.foes, this.oneway);
    this.physics.add.collider(this.shots, this.solids, s => this.killShot(s)); this.physics.add.collider(this.shots, this.barriers, s => this.killShot(s));
    this.physics.add.collider(this.eshots, this.solids, s => s.destroy());
    this.physics.add.overlap(this.shots, this.foes, (s, f) => { if (!s.active || f.dead) return; this.damageFoe(f, s.dmg, false); this.killShot(s); });
    this.physics.add.overlap(p, this.foes, (pl, f) => { if (!f.dead && !(f.stunUntil > this.time.now)) this.hurt(f.charging ? MINIBOSS.dmg + 1 : f.dmg, f.x); });
    this.physics.add.overlap(p, this.eshots, (pl, s) => { s.destroy(); this.hurt(2, s.x); });
    this.makeHud();
    this.bot = BOT ? { steps: [], i: 0, t: 0 } : null;
    this.loadRoom(Q.get('room') && ROOMS[Q.get('room')] ? Q.get('room') : RUN.save, 'spawn');
    Sound.music('explore');
  }

  // ===== ROOMS =====
  tile(c, r) { const R = this.R.rows; if (r < 0 || r >= RH || c < 0 || c >= RW) return '#'; return R[r][c]; }
  loadRoom(key, entry, keepPos) {
    this.roomObjs.forEach(o => o.destroy()); this.roomObjs = [];
    this.solids.clear(true, true); this.oneway.clear(true, true); this.barriers.clear(true, true);
    this.foes.clear(true, true); this.shots.clear(true, true); this.eshots.clear(true, true);
    this.key = key; this.R = ROOMS[key]; RUN.visited[key] = true; this.items = []; this.solidRects = []; this.boss = null; this.aud = null; this.shutter = null; this.saved = false;
    const R = this.R, zone = !!R.zone, edge = zone ? LOOK.ZONE_EDGE : LOOK.WALL_EDGE;
    // background
    this.bgG.clear(); const top = zone ? LOOK.ZONE_BG_TOP : LOOK.BG_TOP, bot = zone ? LOOK.ZONE_BG_BOTTOM : LOOK.BG_BOTTOM;
    this.bgG.fillGradientStyle(top, top, bot, bot, 1); this.bgG.fillRect(0, 0, GW, GH);
    this.far.setTint(zone ? 0xff3d6e : 0x3fe0ff).setAlpha(0.55); this.mid.setTint(zone ? 0xff7aa0 : 0x7f9cff).setAlpha(0.6);
    // tiles: merge runs of the same tile into one physics box per row
    const g = this.tileG, gg = this.glowG; g.clear(); gg.clear();
    for (let r = 0; r < RH; r++) {
      let c = 0;
      while (c < RW) {
        const ch = R.rows[r][c];
        if (ch === '#' || ch === '=' || (ch === 'D' && !RUN.got['bar_' + key])) {
          let c2 = c; while (c2 + 1 < RW && R.rows[r][c2 + 1] === ch) c2++;
          const x = c * T, y = r * T, w = (c2 - c + 1) * T, h = ch === '=' ? 10 : T;
          const z = this.add.zone(x + w / 2, y + h / 2, w, h);
          if (ch === '#') { this.solids.add(z); this.solidRects.push({ x, y, w, h }); }
          else if (ch === '=') { this.oneway.add(z); z.body.checkCollision.down = z.body.checkCollision.left = z.body.checkCollision.right = false; }
          else { this.barriers.add(z); this.solidRects.push({ x, y, w, h, bar: true }); }
          c = c2 + 1;
        } else c++;
      }
    }
    for (let r = 0; r < RH; r++) for (let c = 0; c < RW; c++) {
      const ch = R.rows[r][c], x = c * T, y = r * T;
      if (ch === '#') {
        g.fillStyle(LOOK.WALL, 1).fillRect(x, y, T, T);
        g.fillStyle(LOOK.WALL_LINE, 1).fillRect(x + 3, y + 3, T - 6, 2).fillRect(x + 3, y + T / 2, T - 6, 1);
        const open = (dc, dr) => this.tile(c + dc, r + dr) !== '#';
        if (open(0, -1)) { g.fillStyle(edge, 1).fillRect(x, y, T, 2); gg.fillStyle(edge, 0.18).fillRect(x, y - 3, T, 6); }
        if (open(0, 1)) g.fillStyle(edge, 0.5).fillRect(x, y + T - 1, T, 1);
        if (open(-1, 0)) { g.fillStyle(edge, 0.7).fillRect(x, y, 1, T); gg.fillStyle(edge, 0.10).fillRect(x - 2, y, 4, T); }
        if (open(1, 0)) { g.fillStyle(edge, 0.7).fillRect(x + T - 1, y, 1, T); gg.fillStyle(edge, 0.10).fillRect(x + T - 2, y, 4, T); }
      } else if (ch === '=') {
        g.fillStyle(0x2b3350, 1).fillRect(x, y, T, 8); g.fillStyle(edge, 1).fillRect(x, y, T, 2); g.fillStyle(0x10131f, 1).fillRect(x + 4, y + 4, 4, 2).fillRect(x + 20, y + 4, 4, 2);
      } else if (ch === 'D' && !RUN.got['bar_' + key]) {
        const bar = this.add.rectangle(x + T / 2, y + T / 2, T - 6, T, 0xff3d6e, 0.55).setDepth(7); const bl = this.add.image(x + T / 2, y + T / 2, 'glow').setTint(0xff3d6e).setBlendMode('ADD').setScale(0.8).setDepth(7);
        this.tweens.add({ targets: [bar, bl], alpha: 0.25, duration: 300, yoyo: true, repeat: -1 }); this.roomObjs.push(bar, bl);
      } else if (ch === 'L') {
        g.fillStyle(0x2b3350, 1).fillRect(x + 8, y, 16, 6); g.fillStyle(LOOK.LAMP, 1).fillRect(x + 10, y + 6, 12, 2);
        this.roomObjs.push(this.add.image(x + 16, y + 8, 'cone').setOrigin(0.5, 0).setTint(zone ? 0xff3d6e : LOOK.LAMP).setBlendMode('ADD').setAlpha(0.22).setDepth(4),
          this.add.image(x + 16, y + 8, 'glow').setTint(zone ? 0xff3d6e : LOOK.LAMP).setBlendMode('ADD').setScale(0.5).setAlpha(0.7).setDepth(6));
      } else if (ch === 'P') this.spawnPt = { x: x + 16, y: y + 6 };
      else if (ch === 'V') { this.spawnPt = { x: x + 16, y: y + 6 }; this.station = { x: x + 16, y: y + 12 };
        this.roomObjs.push(this.add.image(x + 16, y + 12, 'station').setDepth(8), this.add.image(x + 16, y, 'glow').setTint(0x3dff9a).setBlendMode('ADD').setScale(1.2).setAlpha(0.35).setDepth(7)); }
      else if (ch === 's' || ch === 'd') this.addItem(ch === 's' ? 'slide' : 'dash', x + 16, y + 10);
      else if (ch === 'G') this.addItem('goal', x + 16, y + 10);
      else if (ch === 'E') this.spawnCrawler(x + 16, y + 16);
      else if (ch === 'F') this.spawnFlyer(x + 16, y + 16);
      else if (ch === 'B' && !RUN.bossDown) this.spawnBoss(x + 16, y - 20);
    }
    if (R.boss && RUN.bossDown && !RUN.ups.twin) this.addItem('twin', 320, 300);
    if (!R.rows.some(row => row.includes('V'))) this.station = null;
    // zone banner + Auditor
    if (zone) {
      this.roomObjs.push(this.add.rectangle(GW / 2, GH / 2, GW - 4, GH - 4).setStrokeStyle(2, 0xff3d6e, 0.35).setDepth(49));
      if (RUN.chase.active) { const side = entry === 'L' ? GW + 40 : -40; this.time.delayedCall(SETTINGS.AUDITOR_FOLLOW_MS, () => { if (this.key === key && !this.aud) this.spawnAuditor(side, 140, 'chase'); }); }
      else if (R.auditor) this.spawnAuditor((R.auditor.x1 + R.auditor.x2) / 2, R.auditor.y, 'patrol');
      this.banner('AUDIT ZONE', '#ff3d6e');
    } else if (RUN.chase.active) { RUN.chase.active = false; Sound.music('explore'); this.banner('ESCAPED!', '#3dff9a'); log('escaped chase'); }
    this.roomName.setText(R.name).setAlpha(1); this.tweens.add({ targets: this.roomName, alpha: 0, delay: 1800, duration: 600 });
    log('room ' + key);
    if (this.bot) { this.bot.steps = botPlan(key); this.bot.i = 0; this.bot.t = this.time.now; }
  }
  addItem(kind, x, y) {
    if (kind !== 'goal' && (RUN.ups[kind])) return;
    const col = kind === 'goal' ? 0xffd34d : UPGRADES[kind].color;
    const spr = this.add.image(x, y, kind === 'goal' ? 'ledger' : 'orb').setDepth(8).setTint(kind === 'goal' ? 0xffffff : col);
    const gl = this.add.image(x, y, 'glow').setTint(col).setBlendMode('ADD').setScale(kind === 'goal' ? 2 : 1.2).setAlpha(0.6).setDepth(7);
    const lab = this.add.text(x, y - 30, kind === 'goal' ? 'THE LOST LEDGER' : '?', tx(9)).setOrigin(0.5).setDepth(8).setColor('#ffffff');
    this.tweens.add({ targets: [spr, gl], y: y - 6, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.roomObjs.push(spr, gl, lab); this.items.push({ kind, spr, gl, lab });
  }
  breakBarriers() {
    if (RUN.got['bar_' + this.key]) return; RUN.got['bar_' + this.key] = true;
    this.barriers.clear(true, true); this.solidRects = this.solidRects.filter(r => !r.bar);
    this.roomObjs.forEach(o => { if (o.fillColor === 0xff3d6e || (o.tintTopLeft === 0xff3d6e && o.texture && o.texture.key === 'glow')) o.setVisible(false); });
    this.cameras.main.shake(200, 0.01); Sound.counter(); this.burst(96, 270, 0xff3d6e, 24); this.banner('BARRIER SMASHED', '#ff3d6e'); log('barrier broken');
  }
  nextRoom(dx, dy) {
    const k = CELL[(this.R.cx + dx) + ',' + (this.R.cy + dy)]; if (!k) return false;
    const p = this.player, vx = p.body.velocity.x, vy = p.body.velocity.y;
    this.loadRoom(k, dx < 0 ? 'R' : dx > 0 ? 'L' : dy > 0 ? 'T' : 'B');
    if (dx < 0) p.x = GW - 12; if (dx > 0) p.x = 12; if (dy > 0) p.y = 6; if (dy < 0) p.y = ROOM_H - 14;
    p.body.reset(p.x, p.y); p.body.setVelocity(vx, dy < 0 ? -640 : vy);
    return true;
  }

  // ===== ENEMIES =====
  spawnCrawler(x, y) { const f = this.foes.create(x, y, 'crawler', 0); f.body.setSize(36, 24).setOffset(4, 8); Object.assign(f, { kind: 'crawler', hp: ENEMIES.crawler.hp, dmg: ENEMIES.crawler.dmg, dir: -1, state: 'walk', st: 0 }); }
  spawnFlyer(x, y) { const f = this.foes.create(x, y, 'flyer'); f.body.setAllowGravity(false); f.body.setSize(28, 18); Object.assign(f, { kind: 'flyer', hp: ENEMIES.flyer.hp, dmg: ENEMIES.flyer.dmg, hy: y, state: 'fly' }); }
  spawnBoss(x, y) {
    const b = this.boss = this.foes.create(x, y, 'boss', 0); b.body.setSize(46, 72).setOffset(14, 12);
    Object.assign(b, { kind: 'boss', hp: MINIBOSS.hp, dmg: MINIBOSS.dmg, state: 'sleep', st: 0, dir: 1 });
    b.bar = this.add.graphics().setDepth(60); this.roomObjs.push(b.bar);
  }
  spawnAuditor(x, y, state) {
    const a = this.aud = this.add.sprite(x, y, 'auditor', 0).setDepth(12); a.state = state; a.st = this.time.now; a.dir = 1; a.stunUntil = 0;
    a.light = this.add.image(x, y, 'glow').setTint(0xff3d6e).setBlendMode('ADD').setScale(1.6).setAlpha(0.4).setDepth(11);
    a.ring = this.add.graphics().setDepth(11); this.roomObjs.push(a, a.light, a.ring);
    if (state === 'chase') { this.banner('THE AUDITOR FOLLOWED YOU', '#ff3d6e'); Sound.alarm(); }
    log('auditor ' + state);
  }
  damageFoe(f, d, counter) {
    if (f.dead) return; f.hp -= d; Sound.hit(); f.setTintFill(0xffffff); this.time.delayedCall(60, () => f.active && f.clearTint());
    this.burst(f.x, f.y, counter ? 0xffd34d : this.L.glow, counter ? 18 : 5);
    if (f.hp <= 0) {
      f.dead = true; this.burst(f.x, f.y, 0xff3d6e, 30); this.cameras.main.shake(f.kind === 'boss' ? 500 : 120, f.kind === 'boss' ? 0.02 : 0.006);
      if (f.kind === 'boss') { RUN.bossDown = true; log('boss down'); this.banner(MINIBOSS.name + ' DOWN!', '#ffd34d'); Sound.music('explore'); if (this.shutter) { this.shutter.forEach(o => o.destroy()); this.shutter = null; } this.time.delayedCall(700, () => this.addItem('twin', 320, 300)); }
      f.destroy();
    }
  }
  updateFoes(time, dt) {
    const p = this.player;
    this.foes.getChildren().forEach(f => {
      if (f.dead) return;
      const dx = p.x - f.x, adx = Math.abs(dx), stunned = f.stunUntil > time;
      if (f.kind === 'crawler') {
        const C = ENEMIES.crawler;
        if (stunned) { f.body.setVelocityX(0); f.setAngle(Math.sin(time / 40) * 8); return; } f.setAngle(0);
        if (f.state === 'walk') {
          if (f.body.blocked.left) f.dir = 1; if (f.body.blocked.right) f.dir = -1;
          const ahead = this.tile(Math.floor((f.x + f.dir * 20) / T), Math.floor((f.y + 20) / T)); if (ahead === '.' || ahead === undefined) f.dir *= -1;
          f.body.setVelocityX(f.dir * C.speed); f.setFrame(Math.floor(time / 150) % 2).setFlipX(f.dir < 0);
          if (adx < 140 && Math.abs(p.y - f.y) < 50 && Math.sign(dx) === f.dir && time > f.st) { f.state = 'tele'; f.st = time + C.tele; f.body.setVelocityX(0); Sound.tele(); }
        } else if (f.state === 'tele') { if (time > f.st) { f.state = 'lunge'; f.st = time + 320; f.charging = true; f.body.setVelocity(f.dir * 330, -180); } }
        else if (f.state === 'lunge') { if (time > f.st) { f.state = 'walk'; f.charging = false; f.st = time + 900; } }
      } else if (f.kind === 'flyer') {
        f.body.setVelocity(Math.sign(dx) * ENEMIES.flyer.speed * (adx > 20 ? 1 : 0), (f.hy + Math.sin(time / 300) * 40 - f.y) * 3); f.setFlipX(dx < 0);
      } else if (f.kind === 'boss') this.updateBoss(f, time, dx, adx);
    });
    // Ledger Auditor
    const a = this.aud; if (!a || this.dying) return;
    const d = Phaser.Math.Distance.Between(a.x, a.y, p.x, p.y - 10);
    a.setFrame(a.state === 'chase' ? 1 : 0); a.ring.clear();
    if (time < a.stunUntil) { a.y += Math.sin(time / 30) * 0.6; a.setAlpha(0.6); }
    else if (a.state === 'patrol') {
      a.setAlpha(1); const P = this.R.auditor; a.x += a.dir * 60 * dt; if (a.x > P.x2) a.dir = -1; if (a.x < P.x1) a.dir = 1; a.y = P.y + Math.sin(time / 400) * 8;
      const rr = SETTINGS.AUDITOR_DETECT; a.ring.lineStyle(1, 0xff3d6e, 0.25 + 0.2 * Math.sin(time / 150)).strokeCircle(a.x, a.y, rr);
      if (d < rr) { a.state = 'chase'; a.st = time; RUN.chase.active = true; RUN.chase.counters = SETTINGS.AUDITOR_COUNTERS; Sound.alarm(); Sound.music('chase'); this.banner('DETECTED — RUN! LEAVE THE ZONE', '#ff3d6e'); this.cameras.main.flash(150, 255, 40, 80); log('auditor detected player'); }
    } else if (a.state === 'chase') {
      a.setAlpha(1); RUN.chase.active = true; if (Sound.mode !== 'chase') Sound.music('chase');
      const sp = Math.min(SETTINGS.AUDITOR_MAX_SPEED, SETTINGS.AUDITOR_START_SPEED + (time - a.st) / 1000 * 50);
      const ang = Math.atan2(p.y - 14 - a.y, p.x - a.x); a.x += Math.cos(ang) * sp * dt; a.y += Math.sin(ang) * sp * dt; a.setFlipX(p.x < a.x);
      if (d < 30 && !this.caught && time > p.inv) { this.caught = { t: time }; p.body.setVelocity(0, 0); p.body.moves = false; Sound.alarm(); log('caught by auditor'); }
    }
    a.light.setPosition(a.x, a.y);
  }
  updateBoss(b, time, dx, adx) {
    const p = this.player, M = MINIBOSS;
    b.bar.clear(); if (b.state !== 'sleep') { b.bar.fillStyle(0x000000, 0.6).fillRect(170, 330, 300, 10); b.bar.fillStyle(0xff3d6e, 1).fillRect(171, 331, 298 * Math.max(0, b.hp) / M.hp, 8); }
    if (b.stunUntil > time) { b.body.setVelocityX(0); b.setAngle(Math.sin(time / 40) * 3); return; } b.setAngle(0);
    b.setFlipX(b.dir < 0);
    if (b.state === 'sleep') { if (p.x < 560) { b.state = 'walk'; b.st = time + 1200; this.closeShutter(); this.banner(M.name, '#ff3d6e'); Sound.music('chase'); log('boss start'); } return; }
    if (b.state !== 'charge') b.dir = Math.sign(dx) || 1;
    if (b.state === 'walk') { b.body.setVelocityX(adx > 120 ? b.dir * 70 : 0); b.setFrame(Math.floor(time / 250) % 2); if (time > b.st) { b.state = 'shoot'; b.st = time + 900; b.shots = 0; } }
    else if (b.state === 'shoot') {
      b.body.setVelocityX(0);
      if (time > b.st - 900 + b.shots * 280 && b.shots < 3) { b.shots++; const s = this.eshots.create(b.x + b.dir * 30, b.y - 4, 'eshot'); const ang = Math.atan2(p.y - 10 - b.y, p.x - b.x); s.body.setVelocity(Math.cos(ang) * 260, Math.sin(ang) * 260); this.time.delayedCall(2500, () => s.active && s.destroy()); Sound.shoot(); }
      if (time > b.st) { b.state = 'tele'; b.st = time + M.tele; Sound.tele(); }
    } else if (b.state === 'tele') { b.body.setVelocityX(0); if (time > b.st) { b.state = 'charge'; b.charging = true; b.st = time + 1000; b.body.setVelocityX(b.dir * 380); } }
    else if (b.state === 'charge') {
      b.body.setVelocityX(b.dir * 380);
      if (time > b.st || b.body.blocked.left || b.body.blocked.right) { b.state = 'walk'; b.charging = false; b.st = time + 1400; this.cameras.main.shake(120, 0.008); }
    }
  }
  closeShutter() {
    const z = this.add.zone(GW - 16, 7 * T + 48, T, 96); this.solids.add(z); this.solidRects.push({ x: GW - T, y: 7 * T, w: T, h: 96 });
    const v = this.add.rectangle(GW - 16, 7 * T + 48, T - 4, 96, 0xff3d6e, 0.6).setDepth(7);
    this.shutter = [z, v]; this.roomObjs.push(v);
  }

  // ===== PLAYER =====
  ceilingAbove() { const b = this.player.body, x = b.x, y = b.bottom - 50; return this.solidRects.some(r => x + 20 > r.x && x < r.x + r.w && y < r.y + r.h && b.bottom - 22 > r.y); }
  startSlide() { const p = this.player; p.sliding = true; p.slideUntil = this.time.now + SETTINGS.SLIDE_MS; p.body.setSize(20, 22).setOffset(14, 42); Sound.slide(); }
  stand() { const p = this.player; p.sliding = false; p.body.setSize(20, 50).setOffset(14, 14); }
  fire(up) {
    const p = this.player, S = this.L.shot, time = this.time.now; p.nextShot = time + S.rate; p.shotAt = time; Sound.shoot();
    const mk = (vx, vy) => { const s = this.shots.create(p.x + (up ? 0 : p.facing * 18), p.y + (up ? -40 : -6), S.big ? 'shotbig' : 'shot'); s.setTint(this.L.glow).setBlendMode('ADD'); s.body.setVelocity(vx, vy); s.dmg = S.dmg; s.setAngle(up ? 90 : 0); s.life = time + 700; };
    if (up) { mk(0, -S.speed); if (S.spread) { mk(-90, -S.speed); mk(90, -S.speed); } }
    else { mk(p.facing * S.speed, 0); if (S.spread) { mk(p.facing * S.speed, -110); mk(p.facing * S.speed, 110); } }
  }
  killShot(s) { if (!s.active) return; this.burst(s.x, s.y, this.L.glow, 3); s.destroy(); }
  doCounter() {
    const p = this.player, time = this.time.now; if (time < p.counterCd) return; p.punchAt = time;
    if (this.caught) {
      if (RUN.chase.counters > 0) { RUN.chase.counters--; const a = this.aud; this.caught = null; p.body.moves = true; a.stunUntil = time + 2000; a.x += (a.x < p.x ? -140 : 140); p.inv = time + 1500;
        this.counterFx('BROKE FREE!'); log('countered auditor'); }
      return;
    }
    const tgt = this.foes.getChildren().find(f => !f.dead && f.state === 'tele' && Math.abs(f.x - p.x) < SETTINGS.COUNTER_RANGE + (f.kind === 'boss' ? 20 : 0) && Math.abs(f.y - p.y) < 80);
    if (tgt) { p.facing = Math.sign(tgt.x - p.x) || p.facing; tgt.state = tgt.kind === 'boss' ? 'walk' : 'walk'; tgt.st = time + 1800; tgt.charging = false; tgt.stunUntil = time + (tgt.kind === 'boss' ? 1600 : 900);
      tgt.body.setVelocityX(0); this.damageFoe(tgt, SETTINGS.COUNTER_DAMAGE * (RUN.team.key === 'red' ? 1.2 : 1), true); this.counterFx('COUNTER!'); RUN.counters = (RUN.counters || 0) + 1; log('counter ' + tgt.kind); }
    else { p.counterCd = time + 350; Sound.whiff(); this.foes.getChildren().forEach(f => { if (!f.dead && Math.abs(f.x - (p.x + p.facing * 24)) < 30 && Math.abs(f.y - p.y) < 40) this.damageFoe(f, 1, false); }); }
  }
  counterFx(msg) {
    Sound.counter(); this.cameras.main.flash(120, 255, 255, 255); this.cameras.main.shake(160, 0.012);
    this.physics.world.timeScale = 3; this.tweens.timeScale = 0.35; setTimeout(() => { this.physics.world.timeScale = 1; this.tweens.timeScale = 1; }, SETTINGS.COUNTER_SLOWMO_MS);
    this.banner(msg, '#ffd34d');
  }
  hurt(d, fromX) {
    const p = this.player, time = this.time.now; if (time < p.inv || this.dying || DEBUG && Q.get('god') === '1') return;
    p.hp -= d; p.inv = time + SETTINGS.HURT_INVULN_MS; p.hurtUntil = time + 250; Sound.hurt(); this.cameras.main.shake(100, 0.006);
    p.dashUntil = 0; p.body.setAllowGravity(true); p.body.setVelocity((p.x < fromX ? -1 : 1) * 220, -220); log('hurt ' + d + ' hp ' + p.hp);
    if (p.hp <= 0) this.die('YOU GOT REKT');
  }
  die(msg) {
    if (this.dying) return; this.dying = true; RUN.deaths++; log('died: ' + msg); this.caught = null;
    this.banner(msg, '#ff3d6e'); this.cameras.main.fadeOut(700, 0, 0, 0);
    this.time.delayedCall(800, () => {
      const p = this.player; p.hp = SETTINGS.MAX_HP; p.body.moves = true; RUN.chase.active = false; this.stand(); p.dashUntil = 0; p.body.setAllowGravity(true);
      this.loadRoom(RUN.save, 'spawn'); const s = this.spawnPt || { x: 64, y: 280 }; p.body.reset(s.x, s.y); p.inv = this.time.now + 1500;
      Sound.music('explore'); this.dying = false; this.cameras.main.fadeIn(400);
    });
  }

  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000, p = this.player, b = p.body;
    if (this.bot) botThink(this, time);
    const inp = this.pad.read();
    if (this.done) { if (inp.pressed.start || inp.pressed.jump) location.reload(); return; }
    if (inp.pressed.map) this.toggleMap();
    if (this.mapOpen) return;
    if (this.dying) return;
    // caught by the Auditor: tiny window to counter
    if (this.caught) {
      const left = SETTINGS.AUDITOR_CATCH_MS - (time - this.caught.t); this.fxG.clear();
      const can = RUN.chase.counters > 0;
      this.fxG.lineStyle(3, can ? 0xffd34d : 0xff3d6e, 1).strokeCircle(p.x, p.y - 10, 14 + 50 * Math.max(0, left) / SETTINGS.AUDITOR_CATCH_MS);
      this.prompt.setText(can ? 'COUNTER!' : 'CAUGHT').setPosition(p.x, p.y - 70).setVisible(Math.floor(time / 60) % 2 === 0);
      if (inp.pressed.counter) this.doCounter();
      if (this.caught && left <= 0) { this.prompt.setVisible(false); p.body.moves = true; this.die('AUDITED.'); }
      this.drawPlayer(time, true); this.updateHud(time); return;
    }
    const onGround = b.blocked.down || b.touching.down;
    if (onGround) { p.lastGround = time; p.jumps = 0; p.airDash = true; }
    const lr = (inp.held.right ? 1 : 0) - (inp.held.left ? 1 : 0), ctrl = time > p.hurtUntil;
    const dashing = time < p.dashUntil;
    if (dashing) { b.setVelocity(p.facing * SETTINGS.DASH_SPEED, 0); if (Math.floor(time / 30) !== this.lastAfter) { this.lastAfter = Math.floor(time / 30); this.afterImage(); } }
    else {
      if (!b.allowGravity) b.setAllowGravity(true);
      if (p.sliding) {
        b.setVelocityX(p.facing * SETTINGS.SLIDE_SPEED);
        if (time > p.slideUntil && !this.ceilingAbove()) this.stand();
        else if (!onGround && !this.ceilingAbove() && time > p.slideUntil - SETTINGS.SLIDE_MS + 120) this.stand();
      } else if (ctrl) { b.setVelocityX(lr * SETTINGS.RUN_SPEED); if (lr) p.facing = lr; }
    }
    if (ctrl && !dashing) {
      if (inp.pressed.jump) {
        const onOne = onGround && this.oneway.getChildren().some(z => Math.abs(z.body.top - b.bottom) < 4 && b.right > z.body.left && b.x < z.body.right);
        if (inp.held.down && onOne) p.dropUntil = time + 250;
        else if (p.sliding) { if (!this.ceilingAbove()) { this.stand(); b.setVelocityY(-SETTINGS.JUMP_SPEED); Sound.jump(); } }
        else if (onGround || time - p.lastGround < 90) { b.setVelocityY(-SETTINGS.JUMP_SPEED); p.lastGround = 0; Sound.jump(); }
        else if (RUN.ups.twin && p.jumps < 1) { p.jumps++; b.setVelocityY(-SETTINGS.DOUBLE_JUMP_SPEED); Sound.jump(); this.burst(p.x, b.bottom, 0xffd34d, 8); }
      }
      if (!inp.held.jump && b.velocity.y < -220 && !p.sliding) b.setVelocityY(-220);   // short hop when you let go early
      if (inp.pressed.slide && RUN.ups.slide && onGround && !p.sliding) this.startSlide();
      if (inp.pressed.dash && RUN.ups.dash && !p.sliding && (onGround || p.airDash)) { if (!onGround) p.airDash = false; if (lr) p.facing = lr; p.dashUntil = time + SETTINGS.DASH_MS; b.setAllowGravity(false); Sound.dash(); }
      if (inp.held.shoot && time > p.nextShot && !p.sliding) this.fire(inp.held.up && !lr);
      if (inp.pressed.counter && !p.sliding) this.doCounter();
    }
    // shots expire
    this.shots.getChildren().forEach(s => { if (time > s.life) s.destroy(); else if (this.aud && Phaser.Math.Distance.Between(s.x, s.y, this.aud.x, this.aud.y) < 24) { this.burst(s.x, s.y, 0xffffff, 3); s.destroy(); } });
    this.updateFoes(time, dt);
    // items / save station / goal
    this.items.forEach(it => { if (it.taken || Math.abs(it.spr.x - p.x) > 24 || Math.abs(it.spr.y - (p.y - 8)) > 40) return; it.taken = true; [it.spr, it.gl, it.lab].forEach(o => o.setVisible(false));
      if (it.kind === 'goal') return this.finish();
      RUN.ups[it.kind] = true; Sound.item(); this.burst(p.x, p.y, UPGRADES[it.kind].color, 30); this.banner(UPGRADES[it.kind].name + '!', '#ffd34d', UPGRADES[it.kind].tip); log('got ' + it.kind); });
    if (this.station && !this.saved && onGround && Math.abs(p.x - this.station.x) < 20) { this.saved = true; RUN.save = this.key; p.hp = SETTINGS.MAX_HP; Sound.item(); this.banner('PROGRESS SAVED', '#3dff9a', 'Health refilled'); log('saved at ' + this.key);
      try { localStorage.setItem('cb_dread_save', JSON.stringify({ room: this.key, ups: RUN.ups, boss: RUN.bossDown })); } catch (e) {} }
    // room exits
    if (p.x < 0 && this.nextRoom(-1, 0)) return; if (p.x > GW && this.nextRoom(1, 0)) return;
    if (p.y > ROOM_H + 10 && this.nextRoom(0, 1)) return; if (p.y < 16 && b.velocity.y < 0 && this.nextRoom(0, -1)) return;
    if (p.y > ROOM_H + 60) this.die('FELL');
    this.drawPlayer(time, onGround);
    this.updateHud(time);
  }
  afterImage() { const g = this.add.image(this.hv.x, this.hv.y, this.hv.texture.key, this.hv.frame.name).setFlipX(this.hv.flipX).setTintFill(0xff3d6e).setAlpha(0.5).setDepth(9).setBlendMode('ADD'); this.tweens.add({ targets: g, alpha: 0, duration: 220, onComplete: () => g.destroy() }); }
  drawPlayer(time, onGround) {
    const p = this.player, b = p.body, hv = this.hv, f = p.facing;
    let fr = 'idle';
    if (time < p.hurtUntil) fr = 'hurt'; else if (time - p.punchAt < 180) fr = 'punch'; else if (!onGround) fr = b.velocity.y < 0 ? 'jump' : 'fall';
    else if (Math.abs(b.velocity.x) > 10) fr = 'run' + (1 + Math.floor(time / 70) % 6); else fr = Math.floor(time / 450) % 2 ? 'idle' : 'idle2';
    if (time - p.shotAt < 160 && fr !== 'hurt') fr = 'shoot';
    const cx = b.x + 10, blink = time < p.inv && Math.floor(time / 70) % 2 ? 0.35 : 1;
    if (p.sliding) { hv.setFrame('run1').setPosition(cx, b.bottom - 12).setAngle(-80 * f).setFlipX(f < 0); this.head.setPosition(cx - 22 * f, b.bottom - 16).setAngle(-80 * f); }
    else { const bob = ({ idle2: 1, run2: 1, run3: -1, run5: 1, run6: -1 })[fr] || 0; hv.setFrame(fr).setPosition(cx, b.bottom - 32).setAngle(0).setFlipX(f < 0); this.head.setPosition(cx + (fr === 'punch' ? 3 : fr.startsWith('run') ? 2 : 0) * f, b.bottom - 51 + bob).setAngle(0); }
    this.head.setFlipX(f < 0); hv.setAlpha(blink); this.head.setAlpha(blink);
    this.light.setPosition(cx, b.bottom - 30);
    this.far.tilePositionX = cx * 0.08; this.mid.tilePositionX = cx * 0.25;
    // counter prompts on enemies that are about to attack
    if (!this.caught) {
      this.fxG.clear(); let shown = false;
      this.foes.getChildren().forEach(e => { if (e.dead || e.state !== 'tele') return; const k = (e.st - time) / (e.kind === 'boss' ? MINIBOSS.tele : ENEMIES.crawler.tele);
        e.setTintFill(Math.floor(time / 60) % 2 ? 0xffffff : 0xffd34d); this.fxG.lineStyle(3, 0xffd34d, 1).strokeCircle(e.x, e.y - 6, 12 + 40 * Math.max(0, k));
        if (!shown) { shown = true; this.prompt.setText('!').setPosition(e.x, e.y - 52).setVisible(true); } });
      this.foes.getChildren().forEach(e => { if (!e.dead && e.state !== 'tele' && e.isTinted && !(e.flashT > time)) e.clearTint(); });
      if (!shown) this.prompt.setVisible(false);
    }
  }
  burst(x, y, col, n) {
    for (let i = 0; i < n; i++) { const s = this.add.image(x, y, 'px').setTint(col).setBlendMode('ADD').setDepth(31); const a = Math.random() * 6.28, sp = 30 + Math.random() * 90;
      this.tweens.add({ targets: s, x: x + Math.cos(a) * sp, y: y + Math.sin(a) * sp, alpha: 0, scale: 0.3, duration: 300 + Math.random() * 200, onComplete: () => s.destroy() }); }
  }

  // ===== HUD / MAP =====
  makeHud() {
    this.hud = this.add.graphics().setDepth(60);
    this.hpText = this.add.text(12, 8, '', tx(10)).setDepth(61).setColor(LOOK.HUD);
    this.upText = this.add.text(12, 34, '', tx(9)).setDepth(61);
    this.add.image(GW - 112, 16, 'head_' + this.L.key).setScale(0.6).setDepth(61);
    this.roomName = this.add.text(GW / 2, 316, '', tx(14)).setOrigin(0.5).setDepth(61).setColor(LOOK.HUD).setShadow(0, 0, LOOK.HUD, 8, true, true);
    this.bannerT = this.add.text(GW / 2, 90, '', tx(20)).setOrigin(0.5).setDepth(62).setShadow(0, 0, '#000', 6, true, true).setAlpha(0);
    this.tipT = this.add.text(GW / 2, 116, '', tx(11)).setOrigin(0.5).setDepth(62).setAlpha(0);
    this.prompt = this.add.text(0, 0, '!', tx(22)).setOrigin(0.5).setDepth(62).setColor('#ffd34d').setShadow(0, 0, '#ffd34d', 10, true, true).setVisible(false);
    this.mapLayer = this.add.container(0, 0).setDepth(80).setVisible(false);
  }
  banner(msg, col, tip) {
    this.bannerT.setText(msg).setColor(col || '#fff').setShadow(0, 0, col || '#fff', 12, true, true).setAlpha(1).setScale(1.3); this.tweens.killTweensOf(this.bannerT);
    this.tweens.add({ targets: this.bannerT, scale: 1, duration: 200 }); this.tweens.add({ targets: this.bannerT, alpha: 0, delay: 1600, duration: 400 });
    this.tipT.setText(tip || '').setAlpha(tip ? 1 : 0); this.tweens.killTweensOf(this.tipT); if (tip) this.tweens.add({ targets: this.tipT, alpha: 0, delay: 2600, duration: 400 });
  }
  updateHud(time) {
    const g = this.hud, p = this.player; g.clear();
    g.fillStyle(0x000000, 0.45).fillRoundedRect(6, 4, 210, 44, 6);
    for (let i = 0; i < SETTINGS.MAX_HP; i++) g.fillStyle(i < p.hp ? (p.hp <= 6 ? 0xff3d6e : 0x3fe0ff) : 0x2a2d40, 1).fillRect(12 + i * 10, 22, 8, 8);
    this.hpText.setText('HP ' + Math.max(0, p.hp) + '   ' + this.L.shot.name);
    this.upText.setText(['slide', 'dash', 'twin'].map(k => (RUN.ups[k] ? '■ ' : '□ ') + UPGRADES[k].name.replace('LEDGER ', '')).join('  ')).setColor(RUN.ups.twin ? '#ffd34d' : '#9aa0b8');
    // minimap (top-right)
    const mx = GW - 92, my = 6, cw = 16, ch = 10; g.fillStyle(0x000000, 0.5).fillRoundedRect(mx - 4, my - 2, 5 * (cw + 1) + 8, 3 * (ch + 1) + 6, 4);
    for (const k in ROOMS) { const R = ROOMS[k]; if (!RUN.visited[k]) continue; const x = mx + R.cx * (cw + 1), y = my + 2 + R.cy * (ch + 1);
      g.fillStyle(k === this.key ? (Math.floor(time / 300) % 2 ? 0xffffff : 0x7fe9ff) : R.zone ? 0x8a1f40 : 0x24507a, 1).fillRect(x, y, cw, ch); }
    if (RUN.chase.active) { g.fillStyle(0xff3d6e, 0.12 + 0.08 * Math.sin(time / 90)).fillRect(0, 0, GW, GH); }
  }
  toggleMap() {
    this.mapOpen = !this.mapOpen; const L = this.mapLayer; L.removeAll(true); L.setVisible(this.mapOpen);
    if (this.mapOpen) {
      this.physics.pause(); const g = this.add.graphics(); L.add(g); g.fillStyle(0x05060d, 0.92).fillRect(0, 0, GW, GH);
      L.add(this.add.text(GW / 2, 28, 'MAP  —  STREETS OF THE LOST LEDGER', tx(14)).setOrigin(0.5).setColor(LOOK.HUD));
      const cw = 96, ch = 56, ox = GW / 2 - 2.5 * cw, oy = 60;
      for (const k in ROOMS) { const R = ROOMS[k], x = ox + R.cx * cw, y = oy + R.cy * ch, seen = RUN.visited[k];
        g.fillStyle(!seen ? 0x111522 : k === this.key ? 0x2a6a9a : R.zone ? 0x5a1430 : 0x1c2d4a, 1).fillRect(x + 2, y + 2, cw - 4, ch - 4);
        g.lineStyle(2, k === this.key ? 0xffffff : R.zone ? 0xff3d6e : 0x3fe0ff, seen ? 1 : 0.25).strokeRect(x + 2, y + 2, cw - 4, ch - 4);
        if (seen) { L.add(this.add.text(x + cw / 2, y + 18, R.name, tx(7)).setOrigin(0.5).setWordWrapWidth(cw - 8));
          const icon = R.rows.some(r => r.includes('V')) ? 'SAVE' : R.boss ? (RUN.bossDown ? 'BOSS ✓' : 'BOSS') : R.zone ? 'AUDIT' : R.rows.some(r => /[sdG]/.test(r)) ? '★' : '';
          L.add(this.add.text(x + cw / 2, y + 36, icon, tx(9)).setOrigin(0.5).setColor(R.zone ? '#ff3d6e' : '#ffd34d')); }
        else L.add(this.add.text(x + cw / 2, y + ch / 2, '?', tx(12)).setOrigin(0.5).setColor('#333a55')); }
      L.add(this.add.text(GW / 2, 340, 'UPGRADES: ' + ['slide', 'dash', 'twin'].filter(k => RUN.ups[k]).map(k => UPGRADES[k].name).join(', ') + (Object.values(RUN.ups).some(v => v) ? '' : 'none yet') + '     MAP = close', tx(10)).setOrigin(0.5).setColor('#9aa0b8'));
    } else this.physics.resume();
  }
  finish() {
    this.done = true; RUN.done = true; window.DREAD_DONE = true; Sound.item(); Sound.stopMusic(); log('goal reached');
    const secs = Math.round((this.time.now - RUN.t0) / 1000);
    this.add.rectangle(GW / 2, GH / 2, GW, GH, 0x000000, 0.8).setDepth(90);
    this.add.text(GW / 2, 110, 'YOU FOUND THE LOST LEDGER!', tx(22)).setOrigin(0.5).setDepth(91).setColor('#ffd34d').setShadow(0, 0, '#ffd34d', 14, true, true);
    this.add.text(GW / 2, 170, `TEAM ${this.L.team.toUpperCase()}   TIME ${secs}s   DEATHS ${RUN.deaths}   COUNTERS ${RUN.counters || 0}`, tx(11)).setOrigin(0.5).setDepth(91);
    this.add.text(GW / 2, 210, 'Dread Experiment test area complete.\nCompare it with the Mega Man X preview!', tx(11)).setOrigin(0.5).setDepth(91).setAlign('center').setColor('#7fe9ff');
    this.add.text(GW / 2, 280, 'JUMP / START to play again', tx(10)).setOrigin(0.5).setDepth(91).setColor('#9aa0b8');
  }
}

// =====================================================================
//  TEST BOT (?bot=1): plays the route automatically so we can test it.
// =====================================================================
function botPlan(room) {
  const u = RUN.ups;
  switch (room) {
    case 'start': return [{ go: 700 }];
    case 'hub': return u.slide ? [{ go: 440 }, { tap: 'slide' }, { go: 700 }] : [{ go: 128 }];
    case 'lab': return u.slide ? [{ go: 128 }, { climb: 1 }] : [{ go: 400 }, { go: 128 }, { climb: 1 }];
    case 'zoneA': return [{ go: 700 }];
    case 'zoneB': return [{ go: 196 }, { tap: 'slide' }, { go: 700 }];
    case 'save': return [{ go: 304 }, { wait: 600 }, { go: 512 }];
    case 'barrier': return u.dash ? [{ go: 210 }, { tap: 'dash' }, { go: -60 }] : [{ wait: 99999 }];
    case 'arena': return [{ go: 540 }, { fight: 1 }, { wait: 900 }, { go: 320 }, { go: 210 }, { dj: -1 }, { go: -60 }];
    case 'shaft': return [{ go: 128 }];
    case 'vault': return [{ go: 464 }];
  }
  return [];
}
function botThink(S, time) {
  const B = S.bot, p = S.player, b = p.body; for (const k in BOTIN) BOTIN[k] = false;
  if (S.dying || S.done) return;
  const tap = k => { if (!B.lastTap || B.lastTap[k] !== B.frame - 1) { BOTIN[k] = true; B.lastTap = B.lastTap || {}; B.lastTap[k] = B.frame; } }; B.frame = (B.frame || 0) + 1;
  // reflexes: counter attacks / grabs, shoot nearby enemies
  if (S.caught) { if (time - S.caught.t > 120) tap('counter'); return; }
  const tele = S.foes.getChildren().find(f => !f.dead && f.state === 'tele' && Math.abs(f.y - p.y) < 80);
  if (tele) { const dx = tele.x - p.x; if (Math.abs(dx) < SETTINGS.COUNTER_RANGE - 15) { if (Math.sign(dx) !== p.facing) BOTIN[dx > 0 ? 'right' : 'left'] = true; else tap('counter'); } else BOTIN[dx > 0 ? 'right' : 'left'] = true; return; }
  const foe = S.foes.getChildren().find(f => !f.dead && Math.abs(f.x - p.x) < 330 && Math.abs(f.y - p.y) < 60 && Math.sign(f.x - p.x) === p.facing);
  if (foe && !p.sliding) BOTIN.shoot = (B.frame % 2) === 0;
  const st = B.steps[B.i]; if (!st) return;
  const next = () => { B.i++; B.t = time; };
  if (st.go !== undefined) {
    const dx = st.go - p.x; if (Math.abs(dx) < 8) { next(); return; }
    BOTIN[dx > 0 ? 'right' : 'left'] = true;
    if ((b.blocked.left || b.blocked.right) && b.blocked.down && RUN.ups.dash && S.barriers.getLength()) tap('dash');
    else if ((b.blocked.left || b.blocked.right) && b.blocked.down && !p.sliding) tap('jump'); else if (!b.blocked.down) BOTIN.jump = true;
  } else if (st.tap) { tap(st.tap); next(); }
  else if (st.wait) { if (time - B.t > st.wait) next(); }
  else if (st.climb) { if (b.blocked.down || b.touching.down) tap('jump'); else BOTIN.jump = true; const dx = 128 - p.x; if (Math.abs(dx) > 6) BOTIN[dx > 0 ? 'right' : 'left'] = true; }
  else if (st.fight) {
    const bo = S.boss; if (!bo || bo.dead || !bo.active) { next(); return; }
    const dx = bo.x - p.x;
    if (Math.sign(dx) !== p.facing) BOTIN[dx > 0 ? 'right' : 'left'] = true;
    else if (Math.abs(dx) > 240) BOTIN[dx > 0 ? 'right' : 'left'] = true;
    BOTIN.shoot = (B.frame % 2) === 0;
  } else if (st.dj) {
    const gr = b.blocked.down || b.touching.down;
    if (!B.dj) { if ((B.djRel = (B.djRel || 0) + 1) > 3 && gr) { BOTIN.jump = true; B.dj = 1; B.djT = B.frame; } }
    else if (B.dj === 1) { if (B.frame - B.djT > 3 && b.velocity.y > -90) B.dj = 2; else BOTIN.jump = true; }
    else if (B.dj === 2) { BOTIN.jump = true; B.dj = 3; }
    else { BOTIN.jump = true; if (b.bottom < 172) BOTIN[st.dj < 0 ? 'left' : 'right'] = true; if (gr && B.frame - B.djT > 10) { B.dj = 0; B.djRel = 0; if (p.x < 128) next(); else if (p.x < 190) B.steps.splice(B.i, 0, { go: 210 }); } }
  }
}

// ---------------------------------------------------------------------
const game = new Phaser.Game({
  type: Phaser.AUTO, parent: 'game', width: GW, height: GH, backgroundColor: '#000000', pixelArt: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: 'arcade', arcade: { gravity: { y: SETTINGS.GRAVITY }, debug: false } },
  render: { antialias: false, powerPreference: 'high-performance' },
  fps: { target: 60 },
  scene: [Boot, Title, Play]
});
window.game = game;
