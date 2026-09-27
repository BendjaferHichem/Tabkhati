const db = require('../database/db');
const { findMatches, resolveCustomIngredient } = require('../services/matcher');
const { explainRecommendations } = require('../services/groq');

function serializeMatch(m) {
  const r = m.recipe;
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
    matchScore: m.matchScore,
    canMakeNow: m.canMakeNow,
    have: r.ingredients
      .filter((i) => !m.missing.some((ms) => ms.ingredient_id === i.ingredient_id))
      .map((i) => ({ arabicName: i.arabic_name, emoji: i.emoji, optional: !!i.is_optional })),
    missing: m.missing.map((i) => ({
      id: i.ingredient_id,
      arabicName: i.arabic_name,
      emoji: i.emoji,
      optional: !!i.is_optional,
    })),
    aiReason: null,
    aiSubstitutions: [],
    aiExtraNote: '',
  };
}

async function getRecommendations(req, res) {
  try {
    const {
      ingredientIds = [],
      customIngredients = [],
      timeAvailable = null,
      preferences = [],
      mealCategory = null,
      useAI = true,
    } = req.body || {};

    if (!Array.isArray(ingredientIds)) {
      return res.status(400).json({ error: 'صيغة المكونات غير صحيحة.' });
    }

    // مكونات حرة كتبها المستخدم ولم تكن ضمن القائمة الجاهزة: نحاول ربطها
    // بمكوّن معروف (تطابق جزئي)؛ ما ينجح يُضاف إلى المطابقة الفعلية، وما
    // يبقى بلا تطابق يُرسل للذكاء الاصطناعي كسياق إضافي فقط دون التأثير
    // على درجة التطابق الحتمية.
    const resolvedIds = [...ingredientIds];
    const unresolvedCustom = [];
    for (const text of customIngredients) {
      const match = resolveCustomIngredient(text);
      if (match) resolvedIds.push(match.id);
      else unresolvedCustom.push(text);
    }

    const matches = findMatches({
      userIngredientIds: resolvedIds,
      timeAvailable: timeAvailable ? Number(timeAvailable) : null,
      preferenceTags: preferences,
      mealCategory,
      limit: 6,
    });

    if (matches.length === 0) {
      return res.json({ recommendations: [], aiAvailable: false, message: 'no-match' });
    }

    const results = matches.map(serializeMatch);

    let aiAvailable = false;
    if (useAI) {
      const userIngredientNames = db
        .prepare(
          `SELECT arabic_name FROM ingredients WHERE id IN (${resolvedIds.map(() => '?').join(',') || 'NULL'})`
        )
        .all(...resolvedIds)
        .map((r) => r.arabic_name)
        .concat(unresolvedCustom);

      const aiResult = await explainRecommendations({
        userIngredients: userIngredientNames,
        timeAvailable,
        preferences,
        candidateRecipes: matches,
      });

      if (aiResult && Array.isArray(aiResult.recommendations)) {
        aiAvailable = true;
        const byId = new Map(aiResult.recommendations.map((r) => [r.recipeId, r]));
        for (const item of results) {
          const ai = byId.get(item.id);
          if (ai) {
            item.aiReason = ai.reason || null;
            item.aiSubstitutions = Array.isArray(ai.substitutions) ? ai.substitutions : [];
            item.aiExtraNote = ai.extraNote || '';
          }
        }
      }
    }

    res.json({ recommendations: results, aiAvailable });
  } catch (err) {
    console.error('خطأ في /api/recommendations:', err);
    res.status(500).json({ error: 'حدث خطأ بسيط أثناء البحث عن الوصفات. حاول مرة أخرى.' });
  }
}

module.exports = { getRecommendations };
