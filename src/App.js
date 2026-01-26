import { useEffect, useRef, useState, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════
const T = 32, FOG = 24;

// ═══════════════════════════════════════════════════════════════
// AUDIO
// ═══════════════════════════════════════════════════════════════
const audio = {
  ctx: null,
  init() { if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); },
  play(type) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.connect(g); g.connect(this.ctx.destination);
    const t = this.ctx.currentTime, v = 0.05;
    const fx = {
      select: () => { o.type='sine'; o.frequency.setValueAtTime(500,t); o.frequency.exponentialRampToValueAtTime(800,t+0.03); g.gain.setValueAtTime(v,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.08); o.start(t); o.stop(t+0.08); },
      move: () => { o.type='triangle'; o.frequency.value=350; g.gain.setValueAtTime(v*0.5,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.05); o.start(t); o.stop(t+0.05); },
      attack: () => { o.type='sawtooth'; o.frequency.setValueAtTime(120,t); o.frequency.exponentialRampToValueAtTime(50,t+0.1); g.gain.setValueAtTime(v,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.1); o.start(t); o.stop(t+0.1); },
      laser: () => { o.type='sine'; o.frequency.setValueAtTime(1000,t); o.frequency.exponentialRampToValueAtTime(300,t+0.12); g.gain.setValueAtTime(v*0.6,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.12); o.start(t); o.stop(t+0.12); },
      death: () => { o.type='sawtooth'; o.frequency.setValueAtTime(200,t); o.frequency.exponentialRampToValueAtTime(40,t+0.25); g.gain.setValueAtTime(v,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.25); o.start(t); o.stop(t+0.25); },
      build: () => { o.type='square'; o.frequency.setValueAtTime(200,t); o.frequency.setValueAtTime(350,t+0.15); g.gain.setValueAtTime(v*0.4,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.2); o.start(t); o.stop(t+0.2); },
      complete: () => { o.type='sine'; o.frequency.setValueAtTime(600,t); o.frequency.setValueAtTime(900,t+0.15); g.gain.setValueAtTime(v,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.25); o.start(t); o.stop(t+0.25); },
      error: () => { o.type='square'; o.frequency.value=150; g.gain.setValueAtTime(v,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.12); o.start(t); o.stop(t+0.12); },
    };
    if (fx[type]) fx[type]();
  }
};

// ═══════════════════════════════════════════════════════════════
// RACES
// ═══════════════════════════════════════════════════════════════
const RACES = {
  protoss: { n:'Protoss', c:'#0af', d:'#068', l:'#6cf', w:'probe', b:'nexus', s:'pylon', g:'assimilator', style:'warp' },
  zerg:    { n:'Zerg',    c:'#a4f', d:'#62a', l:'#c8f', w:'drone', b:'hatchery', s:'overlord', g:'extractor', style:'morph' },
  terran:  { n:'Terran',  c:'#fa0', d:'#a60', l:'#fc6', w:'scv', b:'commandcenter', s:'supplydepot', g:'refinery', style:'construct' },
};

// ═══════════════════════════════════════════════════════════════
// UNITS
// ═══════════════════════════════════════════════════════════════
const UNITS = {
  // Protoss
  probe:    { r:'protoss', hp:20, sh:20, ar:0, dmg:5, as:1500, rng:0.5, spd:2.8, sz:11, vis:8, c:{m:50,g:0}, bt:12, sup:1, harvest:true, build:true, icon:'⚙️', hk:'E' },
  zealot:   { r:'protoss', hp:100, sh:50, ar:1, dmg:8, hits:2, as:1200, rng:0.5, spd:2.75, sz:14, vis:9, c:{m:100,g:0}, bt:27, sup:2, prod:'gateway', icon:'⚔️', hk:'Z' },
  stalker:  { r:'protoss', hp:80, sh:80, ar:1, dmg:13, dmgB:{armored:5}, as:1440, rng:6, spd:3.15, sz:14, vis:10, c:{m:125,g:50}, bt:30, sup:2, prod:'gateway', req:['cybercore'], proj:'particle', icon:'🎯', hk:'S', ab:['blink'] },
  sentry:   { r:'protoss', hp:40, sh:40, ar:1, dmg:6, as:1000, rng:5, spd:2.75, sz:12, vis:10, c:{m:50,g:100}, bt:26, sup:2, prod:'gateway', req:['cybercore'], proj:'particle', energy:50, maxE:200, icon:'🛡️', hk:'E' },
  immortal: { r:'protoss', hp:200, sh:100, ar:1, dmg:20, dmgB:{armored:30}, as:1450, rng:6, spd:2.25, sz:20, vis:9, c:{m:275,g:100}, bt:39, sup:4, prod:'robo', proj:'plasma', icon:'🤖', hk:'I' },
  colossus: { r:'protoss', hp:200, sh:150, ar:1, dmg:10, as:1650, rng:7, spd:2.25, sz:28, vis:10, c:{m:300,g:200}, bt:54, sup:6, prod:'robo', req:['robobay'], proj:'beam', splash:40, icon:'🦿', hk:'C' },
  
  // Zerg
  drone:    { r:'zerg', hp:40, ar:0, dmg:5, as:1500, rng:0.5, spd:2.8, sz:11, vis:8, c:{m:50,g:0}, bt:12, sup:1, harvest:true, build:true, icon:'🐛', hk:'D' },
  zergling: { r:'zerg', hp:35, ar:0, dmg:5, as:696, rng:0.5, spd:4.13, sz:10, vis:8, c:{m:25,g:0}, bt:17, sup:0.5, prod:'hatchery', req:['pool'], spawn:2, icon:'🦗', hk:'Z' },
  roach:    { r:'zerg', hp:145, ar:1, dmg:16, as:1430, rng:4, spd:3, sz:14, vis:9, c:{m:75,g:25}, bt:19, sup:2, prod:'hatchery', req:['warren'], proj:'acid', icon:'🪲', hk:'R' },
  hydralisk:{ r:'zerg', hp:90, ar:0, dmg:12, as:830, rng:5, spd:3.15, sz:14, vis:9, c:{m:100,g:50}, bt:24, sup:2, prod:'hatchery', req:['den'], proj:'spine', icon:'🐍', hk:'H' },
  mutalisk: { r:'zerg', hp:120, ar:0, dmg:9, as:1800, rng:3, spd:4, sz:14, vis:11, c:{m:100,g:100}, bt:24, sup:2, prod:'hatchery', req:['spire'], fly:true, proj:'glaive', icon:'🦇', hk:'T' },
  ultralisk:{ r:'zerg', hp:500, ar:2, dmg:35, as:1100, rng:1, spd:4.13, sz:32, vis:9, c:{m:300,g:200}, bt:39, sup:6, prod:'hatchery', req:['cavern'], splash:20, icon:'🦏', hk:'U' },
  queen:    { r:'zerg', hp:175, ar:1, dmg:9, as:1100, rng:5, spd:1.3, sz:16, vis:9, c:{m:150,g:0}, bt:36, sup:2, prod:'hatchery', proj:'acid', energy:25, maxE:200, icon:'👑', hk:'Q' },
  overlord: { r:'zerg', hp:200, ar:0, dmg:0, as:0, rng:0, spd:0.82, sz:24, vis:11, c:{m:100,g:0}, bt:18, sup:0, supAdd:8, prod:'hatchery', fly:true, icon:'🎈', hk:'V' },

  // Terran
  scv:      { r:'terran', hp:45, ar:0, dmg:5, as:1500, rng:0.5, spd:2.8, sz:11, vis:8, c:{m:50,g:0}, bt:12, sup:1, harvest:true, build:true, repair:true, icon:'👷', hk:'S' },
  marine:   { r:'terran', hp:45, ar:0, dmg:6, as:860, rng:5, spd:2.25, sz:11, vis:9, c:{m:50,g:0}, bt:18, sup:1, prod:'barracks', proj:'bullet', icon:'🔫', hk:'A', ab:['stim'] },
  marauder: { r:'terran', hp:125, ar:1, dmg:10, dmgB:{armored:10}, as:1500, rng:6, spd:2.25, sz:14, vis:10, c:{m:100,g:25}, bt:21, sup:2, prod:'barracks', proj:'grenade', icon:'💥', hk:'D', ab:['stim'] },
  reaper:   { r:'terran', hp:60, ar:0, dmg:4, hits:2, as:1100, rng:5, spd:4, sz:11, vis:9, c:{m:50,g:50}, bt:32, sup:1, prod:'barracks', proj:'bullet', icon:'🏃', hk:'R' },
  hellion:  { r:'terran', hp:90, ar:0, dmg:8, dmgB:{light:6}, as:2500, rng:5, spd:4.25, sz:14, vis:10, c:{m:100,g:0}, bt:21, sup:2, prod:'factory', proj:'flame', icon:'🔥', hk:'E' },
  siegetank:{ r:'terran', hp:175, ar:1, dmg:15, dmgB:{armored:10}, as:1040, rng:7, spd:2.25, sz:20, vis:11, c:{m:150,g:125}, bt:32, sup:3, prod:'factory', proj:'shell', icon:'🛡️', hk:'S', ab:['siege'], siegeDmg:40, siegeRng:13, siegeAs:2140, siegeSplash:40 },
  thor:     { r:'terran', hp:400, ar:2, dmg:30, as:1280, rng:7, spd:1.87, sz:32, vis:11, c:{m:300,g:200}, bt:43, sup:6, prod:'factory', req:['armory'], proj:'shell', splash:15, icon:'🦾', hk:'T' },
  medivac:  { r:'terran', hp:150, ar:1, dmg:0, as:0, rng:0, spd:2.75, sz:18, vis:11, c:{m:100,g:100}, bt:30, sup:2, prod:'starport', fly:true, energy:50, maxE:200, healRate:12.6, icon:'🚁', hk:'D' },
  viking:   { r:'terran', hp:135, ar:0, dmg:10, dmgB:{armored:4}, hits:2, as:1430, rng:9, spd:2.75, sz:16, vis:10, c:{m:150,g:75}, bt:30, sup:2, prod:'starport', fly:true, airOnly:true, proj:'missile', icon:'✈️', hk:'V' },
};

// ═══════════════════════════════════════════════════════════════
// BUILDINGS
// ═══════════════════════════════════════════════════════════════
const BUILDINGS = {
  // Protoss
  nexus:      { r:'protoss', hp:1000, sh:1000, ar:1, sz:45, vis:11, c:{m:400,g:0}, bt:71, prod:['probe'], supAdd:15, base:true, icon:'🏛️', hk:'N' },
  pylon:      { r:'protoss', hp:200, sh:200, ar:0, sz:20, vis:9, c:{m:100,g:0}, bt:18, supAdd:8, power:6.5, icon:'⚡', hk:'E' },
  gateway:    { r:'protoss', hp:500, sh:500, ar:1, sz:32, vis:9, c:{m:150,g:0}, bt:46, prod:['zealot','stalker','sentry'], needPower:true, icon:'🚪', hk:'G' },
  cybercore:  { r:'protoss', hp:550, sh:550, ar:1, sz:26, vis:9, c:{m:150,g:0}, bt:36, req:['gateway'], needPower:true, icon:'💻', hk:'Y' },
  forge:      { r:'protoss', hp:400, sh:400, ar:1, sz:26, vis:9, c:{m:150,g:0}, bt:32, needPower:true, icon:'🔨', hk:'F' },
  robo:       { r:'protoss', hp:450, sh:450, ar:1, sz:32, vis:9, c:{m:200,g:100}, bt:46, req:['cybercore'], prod:['immortal','colossus'], needPower:true, icon:'🏭', hk:'R' },
  robobay:    { r:'protoss', hp:500, sh:500, ar:1, sz:28, vis:9, c:{m:200,g:200}, bt:46, req:['robo'], needPower:true, icon:'🔧', hk:'B' },
  stargate:   { r:'protoss', hp:500, sh:500, ar:1, sz:32, vis:9, c:{m:150,g:150}, bt:43, req:['cybercore'], prod:['phoenix','voidray'], needPower:true, icon:'🌟', hk:'S' },
  assimilator:{ r:'protoss', hp:450, sh:450, ar:1, sz:24, vis:9, c:{m:75,g:0}, bt:21, onGeyser:true, icon:'⛽', hk:'A' },

  // Zerg
  hatchery:   { r:'zerg', hp:1500, ar:1, sz:50, vis:11, c:{m:300,g:0}, bt:71, prod:['drone','zergling','roach','hydralisk','mutalisk','ultralisk','queen','overlord'], supAdd:6, larva:3, base:true, icon:'🥚', hk:'H' },
  pool:       { r:'zerg', hp:1000, ar:1, sz:32, vis:9, c:{m:200,g:0}, bt:46, icon:'🌊', hk:'S' },
  warren:     { r:'zerg', hp:850, ar:1, sz:26, vis:9, c:{m:150,g:0}, bt:39, req:['pool'], icon:'🪨', hk:'R' },
  den:        { r:'zerg', hp:850, ar:1, sz:28, vis:9, c:{m:100,g:100}, bt:29, req:['pool'], icon:'🐍', hk:'H' },
  spire:      { r:'zerg', hp:850, ar:1, sz:32, vis:9, c:{m:200,g:200}, bt:71, req:['pool'], icon:'🗼', hk:'S' },
  cavern:     { r:'zerg', hp:850, ar:1, sz:36, vis:9, c:{m:150,g:200}, bt:46, req:['pool'], icon:'🦴', hk:'U' },
  extractor:  { r:'zerg', hp:500, ar:1, sz:24, vis:9, c:{m:25,g:0}, bt:21, onGeyser:true, consumeWorker:true, icon:'⛽', hk:'E' },

  // Terran
  commandcenter: { r:'terran', hp:1500, ar:1, sz:50, vis:11, c:{m:400,g:0}, bt:71, prod:['scv'], supAdd:15, base:true, icon:'🏢', hk:'C' },
  supplydepot:   { r:'terran', hp:400, ar:1, sz:20, vis:9, c:{m:100,g:0}, bt:21, supAdd:8, icon:'📦', hk:'S' },
  barracks:   { r:'terran', hp:1000, ar:1, sz:36, vis:9, c:{m:150,g:0}, bt:46, req:['supplydepot'], prod:['marine','marauder','reaper'], icon:'🏠', hk:'B' },
  engineeringbay:{ r:'terran', hp:850, ar:1, sz:28, vis:9, c:{m:125,g:0}, bt:25, icon:'🔧', hk:'E' },
  factory:    { r:'terran', hp:1250, ar:1, sz:36, vis:9, c:{m:150,g:100}, bt:43, req:['barracks'], prod:['hellion','siegetank','thor'], icon:'🏭', hk:'F' },
  armory:     { r:'terran', hp:750, ar:1, sz:28, vis:9, c:{m:150,g:100}, bt:46, req:['factory'], icon:'⚙️', hk:'A' },
  starport:   { r:'terran', hp:1300, ar:1, sz:36, vis:9, c:{m:150,g:100}, bt:36, req:['factory'], prod:['medivac','viking'], icon:'🛫', hk:'S' },
  refinery:   { r:'terran', hp:500, ar:1, sz:24, vis:9, c:{m:75,g:0}, bt:21, onGeyser:true, icon:'⛽', hk:'R' },
};

// ═══════════════════════════════════════════════════════════════
// ABILITIES
// ═══════════════════════════════════════════════════════════════
const ABILITIES = {
  blink: { n:'Blink', k:'B', cd:7000, range:8, target:'ground', desc:'Teleporte' },
  stim: { n:'Stimpack', k:'T', cd:0, hpCost:10, dur:11000, atkBonus:1.5, spdBonus:1.5, desc:'+50% velocidad' },
  siege: { n:'Siege Mode', k:'E', cd:2000, desc:'Modo asedio' },
};

// ═══════════════════════════════════════════════════════════════
// PATHFINDING A* + FLOW
// ═══════════════════════════════════════════════════════════════
const findPath = (grid, sx, sy, ex, ey, maxIter = 400) => {
  const cols = grid[0].length, rows = grid.length;
  const toG = v => Math.floor(v / T);
  let gx = Math.max(0, Math.min(cols-1, toG(sx))), gy = Math.max(0, Math.min(rows-1, toG(sy)));
  let tx = Math.max(0, Math.min(cols-1, toG(ex))), ty = Math.max(0, Math.min(rows-1, toG(ey)));
  
  if (gx === tx && gy === ty) return [];
  
  if (grid[ty]?.[tx] === 1) {
    for (let r = 1; r <= 5; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const nx = tx + dx, ny = ty + dy;
          if (nx >= 0 && nx < cols && ny >= 0 && ny < rows && grid[ny][nx] === 0) {
            tx = nx; ty = ny; r = 10; break;
          }
        }
      }
    }
  }
  
  const open = [{ x: gx, y: gy, g: 0, f: 0, p: null }];
  const closed = new Set();
  const key = (x, y) => (y << 16) | x;
  
  while (open.length > 0 && closed.size < maxIter) {
    let minI = 0;
    for (let i = 1; i < open.length; i++) if (open[i].f < open[minI].f) minI = i;
    const cur = open.splice(minI, 1)[0];
    
    if (cur.x === tx && cur.y === ty) {
      const path = [];
      let n = cur;
      while (n) { path.unshift({ x: n.x * T + T / 2, y: n.y * T + T / 2 }); n = n.p; }
      return path.slice(1);
    }
    
    closed.add(key(cur.x, cur.y));
    
    const dirs = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]];
    for (const [dx, dy] of dirs) {
      const nx = cur.x + dx, ny = cur.y + dy;
      if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
      if (closed.has(key(nx, ny)) || grid[ny][nx] === 1) continue;
      if (dx !== 0 && dy !== 0 && (grid[cur.y][nx] === 1 || grid[ny][cur.x] === 1)) continue;
      
      const g = cur.g + (dx && dy ? 1.414 : 1);
      const h = Math.abs(nx - tx) + Math.abs(ny - ty);
      
      const idx = open.findIndex(n => n.x === nx && n.y === ny);
      if (idx === -1) open.push({ x: nx, y: ny, g, f: g + h, p: cur });
      else if (g < open[idx].g) { open[idx].g = g; open[idx].f = g + h; open[idx].p = cur; }
    }
  }
  
  return [{ x: ex, y: ey }];
};

// ═══════════════════════════════════════════════════════════════
// MAP GENERATOR
// ═══════════════════════════════════════════════════════════════
const genMap = (w = 3200, h = 2400, seed = Date.now()) => {
  const cols = Math.ceil(w / T), rows = Math.ceil(h / T);
  const rng = (s => () => { let t = s += 0x6D2B79F5; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; })(seed);
  
  const grid = Array(rows).fill(0).map(() => Array(cols).fill(0));
  
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if ((x < 12 && y > rows - 12) || (x > cols - 12 && y < 12)) continue;
      if (rng() < 0.02) {
        const sz = Math.floor(rng() * 4) + 2;
        for (let dy = 0; dy < sz; dy++) for (let dx = 0; dx < sz; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < cols && ny < rows && rng() < 0.7) grid[ny][nx] = 1;
        }
      }
    }
  }
  
  const clearPath = (x1, y1, x2, y2, pw = 4) => {
    const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps, px = Math.floor(x1 + (x2 - x1) * t), py = Math.floor(y1 + (y2 - y1) * t);
      for (let dy = -pw; dy <= pw; dy++) for (let dx = -pw; dx <= pw; dx++) {
        const nx = px + dx, ny = py + dy;
        if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) grid[ny][nx] = 0;
      }
    }
  };
  clearPath(8, rows - 8, cols - 8, 8, 5);
  clearPath(cols / 2, rows / 2, 8, rows - 8, 4);
  clearPath(cols / 2, rows / 2, cols - 8, 8, 4);
  
  const bases = [{ x: 150, y: h - 150 }, { x: w - 150, y: 150 }];
  const minerals = [], geysers = [];
  
  bases.forEach((b, i) => {
    const bx = Math.floor(b.x / T), by = Math.floor(b.y / T);
    for (let dy = -9; dy <= 9; dy++) for (let dx = -9; dx <= 9; dx++) {
      const nx = bx + dx, ny = by + dy;
      if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) grid[ny][nx] = 0;
    }
    const ba = i === 0 ? -Math.PI * 0.3 : Math.PI * 0.7;
    for (let j = 0; j < 8; j++) {
      const a = ba + (j - 4) * 0.17;
      minerals.push({ x: b.x + Math.cos(a) * (85 + (j % 2) * 15), y: b.y + Math.sin(a) * (85 + (j % 2) * 15), amount: 1500, workers: [] });
    }
    for (let j = 0; j < 2; j++) {
      geysers.push({ x: b.x + Math.cos(ba + (j === 0 ? -0.8 : 0.8)) * 120, y: b.y + Math.sin(ba + (j === 0 ? -0.8 : 0.8)) * 120, amount: 2500, building: null, workers: [] });
    }
  });
  
  return { w, h, grid, cols, rows, bases, minerals, geysers, seed };
};

// ═══════════════════════════════════════════════════════════════
// PROJECTILES & EFFECTS
// ═══════════════════════════════════════════════════════════════
class FX {
  constructor() { this.proj = []; this.fx = []; }
  
  addProj(type, sx, sy, tx, ty, spd, dmg, team, target, data = {}) {
    this.proj.push({ type, x: sx, y: sy, tx, ty, spd, dmg, team, target, born: Date.now(), ...data });
  }
  
  addFx(type, x, y, data = {}) {
    this.fx.push({ type, x, y, start: Date.now(), dur: data.dur || 500, ...data });
  }
  
  update(dt, applyDmg) {
    const now = Date.now();
    for (let i = this.proj.length - 1; i >= 0; i--) {
      const p = this.proj[i];
      if (p.target?.hp > 0) { p.tx = p.target.x; p.ty = p.target.y; }
      const dx = p.tx - p.x, dy = p.ty - p.y, dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 15 || now - p.born > 4000) {
        if (dist < 25 && p.target?.hp > 0) {
          applyDmg(p.target, p.dmg, p);
          this.addFx(p.type === 'particle' ? 'blueHit' : 'hit', p.tx, p.ty);
        }
        this.proj.splice(i, 1);
      } else {
        const mv = p.spd * dt / 1000;
        p.x += (dx / dist) * Math.min(mv, dist);
        p.y += (dy / dist) * Math.min(mv, dist);
      }
    }
    this.fx = this.fx.filter(e => now - e.start < e.dur);
  }
  
  render(ctx, cam) {
    const now = Date.now(), z = cam.z;
    for (const p of this.proj) {
      const sx = (p.x - cam.x) * z, sy = (p.y - cam.y) * z;
      ctx.fillStyle = p.type === 'particle' ? '#4af' : p.type === 'plasma' ? '#88f' : p.type === 'bullet' ? '#ff0' : p.type === 'acid' ? '#8f4' : '#fa0';
      ctx.beginPath(); ctx.arc(sx, sy, (p.type === 'plasma' ? 6 : 3) * z, 0, Math.PI * 2); ctx.fill();
    }
    for (const e of this.fx) {
      const sx = (e.x - cam.x) * z, sy = (e.y - cam.y) * z, prog = (now - e.start) / e.dur;
      ctx.globalAlpha = 1 - prog;
      switch (e.type) {
        case 'hit': ctx.fillStyle = '#fa8'; ctx.beginPath(); ctx.arc(sx, sy, (5 + prog * 15) * z, 0, Math.PI * 2); ctx.fill(); break;
        case 'blueHit': ctx.fillStyle = '#8af'; ctx.beginPath(); ctx.arc(sx, sy, (4 + prog * 12) * z, 0, Math.PI * 2); ctx.fill(); break;
        case 'explosion': ctx.fillStyle = '#f80'; ctx.beginPath(); ctx.arc(sx, sy, (15 + prog * 50) * z, 0, Math.PI * 2); ctx.fill(); break;
        case 'death': for (let i = 0; i < 5; i++) { const a = prog * Math.PI * 2 + i * 1.26, d = prog * 25 * z; ctx.fillStyle = '#f84'; ctx.beginPath(); ctx.arc(sx + Math.cos(a) * d, sy + Math.sin(a) * d, 3 * z, 0, Math.PI * 2); ctx.fill(); } break;
        case 'move': ctx.strokeStyle = '#0f0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sx, sy, (e.r || 15) * (1 - prog * 0.5) * z, 0, Math.PI * 2); ctx.stroke(); break;
        case 'attack': ctx.strokeStyle = '#f44'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx - 8 * z, sy - 8 * z); ctx.lineTo(sx + 8 * z, sy + 8 * z); ctx.moveTo(sx + 8 * z, sy - 8 * z); ctx.lineTo(sx - 8 * z, sy + 8 * z); ctx.stroke(); break;
        case 'warp': ctx.strokeStyle = '#4af'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(sx, sy, (e.r || 20) * z, 0, Math.PI * 2); ctx.stroke(); break;
        case 'build': ctx.strokeStyle = '#8f8'; ctx.lineWidth = 2; ctx.strokeRect(sx - e.sz * z, sy - e.sz * z, e.sz * 2 * z, e.sz * 2 * z); break;
      }
      ctx.globalAlpha = 1;
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// GAME ENGINE
// ═══════════════════════════════════════════════════════════════
class Game {
  constructor(race, diff = 'normal') {
    this.map = genMap();
    this.race = race;
    this.aiRace = ['protoss', 'zerg', 'terran'].filter(r => r !== race)[Math.floor(Math.random() * 2)];
    this.diff = diff;
    
    this.entities = [];
    this.eid = 0;
    this.res = { m: 50, g: 0, sup: 0, maxSup: 0 };
    this.aiRes = { m: 50, g: 0, sup: 0, maxSup: 0 };
    
    this.selected = [];
    this.groups = {};
    this.buildings = new Set();
    this.aiBuildings = new Set();
    
    this.buildQueue = []; // Cola de construcciones player [{workerId, type, x, y, building}]
    this.aiBuildQueue = [];
    
    this.fogExplored = new Uint8Array(this.map.cols * this.map.rows);
    this.fogVisible = new Uint8Array(this.map.cols * this.map.rows);
    
    this.fx = new FX();
    this.time = 0;
    this.msgs = [];
    
    this.lastGroupTap = {};
  }

  init() {
    const r = RACES[this.race], ar = RACES[this.aiRace];
    const pb = this.map.bases[0], ab = this.map.bases[1];
    
    const pBase = this.spawn(r.b, pb.x, pb.y, 0, true);
    pBase.rally = { x: pb.x, y: pb.y + 80 };
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const w = this.spawn(r.w, pb.x + Math.cos(a) * 50, pb.y + Math.sin(a) * 50, 0);
      if (i < 8) { w.harvesting = this.map.minerals[i]; this.map.minerals[i].workers.push(w.id); }
    }
    
    const aBase = this.spawn(ar.b, ab.x, ab.y, 1, true);
    aBase.rally = { x: ab.x, y: ab.y - 80 };
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const w = this.spawn(ar.w, ab.x + Math.cos(a) * 50, ab.y + Math.sin(a) * 50, 1);
      const mi = this.map.minerals.length - 1 - (i % 8);
      if (i < 8 && this.map.minerals[mi]) { w.harvesting = this.map.minerals[mi]; this.map.minerals[mi].workers.push(w.id); }
    }
    
    audio.init();
    this.msg('Partida iniciada');
  }

  spawn(type, x, y, team, isBuilding = false, buildTime = 0) {
    const data = isBuilding ? BUILDINGS[type] : UNITS[type];
    if (!data) return null;
    
    const e = {
      id: this.eid++, type, x, y,
      hp: buildTime > 0 ? data.hp * 0.1 : data.hp, maxHp: data.hp,
      sh: data.sh || 0, maxSh: data.sh || 0,
      ar: data.ar || 0,
      dmg: data.dmg || 0, dmgB: data.dmgB || null,
      as: data.as || 0, rng: (data.rng || 0) * T,
      spd: data.spd || 0, sz: data.sz,
      vis: (data.vis || 8) * T,
      team, isBuilding,
      
      sel: false,
      lastAtk: 0, lastHit: 0,
      target: null, attackMove: false, hold: false, patrol: null,
      
      // Comando queue (shift-queue)
      cmdQueue: [],
      path: [], pathIdx: 0,
      
      // Separación/steering
      vx: 0, vy: 0,
      
      harvesting: null, harvestAmt: 0, returning: false, harvestCd: 0,
      
      // Producción con cola visual
      producing: null, prodEnd: 0, prodQueue: [],
      rally: null,
      
      // Construcción
      built: buildTime > 0 ? 0 : 1, buildProg: 0, buildTotal: buildTime,
      constructing: null, // Para workers
      
      canHarvest: data.harvest || false,
      canBuild: data.build || false,
      fly: data.fly || false,
      sieged: false,
      
      proj: data.proj || null, projSpd: 15 * T,
      splash: data.splash || 0, hits: data.hits || 1,
      
      ab: data.ab || [], cd: {},
      energy: data.energy || 0, maxE: data.maxE || 0,
      buffs: [],
    };
    
    for (const a of e.ab) e.cd[a] = 0;
    this.entities.push(e);
    
    if (isBuilding && e.built >= 1) {
      (team === 0 ? this.buildings : this.aiBuildings).add(type);
      (team === 0 ? this.res : this.aiRes).maxSup += data.supAdd || 0;
    }
    if (!isBuilding) (team === 0 ? this.res : this.aiRes).sup += data.sup || 0;
    
    return e;
  }

  update(dt) {
    this.time += dt;
    
    // Fog
    this.fogVisible.fill(0);
    for (const e of this.entities) if (e.team === 0 && e.hp > 0) this.updateVis(e);
    
    // Build queues
    this.processBuildQueue(this.buildQueue, 0);
    this.processBuildQueue(this.aiBuildQueue, 1);
    
    // Entities
    for (const e of this.entities) if (e.hp > 0) this.updateEntity(e, dt);
    
    // Collision avoidance entre unidades
    this.resolveCollisions();
    
    // Projectiles
    this.fx.update(dt, (t, d, p) => this.applyDmg(t, d, p));
    
    // Cleanup
    for (const e of this.entities) {
      if (e.hp <= 0 && e.hp > -9999) { this.onDeath(e); e.hp = -10000; }
    }
    this.entities = this.entities.filter(e => e.hp > -9999);
    
    // AI
    this.updateAI();
    
    const p = this.entities.filter(e => e.team === 0).length;
    const a = this.entities.filter(e => e.team === 1).length;
    if (p === 0) return 'defeat';
    if (a === 0) return 'victory';
    return null;
  }
  
  processBuildQueue(queue, team) {
    for (let i = queue.length - 1; i >= 0; i--) {
      const bq = queue[i];
      const worker = this.entities.find(e => e.id === bq.workerId && e.hp > 0);
      if (!worker) { queue.splice(i, 1); continue; }
      
      const dist = Math.sqrt((bq.x - worker.x) ** 2 + (bq.y - worker.y) ** 2);
      const race = RACES[team === 0 ? this.race : this.aiRace];
      const bd = BUILDINGS[bq.type];
      
      if (dist < 45) {
        if (race.style === 'warp') {
          this.spawn(bq.type, bq.x, bq.y, team, true, bd.bt * 1000);
          this.fx.addFx('warp', bq.x, bq.y, { r: bd.sz, dur: 1000 });
          worker.constructing = null;
          queue.splice(i, 1);
          // Siguiente en cola del worker
          this.nextWorkerCmd(worker);
        } else if (race.style === 'morph') {
          worker.hp = 0;
          this.spawn(bq.type, bq.x, bq.y, team, true, bd.bt * 1000);
          queue.splice(i, 1);
        } else {
          // Terran
          if (!bq.building) {
            bq.building = this.spawn(bq.type, bq.x, bq.y, team, true, bd.bt * 1000);
          }
          if (bq.building && bq.building.built >= 1) {
            worker.constructing = null;
            queue.splice(i, 1);
            this.nextWorkerCmd(worker);
          }
        }
      } else if (worker.path.length === 0 && !worker.constructing) {
        worker.path = findPath(this.map.grid, worker.x, worker.y, bq.x, bq.y);
        worker.pathIdx = 0;
        worker.constructing = bq;
      }
    }
  }
  
  nextWorkerCmd(worker) {
    if (worker.cmdQueue.length > 0) {
      const cmd = worker.cmdQueue.shift();
      this.executeCmd(worker, cmd);
    }
  }
  
  executeCmd(e, cmd) {
    switch (cmd.type) {
      case 'move':
        e.path = findPath(this.map.grid, e.x, e.y, cmd.x, cmd.y);
        e.pathIdx = 0;
        e.target = null;
        e.attackMove = false;
        break;
      case 'attackMove':
        e.path = findPath(this.map.grid, e.x, e.y, cmd.x, cmd.y);
        e.pathIdx = 0;
        e.attackMove = true;
        break;
      case 'attack':
        e.target = cmd.target;
        break;
      case 'build':
        this.queueBuild(e, cmd.buildType, cmd.x, cmd.y, e.team, true);
        break;
      case 'harvest':
        e.harvesting = cmd.resource;
        e.returning = false;
        e.path = findPath(this.map.grid, e.x, e.y, cmd.resource.x, cmd.resource.y);
        e.pathIdx = 0;
        break;
      case 'patrol':
        e.patrol = { x1: e.x, y1: e.y, x2: cmd.x, y2: cmd.y, goingTo2: true };
        e.path = findPath(this.map.grid, e.x, e.y, cmd.x, cmd.y);
        e.pathIdx = 0;
        e.attackMove = true;
        break;
    }
  }
  
  updateVis(e) {
    const cx = Math.floor(e.x / FOG), cy = Math.floor(e.y / FOG);
    const vr = Math.ceil(e.vis / FOG);
    for (let dy = -vr; dy <= vr; dy++) {
      for (let dx = -vr; dx <= vr; dx++) {
        if (dx * dx + dy * dy <= vr * vr) {
          const fx = cx + dx, fy = cy + dy;
          if (fx >= 0 && fx < this.map.cols && fy >= 0 && fy < this.map.rows) {
            const idx = fy * this.map.cols + fx;
            this.fogVisible[idx] = 1;
            this.fogExplored[idx] = 1;
          }
        }
      }
    }
  }
  
  updateEntity(e, dt) {
    // Energy/shield regen
    if (e.maxE > 0 && e.energy < e.maxE) e.energy = Math.min(e.maxE, e.energy + 0.5625 * dt / 1000);
    if (e.sh < e.maxSh && this.time - e.lastHit > 10000) e.sh = Math.min(e.maxSh, e.sh + 2 * dt / 1000);
    
    // Building construction
    if (e.isBuilding && e.built < 1) {
      const race = RACES[e.team === 0 ? this.race : this.aiRace];
      let rate = race.style === 'construct' ? 0 : 1;
      
      if (race.style === 'construct') {
        const queue = e.team === 0 ? this.buildQueue : this.aiBuildQueue;
        const bq = queue.find(q => q.building === e);
        if (bq) {
          const worker = this.entities.find(w => w.id === bq.workerId && w.hp > 0);
          if (worker && Math.sqrt((e.x - worker.x) ** 2 + (e.y - worker.y) ** 2) < 60) rate = 1;
        }
      }
      
      if (rate > 0) {
        e.buildProg += dt * rate;
        e.built = Math.min(1, e.buildProg / e.buildTotal);
        e.hp = e.maxHp * (0.1 + 0.9 * e.built);
      }
      
      if (e.built >= 1) {
        const d = BUILDINGS[e.type];
        (e.team === 0 ? this.buildings : this.aiBuildings).add(e.type);
        (e.team === 0 ? this.res : this.aiRes).maxSup += d.supAdd || 0;
        audio.play('complete');
        if (e.team === 0) this.msg(`${e.type} completado`);
      }
      return;
    }
    
    // Production queue
    if (e.producing && this.time >= e.prodEnd) {
      const ud = UNITS[e.producing];
      if (ud) {
        const count = ud.spawn || 1;
        for (let i = 0; i < count; i++) {
          const u = this.spawn(e.producing, e.x + (Math.random() - 0.5) * 30, e.y + e.sz + 10 + i * 10, e.team);
          if (e.rally && u) {
            u.path = findPath(this.map.grid, u.x, u.y, e.rally.x, e.rally.y);
            u.pathIdx = 0;
          }
        }
        audio.play('complete');
      }
      e.producing = null;
      if (e.prodQueue.length > 0) this.startProdInternal(e, e.prodQueue.shift(), e.team);
    }
    
    // Buffs
    e.buffs = e.buffs.filter(b => b.end > this.time);
    let spdMult = 1, atkMult = 1;
    for (const b of e.buffs) { if (b.spd) spdMult *= b.spd; if (b.atk) atkMult *= b.atk; }
    
    // Movement
    if (!e.isBuilding && !e.hold && !e.sieged && !e.constructing && e.path.length > 0) {
      const t = e.path[e.pathIdx];
      if (t) {
        const dx = t.x - e.x, dy = t.y - e.y, dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 8) {
          e.pathIdx++;
          if (e.pathIdx >= e.path.length) {
            e.path = []; e.pathIdx = 0;
            // Patrol loop
            if (e.patrol) {
              const nextX = e.patrol.goingTo2 ? e.patrol.x1 : e.patrol.x2;
              const nextY = e.patrol.goingTo2 ? e.patrol.y1 : e.patrol.y2;
              e.patrol.goingTo2 = !e.patrol.goingTo2;
              e.path = findPath(this.map.grid, e.x, e.y, nextX, nextY);
              e.pathIdx = 0;
            }
            // Command queue
            else if (e.cmdQueue.length > 0) {
              const cmd = e.cmdQueue.shift();
              this.executeCmd(e, cmd);
            }
          }
        } else {
          const spd = e.spd * spdMult * T * dt / 1000;
          e.vx = (dx / dist) * spd;
          e.vy = (dy / dist) * spd;
        }
      }
      
      // Attack-move detection
      if (e.attackMove && e.dmg > 0 && !e.target) {
        for (const o of this.entities) {
          if (o.team !== e.team && o.hp > 0) {
            const d = Math.sqrt((o.x - e.x) ** 2 + (o.y - e.y) ** 2);
            if (d <= e.rng + 80) { e.target = o; break; }
          }
        }
      }
    }
    
    // Harvesting
    if (e.canHarvest && e.harvesting && !e.constructing) this.updateHarvest(e, dt);
    
    // Combat
    if (e.dmg > 0 && !e.canHarvest && !e.constructing) this.updateCombat(e, dt, atkMult);
  }
  
  resolveCollisions() {
    const units = this.entities.filter(e => !e.isBuilding && e.hp > 0 && !e.fly);
    
    for (const e of units) {
      if (e.vx === 0 && e.vy === 0) continue;
      
      let sepX = 0, sepY = 0;
      
      for (const o of units) {
        if (o === e) continue;
        const dx = e.x - o.x, dy = e.y - o.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = e.sz + o.sz + 2;
        
        if (dist < minDist && dist > 0) {
          const force = (minDist - dist) / minDist;
          sepX += (dx / dist) * force * 2;
          sepY += (dy / dist) * force * 2;
        }
      }
      
      e.x += e.vx + sepX;
      e.y += e.vy + sepY;
      
      // Clamp to map
      e.x = Math.max(e.sz, Math.min(this.map.w - e.sz, e.x));
      e.y = Math.max(e.sz, Math.min(this.map.h - e.sz, e.y));
      
      e.vx = 0;
      e.vy = 0;
    }
  }
  
  updateHarvest(e, dt) {
    const r = e.harvesting;
    const res = e.team === 0 ? this.res : this.aiRes;
    
    if (e.returning) {
      const base = this.entities.filter(b => b.isBuilding && b.team === e.team && BUILDINGS[b.type]?.base && b.built >= 1)
        .sort((a, b) => ((a.x - e.x) ** 2 + (a.y - e.y) ** 2) - ((b.x - e.x) ** 2 + (b.y - e.y) ** 2))[0];
      if (base) {
        const dist = Math.sqrt((base.x - e.x) ** 2 + (base.y - e.y) ** 2);
        if (dist < base.sz + 15) {
          if (r.isGeyser) res.g += e.harvestAmt; else res.m += e.harvestAmt;
          e.harvestAmt = 0;
          e.returning = false;
          if (r.amount > 0) { e.path = findPath(this.map.grid, e.x, e.y, r.x, r.y); e.pathIdx = 0; }
        } else if (e.path.length === 0) { e.path = findPath(this.map.grid, e.x, e.y, base.x, base.y); e.pathIdx = 0; }
      }
    } else {
      const dist = Math.sqrt((r.x - e.x) ** 2 + (r.y - e.y) ** 2);
      if (dist < 35) {
        if (e.harvestCd <= 0 && r.amount > 0) {
          e.harvestAmt = Math.min(r.isGeyser ? 4 : 5, r.amount);
          r.amount -= e.harvestAmt;
          e.returning = true;
          e.path = [];
          e.harvestCd = 2000;
        } else e.harvestCd -= dt;
      } else if (e.path.length === 0) { e.path = findPath(this.map.grid, e.x, e.y, r.x, r.y); e.pathIdx = 0; }
    }
  }
  
  updateCombat(e, dt, atkMult) {
    if (!e.target || e.target.hp <= 0) {
      e.target = null;
      if (!e.hold) {
        let closest = null, closestD = e.rng + (e.attackMove ? 80 : 0);
        for (const o of this.entities) {
          if (o.team !== e.team && o.hp > 0) {
            if (e.team === 0) {
              const fx = Math.floor(o.x / FOG), fy = Math.floor(o.y / FOG);
              if (this.fogVisible[fy * this.map.cols + fx] === 0) continue;
            }
            const d = Math.sqrt((o.x - e.x) ** 2 + (o.y - e.y) ** 2);
            if (d < closestD) { closest = o; closestD = d; }
          }
        }
        e.target = closest;
      }
    }
    
    if (e.target?.hp > 0) {
      const dist = Math.sqrt((e.target.x - e.x) ** 2 + (e.target.y - e.y) ** 2);
      if (dist <= e.rng) {
        if (this.time - e.lastAtk >= e.as / atkMult) {
          this.attack(e, e.target);
          e.lastAtk = this.time;
        }
      } else if (!e.hold && !e.sieged && e.spd > 0 && e.path.length === 0) {
        e.path = findPath(this.map.grid, e.x, e.y, e.target.x, e.target.y);
        e.pathIdx = 0;
      }
    }
  }
  
  attack(a, t) {
    let dmg = a.dmg * (a.hits || 1);
    if (a.dmgB?.armored && t.sz > 18) dmg += a.dmgB.armored * (a.hits || 1);
    if (a.dmgB?.light && t.sz < 14) dmg += a.dmgB.light * (a.hits || 1);
    
    audio.play(a.proj === 'particle' ? 'laser' : 'attack');
    
    if (a.proj) {
      this.fx.addProj(a.proj, a.x, a.y, t.x, t.y, a.projSpd, dmg, a.team, t, { splash: a.splash });
    } else {
      this.applyDmg(t, dmg, { team: a.team, splash: a.splash, x: t.x, y: t.y });
    }
  }
  
  applyDmg(t, dmg, p = {}) {
    let d = Math.max(0.5, dmg - (t.ar || 0));
    if (t.sh > 0) { const sd = Math.min(t.sh, d); t.sh -= sd; d -= sd; }
    t.hp -= d;
    t.lastHit = this.time;
    
    if (p.splash > 0) {
      for (const o of this.entities) {
        if (o !== t && o.team !== p.team && o.hp > 0) {
          const dist = Math.sqrt((o.x - p.x) ** 2 + (o.y - p.y) ** 2);
          if (dist <= p.splash) {
            let sd = Math.max(0.5, dmg * 0.5 - (o.ar || 0));
            if (o.sh > 0) { const ss = Math.min(o.sh, sd); o.sh -= ss; sd -= ss; }
            o.hp -= sd;
          }
        }
      }
      this.fx.addFx('explosion', p.x, p.y, { dur: 400 });
    }
  }
  
  onDeath(e) {
    audio.play('death');
    this.fx.addFx('death', e.x, e.y, { dur: 600 });
    if (e.harvesting) {
      const idx = e.harvesting.workers.indexOf(e.id);
      if (idx >= 0) e.harvesting.workers.splice(idx, 1);
    }
    if (!e.isBuilding) {
      const d = UNITS[e.type];
      if (d) (e.team === 0 ? this.res : this.aiRes).sup -= d.sup || 0;
    }
  }
  
  // ═══════════════════════════════════════════════════════════════
  // COMMANDS
  // ═══════════════════════════════════════════════════════════════
  
  cmd(type, data, shift = false) {
    const sel = this.entities.filter(e => e.sel && e.team === 0 && e.hp > 0);
    if (sel.length === 0) return;
    
    // Formation: calcular offset para cada unidad
    const cx = sel.reduce((s, e) => s + e.x, 0) / sel.length;
    const cy = sel.reduce((s, e) => s + e.y, 0) / sel.length;
    
    switch (type) {
      case 'move':
        this.fx.addFx('move', data.x, data.y, { dur: 800, r: 20 });
        for (const e of sel) {
          if (e.isBuilding || e.sieged) continue;
          const ox = e.x - cx, oy = e.y - cy;
          const cmd = { type: 'move', x: data.x + ox, y: data.y + oy };
          if (shift) e.cmdQueue.push(cmd);
          else { e.cmdQueue = []; this.executeCmd(e, cmd); }
          e.target = null;
          e.attackMove = false;
          e.patrol = null;
          if (!shift && e.harvesting) {
            const idx = e.harvesting.workers.indexOf(e.id);
            if (idx >= 0) e.harvesting.workers.splice(idx, 1);
            e.harvesting = null;
          }
        }
        audio.play('move');
        break;
        
      case 'attackMove':
        this.fx.addFx('attack', data.x, data.y, { dur: 600 });
        for (const e of sel) {
          if (e.isBuilding || !e.dmg) continue;
          const ox = e.x - cx, oy = e.y - cy;
          const cmd = { type: 'attackMove', x: data.x + ox, y: data.y + oy };
          if (shift) e.cmdQueue.push(cmd);
          else { e.cmdQueue = []; this.executeCmd(e, cmd); }
          e.patrol = null;
        }
        audio.play('move');
        break;
        
      case 'attack':
        for (const e of sel) {
          if (e.isBuilding || !e.dmg) continue;
          const cmd = { type: 'attack', target: data.target };
          if (shift) e.cmdQueue.push(cmd);
          else { e.cmdQueue = []; this.executeCmd(e, cmd); }
        }
        audio.play('move');
        break;
        
      case 'patrol':
        for (const e of sel) {
          if (e.isBuilding) continue;
          const cmd = { type: 'patrol', x: data.x, y: data.y };
          if (shift) e.cmdQueue.push(cmd);
          else { e.cmdQueue = []; this.executeCmd(e, cmd); }
        }
        audio.play('move');
        break;
        
      case 'stop':
        for (const e of sel) { e.path = []; e.pathIdx = 0; e.target = null; e.attackMove = false; e.patrol = null; e.cmdQueue = []; }
        break;
        
      case 'hold':
        for (const e of sel) { e.path = []; e.pathIdx = 0; e.hold = true; e.attackMove = false; e.patrol = null; e.cmdQueue = []; }
        break;
        
      case 'harvest':
        for (const e of sel) {
          if (!e.canHarvest) continue;
          if (e.harvesting) {
            const idx = e.harvesting.workers.indexOf(e.id);
            if (idx >= 0) e.harvesting.workers.splice(idx, 1);
          }
          const cmd = { type: 'harvest', resource: data.resource };
          if (shift) e.cmdQueue.push(cmd);
          else { e.cmdQueue = []; this.executeCmd(e, cmd); }
          if (!data.resource.workers) data.resource.workers = [];
          data.resource.workers.push(e.id);
        }
        audio.play('move');
        break;
        
      case 'build':
        const builder = sel.find(e => e.canBuild && !e.constructing);
        if (builder) {
          if (shift) {
            builder.cmdQueue.push({ type: 'build', buildType: data.type, x: data.x, y: data.y });
          } else {
            this.queueBuild(builder, data.type, data.x, data.y, 0);
          }
        }
        break;
        
      case 'produce':
        this.startProd(sel[0], data.unit);
        break;
        
      case 'rally':
        for (const e of sel) if (e.isBuilding) e.rally = { x: data.x, y: data.y };
        this.fx.addFx('move', data.x, data.y, { dur: 600, r: 15 });
        break;
        
      case 'ability':
        this.useAbility(sel[0], data.ab, data.x, data.y);
        break;
    }
  }
  
  queueBuild(worker, type, x, y, team, fromQueue = false) {
    const bd = BUILDINGS[type];
    if (!bd) return false;
    
    const res = team === 0 ? this.res : this.aiRes;
    const queue = team === 0 ? this.buildQueue : this.aiBuildQueue;
    const buildingsSet = team === 0 ? this.buildings : this.aiBuildings;
    
    if (res.m < bd.c.m || res.g < (bd.c.g || 0)) {
      if (team === 0) { audio.play('error'); this.msg('Recursos insuficientes'); }
      return false;
    }
    if (bd.req) {
      for (const r of bd.req) if (!buildingsSet.has(r)) {
        if (team === 0) { audio.play('error'); this.msg(`Requiere ${r}`); }
        return false;
      }
    }
    
    if (bd.onGeyser) {
      const geyser = this.map.geysers.find(g => Math.sqrt((g.x - x) ** 2 + (g.y - y) ** 2) < 50 && !g.building);
      if (!geyser) {
        if (team === 0) { audio.play('error'); this.msg('Construir sobre geyser'); }
        return false;
      }
      x = geyser.x; y = geyser.y;
      geyser.building = true;
    }
    
    res.m -= bd.c.m;
    res.g -= bd.c.g || 0;
    
    if (worker.harvesting) {
      const idx = worker.harvesting.workers.indexOf(worker.id);
      if (idx >= 0) worker.harvesting.workers.splice(idx, 1);
      worker.harvesting = null;
    }
    
    queue.push({ workerId: worker.id, type, x, y, building: null });
    
    worker.path = findPath(this.map.grid, worker.x, worker.y, x, y);
    worker.pathIdx = 0;
    worker.constructing = true;
    
    this.fx.addFx('build', x, y, { dur: 1500, sz: bd.sz });
    if (team === 0) audio.play('build');
    return true;
  }
  
  startProd(building, unitType) {
    if (!building?.isBuilding) return;
    this.startProdInternal(building, unitType, building.team);
  }
  
  startProdInternal(building, unitType, team) {
    const bd = BUILDINGS[building.type];
    if (!bd?.prod?.includes(unitType)) return false;
    const ud = UNITS[unitType];
    if (!ud) return false;
    
    const res = team === 0 ? this.res : this.aiRes;
    const buildingsSet = team === 0 ? this.buildings : this.aiBuildings;
    
    if (res.m < ud.c.m || res.g < (ud.c.g || 0)) {
      if (team === 0) { audio.play('error'); this.msg('Recursos insuficientes'); }
      return false;
    }
    if (res.sup + (ud.sup || 0) > res.maxSup) {
      if (team === 0) { audio.play('error'); this.msg('Supply insuficiente'); }
      return false;
    }
    if (ud.req) {
      for (const r of ud.req) if (!buildingsSet.has(r)) {
        if (team === 0) { audio.play('error'); this.msg(`Requiere ${r}`); }
        return false;
      }
    }
    
    res.m -= ud.c.m;
    res.g -= ud.c.g || 0;
    
    if (building.producing) {
      building.prodQueue.push(unitType);
    } else {
      building.producing = unitType;
      building.prodEnd = this.time + ud.bt * 1000;
    }
    if (team === 0) audio.play('select');
    return true;
  }
  
  cancelProd(building, index) {
    if (!building) return;
    const res = building.team === 0 ? this.res : this.aiRes;
    
    if (index === 0 && building.producing) {
      const ud = UNITS[building.producing];
      if (ud) { res.m += Math.floor(ud.c.m * 0.75); res.g += Math.floor((ud.c.g || 0) * 0.75); }
      building.producing = null;
      if (building.prodQueue.length > 0) this.startProdInternal(building, building.prodQueue.shift(), building.team);
    } else if (index > 0 && building.prodQueue[index - 1]) {
      const ud = UNITS[building.prodQueue[index - 1]];
      if (ud) { res.m += Math.floor(ud.c.m * 0.75); res.g += Math.floor((ud.c.g || 0) * 0.75); }
      building.prodQueue.splice(index - 1, 1);
    }
  }
  
  useAbility(e, abKey, x, y) {
    if (!e) return false;
    const ab = ABILITIES[abKey];
    if (!ab) return false;
    
    if ((e.cd[abKey] || 0) > this.time) return false;
    if (ab.energy && e.energy < ab.energy) return false;
    
    if (ab.energy) e.energy -= ab.energy;
    if (ab.hpCost) e.hp -= ab.hpCost;
    if (ab.cd) e.cd[abKey] = this.time + ab.cd;
    
    switch (abKey) {
      case 'blink':
        const range = (ab.range || 8) * T;
        const dist = Math.sqrt((x - e.x) ** 2 + (y - e.y) ** 2);
        if (dist <= range) {
          this.fx.addFx('warp', e.x, e.y, { r: 15, dur: 300 });
          e.x = x; e.y = y; e.path = [];
          this.fx.addFx('warp', x, y, { r: 15, dur: 300 });
        }
        break;
      case 'stim':
        e.buffs.push({ type: 'stim', end: this.time + ab.dur, spd: ab.spdBonus, atk: ab.atkBonus });
        break;
      case 'siege':
        e.sieged = !e.sieged;
        const tank = UNITS.siegetank;
        if (e.sieged) { e.dmg = tank.siegeDmg; e.rng = tank.siegeRng * T; e.as = tank.siegeAs; e.splash = tank.siegeSplash; e.spd = 0; }
        else { e.dmg = tank.dmg; e.rng = tank.rng * T; e.as = tank.as; e.splash = 0; e.spd = tank.spd; }
        break;
    }
    return true;
  }
  
  // ═══════════════════════════════════════════════════════════════
  // SELECTION
  // ═══════════════════════════════════════════════════════════════
  
  select(x, y, w, h, add = false, type = 'box') {
    if (!add) this.entities.forEach(e => e.sel = false);
    for (const e of this.entities) {
      if (e.team === 0 && e.hp > 0) {
        const inSel = type === 'box' ? (e.x >= x && e.x <= x + w && e.y >= y && e.y <= y + h) : (Math.sqrt((e.x - x) ** 2 + (e.y - y) ** 2) < e.sz + 10);
        if (inSel) e.sel = true;
      }
    }
    const sel = this.entities.filter(e => e.sel);
    const units = sel.filter(e => !e.isBuilding), buildings = sel.filter(e => e.isBuilding);
    if (units.length > 0 && buildings.length > 0) buildings.forEach(b => b.sel = false);
    this.selected = this.entities.filter(e => e.sel);
    if (this.selected.length > 0) audio.play('select');
    return this.selected;
  }
  
  selectAll() {
    this.entities.forEach(e => e.sel = false);
    const army = this.entities.filter(e => e.team === 0 && e.hp > 0 && !e.isBuilding && !e.canHarvest);
    army.forEach(e => e.sel = true);
    this.selected = army;
    if (army.length > 0) audio.play('select');
  }
  
  setGroup(n) { this.groups[n] = this.selected.map(e => e.id); }
  
  selectGroup(n) {
    const ids = this.groups[n];
    if (!ids || ids.length === 0) return null;
    
    const now = Date.now();
    const doubleTap = this.lastGroupTap[n] && (now - this.lastGroupTap[n] < 300);
    this.lastGroupTap[n] = now;
    
    this.entities.forEach(e => e.sel = false);
    const units = this.entities.filter(e => ids.includes(e.id) && e.hp > 0);
    units.forEach(e => e.sel = true);
    this.selected = units;
    if (units.length > 0) audio.play('select');
    
    // Double-tap: devolver posición para centrar cámara
    if (doubleTap && units.length > 0) {
      const cx = units.reduce((s, e) => s + e.x, 0) / units.length;
      const cy = units.reduce((s, e) => s + e.y, 0) / units.length;
      return { x: cx, y: cy };
    }
    return null;
  }
  
  clickAt(wx, wy) {
    for (const m of this.map.minerals) if (Math.sqrt((m.x - wx) ** 2 + (m.y - wy) ** 2) < 30 && m.amount > 0) return { type: 'mineral', resource: m };
    for (const g of this.map.geysers) if (Math.sqrt((g.x - wx) ** 2 + (g.y - wy) ** 2) < 35) return { type: 'geyser', resource: { ...g, isGeyser: true } };
    for (const e of this.entities) if (e.hp > 0 && Math.sqrt((e.x - wx) ** 2 + (e.y - wy) ** 2) < e.sz + 5) return { type: 'entity', entity: e };
    return { type: 'ground', x: wx, y: wy };
  }
  
  msg(text) { this.msgs.push({ text, time: this.time }); if (this.msgs.length > 5) this.msgs.shift(); }
  
  getAbilities() {
    if (this.selected.length !== 1) return [];
    const e = this.selected[0];
    return (e.ab || []).map(k => ({ k, ...ABILITIES[k], ready: (e.cd[k] || 0) <= this.time, hasE: !ABILITIES[k]?.energy || e.energy >= ABILITIES[k].energy }));
  }
  
  // ═══════════════════════════════════════════════════════════════
  // AI
  // ═══════════════════════════════════════════════════════════════
  
  updateAI() {
    const cfg = { easy: { mult: 0.8, atk: 20 }, normal: { mult: 1.3, atk: 12 }, hard: { mult: 2, atk: 8 }, insane: { mult: 3, atk: 5 } }[this.diff];
    
    this.aiRes.m += cfg.mult * 0.5;
    this.aiRes.g += cfg.mult * 0.15;
    
    const units = this.entities.filter(e => e.team === 1 && !e.isBuilding && e.hp > 0);
    const buildings = this.entities.filter(e => e.team === 1 && e.isBuilding && e.hp > 0 && e.built >= 1);
    const workers = units.filter(e => e.canHarvest);
    const army = units.filter(e => !e.canHarvest && e.dmg > 0);
    const enemies = this.entities.filter(e => e.team === 0 && e.hp > 0);
    
    const race = RACES[this.aiRace];
    const base = buildings.find(b => BUILDINGS[b.type]?.base);
    if (!base) return;
    
    // Workers harvest
    for (const w of workers) {
      if (w.constructing) continue;
      if (!w.harvesting || w.harvesting.amount <= 0) {
        let best = null, min = 999;
        for (const m of this.map.minerals) {
          if (m.amount > 0) {
            const dist = Math.sqrt((m.x - base.x) ** 2 + (m.y - base.y) ** 2);
            if (dist < 300 && m.workers.length < min) { best = m; min = m.workers.length; }
          }
        }
        if (best && min < 3) {
          if (w.harvesting) { const idx = w.harvesting.workers.indexOf(w.id); if (idx >= 0) w.harvesting.workers.splice(idx, 1); }
          w.harvesting = best; best.workers.push(w.id);
          w.path = findPath(this.map.grid, w.x, w.y, best.x, best.y); w.pathIdx = 0;
        }
      }
      if (w.harvesting) this.updateHarvest(w, 16);
    }
    
    // Build supply
    if (this.aiRes.sup >= this.aiRes.maxSup - 3) {
      if (race.s === 'overlord') {
        const hatch = buildings.find(b => BUILDINGS[b.type]?.prod?.includes('overlord') && !b.producing);
        if (hatch && this.aiRes.m >= 100) this.startProdInternal(hatch, 'overlord', 1);
      } else {
        const bd = BUILDINGS[race.s];
        if (bd && this.aiRes.m >= bd.c.m) {
          const freeWorker = workers.find(w => !w.constructing && !this.aiBuildQueue.some(q => q.workerId === w.id));
          if (freeWorker) this.queueBuild(freeWorker, race.s, base.x + (Math.random() - 0.5) * 150, base.y + (Math.random() - 0.5) * 150, 1);
        }
      }
    }
    
    // Build production
    const prodBs = buildings.filter(b => BUILDINGS[b.type]?.prod && !BUILDINGS[b.type]?.base);
    if (prodBs.length < 3 && this.aiRes.m >= 150) {
      let buildType = null;
      if (this.aiRace === 'protoss') {
        if (!this.aiBuildings.has('pylon')) buildType = 'pylon';
        else if (!this.aiBuildings.has('gateway')) buildType = 'gateway';
        else if (prodBs.length < 2) buildType = 'gateway';
      } else if (this.aiRace === 'zerg') {
        if (!this.aiBuildings.has('pool')) buildType = 'pool';
      } else {
        if (!this.aiBuildings.has('supplydepot')) buildType = 'supplydepot';
        else if (!this.aiBuildings.has('barracks')) buildType = 'barracks';
        else if (prodBs.length < 2) buildType = 'barracks';
      }
      if (buildType) {
        const bd = BUILDINGS[buildType];
        if (bd && this.aiRes.m >= bd.c.m) {
          const freeWorker = workers.find(w => !w.constructing && !this.aiBuildQueue.some(q => q.workerId === w.id));
          if (freeWorker) this.queueBuild(freeWorker, buildType, base.x + (Math.random() - 0.5) * 200, base.y + (Math.random() - 0.5) * 200, 1);
        }
      }
    }
    
    // Produce workers
    if (workers.length < 20) {
      for (const b of buildings) {
        if (BUILDINGS[b.type]?.prod?.includes(race.w) && !b.producing) {
          const wd = UNITS[race.w];
          if (this.aiRes.m >= wd.c.m && this.aiRes.sup + (wd.sup || 0) <= this.aiRes.maxSup) {
            this.startProdInternal(b, race.w, 1);
            break;
          }
        }
      }
    }
    
    // Produce army
    for (const pb of buildings) {
      if (pb.producing || pb.prodQueue.length >= 3) continue;
      const bd = BUILDINGS[pb.type];
      if (!bd?.prod) continue;
      
      const canProd = bd.prod.filter(u => {
        const ud = UNITS[u];
        if (!ud || ud.harvest) return false;
        if (this.aiRes.m < ud.c.m || this.aiRes.g < (ud.c.g || 0)) return false;
        if (this.aiRes.sup + (ud.sup || 0) > this.aiRes.maxSup) return false;
        if (ud.req) for (const r of ud.req) if (!this.aiBuildings.has(r)) return false;
        return true;
      });
      
      if (canProd.length > 0) {
        const cheapest = canProd.sort((a, b) => UNITS[a].c.m - UNITS[b].c.m)[0];
        this.startProdInternal(pb, cheapest, 1);
      }
    }
    
    // Army control
    if (army.length >= cfg.atk) {
      const target = enemies.find(e => e.isBuilding) || enemies[0];
      if (target) {
        for (const u of army) {
          if (!u.target || u.target.hp <= 0) {
            let closest = null, minD = 400;
            for (const e of enemies) {
              const d = Math.sqrt((e.x - u.x) ** 2 + (e.y - u.y) ** 2);
              if (d < minD) { closest = e; minD = d; }
            }
            if (closest) { u.target = closest; u.attackMove = true; }
            else if (u.path.length === 0) {
              u.path = findPath(this.map.grid, u.x, u.y, target.x + (Math.random() - 0.5) * 80, target.y + (Math.random() - 0.5) * 80);
              u.pathIdx = 0;
              u.attackMove = true;
            }
          }
        }
      }
    } else {
      for (const u of army) {
        const threat = enemies.find(e => Math.sqrt((e.x - base.x) ** 2 + (e.y - base.y) ** 2) < 400);
        if (threat) { u.target = threat; u.attackMove = true; }
        else if (Math.sqrt((u.x - base.x) ** 2 + (u.y - base.y) ** 2) > 200 && u.path.length === 0) {
          u.path = findPath(this.map.grid, u.x, u.y, base.x + (Math.random() - 0.5) * 80, base.y + (Math.random() - 0.5) * 80);
          u.pathIdx = 0;
        }
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// REACT COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function RTSGame() {
  const canvasRef = useRef(null);
  const minimapRef = useRef(null);
  const gameRef = useRef(null);
  
  const [screen, setScreen] = useState('menu');
  const [race, setRace] = useState('terran');
  const [diff, setDiff] = useState('normal');
  const [result, setResult] = useState(null);
  
  const [ui, setUi] = useState({ res: { m: 50, g: 0, sup: 0, maxSup: 0 }, sel: [], buildMode: null, abMode: null, abilities: [], msgs: [], prodQueue: [], fps: 60 });
  
  const camRef = useRef({ x: 0, y: 0, z: 1 });
  const dragRef = useRef({ active: false, sx: 0, sy: 0, ex: 0, ey: 0 });
  const keysRef = useRef({});
  const lastRef = useRef(performance.now());
  const fpsRef = useRef({ f: 0, t: 0 });

  const startGame = useCallback(() => {
    gameRef.current = new Game(race, diff);
    gameRef.current.init();
    const base = gameRef.current.map.bases[0];
    camRef.current = { x: base.x - window.innerWidth / 2, y: base.y - (window.innerHeight - 180) / 2, z: 1 };
    setScreen('game');
  }, [race, diff]);

  useEffect(() => {
    if (screen !== 'game') return;
    const canvas = canvasRef.current, minimap = minimapRef.current;
    const ctx = canvas.getContext('2d'), mctx = minimap.getContext('2d');
    const game = gameRef.current;
    if (!game) return;

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight - 180; };
    resize();
    window.addEventListener('resize', resize);

    let animId;
    const loop = (ts) => {
      fpsRef.current.f++;
      if (ts - fpsRef.current.t >= 1000) { setUi(p => ({ ...p, fps: fpsRef.current.f })); fpsRef.current.f = 0; fpsRef.current.t = ts; }
      
      const dt = Math.min(50, ts - lastRef.current);
      lastRef.current = ts;
      
      const cam = camRef.current, W = canvas.width, H = canvas.height;
      const camSpd = 600 * dt / 1000;
      if (keysRef.current['ArrowLeft'] || keysRef.current['a']) cam.x -= camSpd;
      if (keysRef.current['ArrowRight'] || keysRef.current['d']) cam.x += camSpd;
      if (keysRef.current['ArrowUp'] || keysRef.current['w']) cam.y -= camSpd;
      if (keysRef.current['ArrowDown'] || keysRef.current['s']) cam.y += camSpd;
      
      const mx = window.mouseX || 0, my = window.mouseY || 0;
      if (mx < 10) cam.x -= camSpd;
      if (mx > W - 10) cam.x += camSpd;
      if (my < 10) cam.y -= camSpd;
      if (my > H - 10 && my < H) cam.y += camSpd;
      
      cam.x = Math.max(0, Math.min(game.map.w - W / cam.z, cam.x));
      cam.y = Math.max(0, Math.min(game.map.h - H / cam.z, cam.y));
      
      const gameResult = game.update(dt);
      if (gameResult) { setResult(gameResult); setScreen('result'); return; }

      const z = cam.z;
      
      ctx.fillStyle = '#0c0c14';
      ctx.fillRect(0, 0, W, H);
      
      // Obstacles
      ctx.fillStyle = '#252538';
      for (let y = 0; y < game.map.rows; y++) {
        for (let x = 0; x < game.map.cols; x++) {
          if (game.map.grid[y][x] === 1) {
            const sx = (x * T - cam.x) * z, sy = (y * T - cam.y) * z;
            if (sx > -T * z && sx < W && sy > -T * z && sy < H) ctx.fillRect(sx, sy, T * z, T * z);
          }
        }
      }
      
      // Resources
      for (const m of game.map.minerals) {
        const sx = (m.x - cam.x) * z, sy = (m.y - cam.y) * z;
        if (sx > -40 && sx < W + 40 && sy > -40 && sy < H + 40 && m.amount > 0) {
          ctx.fillStyle = `rgba(80,180,255,${0.6 + m.amount / 3000 * 0.4})`;
          ctx.beginPath(); ctx.moveTo(sx, sy - 14 * z); ctx.lineTo(sx + 10 * z, sy); ctx.lineTo(sx, sy + 14 * z); ctx.lineTo(sx - 10 * z, sy); ctx.closePath(); ctx.fill();
        }
      }
      for (const g of game.map.geysers) {
        const sx = (g.x - cam.x) * z, sy = (g.y - cam.y) * z;
        if (sx > -40 && sx < W + 40 && sy > -40 && sy < H + 40 && g.amount > 0) {
          ctx.fillStyle = `rgba(80,255,80,${0.5 + g.amount / 5000 * 0.5})`;
          ctx.beginPath(); ctx.arc(sx, sy, 18 * z, 0, Math.PI * 2); ctx.fill();
        }
      }
      
      // Build queue ghosts
      for (const bq of game.buildQueue) {
        const bd = BUILDINGS[bq.type];
        if (bd && !bq.building) {
          const bsx = (bq.x - cam.x) * z, bsy = (bq.y - cam.y) * z;
          ctx.fillStyle = 'rgba(0,255,0,0.15)';
          ctx.fillRect(bsx - bd.sz * z, bsy - bd.sz * z, bd.sz * 2 * z, bd.sz * 2 * z);
          ctx.strokeStyle = 'rgba(0,255,0,0.4)'; ctx.lineWidth = 1;
          ctx.strokeRect(bsx - bd.sz * z, bsy - bd.sz * z, bd.sz * 2 * z, bd.sz * 2 * z);
        }
      }
      
      // Rally points
      for (const e of game.entities) {
        if (e.sel && e.rally) {
          const sx = (e.x - cam.x) * z, sy = (e.y - cam.y) * z;
          const rx = (e.rally.x - cam.x) * z, ry = (e.rally.y - cam.y) * z;
          ctx.strokeStyle = 'rgba(0,255,0,0.5)'; ctx.setLineDash([5, 5]); ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(rx, ry); ctx.stroke(); ctx.setLineDash([]);
          ctx.fillStyle = '#0f0';
          ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx, ry - 12 * z); ctx.lineTo(rx + 8 * z, ry - 8 * z); ctx.fill();
        }
        
        // Command queue waypoints
        if (e.sel && e.cmdQueue.length > 0) {
          let prevX = e.x, prevY = e.y;
          ctx.strokeStyle = 'rgba(0,200,255,0.3)'; ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
          for (const cmd of e.cmdQueue) {
            if (cmd.x !== undefined) {
              ctx.beginPath();
              ctx.moveTo((prevX - cam.x) * z, (prevY - cam.y) * z);
              ctx.lineTo((cmd.x - cam.x) * z, (cmd.y - cam.y) * z);
              ctx.stroke();
              ctx.fillStyle = 'rgba(0,200,255,0.5)';
              ctx.beginPath(); ctx.arc((cmd.x - cam.x) * z, (cmd.y - cam.y) * z, 4 * z, 0, Math.PI * 2); ctx.fill();
              prevX = cmd.x; prevY = cmd.y;
            }
          }
          ctx.setLineDash([]);
        }
      }
      
      // Entities
      for (const e of game.entities) {
        if (e.hp <= 0) continue;
        const fx = Math.floor(e.x / FOG), fy = Math.floor(e.y / FOG);
        if (e.team === 1 && game.fogVisible[fy * game.map.cols + fx] === 0) continue;
        
        const sx = (e.x - cam.x) * z, sy = (e.y - cam.y) * z;
        if (sx < -100 || sx > W + 100 || sy < -100 || sy > H + 100) continue;
        
        const sz = e.sz * z;
        const raceD = RACES[e.team === 0 ? game.race : game.aiRace];
        
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath(); ctx.ellipse(sx, sy + sz * 0.8, sz * 0.8, sz * 0.3, 0, 0, Math.PI * 2); ctx.fill();
        
        if (e.isBuilding && e.built < 1) {
          ctx.fillStyle = 'rgba(100,100,100,0.5)'; ctx.fillRect(sx - sz, sy - sz, sz * 2, sz * 2);
          ctx.fillStyle = raceD.d; ctx.fillRect(sx - sz, sy - sz, sz * 2 * e.built, sz * 2);
          ctx.fillStyle = '#000'; ctx.fillRect(sx - sz, sy + sz + 5, sz * 2, 6);
          ctx.fillStyle = '#ff0'; ctx.fillRect(sx - sz, sy + sz + 5, sz * 2 * e.built, 6);
          continue;
        }
        
        if (e.isBuilding) {
          ctx.fillStyle = e.team === 0 ? raceD.d : '#442';
          ctx.fillRect(sx - sz, sy - sz, sz * 2, sz * 2);
          ctx.strokeStyle = e.team === 0 ? raceD.c : '#844'; ctx.lineWidth = 2;
          ctx.strokeRect(sx - sz + 2, sy - sz + 2, sz * 2 - 4, sz * 2 - 4);
        } else {
          const isStim = e.buffs.some(b => b.type === 'stim');
          const isBuilding = e.constructing;
          ctx.fillStyle = isBuilding ? '#8f8' : (e.sieged ? '#fa0' : (isStim ? '#f88' : (e.team === 0 ? raceD.c : '#e44')));
          ctx.beginPath(); ctx.arc(sx, sy, sz, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = e.team === 0 ? raceD.l : '#faa'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(sx, sy, sz - 2, 0, Math.PI * 2); ctx.stroke();
          if (e.fly) { ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(sx, sy, sz + 4, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
          
          // Attack indicator
          if (e.target?.hp > 0) {
            ctx.strokeStyle = 'rgba(255,0,0,0.4)'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(sx, sy);
            ctx.lineTo((e.target.x - cam.x) * z, (e.target.y - cam.y) * z);
            ctx.stroke();
          }
        }
        
        if (e.sel) {
          ctx.strokeStyle = '#0f0'; ctx.lineWidth = 2;
          if (e.isBuilding) ctx.strokeRect(sx - sz - 4, sy - sz - 4, sz * 2 + 8, sz * 2 + 8);
          else { ctx.beginPath(); ctx.arc(sx, sy, sz + 5, 0, Math.PI * 2); ctx.stroke(); }
          if (e.rng > T && !e.isBuilding) {
            ctx.strokeStyle = 'rgba(255,0,0,0.15)'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(sx, sy, e.rng * z, 0, Math.PI * 2); ctx.stroke();
          }
        }
        
        // HP
        const barW = sz * 2.2, barH = 4 * z, barY = sy - sz - 12 * z;
        ctx.fillStyle = '#000';
        ctx.fillRect(sx - barW / 2 - 1, barY - 1, barW + 2, (e.maxSh > 0 ? barH * 2 + 3 : barH + 2));
        if (e.maxSh > 0) { ctx.fillStyle = '#4af'; ctx.fillRect(sx - barW / 2, barY, barW * (e.sh / e.maxSh), barH); }
        const hpY = e.maxSh > 0 ? barY + barH + 1 : barY;
        const hpPct = e.hp / e.maxHp;
        ctx.fillStyle = hpPct > 0.6 ? '#0f0' : hpPct > 0.3 ? '#fa0' : '#f00';
        ctx.fillRect(sx - barW / 2, hpY, barW * hpPct, barH);
        
        // Production progress
        if (e.producing) {
          const pd = UNITS[e.producing];
          if (pd) {
            const prog = 1 - (e.prodEnd - game.time) / (pd.bt * 1000);
            ctx.fillStyle = '#ff0'; ctx.fillRect(sx - barW / 2, sy + sz + 5, barW * Math.max(0, Math.min(1, prog)), 4);
          }
        }
      }
      
      // Effects
      game.fx.render(ctx, cam);
      
      // Fog
      for (let fy = 0; fy < game.map.rows; fy++) {
        for (let fx = 0; fx < game.map.cols; fx++) {
          const idx = fy * game.map.cols + fx;
          if (game.fogVisible[idx] === 0) {
            const op = game.fogExplored[idx] === 1 ? 0.5 : 0.85;
            ctx.fillStyle = `rgba(0,0,0,${op})`;
            const fsx = (fx * FOG - cam.x) * z, fsy = (fy * FOG - cam.y) * z;
            if (fsx > -FOG * z && fsx < W && fsy > -FOG * z && fsy < H) ctx.fillRect(fsx, fsy, FOG * z + 1, FOG * z + 1);
          }
        }
      }
      
      // Selection box
      if (dragRef.current.active) {
        const d = dragRef.current;
        ctx.strokeStyle = '#0f0'; ctx.lineWidth = 1; ctx.fillStyle = 'rgba(0,255,0,0.1)';
        const bx = Math.min(d.sx, d.ex), by = Math.min(d.sy, d.ey), bw = Math.abs(d.ex - d.sx), bh = Math.abs(d.ey - d.sy);
        ctx.fillRect(bx, by, bw, bh); ctx.strokeRect(bx, by, bw, bh);
      }
      
      // Build placement
      if (ui.buildMode) {
        const bd = BUILDINGS[ui.buildMode];
        if (bd) {
          const wmx = (window.mouseX || 0) / z + cam.x, wmy = (window.mouseY || 0) / z + cam.y;
          const gx = Math.floor(wmx / T) * T + T / 2, gy = Math.floor(wmy / T) * T + T / 2;
          const bsx = (gx - cam.x) * z, bsy = (gy - cam.y) * z;
          ctx.fillStyle = 'rgba(0,255,0,0.3)'; ctx.strokeStyle = '#0f0'; ctx.lineWidth = 2;
          ctx.fillRect(bsx - bd.sz * z, bsy - bd.sz * z, bd.sz * 2 * z, bd.sz * 2 * z);
          ctx.strokeRect(bsx - bd.sz * z, bsy - bd.sz * z, bd.sz * 2 * z, bd.sz * 2 * z);
        }
      }
      
      // Ability range
      if (ui.abMode) {
        const ab = ABILITIES[ui.abMode];
        if (ab?.range) {
          const sel = game.selected[0];
          if (sel) {
            const asx = (sel.x - cam.x) * z, asy = (sel.y - cam.y) * z;
            ctx.strokeStyle = 'rgba(100,200,255,0.5)'; ctx.setLineDash([5, 5]); ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(asx, asy, ab.range * T * z, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
          }
        }
      }
      
      // Minimap
      const mw = 200, mh = 150;
      minimap.width = mw; minimap.height = mh;
      const scX = mw / game.map.w, scY = mh / game.map.h;
      mctx.fillStyle = '#0c0c14'; mctx.fillRect(0, 0, mw, mh);
      mctx.fillStyle = '#1a1a28';
      for (let ffy = 0; ffy < game.map.rows; ffy++) for (let ffx = 0; ffx < game.map.cols; ffx++) {
        if (game.fogExplored[ffy * game.map.cols + ffx] === 1) mctx.fillRect(ffx * FOG * scX, ffy * FOG * scY, FOG * scX + 1, FOG * scY + 1);
      }
      mctx.fillStyle = '#4af';
      for (const m of game.map.minerals) if (m.amount > 0) mctx.fillRect(m.x * scX - 2, m.y * scY - 2, 4, 4);
      mctx.fillStyle = '#4f4';
      for (const g of game.map.geysers) if (g.amount > 0) mctx.fillRect(g.x * scX - 2, g.y * scY - 2, 4, 4);
      for (const e of game.entities) {
        if (e.hp <= 0) continue;
        const efx = Math.floor(e.x / FOG), efy = Math.floor(e.y / FOG);
        if (e.team === 1 && game.fogVisible[efy * game.map.cols + efx] === 0) continue;
        mctx.fillStyle = e.team === 0 ? (e.sel ? '#ff0' : '#0f0') : '#f00';
        mctx.fillRect(e.x * scX - (e.isBuilding ? 2 : 1), e.y * scY - (e.isBuilding ? 2 : 1), e.isBuilding ? 4 : 2, e.isBuilding ? 4 : 2);
      }
      mctx.strokeStyle = '#fff'; mctx.lineWidth = 1;
      mctx.strokeRect(cam.x * scX, cam.y * scY, (W / z) * scX, (H / z) * scY);
      
      // Get production queue for selected building
      let prodQ = [];
      const selB = game.selected.find(e => e.isBuilding && e.producing);
      if (selB) prodQ = [selB.producing, ...selB.prodQueue];
      
      setUi(p => ({ ...p, res: { ...game.res }, sel: game.selected, abilities: game.getAbilities(), msgs: game.msgs, prodQueue: prodQ }));
      
      animId = requestAnimationFrame(loop);
    };
    
    animId = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, [screen, ui.buildMode, ui.abMode]);

  const toWorld = (cx, cy) => ({ x: cx / camRef.current.z + camRef.current.x, y: cy / camRef.current.z + camRef.current.y });

  const handlePointerDown = (e) => {
    if (!gameRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
    if (e.button === 2) return;
    
    if (ui.buildMode) {
      const { x, y } = toWorld(cx, cy);
      const gx = Math.floor(x / T) * T + T / 2, gy = Math.floor(y / T) * T + T / 2;
      gameRef.current.cmd('build', { type: ui.buildMode, x: gx, y: gy }, e.shiftKey);
      if (!e.shiftKey) setUi(p => ({ ...p, buildMode: null }));
      return;
    }
    if (ui.abMode) {
      const { x, y } = toWorld(cx, cy);
      gameRef.current.cmd('ability', { ab: ui.abMode, x, y }, e.shiftKey);
      setUi(p => ({ ...p, abMode: null }));
      return;
    }
    dragRef.current = { active: true, sx: cx, sy: cy, ex: cx, ey: cy };
  };

  const handlePointerMove = (e) => {
    window.mouseX = e.clientX; window.mouseY = e.clientY;
    if (dragRef.current.active) {
      const rect = canvasRef.current.getBoundingClientRect();
      dragRef.current.ex = e.clientX - rect.left;
      dragRef.current.ey = e.clientY - rect.top;
    }
  };

  const handlePointerUp = (e) => {
    if (!gameRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
    if (dragRef.current.active) {
      const d = dragRef.current;
      const w1 = toWorld(Math.min(d.sx, d.ex), Math.min(d.sy, d.ey));
      const w2 = toWorld(Math.max(d.sx, d.ex), Math.max(d.sy, d.ey));
      const isClick = Math.abs(d.ex - d.sx) < 10 && Math.abs(d.ey - d.sy) < 10;
      if (isClick) {
        const { x, y } = toWorld(cx, cy);
        const click = gameRef.current.clickAt(x, y);
        if ((click.type === 'mineral' || click.type === 'geyser') && gameRef.current.selected.some(s => s.canHarvest)) gameRef.current.cmd('harvest', { resource: click.resource }, e.shiftKey);
        else gameRef.current.select(x, y, 0, 0, e.shiftKey, 'click');
      } else gameRef.current.select(w1.x, w1.y, w2.x - w1.x, w2.y - w1.y, e.shiftKey, 'box');
      dragRef.current.active = false;
    }
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    if (!gameRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const { x, y } = toWorld(e.clientX - rect.left, e.clientY - rect.top);
    const click = gameRef.current.clickAt(x, y);
    if (click.type === 'mineral' || click.type === 'geyser') gameRef.current.cmd('harvest', { resource: click.resource }, e.shiftKey);
    else if (click.type === 'entity') {
      if (click.entity.team === 1) gameRef.current.cmd('attack', { target: click.entity }, e.shiftKey);
      else if (click.entity.isBuilding) gameRef.current.cmd('rally', { x: click.entity.x, y: click.entity.y });
    } else {
      if (keysRef.current['a']) gameRef.current.cmd('attackMove', { x, y }, e.shiftKey);
      else if (keysRef.current['p']) gameRef.current.cmd('patrol', { x, y }, e.shiftKey);
      else gameRef.current.cmd('move', { x, y }, e.shiftKey);
    }
  };

  const handleMinimapClick = (e) => {
    if (!gameRef.current) return;
    const rect = minimapRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    if (e.button === 2) {
      const wx = (mx / 200) * gameRef.current.map.w, wy = (my / 150) * gameRef.current.map.h;
      gameRef.current.cmd('attackMove', { x: wx, y: wy }, e.shiftKey);
    } else {
      camRef.current.x = (mx / 200) * gameRef.current.map.w - canvasRef.current.width / 2 / camRef.current.z;
      camRef.current.y = (my / 150) * gameRef.current.map.h - canvasRef.current.height / 2 / camRef.current.z;
    }
  };

  const handleWheel = (e) => { camRef.current.z = Math.max(0.5, Math.min(2, camRef.current.z * (e.deltaY > 0 ? 0.9 : 1.1))); };

  useEffect(() => {
    if (screen !== 'game') return;
    const down = (e) => {
      keysRef.current[e.key.toLowerCase()] = true;
      const game = gameRef.current;
      if (!game) return;
      
      if (e.key >= '1' && e.key <= '9') {
        if (e.ctrlKey || e.metaKey) { game.setGroup(parseInt(e.key)); e.preventDefault(); }
        else {
          const pos = game.selectGroup(parseInt(e.key));
          if (pos) { camRef.current.x = pos.x - canvasRef.current.width / 2; camRef.current.y = pos.y - canvasRef.current.height / 2; }
        }
      }
      
      switch (e.key.toLowerCase()) {
        case 's': if (!e.ctrlKey) game.cmd('stop', {}); break;
        case 'h': game.cmd('hold', {}); break;
        case 'escape': setUi(p => ({ ...p, buildMode: null, abMode: null })); break;
        case 'f1': const base = game.entities.find(e => e.team === 0 && e.isBuilding); if (base) { camRef.current.x = base.x - canvasRef.current.width / 2; camRef.current.y = base.y - canvasRef.current.height / 2; } break;
        case ' ': if (game.selected.length > 0) { const sel = game.selected[0]; camRef.current.x = sel.x - canvasRef.current.width / 2; camRef.current.y = sel.y - canvasRef.current.height / 2; } break;
      }
      
      // Hotkeys for production
      const selB = game.selected.find(s => s.isBuilding);
      if (selB) {
        const bd = BUILDINGS[selB.type];
        if (bd?.prod) {
          for (const u of bd.prod) {
            const ud = UNITS[u];
            if (ud?.hk && e.key.toLowerCase() === ud.hk.toLowerCase()) {
              game.cmd('produce', { unit: u });
              break;
            }
          }
        }
      }
      
      // Ability hotkeys
      for (const ab of ui.abilities) {
        if (e.key.toLowerCase() === (ab.k || '').toLowerCase() && ab.ready && ab.hasE) {
          if (ab.target) setUi(p => ({ ...p, abMode: ab.k }));
          else game.cmd('ability', { ab: ab.k });
          break;
        }
      }
    };
    const up = (e) => { keysRef.current[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [screen, ui.abilities]);

  const getAvailBuildings = () => {
    if (!gameRef.current) return [];
    return Object.entries(BUILDINGS).filter(([k, v]) => v.r === gameRef.current.race && !v.addon).map(([k, v]) => ({ key: k, ...v }));
  };

  const getProdUnits = () => {
    if (!gameRef.current || ui.sel.length === 0) return [];
    const b = ui.sel.find(e => e.isBuilding && BUILDINGS[e.type]?.prod);
    if (!b) return [];
    return BUILDINGS[b.type].prod.map(u => ({ key: u, ...UNITS[u] }));
  };

  if (screen === 'menu') {
    return (
      <div style={{ width: '100vw', height: '100vh', background: 'linear-gradient(135deg, #050510 0%, #101025 50%, #0a0a18 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui', color: '#fff' }}>
        <h1 style={{ fontSize: 48, marginBottom: 10, textShadow: '0 0 30px #4af', letterSpacing: 6 }}>STARCRAFT RTS</h1>
        <p style={{ color: '#888', marginBottom: 40, letterSpacing: 3 }}>REAL-TIME STRATEGY</p>
        
        <div style={{ marginBottom: 25 }}>
          <p style={{ color: '#666', marginBottom: 8, textAlign: 'center', fontSize: 12 }}>RAZA</p>
          <div style={{ display: 'flex', gap: 12 }}>
            {Object.entries(RACES).map(([k, v]) => (
              <button key={k} onClick={() => setRace(k)} style={{ width: 100, height: 70, background: race === k ? `linear-gradient(180deg, ${v.c}44, ${v.d})` : '#111', border: `2px solid ${race === k ? v.c : '#333'}`, borderRadius: 8, color: '#fff', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 20 }}>{k === 'protoss' ? '💠' : k === 'zerg' ? '🦎' : '🔧'}</span>
                <span style={{ fontSize: 12, marginTop: 4 }}>{v.n}</span>
              </button>
            ))}
          </div>
        </div>
        
        <div style={{ marginBottom: 35 }}>
          <p style={{ color: '#666', marginBottom: 8, textAlign: 'center', fontSize: 12 }}>DIFICULTAD</p>
          <div style={{ display: 'flex', gap: 8 }}>
            {['easy', 'normal', 'hard', 'insane'].map(d => (
              <button key={d} onClick={() => setDiff(d)} style={{ padding: '6px 16px', fontSize: 11, background: diff === d ? (d === 'insane' ? '#633' : d === 'hard' ? '#553' : '#343') : '#111', border: `1px solid ${diff === d ? '#888' : '#333'}`, borderRadius: 5, color: '#fff', cursor: 'pointer', textTransform: 'uppercase' }}>{d}</button>
            ))}
          </div>
        </div>
        
        <button onClick={startGame} style={{ padding: '15px 60px', fontSize: 18, background: 'linear-gradient(180deg, #4a4 0%, #282 100%)', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', boxShadow: '0 5px 25px rgba(0,255,0,0.3)', letterSpacing: 2 }}>INICIAR</button>
        <p style={{ color: '#444', marginTop: 25, fontSize: 10, maxWidth: 500, textAlign: 'center' }}>WASD: Cámara | Click izq: Seleccionar | Click der: Mover/Atacar | Shift+Click: Encolar | A+Click: Attack-move | P+Click: Patrol | Ctrl+1-9: Crear grupo | 1-9: Seleccionar (x2: centrar)</p>
      </div>
    );
  }

  if (screen === 'result') {
    return (
      <div style={{ width: '100vw', height: '100vh', background: '#050510', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui', color: '#fff' }}>
        <h1 style={{ fontSize: 64, color: result === 'victory' ? '#4f4' : '#f44', textShadow: `0 0 40px ${result === 'victory' ? '#4f4' : '#f44'}`, marginBottom: 20 }}>{result === 'victory' ? 'VICTORIA' : 'DERROTA'}</h1>
        <button onClick={() => setScreen('menu')} style={{ padding: '12px 40px', fontSize: 16, background: '#223', border: '2px solid #446', borderRadius: 8, color: '#fff', cursor: 'pointer' }}>Menú</button>
      </div>
    );
  }

  const raceD = gameRef.current ? RACES[gameRef.current.race] : RACES.terran;
  
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000', overflow: 'hidden', fontFamily: 'system-ui', userSelect: 'none' }}>
      <div style={{ height: 40, background: 'linear-gradient(180deg, #1a1a28 0%, #0c0c14 100%)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', borderBottom: '1px solid #333' }}>
        <div style={{ display: 'flex', gap: 35, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ fontSize: 16 }}>💎</span><span style={{ color: '#4af', fontSize: 14, fontWeight: 'bold', minWidth: 45 }}>{ui.res.m}</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ fontSize: 16 }}>⛽</span><span style={{ color: '#4f4', fontSize: 14, fontWeight: 'bold', minWidth: 45 }}>{ui.res.g}</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ fontSize: 14 }}>👥</span><span style={{ color: ui.res.sup >= ui.res.maxSup ? '#f44' : '#fa0', fontSize: 14, fontWeight: 'bold' }}>{Math.floor(ui.res.sup)}/{ui.res.maxSup}</span></div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ color: '#666', fontSize: 10 }}>FPS: {ui.fps}</span>
          <span style={{ color: raceD.c, fontSize: 11 }}>{raceD.n}</span>
        </div>
      </div>
      
      <canvas ref={canvasRef} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onContextMenu={handleContextMenu} onWheel={handleWheel} style={{ display: 'block', cursor: ui.buildMode || ui.abMode ? 'crosshair' : 'default' }} />
      
      <div style={{ position: 'absolute', top: 50, left: 20, pointerEvents: 'none' }}>
        {ui.msgs.slice(-3).map((m, i) => (<div key={i} style={{ color: '#fff', fontSize: 11, marginBottom: 3, textShadow: '0 0 3px #000' }}>{m.text}</div>))}
      </div>
      
      <div style={{ height: 140, background: 'linear-gradient(180deg, #0c0c14 0%, #1a1a28 100%)', display: 'flex', borderTop: '2px solid #333' }}>
        <div style={{ width: 210, padding: 5, borderRight: '1px solid #333' }}>
          <canvas ref={minimapRef} onClick={handleMinimapClick} onContextMenu={handleMinimapClick} style={{ width: 200, height: 130, border: '1px solid #444', cursor: 'pointer' }} />
        </div>
        
        <div style={{ width: 180, padding: 8, borderRight: '1px solid #333' }}>
          {ui.sel.length > 0 && (
            <>
              <div style={{ color: '#fff', fontSize: 12, marginBottom: 4 }}>{ui.sel.length === 1 ? ui.sel[0].type.toUpperCase() : `${ui.sel.length} UNITS`}</div>
              {ui.sel.length === 1 && (
                <>
                  <div style={{ fontSize: 10, color: '#888' }}>HP: {Math.floor(ui.sel[0].hp)}/{ui.sel[0].maxHp}{ui.sel[0].maxSh > 0 && ` | SH: ${Math.floor(ui.sel[0].sh)}`}</div>
                  {ui.sel[0].maxE > 0 && <div style={{ fontSize: 10, color: '#a4f' }}>E: {Math.floor(ui.sel[0].energy)}/{ui.sel[0].maxE}</div>}
                  {ui.sel[0].dmg > 0 && <div style={{ fontSize: 10, color: '#f88' }}>DMG: {ui.sel[0].dmg} | RNG: {Math.floor(ui.sel[0].rng / T)}</div>}
                  {ui.sel[0].cmdQueue?.length > 0 && <div style={{ fontSize: 9, color: '#8cf' }}>Queued: {ui.sel[0].cmdQueue.length}</div>}
                </>
              )}
              {/* Production queue */}
              {ui.prodQueue.length > 0 && (
                <div style={{ marginTop: 6 }}>
                  <div style={{ fontSize: 9, color: '#666', marginBottom: 2 }}>COLA:</div>
                  <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    {ui.prodQueue.map((u, i) => (
                      <div key={i} onClick={() => gameRef.current?.cancelProd(gameRef.current.selected[0], i)} style={{ width: 20, height: 20, background: i === 0 ? '#454' : '#223', border: '1px solid #555', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, cursor: 'pointer' }} title="Click para cancelar">
                        {UNITS[u]?.icon || '?'}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        
        <div style={{ flex: 1, padding: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {ui.abilities.length > 0 && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {ui.abilities.map(ab => (
                <button key={ab.k} onClick={() => { if (ab.ready && ab.hasE) { if (ab.target) setUi(p => ({ ...p, abMode: ab.k })); else gameRef.current?.cmd('ability', { ab: ab.k }); } }} disabled={!ab.ready || !ab.hasE} title={ab.desc} style={{ padding: '4px 8px', fontSize: 10, background: ui.abMode === ab.k ? '#458' : (ab.ready && ab.hasE ? '#235' : '#111'), border: `1px solid ${ab.ready && ab.hasE ? '#48a' : '#333'}`, borderRadius: 4, color: ab.ready && ab.hasE ? '#8cf' : '#555', cursor: ab.ready && ab.hasE ? 'pointer' : 'not-allowed' }}>
                  <span style={{ color: '#ff0', marginRight: 3 }}>[{ab.k}]</span>{ab.n}
                </button>
              ))}
            </div>
          )}
          
          {ui.sel.some(e => e.canBuild) && (
            <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              {getAvailBuildings().slice(0, 12).map(b => (
                <button key={b.key} onClick={() => setUi(p => ({ ...p, buildMode: b.key }))} disabled={ui.res.m < b.c.m || ui.res.g < (b.c.g || 0)} style={{ padding: '3px 6px', fontSize: 9, background: ui.buildMode === b.key ? '#454' : (ui.res.m >= b.c.m && ui.res.g >= (b.c.g || 0) ? '#222' : '#111'), border: `1px solid ${ui.buildMode === b.key ? '#6a6' : '#444'}`, borderRadius: 3, color: ui.res.m >= b.c.m && ui.res.g >= (b.c.g || 0) ? '#fff' : '#555', cursor: ui.res.m >= b.c.m && ui.res.g >= (b.c.g || 0) ? 'pointer' : 'not-allowed' }}>
                  {b.icon} {b.key.slice(0, 8)} ({b.c.m}{b.c.g > 0 && `/${b.c.g}`})
                </button>
              ))}
            </div>
          )}
          
          {getProdUnits().length > 0 && (
            <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              {getProdUnits().map(u => {
                const ok = ui.res.m >= u.c.m && ui.res.g >= (u.c.g || 0) && ui.res.sup + (u.sup || 0) <= ui.res.maxSup;
                return (
                  <button key={u.key} onClick={() => gameRef.current?.cmd('produce', { unit: u.key })} disabled={!ok} style={{ padding: '3px 6px', fontSize: 9, background: ok ? '#223' : '#111', border: `1px solid ${ok ? '#446' : '#333'}`, borderRadius: 3, color: ok ? '#aaf' : '#555', cursor: ok ? 'pointer' : 'not-allowed' }}>
                    {u.icon} [{u.hk}] {u.key.slice(0, 7)} ({u.c.m}{u.c.g > 0 && `/${u.c.g}`}) ⬆{u.sup || 0}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        
        <div style={{ width: 90, padding: 8, borderLeft: '1px solid #333', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <button onClick={() => gameRef.current?.cmd('stop', {})} style={{ padding: '4px', fontSize: 10, background: '#222', border: '1px solid #444', borderRadius: 3, color: '#fff', cursor: 'pointer' }}>[S] Stop</button>
          <button onClick={() => gameRef.current?.cmd('hold', {})} style={{ padding: '4px', fontSize: 10, background: '#222', border: '1px solid #444', borderRadius: 3, color: '#fff', cursor: 'pointer' }}>[H] Hold</button>
          <button onClick={() => gameRef.current?.selectAll()} style={{ padding: '4px', fontSize: 10, background: '#222', border: '1px solid #444', borderRadius: 3, color: '#fff', cursor: 'pointer' }}>Select All</button>
        </div>
      </div>
    </div>
  );
}
