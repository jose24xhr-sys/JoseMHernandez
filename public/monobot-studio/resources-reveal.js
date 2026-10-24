/*
 * "Profundiza a tu ritmo" (#recursos) — on phones the cards stay in place while scrolling; each card's
 * illustration plays once when about half of the card is on screen, like the service cards
 * (see the .rx-reveal rules at the end of resources.css).
 * Desktop and tablets keep the hover motion; reduced-motion visitors see the illustrations at rest.
 */
(() => {
  const section = document.getElementById('recursos');
  if (!section || !('IntersectionObserver' in window)) return;
  if (!matchMedia('(max-width: 699px)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const cards = [...section.querySelectorAll('.rx-card')];
  section.classList.add('rx-reveal');
  // Cards already above the screen (page opened further down) are shown straight away.
  cards.forEach((card) => { if (card.getBoundingClientRect().bottom < 0) card.classList.add('is-in'); });

  const seen = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting || entry.intersectionRatio < 0.45) return;
      entry.target.classList.add('is-in');
      seen.unobserve(entry.target);
    });
  }, { threshold: [0, 0.45] });
  cards.forEach((card) => { if (!card.classList.contains('is-in')) seen.observe(card); });
})();
