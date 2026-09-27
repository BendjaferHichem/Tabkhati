// public/js/discover.js
// صفحة "تصفح وصفات جديدة": بطاقة مميزة تدور تلقائياً بين كل الوصفات + شبكة
// كاملة قابلة للتصفية والخلط. يعتمد على js/common.js للنافذة ووضع الطبخ.

const AUTOPLAY_MS = 6000;

let allRecipes = [];
let featuredQueue = [];
let featuredIndex = 0;
let autoplayTimer = null;
let categoryFilter = '';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ===================== البطاقة المميزة (تدور تلقائياً) =====================

function renderFeatured() {
  const r = featuredQueue[featuredIndex];
  if (!r) return;
  $('#featuredHero').outerHTML = `<div class="featured-card__hero" id="featuredHero">${heroHtml(r.id, r.imageEmoji, '', r.imageUrl)}</div>`;
  $('#featuredName').textContent = r.arabicName;
  $('#featuredDesc').textContent = r.description;
  $('#featuredMeta').innerHTML = `
    <span class="badge badge-diff">⏱️ ${r.totalTime} دقيقة</span>
    <span class="badge badge-diff">🟢 ${r.difficulty}</span>
    <span class="badge badge-diff">💰 ${r.estimatedCost}</span>
  `;
  const favBtn = $('#featuredFavBtn');
  favBtn.dataset.favId = r.id;
  const fav = isFavorite(r.id);
  favBtn.classList.toggle('active', fav);
  favBtn.textContent = fav ? '♥' : '♡';
  favBtn.onclick = () => toggleFavorite(r.id);
  $('#featuredViewBtn').onclick = () => openDetailById(r.id);
  restartAutoplayBar();
}

function restartAutoplayBar() {
  const hero = $('#featuredHero');
  hero.style.setProperty('--autoplay-ms', `${AUTOPLAY_MS}ms`);
  hero.classList.remove('autoplay-bar');
  void hero.offsetWidth; // إعادة تشغيل الأنيميشن
  hero.classList.add('autoplay-bar');
}

function advanceFeatured(step) {
  featuredIndex = (featuredIndex + step + featuredQueue.length) % featuredQueue.length;
  renderFeatured();
  resetAutoplayTimer();
}

function resetAutoplayTimer() {
  clearInterval(autoplayTimer);
  autoplayTimer = setInterval(() => advanceFeatured(1), AUTOPLAY_MS);
}

function pauseAutoplay() {
  clearInterval(autoplayTimer);
  $('#featuredHero')?.classList.remove('autoplay-bar');
}

function initFeatured() {
  featuredQueue = shuffle(allRecipes);
  featuredIndex = 0;
  renderFeatured();
  resetAutoplayTimer();

  const card = $('#featuredCard');
  card.addEventListener('mouseenter', pauseAutoplay);
  card.addEventListener('mouseleave', resetAutoplayTimer);
  card.addEventListener('touchstart', pauseAutoplay, { passive: true });

  $('#featuredPrev').addEventListener('click', () => advanceFeatured(-1));
  $('#featuredNext').addEventListener('click', () => advanceFeatured(1));
}

// ===================== الشبكة القابلة للتصفح =====================

function discoverCardHtml(r) {
  const isFav = isFavorite(r.id);
  return `<article class="recipe-card" data-recipe-id="${r.id}">
    ${heroHtml(r.id, r.imageEmoji, '', r.imageUrl)}
    <div class="recipe-card__body">
      <div class="recipe-card__title">${r.arabicName}</div>
      <div class="recipe-card__meta">
        <span class="badge badge-diff">⏱️ ${r.totalTime} دقيقة</span>
        <span class="badge badge-diff">🟢 ${r.difficulty}</span>
        <span class="badge badge-diff">💰 ${r.estimatedCost}</span>
      </div>
      <p style="margin-top:10px; font-size:0.88rem; color:var(--color-ink-soft);">${r.description}</p>
      <div class="recipe-card__actions">
        <button class="btn btn-primary" data-view-id="${r.id}">عرض الوصفة</button>
        <button class="icon-btn fav ${isFav ? 'active' : ''}" data-fav-id="${r.id}" aria-label="حفظ في المفضلة">${isFav ? '♥' : '♡'}</button>
      </div>
    </div>
  </article>`;
}

let gridOrder = [];

function renderGrid() {
  const filtered = categoryFilter ? gridOrder.filter((r) => r.category === categoryFilter) : gridOrder;
  const grid = $('#discoverGrid');
  if (filtered.length === 0) {
    grid.innerHTML = `<div class="empty-state"><div class="emoji">🍽️</div><h3>لا توجد وصفات في هذا القسم بعد</h3></div>`;
    return;
  }
  grid.innerHTML = filtered.map(discoverCardHtml).join('');
  $$('[data-view-id]', grid).forEach((btn) => btn.addEventListener('click', () => openDetailById(Number(btn.dataset.viewId))));
  $$('[data-fav-id]', grid).forEach((btn) => btn.addEventListener('click', () => toggleFavorite(Number(btn.dataset.favId))));
}

$('#shuffleBtn').addEventListener('click', () => {
  gridOrder = shuffle(allRecipes);
  renderGrid();
  showToast('تم خلط الوصفات 🔀');
});

$$('#categoryFilters .tag-toggle').forEach((btn) => {
  btn.addEventListener('click', () => {
    $$('#categoryFilters .tag-toggle').forEach((b) => b.classList.remove('selected'));
    btn.classList.add('selected');
    categoryFilter = btn.dataset.cat;
    renderGrid();
  });
});

// ===================== بدء التشغيل =====================

(async function init() {
  try {
    const { recipes } = await api('/api/recipes');
    allRecipes = recipes;
    gridOrder = shuffle(allRecipes);
    initFeatured();
    renderGrid();
  } catch (err) {
    console.error(err);
    showToast('تعذّر تحميل الوصفات، تحقق من الاتصال.');
  }
})();
