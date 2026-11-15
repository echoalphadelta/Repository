// ---- 16-bit sepia: drawn a pixel at a time, then scaled up with hard edges ----
const Pix = (() => {
  // nine sepia tones, darkest first
  const P = ['#1c120a', '#36251a', '#55392a', '#74513a', '#94704f', '#b38f68', '#cdab80', '#e2c79c', '#f3e3bf'];
  const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
  function rng(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
  function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function rect(g, x, y, w, h, col) { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  // a tiny 3x5 font for the small print
  const F3 = { A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100', Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010', U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010', Z: '111001010100111',
    0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110', 4: '101101111001001', 5: '111100110001110', 6: '011100111101111', 7: '111001010010010', 8: '111101111101111', 9: '111101111001110', ':': '000010000010000', '.': '000000000000010', '-': '000000111000000', ' ': '000000000000000' };
  function small(g, text, cx, y, col, hi) {
    text = String(text).toUpperCase(); const w = text.length * 4 - 1; let x = Math.round(cx - w / 2);
    for (const ch of text) { const b = F3[ch] || F3[' ']; for (let i = 0; i < 15; i++) if (b[i] === '1') { if (hi) rect(g, x + i % 3, y + (i / 3 | 0) + 1, 1, 1, hi); } for (let i = 0; i < 15; i++) if (b[i] === '1') rect(g, x + i % 3, y + (i / 3 | 0), 1, 1, col); x += 4; }
  }
  // the western face drawn at pixel size: anything over half covered is ink, the rest is not
  function big(g, text, cx, base, size, col, hi, sx) {
    const W = g.canvas.width, H = g.canvas.height, m = canvas(W, H), mg = m.getContext('2d');
    mg.font = `${size}px Rye, serif`; mg.textAlign = 'center'; mg.fillStyle = '#000'; mg.translate(cx, 0); mg.scale(sx || 1, 1); mg.fillText(text, 0, base);
    const d = mg.getImageData(0, 0, W, H).data, on = (x, y) => x >= 0 && y >= 0 && x < W && y < H && d[(y * W + x) * 4 + 3] > 120;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (on(x, y)) rect(g, x, y, 1, 1, col);
      else if (hi && on(x - 1, y - 1)) rect(g, x, y, 1, 1, hi);
    }
  }
  // poster lettering: arched along a curve, filled light to deep in bands, bevelled, outlined, dropped shadow
  function epic(g, text, cx, base, size, opt) {
    opt = Object.assign({ arc: 0, stretch: 1.15, shadow: 2 }, opt || {});
    const W = g.canvas.width, H = g.canvas.height, m = canvas(W, H), mg = m.getContext('2d');
    mg.font = `${size}px Rye, serif`; mg.textBaseline = 'alphabetic'; mg.fillStyle = '#000';
    const ws = [...text].map(ch => mg.measureText(ch).width), total = ws.reduce((a, b) => a + b, 0), half = total / 2;
    const lift = x => { const t = (x - cx) / half; return -opt.arc * (1 - t * t); };
    let x = cx - half;
    [...text].forEach((ch, i) => { const mid = x + ws[i] / 2, t = (mid - cx) / half, ang = Math.atan(2 * opt.arc * t / half);
      mg.save(); mg.translate(mid, base + lift(mid)); mg.rotate(ang); mg.scale(1, opt.stretch); mg.textAlign = 'center'; mg.fillText(ch, 0, 0); mg.restore(); x += ws[i]; });
    const d = mg.getImageData(0, 0, W, H).data, on = (x, y) => x >= 0 && y >= 0 && x < W && y < H && d[(y * W + x) * 4 + 3] > 120;
    const capH = size * 0.74 * opt.stretch;
    // flat: one colour, an optional dark outline, no shading and no shadow
    if (opt.flat) {
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (on(x, y)) { rect(g, x, y, 1, 1, opt.fill || P[7]); continue; }
        if (opt.outline !== false && (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1))) rect(g, x, y, 1, 1, P[0]);
      }
      return;
    }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (on(x, y)) continue;
      let near = false; for (let a = -1; a <= 1 && !near; a++) for (let b = -1; b <= 1; b++) if (on(x + a, y + b)) { near = true; break; }
      if (near) { rect(g, x, y, 1, 1, P[0]); continue; }
      for (let k = 2; k <= opt.shadow + 1; k++) if (on(x - k, y - k)) { rect(g, x, y, 1, 1, P[1]); break; } }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (!on(x, y)) continue;
      const v = (y - (base + lift(x) - capH)) / capH;
      let k = v < 0.22 ? 8 : v < 0.5 ? 7 : v < 0.58 ? 5 : v < 0.82 ? 6 : 5;
      if (!on(x + 1, y + 1) || !on(x, y + 1)) k -= 2; else if (!on(x - 1, y - 1) || !on(x, y - 1)) k = 8;
      rect(g, x, y, 1, 1, P[Math.max(2, Math.min(8, k))]); }
  }
  // a plank: dark outline, lit top edge, broken grain lines, a knot or two, nails
  function board(w, h, seed, opt) {
    opt = Object.assign({ dir: 0, tone: 5, nails: [] }, opt || {});
    const c = canvas(w, h), g = c.getContext('2d'), r = rng(seed), t = opt.tone, tip = Math.round(h * 0.55);
    // which pixels belong to the board (an arrow point at one end when dir is set)
    const inside = (x, y) => { if (y < 0 || y >= h || x < 0 || x >= w) return false;
      const mid = (h - 1) / 2, dy = Math.abs(y - mid);
      if (opt.dir > 0 && x > w - 1 - tip) return (w - 1 - x) >= dy * tip / mid - 0.5;
      if (opt.dir < 0 && x < tip) return x >= dy * tip / mid - 0.5;
      return true; };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (inside(x, y)) rect(g, x, y, 1, 1, P[t]);
    // grain: long thin streaks running the length
    for (let k = 0; k < h * 1.6; k++) { const y = 2 + Math.floor(r() * (h - 4)), x0 = Math.floor(r() * w), len = 6 + Math.floor(r() * w * 0.5), col = r() < 0.7 ? P[t - 1] : P[t + 1];
      for (let x = x0; x < x0 + len; x++) { const yy = y + (r() < 0.06 ? 1 : 0); if (inside(x, yy) && r() > 0.12) rect(g, x, yy, 1, 1, col); } }
    // a knot
    for (let k = 0; k < (opt.knots ?? 1); k++) { const kx = Math.floor(w * (0.15 + r() * 0.7)), ky = Math.floor(h * (0.3 + r() * 0.4));
      [[0, 0, 2], [-1, 0, 1], [1, 0, 1], [0, -1, 1], [0, 1, 1], [-2, 0, 0], [2, 0, 0]].forEach(([a, b, s]) => { if (inside(kx + a, ky + b)) rect(g, kx + a, ky + b, 1, 1, P[t - 1 - s]); }); }
    // edges: light along the top, shade along the bottom, dark outline all round
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { if (!inside(x, y)) continue;
      const out = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
      if (out) rect(g, x, y, 1, 1, P[0]);
      else if (!inside(x, y - 2)) rect(g, x, y, 1, 1, P[t + 2]);
      else if (!inside(x, y + 2)) rect(g, x, y, 1, 1, P[t - 2]); }
    opt.nails.forEach(([x, y]) => { rect(g, x, y, 2, 2, P[1]); rect(g, x, y, 1, 1, P[6]); });
    return c;
  }
  // desert at sundown: dithered sky, a banded sun, mesas, cactus, a fence
  function scene(w, h, seed, opt) {
    opt = Object.assign({ hz: 0.6, sunX: 0.72 }, opt || {});
    const c = canvas(w, h), g = c.getContext('2d'), r = rng(seed), hz = Math.round(h * opt.hz);
    const sky = [P[4], P[5], P[6], P[7], P[8]];
    for (let y = 0; y < hz; y++) { const f = Math.pow(y / hz, 1.3) * (sky.length - 1), i = Math.floor(f), t = f - i;
      for (let x = 0; x < w; x++) rect(g, x, y, 1, 1, t * 16 > BAYER[y & 3][x & 3] + 0.5 ? sky[Math.min(sky.length - 1, i + 1)] : sky[i]); }
    const sx = Math.round(w * opt.sunX), sr = Math.round(Math.min(w, h) * 0.13), sy = hz - Math.round(sr * 0.35);
    for (let y = -sr; y <= sr; y++) for (let x = -sr; x <= sr; x++) if (x * x + y * y <= sr * sr + sr && sy + y < hz) { if (y > 0 && (y % 3 === 0)) continue; rect(g, sx + x, sy + y, 1, 1, P[8]); }
    const mesa = (x0, x1, top, slope, col, lit) => { for (let x = x0; x <= x1; x++) { const e = Math.min(x - x0, x1 - x) * slope, y = Math.max(top, hz - e); rect(g, x, y, 1, hz - y + 1, col);
      if (lit && x1 - x < (hz - top) / slope) rect(g, x, y, 1, 1, lit); } };
    mesa(-6, Math.round(w * 0.32), hz - Math.round(h * 0.16), 1.6, P[4], P[5]);
    mesa(Math.round(w * 0.38), Math.round(w * 0.58), hz - Math.round(h * 0.1), 1.8, P[4], P[5]);
    mesa(Math.round(w * 0.82), w + 8, hz - Math.round(h * 0.14), 1.5, P[4], P[5]);
    mesa(-20, Math.round(w * 0.2), hz - Math.round(h * 0.08), 2.4, P[3], null);
    // ground in bands, dithered where they meet
    const gr = [P[3], P[4], P[5], P[5]];
    for (let y = hz; y < h; y++) { const f = (y - hz) / (h - hz) * (gr.length - 1), i = Math.floor(f), t = f - i;
      for (let x = 0; x < w; x++) rect(g, x, y, 1, 1, t * 16 > BAYER[y & 3][x & 3] + 0.5 ? gr[Math.min(gr.length - 1, i + 1)] : gr[i]); }
    for (let k = 0; k < w * (h - hz) / 90; k++) { const x = Math.floor(r() * w), y = hz + 3 + Math.floor(r() * (h - hz - 3)); rect(g, x, y, 2, 1, P[3]); rect(g, x + 1, y - 1, 1, 1, P[2]); }
    if (opt.fence) { const [fx0, fx1] = opt.fence; for (let x = fx0; x <= fx1; x += 7) rect(g, x, hz - 1, 1, 4, P[2]); rect(g, fx0, hz, fx1 - fx0 + 1, 1, P[2]); }
    return c;
  }
  // a saguaro, lit from the sun side
  function cactus(g, x, y, h, flip) {
    const s = flip ? -1 : 1, X = (dx) => flip ? x + 3 - dx : x + dx;
    const col = (dx, yy, hh, c) => rect(g, X(dx), yy, 1, hh, c);
    for (let i = 0; i < 4; i++) col(i, y + (i === 0 || i === 3 ? 1 : 0), h - (i === 0 || i === 3 ? 1 : 0), i === 3 ? P[0] : i === 0 ? P[2] : P[1]);
    const ay = Math.round(y + h * 0.45), by = Math.round(y + h * 0.25);
    for (let i = -3; i < 0; i++) col(i, ay, 2, P[1]); col(-3, by, ay - by, P[2]); col(-2, by, ay - by + 1, P[1]);
    const cy = Math.round(y + h * 0.55), dy = Math.round(y + h * 0.35);
    for (let i = 4; i < 7; i++) col(i, cy, 2, P[0]); col(5, dy, cy - dy, P[1]); col(6, dy, cy - dy + 1, P[0]);
    rect(g, Math.min(X(-3), X(6)), y + h, 10, 1, P[2]);
  }
  // blow a small canvas up into a big one with no smoothing
  function scale(c, k) { const o = canvas(c.width * k, c.height * k), g = o.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(c, 0, 0, o.width, o.height); return o; }
  return { P, rng, canvas, rect, small, big, epic, board, scene, cactus, scale };
})();
