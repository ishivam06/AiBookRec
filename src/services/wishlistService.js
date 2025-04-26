const Wishlist = require('../models/Wishlist');
const Book = require('../models/Book');

const getWishlist = async (userId) => {
    // Finds all wishlist items for a user and populates the book details.
    return await Wishlist.find({ userId });
};

const addToWishlist = async (userId, book, category = 'default') => {
    // Check if book already exists in user's wishlist
    const existing = await Wishlist.findOne({ 
        userId, 
        'book.title': book.title,
        'book.author': book.author
    });
    
    if (existing) {
        throw new Error('This book is already in your wishlist');
    }
    
    // Create new wishlist item with full book data
    const wishlistItem = await Wishlist.create({
        userId,
        book, // Store the complete book object
        category
    });
    
    return wishlistItem;
};


const removeFromWishlist = async (userId, isbn) => {
    // Remove the wishlist item belonging to the user for the specified book.
    const deletion = await Wishlist.findOneAndDelete({ userId, "book.isbn" : isbn });
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