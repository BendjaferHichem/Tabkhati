const express = require('express');
const router = express.Router();
const { listRecipes, getRecipe, getRandomRecipe } = require('../controllers/recipesController');

router.get('/', listRecipes);
router.get('/random', getRandomRecipe); // يجب أن يسبق '/:id' وإلا سيُفسَّر "random" كمعرّف
router.get('/:id', getRecipe);

module.exports = router;
