const validateMassDeletion = (req, res, next) => {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
            success: false,
            message: "Invalid input. Please provide a non-empty array of IDs."
        });
    }

    next();
};

module.exports = validateMassDeletion;
