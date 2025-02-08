const allowedSortFields = ['title', 'author', 'genre', 'createdAt']; // Fields allowed for sorting
const allowedOrderValues = ['asc', 'desc']; // Sorting order

const validateQuery = (req, res, next) => {
    const { sortBy, order, page, limit } = req.query;

    // Validate sortBy field
    if (sortBy && !allowedSortFields.includes(sortBy)) {
        return res.status(400).json({ error: `Invalid sortBy field. Allowed fields are: ${allowedSortFields.join(', ')}` });
    }

    // Validate order field
    if (order && !allowedOrderValues.includes(order)) {
        return res.status(400).json({ error: `Invalid order value. Allowed values are: ${allowedOrderValues.join(', ')}` });
    }

    // Validate page and limit (if provided, must be positive integers)
    if ((page && isNaN(page)) || (page && page <= 0)) {
        return res.status(400).json({ error: 'Page must be a positive number.' });
    }
    if ((limit && isNaN(limit)) || (limit && limit <= 0)) {
        return res.status(400).json({ error: 'Limit must be a positive number.' });
    }

    next();
};

module.exports = validateQuery;
