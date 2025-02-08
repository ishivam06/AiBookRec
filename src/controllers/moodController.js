const { getBooksByMood } = require("../services/llmService");

/**
 * Controller: moodBasedRecommendation()
 * Handles requests for mood-based book recommendations.
 * Expects a `mood` parameter in the URL.
 */
const moodBasedRecommendation = async (req, res, next) => {
    try {
        const { mood } = req.params;
        const books = await getBooksByMood(mood);
        res.status(200).json({ results: books });
    } catch (error) {
        console.error("Error in moodBasedRecommendation:", error.message);
        res.status(500).json({ message: error.message || "Failed to get mood based recommendations" });
    }
};

module.exports = { moodBasedRecommendation }; 