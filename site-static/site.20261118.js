(() => {
  const nav = document.querySelector('.nav');
  const menuButton = document.querySelector('.menu-toggle');
  const menu = document.querySelector('#menu');
  const queries = ['Kerala grocery near me', 'Malayalam-speaking electrician', 'Wedding photographer'];
  let queryIndex = 0;
  const query = document.querySelector('#query');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const updateScroll = () => nav?.classList.toggle('scrolled', window.scrollY > 24);
  window.addEventListener('scroll', updateScroll, { passive: true });
  updateScroll();

  menuButton?.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    menu?.classList.toggle('open', open);
  });
  menu?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
    menu.classList.remove('open');
    menuButton?.setAttribute('aria-expanded', 'false');
    menuButton?.setAttribute('aria-label', 'Open navigation');
  }));

  if (query && !reducedMotion) window.setInterval(() => {
    query.style.opacity = '0';
    window.setTimeout(() => {
      queryIndex = (queryIndex + 1) % queries.length;
      query.textContent = queries[queryIndex];
      query.style.opacity = '1';
    }, 220);
  }, 2600);

  const params = new URLSearchParams(window.location.search);
  if (params.get('signup') === 'success') {
    const status = document.querySelector('.form-status');
    if (status) status.textContent = 'Thanks for joining us. We’ll be in touch when ChodhiQ is ready.';
  }
  if (params.get('contact') === 'success') {
    const status = document.querySelector('.contact-status');
    if (status) status.textContent = 'Thanks for your message. Our team will be in touch.';
  }
})();
