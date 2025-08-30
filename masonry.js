const grid = document.querySelector('.grid');
if (grid) {
  const cards = Array.from(grid.children);
  const styles = getComputedStyle(grid);
  const row = parseFloat(styles.getPropertyValue('grid-auto-rows')) || 6;
  const gap = parseFloat(styles.getPropertyValue('row-gap') || styles.getPropertyValue('grid-row-gap')) || 16;

  function span(card) {
    const content = card.querySelector('.card-content');
    if (!content) return;
    const h = content.getBoundingClientRect().height;
    const spanRows = Math.ceil((h + gap) / (row + gap));
    card.style.gridRowEnd = `span ${spanRows}`;
  }

  function layout() { cards.forEach(span); }

  cards.forEach(card => {
    span(card);
    const content = card.querySelector('.card-content');
    if ('ResizeObserver' in window && content) {
      new ResizeObserver(() => span(card)).observe(content);
    }
    card.querySelectorAll('img').forEach(img => {
      if (img.complete) span(card);
      else img.addEventListener('load', () => span(card), { once: true });
    });
  });

  window.addEventListener('resize', layout);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
  if (document.readyState !== 'complete') window.addEventListener('load', layout);
}
