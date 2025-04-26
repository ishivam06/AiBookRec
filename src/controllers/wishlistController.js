const wishlistService = require('../services/wishlistService');

const getWishlist = async (req, res, next) => {
    try {
        const userId = req.user._id; // assuming req.user is set by authentication middleware
        const wishlistItems = await wishlistService.getWishlist(userId);
        res.status(200).json({ success: true, data: wishlistItems });
    } catch (error) {
        next(error);
    }
};

const addToWishlist = async (req, res, next) => {
    try {
        const userId = req.user._id;
        // Expecting bookId (and optionally, a category) in the request body.
        const book= req.body.book;
        console.log(req.body.book);
        if (!book || !book.title || !book.author) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid book data' 
            });
        }
        const wishlistItem = await wishlistService.addToWishlist(userId, book,category="default");
        res.status(201).json({ success: true, data: wishlistItem });
    } catch (error) {
        next(error);
    }
};

const removeFromWishlist = async (req, res, next) => {
    try {
        const userId = req.user._id;
        // Using bookId from the URL parameter.
        const { bookId } = req.params;
        await wishlistService.removeFromWishlist(userId, bookId);
        res.status(200).json({ success: true, message: 'Wishlist item removed' });
    } catch (error) {
        next(error);
    }
};

const updateWishlistItem = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { bookId } = req.params;
        const updateData = req.body;
        const updatedItem = await wishlistService.updateWishlistItem(userId, bookId, updateData);
        res.status(200).json({ success: true, data: updatedItem });
    } catch (error) {
        next(error);
    }
};

const shareWishlist = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const link = await wishlistService.shareWishlist(userId);
        res.status(200).json({ success: true, data: { shareableLink: link } });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getWishlist,
    addToWishlist,
    removeFromWishlist,
    updateWishlistItem,
    shareWishlist
}; 