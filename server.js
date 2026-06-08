const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const authRoutes = require('./routes/auth');
const bookingRoutes = require('./routes/bookings');
const userRoutes = require('./routes/users');
const serviceRoutes = require('./routes/services');

const app = express();

const allowedOrigins = [
  process.env.CLIENT_URL,
  'https://enekem-medicals-frontend.vercel.app',
  "https://enekemmedicals.com",
  "https://www.enekemmedicals.com",
  "enekemmedicals.com",
  'http://localhost:5173',
];
// === Middleware ===
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected successfully'))
.catch((err) => console.error('MongoDB connection error:', err));

// Routes

app.get('/api', (req, res) => {
  res.json({
    message:
      'Welcome to the Enekem Medicals API. Your number one source for affordable healthcare.',
  });
});
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/services', serviceRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});