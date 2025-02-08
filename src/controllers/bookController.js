const Book = require('../models/Book');

// @desc    Add a new book
// @route   POST /api/books
// @access  Public
const addBook = async (req, res) => {
    const { title, author, description, genre } = req.body;

    if (!title || !author || !description || !genre) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {
        const book = await Book.create({
            title,
            author,
            description,
            genre,
        });

        res.status(201).json(book);
    } catch (error) {
        res.status(500).json({ message: 'Failed to add book' });
    }
};
const addBooks = async (req, res) => {
    try {
        const books = req.body;
        if (!Array.isArray(books)) {
            return res.status(400).json({ error: 'Request body must be an array of books' });
        }
        const insertedBooks = await Book.insertMany(books);
        res.status(201).json({ message: 'Books added successfully', data: insertedBooks });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while adding books' });
    }
}

// @desc    Get all books
// @route   GET /api/books
// @access  Public
const getAllBooks = async (req, res) => {
    try {
        const books = await Book.find();
        res.status(200).json(books);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch books' });
    }
};

// @desc    Update a book by ID
// @route   PUT /api/books/:id
// @access  Public
const updateBooks = async (req, res) => {
    const { title, author, description, genre } = req.body;

    try {
        const updatedBook = await Book.findByIdAndUpdate(
            req.params.id,
            { title, author, description, genre },
            { new: true, runValidators: true }
        );

        if (!updatedBook) {
            return res.status(404).json({ message: 'Book not found' });
        }

        res.status(200).json(updatedBook);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Delete a book by ID
// @route   DELETE /api/books/:id
// @access  Public
const deleteBooksById = async (req, res) => {
    try {
        const deletedBook = await Book.findByIdAndDelete(req.params.id);

        if (!deletedBook) {
            return res.status(404).json({ message: 'Book not found' });
        }

        res.status(200).json({ message: 'Book deleted successfully', book: deletedBook });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Controller for GET /api/books
const getBooks = async (req, res) => {
    try {
        const { search, genre, sortBy = 'createdAt', order = 'desc', page = 1, limit = 10 } = req.query;

        const filter = {};
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { author: { $regex: search, $options: 'i' } }
            ];
        }
        if (genre) {
            filter.genre = { $regex: genre, $options: 'i' };
        }

        const sortOrder = order === 'asc' ? 1 : -1;

        const books = await Book.find(filter)
            .sort({ [sortBy]: sortOrder })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const totalBooks = await Book.countDocuments(filter);

        res.status(200).json({
            success: true,
            data: books,
            totalBooks,
            totalPages: Math.ceil(totalBooks / limit),
            currentPage: parseInt(page)
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

const deleteBooks = async (req, res) => {
    try {
        const { ids } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Please provide an array of valid book IDs to delete."
            });
        }

        // Validate each ID in the array
        const isValid = ids.every(id => mongoose.Types.ObjectId.isValid(id));
        if (!isValid) {
            return res.status(400).json({
                success: false,
                message: "One or more IDs are invalid."
            });
        }

        // Perform bulk deletion
        const result = await Book.deleteMany({ _id: { $in: ids } });

        if (result.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                message: "No books found for the provided IDs."
            });
        }

        res.status(200).json({
            success: true,
            message: `${result.deletedCount} book(s) deleted successfully.`
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// advanced search
const searchBooks = async (req, res) => {
    try {
      const { search } = req.query;
  
      // If there's no search query, return all books
      if (!search) {
        const books = await Book.find();
        return res.status(200).json({ success: true, data: books });
      }
  
      // Perform a text search
      const books = await Book.find(
        { $text: { $search: search } }, // Use MongoDB's text search
        { score: { $meta: "textScore" } } // Include relevance score
      ).sort({ score: { $meta: "textScore" } }); // Sort by relevance
  
      res.status(200).json({ success: true, data: books });
    } catch (error) {
      console.error("Error during advanced search:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  };

  const bulkUpdateBooks = async (req, res) => {
    try {
        const updates = req.body; // Array of objects with _id and update fields

        if (!Array.isArray(updates) || updates.length === 0) {
            return res.status(400).json({ message: "Provide an array of updates." });
        }

        // Validate and perform updates
        const bulkOps = updates.map((update) => {
            if (!update._id) throw new Error("Each update must include a book ID.");
            return {
                updateOne: {
                    filter: { _id: update._id },
                    update: { $set: update.fields }, // `fields` should contain the properties to update
                },
            };
        });

        const result = await Book.bulkWrite(bulkOps);

        res.status(200).json({
            message: "Bulk update completed.",
            matched: result.matchedCount,
            modified: result.modifiedCount,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

  


module.exports = { addBook, getBooks ,addBooks,updateBooks,deleteBooks,getAllBooks,deleteBooksById,searchBooks,bulkUpdateBooks};
