/* Tic Tac Toe: 3x3 up to 9x9, against the computer or two on one phone. */
(function () {
'use strict';
const CSS = `
.ttt { display: flex; flex-direction: column; align-items: center; gap: 12px; padding-top: 4px; }
.ttt-score { display: grid; grid-template-columns: 1fr auto 1fr; gap: 8px; width: 100%; }
.ttt-seat { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 16px; background: var(--raise); border: 1.5px solid transparent; transition: border-color .2s, background .2s; min-width: 0; }
.ttt-seat.b { flex-direction: row-reverse; text-align: right; }
.ttt-seat.on { border-color: var(--sun); background: var(--sun-soft); }
.ttt-seat.d { flex-direction: column; justify-content: center; gap: 0; padding: 10px 14px; background: none; }
.ttt-mk { width: 26px; height: 26px; flex: none; }
.ttt-mk svg { width: 100%; height: 100%; display: block; }
.ttt-who { flex: 1; min-width: 0; display: grid; line-height: 1.2; }
.ttt-name { font-size: 13px; color: var(--ink-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ttt-n { font-size: 22px; font-weight: 600; letter-spacing: -.01em; }
.ttt-seat.d .ttt-name { font-size: 12.5px; color: var(--ink-3); }
.ttt-seat.d .ttt-n { font-size: 18px; color: var(--ink-2); }
.ttt-status { margin: 4px 0 0; min-height: 1.5em; font-size: 18px; font-weight: 300; letter-spacing: .005em; text-align: center; }
.ttt-status strong { font-weight: 600; }
.ttt-wrap { position: relative; width: min(100%, calc(100dvh - 330px)); min-width: 260px; max-width: 100%; aspect-ratio: 1; }
.ttt-board { display: grid; grid-template-columns: repeat(var(--n), 1fr); grid-template-rows: repeat(var(--n), 1fr); gap: var(--gap, 3px); padding: var(--gap, 3px); width: 100%; height: 100%; border-radius: 20px; background: var(--raise-2); overflow: hidden; }
.ttt-board[data-n="3"] { --gap: 4px; }
.ttt-board[data-n="9"] { --gap: 2px; border-radius: 16px; }
.ttt-cell { background: var(--raise); display: grid; place-items: center; border-radius: 7px; transition: background .2s; position: relative; padding: 0; min-width: 0; min-height: 0; }
.ttt-board[data-n="3"] .ttt-cell { border-radius: 12px; }
.ttt-cell:not(.f):not(:disabled):active { background: var(--raise-2); }
.ttt-cell.last { background: var(--sun-soft); }
.ttt-cell.w { background: var(--sun-soft); box-shadow: inset 0 0 0 2px var(--sun); }
.ttt-cell svg { width: 66%; height: 66%; overflow: visible; }
.ttt-cell svg path, .ttt-cell svg circle, .ttt-mk svg path, .ttt-mk svg circle { fill: none; stroke-linecap: round; stroke-width: 2.4; }
.ttt-board[data-n="3"] .ttt-cell svg path, .ttt-board[data-n="3"] .ttt-cell svg circle { stroke-width: 1.8; }
.ttt-board[data-n="9"] .ttt-cell svg path, .ttt-board[data-n="9"] .ttt-cell svg circle { stroke-width: 3; }
.ttt .mx { stroke: var(--sun); } .ttt .mo { stroke: var(--ink); }
.ttt-cell svg .mx, .ttt-cell svg .mo { stroke-dasharray: 1; stroke-dashoffset: 1; animation: ttt-draw .26s ease-out forwards; }
.ttt-cell svg .mx + .mx { animation-delay: .12s; }
.ttt-cell.old svg .mx, .ttt-cell.old svg .mo { animation: none; stroke-dashoffset: 0; }
@keyframes ttt-draw { to { stroke-dashoffset: 0; } }
.ttt-line { position: absolute; inset: var(--gap, 3px); width: calc(100% - 2 * var(--gap, 3px)); height: calc(100% - 2 * var(--gap, 3px)); pointer-events: none; overflow: visible; }
.ttt-line line { stroke: var(--sun); stroke-linecap: round; stroke-dasharray: 1; stroke-dashoffset: 1; animation: ttt-draw .4s .1s ease-out forwards; opacity: .9; }
.ttt-foot { min-height: 44px; display: flex; gap: 10px; align-items: center; justify-content: center; }
.ttt-hint { margin: 0; font-size: 13.5px; color: var(--ink-3); text-align: center; }
.ttt-opt-row + .ttt-opt-row { margin-top: 2px; }
`;

const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 3v18M15.5 3v18M3 8.5h18M3 15.5h18"/><circle cx="5.75" cy="5.75" r="1.5"/><path d="M10.4 10.4l3.2 3.2M13.6 10.4l-3.2 3.2"/></svg>';
const X = (cls) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path class="${cls || 'mx'}" pathLength="1" d="M5.5 5.5l13 13"/><path class="${cls || 'mx'}" pathLength="1" d="M18.5 5.5l-13 13"/></svg>`;
const O = (cls) => `<svg viewBox="0 0 24 24" aria-hidden="true"><circle class="${cls || 'mo'}" pathLength="1" cx="12" cy="12" r="7"/></svg>`;
const KS = { 3: [3], 5: [3, 4, 5], 7: [4, 5], 9: [4, 5] };
const DEFK = { 3: 3, 5: 4, 7: 5, 9: 5 };
const DEF = { n: 3, k: 3, mode: 'cpu', level: 'medium' };
const LEVELS = [['easy', 'Easy'], ['medium', 'Medium'], ['hard', 'Hard']];

GM.register({
  id: 'tictactoe', name: 'Tic Tac Toe', order: 1, icon: ICON,
  tagline: 'Three in a row, or more on bigger boards.',
  stat: (get) => { const w = get('wins', 0); return w ? `${w} win${w === 1 ? '' : 's'}` : ''; },
  summary: (get) => {
    const o = Object.assign({}, DEF, get('opts', {})), s = get('scores', { a: 0, b: 0, d: 0 });
    const lead = o.mode === 'cpu' ? `${s.a} to ${s.b} against the computer` : `${s.a} to ${s.b} between two players`;
    return `${o.n}×${o.n} board, ${lead}.`;
  },

  create(ctx) {
    if (!document.getElementById('gm-ttt-css')) { const s = document.createElement('style'); s.id = 'gm-ttt-css'; s.textContent = CSS; document.head.appendChild(s); }
    const T = Core.ttt, root = ctx.root;
    let o = Object.assign({}, DEF, ctx.get('opts', {}));
    if (!KS[o.n] || !KS[o.n].includes(o.k)) o = Object.assign({}, DEF);
    let scores = ctx.get('scores', { a: 0, b: 0, d: 0 });
    let round = ctx.get('round', 0);
    let st = null, timer = 0, dead = false, fresh = new Set();

    const names = () => (o.mode === 'cpu' ? ['You', 'Computer'] : ['Player 1', 'Player 2']);
    const seatOf = (mark) => (mark === st.aMark ? 'a' : 'b');
    const isCpuTurn = () => o.mode === 'cpu' && !st.over && seatOf(st.turn) === 'b';

    function newRound(keepScores) {
      clearTimeout(timer);
      if (!keepScores) { scores = { a: 0, b: 0, d: 0 }; round = 0; }
      st = { board: new Array(o.n * o.n).fill(0), moves: [], turn: 1, aMark: round % 2 === 0 ? 1 : 2, over: false, win: null, draw: false };
      fresh = new Set();
      save(); render(); afterMove();
    }
    function save() { ctx.put('game', st); ctx.put('scores', scores); ctx.put('round', round); ctx.put('opts', o); }

    function restore() {
      const g = ctx.get('game', null);
      if (g && Array.isArray(g.board) && g.board.length === o.n * o.n && Array.isArray(g.moves)) { st = g; return true; }
      return false;
    }

    /* ---------- Drawing ---------- */
    function cellHtml(i) {
      const v = st.board[i], r = Math.floor(i / o.n) + 1, c = (i % o.n) + 1;
      const last = st.moves.length && st.moves[st.moves.length - 1].i === i && !st.over;
      const won = st.win && st.win.cells.includes(i);
      const cls = ['ttt-cell', v ? 'f' : '', last ? 'last' : '', won ? 'w' : '', v && !fresh.has(i) ? 'old' : ''].filter(Boolean).join(' ');
      const label = `Row ${r}, column ${c}, ${v === 1 ? 'cross' : v === 2 ? 'nought' : 'empty'}`;
      return `<button class="${cls}" type="button" data-i="${i}" aria-label="${label}"${v || st.over ? ' disabled' : ''}>${v === 1 ? X() : v === 2 ? O() : ''}</button>`;
    }
    function lineHtml() {
      if (!st.win) return '';
      const cells = st.win.cells, a = cells[0], b = cells[cells.length - 1], n = o.n;
      const p = (i) => [(i % n) + 0.5, Math.floor(i / n) + 0.5];
      const [x1, y1] = p(a), [x2, y2] = p(b);
      return `<svg class="ttt-line" viewBox="0 0 ${n} ${n}" aria-hidden="true"><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke-width="${n === 3 ? 0.11 : 0.14}" pathLength="1"/></svg>`;
    }
    function statusHtml() {
      const nm = names();
      if (st.over) {
        if (st.draw) return 'It’s a <strong>draw</strong>';
        const who = seatOf(st.win.p) === 'a' ? nm[0] : nm[1];
        return o.mode === 'cpu' ? (who === 'You' ? '<strong>You win</strong>' : '<strong>Computer wins</strong>') : `<strong>${ctx.esc(who)} wins</strong>`;
      }
      if (isCpuTurn()) return 'Computer is thinking…';
      if (o.mode === 'cpu') return st.moves.length ? 'Your turn' : 'Your turn: tap a square';
      return `<strong>${ctx.esc(nm[seatOf(st.turn) === 'a' ? 0 : 1])}</strong>’s turn`;
    }
    function render() {
      const nm = names(), n = o.n;
      const seatHtml = (s, mark, who, score) => `<div class="ttt-seat ${s}${!st.over && seatOf(st.turn) === s ? ' on' : ''}">
        <span class="ttt-mk">${mark === 1 ? X() : O()}</span><span class="ttt-who"><span class="ttt-name">${ctx.esc(who)}</span><span class="ttt-n num">${score}</span></span></div>`;
      root.innerHTML = `<div class="ttt">
        <div class="ttt-score">${seatHtml('a', st.aMark, nm[0], scores.a)}
          <div class="ttt-seat d"><span class="ttt-name">Draws</span><span class="ttt-n num">${scores.d}</span></div>
          ${seatHtml('b', 3 - st.aMark, nm[1], scores.b)}</div>
        <p class="ttt-status" id="tttStatus" aria-live="polite">${statusHtml()}</p>
        <div class="ttt-wrap"><div class="ttt-board" id="tttBoard" data-n="${n}" style="--n:${n}">${st.board.map((_, i) => cellHtml(i)).join('')}</div>${lineHtml()}</div>
        <div class="ttt-foot">${st.over ? '<button class="btn primary" type="button" data-ttt="next">Next round</button>'
          : `<p class="ttt-hint">${n === 3 ? '' : `Get ${o.k} in a row on this ${n}×${n} board`}</p>`}</div>
      </div>`;
      ctx.toolState('undo', !canUndo());
      ctx.setTitle(`Tic Tac Toe ${n}×${n}`);
    }
    function patchCell(i) {
      const old = root.querySelector(`.ttt-cell[data-i="${i}"]`);
      if (old) old.outerHTML = cellHtml(i);
    }

    /* ---------- Play ---------- */
    function canUndo() {
      if (!st || st.over) return false;
      if (o.mode === 'cpu') return st.moves.some((m) => seatOf(m.mark) === 'a');
      return st.moves.length > 0;
    }
    function undo() {
      if (!canUndo()) return;
      clearTimeout(timer);
      while (st.moves.length) {
        const m = st.moves.pop();
        st.board[m.i] = 0; st.turn = m.mark;
        if (o.mode !== 'cpu' || seatOf(m.mark) === 'a') break;
      }
      ctx.sfx('tap'); save(); render();
    }

    function play(i) {
      if (st.over || st.board[i]) return;
      const mark = st.turn;
      st.board[i] = mark; st.moves.push({ i, mark }); fresh = new Set([i]);
      ctx.sfx(mark === 1 ? 'mark' : 'mark2'); ctx.haptic(10);
      const w = T.winAt(st.board, o.n, o.k, i);
      if (w) {
        st.over = true; st.win = w; round++;
        const s = seatOf(w.p); scores[s]++;
        if (o.mode === 'cpu' && s === 'a') ctx.put('wins', ctx.get('wins', 0) + 1);
        if (o.mode === 'cpu' && s === 'b') { setTimeout(() => ctx.sfx('lose'), 260); }
        else { setTimeout(() => ctx.sfx('win'), 260); ctx.haptic([30, 50, 30]); }
      } else if (T.isFull(st.board)) {
        st.over = true; st.draw = true; scores.d++; round++;
        setTimeout(() => ctx.sfx('draw'), 200);
      } else st.turn = 3 - mark;
      save(); render(); afterMove();
    }

    function afterMove() {
      if (dead || !isCpuTurn()) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (dead || !isCpuTurn()) return;
        const m = T.bestMove(st.board.slice(), o.n, o.k, st.turn, o.level);
        if (m >= 0) play(m);
      }, 420 + Math.random() * 220);
    }

    /* ---------- Options ---------- */
    function optionsHtml(d) {
      const chip = (key, val, label, extra) => `<button class="chip" type="button" data-o="${key}:${val}" aria-pressed="${String(d[key]) === String(val)}"${extra || ''}>${label}</button>`;
      return ctx.head('Game options') + `
        <h3>Play</h3>
        <div class="chips">${chip('mode', 'cpu', 'Against the computer')}${chip('mode', 'two', 'Two players')}</div>
        ${d.mode === 'cpu' ? `<h3>Computer level</h3><div class="chips">${LEVELS.map(([v, l]) => chip('level', v, l)).join('')}</div>` : ''}
        <h3>Board size</h3>
        <div class="chips">${[3, 5, 7, 9].map((n) => chip('n', n, `${n}×${n}`)).join('')}</div>
        <h3>In a row to win</h3>
        <div class="chips">${KS[d.n].map((k) => chip('k', k, String(k))).join('')}</div>
        <p class="small" style="margin-top:12px">Starting a new game resets the score. The first move alternates each round.</p>
        <div class="actions"><button class="btn primary" type="button" data-o="go">Start new game</button></div>`;
    }
    function openOptions() {
      let d = Object.assign({}, o);
      const handler = (e) => {
        const b = e.target.closest('[data-o]'); if (!b) return;
        const v = b.dataset.o;
        if (v === 'go') {
          o = Object.assign({}, d); ctx.closeSheet(); ctx.sfx('tap'); newRound(false);
          return;
        }
        const [key, val] = v.split(':');
        if (key === 'n') { d.n = +val; if (!KS[d.n].includes(d.k)) d.k = DEFK[d.n]; }
        else if (key === 'k') d.k = +val;
        else d[key] = val;
        ctx.sfx('select');
        ctx.openSheet(optionsHtml(d), handler);
      };
      ctx.openSheet(optionsHtml(d), handler);
    }
    function confirmNew() {
      const progress = st.moves.length > 0 && !st.over;
      if (!progress) { newRound(true); return; }
      ctx.openSheet(ctx.head('Start this round again?') + `<p>The board will be cleared. Your score stays.</p>
        <div class="actions"><button class="btn primary" type="button" data-o="yes">Clear the board</button><button class="btn" type="button" data-sheet="close">Cancel</button></div>`, (e) => {
        if (e.target.closest('[data-o="yes"]')) { ctx.closeSheet(); newRound(true); }
      });
    }

    /* ---------- Wire up ---------- */
    root.addEventListener('click', (e) => {
      const c = e.target.closest('.ttt-cell');
      if (c && !c.disabled) { if (st.over || isCpuTurn()) return; play(+c.dataset.i); return; }
      const b = e.target.closest('[data-ttt]');
      if (b && b.dataset.ttt === 'next') { ctx.sfx('tap'); newRound(true); }
    });
    ctx.setTools([
      { id: 'undo', label: 'Undo last move', svg: ctx.ICON.undo, disabled: true },
      { id: 'new', label: 'Clear the board', svg: ctx.ICON.restart },
      { id: 'options', label: 'Game options', svg: ctx.ICON.options },
    ], (id) => { if (id === 'undo') undo(); else if (id === 'new') confirmNew(); else if (id === 'options') openOptions(); });

    if (restore()) { render(); afterMove(); } else newRound(true);

    return { destroy() { dead = true; clearTimeout(timer); } };
  },
});
})();
