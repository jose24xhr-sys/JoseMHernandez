/*
 * <robo-peek> — Routemize robot icon that wakes up when the cursor gets close.
 *
 *   Load this file once with a script tag, then place the element:
 *   <robo-peek range="120" style="width:72px"></robo-peek>
 *
 * Attributes
 *   range   distance in px from the icon's edge that wakes it (default 120)
 *   label   accessible name (default "Routemize assistant")
 * CSS custom properties (set on the element)
 *   --robo-bg, --robo-line, --robo-accent
 *
 * Asleep: happy closed eyes. Cursor approaches: it leans in a little.
 * Inside range: it pops up, opens its eyes, eyes follow the cursor and blink.
 * Touch: tapping wakes it for a few seconds.
 */
(() => {
  if (customElements.get('robo-peek')) return;

  const TEMPLATE = `
<style>
  :host { display: inline-block; width: 96px; aspect-ratio: 1; position: relative;
          --robo-bg: #0b0b0b; --robo-line: #ffffff; --robo-accent: #ff6200;
          -webkit-tap-highlight-color: transparent; }
  :host(:focus-visible) { outline: 2px solid var(--robo-accent); outline-offset: 4px; border-radius: 50%; }
  .pop  { width: 100%; height: 100%; transform-origin: 50% 80%;
          transition: transform .5s cubic-bezier(.3,1.7,.5,1); }
  .lean { width: 100%; height: 100%;
          transform: scale(calc(1 + var(--near, 0) * .05));
          transition: transform .25s ease-out; }
  svg { display: block; width: 100%; height: 100%; overflow: visible; }
  .bg { fill: var(--robo-bg); transition: filter .4s; }
  .line { fill: none; stroke: var(--robo-line); }
  .accent { fill: var(--robo-accent); }

  /* eyes */
  .closed { fill: none; stroke: var(--robo-accent); stroke-width: 34; stroke-linecap: round;
            transform-box: fill-box; transform-origin: 50% 100%;
            transition: transform .18s ease-in, opacity .12s ease-in; }
  .look   { transition: transform .18s ease-out; transform: translate(var(--lx, 0px), var(--ly, 0px)); }
  .open   { transform-box: fill-box; transform-origin: 50% 50%; transform: scaleY(.08); opacity: 0;
            transition: transform .16s ease-in, opacity .1s ease-in; }
  .lid    { transform-box: fill-box; transform-origin: 50% 50%; transition: transform .07s ease-in-out; }
  .open .eye { fill: var(--robo-accent); }

  .antenna { transform-box: view-box; transform-origin: 626px 460px; }
  .ear-l, .ear-r { transform-box: fill-box; transition: transform .35s cubic-bezier(.3,1.7,.5,1); }
  .ear-l { transform-origin: 100% 50%; } .ear-r { transform-origin: 0% 50%; }

  /* awake */
  :host([awake]) .pop { transform: translateY(-7%) scale(1.14); }
  :host([awake]) .bg  { filter: drop-shadow(0 0 22px color-mix(in srgb, var(--robo-accent) 55%, transparent)); }
  :host([awake]) .closed { transform: scaleY(0); opacity: 0; }
  :host([awake]) .open { transform: scaleY(1); opacity: 1;
                         transition: transform .32s cubic-bezier(.3,1.8,.5,1) .08s, opacity .1s .08s; }
  :host([awake]) .ear-l { transform: translateX(-10px) scaleY(1.06); }
  :host([awake]) .ear-r { transform: translateX(10px) scaleY(1.06); }
  :host([awake]) .antenna { animation: boing .7s cubic-bezier(.3,1.4,.5,1) .05s; }
  :host([blink]) .lid { transform: scaleY(.1); }

  @keyframes boing {
    0% { transform: rotate(0); } 25% { transform: rotate(-14deg); }
    50% { transform: rotate(9deg); } 75% { transform: rotate(-4deg); } 100% { transform: rotate(0); }
  }
  @media (prefers-reduced-motion: reduce) {
    .pop, .lean, .closed, .open, .look, .lid, .ear-l, .ear-r { transition: none !important; }
    :host([awake]) .pop { transform: none; }
    :host([awake]) .antenna { animation: none; }
  }
</style>
<div class="pop" part="pop"><div class="lean">
<svg viewBox="0 0 1254 1254" aria-hidden="true">
  <circle class="bg" cx="627" cy="627" r="586"/>
  <g class="antenna">
    <rect x="605" y="392" width="43" height="72" fill="var(--robo-line)"/>
    <circle class="accent" cx="626" cy="328" r="71"/>
  </g>
  <path class="accent ear-l" d="M305 588H285a50 50 0 0 0-50 50v104a50 50 0 0 0 50 50h20z"/>
  <path class="accent ear-r" d="M945 588h20a50 50 0 0 1 50 50v104a50 50 0 0 1-50 50h-20z"/>
  <rect class="line" x="347" y="494" width="558" height="395" rx="155" stroke-width="58"/>

  <path class="closed" d="M451 735a58 53 0 0 1 116 0"/>
  <path class="closed" d="M683 735a58 53 0 0 1 116 0"/>
  <g class="look">
    <g class="open"><g class="lid">
      <circle class="eye" cx="509" cy="712" r="46"/>
    </g></g>
    <g class="open"><g class="lid">
      <circle class="eye" cx="741" cy="712" r="46"/>
    </g></g>
  </g>
</svg>
</div></div>`;

  class RoboPeek extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' }).innerHTML = TEMPLATE;
      this._move = this._move.bind(this);
      this._leave = this._leave.bind(this);
      this._tap = this._tap.bind(this);
      this._sleepTimer = 0; this._blinkTimer = 0; this._tapTimer = 0;
    }
    get range() { return Number(this.getAttribute('range')) || 120; }

    connectedCallback() {
      if (!this.hasAttribute('role')) this.setAttribute('role', 'img');
      this.setAttribute('aria-label', this.getAttribute('label') || 'Asistente de Monobot');
      window.addEventListener('pointermove', this._move, { passive: true });
      document.documentElement.addEventListener('pointerleave', this._leave);
      this.addEventListener('pointerdown', this._tap);
      this.addEventListener('focus', () => this._wake());
      this.addEventListener('blur', () => this._sleep());
    }
    disconnectedCallback() {
      window.removeEventListener('pointermove', this._move);
      document.documentElement.removeEventListener('pointerleave', this._leave);
      clearTimeout(this._sleepTimer); clearTimeout(this._blinkTimer); clearTimeout(this._tapTimer);
    }

    _move(e) {
      if (e.pointerType === 'touch') return;
      const r = this.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const dx = e.clientX - cx, dy = e.clientY - cy;
      const dist = Math.max(0, Math.hypot(dx, dy) - r.width / 2);   // px from the icon's edge
      const range = this.range;

      // gentle lean-in before it wakes
      const near = Math.max(0, Math.min(1, 1 - dist / (range * 2.5)));
      this.style.setProperty('--near', near.toFixed(3));

      // eyes follow the cursor
      const len = Math.hypot(dx, dy) || 1, k = Math.min(1, len / 200);
      this.style.setProperty('--lx', (dx / len * 18 * k).toFixed(1) + 'px');
      this.style.setProperty('--ly', (dy / len * 12 * k).toFixed(1) + 'px');

      if (dist < range) this._wake();
      else if (dist > range * 1.35) this._sleep(250);   // a little hysteresis so it doesn't flicker
    }
    _leave() { this.style.setProperty('--near', 0); this._sleep(150); }
    _tap() {
      this.style.setProperty('--lx', '0px'); this.style.setProperty('--ly', '0px');
      this._wake();
      clearTimeout(this._tapTimer);
      this._tapTimer = setTimeout(() => this._sleep(), 2600);
    }

    _wake() {
      clearTimeout(this._sleepTimer);
      if (this.hasAttribute('awake')) return;
      this.setAttribute('awake', '');
      this.dispatchEvent(new CustomEvent('robo-wake', { bubbles: true }));
      this._scheduleBlink(1400);
    }
    _sleep(delay = 0) {
      if (!this.hasAttribute('awake')) return;
      clearTimeout(this._sleepTimer);
      this._sleepTimer = setTimeout(() => {
        this.removeAttribute('awake'); this.removeAttribute('blink');
        clearTimeout(this._blinkTimer);
        this.dispatchEvent(new CustomEvent('robo-sleep', { bubbles: true }));
      }, delay);
    }
    _scheduleBlink(wait = 2500 + Math.random() * 2500) {
      clearTimeout(this._blinkTimer);
      this._blinkTimer = setTimeout(() => {
        if (!this.hasAttribute('awake')) return;
        this.setAttribute('blink', '');
        setTimeout(() => this.removeAttribute('blink'), 130);
        this._scheduleBlink();
      }, wait);
    }
  }
  customElements.define('robo-peek', RoboPeek);
})();
