import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import { seedDemoAccounts } from './storage/userStore';

// Load environment variables from project root .env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

// CORS — allow frontend origin with credentials (cookies)
app.use(
  cors({
    origin: process.env.APP_URL || 'http://localhost:3000',
    credentials: true,
  })
);

// Parse JSON request bodies
app.use(express.json());

// Parse cookies (required for HttpOnly token cookie)
app.use(cookieParser());

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth routes
app.use('/auth', authRoutes);

// ---------------------------------------------------------------------------
// Startup
// ---------------------------------------------------------------------------

// Seed demo accounts on first run
seedDemoAccounts();

// Export for testing
export default app;

// Start server only if not in test mode
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`✅ Auth Server running on http://localhost:${PORT}`);
    console.log(`   CORS origin: ${process.env.APP_URL || 'http://localhost:3000'}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}
