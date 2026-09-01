// ─── FLAG SELECTOR ───
const flagSelect = document.getElementById('flagSelect');
const flagBtn = document.getElementById('flagSelectBtn');

flagBtn.addEventListener('click', () => {
  const isOpen = flagSelect.classList.toggle('open');
  flagBtn.setAttribute('aria-expanded', isOpen);
});
document.addEventListener('click', (e) => {
  if (!flagSelect.contains(e.target)) {
    flagSelect.classList.remove('open');
    flagBtn.setAttribute('aria-expanded', 'false');
  }
});

// ─── SCROLL REVEAL ───
const observer = new IntersectionObserver(
  (entries) => entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      observer.unobserve(e.target);
    }
  }),
  { threshold: 0.12 }
);

document.querySelectorAll('.reveal').forEach((el, i) => {
  el.style.transitionDelay = (i % 3) * 0.08 + 's';
  observer.observe(el);
});
