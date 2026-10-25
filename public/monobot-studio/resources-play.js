// "Profundiza a tu ritmo" (#recursos) on touch screens: there is no hover, so each card's illustration plays
// its hover motion while the card is in view. Only the illustration moves; the card itself stays put
// (the .is-playing class is used only by the illustration rules in resources.css).
(() => {
  const cards = document.querySelectorAll('#recursos .rx-card');
  if (!cards.length || !('IntersectionObserver' in window)) return;
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) return; // desktop keeps hover
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => e.target.classList.toggle('is-playing', e.intersectionRatio >= 0.6));
  }, { threshold: [0, 0.6, 1] });
  cards.forEach((card) => io.observe(card));
})();
