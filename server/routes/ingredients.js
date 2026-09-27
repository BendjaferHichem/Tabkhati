const express = require('express');
const router = express.Router();
const { listIngredients } = require('../controllers/ingredientsController');

router.get('/', listIngredients);

module.exports = router;
