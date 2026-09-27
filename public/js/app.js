// public/js/app.js
// منطق الصفحة الرئيسية: اختيار المكونات (بما فيها مكونات حرة)، الوقت،
// التفضيلات، البحث عن الوصفات، وعرض النتائج. يعتمد على js/common.js.

const CATEGORY_LABELS = {
  veg: '🥬 خضروات',
  meat: '🥩 لحوم',
  dairy_egg: '🥚 ألبان وبيض',
  grain: '🍚 حبوب ونشويات',
  canned: '🥫 معلبات',
  staple: '🧂 أساسيات',
};

const LOADING_MESSAGES = [
  'نبحث في الوصفات...',
  'نقارن المكونات...',
  'نجهز اقتراحات مناسبة...',
  'لحظة واحدة...',
];

const state = {
  ingredientsById: new Map(),
  ingredientsByCategory: {},
  selectedIds: new Set(JSON.parse(localStorage.getItem('tabkhty:selectedIngredients') || '[]')),
  customIngredients: new Map(JSON.parse(localStorage.getItem('tabkhty:customIngredients') || '[]')),
  activeCategory: 'veg',
  time: null,
  customTimeActive: false,
  prefs: new Set(),
  mealCategory: null,
  lastResults: [],
};

function persistSelection() {
  localStorage.setItem('tabkhty:selectedIngredients', JSON.stringify([...state.selectedIds]));
  localStorage.setItem('tabkhty:customIngredients', JSON.stringify([...state.customIngredients]));
}

// ===================== تحميل المكونات =====================

async function loadIngredients() {
  const { ingredients } = await api('/api/ingredients');
  state.ingredientsByCategory = {};
  for (const ing of ingredients) {
    state.ingredientsById.set(ing.id, ing);
    (state.ingredientsByCategory[ing.category] ||= []).push(ing);
  }
  renderFridgeTabs();
  renderIngredientGrid();
}

function renderFridgeTabs() {
  const tabsEl = $('#fridgeTabs');
  const categories = Object.keys(CATEGORY_LABELS).filter((c) => state.ingredientsByCategory[c]?.length);
  tabsEl.innerHTML = categories
    .map(
      (cat) =>
        `<button class="fridge-tab ${cat === state.activeCategory ? 'active' : ''}" data-cat="${cat}" role="tab">${CATEGORY_LABELS[cat]}</button>`
    )
    .join('');
  tabsEl.querySelectorAll('.fridge-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.activeCategory = btn.dataset.cat;
      renderFridgeTabs();
      renderIngredientGrid();
    });
  });
  wireScrollRow($('#fridgeTabs'), $('#fridgeScrollStart'), $('#fridgeScrollEnd'));
}

function renderIngredientGrid() {
  const grid = $('#ingredientGrid');
  const items = state.ingredientsByCategory[state.activeCategory] || [];
  grid.innerHTML = items.map(ingredientCardHtml).join('');
  wireIngredientCards(grid);
}

function ingredientCardHtml(ing) {
  const selected = state.selectedIds.has(ing.id);
  return `<button class="ingredient-card ${selected ? 'selected' : ''}" data-id="${ing.id}">
    <span class="emoji">${ing.emoji || '🥘'}</span>
    <span>${ing.arabic_name}</span>
  </button>`;
}

function wireIngredientCards(root) {
  root.querySelectorAll('.ingredient-card').forEach((card) => {
    card.addEventListener('click', () => toggleIngredient(Number(card.dataset.id)));
  });
}

function toggleIngredient(id) {
  if (state.selectedIds.has(id)) {
    state.selectedIds.delete(id);
  } else {
    state.selectedIds.add(id);
  }
  persistSelection();
  renderIngredientGrid();
  renderSelectedBar();
}

function addCustomIngredient(text) {
  const key = `custom:${text.trim()}`;
  if (!text.trim() || state.customIngredients.has(key)) return;
  state.customIngredients.set(key, text.trim());
  persistSelection();
  renderSelectedBar();
  showToast(`تمت إضافة "${text.trim()}" — سنأخذها بعين الاعتبار حتى لو لم تكن ضمن قائمتنا الجاهزة`);
}

function removeCustomIngredient(key) {
  state.customIngredients.delete(key);
  persistSelection();
  renderSelectedBar();
}

function clearAllIngredients() {
  if (state.selectedIds.size === 0 && state.customIngredients.size === 0) return;
  state.selectedIds.clear();
  state.customIngredients.clear();
  persistSelection();
  renderIngredientGrid();
  renderSelectedBar();
  showToast('تم مسح كل المكونات المختارة');
}

let barCollapsed = false;
const COLLAPSED_VISIBLE_COUNT = 6;

function renderSelectedBar() {
  const bar = $('#selectedBar');
  const count = state.selectedIds.size + state.customIngredients.size;
  bar.hidden = count === 0;
  $('#selectedCountText').textContent = `لديك ${count} ${count === 1 ? 'مكوّن' : 'مكونات'}`;

  const knownChips = [...state.selectedIds].map((id) => {
    const ing = state.ingredientsById.get(id);
    if (!ing) return '';
    return `<span class="chip">${ing.emoji || ''} ${ing.arabic_name} <button data-remove="${id}" aria-label="إزالة ${ing.arabic_name}">✕</button></span>`;
  });
  const customChips = [...state.customIngredients.entries()].map(
    ([key, label]) =>
      `<span class="chip chip-custom">✍️ ${label} <button data-remove-custom="${key}" aria-label="إزالة ${label}">✕</button></span>`
  );

  let allChips = [...knownChips, ...customChips];
  let extraCount = 0;

  if (barCollapsed && allChips.length > COLLAPSED_VISIBLE_COUNT) {
    extraCount = allChips.length - COLLAPSED_VISIBLE_COUNT;
    allChips = allChips.slice(0, COLLAPSED_VISIBLE_COUNT);
  }

  const moreHtml = extraCount > 0 ? `<span class="chip-more">+${extraCount} …</span>` : '';

  $('#chipRow').innerHTML = allChips.join('') + moreHtml;
  bar.classList.toggle('collapsed', barCollapsed);

  $('#chipRow')
    .querySelectorAll('[data-remove]')
    .forEach((btn) => btn.addEventListener('click', () => toggleIngredient(Number(btn.dataset.remove))));
  $('#chipRow')
    .querySelectorAll('[data-remove-custom]')
    .forEach((btn) => btn.addEventListener('click', () => removeCustomIngredient(btn.dataset.removeCustom)));
}

$('#clearAllBtn').addEventListener('click', clearAllIngredients);


function setupBarCollapseObserver() {
  const sentinel = document.getElementById('selectedBarSentinel');
  if (!sentinel) return;
  const observer = new IntersectionObserver(
    ([entry]) => {
      const shouldCollapse = !entry.isIntersecting;
      if (shouldCollapse !== barCollapsed) {
        barCollapsed = shouldCollapse;
        renderSelectedBar();
      }
    },
    { rootMargin: '-68px 0px 0px 0px', threshold: 0 }
  );
  observer.observe(sentinel);
}







// ===================== البحث عن مكوّن (يدعم مكونات خارج القائمة) =====================

let searchDebounce;
$('#ingredientSearch').addEventListener('input', (e) => {
  clearTimeout(searchDebounce);
  const q = e.target.value.trim();
  searchDebounce = setTimeout(() => runIngredientSearch(q), 200);
});

$('#ingredientSearch').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const q = e.target.value.trim();
    if (!q) return;
    const box = $('#searchResults');
    if (!box.querySelector('.search-result-pill:not(.custom-add)')) {
      addCustomIngredient(q);
      e.target.value = '';
      box.innerHTML = '';
    }
  }
});

async function runIngredientSearch(query) {
  const box = $('#searchResults');
  if (!query) {
    box.innerHTML = '';
    return;
  }
  const { ingredients } = await api(`/api/ingredients?q=${encodeURIComponent(query)}`);
  const known = ingredients
    .slice(0, 10)
    .map(
      (ing) =>
        `<button class="search-result-pill" data-id="${ing.id}">${ing.emoji || '🥘'} ${ing.arabic_name}</button>`
    )
    .join('');
  const customPill = `<button class="search-result-pill custom-add" data-custom-text="${query.replace(/"/g, '&quot;')}">+ إضافة "${query}" كمكوّن</button>`;

  box.innerHTML = known + customPill;

  box.querySelectorAll('.search-result-pill:not(.custom-add)').forEach((btn) => {
    btn.addEventListener('click', () => {
      toggleIngredient(Number(btn.dataset.id));
      state.activeCategory = state.ingredientsById.get(Number(btn.dataset.id)).category;
      renderFridgeTabs();
      renderIngredientGrid();
      $('#ingredientSearch').value = '';
      box.innerHTML = '';
    });
  });
  box.querySelector('.custom-add').addEventListener('click', () => {
    addCustomIngredient(query);
    $('#ingredientSearch').value = '';
    box.innerHTML = '';
  });
}

// ===================== الوقت =====================

$$('.time-card').forEach((card) => {
  card.addEventListener('click', () => {
    state.time = Number(card.dataset.time);
    state.customTimeActive = false;
    $('#customTimeInput').hidden = true;
    $$('.time-card').forEach((c) => c.classList.toggle('selected', c === card));
  });
});

$('#customTimeToggle').addEventListener('click', () => {
  state.customTimeActive = true;
  $$('.time-card').forEach((c) => c.classList.remove('selected'));
  const input = $('#customTimeInput');
  input.hidden = false;
  input.focus();
});

$('#customTimeInput').addEventListener('input', (e) => {
  state.time = Number(e.target.value) || null;
});

// ===================== التفضيلات الإضافية =====================

$('#prefsToggle').addEventListener('click', () => {
  const d = $('#prefsDisclosure');
  const open = d.classList.toggle('open');
  $('#prefsToggle').setAttribute('aria-expanded', String(open));
});

$$('#prefsGrid .tag-toggle').forEach((btn) => {
  btn.addEventListener('click', () => {
    const tag = btn.dataset.tag;
    if (state.prefs.has(tag)) {
      state.prefs.delete(tag);
      btn.classList.remove('selected');
    } else {
      state.prefs.add(tag);
      btn.classList.add('selected');
    }
  });
});

$$('#mealCategoryGrid .tag-toggle').forEach((btn) => {
  btn.addEventListener('click', () => {
    const cat = btn.dataset.category;
    const already = state.mealCategory === cat;
    $$('#mealCategoryGrid .tag-toggle').forEach((b) => b.classList.remove('selected'));
    state.mealCategory = already ? null : cat;
    if (!already) btn.classList.add('selected');
  });
});

// ===================== البحث الرئيسي =====================

let loadingInterval;
function startLoading() {
  $('#resultsSection').hidden = true;
  const screen = $('#loadingScreen');
  screen.classList.add('active');
  let i = 0;
  $('#loadingText').textContent = 'نبحث عن أفضل الأفكار لك...';
  loadingInterval = setInterval(() => {
    $('#loadingText').textContent = LOADING_MESSAGES[i % LOADING_MESSAGES.length];
    i++;
  }, 900);
}

function stopLoading() {
  clearInterval(loadingInterval);
  $('#loadingScreen').classList.remove('active');
}

async function fetchRecommendations(overrides = {}) {
  const payload = {
    ingredientIds: [...state.selectedIds],
    customIngredients: [...state.customIngredients.values()],
    timeAvailable: state.time,
    preferences: [...state.prefs],
    mealCategory: state.mealCategory,
    useAI: true,
    ...overrides,
  };
  return api('/api/recommendations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

$('#searchBtn').addEventListener('click', async () => {
  if (state.selectedIds.size === 0 && state.customIngredients.size === 0) {
    showToast('أضف مكوناً واحداً على الأقل لنبدأ 🥕');
    $('#ingredients-section').scrollIntoView({ behavior: 'smooth' });
    return;
  }
  await performSearch();
});

async function performSearch() {
  startLoading();
  try {
    const data = await fetchRecommendations();
    stopLoading();
    state.lastResults = data.recommendations || [];
    renderResults(data);
    $('#resultsSection').hidden = false;
    $('#resultsSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (err) {
    stopLoading();
    showToast('حدث خطأ بسيط أثناء البحث عن الوصفات. حاول مرة أخرى.');
    console.error(err);
  }
}

function renderResults(data) {
  const list = $('#resultsList');
  const note = $('#aiStatusNote');

  if (!data.recommendations || data.recommendations.length === 0) {
    note.textContent = '';
    list.innerHTML = `<div class="empty-state">
      <div class="emoji">😅</div>
      <h3>لم نجد تطابقاً مثالياً هذه المرة</h3>
      <p>جرّب إضافة مكوّن آخر أو زيادة وقت الطبخ المتاح.</p>
    </div>`;
    return;
  }

  note.textContent = data.aiAvailable
    ? ''
    : 'عرضنا لك الوصفات المناسبة، لكن المساعد الذكي غير متاح حالياً.';

  list.innerHTML = data.recommendations.map(recipeCardHtml).join('');
  wireResultCards();
}

function recipeCardHtml(r) {
  const isFav = isFavorite(r.id);
  return `<article class="recipe-card" data-recipe-id="${r.id}">
    ${heroHtml(r.id, r.imageEmoji, '', r.imageUrl)}
    <div class="recipe-card__body">
      <div class="recipe-card__title">${r.arabicName}</div>
      <div class="recipe-card__meta">
        <span class="badge ${matchBadgeClass(r.matchScore)}">⭐ تطابق ${r.matchScore}%</span>
        <span class="badge badge-diff">⏱️ جاهزة خلال ${r.totalTime} دقيقة</span>
        <span class="badge badge-diff">🟢 ${r.difficulty}</span>
      </div>

      ${r.aiReason ? `<div class="recipe-card__ai">${r.aiReason}</div>` : ''}

      <div class="ingredient-status">
        ${r.have.map((i) => `<span class="status-pill have">✓ ${i.arabicName}</span>`).join('')}
        ${r.missing.map((i) => `<span class="status-pill missing">○ ${i.arabicName}</span>`).join('')}
      </div>

      <div class="recipe-card__actions">
        <button class="btn btn-primary" data-view-id="${r.id}">عرض الوصفة</button>
        <button class="icon-btn fav ${isFav ? 'active' : ''}" data-fav-id="${r.id}" aria-label="حفظ في المفضلة">${isFav ? '♥' : '♡'}</button>
      </div>
    </div>
  </article>`;
}

function wireResultCards() {
  $$('[data-view-id]').forEach((btn) =>
    btn.addEventListener('click', () => openRecipeDetail(Number(btn.dataset.viewId)))
  );
  $$('[data-fav-id]').forEach((btn) => btn.addEventListener('click', () => toggleFavorite(Number(btn.dataset.favId))));
}

function findRecipeInResults(id) {
  return state.lastResults.find((r) => r.id === id);
}

function openRecipeDetail(id) {
  const r = findRecipeInResults(id);
  if (r) openDetailFromMatch(r);
  else openDetailById(id);
}

// ===================== فاجئني (عشوائي حقيقي) =====================

$('#surpriseBtn').addEventListener('click', async () => {
  startLoading();
  try {
    const params = new URLSearchParams();
    if (state.selectedIds.size) params.set('ingredientIds', [...state.selectedIds].join(','));
    if (state.time) params.set('timeAvailable', state.time);
    if (state.prefs.size) params.set('preferences', [...state.prefs].join(','));

    const data = await api(`/api/recipes/random?${params.toString()}`);
    stopLoading();
    if (!data.recipe) {
      showToast('لم نجد اقتراحاً مفاجئاً هذه المرة، جرّب إضافة مكونات أكثر.');
      return;
    }
    openRecipeDetailModal({
      id: data.recipe.id,
      imageEmoji: data.recipe.imageEmoji,
      imageUrl: data.recipe.imageUrl,
      arabicName: data.recipe.arabicName,
      description: data.recipe.description,
      preparationTime: data.recipe.preparationTime,
      cookingTime: data.recipe.cookingTime,
      servings: data.recipe.servings,
      estimatedCost: data.recipe.estimatedCost,
      difficulty: data.recipe.difficulty,
      matchScore: state.selectedIds.size ? data.matchScore : null,
      ingredientRows: state.selectedIds.size
        ? rowsFromHaveMissing(
            data.recipe.ingredients.filter((i) => !data.missing.some((m) => m.arabicName === i.arabicName)),
            data.missing
          )
        : rowsFromFullIngredients(data.recipe.ingredients),
      instructions: data.recipe.instructions,
    });
  } catch (err) {
    stopLoading();
    showToast('حدث خطأ بسيط. حاول مرة أخرى.');
  }
});

// ===================== لا أعرف ماذا أريد =====================

const quizState = { step: 0, answers: {} };

const QUIZ_QUESTIONS = [
  { key: 'speed', text: 'سريع أم لا؟', options: [{ label: '⚡ سريع (أقل من ٢٠ دقيقة)', value: 15 }, { label: '🥘 لا يهم الوقت', value: null }] },
  { key: 'weight', text: 'خفيف أم مشبع؟', options: [{ label: '🥗 خفيف', value: 'خفيف' }, { label: '🍛 مشبع', value: null }] },
  { key: 'budget', text: 'اقتصادي أم لا يهم؟', options: [{ label: '💰 اقتصادي', value: 'اقتصادي' }, { label: '🤷 لا يهم', value: null }] },
  { key: 'protein', text: 'لحم أم دجاج أم بدون؟', options: [{ label: '🥩 لحم', value: 'beef' }, { label: '🍗 دجاج', value: 'chicken' }, { label: '🌱 بدون', value: 'veg' }] },
];

$('#dontKnowBtn').addEventListener('click', () => {
  quizState.step = 0;
  quizState.answers = {};
  renderQuizStep();
  $('#detailModal').classList.add('open');
});

function renderQuizStep() {
  const q = QUIZ_QUESTIONS[quizState.step];
  $('#detailSheet').innerHTML = `
    <div class="modal-title-row"><button class="modal-close" id="quizClose" aria-label="إغلاق">✕</button></div>
    <h2 class="text-center">${q.text}</h2>
    <div class="stack" style="margin-top:20px;">
      ${q.options.map((o, i) => `<button class="btn btn-secondary btn-block btn-lg" data-quiz-opt="${i}">${o.label}</button>`).join('')}
    </div>
    <p class="text-center" style="margin-top:14px; color:var(--color-ink-soft); font-size:0.85rem;">سؤال ${quizState.step + 1} من ${QUIZ_QUESTIONS.length}</p>
  `;
  $('#quizClose').addEventListener('click', closeRecipeModal);
  $$('[data-quiz-opt]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const opt = q.options[Number(btn.dataset.quizOpt)];
      quizState.answers[q.key] = opt.value;
      quizState.step++;
      if (quizState.step < QUIZ_QUESTIONS.length) {
        renderQuizStep();
      } else {
        applyQuizAnswers();
      }
    });
  });
}

async function applyQuizAnswers() {
  closeRecipeModal();
  const { speed, weight, budget, protein } = quizState.answers;
  if (speed) state.time = speed;
  if (weight) state.prefs.add(weight);
  if (budget) state.prefs.add(budget);
  if (protein === 'veg') {
    state.prefs.add('نباتي');
  } else if (protein) {
    const target = [...state.ingredientsById.values()].find((i) => i.name === protein);
    if (target) state.selectedIds.add(target.id);
  }
  persistSelection();
  renderSelectedBar();
  await performSearch();
}

// ===================== أفكار سريعة اليوم =====================

async function loadQuickIdeas() {
  const { recipes } = await api('/api/recipes');
  const shuffled = [...recipes].sort(() => Math.random() - 0.5);
  const top = shuffled.slice(0, 10);
  $('#quickScroll').innerHTML = top
    .map(
      (r) => `<button class="quick-card" data-quick-id="${r.id}">
        ${heroHtml(r.id, r.imageEmoji, '', r.imageUrl)}
        <div class="quick-card__body">
          <div class="name">${r.arabicName}</div>
          <div class="time">⏱️ ${r.totalTime} دقيقة</div>
        </div>
      </button>`
    )
    .join('');
  $$('[data-quick-id]').forEach((btn) => btn.addEventListener('click', () => openRecipeDetail(Number(btn.dataset.quickId))));
  wireScrollRow($('#quickScroll'), $('#quickScrollStart'), $('#quickScrollEnd'));
}

// ===================== بدء التشغيل =====================

(async function init() {
  try {
    await loadIngredients();
    renderSelectedBar();
    setupBarCollapseObserver();
    await loadQuickIdeas();
  } catch (err) {
    console.error(err);
    showToast('تعذّر تحميل البيانات، تحقق من الاتصال.');
  }
})();
