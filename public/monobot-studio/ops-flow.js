// Servicios · "Conectar no es lo mismo que operar": plays the without-flow / with-flow demo.
// Without a flow the conversation stops after the answer; with a flow the work keeps moving across
// the apps, one step at a time, along the rail. Plays while on screen, loops, and respects reduced motion.
(() => {
  const demo = document.querySelector('[data-flow-demo]');
  if (!demo) return;
  const without = [...demo.querySelectorAll('.fd-without .fd-step, .fd-without .fd-end')];
  const withSteps = [...demo.querySelectorAll('.fd-with .fd-step')];
  const lane = demo.querySelector('.fd-with'), rail = demo.querySelector('.fd-rail'), bar = rail.querySelector('i');
  const sum = demo.querySelector('.fd-sum');
  const STEP = 1050, HOLD = 3200;
  let timers = [], running = false;

  // the rail runs from the first icon's centre to the last one's
  function placeRail() {
    const icons = withSteps.map((s) => s.querySelector('.fd-ic'));
    const box = lane.getBoundingClientRect(), a = icons[0].getBoundingClientRect(), b = icons[icons.length - 1].getBoundingClientRect();
    if (Math.abs(a.top - b.top) > 4) { rail.style.display = 'none'; return; }   // steps wrap (phones): no rail
    rail.style.display = '';
    rail.style.left = `${a.left - box.left + a.width / 2}px`;
    rail.style.width = `${b.left - a.left}px`;
    rail.style.right = 'auto';
    rail.style.top = `${a.top - box.top + a.height / 2 - 1}px`;
  }

  const at = (ms, fn) => timers.push(setTimeout(fn, ms));
  function reset() {
    timers.forEach(clearTimeout); timers = [];
    [...without, ...withSteps].forEach((el) => el.classList.remove('on', 'now'));
    sum.classList.remove('on'); bar.style.setProperty('--p', 0);
  }
  function play() {
    reset();
    withSteps.forEach((el, k) => at(300 + k * STEP, () => {
      withSteps.forEach((s) => s.classList.remove('now'));
      el.classList.add('on', 'now');
      bar.style.setProperty('--p', k / (withSteps.length - 1));
      if (without[k]) without[k].classList.add('on');               // the no-flow lane stops after its answer
    }));
    const end = 300 + (withSteps.length - 1) * STEP;
    at(end + 500, () => { withSteps.forEach((s) => s.classList.remove('now')); sum.classList.add('on'); });
    at(end + 500 + HOLD, () => { if (running) play(); });
  }

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    [...without, ...withSteps].forEach((el) => el.classList.add('on')); sum.classList.add('on'); bar.style.setProperty('--p', 1);
    placeRail(); addEventListener('resize', placeRail); return;
  }
  placeRail(); addEventListener('resize', placeRail);
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !running) { running = true; placeRail(); play(); }
    else if (!e.isIntersecting && running) { running = false; reset(); }
  }, { threshold: 0.35 }).observe(demo);
})();
