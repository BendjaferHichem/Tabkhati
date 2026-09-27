// public/js/common.js
// أدوات مشتركة بين كل الصفحات: نداءات API، التوست، المفضلة، نافذة تفاصيل
// الوصفة، وضع الطبخ، وأسهم التمرير الأفقي. يُحمَّل قبل سكربت كل صفحة.

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

async function api(path, options) {
  const res = await fetch(path, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'حدث خطأ غير متوقع.');
  }
  return res.json();
}

function showToast(message) {
  const stack = $('#toastStack');
  if (!stack) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  stack.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

// ===================== المفضلة (localStorage) =====================

function getFavoriteIds() {
  return new Set(JSON.parse(localStorage.getItem('tabkhty:favorites') || '[]'));
}

function isFavorite(id) {
  return getFavoriteIds().has(id);
}

function toggleFavorite(id) {
  const favs = getFavoriteIds();
  let nowFav;
  if (favs.has(id)) {
    favs.delete(id);
    nowFav = false;
    showToast('تمت إزالة الوصفة من المفضلة');
  } else {
    favs.add(id);
    nowFav = true;
    showToast('تمت إضافة الوصفة إلى المفضلة ❤️');
  }
  localStorage.setItem('tabkhty:favorites', JSON.stringify([...favs]));
  $$(`[data-fav-id="${id}"]`).forEach((btn) => {
    btn.classList.toggle('active', nowFav);
    btn.textContent = nowFav ? '♥' : '♡';
  });
  return nowFav;
}

// ===================== بطاقة "هيرو" ملونة =====================

const HERO_GRADIENT_COUNT = 8;

function heroClass(id) {
  const idx = ((Number(id) || 0) % HERO_GRADIENT_COUNT + HERO_GRADIENT_COUNT) % HERO_GRADIENT_COUNT;
  return `recipe-hero-grad-${idx}`;
}

/**
 * يبني بطاقة "الهيرو": صورة حقيقية إن توفر رابطها (imageUrl)، وإلا تدرّج
 * لوني + رمز الطبق. الصورة تُوضع فوق التدرّج مباشرة، وإن تعذّر تحميلها
 * (رابط معطوب، لا اتصال...) تُزال نفسها تلقائياً عبر onerror فيظهر التدرّج
 * والرمز الموجودان أصلاً خلفها دون أي كود إضافي.
 */
function heroHtml(id, emoji, extraClass = '', imageUrl = null) {
  const img = imageUrl
    ? `<img src="${imageUrl}" alt="" loading="lazy" class="recipe-hero__img" onerror="this.remove()">`
    : '';
  return `<div class="recipe-hero ${heroClass(id)} ${extraClass}">${emoji || '🍽️'}${img}</div>`;
}

// ===================== نافذة تفاصيل الوصفة (موحّدة) =====================
// تتوقع الصفحة وجود: #detailModal > #detailSheet

function matchBadgeClass(score) {
  if (score >= 75) return 'badge-match-high';
  if (score >= 45) return 'badge-match-mid';
  return 'badge-match-low';
}

/** يبني صفوف المكونات الموحّدة: [{label, emoji, quantity, missing}] */
function rowsFromHaveMissing(have, missing) {
  return [
    ...have.map((i) => ({ label: i.arabicName, emoji: i.emoji, missing: false, optional: i.optional })),
    ...missing.map((i) => ({ label: i.arabicName, emoji: i.emoji, missing: true, optional: i.optional })),
  ];
}

function rowsFromFullIngredients(ingredients) {
  return ingredients.map((i) => ({ label: i.arabicName, emoji: i.emoji, quantity: i.quantity, missing: false }));
}

/**
 * يعرض نافذة تفاصيل موحّدة. data = {
 *   id, imageEmoji, arabicName, description, preparationTime, cookingTime,
 *   servings, estimatedCost, difficulty, matchScore(اختياري),
 *   ingredientRows, instructions, aiReason, aiSubstitutions, aiExtraNote
 * }
 */
function openRecipeDetailModal(data) {
  const isFav = isFavorite(data.id);
  const matchBadge = data.matchScore != null
    ? `<div class="text-center" style="margin-top:-6px;"><span class="badge ${matchBadgeClass(data.matchScore)}">⭐ تطابق ${data.matchScore}%</span></div>`
    : '';
  const noteHtml = data.aiExtraNote ? `<div class="recipe-card__ai" style="margin:14px 0 0;">${data.aiExtraNote}</div>` : '';
  const substitutionsHtml = data.aiSubstitutions && data.aiSubstitutions.length
    ? `<div class="detail-section"><h3>بدائل مقترحة</h3><p>${data.aiSubstitutions.join('، ')}</p></div>`
    : '';

  const ingredientListHtml = `<ul class="ingredient-list">${data.ingredientRows
    .map(
      (r) =>
        `<li class="${r.missing ? 'missing' : ''}">${r.emoji || ''} ${r.label}${r.optional ? ' (اختياري)' : ''}${r.quantity ? ' — ' + r.quantity : ''}</li>`
    )
    .join('')}</ul>`;

  $('#detailSheet').innerHTML = `
    <div class="modal-title-row"><button class="modal-close" id="modalCloseBtn" aria-label="إغلاق">✕</button></div>
    <div class="recipe-detail__emoji">${heroHtml(data.id, data.imageEmoji, '', data.imageUrl)}</div>
    <h2 class="text-center">${data.arabicName}</h2>
    ${matchBadge}
    <p class="text-center" style="color:var(--color-ink-soft); margin-top:8px;">${data.description || ''}</p>
    <div class="recipe-detail__stats">
      <div><strong>${data.preparationTime}د</strong>تحضير</div>
      <div><strong>${data.cookingTime}د</strong>طبخ</div>
      <div><strong>${data.servings}</strong>أشخاص</div>
      <div><strong>${data.estimatedCost}</strong>التكلفة</div>
      <div><strong>${data.difficulty}</strong>الصعوبة</div>
    </div>
    ${noteHtml}
    <div class="detail-section">
      <h3>المكونات</h3>
      ${ingredientListHtml}
    </div>
    ${substitutionsHtml}
    <div class="detail-section">
      <h3>طريقة التحضير</h3>
      <ol class="steps-list">${data.instructions.map((s) => `<li>${s}</li>`).join('')}</ol>
    </div>
    <div class="detail-actions">
      <button class="btn btn-primary" id="startCookingBtn">👨‍🍳 ابدأ الطبخ</button>
      <button class="icon-btn fav ${isFav ? 'active' : ''}" id="detailFavBtn" data-fav-id="${data.id}" aria-label="حفظ في المفضلة">${isFav ? '♥' : '♡'}</button>
      <button class="icon-btn" id="printBtn" aria-label="طباعة">🖨️</button>
    </div>
  `;

  $('#modalCloseBtn').addEventListener('click', closeRecipeModal);
  $('#detailFavBtn').addEventListener('click', () => toggleFavorite(data.id));
  $('#printBtn').addEventListener('click', () => window.print());
  $('#startCookingBtn').addEventListener('click', () => startCookingMode(data.arabicName, data.instructions));

  $('#detailModal').classList.add('open');
}

function closeRecipeModal() {
  const modal = $('#detailModal');
  if (modal) modal.classList.remove('open');
}

function wireModalOverlayClose() {
  const modal = $('#detailModal');
  if (!modal) return;
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeRecipeModal();
  });
}

/** يفتح تفاصيل وصفة من نتيجة مطابقة (have/missing/matchScore/aiReason...) */
function openDetailFromMatch(r) {
  openRecipeDetailModal({
    id: r.id,
    imageEmoji: r.imageEmoji,
    imageUrl: r.imageUrl,
    arabicName: r.arabicName,
    description: r.description,
    preparationTime: r.preparationTime,
    cookingTime: r.cookingTime,
    servings: r.servings,
    estimatedCost: r.estimatedCost,
    difficulty: r.difficulty,
    matchScore: r.matchScore,
    ingredientRows: rowsFromHaveMissing(r.have, r.missing),
    instructions: r.instructions,
    aiReason: r.aiReason,
    aiSubstitutions: r.aiSubstitutions,
    aiExtraNote: r.aiExtraNote,
  });
}

/** يفتح تفاصيل وصفة كاملة (بدون سياق تطابق) — مثلاً من صفحة التصفح أو المفضلة */
async function openDetailById(id) {
  const { recipe } = await api(`/api/recipes/${id}`);
  openRecipeDetailModal({
    id: recipe.id,
    imageEmoji: recipe.imageEmoji,
    imageUrl: recipe.imageUrl,
    arabicName: recipe.arabicName,
    description: recipe.description,
    preparationTime: recipe.preparationTime,
    cookingTime: recipe.cookingTime,
    servings: recipe.servings,
    estimatedCost: recipe.estimatedCost,
    difficulty: recipe.difficulty,
    matchScore: null,
    ingredientRows: rowsFromFullIngredients(recipe.ingredients),
    instructions: recipe.instructions,
  });
}

// ===================== وضع الطبخ =====================

let cookingSteps = [];
let cookingIndex = 0;

function startCookingMode(name, steps) {
  cookingSteps = steps;
  cookingIndex = 0;
  $('#cookingRecipeName').textContent = name;
  renderCookingStep();
  $('#cookingMode').classList.add('open');
}

function renderCookingStep() {
  const total = cookingSteps.length;
  $('#cookingStepLabel').textContent = `الخطوة ${cookingIndex + 1} من ${total}`;
  $('#cookingStepText').textContent = cookingSteps[cookingIndex];
  $('#cookingProgress').style.width = `${((cookingIndex + 1) / total) * 100}%`;
  $('#cookingPrev').disabled = cookingIndex === 0;
  $('#cookingNext').textContent = cookingIndex === total - 1 ? 'تم! ✓' : 'التالي →';
}

function wireCookingMode() {
  const prev = $('#cookingPrev');
  const next = $('#cookingNext');
  const close = $('#cookingClose');
  if (!prev || !next || !close) return;
  prev.addEventListener('click', () => {
    if (cookingIndex > 0) { cookingIndex--; renderCookingStep(); }
  });
  next.addEventListener('click', () => {
    if (cookingIndex < cookingSteps.length - 1) {
      cookingIndex++;
      renderCookingStep();
    } else {
      $('#cookingMode').classList.remove('open');
      closeRecipeModal();
      showToast('بالهناء والشفاء! 🍽️');
    }
  });
  close.addEventListener('click', () => {
    $('#cookingMode').classList.remove('open');
    closeRecipeModal();
  });
}

// ===================== أسهم التمرير الأفقي =====================

/**
 * يربط زري سهم بحاوية قابلة للتمرير أفقياً (RTL-aware)، ويُظهر/يُخفي كل
 * سهم تلقائياً عند الوصول لبداية أو نهاية المحتوى، ويدعم اللمس أصلاً
 * (overflow-x: auto موجود بالفعل في CSS) بالإضافة إلى أزرار صريحة للنقر.
 */
function wireScrollRow(rowEl, startBtn, endBtn) {
  if (!rowEl || !startBtn || !endBtn) return;

  // نكتشف اتجاه scrollLeft الفعلي في هذا المتصفح لصفحة RTL (يختلف بين
  // المتصفحات: بعضها يستخدم قيماً سالبة، وبعضها يعكس البداية والنهاية)
  const isRTL = getComputedStyle(rowEl).direction === 'rtl';

  function maxScroll() {
    return rowEl.scrollWidth - rowEl.clientWidth;
  }

  function normalizedScroll() {
    // نحوّل scrollLeft إلى قيمة موحّدة: 0 = بداية المحتوى (أقصى اليمين في RTL)
    if (!isRTL) return rowEl.scrollLeft;
    // Chrome/Edge: قيم سالبة من 0 إلى -max. Firefox: قيم موجبة من max إلى 0.
    return rowEl.scrollLeft <= 0 ? -rowEl.scrollLeft : maxScroll() - rowEl.scrollLeft;
  }

  function update() {
    const max = maxScroll();
    if (max <= 4) {
      startBtn.classList.add('is-hidden');
      endBtn.classList.add('is-hidden');
      return;
    }
    const pos = normalizedScroll();
    startBtn.classList.toggle('is-hidden', pos <= 4);
    endBtn.classList.toggle('is-hidden', pos >= max - 4);
  }

  function scrollByAmount(towardEnd) {
    const amount = Math.max(rowEl.clientWidth * 0.7, 160);
    const sign = isRTL ? -1 : 1;
    const delta = towardEnd ? amount * sign : -amount * sign;
    rowEl.scrollBy({ left: delta, behavior: 'smooth' });
  }

  // في RTL: "start" (اليمين، بداية المحتوى) يُرجع للخلف، "end" (اليسار) يتقدم للأمام
  startBtn.addEventListener('click', () => scrollByAmount(false));
  endBtn.addEventListener('click', () => scrollByAmount(true));
  rowEl.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  requestAnimationFrame(update);
  // إعادة الفحص بعد تحميل المحتوى ديناميكياً
  setTimeout(update, 300);
  setTimeout(update, 1000);
}

document.addEventListener('DOMContentLoaded', () => {
  wireModalOverlayClose();
  wireCookingMode();
});
