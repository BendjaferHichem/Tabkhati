// server/database/db.js
// إعداد قاعدة البيانات (SQLite) — تُستخدم SQLite لأنها لا تحتاج خادم منفصل،
// وتعمل مباشرة من ملف واحد، وهو الخيار الأنسب لمشروع يمكن تشغيله ونشره بسهولة
// دون الحاجة لإعداد قاعدة بيانات خارجية.

const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DATABASE_URL || path.join(__dirname, 'tabkhty.db');
const isVercel = Boolean(process.env.VERCEL);

// على Vercel: نظام الملفات للقراءة فقط أثناء التشغيل، والقاعدة مُهيّأة
// ومملوءة مسبقاً (عبر npm run seed محلياً قبل الرفع). محلياً: قراءة وكتابة
// كالمعتاد للسماح بـ npm run seed.
const db = new Database(DB_PATH, isVercel ? { readonly: true, fileMustExist: true } : {});

if (!isVercel) {
  db.pragma('journal_mode = WAL');
}
db.pragma('foreign_keys = ON');

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ingredients (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT NOT NULL UNIQUE,      -- المعرف الداخلي (إنجليزي، slug)
      arabic_name   TEXT NOT NULL,
      emoji         TEXT DEFAULT '',
      category      TEXT NOT NULL,             -- خضروات، لحوم، ألبان وبيض، حبوب ونشويات، معلبات، أساسيات
      is_staple     INTEGER DEFAULT 0          -- 1 = مكوّن أساسي متوفر غالباً (ملح، زيت..)
    );

    CREATE TABLE IF NOT EXISTS recipes (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      name              TEXT NOT NULL,          -- الاسم بالإنجليزية (داخلي/SEO)
      arabic_name       TEXT NOT NULL,
      description       TEXT NOT NULL,
      preparation_time  INTEGER NOT NULL,       -- بالدقائق
      cooking_time      INTEGER NOT NULL,       -- بالدقائق
      total_time        INTEGER NOT NULL,       -- بالدقائق
      difficulty        TEXT NOT NULL,          -- سهلة، متوسطة، صعبة
      category          TEXT NOT NULL,          -- فطور، غداء، عشاء، سناك
      tags              TEXT NOT NULL DEFAULT '[]', -- JSON array: نباتي، اقتصادي...
      instructions      TEXT NOT NULL DEFAULT '[]', -- JSON array من الخطوات
      image_emoji       TEXT DEFAULT '🍽️',
      image_url         TEXT DEFAULT NULL,      -- رابط صورة حقيقية اختياري (يُستخدم إن وُجد، وإلا يُستخدم بديل بصري)
      estimated_cost    TEXT NOT NULL DEFAULT 'متوسط', -- اقتصادي / متوسط / مرتفع
      servings          INTEGER NOT NULL DEFAULT 2,
      popularity        INTEGER NOT NULL DEFAULT 50 -- 0-100، تُستخدم في الترتيب
    );

    CREATE TABLE IF NOT EXISTS recipe_ingredients (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      recipe_id      INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
      ingredient_id  INTEGER NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
      quantity       TEXT NOT NULL DEFAULT '',  -- نص وصفي مثل "2 حبة" أو "كوب"
      is_optional    INTEGER NOT NULL DEFAULT 0 -- 1 = مكوّن اختياري لا يقلل نسبة التطابق كثيراً
    );

    CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);
    CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_ingredient ON recipe_ingredients(ingredient_id);
  `);
}

if (!isVercel) {
  initSchema();
}

module.exports = db;