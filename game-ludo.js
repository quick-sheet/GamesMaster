/* Ludo: two to four colours, any mix of people and the computer, on one phone. */
(function () {
'use strict';
const CSS = `
.lud { display: flex; flex-direction: column; align-items: center; gap: 12px; padding-top: 4px; }
.lud-hud { display: flex; gap: 8px; justify-content: center; width: 100%; }
.lud-hud.four { display: grid; grid-template-columns: 1fr 1fr; }
.lud-hud.four .lud-p { justify-content: flex-start; }
.lud-p { display: flex; align-items: center; gap: 8px; padding: 7px 12px; border-radius: 14px; background: var(--raise); border: 1.5px solid transparent; transition: border-color .2s, background .2s; font-size: 14px; }
.lud-p.on { border-color: var(--pc); background: color-mix(in srgb, var(--pc) 14%, var(--raise)); }
.lud-p .dot { width: 12px; height: 12px; border-radius: 50%; background: var(--pc); flex: none; }
.lud-p .nm { font-weight: 500; }
.lud-p .tag { color: var(--ink-3); font-size: 12.5px; display: inline-flex; }
.lud-p .tag svg { width: 15px; height: 15px; }
.lud-p .hm { margin-left: auto; padding-left: 4px; }
.lud-p .hm { color: var(--ink-2); font-size: 13px; margin-left: 2px; }
.lud-wrap { position: relative; width: min(100%, calc(100dvh - 350px)); min-width: 280px; max-width: 100%; aspect-ratio: 1; }
.lud-svg { display: block; width: 100%; height: 100%; }
.lud-toks { position: absolute; inset: 0; }
.tok { position: absolute; width: 10%; height: 10%; transform: translate(-50%, -50%); padding: 0; transition: left .13s linear, top .13s linear; z-index: 2; border-radius: 50%; }
.tok .d { position: absolute; inset: 15%; border-radius: 50%; background: var(--tc); border: 2px solid rgba(255, 255, 255, .6); transform: scale(var(--s, 1)); transition: transform .15s;
  box-shadow: inset 0 -3px 0 rgba(0, 0, 0, .22), inset 0 2px 0 rgba(255, 255, 255, .35), 0 2px 5px rgba(0, 0, 0, .4); }
.tok.can { z-index: 3; cursor: pointer; }
.tok.can::after { content: ""; position: absolute; inset: 4%; border-radius: 50%; border: 2.5px solid var(--sun); animation: lud-ring 1.1s ease-out infinite; pointer-events: none; }
.tok.can .d { animation: lud-bob .8s ease-in-out infinite alternate; }
@keyframes lud-ring { from { transform: scale(.78); opacity: 1; } to { transform: scale(1.18); opacity: 0; } }
@keyframes lud-bob { to { transform: scale(calc(var(--s, 1) * 1.1)); } }
.lud-msg { margin: 0; min-height: 2.9em; text-align: center; font-size: 17px; font-weight: 300; letter-spacing: .005em; max-width: 24em; display: flex; align-items: center; justify-content: center; }
.lud-msg strong { font-weight: 600; }
.lud-die { width: 72px; height: 72px; border-radius: 20px; background: var(--raise-2); border: 2.5px solid var(--pc, var(--line-2)); display: grid; place-items: center; position: relative; transition: border-color .2s, transform .15s; flex: none; }
.lud-die:disabled { opacity: 1; cursor: default; }
.lud-die.ready { animation: lud-nudge 1.4s ease-in-out infinite; }
.lud-die.rolling { animation: lud-wobble .5s linear; }
@keyframes lud-nudge { 50% { transform: scale(1.07); } }
@keyframes lud-wobble { 0% { transform: rotate(0) scale(1); } 25% { transform: rotate(-16deg) scale(1.08); } 50% { transform: rotate(14deg) scale(1.1); } 75% { transform: rotate(-8deg) scale(1.05); } 100% { transform: rotate(0) scale(1); } }
.lud-pips { display: grid; grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(3, 1fr); width: 100%; height: 100%; padding: 13px; }
.lud-pips i { width: 11px; height: 11px; border-radius: 50%; background: var(--ink); place-self: center; }
.lud-over { position: absolute; inset: -5%; z-index: 8; border-radius: 14px; background: color-mix(in srgb, var(--bg) 86%, transparent); display: grid; place-items: center; text-align: center; padding: 20px; animation: fadein .35s ease-out; backdrop-filter: blur(3px); -webkit-backdrop-filter: blur(3px); }
.lud-over h2 { margin: 0; font-size: 28px; font-weight: 600; letter-spacing: -.015em; }
.lud-over p { margin: 6px 0 0; color: var(--ink-2); }
.lud-over .actions { justify-content: center; margin-top: 18px; }
.lud-setup { display: flex; flex-direction: column; gap: 4px; padding-top: 6px; }
.lud-setup h2 { margin: 6px 0 0; font-size: 22px; font-weight: 600; letter-spacing: -.015em; }
.lud-setup .lead { margin: 6px 0 14px; color: var(--ink-2); font-size: 15px; }
.lud-seat { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 12px 0; border-bottom: 1px solid var(--line); }
.lud-seat .who { display: flex; align-items: center; gap: 12px; font-weight: 500; }
.lud-seat .dot { width: 18px; height: 18px; border-radius: 50%; background: var(--pc); box-shadow: inset 0 -2px 0 rgba(0, 0, 0, .2), inset 0 1.5px 0 rgba(255, 255, 255, .35); }
.lud-seg { display: inline-flex; padding: 3px; border-radius: 20px; background: var(--raise); }
.lud-seg button { height: 34px; padding: 0 12px; border-radius: 17px; font-size: 13.5px; font-weight: 500; color: var(--ink-2); }
.lud-seg button[aria-pressed="true"] { background: var(--sun); color: var(--on-sun); }
.lud-presets { margin: 4px 0 8px; }
.lud-rules { margin: 10px 0 0; padding: 0 0 0 20px; color: var(--ink-2); font-size: 15px; }
.lud-rules li { margin: 0 0 8px; }
`;
const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6Z"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/></svg>';
const HELP = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M9.6 9.5a2.5 2.5 0 1 1 3.4 2.3c-.7.3-1 .8-1 1.5"/><circle cx="12" cy="16.7" r=".7" fill="currentColor"/></svg>';
const CPU = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="4.5" width="17" height="11.5" rx="2"/><path d="M9 20h6M12 16v4"/></svg>';
const NAMES = ['Red', 'Green', 'Yellow', 'Blue'];
const CV = ['var(--red)', 'var(--green)', 'var(--yellow)', 'var(--blue)'];
const PIPS = [[], [4], [0, 8], [0, 4, 8], [0, 2, 6, 8], [0, 2, 4, 6, 8], [0, 2, 3, 5, 6, 8]];
const PRESETS = [
  ['You against the computer', ['human', 'off', 'cpu', 'off']],
  ['Two people', ['human', 'off', 'human', 'off']],
  ['Four players', ['human', 'cpu', 'cpu', 'cpu']],
];
const DEFAULT_CFG = ['human', 'off', 'cpu', 'off'];
const YARD = [[0, 0], [0, 9], [9, 9], [9, 0]];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

GM.register({
  id: 'ludo', name: 'Ludo', order: 4, icon: ICON,
  tagline: 'Race your four tokens home. Two to four players.',
  stat: (get) => { const n = get('played', 0); return n ? `${n} played` : ''; },
  summary: (get) => {
    const s = get('state', null);
    if (s && s.winner == null && s.seats) {
      const seat = s.seats[s.turn], home = s.tokens[seat.color].filter((p) => p === 57).length;
      return `${NAMES[seat.color]}’s turn, ${home} of 4 tokens home.`;
    }
    return 'set up a new game.';
  },

  create(ctx) {
    if (!document.getElementById('gm-lud-css')) { const s = document.createElement('style'); s.id = 'gm-lud-css'; s.textContent = CSS; document.head.appendChild(s); }
    const L = Core.ludo, root = ctx.root;
    let cfg = ctx.get('cfg', DEFAULT_CFG);
    if (!Array.isArray(cfg) || cfg.length !== 4 || cfg.filter((k) => k !== 'off').length < 2) cfg = DEFAULT_CFG.slice();
    let state = ctx.get('state', null);
    const validState = (s) => s && Array.isArray(s.seats) && s.seats.length >= 2 && Array.isArray(s.tokens) && s.tokens.length === 4 && s.winner == null;
    if (!validState(state)) state = null;
    let vp = null, els = {}, legal = [], gen = 0, dead = false, tapResolve = null, awaiting = null, die = 0;

    const alive = (my) => !dead && my === gen;
    const humans = () => state.seats.filter((s) => s.kind === 'human').length;
    const cpus = () => state.seats.filter((s) => s.kind === 'cpu').length;
    const who = (seat) => {
      if (seat.kind === 'human') return humans() === 1 && cpus() >= 1 ? 'You' : NAMES[seat.color];
      return cpus() === 1 ? 'Computer' : `${NAMES[seat.color]} computer`;
    };
    const verb = (seat, a, b) => (who(seat) === 'You' ? a : b);   // "You roll" / "Red rolls"
    function save() { ctx.put('state', state); ctx.put('cfg', cfg); }

    /* ---------- Setup screen ---------- */
    function renderSetup() {
      gen++; awaiting = null; if (tapResolve) { tapResolve(null); tapResolve = null; }
      ctx.setTitle('Ludo');
      const active = cfg.filter((k) => k !== 'off').length;
      root.innerHTML = `<div class="lud-setup">
        <h2>Who is playing?</h2>
        <p class="lead">Pass the phone between people, or let the computer take any colour. Play goes clockwise.</p>
        <div class="chips lud-presets">${PRESETS.map(([label, c], i) => `<button class="chip" type="button" data-lud="preset:${i}" aria-pressed="${JSON.stringify(c) === JSON.stringify(cfg)}">${label}</button>`).join('')}</div>
        ${cfg.map((k, c) => `<div class="lud-seat" style="--pc:${CV[c]}"><span class="who"><span class="dot"></span>${NAMES[c]}</span>
          <span class="lud-seg" role="group" aria-label="${NAMES[c]}">${[['off', 'Off'], ['human', 'Person'], ['cpu', 'Computer']].map(([v, l]) => `<button type="button" data-lud="seat:${c}:${v}" aria-pressed="${k === v}">${l}</button>`).join('')}</span></div>`).join('')}
        <div class="actions"><button class="btn primary" type="button" data-lud="start"${active < 2 ? ' disabled' : ''}>Start game</button>
          <button class="link-btn" type="button" data-lud="rules">How to play</button></div>
        ${active < 2 ? '<p class="small">Choose at least two players.</p>' : ''}</div>`;
      ctx.toolState('new', true);
    }

    /* ---------- Board ---------- */
    function boardSvg(on) {
      const star = (r, c) => `<path d="M0 -.34L.1 -.1L.36 -.1L.15 .06L.23 .32L0 .17L-.23 .32L-.15 .06L-.36 -.1L-.1 -.1Z" transform="translate(${c + .5} ${r + .5})" fill="var(--ink-3)"/>`;
      let s = `<svg class="lud-svg" viewBox="0 0 15 15" role="img" aria-label="Ludo board"><rect width="15" height="15" rx="1" fill="var(--raise)"/>`;
      for (let c = 0; c < 4; c++) {
        const [r0, c0] = YARD[c], a = on[c] ? 1 : 0.35, col = CV[c];
        s += `<rect x="${c0 + .4}" y="${r0 + .4}" width="5.2" height="5.2" rx=".8" fill="${col}" fill-opacity="${.15 * a}" stroke="${col}" stroke-opacity="${.55 * a}" stroke-width=".07"/>`;
        for (let t = 0; t < 4; t++) { const [x, y] = L.yardSlot(c, t); s += `<circle cx="${x}" cy="${y}" r=".68" fill="var(--raise-2)" stroke="${col}" stroke-opacity="${.4 * a}" stroke-width=".06"/>`; }
      }
      L.TRACK.forEach(([r, c], i) => { s += `<rect x="${c + .05}" y="${r + .05}" width=".9" height=".9" rx=".16" fill="var(--raise-2)"/>`; });
      for (let c = 0; c < 4; c++) {
        const a = on[c] ? 1 : 0.35;
        const [sr, sc] = L.TRACK[L.START[c]];
        s += `<rect x="${sc + .05}" y="${sr + .05}" width=".9" height=".9" rx=".16" fill="${CV[c]}" fill-opacity="${.6 * a}"/>`;
        for (const [r, cc] of L.COLS[c]) s += `<rect x="${cc + .05}" y="${r + .05}" width=".9" height=".9" rx=".16" fill="${CV[c]}" fill-opacity="${.34 * a}"/>`;
      }
      for (const i of [8, 21, 34, 47]) s += star(...L.TRACK[i]);
      const tri = [[6, 6, 6, 9], [6, 6, 9, 6], [9, 6, 9, 9], [6, 9, 9, 9]];   // left, top, right, bottom edges of the centre square
      tri.forEach(([x1, y1, x2, y2], c) => { s += `<polygon points="${x1},${y1} ${x2},${y2} 7.5,7.5" fill="${CV[c]}" fill-opacity="${on[c] ? .7 : .2}"/>`; });
      return s + '</svg>';
    }

    function tokPos(c, t, p) {
      if (p === 0) return L.yardSlot(c, t);
      if (p === 57) { const o = (t - 1.5) * 0.27; return [[6.55, 7.5 + o], [7.5 + o, 6.55], [8.45, 7.5 + o], [7.5 + o, 8.45]][c]; }
      const [r, col] = L.cellOf(c, p);
      return [col + 0.5, r + 0.5];
    }
    function place() {
      const groups = {};
      for (const seat of state.seats) for (let t = 0; t < 4; t++) {
        const p = vp[seat.color][t], pos = tokPos(seat.color, t, p), k = pos[0].toFixed(2) + ',' + pos[1].toFixed(2);
        (groups[k] = groups[k] || []).push({ c: seat.color, t, pos, p });
      }
      const OFF = { 2: [[-.2, 0], [.2, 0]], 3: [[-.22, -.12], [.22, -.12], [0, .2]], 4: [[-.2, -.2], [.2, -.2], [-.2, .2], [.2, .2]] };
      for (const k in groups) {
        const g = groups[k], m = g.length;
        g.forEach((it, i) => {
          const o = m > 1 ? (OFF[Math.min(4, m)][i] || [0, 0]) : [0, 0];
          const el = els[it.c + '-' + it.t];
          el.style.left = ((it.pos[0] + o[0]) / 15 * 100) + '%'; el.style.top = ((it.pos[1] + o[1]) / 15 * 100) + '%';
          el.style.setProperty('--s', it.p === 57 ? .62 : m > 1 ? .76 : 1);
        });
      }
    }
    function markCan(list) {
      const seat = L.current(state);
      for (const key in els) els[key].classList.remove('can');
      for (const t of list) els[seat.color + '-' + t].classList.add('can');
    }

    function renderGame() {
      const on = [false, false, false, false];
      state.seats.forEach((s) => { on[s.color] = true; });
      ctx.setTitle('Ludo');
      ctx.toolState('new', false);
      root.innerHTML = `<div class="lud">
        <div class="lud-hud" id="ludHud"></div>
        <div class="lud-wrap" id="ludWrap">${boardSvg(on)}<div class="lud-toks" id="ludToks"></div></div>
        <p class="lud-msg" id="ludMsg" aria-live="polite"></p>
        <button class="lud-die" id="ludDie" type="button" aria-label="Roll the dice" disabled></button></div>`;
      els = {};
      const toks = root.querySelector('#ludToks');
      for (const seat of state.seats) for (let t = 0; t < 4; t++) {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'tok'; b.dataset.c = seat.color; b.dataset.t = t;
        b.style.setProperty('--tc', CV[seat.color]);
        b.setAttribute('aria-label', `${NAMES[seat.color]} token ${t + 1}`);
        b.innerHTML = '<span class="d"></span>';
        toks.appendChild(b); els[seat.color + '-' + t] = b;
      }
      place(); paintHud(); paintDie(die || 0, false);
    }
    function paintHud() {
      const cur = L.current(state), hud = root.querySelector('#ludHud');
      if (!hud) return;
      hud.innerHTML = state.seats.map((s) => {
        const home = state.tokens[s.color].filter((p) => p === 57).length;
        const tag = s.kind === 'cpu' ? `<span class="tag" title="Computer" aria-label="Computer">${CPU}</span>` : humans() === 1 && cpus() ? '<span class="tag">You</span>' : '';
        return `<div class="lud-p${(state.winner == null ? s === cur : s.color === state.winner) ? ' on' : ''}" style="--pc:${CV[s.color]}"><span class="dot"></span><span class="nm">${NAMES[s.color]}</span>${tag}<span class="hm num">${home}/4</span></div>`;
      }).join('');
      hud.classList.toggle('four', state.seats.length > 2);
      const d = root.querySelector('#ludDie');
      if (d) d.style.setProperty('--pc', CV[cur.color]);
    }
    function setMsg(html) { const m = root.querySelector('#ludMsg'); if (m) m.innerHTML = html ? `<span>${html}</span>` : ''; }
    function paintDie(v, ready) {
      const d = root.querySelector('#ludDie'); if (!d) return;
      d.innerHTML = v ? `<span class="lud-pips">${Array.from({ length: 9 }, (_, i) => (PIPS[v].includes(i) ? '<i></i>' : '<b></b>')).join('')}</span>` : `<span class="lud-pips">${Array.from({ length: 9 }, (_, i) => (i === 4 ? '<i style="opacity:.25"></i>' : '<b></b>')).join('')}</span>`;
      d.setAttribute('aria-label', ready ? 'Roll the dice' : v ? `Dice shows ${v}` : 'Dice');
      d.disabled = !ready;
      d.classList.toggle('ready', !!ready);
    }
    async function animateDie(v, my) {
      const d = root.querySelector('#ludDie'); if (!d) return;
      d.classList.remove('ready'); d.disabled = true;
      d.classList.remove('rolling'); void d.offsetWidth; d.classList.add('rolling');
      ctx.sfx('dice'); ctx.haptic(18);
      const n = ctx.reduced ? 1 : 7;
      for (let i = 0; i < n; i++) { paintDie(1 + Math.floor(Math.random() * 6), false); await sleep(70); if (!alive(my)) return; }
      die = v; paintDie(v, false);
      d.classList.remove('rolling');
    }

    /* ---------- Turn loop ---------- */
    const humanTap = (kind) => new Promise((res) => { awaiting = kind; tapResolve = res; });
    async function run(my) {
      while (alive(my) && state.winner == null) {
        const seat = L.current(state);
        paintHud();
        let rolled = state.roll;
        if (rolled == null) {
          if (seat.kind === 'cpu') {
            setMsg(`<strong>${ctx.esc(who(seat))}</strong> ${who(seat) === 'You' ? '' : 'is'} rolling…`);
            await sleep(700);
          } else {
            setMsg(`<strong>${ctx.esc(who(seat) === 'You' ? 'Your turn' : who(seat) + '’s turn')}</strong>. Tap the dice.`);
            paintDie(die, true);
            const r = await humanTap('roll'); awaiting = null;
            if (r == null) return;
          }
          if (!alive(my)) return;
          const v = 1 + Math.floor(Math.random() * 6);
          await animateDie(v, my);
          if (!alive(my)) return;
          const res = L.rollDie(state, v);
          save();
          if (res.forfeit) { setMsg(`${ctx.esc(who(seat))} rolled a third six in a row. <strong>Turn lost.</strong>`); ctx.sfx('error'); await sleep(1300); continue; }
          if (res.passed) { setMsg(`${ctx.esc(who(seat))} rolled <strong>${v}</strong>. No move is possible.`); await sleep(1100); continue; }
          legal = res.legal; rolled = v;
        } else {
          legal = L.legalMoves(state, rolled); die = rolled; paintDie(rolled, false);
        }
        // choose a token
        const uniq = []; const seenP = new Set();
        for (const t of legal) { const p = state.tokens[seat.color][t]; if (!seenP.has(p)) { seenP.add(p); uniq.push(t); } }
        let t;
        if (seat.kind === 'cpu') {
          setMsg(`${ctx.esc(who(seat))} rolled <strong>${rolled}</strong>.`);
          await sleep(550); t = L.cpuPick(state, legal);
        } else if (uniq.length === 1) {
          setMsg(`${ctx.esc(who(seat))} rolled <strong>${rolled}</strong>.`);
          markCan(legal); await sleep(600); t = uniq[0];
        } else {
          setMsg(`${ctx.esc(who(seat))} rolled <strong>${rolled}</strong>. Choose a token to move.`);
          markCan(legal);
          t = await humanTap('token'); awaiting = null;
          if (t == null) return;
        }
        markCan([]);
        if (!alive(my)) return;
        await doMove(t, my);
      }
      if (alive(my) && state.winner != null) finish();
    }

    async function doMove(t, my) {
      const seat = L.current(state);
      const r = L.move(state, t);
      save();
      const el = els[r.color + '-' + t];
      el.style.zIndex = 4;
      if (r.from === 0) { vp[r.color][t] = 1; place(); ctx.sfx('step'); await sleep(240); }
      else for (let p = r.from + 1; p <= r.to; p++) { vp[r.color][t] = p; place(); ctx.sfx('step'); await sleep(ctx.reduced ? 30 : 140); if (!alive(my)) return; }
      if (r.captures.length) {
        ctx.sfx('capture'); ctx.haptic([20, 40, 20]);
        for (const c of r.captures) vp[c.color][c.token] = 0;
        place();
        setMsg(`<strong>${ctx.esc(who(seat))}</strong> sent ${r.captures.length > 1 ? 'tokens' : 'a token'} back to the yard.`);
        await sleep(650);
      }
      if (r.home) { ctx.sfx('home'); ctx.haptic([15, 30, 15]); await sleep(300); }
      el.style.zIndex = '';
      paintHud();
      if (!alive(my)) return;
      if (!r.won && r.extra) { setMsg(`${ctx.esc(who(seat))} gets another turn.`); await sleep(500); }
      else await sleep(220);
    }

    function finish() {
      const seat = state.seats.find((s) => s.color === state.winner);
      ctx.put('played', ctx.get('played', 0) + 1);
      ctx.put('state', null);
      ctx.sfx('win'); ctx.haptic([30, 50, 30, 50, 80]);
      const humanWon = seat.kind === 'human';
      const title = humans() === 1 && cpus() >= 1 ? (humanWon ? 'You win' : `${NAMES[seat.color]} wins`) : `${NAMES[seat.color]} wins`;
      const wrap = root.querySelector('#ludWrap');
      const d = document.createElement('div');
      d.className = 'lud-over';
      d.innerHTML = `<div><h2 style="color:${CV[seat.color]}">${title}</h2><p>All four tokens are home.</p>
        <div class="actions"><button class="btn primary" type="button" data-lud="again">Play again</button><button class="btn" type="button" data-lud="change">Change players</button></div></div>`;
      wrap.appendChild(d);
      paintHud(); setMsg('');
      const dd = root.querySelector('#ludDie'); if (dd) dd.disabled = true;
    }

    function begin() {
      gen++; const my = gen;
      if (tapResolve) { tapResolve(null); tapResolve = null; }
      const seats = cfg.map((k, c) => (k === 'off' ? null : { color: c, kind: k === 'cpu' ? 'cpu' : 'human', name: NAMES[c] })).filter(Boolean);
      state = L.newGame(seats);
      vp = state.tokens.map((a) => a.slice());
      die = 0; legal = []; awaiting = null;
      save(); renderGame(); run(my);
    }
    function resume() {
      gen++; const my = gen;
      vp = state.tokens.map((a) => a.slice());
      die = state.roll || 0; awaiting = null;
      renderGame(); run(my);
    }

    /* ---------- Rules and prompts ---------- */
    function openRules() {
      ctx.openSheet(ctx.head('How to play') + `<ol class="lud-rules">
        <li>Tap the dice to roll. You need a <strong>6</strong> to bring a token out of the yard onto your start square.</li>
        <li>Move a token clockwise by the number rolled, then up your own coloured lane to the centre.</li>
        <li>You roll again after a 6, after sending an opponent’s token home to its yard, and after getting a token to the centre. Three sixes in a row lose the turn.</li>
        <li>Land on a single opponent token to send it back to its yard. Start squares and star squares are safe.</li>
        <li>A token needs the exact number to reach the centre. The first player to bring all four tokens in wins.</li></ol>`);
    }
    function confirmNew() {
      if (!state || state.winner != null || state.moves === 0) { state = null; ctx.put('state', null); renderSetup(); return; }
      ctx.openSheet(ctx.head('Leave this game?') + `<p>The game in progress will be lost.</p>
        <div class="actions"><button class="btn primary" type="button" data-lud-sheet="yes">Choose players again</button><button class="btn" type="button" data-sheet="close">Keep playing</button></div>`, (e) => {
        if (e.target.closest('[data-lud-sheet="yes"]')) { ctx.closeSheet(); state = null; ctx.put('state', null); renderSetup(); }
      });
    }

    /* ---------- Wire up ---------- */
    root.addEventListener('click', (e) => {
      const tk = e.target.closest('.tok.can');
      if (tk && awaiting === 'token' && tapResolve) { const r = tapResolve; tapResolve = null; r(+tk.dataset.t); return; }
      if (e.target.closest('#ludDie')) { if (awaiting === 'roll' && tapResolve) { const r = tapResolve; tapResolve = null; r('roll'); } return; }
      const b = e.target.closest('[data-lud]');
      if (!b) return;
      const v = b.dataset.lud;
      if (v === 'rules') { openRules(); return; }
      if (v.startsWith('preset:')) { cfg = PRESETS[+v.split(':')[1]][1].slice(); ctx.sfx('select'); renderSetup(); return; }
      if (v.startsWith('seat:')) { const [, c, k] = v.split(':'); cfg[+c] = k; ctx.sfx('select'); renderSetup(); return; }
      if (v === 'start' || v === 'again') { ctx.sfx('tap'); begin(); return; }
      if (v === 'change') { ctx.sfx('tap'); state = null; renderSetup(); }
    });
    ctx.setTools([
      { id: 'rules', label: 'How to play', svg: HELP },
      { id: 'new', label: 'Choose players again', svg: ctx.ICON.restart },
    ], (id) => { if (id === 'rules') openRules(); else if (id === 'new') confirmNew(); });

    if (state) resume(); else renderSetup();

    return { destroy() { dead = true; gen++; if (tapResolve) { tapResolve(null); tapResolve = null; } } };
  },
});
})();
