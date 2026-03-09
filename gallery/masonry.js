const grid = document.querySelector('.grid');
if (grid) {
  let cards = Array.from(grid.children);

  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  cards.forEach(card => grid.appendChild(card));

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

  function layout() {
    cards.forEach(span);
  }

  cards.forEach(card => {
    const titleEl = card.querySelector('.title');
    const descEl = card.querySelector('.desc');
    const vid = card.querySelector('video');

    if (titleEl && titleEl.innerText.trim() !== '') card.classList.add('has-title');
    if (descEl && descEl.innerHTML.trim() !== '') card.classList.add('has-desc');
    if (vid) card.classList.add('has-video');

    span(card);
    const content = card.querySelector('.card-content');
    
    if ('ResizeObserver' in window && content) {
      new ResizeObserver(() => span(card)).observe(content);
    }
    
    card.querySelectorAll('img, video').forEach(media => {
      if (media.tagName.toLowerCase() === 'img') {
        if (media.complete) span(card);
        else media.addEventListener('load', () => span(card), { once: true });
      } else {
        if (media.readyState >= 1) span(card);
        else media.addEventListener('loadedmetadata', () => span(card), { once: true });
      }
    });
  });

  window.addEventListener('resize', layout);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
  if (document.readyState !== 'complete') window.addEventListener('load', layout);
}

function openLightbox(cardElement) {
  const img = cardElement.querySelector('img');
  const vid = cardElement.querySelector('video');
  const titleEl = cardElement.querySelector('.title');
  const descEl = cardElement.querySelector('.desc');

  const titleText = titleEl ? titleEl.innerText : '';
  const descText = descEl ? descEl.innerHTML : '';

  const lbImg = document.getElementById('lb-img');
  const lbVid = document.getElementById('lb-vid');

  if (vid) {
    lbVid.src = vid.src || vid.querySelector('source').src;
    lbVid.style.display = 'block';
    lbImg.style.display = 'none';
    lbVid.play();
  } else if (img) {
    lbImg.src = img.src;
    lbImg.style.display = 'block';
    lbVid.style.display = 'none';
    lbVid.pause();
  }

  const lbTitle = document.getElementById('lb-title');
  const lbDesc = document.getElementById('lb-desc');
  const lbTextContainer = document.getElementById('lb-text-container');

  lbTitle.innerText = titleText;
  lbDesc.innerHTML = descText;

  if (!titleText && !descText) {
    lbTextContainer.style.display = 'none';
  } else {
    lbTextContainer.style.display = 'block';
    lbTitle.style.display = titleText ? 'block' : 'none';
    lbDesc.style.display = descText ? 'block' : 'none';
  }

  document.getElementById('lightbox').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  document.getElementById('lightbox').classList.remove('active');
  document.body.style.overflow = 'auto';
  document.getElementById('lb-vid').pause();
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeLightbox();
});