require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { router, wss, attachWebSocket } = require('./routes/scrape');
const http = require('http');
const { Server } = require('socket.io');

const syncRoutes = require('./routes/syncRoutes');
const userRoutes = require('./routes/authRoutes.js');
const teamRoutes = require('./routes/teamRoutes.js');
const workflowRoutes = require('./routes/workflowRoutes.js');
const ticketRoutes = require('./routes/TicketRoute');
const adminTicketRoutes = require('./routes/adminTicketRoute');
const billingRoutes = require('./routes/billing.js');

const app = express();

// Define allowed origins (configurable via environment variable)
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['https://autoflow-umber.vercel.app', 'http://localhost:3000'];

// Configure CORS with dynamic origin checking
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g., Postman, curl) or allowed origins
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.error(`CORS blocked for origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true // Enable if credentials (e.g., cookies) are needed
}));

app.use(express.json());

// Routes
app.use('/scrape', router);
app.use('/users', userRoutes);
app.use('/projects', teamRoutes);
app.use('/workflows', workflowRoutes);
app.use('/api', syncRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/admin/tickets', adminTicketRoutes);
app.use('/api/providers', require('./routes/providers.js'));
app.use('/api/enrichments', require('./routes/enrichments.js'));
app.use('/api/enrichment-configs', require('./routes/enrichmentConfig.js'));
app.use('/api/billing', billingRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'Server is running', origin: req.get('origin') });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(`Server error [${req.method} ${req.url}]:`, err.message, err.stack);
  res.status(500).json({ 
    error: 'Internal server error', 
    message: err.message,
    origin: req.get('origin')
  });
});

// Create HTTP server
const server = http.createServer(app);
attachWebSocket(server);

// Initialize Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.error(`Socket.IO CORS blocked for origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

// Store io globally for use in routes
global.io = io;

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('join', (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined room`);
  });
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Connect to MongoDB
if (!process.env.MONGODB_URI) {
  console.error('Error: MONGODB_URI is not defined in environment variables');
  process.exit(1);
}

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// WebSocket upgrade handler for /scrape path
server.on('upgrade', (request, socket, head) => {
  const { pathname } = new URL(request.url, `http://${request.headers.host}`);
  if (pathname === '/scrape') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));