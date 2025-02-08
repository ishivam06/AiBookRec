# Book Recommendation and Wishlist Management System

## Introduction

This project is a comprehensive ai book recommendation and wishlist management system that seamlessly combines modern natural language processing (NLP) techniques with robust backend services. The system is designed to serve several key user needs:

1. **Natural Language Search & Recommendations**  
   Users can enter free-form queries to receive personalized book recommendations. Leveraging a large language model (LLM), the application extracts structured search filters from natural language queries before invoking the Google Books API to retrieve details of relevant books. The system differentiates between direct search and recommendation modes by separating explicit title-based queries from more generic book suggestions.

2. **Wishlist & Favorites Management**  
   Logged-in users have the ability to save books they like into their personal wishlist. The wishlist feature supports adding, updating, removing, and sharing items, which enables users to bookmark titles and manage their reading collections effectively.

3. **Mood-Based Recommendations**  
   A unique aspect of this project is the mood-based recommendation feature. Using a mapping between user moods and book genres (for example, "happy," "sad," "adventurous," etc.), the system dynamically provides recommendations that cater to the user's current emotional state. Each mood maps to several relevant genres, and the system queries the Google Books API separately for each genre to ensure a diverse and comprehensive list of suggestions.

## Project Architecture

The project follows a modular architecture using Node.js and Express on the backend and MongoDB for persistent storage. The architecture is divided into several layers:

- **Models:**  
  MongoDB schemas define the data structures for users, books, and wishlist items.

- **Services:**  
  Business logic and integrations reside in service files. Two primary services are the LLM service (handling natural language queries and mood-based searches) and the Google Books service (responsible for constructing queries to the external API).

- **Controllers:**  
  Controllers act as the interface between HTTP requests and service logic. They process incoming data, invoke the appropriate service functions, and return responses.

- **Routes:**  
  Express routes map HTTP endpoints to controller functions. This layer also integrates middleware such as authentication to secure certain endpoints.

- **Configuration:**  
  The project uses configuration files—such as the mood-to-genres mapping configuration—to drive specific functionalities in the system.

## Models

### User Model (`src/models/User.js`)
- **Purpose:**  
  Manages user account data.
- **Details:**  
  Includes fields such as name, email, password, and role. Passwords are hashed using bcrypt in a pre-save hook for security.
- **Features:**  
  Enforces unique email addresses and provides basic validation for user information.

### Book Model (`src/models/Book.js`)
- **Purpose:**  
  Stores comprehensive details about books available in the system.
- **Details:**  
  The schema includes fields like title, author, description, genre, publication year, ratings, page count, language, publisher, cover image URL, and ISBN.
- **Indexing:**  
  Full-text and specific field indexes ensure efficient querying, especially during searches.

### Wishlist Model (`src/models/Wishlist.js`)
- **Purpose:**  
  Connects users with the books they want to save.
- **Details:**  
  Contains references to both the `User` and `Book` models, along with metadata like category and order to organize wishlist items.
- **Usage:**  
  Supports CRUD operations on wishlists, enabling users to add, update, remove, and share their favorite books.

## Services

### Wishlist Service (`src/services/wishlistService.js`)
- **Responsibilities:**  
  Implements all business logic related to wishlist management:
  - **Add to Wishlist:** Validates a book's existence, prevents duplicates, and then adds it to the user's wishlist.
  - **Remove from Wishlist:** Deletes a specific book from the wishlist.
  - **Update Wishlist Item:** Allows updating metadata (such as the category or order of items).
  - **Get Wishlist:** Retrieves a user's wishlist and populates book details.
  - **Share Wishlist:** Generates shareable links for wishlist sharing.
- **Benefits:**  
  Encapsulates wishlist-related logic, making it easy to maintain and test.

### Google Books Service (`src/services/googleBooksService.js`)
- **Responsibilities:**  
  Facilitates integration with the Google Books API:
  - **Query Building:**  
    Constructs the API query using filters such as title, author, publisher, category (subject), and free text constraints. Adjustments have been made to use OR logic for topics and to support separate queries when needed for mood-based searches.
  - **Fetching Books:**  
    Sends HTTP requests to the API with the constructed query and processes the resulting data.
  - **Deduplication:**  
    Removes duplicate results using ISBN or a combination of title and author.
- **Challenges & Solutions:**  
  Initially, combined subject filters were too restrictive. The approach was later modified to perform multiple queries (each targeting a single genre in mood-based searches) and then merge the results.

### LLM Service (`src/services/llmService.js`)
- **Responsibilities:**  
  Serves as the central hub for natural language processing and recommendation logic:
  - **Extracting Filters:** Uses an LLM to parse natural language queries into a structured format that includes key filtering criteria (e.g., topics, publication year, and author).
  - **Direct Search:** Converts user queries into API calls by extracting filters and then searching the Google Books API.
  - **Recommendation Search:** Merges explicit title suggestions from the LLM with generic filter-based searches for enhanced recommendations.
  - **Mood-Based Recommendations:**  
    The new function `getBooksByMood` uses the mood-genre mapping to perform separate queries for each genre associated with a user's mood. It then aggregates and deduplicates the results for a final recommendation list.
- **Integration:**  
  Interacts with both the Google Books API (through the Google Books service) and the mood mapping configuration file.

## Controllers

### Wishlist Controller (`src/controllers/wishlistController.js`)
- **Responsibilities:**  
  Manages HTTP requests related to the wishlist feature:
  - Fetches the current user's wishlist.
  - Adds books to the wishlist.
  - Updates or removes specific items.
  - Provides shareable links for the wishlist.
- **Security:**  
  Uses authentication middleware to ensure only logged-in users can manage their wishlist.

### LLM Controller (`src/controllers/llmController.js`)
- **Responsibilities:**  
  Handles requests for natural language search and recommendation features:
  - Processes direct searches by extracting filters through the LLM service.
  - Combines explicit title searches with generic recommendations and returns a consolidated list.
- **Error Handling:**  
  Robust error handling mechanisms ensure that any issues during processing or API calls are logged and return appropriate responses.

### Mood Controller (`src/controllers/moodController.js`)
- **Responsibilities:**  
  Dedicated to mood-based recommendation requests:
  - Extracts the mood from URL parameters.
  - Invokes the LLM service's `getBooksByMood` function to fetch recommendations.
  - Returns a final deduplicated list of books that match the user's mood.
- **User Impact:**  
  Enhances user experience by providing emotionally resonant recommendations that match the user's current state.

## Routes

### Wishlist Routes (`src/routes/wishlistRoutes.js`)
- **Endpoints:**
  - `GET /wishlist` – Retrieves the current user's wishlist.
  - `POST /wishlist` – Adds a new book to the wishlist.
  - `PUT /wishlist/:bookId` – Updates metadata for a specific wishlist item.
  - `DELETE /wishlist/:bookId` – Removes a book from the wishlist.
  - `GET /wishlist/share` – Generates a shareable link for the wishlist.
- **Security:**  
  Protected by authentication middleware to limit access to authenticated users.

### LLM Routes (`src/routes/llmRoutes.js`)
- **Endpoints:**
  - `POST /llm/search` – Performs a direct search based on a natural language query using the LLM and then calls the Google Books API.
  - `POST /llm/recommend` – Fetches recommendations by combining identified book titles with generic filters derived from the LLM.
- **Design:**  
  These endpoints serve to enhance the search experience by leveraging natural language processing.

### Mood Routes (`src/routes/moodRoutes.js`)
- **Endpoint:**
  - `GET /mood/:mood` – Returns book recommendations tailored to a specific mood.
- **Implementation:**  
  Extracts the mood from the URL, then calls the LLM service to run separate queries per genre (specific to the mood) and merge the results.

## Configuration

### Mood-Genre Mapping (`src/config/moodGenreMapping.js`)
- **Purpose:**  
  Defines the mapping between various moods (e.g., happy, sad, adventurous) and arrays of relevant book genres.
- **Details:**  
  For example, the "happy" mood includes genres like `Comedy`, `Light Fiction`, `Feel-Good Fiction`, `Romantic Comedy`, and `Uplifting`. Other moods are similarly defined to support context-specific recommendations.
- **Usage:**  
  Imported by the LLM service to drive the logic of mood-based book recommendations.

## Integration with the Google Books API

At the core of the project's search functionality is the integration with the Google Books API. The approach includes:

- **Query Construction:**  
  The Google Books service builds a query string that encompasses various filters (title, author, publisher, subjects) provided by the LLM service. Adjustments have been made over time to ensure that filtering conditions are not overly restrictive.
  
- **API Request & Response:**  
  The service sends HTTP GET requests with properly encoded query
  strings to the Google Books API. It logs the request URL for debugging, captures the responses, and processes the returned book data.
  
- **Result Processing:**  
  Once returned, the book data is processed, and results are deduplicated (using ISBN or a concatenation of title and author), ensuring that duplicate entries are not presented to the user even when multiple queries are combined (as in mood-based recommendations).

## Feature Highlights & User Experience

### Natural Language Search and Recommendations
- **AI-Powered Query Parsing:**  
  When users enter a free-form query, the LLM service extracts relevant filters (such as topics, publication years, authors) and corrects spelling errors.
- **Layered Recommendations:**  
  The system supports both direct searches and enhanced recommendations. For enhanced recommendations, explicit title-based searches are merged with generic filter results to provide a comprehensive suggestion list.

### Wishlist Management
- **User-Friendly Bookmarking:**  
  Allowing users to simply add favorites to their wishlist enhances the onboarding and engagement process.
- **Organized Reading Lists:**  
  Users can categorize and arrange their wishlists, making it easier to manage longer reading lists.
- **Social Sharing:**  
  A built-in share functionality lets users effortlessly share their wishlist on social media or with friends.

### Mood-Based Recommendations
- **Contextual & Emotional Relevance:**  
  The system uses mood-based mapping to deliver book suggestions that match a user's current emotional state. This enhances both intimacy and personalization.
- **Multiple Genre-Based Queries:**  
  Instead of constructing one overly restrictive query, the system executes individual searches for each genre associated with the selected mood. The results are then merged and deduplicated, ensuring users receive a rich and diverse set of recommendations.

## Conclusion

This project stands as a robust, user-friendly solution for personalized book recommendations and wishlist management. Its key strengths include:

- **Advanced AI Integration:**  
  Leveraging LLM for natural language processing ensures precise and relevant search queries and recommendations.
  
- **Comprehensive Feature Set:**  
  The system offers everything from traditional search and advanced recommendation paradigms to mood-based suggestions that enhance the user's experience.
  
- **Scalable Architecture:**  
  The clean separation of models, services, controllers, and routes ensures maintainability and extensibility, allowing for future enhancements (such as collaborative filtering or detailed sentiment analysis).
  
- **Effective External API Interactions:**  
  Thoughtful integration with the Google Books API—comprising robust query building and result deduplication—helps maintain accuracy and performance even under varying user demands.
  
- **Enhanced User Experience:**  
  Through intuitive wishlist management, shareable features, and emotionally resonant mood-based recommendations, the system caters to a wide spectrum of reader needs, fostering engagement and satisfaction.

This comprehensive book recommendation system is built with scalability, flexibility, and user-centric design in mind. It successfully marries modern AI capabilities with efficient backend engineering to provide background services that power an enriched, personalized reading experience.

