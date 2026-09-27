const db = require('../database/db');

function listIngredients(req, res) {
  const search = (req.query.q || '').trim();
  let rows;
  if (search) {
    rows = db
      .prepare('SELECT * FROM ingredients WHERE arabic_name LIKE ? OR name LIKE ? ORDER BY arabic_name')
      .all(`%${search}%`, `%${search}%`);
  } else {
    rows = db.prepare('SELECT * FROM ingredients ORDER BY category, arabic_name').all();
  }
  res.json({ ingredients: rows });
}

module.exports = { listIngredients };
