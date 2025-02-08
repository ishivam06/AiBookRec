import OpenAI from "openai";
import Book from "../models/Book.js";
import axios from "axios";
import Fuse from "fuse.js"; // Fuzzy matching library

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Extracts book details from a user query using LLM,
 * searches the local database first, and if not found, queries Google Books API.
 */
async function getBookRecommendations(userQuery) {
    try {
        // Step 1: LLM Prompt for extracting filters
        const prompt = `
        You are an advanced AI assistant that extracts structured filters from a user query for a book search.  
        The user query is: "${userQuery}"  

        ### Steps:  
        1. **Correct Spelling Mistakes**: Ensure the query has proper spelling and grammar.  
        2. **Detect and Reconstruct Jumbled Words**: If the query contains mixed-up words, intelligently guess the correct book title.  
        3. **Book Name Guessing**: If a book name is guessed, include it in the "topics" field to improve search accuracy.  
        4. **Extract and Normalize Details**: Identify key attributes while maintaining consistency in formatting.  
        5. **Identify ISBN Variations**: Extract valid ISBN numbers, even if they are entered incorrectly or as a standalone number.  
        6. **Ensure Data Validity**: The output must strictly follow JSON format without additional text.  

        ### Extract the Following Details:
          - **Topics/Genres** (as an array, including guessed book names if applicable).  
          - **Publication Year** (if mentioned, e.g., "after 2020", "before 2000", "in 1869"; otherwise, null).  
          - **Language** (if mentioned, e.g., "English", "Russian"; otherwise, null).  
          - **Author** (if mentioned; otherwise, null).  
          - **Minimum Rating** (if mentioned; otherwise, null).  
          - **Minimum Page Count** (if mentioned; otherwise, null).  
          - **Publisher** (if mentioned; otherwise, null).  
          - **ISBN** (if mentioned, extract it even if the user provides only numbers or a string of digits).  

        ### Expected JSON Output:
        Return only the following structured JSON data:  
        {
          "topics": [ "topic1", "topic2", "Guessed Book Name (if applicable)" ],
          "year": "after 2020" | "before 2000" | "in 1869" | null,
          "language": "Russian" | null,
          "author": "Leo Tolstoy" | null,
          "minRating": 4.0 | null,
          "minPages": 300 | null,
          "publisher": "Penguin Classics" | null,
          "isbn": "9780140447934" | null
        }

        ### Important Rules:
        - **Return only the JSON output.**  
        - **Do not include any additional text, explanations, or formatting characters.**  
        - **Ensure the JSON is valid and well-formatted.**  
        `;
        
        // Step 1: Get response from LLM
        const aiResponse = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [{ role: "user", content: prompt }],
        });

        const responseContent = aiResponse.choices[0].message.content.trim();
        console.log("LLM Raw Response:", responseContent);

        let filters;
        try {
            filters = JSON.parse(responseContent);
        } catch (parseError) {
            console.error("Failed to parse JSON from LLM response:", parseError);
            filters = { topics: [], year: null, language: null, author: null, minRating: null, minPages: null, publisher: null, isbn: null };
        }

        const { topics, year, language, author, minRating, minPages, publisher, isbn } = filters;

        // Step 2: Build MongoDB query (without using topics for searching now)
        let mongoQuery = {};

        if (isbn) {
            mongoQuery["isbn"] = isbn; // Direct search by ISBN
        } else {
            if (year) mongoQuery["publicationYear"] = parseYearFilter(year);
            if (language) mongoQuery["language"] = language;
            if (author) mongoQuery["author"] = { $regex: new RegExp(author, "i") };
            if (minRating) mongoQuery["rating"] = { $gte: parseFloat(minRating) };
            if (minPages) mongoQuery["pageCount"] = { $gte: parseInt(minPages) };
            if (publisher) mongoQuery["publisher"] = { $regex: new RegExp(publisher, "i") };
        }

        // Step 3: Fetch results from MongoDB
        const books = await Book.find(mongoQuery).limit(10);

        // If books found in the database, apply fuzzy logic to improve matching
        if (books.length > 0) {
            const fuzzyBooks = applyFuzzyMatching(books, filters);
            const confidenceScore = calculateConfidenceScore(fuzzyBooks, filters);
            if (confidenceScore > 60) {
                return fuzzyBooks; // Return fuzzy matched books if confidence is high
            }
        }

        // Step 4: Fallback to Google Books API if no books found locally or confidence is low
        const googleBooks = await fetchGoogleBooks(filters);
        return googleBooks.length > 0 ? googleBooks : { message: "No books found in our database or Google Books." };

    } catch (error) {
        console.error("Error in getBookRecommendations:", error);
        return { error: "Failed to process request" };
    }
}

// Helper function to apply fuzzy matching
function applyFuzzyMatching(books, filters) {
    const fuse = new Fuse(books, {
        keys: ['title', 'author', 'publisher'],
        threshold: 0.4, // Adjust threshold for fuzzy matching
    });

    return fuse.search(filters.topics?.join(" ") || "").map(result => result.item);
}

// Function to calculate confidence score
function calculateConfidenceScore(books, filters) {
    let score = 0;
    books.forEach(book => {
        let matchCount = 0;
        
        // Ensure book.genres exists before trying to access it
        if (filters.topics && book.genres && book.genres.some(genre => filters.topics.includes(genre))) matchCount++;
        if (filters.author && book.author.toLowerCase().includes(filters.author.toLowerCase())) matchCount++;
        if (filters.isbn && book.isbn === filters.isbn) matchCount++;

        // Adjust score based on matches
        score += (matchCount / 3) * 100;
    });
    return score / books.length;
}

// Step 5: Fetch data from Google Books API if not found in MongoDB
async function fetchGoogleBooks(filters) {
    const query = buildGoogleQuery(filters);
    try {
        const response = await axios.get(`https://www.googleapis.com/books/v1/volumes`, {
            params: {
                q: query,
                key: process.env.GOOGLE_BOOKS_API_KEY, // Your Google API Key
                maxResults: 10,
            },
        });

        // Extract relevant data from Google Books API response
        return response.data.items?.map(item => {
            const volumeInfo = item.volumeInfo;
            return {
                title: volumeInfo.title,
                author: volumeInfo.authors?.join(", "),
                genre: volumeInfo.categories?.join(", "),
                language: volumeInfo.language,
                publisher: volumeInfo.publisher,
                publicationYear: volumeInfo.publishedDate?.substring(0, 4),
                isbn: volumeInfo.industryIdentifiers?.find(id => id.type === "ISBN_13")?.identifier || null,
                userRating: volumeInfo.averageRating || null, // User Rating
                ratingsCount: volumeInfo.ratingsCount || 0,  // Number of Reviews
                coverImageUrl: volumeInfo.imageLinks?.thumbnail || null, // Book Cover Image URL
            };
        }) || [];
    } catch (error) {
        console.error("Error fetching data from Google Books API:", error);
        return [];
    }
}


// Function to remove duplicate books based on ISBN or Title
function removeDuplicates(books) {
    const seen = new Set();
    return books.filter(book => {
        const identifier = book.isbn || book.title; // Use ISBN first, then title
        if (seen.has(identifier)) {
            return false; // Skip duplicate
        } else {
            seen.add(identifier);
            return true; // Include this book
        }
    });
}

// Helper function to build Google Books API query
function buildGoogleQuery(filters) {
    let query = [];
    if (filters.isbn) query.push(`isbn:${filters.isbn}`);
    if (filters.topics?.length) query.push(filters.topics.join(" "));
    if (filters.author) query.push(`inauthor:${filters.author}`);
    if (filters.publisher) query.push(`inpublisher:${filters.publisher}`);
    if (filters.language) query.push(`langRestrict=${filters.language}`);
    return query.join("+");
}

export { getBookRecommendations };
 