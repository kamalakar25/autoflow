require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { router, wss } = require('./routes/scrape'); // Destructure router and wss
const http = require('http');
const { Server } = require("socket.io");

const syncRoutes = require('./routes/syncRoutes');


const bcrypt = require('bcryptjs');

const userRoutes = require('./routes/authRoutes.js');

const teamRoutes = require('./routes/teamRoutes.js');

const workflowRoutes = require('./routes/workflowRoutes.js');

const ticketRoutes = require('./routes/TicketRoute'); 
const adminTicketRoutes = require('./routes/adminTicketRoute');
const billingRoutes = require("./routes/billing.js");



const app = express();
app.use(cors());
app.use(express.json());
app.use('/scrape', router); // Use the router directly
// app.use('/auth', require('./routes/auth')); // Assume authRoutes is a separate router
app.use('/users', userRoutes);
app.use('/projects', teamRoutes);
app.use('/workflows', workflowRoutes); // <-- Mount the Workflow routes

app.use('/api', syncRoutes);

app.use('/api/tickets', ticketRoutes);
app.use('/api/admin/tickets', adminTicketRoutes);


app.use('/api/providers', require('./routes/providers.js'));
app.use('/api/enrichments', require('./routes/enrichments.js'));
app.use('/api/enrichment-configs', require('./routes/enrichmentConfig.js'));

app.use("/api/billing", billingRoutes);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins for simplicity, adjust as needed
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

// Store io globally for use in routes
global.io = io;

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);
  socket.on("join", (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined room`);
  });
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});


// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Create HTTP server
// const server = http.createServer(app);

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
server.listen(5000, () => console.log('Server running on port 5000'));