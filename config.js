// =====================================================================
//  CRYPTO BROS: Streets of the Lost Ledger — "DREAD" EXPERIMENT
//  A Metroid Dread-style test area: explore a connected map, find
//  upgrades that open new paths, slide, counter, and run from the
//  Ledger Auditor. This is a SEPARATE experiment (the Mega Man X
//  preview and the Two-Bit Beta are untouched).
//
//  EASY-TO-EDIT SETTINGS. Shape colors = 0xRRGGBB, text colors = '#RRGGBB'.
// =====================================================================
const SETTINGS = {
  TITLE_TEXT: 'CRYPTO BROS',
  SUBTITLE_TEXT: 'Streets of the Lost Ledger',
  EDITION_TEXT: 'DREAD EXPERIMENT  •  TEST AREA',
  TITLE_COLOR: '#7fe9ff',     // title glow color
  MAX_HP: 20,                 // your health
  RUN_SPEED: 200,             // walking/running speed
  JUMP_SPEED: 520,            // how hard you jump (bigger = higher)
  DOUBLE_JUMP_SPEED: 540,     // second jump in the air (after you find TWIN JUMP)
  GRAVITY: 1400,
  SLIDE_SPEED: 340,           // slide speed (keeps sliding while a low ceiling is above you)
  SLIDE_MS: 380,              // how long one slide lasts
  DASH_SPEED: 560,            // LEDGER DASH speed (breaks red barriers)
  DASH_MS: 200,               // how long one dash lasts
  COUNTER_RANGE: 95,          // how close an enemy must be for a counter
  COUNTER_DAMAGE: 15,         // a good counter hits THIS hard
  COUNTER_SLOWMO_MS: 260,     // the dramatic slow-motion after a good counter
  HURT_INVULN_MS: 1000,       // blink time after getting hit

  // ---- Ledger Auditor (the unkillable chase robot) ----
  AUDITOR_DETECT: 165,        // how close you can get before it spots you (pixels)
  AUDITOR_START_SPEED: 110,   // chase speed at the start...
  AUDITOR_MAX_SPEED: 185,     // ...ramping up to this (you run at RUN_SPEED, so keep moving!)
  AUDITOR_FOLLOW_MS: 900,     // it follows you into the next zone room after this long
  AUDITOR_CATCH_MS: 520,      // when it grabs you: press COUNTER inside this window to break free
  AUDITOR_COUNTERS: 1,        // how many grab-escapes you get per chase

  MUSIC_ON: true
};

// Look and feel (dark, sleek, glowing)
const LOOK = {
  WALL: 0x161a2b, WALL_EDGE: 0x3fe0ff, WALL_LINE: 0x232842,
  ZONE_EDGE: 0xff3d6e,        // edge color in Auditor zone rooms
  BG_TOP: 0x05060d, BG_BOTTOM: 0x101830,
  ZONE_BG_TOP: 0x10040c, ZONE_BG_BOTTOM: 0x2a0a1e,
  LAMP: 0x7fe9ff, HUD: '#7fe9ff', HUD_WARN: '#ff3d6e'
};

// The 5 teams (pick one at the start). Same leaders as the other builds.
const TEAMS = [
  { key: 'gold',    team: 'Leroy Gold',    name: 'Frankie Pumpkins', piece: '#0878', color: 0xffc400, dark: 0x8a5a00, glow: 0xffe066, shot: { name: 'GOLD SPREAD',  dmg: 2,   rate: 260, speed: 520, spread: true } },
  { key: 'red',     team: "Sho'nuff Red",  name: 'Gordo Holdsworth', piece: '#1051', color: 0xe02020, dark: 0x6a0a0a, glow: 0xff5050, shot: { name: 'RED CANNON',   dmg: 4.5, rate: 480, speed: 420, big: true } },
  { key: 'blue',    team: 'Ripple Drops',  name: 'Bruno Wagmi',      piece: '#0364', color: 0x2aa8ff, dark: 0x0b4c8c, glow: 0x7fdcff, shot: { name: 'DROP BOLT',    dmg: 1.4, rate: 120, speed: 760 } },
  { key: 'purple',  team: 'Purple Kush',   name: 'Benjamin Blunt',   piece: '#0958', color: 0x9b3dd6, dark: 0x45146a, glow: 0xd08cff, shot: { name: 'KUSH CLOUD',   dmg: 2.4, rate: 360, speed: 300, big: true } },
  { key: 'diamond', team: 'Diamond Hands', name: 'Butch Fancypants', piece: '#0615', color: 0xbfefff, dark: 0x4a7f98, glow: 0xffffff, shot: { name: 'DIAMOND BEAM', dmg: 2.6, rate: 320, speed: 900 } }
];

// Upgrades you find in the test area (each one opens a new path)
const UPGRADES = {
  slide: { name: 'LEDGER SLIDE', tip: 'Press SLIDE to zip under low gaps!', color: 0x3fe0ff },
  dash:  { name: 'LEDGER DASH',  tip: 'Press DASH to smash red barriers!',  color: 0xff3d6e },
  twin:  { name: 'TWIN JUMP',    tip: 'Jump again in mid-air!',             color: 0xffd34d }
};

const ENEMIES = {
  crawler: { name: 'Scam Crawler', hp: 8, dmg: 2, speed: 55, tele: 520 },     // tele = how long it flashes before lunging (your counter window)
  flyer:   { name: 'Phish Drone',  hp: 3, dmg: 2, speed: 70 }
};
const MINIBOSS = { name: 'RUG PULLER', hp: 160, dmg: 3, tele: 650 };

// ---------------------------------------------------------------------
//  THE MAP: 10 rooms. Each room is 20 x 11 tiles. (cx, cy) = where it sits on the map.
//  # wall   = thin platform (jump up through, DOWN+JUMP to drop)   D red barrier (DASH breaks it)
//  P start  V save station   L lamp   E Scam Crawler   F Phish Drone   B mini-boss
//  s/d upgrades (slide/dash)   G the Lost Ledger (goal)
//  An open edge = a doorway to the room next to it on the map.
// ---------------------------------------------------------------------
const ROOMS = {
  start: { name: 'BROKEN ALLEY', cx: 0, cy: 0, rows: [
    '####################',
    '#..................#',
    '#...L.........L....#',
    '#..................#',
    '#..................#',
    '#.........===......#',
    '#..................#',
    '#...................',
    '#.P.................',
    '#...................',
    '####################'] },
  hub: { name: 'LEDGER JUNCTION', cx: 1, cy: 0, rows: [
    '####################',
    '#..................#',
    '#....L.......L.....#',
    '#..................#',
    '#..................#',
    '#......====........#',
    '#..................#',
    '...................#',
    '..........E....#####',
    '....................',
    '###..###############'] },
  lab: { name: 'SLIDE LAB', cx: 1, cy: 1, rows: [
    '###..###############',
    '#..................#',
    '#.........L........#',
    '#..................#',
    '#..====............#',
    '#..................#',
    '#..====............#',
    '#..................#',
    '#..====............#',
    '#...........s......#',
    '####################'] },
  zoneA: { name: 'AUDIT ZONE - A', cx: 2, cy: 0, zone: true, auditor: { x1: 70, x2: 230, y: 120 }, rows: [
    '####################',
    '#..................#',
    '#...L.........L....#',
    '#..................#',
    '#..................#',
    '#.......===........#',
    '#..................#',
    '#...................',
    '####................',
    '....................',
    '####################'] },
  zoneB: { name: 'AUDIT ZONE - B', cx: 3, cy: 0, zone: true, rows: [
    '####################',
    '#.......###........#',
    '#...L...###....L...#',
    '#.......###........#',
    '#.......###........#',
    '#.......###........#',
    '#.......###........#',
    '........###.........',
    '........###.........',
    '...............d....',
    '####################'] },
  save: { name: 'SAFE HOUSE', cx: 4, cy: 0, rows: [
    '####################',
    '#..................#',
    '#......L....L......#',
    '#..................#',
    '#..................#',
    '#..................#',
    '#..................#',
    '...................#',
    '...................#',
    '.........V.........#',
    '###############..###'] },
  barrier: { name: 'BARRIER HALL', cx: 4, cy: 1, rows: [
    '###############..###',
    '#..................#',
    '#....L.......L.....#',
    '#..................#',
    '#..................#',
    '#..................#',
    '#..................#',
    '..DD...............#',
    '..DD.......E.......#',
    '..DD...............#',
    '####################'] },
  arena: { name: 'RUG PULL ARENA', cx: 3, cy: 1, boss: true, rows: [
    '####################',
    '#..................#',
    '...L..........L....#',
    '...................#',
    '...................#',
    '####...............#',
    '#..................#',
    '#...................',
    '#...................',
    '#.........B.........',
    '####################'] },
  shaft: { name: 'PHISH SHAFT', cx: 2, cy: 1, rows: [
    '####################',
    '#..................#',
    '#....L..............',
    '#...................',
    '#..........F........',
    '#..............#####',
    '#..................#',
    '#..................#',
    '#..................#',
    '#..................#',
    '###..###############'] },
  vault: { name: 'LOST LEDGER VAULT', cx: 2, cy: 2, rows: [
    '###..###############',
    '#..................#',
    '#.....L......L.....#',
    '#..................#',
    '#..................#',
    '#..................#',
    '#..................#',
    '#..................#',
    '#..................#',
    '#.............G....#',
    '####################'] }
};
const START_ROOM = 'start';

// Hooks for later (NOT used here). Read-only holder check, never wallets/keys/seeds.
function checkHolderReadOnly(publicAddress) { return Promise.resolve([]); }
