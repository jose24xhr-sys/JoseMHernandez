/*
 * "Así trabajamos" connector animation for the Monobot Studio homepage (section #proceso).
 *
 * It only runs while the steps are actually on screen:
 *  - Row layout (≥1080px): when the row of steps reaches the middle of the viewport, a line draws
 *    from step to step and each step lights up as the line arrives. If the visitor scrolls away
 *    before it finishes, it resets and plays again when they come back.
 *  - Vertical timeline (<1080px): the line follows the scroll. Each step lights up as it reaches
 *    the reading line, so nothing animates off screen.
 * When it has finished, the arrow appears, the button glows once and a small spark keeps travelling
 * the line. If the page opens already scrolled past the section, it simply shows finished.
 * The line is measured from the real layout and redrawn on resize. Call  section.replay()  to replay.
 */
(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const DRAW = 850;      // ms to draw one connector (row layout)
  const HOLD = 380;      // pause on each step before moving on (row layout)
  const TAIL = 600;      // ms for the final arrow (row layout)
  const BAND_TOP = .2;   // the row counts as "in view" while it overlaps this band of the viewport…
  const BAND_BOTTOM = .72;
  const READ_LINE = .62; // vertical timeline: the line is drawn down to this point of the viewport
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.querySelectorAll('[data-process]').forEach(setup);

  function setup(root) {
    const box = root.querySelector('.psteps');
    const steps = [...box.querySelectorAll('.pstep')];
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'pwire');
    svg.setAttribute('aria-hidden', 'true');
    box.prepend(svg);

    let segs = [];          // {fill, len, y0, y1}
    let stepY = [];         // vertical: y (inside the box) at which each step switches on
    let arrow, glow, head, spark;
    let vertical = false;
    let state = 'armed';    // armed | playing | done
    let reached = -Infinity; // vertical: furthest point the reading line has reached
    let raf = 0, ambient = 0;

    const el = (tag, attrs, parent = svg) => {
      const n = document.createElementNS(NS, tag);
      for (const k in attrs) n.setAttribute(k, attrs[k]);
      parent.appendChild(n);
      return n;
    };
    const ease = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const clamp = (v) => Math.min(1, Math.max(0, v));
    const place = (c, pt, o) => { c.setAttribute('cx', pt.x); c.setAttribute('cy', pt.y); c.style.opacity = o; };
    const vh = () => window.innerHeight || document.documentElement.clientHeight;

    /* ---------- geometry ---------- */
    function layout() {
      const b = box.getBoundingClientRect();
      svg.setAttribute('viewBox', `0 0 ${b.width} ${b.height}`);
      svg.innerHTML = '';
      const defs = el('defs', {});
      const g = el('linearGradient', { id: 'pwGrad', gradientUnits: 'userSpaceOnUse', x1: 0, y1: 0, x2: b.width, y2: b.height }, defs);
      el('stop', { offset: 0, 'stop-color': '#ff9a55' }, g);
      el('stop', { offset: 1, 'stop-color': '#ff6500' }, g);

      vertical = getComputedStyle(root).getPropertyValue('--flow').trim() === 'vertical';
      const rel = (r) => ({ x: r.left - b.left, y: r.top - b.top, w: r.width, h: r.height,
                            cx: r.left - b.left + r.width / 2, cy: r.top - b.top + r.height / 2 });
      const pts = steps.map((s) => ({ tile: rel(s.querySelector('.ptile').getBoundingClientRect()),
                                      dot: rel(s.querySelector('.pdot').getBoundingClientRect()) }));
      const ds = [];
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], z = pts[i + 1];
        if (!vertical) {
          const sx = a.dot.cx + 8, sy = a.dot.cy, ex = z.tile.x - 14, ey = z.tile.cy + 6;
          const w = ex - sx, mx = (sx + ex) / 2, my = Math.max(sy, ey) + 18;
          ds.push({ d: `M${sx},${sy} C${sx + w * .25},${sy} ${mx - w * .2},${my} ${mx},${my} S${ex - w * .25},${ey} ${ex},${ey}`, y0: sy, y1: ey });
        } else {
          const sx = a.tile.cx - 5, sy = a.tile.y + a.tile.h + 16, ex = z.tile.cx - 5, ey = z.tile.y - 8;
          const h = ey - sy, my = (sy + ey) / 2, mx = sx + 14;
          ds.push({ d: `M${sx},${sy} C${sx},${sy + h * .25} ${mx},${my - h * .2} ${mx},${my} S${ex},${ey - h * .25} ${ex},${ey}`, y0: sy, y1: ey });
        }
      }
      const last = pts[pts.length - 1];
      let arrowD;
      if (!vertical) {
        const sx = last.dot.cx + 8, sy = last.dot.cy, ex = b.width - 6, ey = sy - 6, w = ex - sx;
        ds.push({ d: `M${sx},${sy} C${sx + w * .45},${sy + 6} ${ex - w * .35},${ey} ${ex},${ey}`, y0: sy, y1: ey });
        arrowD = `M${ex - 9},${ey - 7} L${ex},${ey} L${ex - 9},${ey + 7}`;
      } else {
        const sx = last.tile.cx - 5, sy = last.tile.y + last.tile.h + 16, ey = Math.min(b.height + 26, sy + 64);
        ds.push({ d: `M${sx},${sy} C${sx},${sy + 20} ${sx + 8},${ey - 24} ${sx},${ey}`, y0: sy, y1: ey });
        arrowD = `M${sx - 7},${ey - 9} L${sx},${ey} L${sx + 7},${ey - 9}`;
      }

      segs = ds.map(({ d, y0, y1 }) => {
        el('path', { class: 'base', d });
        const fill = el('path', { class: 'fill', d });
        const len = fill.getTotalLength();
        fill.style.strokeDasharray = `${len}`;
        return { fill, len, y0, y1 };
      });
      // a step switches on when the top third of its icon reaches the reading line
      stepY = pts.map((p) => p.tile.y + p.tile.h * .35);
      arrow = el('path', { class: 'arrow', d: arrowD });
      glow = el('circle', { class: 'glow', r: 9 });
      head = el('circle', { class: 'head', r: 4.5 });
      spark = el('circle', { class: 'spark', r: 3.2 });

      if (state === 'done') paintAll(1);
      else if (vertical) { paintAll(0); follow(); }
      else paintAll(0);
    }

    function paintAll(p) {
      segs.forEach((s) => (s.fill.style.strokeDashoffset = `${s.len * (1 - p)}`));
      arrow.style.opacity = p;
      glow.style.opacity = 0; head.style.opacity = 0;
    }

    /* ---------- states ---------- */
    function arm() {
      cancelAnimationFrame(raf); cancelAnimationFrame(ambient);
      state = 'armed';
      reached = -Infinity;
      root.classList.remove('is-done');
      root.classList.add('is-armed');
      steps.forEach((s) => s.classList.remove('is-on'));
      paintAll(0);
    }

    function finish({ silent = false } = {}) {
      cancelAnimationFrame(raf);
      state = 'done';
      steps.forEach((s) => s.classList.add('is-on'));
      paintAll(1);
      if (silent) root.classList.remove('is-armed');   // shown finished without replaying the effects
      root.classList.add('is-done');
      startAmbient();
    }

    // Row layout: timed sequence, started when the row is in view.
    function play() {
      cancelAnimationFrame(raf); cancelAnimationFrame(ambient);
      arm();
      void root.offsetWidth;
      state = 'playing';
      const plan = [{ type: 'on', i: 0, at: 0 }];
      let t = 320;
      segs.forEach((s, i) => {
        const isTail = i === segs.length - 1, dur = isTail ? TAIL : DRAW;
        plan.push({ type: 'seg', i, start: t, dur });
        t += dur;
        if (!isTail) { plan.push({ type: 'on', i: i + 1, at: t }); t += HOLD; }
      });
      const end = t, t0 = performance.now();
      const frame = (now) => {
        const e = now - t0;
        let active = null;
        for (const p of plan) {
          if (p.type === 'on') { if (e >= p.at) steps[p.i].classList.add('is-on'); continue; }
          const s = segs[p.i], k = clamp((e - p.start) / p.dur), q = ease(k);
          s.fill.style.strokeDashoffset = `${s.len * (1 - q)}`;
          if (k > 0 && k < 1) active = { s, q };
        }
        if (active) {
          const pt = active.s.fill.getPointAtLength(active.s.len * active.q);
          place(glow, pt, .55); place(head, pt, 1);
        } else { glow.style.opacity = 0; head.style.opacity = 0; }
        if (e < end) raf = requestAnimationFrame(frame);
        else finish();
      };
      raf = requestAnimationFrame(frame);
    }

    // Vertical timeline: draw down to the reading line (never undraws while scrolling back up).
    function follow() {
      if (state === 'done') return;
      const b = box.getBoundingClientRect();
      reached = Math.max(reached, vh() * READ_LINE - b.top);
      steps.forEach((s, i) => s.classList.toggle('is-on', reached >= stepY[i]));
      let active = null;
      segs.forEach((s) => {
        const k = clamp((reached - s.y0) / Math.max(1, s.y1 - s.y0));
        s.fill.style.strokeDashoffset = `${s.len * (1 - k)}`;
        if (k > 0 && k < 1) active = { s, k };
      });
      if (active) {
        const pt = active.s.fill.getPointAtLength(active.s.len * active.k);
        place(glow, pt, .55); place(head, pt, 1);
      } else { glow.style.opacity = 0; head.style.opacity = 0; }
      if (reached >= segs[segs.length - 1].y1) finish();
    }

    /* ---------- the spark that keeps travelling after it's done ---------- */
    function startAmbient() {
      if (reduce) return;
      cancelAnimationFrame(ambient);
      const total = segs.reduce((a, s) => a + s.len, 0);
      const LAP = Math.max(3200, total * 4.2), REST = 1400;
      let t0 = performance.now();
      const tick = (now) => {
        if (state !== 'done') return;
        if (!onScreen() || document.hidden) { spark.style.opacity = 0; t0 = now; ambient = requestAnimationFrame(tick); return; }
        const e = (now - t0) % (LAP + REST);
        if (e > LAP) spark.style.opacity = 0;
        else {
          let d = (e / LAP) * total, s = segs[0];
          for (const seg of segs) { if (d <= seg.len) { s = seg; break; } d -= seg.len; }
          const k = e / LAP;
          place(spark, s.fill.getPointAtLength(Math.min(d, s.len)), .9 * Math.min(1, k * 10, (1 - k) * 10));
        }
        ambient = requestAnimationFrame(tick);
      };
      ambient = requestAnimationFrame(tick);
    }

    /* ---------- where is the visitor? ---------- */
    const onScreen = () => { const r = box.getBoundingClientRect(); return r.bottom > 0 && r.top < vh(); };
    const inBand = () => { const r = box.getBoundingClientRect(), h = vh(); return r.top < h * BAND_BOTTOM && r.bottom > h * BAND_TOP; };

    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        if (state === 'done') return;
        if (vertical) { follow(); return; }
        if (state === 'armed' && inBand()) play();
        else if (state === 'playing' && !onScreen()) arm();   // left before it finished: start over next time
      });
    }

    /* ---------- start ---------- */
    layout();
    if (reduce) finish({ silent: true });
    else if (box.getBoundingClientRect().bottom < vh() * BAND_TOP) finish({ silent: true }); // page opened past it
    else { arm(); onScroll(); }

    window.addEventListener('scroll', onScroll, { passive: true });
    let pending = 0;
    new ResizeObserver(() => {
      cancelAnimationFrame(pending);
      pending = requestAnimationFrame(() => {
        const wasPlaying = state === 'playing';
        layout();
        if (wasPlaying) { arm(); onScroll(); }
        else if (state !== 'done') onScroll();
      });
    }).observe(box);
    if (document.fonts) document.fonts.ready.then(() => { layout(); onScroll(); });

    root.replay = () => { arm(); if (vertical) follow(); else if (inBand()) play(); };
  }
})();
