// server/services/matcher.js
// خوارزمية مطابقة وترتيب الوصفات حسب المكونات المتوفرة لدى المستخدم.
// هذه الخوارزمية حتمية (deterministic) بالكامل ولا تعتمد على الذكاء الاصطناعي؛
// الذكاء الاصطناعي يُستخدم لاحقاً فقط لصياغة الشرح، وليس لاختيار الوصفات.

const db = require('../database/db');

/**
 * يحسب درجة تطابق وصفة معينة مع مكونات المستخدم.
 * - المكونات الأساسية (is_staple=1) لا تُحسب ضمن "الناقص" وتُعتبر متوفرة افتراضياً.
 * - المكونات الاختيارية (is_optional=1) تُحسب بوزن أقل من الأساسية، فغيابها لا يقلل
 *   التطابق بنفس قدر غياب مكوّن أساسي مطلوب.
 */
function scoreRecipe(recipe, userIngredientIds, staplesAreAlwaysAvailable = true) {
  const required = recipe.ingredients.filter((i) => !i.is_optional);
  const optional = recipe.ingredients.filter((i) => i.is_optional);

  const isAvailable = (ing) => {
    if (staplesAreAlwaysAvailable && ing.is_staple) return true;
    return userIngredientIds.has(ing.ingredient_id);
  };

  const requiredHave = required.filter(isAvailable);
  const optionalHave = optional.filter(isAvailable);

  // وزن: المكونات الأساسية المطلوبة تزن أكثر من الاختيارية
  const REQUIRED_WEIGHT = 1;
  const OPTIONAL_WEIGHT = 0.35;

  const totalWeight = required.length * REQUIRED_WEIGHT + optional.length * OPTIONAL_WEIGHT;
  const haveWeight = requiredHave.length * REQUIRED_WEIGHT + optionalHave.length * OPTIONAL_WEIGHT;

  const matchScore = totalWeight > 0 ? haveWeight / totalWeight : 1;

  const missing = recipe.ingredients.filter((ing) => !isAvailable(ing));
  const missingRequired = required.filter((ing) => !isAvailable(ing));

  return {
    matchScore: Math.round(matchScore * 100),
    missing,
    missingRequired,
    canMakeNow: missingRequired.length === 0,
  };
}

/**
 * يرتّب قائمة وصفات حسب: نسبة التطابق، ثم الوقت المتاح، ثم عدد المكونات الناقصة،
 * ثم درجة الشعبية، ثم درجة الصعوبة (الأسهل أولاً).
 */
function rankRecipes(scoredRecipes, timeAvailableMinutes) {
  const difficultyRank = { 'سهلة': 0, 'متوسطة': 1, 'صعبة': 2 };

  return scoredRecipes
    .filter((r) => {
      // استبعاد وصفات تتجاوز الوقت المتاح بشكل كبير (هامش بسيط 5 دقائق)
      if (timeAvailableMinutes && r.recipe.total_time > timeAvailableMinutes + 5) return false;
      return true;
    })
    .sort((a, b) => {
      if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
      if (a.missingRequired.length !== b.missingRequired.length) {
        return a.missingRequired.length - b.missingRequired.length;
      }
      if (a.recipe.total_time !== b.recipe.total_time) return a.recipe.total_time - b.recipe.total_time;
      if (b.recipe.popularity !== a.recipe.popularity) return b.recipe.popularity - a.recipe.popularity;
      return (difficultyRank[a.recipe.difficulty] ?? 1) - (difficultyRank[b.recipe.difficulty] ?? 1);
    });
}

/** يجلب كل الوصفات مع مكوناتها من قاعدة البيانات */
function getAllRecipesWithIngredients() {
  const recipes = db.prepare('SELECT * FROM recipes').all();
  const recipeIngredientsStmt = db.prepare(`
    SELECT ri.recipe_id, ri.ingredient_id, ri.quantity, ri.is_optional,
           i.name, i.arabic_name, i.emoji, i.category, i.is_staple
    FROM recipe_ingredients ri
    JOIN ingredients i ON i.id = ri.ingredient_id
    WHERE ri.recipe_id = ?
  `);

  return recipes.map((r) => ({
    ...r,
    tags: JSON.parse(r.tags || '[]'),
    instructions: JSON.parse(r.instructions || '[]'),
    ingredients: recipeIngredientsStmt.all(r.id),
  }));
}

/**
 * الوظيفة الرئيسية: تبحث عن أفضل الوصفات المطابقة لمكونات المستخدم ووقته وتفضيلاته.
 * @param {number[]} userIngredientIds - معرفات المكونات التي يملكها المستخدم
 * @param {number|null} timeAvailable - الوقت المتاح بالدقائق (null = بدون حد)
 * @param {string[]} preferenceTags - تفضيلات مثل "نباتي"، "اقتصادي"...
 * @param {string|null} mealCategory - فطور/غداء/عشاء/سناك
 * @param {number} limit - عدد النتائج المطلوبة
 */
function findMatches({ userIngredientIds, timeAvailable = null, preferenceTags = [], mealCategory = null, limit = 6 }) {
  const idsSet = new Set(userIngredientIds);
  const allRecipes = getAllRecipesWithIngredients();

  let candidates = allRecipes.map((recipe) => {
    const score = scoreRecipe(recipe, idsSet);
    return { recipe, ...score };
  });

  // فلترة حسب الفئة (فطور/غداء/عشاء) إن طُلبت
  if (mealCategory) {
    candidates = candidates.filter((c) => c.recipe.category === mealCategory);
  }

  // فلترة حسب التفضيلات (يجب أن تحتوي الوصفة على كل الوسوم المطلوبة)
  if (preferenceTags && preferenceTags.length) {
    candidates = candidates.filter((c) =>
      preferenceTags.some((tag) => c.recipe.tags.includes(tag))
    );
  }

  // إذا لم يحدد المستخدم أي مكونات، أظهر أشهر الوصفات السريعة كبديل
  if (idsSet.size === 0) {
    candidates = candidates.filter((c) => c.recipe.total_time <= (timeAvailable || 30) + 10);
    candidates.sort((a, b) => b.recipe.popularity - a.recipe.popularity);
    return candidates.slice(0, limit);
  }

  const ranked = rankRecipes(candidates, timeAvailable);
  return ranked.slice(0, limit);
}

/**
 * يختار وصفة عشوائية حقيقية (لزر "فاجئني") بدلاً من الاقتصار دوماً على
 * أفضل ٣ نتائج. إن كان لدى المستخدم مكونات، يُسحب الاختيار عشوائياً من كل
 * الوصفات ذات التطابق المعقول (وليس فقط أعلى ترتيب)؛ إن لم توجد مكونات،
 * يُسحب من كل الوصفات ضمن الوقت المتاح مع وزن بسيط لصالح الأكثر شعبية.
 */
function pickSurprise({ userIngredientIds, timeAvailable = null, preferenceTags = [] }) {
  const idsSet = new Set(userIngredientIds || []);
  const allRecipes = getAllRecipesWithIngredients();

  let candidates = allRecipes.map((recipe) => {
    const score = scoreRecipe(recipe, idsSet);
    return { recipe, ...score };
  });

  if (preferenceTags && preferenceTags.length) {
    candidates = candidates.filter((c) => preferenceTags.every((tag) => c.recipe.tags.includes(tag)));
  }
  if (timeAvailable) {
    candidates = candidates.filter((c) => c.recipe.total_time <= timeAvailable + 10);
  }
  if (candidates.length === 0) candidates = allRecipes.map((recipe) => ({ recipe, ...scoreRecipe(recipe, idsSet) }));

  const pool = idsSet.size > 0 ? candidates.filter((c) => c.matchScore >= 40) : candidates;
  const finalPool = pool.length > 0 ? pool : candidates;

  return finalPool[Math.floor(Math.random() * finalPool.length)];
}

/**
 * يحاول ربط نص مكوّن حر (كتبه المستخدم يدوياً ولم يُختر من القائمة) بمكوّن
 * معروف في قاعدة البيانات عبر تطابق جزئي في الاسم العربي. يعيد null إن لم
 * يوجد تطابق معقول — عندها يبقى المكوّن "حراً" ويُستخدم كسياق إضافي فقط.
 */
function resolveCustomIngredient(text) {
  const clean = (text || '').trim();
  if (!clean) return null;
  const rows = db.prepare('SELECT * FROM ingredients').all();
  const exact = rows.find((r) => r.arabic_name === clean);
  if (exact) return exact;
  const partial = rows.find((r) => clean.includes(r.arabic_name) || r.arabic_name.includes(clean));
  return partial || null;
}

module.exports = {
  findMatches,
  scoreRecipe,
  rankRecipes,
  getAllRecipesWithIngredients,
  pickSurprise,
  resolveCustomIngredient,
};
