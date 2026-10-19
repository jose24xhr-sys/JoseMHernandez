/*
 * "Así trabajamos" connector animation for the Monobot Studio homepage (section #proceso).
 * When the section scrolls into view, a line draws from step to step; each step lights up as the
 * line reaches it, then the arrow appears, the button glows, and a small spark keeps travelling the line.
 * The line is measured from the real layout, so it follows the 4-column row on desktop and the
 * vertical timeline on smaller screens. Call  section.replay()  to play it again.
 */
(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const DRAW = 850;    // ms to draw one connector
  const HOLD = 380;    // pause on each step before moving on
  const TAIL = 600;    // ms for the final arrow
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.querySelectorAll('[data-process]').forEach(setup);

  function setup(root) {
    const box = root.querySelector('.psteps');
    const steps = [...box.querySelectorAll('.pstep')];
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'pwire');
    svg.setAttribute('aria-hidden', 'true');
    box.prepend(svg);

    let segs = [];        // {base, fill, len}
    let arrow, glow, head, spark;
    let state = 'idle';   // idle | playing | done
    let raf = 0, ambient = 0, visible = false;

    function el(tag, attrs, parent = svg) {
      const n = document.createElementNS(NS, tag);
      for (const k in attrs) n.setAttribute(k, attrs[k]);
      parent.appendChild(n);
      return n;
    }

    function layout() {
      const b = box.getBoundingClientRect();
      svg.setAttribute('viewBox', `0 0 ${b.width} ${b.height}`);
      svg.innerHTML = '';
      const defs = el('defs', {});
      const g = el('linearGradient', { id: 'pwGrad', gradientUnits: 'userSpaceOnUse', x1: 0, y1: 0, x2: b.width, y2: b.height }, defs);
      el('stop', { offset: 0, 'stop-color': '#ff9a55' }, g);
      el('stop', { offset: 1, 'stop-color': '#f25a0f' }, g);

      const vertical = getComputedStyle(root).getPropertyValue('--flow').trim() === 'vertical';
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
          ds.push(`M${sx},${sy} C${sx + w * .25},${sy} ${mx - w * .2},${my} ${mx},${my} S${ex - w * .25},${ey} ${ex},${ey}`);
        } else {
          const sx = a.tile.cx - 5, sy = a.tile.y + a.tile.h + 16, ex = z.tile.cx - 5, ey = z.tile.y - 8;
          const h = ey - sy, my = (sy + ey) / 2, mx = sx + 14;
          ds.push(`M${sx},${sy} C${sx},${sy + h * .25} ${mx},${my - h * .2} ${mx},${my} S${ex},${ey - h * .25} ${ex},${ey}`);
        }
      }
      // tail with arrow
      const last = pts[pts.length - 1];
      let tailD, arrowD;
      if (!vertical) {
        const sx = last.dot.cx + 8, sy = last.dot.cy, ex = b.width - 6, ey = sy - 6;
        const w = ex - sx;
        tailD = `M${sx},${sy} C${sx + w * .45},${sy + 6} ${ex - w * .35},${ey} ${ex},${ey}`;
        arrowD = `M${ex - 9},${ey - 7} L${ex},${ey} L${ex - 9},${ey + 7}`;
      } else {
        const sx = last.tile.cx - 5, sy = last.tile.y + last.tile.h + 16, ex = sx, ey = Math.min(b.height + 26, sy + 64);
        tailD = `M${sx},${sy} C${sx},${sy + 20} ${sx + 8},${ey - 24} ${ex},${ey}`;
        arrowD = `M${ex - 7},${ey - 9} L${ex},${ey} L${ex + 7},${ey - 9}`;
      }
      ds.push(tailD);

      segs = ds.map((d) => {
        const base = el('path', { class: 'base', d });
        const fill = el('path', { class: 'fill', d });
        const len = fill.getTotalLength();
        fill.style.strokeDasharray = `${len}`;
        return { base, fill, len };
      });
      arrow = el('path', { class: 'arrow', d: arrowD });
      glow = el('circle', { class: 'glow', r: 9 });
      head = el('circle', { class: 'head', r: 4.5 });
      spark = el('circle', { class: 'spark', r: 3.2 });
      paint(state === 'done' || state === 'idle' ? 1 : null);
    }

    // draw every segment fully (p = 1) or hide them all (p = 0)
    function paint(p) {
      if (p == null) return;
      segs.forEach((s) => (s.fill.style.strokeDashoffset = `${s.len * (1 - p)}`));
      arrow.style.opacity = p;
      arrow.style.transform = 'none';
    }

    const ease = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const place = (c, pt, o) => { c.setAttribute('cx', pt.x); c.setAttribute('cy', pt.y); c.style.opacity = o; };

    function play() {
      cancelAnimationFrame(raf); cancelAnimationFrame(ambient);
      if (reduce) { root.classList.remove('is-armed'); steps.forEach((s) => s.classList.add('is-on')); state = 'done'; paint(1); return; }
      root.classList.remove('is-done');
      root.classList.add('is-armed');
      steps.forEach((s) => s.classList.remove('is-on'));
      void root.offsetWidth;
      state = 'playing';
      paint(0);

      // build the schedule
      const plan = []; let t = 0;
      plan.push({ type: 'on', i: 0, at: 0 });
      t = 320;
      segs.forEach((s, i) => {
        const isTail = i === segs.length - 1;
        const dur = isTail ? TAIL : DRAW;
        plan.push({ type: 'seg', i, start: t, dur });
        t += dur;
        if (!isTail) { plan.push({ type: 'on', i: i + 1, at: t }); t += HOLD; }
      });
      const end = t;
      const t0 = performance.now();

      const frame = (now) => {
        const e = now - t0;
        let active = null;
        for (const p of plan) {
          if (p.type === 'on') { if (e >= p.at) steps[p.i].classList.add('is-on'); continue; }
          const s = segs[p.i];
          const k = Math.min(1, Math.max(0, (e - p.start) / p.dur));
          const q = ease(k);
          s.fill.style.strokeDashoffset = `${s.len * (1 - q)}`;
          if (k > 0 && k < 1) active = { s, q };
        }
        if (active) {
          const pt = active.s.fill.getPointAtLength(active.s.len * active.q);
          place(glow, pt, .55); place(head, pt, 1);
        } else { glow.style.opacity = 0; head.style.opacity = 0; }
        arrow.style.opacity = e >= end ? 1 : 0;
        if (e < end) raf = requestAnimationFrame(frame);
        else { state = 'done'; root.classList.add('is-done'); glow.style.opacity = 0; head.style.opacity = 0; startAmbient(); }
      };
      raf = requestAnimationFrame(frame);
    }

    // a small spark keeps travelling the whole line after the intro
    function startAmbient() {
      if (reduce) return;
      cancelAnimationFrame(ambient);
      const total = segs.reduce((a, s) => a + s.len, 0);
      const LAP = Math.max(3200, total * 4.2), REST = 1400;
      let t0 = performance.now();
      const tick = (now) => {
        if (state !== 'done') return;
        if (!visible || document.hidden) { spark.style.opacity = 0; t0 = now; ambient = requestAnimationFrame(tick); return; }
        const e = (now - t0) % (LAP + REST);
        if (e > LAP) { spark.style.opacity = 0; }
        else {
          let d = (e / LAP) * total;
          let s = segs[0];
          for (const seg of segs) { if (d <= seg.len) { s = seg; break; } d -= seg.len; }
          const pt = s.fill.getPointAtLength(Math.min(d, s.len));
          const k = e / LAP, fade = Math.min(1, k * 10, (1 - k) * 10);
          place(spark, pt, .9 * fade);
        }
        ambient = requestAnimationFrame(tick);
      };
      ambient = requestAnimationFrame(tick);
    }

    // keep the line glued to the layout
    let pending = 0;
    new ResizeObserver(() => { cancelAnimationFrame(pending); pending = requestAnimationFrame(() => {
      const wasPlaying = state === 'playing';
      layout();
      if (wasPlaying) play();
    }); }).observe(box);
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(layout);
    layout();

    // play the first time the section is mostly in view
    let played = false;
    new IntersectionObserver((entries) => {
      for (const en of entries) {
        visible = en.isIntersecting;
        if (en.intersectionRatio >= .35 && !played) { played = true; play(); }
      }
    }, { threshold: [0, .35] }).observe(root);

    root.replay = play;
  }
})();
