const express = require('express');
const router = express.Router();
const {
    getWishlist,
    addToWishlist,
    removeFromWishlist,
    updateWishlistItem,
    shareWishlist
} = require('../controllers/wishlistController');
const { protect } = require('../middleware/authMiddleware'); // Ensure you have an auth middleware

// All wishlist routes require authentication.
router.use(protect);

router.route('/')
    .get(getWishlist)
    .post(addToWishlist);

router.route('/share')
    .get(shareWishlist);

// For deletion and update, we use the bookId as a parameter.
router.route('/:bookId')
    .delete(removeFromWishlist)
    .put(updateWishlistItem);

module.exports = router; 