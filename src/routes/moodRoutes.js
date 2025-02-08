const express = require("express");
const router = express.Router();
const { moodBasedRecommendation } = require("../controllers/moodController");

/**
 * GET /mood/:mood
 * Returns book recommendations based on the provided mood.
 */
router.get("/:mood", moodBasedRecommendation);

module.exports = router; 