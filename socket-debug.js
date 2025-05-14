const { io } = require('socket.io-client');
require('dotenv').config();

// Create a socket connection to the server
const socket = io('http://localhost:3000', {
  withCredentials: true,
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 3
});

// Log all events
socket.onAny((event, ...args) => {
  console.log(`[Event] ${event}:`, args);
});

// Connect event
socket.on('connect', () => {
  console.log('Connected to server! Socket ID:', socket.id);
  
  // Try to authenticate with a user (use your own user ID)
  socket.emit('auth', {
    userId: 6,
    userName: 'Test User',
    token: 'session-token'
  });
  
  // After 10 seconds, disconnect
  setTimeout(() => {
    console.log('Disconnecting...');
    socket.disconnect();
    process.exit(0);
  }, 10000);
});

// Auth success event
socket.on('auth_success', (data) => {
  console.log('Authentication successful:', data);
});

// Auth error event
socket.on('auth_error', (error) => {
  console.error('Authentication error:', error);
});

// Connect error event
socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
});

// Disconnect event
socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});

console.log('Attempting to connect to server...'); 