const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const userRoutes = require('./routes/userRoutes');
const bookRoutes = require('./routes/bookRoutes');
const rateLimiter = require("./middleware/rateLimiter");
const llmRoutes = require("./routes/llmRoutes");
const moodRoutes = require('./routes/moodRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');


// Load environment variables
dotenv.config({ debug: true });


// Connect to the database
connectDB();

const app = express();
app.set('trust proxy', 1);

app.use(rateLimiter);

app.use(express.json());
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Adjust the limit based on your needs
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/api/users', userRoutes);
app.use('/api/books', bookRoutes);
app.use("/api/llm", llmRoutes);
app.use('/api/mood', moodRoutes);
app.use('/api/wishlist',wishlistRoutes);




// Placeholder for testing server
app.get('/', (req, res) => {
    res.send('AI Book Recommendation System Backend is Running!');
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
