/*
 * "Profundiza a tu ritmo" (#recursos) — on phones, each card slides in as it reaches the lower part of the
 * screen and then plays its illustration once (see the .rx-reveal rules at the end of resources.css).
 * Desktop and tablets keep the hover motion; reduced-motion visitors see the cards as they are.
 */
(() => {
  const section = document.getElementById('recursos');
  if (!section || !('IntersectionObserver' in window)) return;
  if (!matchMedia('(max-width: 699px)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const cards = [...section.querySelectorAll('.rx-card')];
  const vh = () => (window.visualViewport && window.visualViewport.height) || window.innerHeight;
  section.classList.add('rx-reveal');
  // Cards already above the screen (page opened further down) are shown straight away.
  cards.forEach((card) => { if (card.getBoundingClientRect().bottom < 0) card.classList.add('is-in'); });

  const seen = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      // Wait until the card's top is in the lower ~80% of the screen, so it is really being looked at.
      if (entry.boundingClientRect.top > vh() * 0.82) return;
      entry.target.classList.add('is-in');
      seen.unobserve(entry.target);
    });
  }, { threshold: [0, 0.15, 0.3], rootMargin: '0px 0px -18% 0px' });
  cards.forEach((card) => { if (!card.classList.contains('is-in')) seen.observe(card); });
})();
