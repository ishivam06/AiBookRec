const { getBooksDirect, getBookRecommendations } = require("../services/llmService");

/**
 * Controller: directSearch()
 * Handles natural language search requests.
 * Uses LLM to process query into filters and then directly gets results from Google Books API.
 */
const directSearch = async (req, res) => {
  const { query } = req.body;
  if (!query) {
    return res.status(400).json({ message: "Query is required" });
  }
  try {
    const books = await getBooksDirect(query);
    return res.status(200).json({ results: books });
  } catch (error) {
    console.error("Error in directSearch:", error.message);
    return res.status(500).json({ message: "Failed to process query" });
  }
};

/**
 * Controller: recommendationSearch()
 * Handles requests for recommendations.
 * Uses the LLM to generate extra book title searches, then merges individual title results 
 * with a general search.
 */
const recommendationSearch = async (req, res) => {
  const { query } = req.body;
  if (!query) {
    return res.status(400).json({ message: "Query is required" });
  }
  try {
    const recommendations = await getBookRecommendations(query);
    return res.status(200).json({ results: recommendations });
  } catch (error) {
    console.error("Error in recommendationSearch:", error.message);
    return res.status(500).json({ message: "Failed to process query" });
  }
};

module.exports = { directSearch, recommendationSearch };
