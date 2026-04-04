// ─── Parts Catalog ──────────────────────────────────────────────────────────

const grid = document.getElementById('partsGrid');
const empty = document.getElementById('partsEmpty');
const selModel = document.getElementById('filterModel');
const btnReset = document.getElementById('resetFilters');

async function loadModels() {
  try {
    const res = await fetch('/api/models');
    const models = await res.json();

    for (const model of models) {
      const opt = document.createElement('option');
      opt.value = model;
      opt.textContent = model;
      selModel.appendChild(opt);
    }
  } catch (e) {
    console.error('Greška pri učitavanju modela:', e);
  }
}

async function loadParts() {
  const model = selModel.value;

  const params = new URLSearchParams();
  if (model !== 'sve') params.set('model', model);

  grid.innerHTML = '<div class="parts-loading">Učitavanje...</div>';
  empty.style.display = 'none';

  try {
    const res = await fetch('/api/parts?' + params.toString());
    const parts = await res.json();

    grid.innerHTML = '';

    if (!parts.length) {
      empty.style.display = 'block';
      return;
    }

    for (const part of parts) {
      grid.appendChild(renderPartCard(part));
    }
  } catch (e) {
    grid.innerHTML = '<div class="parts-loading">Greška pri učitavanju delova.</div>';
  }
}

function renderPartCard(part) {
  const card = document.createElement('div');
  card.className = 'part-card';

  const imgSrc = part.slika || '/placeholder-part.jpg';
  const imgHtml = `<img src="${escHtml(imgSrc)}" alt="${escHtml(part.naziv)}" style="width:100%;height:100%;object-fit:cover;">`;

  const cenaHtml = part.cena
    ? `<span class="part-card-cena">${escHtml(part.cena)}</span>`
    : `<span class="part-card-cena-empty">Cena na upit</span>`;

  card.innerHTML = `
    <div class="part-card-img">${imgHtml}</div>
    <div class="part-card-body">
      <div class="part-card-tags">
        <span class="tag tag-marka">${escHtml(part.marka)}</span>
        <span class="tag tag-model">${escHtml(part.model)}</span>
      </div>
      <div class="part-card-name">${escHtml(part.naziv)}</div>
      ${part.opis ? `<div class="part-card-opis">${escHtml(part.opis)}</div>` : ''}
      <div class="part-card-footer">
        ${cenaHtml}
        <a href="tel:+381600000000" class="part-card-contact">Pozovi</a>
      </div>
    </div>
  `;
  return card;
}

function escHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

selModel.addEventListener('change', loadParts);

btnReset.addEventListener('click', () => {
  selModel.value = 'sve';
  loadParts();
});

// ─── Mobile nav ─────────────────────────────────────────────────────────────

const navToggle = document.getElementById('navToggle');
navToggle && navToggle.addEventListener('click', () => {
  const nav = document.querySelector('.main-nav');
  const phone = document.querySelector('.header-phone');
  if (!nav) return;
  const open = nav.style.display === 'flex';
  nav.style.cssText = open
    ? ''
    : 'display:flex;flex-direction:column;position:absolute;top:68px;left:0;right:0;background:#111;border-bottom:1px solid #333;padding:16px 24px;gap:4px;z-index:99';
  if (phone) phone.style.display = open ? '' : 'none';
});

// ─── Init ────────────────────────────────────────────────────────────────────

(async () => {
  await loadModels();
  await loadParts();
})();
