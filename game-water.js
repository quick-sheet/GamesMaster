/* Water Sort: pour coloured layers between tubes until every tube holds one colour. */
(function () {
'use strict';
const CSS = `
.wat { display: flex; flex-direction: column; gap: 6px; padding-top: 2px; min-height: 100%; }
.wat-top { display: flex; justify-content: space-between; align-items: flex-end; }
.wat-stat { display: grid; line-height: 1.1; }
.wat-stat.r { text-align: right; }
.wat-lab { font-size: 13px; color: var(--ink-3); }
.wat-lv { font-size: 34px; font-weight: 600; letter-spacing: -.02em; }
.wat-mv { font-size: 20px; font-weight: 500; color: var(--ink-2); }
.wat-field { position: relative; display: grid; grid-template-columns: repeat(var(--cols), var(--tw)); justify-content: center; gap: 30px 14px; padding: 34px 0 12px; touch-action: manipulation; }
.wat-tube { position: relative; width: var(--tw); height: calc(var(--lh) * 4 + 6px); border: 2px solid var(--line-2); border-top: 0; border-radius: 0 0 calc(var(--tw) / 2) calc(var(--tw) / 2);
  background: color-mix(in srgb, var(--ink) 5%, transparent); transition: transform .24s cubic-bezier(.3, 1.4, .5, 1), border-color .25s; padding: 0; }
.wat-tube::before { content: ""; position: absolute; left: -5px; right: -5px; top: 0; height: 3px; border-radius: 2px; background: var(--line-2); }
.wat-tube.sel { transform: translateY(-18px); border-color: var(--sun); }
.wat-tube.sel::before { background: var(--sun); }
.wat-tube.fin { border-color: color-mix(in srgb, var(--sun) 70%, transparent); }
.wat-tube.pouring { transition: transform .32s ease-in-out; z-index: 6; transform: translate(var(--dx), var(--dy)) rotate(var(--rot)); border-color: var(--sun); }
.wat-tube.shake { animation: wat-shake .3s; }
@keyframes wat-shake { 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
.wat-in { position: absolute; left: 0; right: 0; bottom: 0; top: 0; display: flex; flex-direction: column-reverse; overflow: hidden; border-radius: 0 0 calc(var(--tw) / 2 - 3px) calc(var(--tw) / 2 - 3px); }
.wat-l { flex: none; height: var(--lh); background: var(--lc); position: relative; box-shadow: inset 0 -1px 0 rgba(0, 0, 0, .14); }
.wat-l::after { content: ""; position: absolute; left: 16%; top: 10%; bottom: 10%; width: 13%; border-radius: 5px; background: rgba(255, 255, 255, .26); }
.wat-l.nw { transform-origin: bottom; animation: wat-fill .42s ease-out backwards; }
@keyframes wat-fill { from { transform: scaleY(0); } }
.wat-stream { position: absolute; width: 7px; border-radius: 4px; background: var(--lc); transform-origin: top; animation: wat-flow .34s ease-out forwards; z-index: 5; pointer-events: none; }
@keyframes wat-flow { from { transform: scaleY(0); } }
.wat-msg { margin: 2px 0 0; min-height: 2.9em; text-align: center; font-size: 14px; color: var(--ink-3); }
.wat-msg.warn { color: var(--ink); font-size: 15px; }
.wat-done { position: absolute; inset: 0; display: grid; place-items: center; text-align: center; background: color-mix(in srgb, var(--bg) 86%, transparent); padding: 20px; animation: fadein .35s ease-out; backdrop-filter: blur(3px); -webkit-backdrop-filter: blur(3px); z-index: 8; }
.wat-done h2 { margin: 0; font-size: 26px; font-weight: 600; letter-spacing: -.015em; }
.wat-done p { margin: 6px 0 0; color: var(--ink-2); }
.wat-done .actions { justify-content: center; margin-top: 18px; }
`;
const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 3.5v11a3 3 0 0 0 6 0v-11"/><path d="M4.5 10h6"/><path d="M13.5 3.5v11a3 3 0 0 0 6 0v-11"/><path d="M13.5 13h6"/></svg>';
const COL = ['#E5604D', '#EBA24F', '#EBD14F', '#5DBB7A', '#4FC3B8', '#5B9BE8', '#9B7AE0', '#E58AB5', '#B8906A'];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

GM.register({
  id: 'water', name: 'Water Sort', order: 3, icon: ICON,
  tagline: 'Pour the colours until each tube is one colour.',
  stat: (get) => { const l = get('level', 1); return l > 1 ? `Level ${l}` : ''; },
  summary: (get) => { const g = get('game', null); const l = get('level', 1); return g && g.moves ? `level ${l}, ${g.moves} move${g.moves === 1 ? '' : 's'} so far.` : `level ${l} is ready.`; },

  create(ctx) {
    if (!document.getElementById('gm-wat-css')) { const s = document.createElement('style'); s.id = 'gm-wat-css'; s.textContent = CSS; document.head.appendChild(s); }
    const W = Core.water, root = ctx.root;
    let level = Math.max(1, ctx.get('level', 1) | 0);
    let g = ctx.get('game', null);
    const freshGame = (L) => ({ level: L, tubes: W.level(L).tubes, moves: 0, extra: false, stack: [], done: false });
    if (!g || g.level !== level || !Array.isArray(g.tubes) || !g.tubes.length) g = freshGame(level);
    let sel = -1, locked = false, dead = false, els = [];

    root.innerHTML = `<div class="wat">
      <div class="wat-top"><div class="wat-stat"><span class="wat-lab">Level</span><span class="wat-lv num" id="watLv">1</span></div>
        <div class="wat-stat r"><span class="wat-lab">Moves</span><span class="wat-mv num" id="watMv">0</span></div></div>
      <div class="wat-field" id="watField"></div>
      <p class="wat-msg" id="watMsg"></p></div>`;
    const field = root.querySelector('#watField'), msg = root.querySelector('#watMsg');

    /* ---------- Drawing ---------- */
    function sizes(n) {
      if (n <= 5) return { tw: 58, lh: 44, cols: n };
      if (n <= 8) return { tw: 50, lh: 38, cols: Math.ceil(n / 2) };
      return { tw: 46, lh: 34, cols: Math.ceil(n / 2) };
    }
    const layersHtml = (t, fromNew) => t.map((c, i) => `<span class="wat-l${fromNew != null && i >= fromNew ? ' nw' : ''}" style="--lc:${COL[c]}"></span>`).join('');
    const describe = (t) => (t.length ? t.length + ' layers' : 'empty');
    function buildField() {
      const n = g.tubes.length, z = sizes(n);
      field.style.setProperty('--cols', z.cols); field.style.setProperty('--tw', z.tw + 'px'); field.style.setProperty('--lh', z.lh + 'px');
      field.innerHTML = g.tubes.map((t, i) => `<button class="wat-tube" type="button" data-t="${i}" aria-label="Tube ${i + 1}, ${describe(t)}"><span class="wat-in">${layersHtml(t)}</span></button>`).join('');
      els = Array.from(field.querySelectorAll('.wat-tube'));
      els.forEach((el, i) => el.classList.toggle('fin', fin(g.tubes[i])));
    }
    const fin = (t) => t.length === W.CAP && t.every((x) => x === t[0]);
    function paintTube(i, fromNew) {
      const el = els[i];
      el.querySelector('.wat-in').innerHTML = layersHtml(g.tubes[i], fromNew);
      el.classList.toggle('fin', fin(g.tubes[i]));
      el.setAttribute('aria-label', `Tube ${i + 1}, ${describe(g.tubes[i])}`);
    }
    function paintHeader() {
      root.querySelector('#watLv').textContent = g.level;
      root.querySelector('#watMv').textContent = g.moves;
      ctx.toolState('undo', !g.stack.length || g.done);
      ctx.toolState('extra', g.extra || g.done);
      ctx.setTitle('Water Sort');
    }
    function paintMsg() {
      if (g.done) { msg.textContent = ''; msg.className = 'wat-msg'; return; }
      if (!W.hasMoves(g.tubes)) { msg.className = 'wat-msg warn'; msg.textContent = 'No moves left. Undo, add a tube or start the level again.'; }
      else { msg.className = 'wat-msg'; msg.textContent = g.moves === 0 ? 'Tap a tube, then tap where to pour.' : ''; }
    }
    function save() { ctx.put('game', g); ctx.put('level', level); }

    /* ---------- Playing ---------- */
    function select(i) {
      if (sel >= 0) els[sel].classList.remove('sel');
      sel = i;
      if (i >= 0) els[i].classList.add('sel');
    }
    function shake(i) { const el = els[i]; el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }

    async function pour(a, b) {
      const res = W.pour(g.tubes, a, b);
      if (!res) return;
      locked = true;
      g.stack.push({ tubes: g.tubes.map((t) => t.slice()), moves: g.moves, extra: g.extra });
      if (g.stack.length > 60) g.stack.shift();
      const A = els[a], Bt = els[b];
      A.classList.remove('sel'); sel = -1;
      // where the source tube must go so its mouth sits just above the target tube
      const dir = Bt.offsetLeft + Bt.offsetWidth / 2 >= A.offsetLeft + A.offsetWidth / 2 ? 1 : -1;
      const th = 58 * Math.PI / 180, h = A.offsetHeight;
      const cx = A.offsetLeft + A.offsetWidth / 2, cy = A.offsetTop + A.offsetHeight / 2;
      const mx = Bt.offsetLeft + Bt.offsetWidth / 2 - dir * 8, my = Bt.offsetTop - 16;
      const dx = mx - cx - dir * Math.sin(th) * h / 2, dy = my - cy + Math.cos(th) * h / 2;
      A.style.setProperty('--dx', dx + 'px'); A.style.setProperty('--dy', dy + 'px'); A.style.setProperty('--rot', dir * 58 + 'deg');
      A.classList.add('pouring');
      ctx.sfx('pour'); ctx.haptic(14);
      await wait(ctx.reduced ? 20 : 300);
      if (dead) return;
      const before = g.tubes[b].length;
      g.tubes = res.tubes; g.moves++;
      const z = sizes(g.tubes.length);
      const stream = document.createElement('div');
      stream.className = 'wat-stream';
      const surface = Bt.offsetTop + Bt.offsetHeight - (g.tubes[b].length) * z.lh - 2;
      stream.style.cssText = `--lc:${COL[res.color]};left:${mx - 3.5}px;top:${my + 4}px;height:${Math.max(10, surface - my - 4)}px`;
      field.appendChild(stream);
      paintTube(a); paintTube(b, before);
      root.querySelector('#watMv').textContent = g.moves;
      await wait(ctx.reduced ? 20 : 380);
      if (dead) return;
      stream.remove();
      A.classList.remove('pouring');   // the tube glides back on its own; taps are accepted straight away
      locked = false;
      afterMove();
    }

    function afterMove() {
      paintHeader();
      if (W.isSolved(g.tubes)) { g.done = true; level = g.level; save(); complete(); return; }
      paintMsg(); save();
    }

    function complete() {
      paintHeader(); paintMsg();
      ctx.sfx('win'); ctx.haptic([30, 50, 30, 50, 60]);
      const d = document.createElement('div');
      d.className = 'wat-done';
      d.innerHTML = `<div><h2>Level ${g.level} complete</h2><p>${g.moves} move${g.moves === 1 ? '' : 's'}</p>
        <div class="actions"><button class="btn primary" type="button" data-wat="next">Next level</button></div></div>`;
      field.appendChild(d);
    }

    function startLevel(L) {
      level = L; g = freshGame(L); sel = -1; locked = false;
      buildField(); paintHeader(); paintMsg(); save();
    }

    function undo() {
      if (locked || g.done || !g.stack.length) return;
      const s = g.stack.pop();
      g.tubes = s.tubes; g.moves = s.moves; g.extra = s.extra;
      select(-1); buildField(); paintHeader(); paintMsg(); save();
      ctx.sfx('tap');
    }
    function addTube() {
      if (locked || g.done || g.extra) return;
      g.stack.push({ tubes: g.tubes.map((t) => t.slice()), moves: g.moves, extra: g.extra });
      g.tubes.push([]); g.extra = true;
      select(-1); buildField(); paintHeader(); paintMsg(); save();
      ctx.sfx('select'); ctx.toast('Extra tube added');
    }
    function restartLevel() {
      const go = () => { startLevel(g.level); ctx.sfx('tap'); };
      if (!g.moves || g.done) { go(); return; }
      ctx.openSheet(ctx.head('Start this level again?') + `<p>The tubes go back to how they began.</p>
        <div class="actions"><button class="btn primary" type="button" data-wat-sheet="yes">Start again</button><button class="btn" type="button" data-sheet="close">Cancel</button></div>`, (e) => {
        if (e.target.closest('[data-wat-sheet="yes"]')) { ctx.closeSheet(); go(); }
      });
    }

    field.addEventListener('click', (e) => {
      const nx = e.target.closest('[data-wat="next"]');
      if (nx) { ctx.sfx('tap'); startLevel(g.level + 1); return; }
      const t = e.target.closest('.wat-tube');
      if (!t || locked || g.done) return;
      const i = +t.dataset.t;
      if (sel < 0) { if (!g.tubes[i].length) { shake(i); return; } select(i); ctx.sfx('select'); ctx.haptic(8); return; }
      if (sel === i) { select(-1); return; }
      if (W.canPour(g.tubes, sel, i)) { pour(sel, i); return; }
      // can't pour there: move the selection to the tapped tube if it has something in it
      ctx.sfx('error'); shake(i);
      if (g.tubes[i].length) select(i); else select(-1);
    });

    ctx.setTools([
      { id: 'undo', label: 'Undo last move', svg: ctx.ICON.undo, disabled: true },
      { id: 'extra', label: 'Add an extra tube', svg: ctx.ICON.plus },
      { id: 'restart', label: 'Start level again', svg: ctx.ICON.restart },
    ], (id) => { if (id === 'undo') undo(); else if (id === 'extra') addTube(); else if (id === 'restart') restartLevel(); });

    buildField(); paintHeader(); paintMsg();
    if (g.done) complete();
    save();

    return { destroy() { dead = true; } };
  },
});
})();
