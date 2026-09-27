// server/database/db.js
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const isVercel = Boolean(process.env.VERCEL);

// Original location of the bundled database file
const sourceDbPath = process.env.DATABASE_URL || path.join(__dirname, 'tabkhty.db');

let DB_PATH = sourceDbPath;

if (isVercel) {
  // Path in Vercel's writable temporary filesystem
  const targetDbPath = path.join('/tmp', 'tabkhty.db');

  // Copy the database file to /tmp if it doesn't exist there yet
  if (!fs.existsSync(targetDbPath)) {
    if (fs.existsSync(sourceDbPath)) {
      fs.copyFileSync(sourceDbPath, targetDbPath);
    } else {
      console.error(`Database file not found at ${sourceDbPath}`);
    }
  }
  DB_PATH = targetDbPath;
}

// Connect to SQLite
const db = new Database(DB_PATH, isVercel ? { readonly: true, fileMustExist: true } : {});

if (!isVercel) {
  db.pragma('journal_mode = WAL');
}
db.pragma('foreign_keys = ON');

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ingredients (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT NOT NULL UNIQUE,
      arabic_name   TEXT NOT NULL,
      emoji         TEXT DEFAULT '',
      category      TEXT NOT NULL,
      is_staple     INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS recipes (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      name              TEXT NOT NULL,
      arabic_name       TEXT NOT NULL,
      description       TEXT NOT NULL,
      preparation_time  INTEGER NOT NULL,
      cooking_time      INTEGER NOT NULL,
      total_time        INTEGER NOT NULL,
      difficulty        TEXT NOT NULL,
      category          TEXT NOT NULL,
      tags              TEXT NOT NULL DEFAULT '[]',
      instructions      TEXT NOT NULL DEFAULT '[]',
      image_emoji       TEXT DEFAULT '🍽️',
      image_url         TEXT DEFAULT NULL,
      estimated_cost    TEXT NOT NULL DEFAULT 'متوسط',
      servings          INTEGER NOT NULL DEFAULT 2,
      popularity        INTEGER NOT NULL DEFAULT 50
    );

    CREATE TABLE IF NOT EXISTS recipe_ingredients (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      recipe_id      INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
      ingredient_id  INTEGER NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
      quantity       TEXT NOT NULL DEFAULT '',
      is_optional    INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);
    CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_ingredient ON recipe_ingredients(ingredient_id);
  `);
}

if (!isVercel) {
  initSchema();
}

module.exports = db;