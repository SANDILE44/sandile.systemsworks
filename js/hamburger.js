// js/hamburger.js
document.addEventListener('DOMContentLoaded', () => {
  const hamburger = document.getElementById('hamburger');
  const sidebar = document.querySelector('.sidebar');

  if (!hamburger || !sidebar) {
    console.warn('Hamburger or sidebar not found');
    return;
  }

  const setMenuOpen = (isOpen) => {
    sidebar.classList.toggle('mobile-open', isOpen);
    hamburger.classList.toggle('is-open', isOpen);
    hamburger.setAttribute('aria-expanded', String(isOpen));
    hamburger.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
  };

  sidebar.id = sidebar.id || 'app-sidebar';
  hamburger.setAttribute('aria-controls', sidebar.id);
  hamburger.setAttribute('aria-expanded', 'false');

  hamburger.addEventListener('click', (e) => {
    e.stopPropagation();
    setMenuOpen(!sidebar.classList.contains('mobile-open'));
  });

  sidebar.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => setMenuOpen(false));
  });

  document.addEventListener('click', (e) => {
    if (
      sidebar.classList.contains('mobile-open') &&
      !sidebar.contains(e.target) &&
      !hamburger.contains(e.target)
    ) {
      setMenuOpen(false);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidebar.classList.contains('mobile-open')) {
      setMenuOpen(false);
      hamburger.focus();
    }
  });
});
