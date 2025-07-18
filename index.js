import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';

import userRoutes from './routes/userRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import messageRoutes from './routes/messageRoutes.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");
  } catch (error) {
    console.error("❌ DB connection error:", error.message);
    process.exit(1);
  }
};
connectDB();

// API Routes
app.get('/', (req, res) => {
  res.send("Chat App API Running");
});
app.use("/api/user", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/message", messageRoutes);

// Create HTTP server for socket
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Track online users
const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log("🔌 Socket connected:", socket.id);

  // Setup user
  socket.on('setup', (userData) => {
    socket.join(userData._id);
    onlineUsers.set(userData._id, socket.id);
    socket.emit('connected');
    io.emit('online-users', Array.from(onlineUsers.keys())); // broadcast online users
  });

  // Join chat room
  socket.on('join chat', (roomId) => {
    socket.join(roomId);
    console.log(`📥 Joined room: ${roomId}`);
  });

  // Typing indicator
  socket.on('typing', (roomId) => socket.to(roomId).emit('typing'));
  socket.on('stop typing', (roomId) => socket.to(roomId).emit('stop typing'));

  // New message
  socket.on('new message', (message) => {
    const chat = message.chat;
    if (!chat?.users) return;

    chat.users.forEach((user) => {
      if (user._id === message.sender._id) return;
      socket.to(user._id).emit('message received', message);
    });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    for (let [userId, sockId] of onlineUsers.entries()) {
      if (sockId === socket.id) {
        onlineUsers.delete(userId);
        break;
      }
    }
    io.emit('online-users', Array.from(onlineUsers.keys())); // update all clients
    console.log("❌ Socket disconnected:", socket.id);
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
