const mongoose = require('mongoose');

const bookSchema = mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Please add a title'],
        },
        author: {
            type: String,
            required: [true, 'Please add an author'],
        },
        description: {
            type: String,
            required: [true, 'Please add a description'],
        },
        genre: {
            type: String,
            required: [true, 'Please specify a genre'],
        },
        publicationYear: {
            type: Number,
            required: [true, 'Please specify the publication year'],
        },
        rating: {
            type: Number,
            default: 0,
        },
        usersRated: {
            type: Number,
            default: 0,
        },
        pageCount: {
            type: Number,
            required: [true, 'Please specify the number of pages'],
        },
        language: {
            type: String,
            required: [true, 'Please specify the language of the book'],
            default: 'English',
        },
        publisher: {
            type: String,
            required: [true, 'Please specify the publisher'],
        },
        coverImage: {
            type: String,
            default: '',
        },
        isbn: {
            type: String,
            required: [true, 'Please add an ISBN number'],
            unique: true, // Ensure ISBN is unique in the DB
            match: [/^\d{13}$/, 'ISBN must be a 13-digit number'], // Validate ISBN-13 format
        },
    },
    {
        timestamps: true,
    }
);

// Full-text search index with weightage
bookSchema.index({ title: 'text', author: 'text', description: 'text', genre: 'text', publisher: 'text' },
    { weights: { title: 6, author: 5, genre: 4, publisher: 2, description: 1 } });

// Index for fast querying by publication year and ISBN
bookSchema.index({ publicationYear: 1 });
bookSchema.index({ isbn: 1 }, { unique: true });

module.exports = mongoose.model('Book', bookSchema);
