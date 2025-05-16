// Load environment variables first
require('dotenv').config();

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const postgres = require('postgres');
const { setupWebSocketServer } = require('./lib/websocket-manager.js');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();
const port = process.env.PORT || 3000;

// Store authenticated users
const authenticatedUsers = new Map();

// Get database connection
const getDbClient = () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL environment variable is not set!');
    process.exit(1);
  }
  
  // Log the connection being established
  console.log('Creating database connection to:', connectionString.split('@')[1]);
  
  try {
    return postgres(connectionString, { 
      max: 1,
      ssl: { rejectUnauthorized: false }, // Add SSL support for cloud PostgreSQL
      debug: process.env.NODE_ENV === 'development', // Enable query logging in dev
    });
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
};

app.prepare().then(() => {
  // Create HTTP server
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  // Set up WebSocket server
  setupWebSocketServer(server);

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${port}`);
  });
});