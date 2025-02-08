const express = require("express");
const { directSearch, recommendationSearch } = require("../controllers/llmController");

const router = express.Router();

// Route for a normal search (Google Books API results directly)
router.post("/search", directSearch);

// Route for recommendations (with prioritized LLM bookTitle searches)
router.post("/recommend", recommendationSearch);

module.exports = router;
