import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { initializeDatabase } from '../config/database';
import threadRoutes from './routes/threadRoutes';
import sheetsRoutes from './routes/sheetsRoutes';
import metricsRoutes from './routes/metricsRoutes';
import { ThreadScheduler } from '../jobs/scheduler';
import { SheetsSync } from '../jobs/sheetsSync';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API routes
app.use('/api/threads', threadRoutes);
app.use('/api/sheets', sheetsRoutes);
app.use('/api/metrics', metricsRoutes);

app.get('/', (req, res) => {
  res.json({ 
    message: 'Twitter Thread Bot API is running!',
    version: '1.0.0',
    endpoints: {
      threads: '/api/threads',
      sheets: '/api/sheets',
      metrics: '/api/metrics',
      health: '/'
    }
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error' 
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    error: 'Route not found' 
  });
});

async function startServer() {
  try {
    // Initialize database
    await initializeDatabase();
    console.log('Database initialized successfully');

    // Start the scheduler
    const scheduler = new ThreadScheduler();
    scheduler.start();

    // Start Google Sheets sync
    const sheetsSync = new SheetsSync();
    sheetsSync.start();

    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`📊 API Documentation: http://localhost:${PORT}/`);
      console.log(`🔍 Health Check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();