const db = require('../database/db');
const { getAllRecipesWithIngredients, pickSurprise } = require('../services/matcher');

function serializeRecipe(r) {
  return {
    id: r.id,
    name: r.name,
    arabicName: r.arabic_name,
    description: r.description,
    preparationTime: r.preparation_time,
    cookingTime: r.cooking_time,
    totalTime: r.total_time,
    difficulty: r.difficulty,
    category: r.category,
    tags: r.tags,
    instructions: r.instructions,
    imageEmoji: r.image_emoji,
    imageUrl: r.image_url || null,
    estimatedCost: r.estimated_cost,
    servings: r.servings,
    popularity: r.popularity,
    ingredients: r.ingredients.map((i) => ({
      id: i.ingredient_id,
      name: i.name,
      arabicName: i.arabic_name,
      emoji: i.emoji,
      quantity: i.quantity,
      optional: !!i.is_optional,
    })),
  };
}

function listRecipes(req, res) {
  const all = getAllRecipesWithIngredients();
  res.json({ recipes: all.map(serializeRecipe) });
}

function getRecipe(req, res) {
  const id = Number(req.params.id);
  const recipe = db.prepare('SELECT * FROM recipes WHERE id = ?').get(id);
  if (!recipe) {
    return res.status(404).json({ error: 'الوصفة غير موجودة.' });
  }
  const ingredients = db
    .prepare(
      `SELECT ri.ingredient_id, ri.quantity, ri.is_optional, i.name, i.arabic_name, i.emoji
       FROM recipe_ingredients ri JOIN ingredients i ON i.id = ri.ingredient_id
       WHERE ri.recipe_id = ?`
    )
    .all(id);

  const full = {
    ...recipe,
    tags: JSON.parse(recipe.tags || '[]'),
    instructions: JSON.parse(recipe.instructions || '[]'),
    ingredients,
  };
  res.json({ recipe: serializeRecipe(full) });
}

/** يختار وصفة عشوائية حقيقية (تنويع كامل عند كل ضغطة على "فاجئني") */
function getRandomRecipe(req, res) {
  try {
    const ingredientIds = (req.query.ingredientIds || '')
      .split(',')
      .filter(Boolean)
      .map(Number);
    const timeAvailable = req.query.timeAvailable ? Number(req.query.timeAvailable) : null;
    const preferences = (req.query.preferences || '').split(',').filter(Boolean);

    const pick = pickSurprise({ userIngredientIds: ingredientIds, timeAvailable, preferenceTags: preferences });
    if (!pick) return res.status(404).json({ error: 'لم نجد وصفة مناسبة.' });

    const full = { ...pick.recipe, tags: pick.recipe.tags, instructions: pick.recipe.instructions };
    res.json({
      recipe: serializeRecipe(full),
      matchScore: pick.matchScore,
      missing: pick.missing.map((i) => ({ arabicName: i.arabic_name, emoji: i.emoji })),
    });
  } catch (err) {
    console.error('خطأ في /api/recipes/random:', err);
    res.status(500).json({ error: 'حدث خطأ بسيط. حاول مرة أخرى.' });
  }
}

module.exports = { listRecipes, getRecipe, getRandomRecipe };
