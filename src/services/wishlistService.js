const Wishlist = require('../models/Wishlist');
const Book = require('../models/Book');

const getWishlist = async (userId) => {
    // Finds all wishlist items for a user and populates the book details.
    return await Wishlist.find({ userId }).populate('bookId');
};

const addToWishlist = async (userId, bookId, category = 'default') => {
    // Verify that the book exists.
    const book = await Book.findById(bookId);
    if (!book) {
        throw new Error('Book not found');
    }
    
    // Ensure the book is not already in the user's wishlist.
    const existing = await Wishlist.findOne({ userId, bookId });
    if (existing) {
        throw new Error('Book already in wishlist');
    }
    
    const wishlistItem = await Wishlist.create({
        userId,
        bookId,
        category
    });
    
    return wishlistItem;
};

const removeFromWishlist = async (userId, bookId) => {
    // Remove the wishlist item belonging to the user for the specified book.
    const deletion = await Wishlist.findOneAndDelete({ userId, bookId });
    if (!deletion) {
        throw new Error('Wishlist item not found');
    }
    return deletion;
};

const updateWishlistItem = async (userId, bookId, updateData) => {
    // Accepts update data (e.g., new category or order) and updates the wishlist item.
    const update = await Wishlist.findOneAndUpdate({ userId, bookId }, updateData, { new: true });
    if (!update) {
        throw new Error('Wishlist item not found');
    }
    return update;
};

const shareWishlist = async (userId) => {
    // Generates a shareable link.
    // In a production app, you might implement a secure token. For now, we return a static URL.
    const shareableLink = `https://example.com/shared-wishlist/${userId}`;
    return shareableLink;
};

module.exports = {
    getWishlist,
    addToWishlist,
    removeFromWishlist,
    updateWishlistItem,
    shareWishlist
}; 