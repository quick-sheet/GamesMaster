/* Games Master core: pure game logic, no DOM. Runs in the browser (window.Core) and in plain Node for tests. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Core = factory();
})(typeof self !== 'undefined' ? self : this, function () {
'use strict';
const Core = {};

/* ---------- Seeded random numbers (so level N is always the same level) ---------- */
Core.rng = function (seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/* =====================================================================
   Tic Tac Toe on an n x n board, k in a row to win. Marks: 1 = X, 2 = O.
   ===================================================================== */
Core.ttt = (function () {
  const DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]];
  const wcache = {};

  // Every line of k cells on the board, as lists of cell numbers
  function windows(n, k) {
    const key = n + ',' + k;
    if (wcache[key]) return wcache[key];
    const out = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) for (const [dr, dc] of DIRS) {
      const er = r + dr * (k - 1), ec = c + dc * (k - 1);
      if (er < 0 || er >= n || ec < 0 || ec >= n) continue;
      const w = [];
      for (let s = 0; s < k; s++) w.push((r + dr * s) * n + c + dc * s);
      out.push(w);
    }
    return (wcache[key] = out);
  }

  // Did the mark just placed at idx make k (or more) in a row? Returns the whole run, in order.
  function winAt(b, n, k, idx) {
    const p = b[idx];
    if (!p) return null;
    const r = (idx / n) | 0, c = idx % n;
    for (const [dr, dc] of DIRS) {
      const run = [idx];
      for (let s = 1; ; s++) {
        const rr = r + dr * s, cc = c + dc * s;
        if (rr < 0 || rr >= n || cc < 0 || cc >= n || b[rr * n + cc] !== p) break;
        run.push(rr * n + cc);
      }
      for (let s = 1; ; s++) {
        const rr = r - dr * s, cc = c - dc * s;
        if (rr < 0 || rr >= n || cc < 0 || cc >= n || b[rr * n + cc] !== p) break;
        run.unshift(rr * n + cc);
      }
      if (run.length >= k) return { p, cells: run };
    }
    return null;
  }

  const isFull = (b) => b.every((v) => v !== 0);
  const weight = (m, k) => (m >= k ? 1e6 : Math.pow(7, m) * (m === k - 1 ? 3 : 1));

  // Score the board for player `me`: open lines count for you, open lines for them count against
  function evaluate(b, n, k, me) {
    let s = 0;
    for (const w of windows(n, k)) {
      let m = 0, t = 0;
      for (let i = 0; i < k; i++) { const v = b[w[i]]; if (v === me) m++; else if (v) t++; }
      if (m && !t) s += weight(m, k);
      else if (t && !m) s -= weight(t, k) * 1.05;
    }
    return s;
  }

  // Empty cells worth looking at: next to existing marks on big boards, all of them on 3x3
  function candidates(b, n, rad) {
    const empties = [];
    let any = false;
    for (let i = 0; i < b.length; i++) { if (b[i]) any = true; else empties.push(i); }
    if (!any) return n <= 3 ? empties : [Math.floor(n / 2) * n + Math.floor(n / 2)];
    if (n <= 3) return empties;
    const near = new Uint8Array(b.length);
    for (let i = 0; i < b.length; i++) {
      if (!b[i]) continue;
      const r = (i / n) | 0, c = i % n;
      for (let dr = -rad; dr <= rad; dr++) for (let dc = -rad; dc <= rad; dc++) {
        const rr = r + dr, cc = c + dc;
        if (rr >= 0 && rr < n && cc >= 0 && cc < n && !b[rr * n + cc]) near[rr * n + cc] = 1;
      }
    }
    const out = [];
    for (let i = 0; i < b.length; i++) if (near[i]) out.push(i);
    return out.length ? out : empties;
  }

  function ordered(b, n, k, turn, cand, branch) {
    const scored = cand.map((i) => { b[i] = turn; const v = evaluate(b, n, k, turn); b[i] = 0; return [v, i]; });
    scored.sort((x, y) => y[0] - x[0]);
    return scored.slice(0, branch).map((x) => x[1]);
  }

  // Negamax with alpha-beta: the score is from the point of view of the player about to move
  function search(b, n, k, turn, depth, alpha, beta, last, cfg) {
    if (last >= 0 && winAt(b, n, k, last)) return -(1e6 + depth);
    let cand = candidates(b, n, cfg.rad);
    if (!cand.length) return 0;
    if (depth === 0) return evaluate(b, n, k, turn);
    if (cfg.branch < cand.length) cand = ordered(b, n, k, turn, cand, cfg.branch);
    let best = -Infinity;
    for (const i of cand) {
      b[i] = turn;
      const v = -search(b, n, k, 3 - turn, depth - 1, -beta, -alpha, i, cfg);
      b[i] = 0;
      if (v > best) best = v;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    return best;
  }

  function winningCell(b, n, k, p, cells) {
    for (const i of cells) {
      b[i] = p;
      const w = winAt(b, n, k, i);
      b[i] = 0;
      if (w) return i;
    }
    return -1;
  }

  const pick = (arr, rnd) => arr[Math.floor(rnd() * arr.length)];

  // level: 'easy' | 'medium' | 'hard'. Returns the cell to play, or -1 if the board is full.
  function bestMove(b, n, k, me, level, rnd) {
    rnd = rnd || Math.random;
    const empties = [];
    for (let i = 0; i < b.length; i++) if (!b[i]) empties.push(i);
    if (!empties.length) return -1;
    const opp = 3 - me;
    const cand = candidates(b, n, 2);
    const winNow = winningCell(b, n, k, me, empties);
    const blockNow = winningCell(b, n, k, opp, empties);
    if (level === 'easy') {
      if (winNow >= 0 && rnd() < 0.5) return winNow;
      if (blockNow >= 0 && rnd() < 0.3) return blockNow;
      return pick(cand, rnd);
    }
    if (winNow >= 0) return winNow;
    if (blockNow >= 0) return blockNow;
    if (level === 'medium') {
      if (n <= 3 && rnd() < 0.3) return pick(cand, rnd);
      const top = ordered(b, n, k, me, cand, 3);
      return pick(top, rnd);
    }
    // hard
    const cfg = n <= 3 ? { depth: 9, branch: 9, rad: 2 } : n <= 5 ? { depth: 4, branch: 12, rad: 2 } : { depth: 3, branch: 10, rad: 2 };
    const root = cand.length > cfg.branch + 4 ? ordered(b, n, k, me, cand, cfg.branch + 4) : cand;
    let best = -Infinity, bestCells = [];
    for (const i of root) {
      b[i] = me;
      const v = winAt(b, n, k, i) ? 1e7 : -search(b, n, k, opp, cfg.depth - 1, -Infinity, Infinity, i, cfg);
      b[i] = 0;
      if (v > best) { best = v; bestCells = [i]; } else if (v === best) bestCells.push(i);
    }
    return pick(bestCells, rnd);
  }

  return { winAt, isFull, evaluate, candidates, bestMove, windows };
})();

/* =====================================================================
   Block Puzzle: 8x8 board, three pieces at a time, full rows and columns clear.
   ===================================================================== */
Core.blocks = (function () {
  const SIZE = 8;
  const norm = (cells) => {
    const mr = Math.min(...cells.map((x) => x[0])), mc = Math.min(...cells.map((x) => x[1]));
    return cells.map(([r, c]) => [r - mr, c - mc]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  };
  const rot = (cells) => norm(cells.map(([r, c]) => [c, -r]));
  const flip = (cells) => norm(cells.map(([r, c]) => [r, -c]));
  const keyOf = (cells) => cells.map((x) => x.join(',')).join(';');
  function orientations(base, mirror) {
    const seen = new Map();
    let cur = norm(base);
    for (let m = 0; m < (mirror ? 2 : 1); m++) {
      for (let i = 0; i < 4; i++) { seen.set(keyOf(cur), cur); cur = rot(cur); }
      cur = flip(cur);
    }
    return [...seen.values()];
  }
  const line = (n) => Array.from({ length: n }, (_, i) => [0, i]);
  const rect = (h, w) => { const o = []; for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) o.push([r, c]); return o; };
  const FAMILIES = [
    { id: 'dot', w: 2, cells: [[0, 0]], color: 1 },
    { id: 'i2', w: 3, cells: line(2), color: 2 },
    { id: 'i3', w: 3, cells: line(3), color: 3 },
    { id: 'i4', w: 2, cells: line(4), color: 4 },
    { id: 'i5', w: 1, cells: line(5), color: 5 },
    { id: 'sq2', w: 3, cells: rect(2, 2), color: 6 },
    { id: 'sq3', w: 1, cells: rect(3, 3), color: 1 },
    { id: 'r23', w: 2, cells: rect(2, 3), color: 2 },
    { id: 'l3', w: 3, cells: [[0, 0], [1, 0], [1, 1]], color: 3 },
    { id: 'l5', w: 1, cells: [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]], color: 4 },
    { id: 'l4', w: 2, cells: [[0, 0], [1, 0], [2, 0], [2, 1]], color: 5, mirror: true },
    { id: 't4', w: 2, cells: [[0, 0], [0, 1], [0, 2], [1, 1]], color: 6 },
    { id: 's4', w: 2, cells: [[0, 1], [0, 2], [1, 0], [1, 1]], color: 1, mirror: true },
  ];
  const SHAPES = [];
  for (const f of FAMILIES) {
    const os = orientations(f.cells, f.mirror);
    os.forEach((cells, i) => SHAPES.push({
      id: f.id + i, family: f.id, cells, color: f.color, weight: f.w / os.length,
      h: Math.max(...cells.map((x) => x[0])) + 1, w: Math.max(...cells.map((x) => x[1])) + 1,
    }));
  }
  const TOTAL_W = SHAPES.reduce((s, x) => s + x.weight, 0);
  function randomShape(rnd) {
    let t = rnd() * TOTAL_W;
    for (const s of SHAPES) { t -= s.weight; if (t <= 0) return s; }
    return SHAPES[0];
  }
  const piece = (s) => ({ id: s.id, cells: s.cells.map((x) => x.slice()), color: s.color, h: s.h, w: s.w });

  function canPlace(board, cells, r, c) {
    for (const [dr, dc] of cells) {
      const rr = r + dr, cc = c + dc;
      if (rr < 0 || rr >= SIZE || cc < 0 || cc >= SIZE || board[rr * SIZE + cc]) return false;
    }
    return true;
  }
  function fitsAnywhere(board, cells) {
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (canPlace(board, cells, r, c)) return true;
    return false;
  }
  // Which full rows and columns would exist if these cells were placed
  function completed(board, cells, r, c) {
    const b = board.slice();
    for (const [dr, dc] of cells) b[(r + dr) * SIZE + c + dc] = 9;
    const rows = [], cols = [];
    for (let i = 0; i < SIZE; i++) {
      let fr = true, fc = true;
      for (let j = 0; j < SIZE; j++) { if (!b[i * SIZE + j]) fr = false; if (!b[j * SIZE + i]) fc = false; }
      if (fr) rows.push(i);
      if (fc) cols.push(i);
    }
    return { rows, cols };
  }

  // Three new pieces; when possible, at least one of them fits so a deal never ends the game by itself
  function deal(board, rnd) {
    let tray = null;
    for (let tries = 0; tries < 40; tries++) {
      tray = [piece(randomShape(rnd)), piece(randomShape(rnd)), piece(randomShape(rnd))];
      if (tray.some((p) => fitsAnywhere(board, p.cells))) return tray;
    }
    return tray;
  }

  function newGame(rnd) {
    rnd = rnd || Math.random;
    const board = new Array(SIZE * SIZE).fill(0);
    return { board, tray: deal(board, rnd), score: 0, streak: 0, over: false };
  }

  // Place the piece in `slot` with its top-left cell at (r, c). Returns null if it doesn't fit.
  function place(state, slot, r, c, rnd) {
    rnd = rnd || Math.random;
    const p = state.tray[slot];
    if (!p || !canPlace(state.board, p.cells, r, c)) return null;
    const { rows, cols } = completed(state.board, p.cells, r, c);
    const board = state.board.slice();
    for (const [dr, dc] of p.cells) board[(r + dr) * SIZE + c + dc] = p.color;
    const cleared = new Set();
    for (const i of rows) for (let j = 0; j < SIZE; j++) cleared.add(i * SIZE + j);
    for (const i of cols) for (let j = 0; j < SIZE; j++) cleared.add(j * SIZE + i);
    const lines = rows.length + cols.length;
    const before = board.slice();   // with the full lines still on it, for the clearing animation
    for (const i of cleared) board[i] = 0;
    const streak = lines ? state.streak + 1 : 0;
    const gained = p.cells.length + (lines ? 10 * lines * lines + 5 * (streak - 1) : 0);
    const tray = state.tray.slice();
    tray[slot] = null;
    let dealt = false;
    if (tray.every((x) => !x)) { const t = deal(board, rnd); tray[0] = t[0]; tray[1] = t[1]; tray[2] = t[2]; dealt = true; }
    const over = !tray.some((x) => x && fitsAnywhere(board, x.cells));
    return { state: { board, tray, score: state.score + gained, streak, over }, cleared: [...cleared], before, lines, gained, dealt };
  }

  return { SIZE, SHAPES, canPlace, fitsAnywhere, completed, deal, newGame, place };
})();

/* =====================================================================
   Water Sort: tubes hold up to 4 layers (listed bottom to top). Pour onto the same colour or an empty tube.
   ===================================================================== */
Core.water = (function () {
  const CAP = 4;
  const top = (t) => (t.length ? t[t.length - 1] : -1);
  function run(t) {   // how many layers of the top colour sit together
    let n = 0;
    for (let i = t.length - 1; i >= 0 && t[i] === t[t.length - 1]; i--) n++;
    return n;
  }
  function canPour(tubes, a, b) {
    if (a === b) return false;
    const A = tubes[a], B = tubes[b];
    if (!A.length || B.length >= CAP) return false;
    return !B.length || top(B) === top(A);
  }
  // Returns { tubes, moved, color } with new arrays, or null if the pour isn't allowed
  function pour(tubes, a, b) {
    if (!canPour(tubes, a, b)) return null;
    const next = tubes.map((t) => t.slice());
    const color = top(next[a]);
    const n = Math.min(run(next[a]), CAP - next[b].length);
    for (let i = 0; i < n; i++) { next[a].pop(); next[b].push(color); }
    return { tubes: next, moved: n, color };
  }
  const tubeDone = (t) => t.length === 0 || (t.length === CAP && t.every((x) => x === t[0]));
  const isSolved = (tubes) => tubes.every(tubeDone);
  const uniform = (t) => t.length > 0 && t.every((x) => x === t[0]);
  function hasMoves(tubes) {
    for (let a = 0; a < tubes.length; a++) for (let b = 0; b < tubes.length; b++) {
      if (canPour(tubes, a, b) && !(uniform(tubes[a]) && !tubes[b].length)) return true;
    }
    return false;
  }
  const keyOf = (tubes) => tubes.map((t) => t.join('')).sort().join('|');

  // Depth-first search for a solution. Returns a list of [from, to] pours, or null.
  function solve(tubes, maxNodes) {
    maxNodes = maxNodes || 40000;
    const seen = new Set();
    const path = [];
    let nodes = 0;
    function dfs(t) {
      if (isSolved(t)) return true;
      if (++nodes > maxNodes) return false;
      const k = keyOf(t);
      if (seen.has(k)) return false;
      seen.add(k);
      const mv = [];
      for (let a = 0; a < t.length; a++) for (let b = 0; b < t.length; b++) {
        if (!canPour(t, a, b)) continue;
        if (uniform(t[a]) && !t[b].length) continue;   // pointless: shifting a sorted tube into an empty one
        const n = Math.min(run(t[a]), CAP - t[b].length);
        let s = n;
        if (t[b].length) s += 5;                      // building on a matching colour
        if (n === t[a].length) s += 3;                // emptying a tube
        if (t[b].length + n === CAP && uniform(t[b])) s += 8;   // finishing a tube
        mv.push([a, b, s]);
      }
      mv.sort((x, y) => y[2] - x[2]);
      for (const [a, b] of mv) {
        path.push([a, b]);
        if (dfs(pour(t, a, b).tubes)) return true;
        path.pop();
        if (nodes > maxNodes) return false;
      }
      return false;
    }
    return dfs(tubes) ? path.slice() : null;
  }

  const colourCount = (L) => Math.min(3 + Math.floor((L - 1) / 2), 9);

  // The same level number always gives the same puzzle, and every puzzle is checked to be solvable
  function level(L) {
    const colours = colourCount(L);
    let last = null;
    for (let attempt = 0; attempt < 40; attempt++) {
      const rnd = Core.rng(L * 7919 + attempt * 104729 + 17);
      const units = [];
      for (let c = 0; c < colours; c++) for (let i = 0; i < CAP; i++) units.push(c);
      for (let i = units.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [units[i], units[j]] = [units[j], units[i]]; }
      const tubes = [];
      for (let c = 0; c < colours; c++) tubes.push(units.slice(c * CAP, c * CAP + CAP));
      tubes.push([], []);
      last = tubes;
      if (tubes.some((t) => uniform(t) && t.length === CAP)) continue;
      const sol = solve(tubes, 30000);
      if (sol) return { tubes, colours, par: sol.length };
    }
    return { tubes: last, colours, par: 0 };
  }

  return { CAP, canPour, pour, isSolved, hasMoves, solve, level, colourCount, tubeDone };
})();

/* =====================================================================
   Ludo: 15x15 cross board. Colours 0 red (top left), 1 green (top right), 2 yellow (bottom right), 3 blue (bottom left).
   A token's progress p: 0 in the yard, 1 to 51 on the shared track (1 = its start square), 52 to 56 up its own
   home column, 57 home.
   ===================================================================== */
Core.ludo = (function () {
  const TRACK = [
    [6, 1], [6, 2], [6, 3], [6, 4], [6, 5], [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6], [0, 7], [0, 8],
    [1, 8], [2, 8], [3, 8], [4, 8], [5, 8], [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14], [7, 14], [8, 14],
    [8, 13], [8, 12], [8, 11], [8, 10], [8, 9], [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8], [14, 7], [14, 6],
    [13, 6], [12, 6], [11, 6], [10, 6], [9, 6], [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0], [7, 0], [6, 0],
  ];
  const START = [0, 13, 26, 39];
  const COLS = [
    [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
    [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
    [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
    [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]],
  ];
  const YARD_ORIGIN = [[0, 0], [0, 9], [9, 9], [9, 0]];   // top-left cell of each yard
  const SAFE = new Set([0, 13, 26, 39, 8, 21, 34, 47]);
  const HOME = 57;
  const trackIdx = (color, p) => (START[color] + p - 1) % 52;
  function cellOf(color, p) {
    if (p >= 1 && p <= 51) return TRACK[trackIdx(color, p)];
    if (p >= 52 && p <= 56) return COLS[color][p - 52];
    return null;
  }
  const yardSlot = (color, t) => {   // centre of the token's parking place in the yard, in cell units
    const [r, c] = YARD_ORIGIN[color];
    return [c + 1.75 + (t % 2) * 2.5, r + 1.75 + Math.floor(t / 2) * 2.5];
  };

  // seats: [{ color, kind: 'human' | 'cpu', name }] in any order; play goes clockwise by colour
  function newGame(seats) {
    const s = seats.slice().sort((a, b) => a.color - b.color).map((x) => ({ color: x.color, kind: x.kind, name: x.name }));
    const tokens = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
    return { seats: s, tokens, turn: 0, roll: null, sixes: 0, winner: null, moves: 0 };
  }
  const clone = (s) => JSON.parse(JSON.stringify(s));
  const current = (s) => s.seats[s.turn];

  function nextTurn(s) {
    s.turn = (s.turn + 1) % s.seats.length;
    s.roll = null;
    s.sixes = 0;
  }

  function legalMoves(s, roll) {
    const seat = current(s), toks = s.tokens[seat.color], out = [];
    for (let t = 0; t < 4; t++) {
      const p = toks[t];
      if (p === 0 ? roll === 6 : p + roll <= HOME) out.push(t);
    }
    return out;
  }

  function capturesAt(s, color, np) {
    if (np < 1 || np > 51) return [];
    const idx = trackIdx(color, np);
    if (SAFE.has(idx)) return [];
    const out = [];
    for (const seat of s.seats) {
      if (seat.color === color) continue;
      s.tokens[seat.color].forEach((q, t) => { if (q >= 1 && q <= 51 && trackIdx(seat.color, q) === idx) out.push({ color: seat.color, token: t }); });
    }
    return out;
  }

  // Apply a die roll to the current seat. Returns { legal, forfeit, passed }.
  function rollDie(s, v) {
    s.roll = v;
    if (v === 6) {
      s.sixes++;
      if (s.sixes >= 3) { nextTurn(s); return { legal: [], forfeit: true, passed: true }; }
    }
    const legal = legalMoves(s, v);
    if (!legal.length) { nextTurn(s); return { legal: [], forfeit: false, passed: true }; }
    return { legal, forfeit: false, passed: false };
  }

  function preview(s, t) {
    const seat = current(s), p = s.tokens[seat.color][t];
    const to = p === 0 ? 1 : p + s.roll;
    return { from: p, to, captures: capturesAt(s, seat.color, to) };
  }

  // Move token t by the current roll. Returns what happened, for the screen to animate.
  function move(s, t) {
    const seat = current(s), color = seat.color, roll = s.roll;
    const { from, to, captures } = preview(s, t);
    s.tokens[color][t] = to;
    for (const c of captures) s.tokens[c.color][c.token] = 0;
    s.moves++;
    const home = to === HOME;
    const won = s.tokens[color].every((p) => p === HOME);
    const extra = !won && (roll === 6 || captures.length > 0 || home);
    if (won) { s.winner = color; s.roll = null; }
    else if (extra) { s.roll = null; if (roll !== 6) s.sixes = 0; }
    else nextTurn(s);
    return { color, token: t, from, to, captures, home, extra, won, roll };
  }

  // The computer's choice among legal tokens
  function cpuPick(s, legal, rnd) {
    rnd = rnd || Math.random;
    const seat = current(s), color = seat.color;
    let best = -Infinity, pickT = legal[0];
    for (const t of legal) {
      const { from, to, captures } = preview(s, t);
      let sc = 0;
      if (to === HOME) sc += 100;
      if (captures.length) sc += 80 + captures.reduce((a, c) => a + s.tokens[c.color][c.token], 0) * 0.5;
      if (from === 0) sc += 50;
      if (from < 52 && to >= 52) sc += 40;
      if (to <= 51 && SAFE.has(trackIdx(color, to))) sc += 25;
      if (to <= 51 && !SAFE.has(trackIdx(color, to)) && threatened(s, color, to)) sc -= 30;
      if (from >= 1 && from <= 51 && !SAFE.has(trackIdx(color, from)) && threatened(s, color, from)) sc += 22;
      sc += to * 0.3 + rnd();
      if (sc > best) { best = sc; pickT = t; }
    }
    return pickT;
  }
  // Is an opponent token 1 to 6 squares behind this square on the track?
  function threatened(s, color, p) {
    const idx = trackIdx(color, p);
    for (const seat of s.seats) {
      if (seat.color === color) continue;
      for (const q of s.tokens[seat.color]) {
        if (q < 1 || q > 51) continue;
        const d = (idx - trackIdx(seat.color, q) + 52) % 52;
        if (d >= 1 && d <= 6) return true;
      }
    }
    return false;
  }

  return { TRACK, START, COLS, SAFE, HOME, trackIdx, cellOf, yardSlot, newGame, clone, current, legalMoves, capturesAt, rollDie, preview, move, cpuPick };
})();

return Core;
});
