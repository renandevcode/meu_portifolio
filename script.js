(() => {
  'use strict';
  /* Lightweight enhancements; primary content works without JavaScript. */
  const nav = document.getElementById('nav');
  if (nav) {
    const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // Native details remains the fallback. Animate only the panel so the title
  // stays anchored; interrupted clicks reverse from the current visible height.
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const projectControllers = new Map();
  document.querySelectorAll('details.project').forEach(project => {
    const summary = project.querySelector('summary');
    const panel = project.querySelector('.project-panel');
    if (!panel || typeof panel.animate !== 'function') return;
    let animation = null;
    let expanded = project.open;
    panel.inert = !expanded;
    project.dataset.expanded = String(expanded);

    function setExpanded(next) {
      if (!animation && next === expanded && project.open === next) return;
      const startHeight = project.open ? panel.getBoundingClientRect().height : 0;
      const startOpacity = project.open ? getComputedStyle(panel).opacity : '0';
      if (animation) { animation.cancel(); animation = null; }
      expanded = next;
      panel.inert = !next;
      project.dataset.expanded = String(next);
      if (reducedMotion.matches) {
        project.open = next;
        return;
      }
      project.open = true;
      const endHeight = next ? panel.scrollHeight : 0;
      const current = panel.animate([
        { height: `${startHeight}px`, opacity: startOpacity },
        { height: `${endHeight}px`, opacity: next ? '1' : '0' }
      ], { duration: 320, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
      animation = current;
      current.onfinish = () => {
        if (animation !== current) return;
        project.open = next;
        animation = null;
      };
    }

    summary.addEventListener('click', event => {
      event.preventDefault();
      setExpanded(!expanded);
    });
    reducedMotion.addEventListener('change', () => setExpanded(expanded));
    project.addEventListener('toggle', () => {
      if (animation) return;
      expanded = project.open;
      panel.inert = !expanded;
      project.dataset.expanded = String(expanded);
    });
    projectControllers.set(project.id, setExpanded);
  });

  function revealLinkedProject() {
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    const target = document.getElementById(id);
    if (!target?.matches('details.project')) return;
    const expand = projectControllers.get(id);
    if (expand) expand(true);
    else target.open = true;
  }
  revealLinkedProject();
  window.addEventListener('hashchange', revealLinkedProject);

  const copyButton = document.querySelector('[data-copy-email]');
  if (copyButton) {
    copyButton.addEventListener('click', async () => {
      const status = document.getElementById('copy-status');
      try {
        await navigator.clipboard.writeText(copyButton.dataset.copyEmail);
        status.textContent = 'Email copiado. Pronto para colar.';
      } catch {
        status.textContent = 'Não foi possível copiar. Selecione o endereço acima ou clique em Email.';
      }
    });
  }

})();
