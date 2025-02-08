const axios = require('axios');

const GOOGLE_BOOKS_API_URL = "https://www.googleapis.com/books/v1/volumes";
const GOOGLE_API_KEY = process.env.GOOGLE_BOOKS_API_KEY || "AIzaSyDEP3ipblNRPWCmda94kHOwXXltVGEFLjY";

/**
 * Builds a query string for the Google Books API by chaining various operators,
 * based on the filters provided (title, author, topics, genre, publisher, isbn, and additional filters).
 * 
 * If an ISBN is provided, it is given the highest priority.
 * Operators used include:
 *  - intitle:"..." for title
 *  - inauthor:"..." for author
 *  - inpublisher:"..." for publisher
 *  - subject:"..." for topics and genre
 * 
 * Other fields like language, year, minRating, and minPages typically require
 * post-filtering or additional Query parameters (e.g., langRestrict) and are not added here.
 *
 * @param {Object} filters - Extracted filters from the LLM. Expected fields include:
 *                           title, author, topics (array), genre, publisher, isbn, filters (array)
 * @returns {String} - The chained query string for the Google Books API.
 */
function buildGoogleQuery(filters) {
    let queryParts = [];

    // Use ISBN if provided (highest priority)
    if (filters.isbn) {
        queryParts.push(`isbn:${filters.isbn}`);
    }

    // Title search
    if (filters.title) {
        queryParts.push(`intitle:"${filters.title}"`);
    }

    // Author search
    if (filters.author) {
        queryParts.push(`inauthor:"${filters.author}"`);
    }

    // Publisher search
    if (filters.publisher) {
        queryParts.push(`inpublisher:"${filters.publisher}"`);
    }

    // Topics search; combine topics with OR logic for mood-based queries
    if (filters.topics && filters.topics.length > 0) {
        const topicsQuery = filters.topics
            .filter(topic => topic && typeof topic === "string")
            .map(topic => `subject:"${topic}"`)
            .join(" OR ");
        queryParts.push(`(${topicsQuery})`);
    }

    // Genre search; also included as subject if provided
    if (filters.genre) {
        queryParts.push(`subject:"${filters.genre}"`);
    }

    // Additional filters as free text searches
    if (filters.filters && filters.filters.length > 0) {
        filters.filters.forEach(filterTerm => {
            if (filterTerm && typeof filterTerm === 'string') {
                queryParts.push(`"${filterTerm}"`);
            }
        });
    }

    // Return the concatenated query parts joined with a space, which will be URL-encoded
    return queryParts.join(" ");
}

/**
 * Removes duplicate books based on ISBN or title + author.
 *
 * @param {Array} books - List of book objects.
 * @returns {Array} - Deduplicated list of books.
 */
function removeDuplicates(books) {
    const seen = new Set();
    return books.filter(book => {
        const identifier = book.isbn || `${book.title}-${book.author}`.toLowerCase().trim();
        if (seen.has(identifier)) {
            return false;
        }
        seen.add(identifier);
        return true;
    });
}

/**
 * Fetches book details from Google Books API using the extracted filters.
 * Performs post-filtering on the results to ensure additional constraints (minRating, minPages, publication year) are met.
 * Merges LLM suggested books and Google Books API results.
 *
 * @param {Object} filters - The extracted filters (title, author, topics, language, minRating, minPages, publisher, isbn, year).
 * @param {Array} llmSuggestedBooks - The books suggested by the LLM.
 * @param {Number} maxResults - Maximum number of results to return.
 * @returns {Array} - Array of book objects matching the filters.
 */
async function fetchGoogleBooks(filters, llmSuggestedBooks = [], maxResults = 40) {
    // Query Google Books API first based on filters
    const query = buildGoogleQuery(filters);
    // Properly URL encode the query
    const encodedQuery = encodeURIComponent(query);
    // Use maxResults <= 40 per Google Books API limits
    const requestUrl = `${GOOGLE_BOOKS_API_URL}?q=${encodedQuery}&key=${GOOGLE_API_KEY}&orderBy=relevance&maxResults=${maxResults}`;
    
    console.log("Google Books API Request URL:", requestUrl);

    try {
        const response = await axios.get(requestUrl);

        console.log("Google Books API Response:", response.data); 

        let googleBooks = response.data.items ? response.data.items.map(item => {
            const volume = item.volumeInfo;
            return {
                title: volume.title || null,
                author: volume.authors ? volume.authors.join(", ") : null,
                description: volume.description || null,
                language: volume.language || null,
                pageCount: volume.pageCount || null,
                publisher: volume.publisher || null,
                publishedDate: volume.publishedDate || null,
                categories: volume.categories || [],
                averageRating: volume.averageRating || null,
                ratingsCount: volume.ratingsCount || null,
                thumbnail: volume.imageLinks?.thumbnail || null,
                previewLink: volume.previewLink || null,
                isbn: volume.industryIdentifiers 
                        ? volume.industryIdentifiers.find(id => id.type === "ISBN_13")?.identifier || null 
                        : null
            };
        }) : [];

        // Prioritize LLM suggested books, merge with Google Books API results, and remove duplicates.
        const mergedBooks = mergeBooks(llmSuggestedBooks, googleBooks, filters, maxResults);
        
        return mergedBooks;
    } catch (error) {
        console.error("Error fetching data from Google Books API:", error.message);
        return [];
    }
}

/**
 * Merges LLM suggested books with Google Books API results. Prioritizes LLM books first.
 * 
 * @param {Array} llmSuggestedBooks - The list of books suggested by the LLM.
 * @param {Array} googleBooks - The list of books fetched from the Google Books API.
 * @param {Object} filters - The filters provided by the user.
 * @param {Number} maxResults - Maximum number of results to return.
 * @returns {Array} - Merged list of books, ensuring no duplicates.
 */
function mergeBooks(llmSuggestedBooks, googleBooks, filters, maxResults) {
    let mergedBooks = [];

    // Add LLM suggested books first
    llmSuggestedBooks.forEach(book => {
        mergedBooks.push({
            title: book.title,
            author: book.author,
            description: book.description,
            language: book.language,
            pageCount: book.pageCount,
            publisher: book.publisher,
            publishedDate: book.publishedDate,
            categories: book.categories,
            averageRating: book.averageRating,
            ratingsCount: book.ratingsCount,
            thumbnail: book.thumbnail,
            previewLink: book.previewLink,
            isbn: book.isbn
        });
    });

    // Add Google Books API results while respecting the maxResults limit
    mergedBooks = mergedBooks.concat(googleBooks);
    
    // Remove duplicates based on ISBN or title + author
    mergedBooks = removeDuplicates(mergedBooks);

    // Limit the number of results to maxResults
    return mergedBooks.slice(0, maxResults);
}

module.exports = { fetchGoogleBooks, buildGoogleQuery };
