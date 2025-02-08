const OpenAI = require("openai");
const { fetchGoogleBooks } = require("./googleBooksService");
const moodGenreMapping = require('../config/moodGenreMapping');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Extracts structured filters and a list of book titles from a user query using LLM.
 * Ensures factual accuracy by focusing on extracting search terms without hallucinating metadata.
 *
 * @param {String} userQuery - The raw user query.
 * @returns {Object} filters - The extracted filters and book titles.
 */
async function extractFilters(userQuery) {
    const prompt = `
You are an advanced AI assistant that extracts structured filters and relevant book titles from a user query for a book search.  
Ensure **no hallucinated data**—extract only real, user-mentioned information or widely recognized book titles.  

### **User Query:**  
"${userQuery}"  

### **Extraction Steps:**  
1. Correct spelling mistakes in the query this is must and first step. 
2. Identify and normalize book-related attributes:  
    - Topics/Genres (as an array, include inferred book names if applicable).  
    - Publication Year (format: "after YYYY", "before YYYY", "in YYYY", or null).  
    - Language (extract exact mention, e.g., "English", "Russian"; otherwise, null).  
    - Author (extract exact mention; otherwise, null).  
    - Minimum Rating (extract numeric rating; otherwise, null).  
    - Minimum Page Count (extract numeric count; otherwise, null).  
    - Publisher (extract exact mention; otherwise, null).  
    - ISBN (extract numeric ISBN even if written informally).  
3. **Generate a list of real, widely known books that match the query.**  
   - For common queries like "Science fiction books with high ratings," return **at least 5** well-known book suggestions.  
   - If the query mentions a title, author, or publisher, provide book suggestions based on those inputs. Limit the results to **10 book titles**.  
   - Ensure the books are well-known, critically acclaimed, or top-rated in their category.  
   - Do **not** make up book titles—only return real books.  
   
### **JSON Output Format:**  
{
  "title": "Extracted book title or null if not mentioned",
  "author": "Extracted author name or null if not mentioned",
  "topics": ["topic1", "topic2", "Well-Known Book Name (if applicable)"],
  "genre": "Extracted genre or null if not mentioned",
  "language": "Extracted language or null if not mentioned",
  "year": "after YYYY" | "before YYYY" | "in YYYY" | null,
  "minRating": 4.0 | null,
  "minPages": 300 | null,
  "publisher": "Extracted publisher or null if not mentioned",
  "isbn": "Extracted ISBN or null if not mentioned",
  "filters": ["list of specific user filters like 'top-rated', 'bestsellers', 'classic', etc."],
  "bookTitles": [
    "Dune by Frank Herbert",
    "The Three-Body Problem by Liu Cixin",
    "Neuromancer by William Gibson",
    "Book 4 by Author Name",
    "Book 5 by Author Name"
  ]  // A list of real, well-known books matching the query (5 for common queries, 10 for title/author/publisher queries)
}

Return **ONLY** the JSON output without any extra text.
`;



    try {
        const aiResponse = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [{ role: "user", content: prompt }],
        });

        const responseContent = aiResponse.choices[0].message.content.trim();
        console.log("LLM Raw Response:", responseContent);

        return JSON.parse(responseContent);
    } catch (error) {
        console.error("Error extracting filters and book titles from LLM:", error);
        return {
            title: null,
            author: null,
            topics: [],
            genre: null,
            language: null,
            year: null,
            minRating: null,
            minPages: null,
            publisher: null,
            isbn: null,
            filters: [],
            bookTitles: []
        };
    }
}

/**
 * getBooksDirect() - Directly returns Google Books results using filters 
 * extracted from the user query via the LLM.
 *
 * @param {String} userQuery - The raw user query.
 * @returns {Array} - Array of book objects returned by the Google Books API.
 */
async function getBooksDirect(userQuery) {
  // Extract filters (this function uses the LLM to parse the query)
  const filters = await extractFilters(userQuery);
  console.log("Extracted Filters for Direct Search:", filters);
  // Directly call the Google Books API without prioritized merging
  const books = await fetchGoogleBooks(filters, [], 40);
  return books;
}

/**
 * getBookRecommendations() - Combines individual title-based searches with a generic 
 * search using additional filters (topics, genre etc.) returned by the LLM. The specific 
 * title searches from the LLM's "bookTitles" property are prioritized.
 *
 * @param {String} userQuery - The raw user query.
 * @returns {Array} - Combined unique list of recommended book objects.
 */
async function getBookRecommendations(userQuery) {
  console.log(`Processing user query for recommendations: "${userQuery}"`);

  // Step 1: Extract structured filters and book titles using LLM.
  const filters = await extractFilters(userQuery);
  console.log("Extracted Filters and Book Titles:", filters);

  let prioritizedBooks = [];

  // Step 2: If LLM provided specific book titles,
  // query Google Books API for each title individually.
  if (filters.bookTitles && filters.bookTitles.length > 0) {
    for (const bookTitle of filters.bookTitles) {
      const titleSearchFilter = { ...filters };
      const titleMatch = bookTitle.match(/(.+?)\s+by\s+(.+)/i);
      if (titleMatch) {
        titleSearchFilter.title = titleMatch[1].trim();
        titleSearchFilter.author = titleMatch[2].trim();
      } else {
        titleSearchFilter.title = bookTitle.trim();
      }
      // Using maxResults=1 for each individual title search.
      const titleResult = await fetchGoogleBooks(titleSearchFilter, [], 1);
      if (titleResult && titleResult.length > 0) {
        prioritizedBooks.push(titleResult[0]);
      }
    }
  }

  // Step 3: Perform a generic search using topics/genre etc.
  const genericResults = await fetchGoogleBooks(filters, [], 40);

  // Step 4: Merge the prioritized (title-based) results with the generic results.
  const combinedResults = mergeResults(prioritizedBooks, genericResults);

  if (!combinedResults || combinedResults.length === 0) {
    console.log("No reliable book found. Returning fallback response.");
    return { error: "No matching books found. Try refining your search." };
  }

  return combinedResults;
}

/**
 * Merges two arrays of book results.
 * Prioritizes the first array (LLM title-based results) and then appends generic results.
 * Duplicates are removed based on ISBN or a combination of title and author.
 *
 * @param {Array} prioritizedBooks - Books fetched using LLM bookTitles.
 * @param {Array} genericResults - Generic search results from Google Books API.
 * @returns {Array} - Combined list of unique book results.
 */
function mergeResults(prioritizedBooks, genericResults) {
    const seen = new Set();
    const merged = [];

    // First, add the prioritized books.
    for (const book of prioritizedBooks) {
        const identifier = book.isbn || `${book.title}-${book.author}`.toLowerCase().trim();
        if (!seen.has(identifier)) {
            seen.add(identifier);
            merged.push(book);
        }
    }

    // Next, add generic search results if they aren't duplicates.
    for (const book of genericResults) {
        const identifier = book.isbn || `${book.title}-${book.author}`.toLowerCase().trim();
        if (!seen.has(identifier)) {
            seen.add(identifier);
            merged.push(book);
        }
    }
    return merged;
}

/**
 * getBooksByMood() - Returns mood-based book recommendations by performing individual searches for each mood genre.
 *
 * @param {String} mood - The user-selected mood.
 * @returns {Array} - Array of unique book objects from each genre matching the provided mood.
 */
async function getBooksByMood(mood) {
    if (!mood || !moodGenreMapping[mood]) {
        throw new Error("Invalid mood provided");
    }
    
    const genres = moodGenreMapping[mood];

    // For each genre in the mood, execute a search. Adjust maxResults per genre if needed.
    const resultsArrays = await Promise.all(
        genres.map(async (genre) => {
            const filters = { genre };  // Using the "genre" field in our query
            return await fetchGoogleBooks(filters, [], 10);
        })
    );

    // Combine all results into one array
    const combinedResults = resultsArrays.flat();

    // Deduplicate results based on ISBN or a combination of title and author
    const uniqueMap = new Map();
    combinedResults.forEach(book => {
        const identifier = book.isbn || `${book.title}-${book.author}`.toLowerCase().trim();
        if (!uniqueMap.has(identifier)) {
            uniqueMap.set(identifier, book);
        }
    });

    return Array.from(uniqueMap.values());
}

module.exports = { getBooksDirect, getBookRecommendations, extractFilters, getBooksByMood };
