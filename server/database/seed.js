// server/database/seed.js
// يملأ قاعدة البيانات بالمكونات والوصفات الأولية. شغّله عبر: npm run seed

const db = require('./db');
const ingredients = require('../../data/ingredients');
const recipes = require('../../data/recipes');

function seed() {
  const clear = db.transaction(() => {
    db.exec('DELETE FROM recipe_ingredients; DELETE FROM recipes; DELETE FROM ingredients;');
  });
  clear();

  const insertIngredient = db.prepare(`
    INSERT INTO ingredients (name, arabic_name, emoji, category, is_staple)
    VALUES (@name, @arabic_name, @emoji, @category, @is_staple)
  `);

  const ingredientIdBySlug = {};
  const insertAllIngredients = db.transaction((rows) => {
    for (const row of rows) {
      const info = insertIngredient.run({
        name: row.name,
        arabic_name: row.arabic_name,
        emoji: row.emoji || '',
        category: row.category,
        is_staple: row.is_staple ? 1 : 0,
      });
      ingredientIdBySlug[row.name] = info.lastInsertRowid;
    }
  });
  insertAllIngredients(ingredients);

  const insertRecipe = db.prepare(`
    INSERT INTO recipes (
      name, arabic_name, description, preparation_time, cooking_time, total_time,
      difficulty, category, tags, instructions, image_emoji, image_url, estimated_cost, servings, popularity
    ) VALUES (
      @name, @arabic_name, @description, @preparation_time, @cooking_time, @total_time,
      @difficulty, @category, @tags, @instructions, @image_emoji, @image_url, @estimated_cost, @servings, @popularity
    )
  `);

  const insertRecipeIngredient = db.prepare(`
    INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, is_optional)
    VALUES (?, ?, ?, ?)
  `);

  const insertAllRecipes = db.transaction((rows) => {
    let missing = new Set();
    for (const r of rows) {
      const info = insertRecipe.run({
        name: r.name,
        arabic_name: r.arabic_name,
        description: r.description,
        preparation_time: r.preparation_time,
        cooking_time: r.cooking_time,
        total_time: r.total_time,
        difficulty: r.difficulty,
        category: r.category,
        tags: JSON.stringify(r.tags || []),
        instructions: JSON.stringify(r.instructions || []),
        image_emoji: r.image_emoji || '🍽️',
        image_url: r.image_url || null,
        estimated_cost: r.estimated_cost || 'متوسط',
        servings: r.servings || 2,
        popularity: r.popularity || 50,
      });
      const recipeId = info.lastInsertRowid;
      for (const ing of r.ingredients) {
        const ingId = ingredientIdBySlug[ing.slug];
        if (!ingId) {
          missing.add(ing.slug);
          continue;
        }
        insertRecipeIngredient.run(recipeId, ingId, ing.quantity || '', ing.optional ? 1 : 0);
      }
    }
    if (missing.size) {
      console.warn('⚠️  مكونات غير موجودة في القائمة الرئيسية:', [...missing].join(', '));
    }
  });
  insertAllRecipes(recipes);

  const ingCount = db.prepare('SELECT COUNT(*) AS c FROM ingredients').get().c;
  const recCount = db.prepare('SELECT COUNT(*) AS c FROM recipes').get().c;
  console.log(`✅ تم إدخال ${ingCount} مكوّناً و ${recCount} وصفة بنجاح.`);
}

seed();
