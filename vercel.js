// This file is used by Vercel to handle API requests
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import apiHandler from './api/index.js';

// Create Express server
const app = express();

// Middleware
app.use(bodyParser.json());
app.use(cors());

// API routes
app.all('/api/*', (req, res) => {
  return apiHandler(req, res);
});

// Serve static files from dist
app.use(express.static('dist'));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile('index.html', { root: 'dist' });
});

// Export for Vercel
export default app;