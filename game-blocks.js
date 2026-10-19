/* Block Puzzle: drag pieces onto an 8x8 board, full rows and columns clear. */
(function () {
'use strict';
const CSS = `
.blk { display: flex; flex-direction: column; align-items: center; gap: 12px; padding-top: 2px; touch-action: manipulation; }
.blk-top { display: flex; justify-content: space-between; align-items: flex-end; width: 100%; }
.blk-stat { display: grid; line-height: 1.1; }
.blk-stat.r { text-align: right; }
.blk-lab { font-size: 13px; color: var(--ink-3); }
.blk-score { font-size: 38px; font-weight: 600; letter-spacing: -.02em; }
.blk-best { font-size: 20px; font-weight: 500; color: var(--ink-2); }
.blk-score.bump { animation: blk-bump .3s ease-out; }
@keyframes blk-bump { 40% { transform: scale(1.1); color: var(--sun); } }
.blk-wrap { position: relative; width: min(100%, calc(100dvh - 400px)); min-width: 250px; max-width: 100%; aspect-ratio: 1; }
.blk-board { display: grid; grid-template-columns: repeat(8, 1fr); grid-template-rows: repeat(8, 1fr); gap: 3px; padding: 3px; width: 100%; height: 100%; border-radius: 18px; background: var(--raise-2); touch-action: none; }
.blk-c { border-radius: 6px; background: var(--raise); min-width: 0; min-height: 0; transition: background .12s; }
.blk-c.f { background: var(--pc); box-shadow: inset 0 -3px 0 rgba(0, 0, 0, .2), inset 0 1.5px 0 rgba(255, 255, 255, .32); }
.blk-c.g { background: var(--pc); opacity: .5; }
.blk-c.wc { box-shadow: inset 0 0 0 2px var(--sun); }
.blk-c.f.wc { filter: brightness(1.15); }
.blk-c.pl { animation: blk-pop .22s ease-out; }
.blk-c.gone { animation: blk-gone .26s ease-in forwards; }
@keyframes blk-pop { 0% { transform: scale(.7); } 60% { transform: scale(1.06); } }
@keyframes blk-gone { 0% { transform: scale(1); filter: brightness(1.5); } 100% { transform: scale(.2); opacity: 0; } }
.blk-tray { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; width: 100%; }
.blk-slot { height: 108px; display: grid; place-items: center; border-radius: 16px; background: var(--raise); touch-action: none; user-select: none; -webkit-user-select: none; cursor: grab; position: relative; }
.blk-slot.empty { cursor: default; }
.blk-slot.lift .blk-pc { opacity: .22; }
.blk-slot.dealt .blk-pc { animation: blk-in .3s ease-out backwards; }
@keyframes blk-in { from { transform: translateY(16px) scale(.9); opacity: 0; } }
.blk-slot.nofit .blk-pc { opacity: .35; }
.blk-pc { display: grid; gap: var(--g, 2px); pointer-events: none; }
.blk-pc i { display: block; border-radius: 5px; background: var(--pc); box-shadow: inset 0 -2px 0 rgba(0, 0, 0, .2), inset 0 1px 0 rgba(255, 255, 255, .32); }
.blk-pc b { display: block; }
.blk-float { position: fixed; z-index: 60; pointer-events: none; margin: 0; will-change: transform, left, top; }
.blk-float.back { transition: left .18s ease-out, top .18s ease-out, opacity .18s; }
.blk-hint { margin: 0; font-size: 13.5px; color: var(--ink-3); text-align: center; }
.blk-over { position: absolute; inset: 0; border-radius: 18px; background: color-mix(in srgb, var(--bg) 84%, transparent); display: grid; place-items: center; text-align: center; padding: 20px; animation: fadein .3s ease-out; backdrop-filter: blur(3px); -webkit-backdrop-filter: blur(3px); }
.blk-over h2 { margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -.015em; }
.blk-over p { margin: 6px 0 0; color: var(--ink-2); }
.blk-over .big { font-size: 44px; font-weight: 600; color: var(--ink); letter-spacing: -.02em; margin-top: 8px; }
.blk-over .actions { justify-content: center; margin-top: 16px; }
.blk-pop { position: absolute; left: 50%; top: 38%; transform: translate(-50%, 0); font-size: 30px; font-weight: 600; color: var(--sun); pointer-events: none; text-align: center; line-height: 1.1; animation: blk-rise .9s ease-out forwards; text-shadow: 0 2px 12px rgba(0, 0, 0, .35); }
.blk-pop small { display: block; font-size: 14px; font-weight: 500; color: var(--ink); }
@keyframes blk-rise { 0% { opacity: 0; transform: translate(-50%, 10px) scale(.8); } 20% { opacity: 1; transform: translate(-50%, 0) scale(1.05); } 100% { opacity: 0; transform: translate(-50%, -36px); } }
`;
const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><rect x="3.5" y="3.5" width="7" height="7" rx="1.8"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.8"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.8"/></svg>';
const COLORS = ['', 'var(--red)', 'var(--orange)', 'var(--yellow)', 'var(--green)', 'var(--blue)', 'var(--purple)'];
const fmt = (n) => n.toLocaleString('en-GB');
const SIZE = 8, GAP = 3, PAD = 3;

GM.register({
  id: 'blocks', name: 'Block Puzzle', order: 2, icon: ICON,
  tagline: 'Fit the pieces and clear full lines.',
  stat: (get) => { const b = get('best', 0); return b ? `Best ${fmt(b)}` : ''; },
  summary: (get) => {
    const g = get('game', null), b = get('best', 0);
    if (g && !g.over && g.score > 0) return `score ${fmt(g.score)}, best ${fmt(b)}.`;
    return b ? `best score ${fmt(b)}.` : 'ready for your first game.';
  },

  create(ctx) {
    if (!document.getElementById('gm-blk-css')) { const s = document.createElement('style'); s.id = 'gm-blk-css'; s.textContent = CSS; document.head.appendChild(s); }
    const B = Core.blocks, root = ctx.root;
    let st = ctx.get('game', null);
    if (!st || !Array.isArray(st.board) || st.board.length !== 64 || !Array.isArray(st.tray)) st = B.newGame();
    let best = ctx.get('best', 0);
    let sb = ctx.get('sb', best);   // the best score when this game began, to tell if this game beats it
    let locked = false, drag = null, dead = false, timers = [];
    const later = (fn, ms) => { const t = setTimeout(() => { if (!dead) fn(); }, ms); timers.push(t); return t; };

    root.innerHTML = `<div class="blk">
      <div class="blk-top"><div class="blk-stat"><span class="blk-lab">Score</span><span class="blk-score num" id="blkScore">0</span></div>
        <div class="blk-stat r"><span class="blk-lab">Best</span><span class="blk-best num" id="blkBest">0</span></div></div>
      <div class="blk-wrap" id="blkWrap"><div class="blk-board" id="blkBoard" role="img" aria-label="Game board"></div></div>
      <div class="blk-tray" id="blkTray"></div>
      <p class="blk-hint">Drag a piece onto the board. Fill a row or column to clear it.</p></div>`;
    const board = root.querySelector('#blkBoard'), tray = root.querySelector('#blkTray'), wrap = root.querySelector('#blkWrap');
    const scoreEl = root.querySelector('#blkScore'), bestEl = root.querySelector('#blkBest');
    board.innerHTML = Array.from({ length: 64 }, (_, i) => `<div class="blk-c" data-i="${i}"></div>`).join('');
    const cells = Array.from(board.children);

    /* ---------- Drawing ---------- */
    function paintBoard(b, opts) {
      opts = opts || {};
      for (let i = 0; i < 64; i++) {
        const el = cells[i], v = b[i];
        el.className = 'blk-c' + (v ? ' f' : '') + (opts.placed && opts.placed.has(i) ? ' pl' : '') + (opts.clearing && opts.clearing.has(i) ? ' gone' : '');
        if (v) el.style.setProperty('--pc', COLORS[v]); else el.style.removeProperty('--pc');
      }
    }
    function pieceHtml(p, size, gap) {
      const grid = Array.from({ length: p.h * p.w }, () => '<b></b>');
      for (const [r, c] of p.cells) grid[r * p.w + c] = '<i></i>';
      return `<div class="blk-pc" style="--pc:${COLORS[p.color]};--g:${gap}px;grid-template-columns:repeat(${p.w},${size}px);grid-template-rows:repeat(${p.h},${size}px)">${grid.join('')}</div>`;
    }
    function paintTray(dealt) {
      tray.innerHTML = st.tray.map((p, i) => {
        if (!p) return `<div class="blk-slot empty" data-slot="${i}"></div>`;
        const fits = B.fitsAnywhere(st.board, p.cells);
        const size = p.w >= 5 || p.h >= 5 ? 18 : 21;
        return `<div class="blk-slot${dealt ? ' dealt' : ''}${fits ? '' : ' nofit'}" data-slot="${i}" role="button" aria-label="Piece ${i + 1}">${pieceHtml(p, size, 2)}</div>`;
      }).join('');
    }
    function paintScore(bump) {
      scoreEl.textContent = fmt(st.score);
      bestEl.textContent = fmt(best);
      if (bump) { scoreEl.classList.remove('bump'); void scoreEl.offsetWidth; scoreEl.classList.add('bump'); }
    }
    function showOver() {
      if (wrap.querySelector('.blk-over')) return;
      const d = document.createElement('div');
      d.className = 'blk-over';
      const newBest = sb > 0 && st.score > sb;
      d.innerHTML = `<div><h2>No more moves</h2><p>${newBest ? 'A new best score' : 'Your score'}</p><div class="big num">${fmt(st.score)}</div>
        <div class="actions"><button class="btn primary" type="button" data-blk="again">Play again</button></div></div>`;
      wrap.appendChild(d);
    }
    function popText(gained, lines) {
      const d = document.createElement('div');
      d.className = 'blk-pop num';
      d.innerHTML = `+${gained}${lines > 1 ? `<small>${lines} lines</small>` : ''}`;
      wrap.appendChild(d);
      later(() => d.remove(), 950);
    }

    /* ---------- Playing ---------- */
    function save() { ctx.put('game', st); ctx.put('best', best); ctx.put('sb', sb); }
    function newGame() {
      timers.forEach(clearTimeout); timers = [];
      st = B.newGame(); sb = best; locked = false;
      wrap.querySelectorAll('.blk-over, .blk-pop').forEach((n) => n.remove());
      paintBoard(st.board); paintTray(true); paintScore(); save();
    }
    function commit(slot, r, c) {
      const res = B.place(st, slot, r, c);
      if (!res) return;
      locked = true;
      const piece = st.tray[slot];
      const placed = new Set(piece.cells.map(([dr, dc]) => (r + dr) * SIZE + c + dc));
      ctx.sfx(res.lines ? 'clear' : 'place', res.lines); ctx.haptic(res.lines ? [18, 30, 18] : 12);
      paintBoard(res.before, { placed, clearing: new Set(res.cleared) });
      st = Object.assign({}, res.state, { tray: st.tray.map((p, i) => (i === slot ? null : p)) });
      paintTray(false); paintScore(true);
      if (res.lines) popText(res.gained, res.lines);
      if (st.score > best) best = st.score;
      const finish = () => {
        st = res.state;
        if (res.lines) paintBoard(st.board);
        paintTray(res.dealt); paintScore(false);
        save(); locked = false;
        if (st.over) { ctx.sfx('lose'); ctx.haptic([40, 60, 40]); showOver(); }
      };
      if (res.lines) later(finish, 270); else finish();
    }

    /* ---------- Dragging ---------- */
    function geometry() {
      const rect = board.getBoundingClientRect();
      const pitch = (rect.width - PAD * 2 - GAP * (SIZE - 1)) / SIZE + GAP;
      return { rect, pitch, size: pitch - GAP };
    }
    function targetFor(g, left, top, p) {
      const col = Math.round((left - g.rect.left - PAD) / g.pitch), row = Math.round((top - g.rect.top - PAD) / g.pitch);
      return { row, col, ok: B.canPlace(st.board, p.cells, row, col) };
    }
    function clearGhost() { for (const el of cells) { el.classList.remove('g', 'wc'); if (!el.classList.contains('f')) el.style.removeProperty('--pc'); } }
    function showGhost(p, t) {
      clearGhost();
      if (!t.ok) return;
      const { rows, cols } = B.completed(st.board, p.cells, t.row, t.col);
      for (const [dr, dc] of p.cells) { const el = cells[(t.row + dr) * SIZE + t.col + dc]; el.classList.add('g'); el.style.setProperty('--pc', COLORS[p.color]); }
      for (const i of rows) for (let j = 0; j < SIZE; j++) cells[i * SIZE + j].classList.add('wc');
      for (const i of cols) for (let j = 0; j < SIZE; j++) cells[j * SIZE + i].classList.add('wc');
    }
    function moveFloat(x, y) {
      const d = drag, w = d.p.w * d.g.pitch - GAP, h = d.p.h * d.g.pitch - GAP;
      const left = x - w / 2, top = y - h - 34;
      d.el.style.left = left + 'px'; d.el.style.top = top + 'px';
      d.left = left; d.top = top;
      const t = targetFor(d.g, left, top, d.p);
      const key = t.ok ? t.row + ',' + t.col : '';
      if (key !== d.key) { d.key = key; if (t.ok) ctx.haptic(4); showGhost(d.p, t); }
      d.t = t;
    }
    tray.addEventListener('pointerdown', (e) => {
      const slotEl = e.target.closest('.blk-slot');
      if (!slotEl || slotEl.classList.contains('empty') || locked || st.over || drag) return;
      const slot = +slotEl.dataset.slot, p = st.tray[slot];
      if (!p) return;
      e.preventDefault();
      const g = geometry();
      const el = document.createElement('div');
      el.className = 'blk-float';
      el.innerHTML = pieceHtml(p, g.size, GAP);
      document.body.appendChild(el);
      slotEl.classList.add('lift');
      drag = { slot, p, g, el, slotEl, pid: e.pointerId, key: '', t: null, left: 0, top: 0 };
      ctx.sfx('select');
      moveFloat(e.clientX, e.clientY);
    });
    function onMove(e) { if (drag && e.pointerId === drag.pid) { e.preventDefault(); moveFloat(e.clientX, e.clientY); } }
    function onUp(e) {
      if (!drag || e.pointerId !== drag.pid) return;
      const d = drag; drag = null;
      clearGhost();
      d.slotEl.classList.remove('lift');
      if (e.type !== 'pointercancel' && d.t && d.t.ok) { d.el.remove(); commit(d.slot, d.t.row, d.t.col); return; }
      if (e.type !== 'pointercancel' && d.t && d.t.row > -3 && d.t.row < SIZE + 1) ctx.sfx('error');
      // back to the tray
      const pr = d.slotEl.getBoundingClientRect(), w = d.p.w * d.g.pitch - GAP, h = d.p.h * d.g.pitch - GAP;
      d.el.classList.add('back');
      d.el.style.left = pr.left + pr.width / 2 - w / 2 + 'px'; d.el.style.top = pr.top + pr.height / 2 - h / 2 + 'px'; d.el.style.opacity = '.4';
      later(() => d.el.remove(), 200);
      setTimeout(() => d.el.remove(), 260);
    }
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    tray.addEventListener('contextmenu', (e) => e.preventDefault());

    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-blk]');
      if (b && b.dataset.blk === 'again') { ctx.sfx('tap'); newGame(); }
    });
    ctx.setTools([{ id: 'new', label: 'New game', svg: ctx.ICON.restart }], (id) => {
      if (id !== 'new') return;
      if (st.score === 0 || st.over) { newGame(); return; }
      ctx.openSheet(ctx.head('Start a new game?') + `<p>Your current score of ${fmt(st.score)} will be lost. Your best score is kept.</p>
        <div class="actions"><button class="btn primary" type="button" data-blk-sheet="yes">New game</button><button class="btn" type="button" data-sheet="close">Cancel</button></div>`, (e) => {
        if (e.target.closest('[data-blk-sheet="yes"]')) { ctx.closeSheet(); newGame(); }
      });
    });

    paintBoard(st.board); paintTray(false); paintScore();
    if (st.over) showOver();
    save();

    return {
      destroy() {
        dead = true; timers.forEach(clearTimeout);
        window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); window.removeEventListener('pointercancel', onUp);
        document.querySelectorAll('.blk-float').forEach((n) => n.remove());
      },
    };
  },
});
})();
