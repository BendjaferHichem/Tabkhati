// public/js/favorites.js

function favoriteCardHtml(r) {
  return `<article class="recipe-card" data-recipe-id="${r.id}">
    ${heroHtml(r.id, r.imageEmoji, '', r.imageUrl)}
    <div class="recipe-card__body">
      <div class="recipe-card__title">${r.arabicName}</div>
      <div class="recipe-card__meta">
        <span class="badge badge-diff">⏱️ ${r.totalTime} دقيقة</span>
        <span class="badge badge-diff">🟢 ${r.difficulty}</span>
      </div>
      <div class="recipe-card__actions">
        <button class="btn btn-primary" data-view-id="${r.id}">عرض الوصفة</button>
        <button class="icon-btn fav active" data-fav-id="${r.id}" aria-label="إزالة من المفضلة">♥</button>
      </div>
    </div>
  </article>`;
}

async function loadFavorites() {
  const ids = [...getFavoriteIds()];
  if (ids.length === 0) {
    $('#emptyFavoritesSection').hidden = false;
    $('#favoritesGridSection').hidden = true;
    return;
  }
  try {
    const { recipes } = await api('/api/recipes');
    const favRecipes = recipes.filter((r) => ids.includes(r.id));
    if (favRecipes.length === 0) {
      $('#emptyFavoritesSection').hidden = false;
      $('#favoritesGridSection').hidden = true;
      return;
    }
    $('#emptyFavoritesSection').hidden = true;
    $('#favoritesGridSection').hidden = false;
    const grid = $('#favoritesGrid');
    grid.innerHTML = favRecipes.map(favoriteCardHtml).join('');
    $$('[data-view-id]', grid).forEach((btn) => btn.addEventListener('click', () => openDetailById(Number(btn.dataset.viewId))));
    $$('[data-fav-id]', grid).forEach((btn) =>
      btn.addEventListener('click', () => {
        toggleFavorite(Number(btn.dataset.favId));
        loadFavorites(); // إعادة الرسم فوراً لإزالة البطاقة من الشبكة
      })
    );
  } catch (err) {
    console.error(err);
    showToast('تعذّر تحميل المفضلة، تحقق من الاتصال.');
  }
}

loadFavorites();
