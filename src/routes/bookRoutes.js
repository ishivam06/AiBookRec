const express = require('express');
const { addBook, getBooks, addBooks, updateBooks, deleteBooks, getAllBooks, deleteBooksById, searchBooks, bulkUpdateBooks } = require('../controllers/bookController');
const router = express.Router();
const Book = require('../models/Book');
const validateQuery = require('../middleware/validateQuery');
const validateMassDeletion = require('../middleware/validateMassDeletion');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRole } = require('../middleware/authorizeRole')

router.post('/', protect, addBook); // Route to add a new book
router.post('/bulk', protect, authorizeRole(['admin']), addBooks); // Route to add a bulk books
router.get('/getAllbooks', protect, getAllBooks); // Route to get all books
router.put("/bulkUpdate", protect,authorizeRole("admin"), bulkUpdateBooks);
router.put('/:id', protect, updateBooks); // Route to get update books
router.delete('/:id', protect, deleteBooksById); // Route to delete books
router.delete('/', protect, authorizeRole(['admin']), validateMassDeletion, deleteBooks); //masDelete
router.get('/', protect, validateQuery, getBooks); // Route to search books
router.get("/search", protect, validateQuery, searchBooks); // advace search books


module.exports = router;
