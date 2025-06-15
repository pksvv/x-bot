import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { initializeDatabase } from '../config/database';
import threadRoutes from './routes/threadRoutes';
import sheetsRoutes from './routes/sheetsRoutes';
import metricsRoutes from './routes/metricsRoutes';
import authRoutes from './routes/auth';
import monitoringRoutes from './routes/monitoring';
import { ThreadScheduler } from '../jobs/scheduler';
import { SheetsSync } from '../jobs/sheetsSync';
import { MonitoringJobs } from './jobs/monitoringJobs';
import { generalRateLimit } from './middleware/auth';
import { requestLogger, errorLogger, performanceLogger, correlationIdMiddleware } from './middleware/logging';
import { errorHandler, notFoundHandler } from './middleware/simpleErrorHandler';
import { logger } from './utils/logger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security and CORS
app.use(helmet());
app.use(cors());

// Correlation ID middleware (must be first)
app.use(correlationIdMiddleware);

// Logging middleware
app.use(requestLogger);
app.use(performanceLogger(1000)); // Log slow requests over 1 second

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use(generalRateLimit);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/threads', threadRoutes);
app.use('/api/sheets', sheetsRoutes);
app.use('/api/metrics', metricsRoutes);

// Monitoring routes
app.use('/monitoring', monitoringRoutes);

app.get('/', (req, res) => {
  logger.info('Root endpoint accessed', { ip: req.ip, userAgent: req.headers['user-agent'] });
  res.json({ 
    message: 'Twitter Thread Bot API is running!',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      threads: '/api/threads',
      sheets: '/api/sheets',
      monitoring: '/monitoring',
      health: '/monitoring/health'
    }
  });
});

// Error handling middleware
app.use(errorLogger);
app.use(notFoundHandler);
app.use(errorHandler);

async function startServer() {
  try {
    logger.info('Starting Twitter Thread Bot server...');


    // Initialize database
    await initializeDatabase();
    logger.info('Database initialized successfully');

    // Start the scheduler
    const scheduler = new ThreadScheduler();
    scheduler.start();
    logger.info('Thread scheduler started');

    // Start Google Sheets sync
    const sheetsSync = new SheetsSync();
    sheetsSync.start();
    logger.info('Google Sheets sync started');

    // Start monitoring jobs
    const monitoringJobs = new MonitoringJobs();
    monitoringJobs.start();
    logger.info('Monitoring jobs started');


    // Start server
    const server = app.listen(PORT, () => {
      logger.info('Server started successfully', {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0'
      });
      
      console.log(`🚀 Twitter Thread Bot is running!`);
      console.log(`📊 API: http://localhost:${PORT}/`);
      console.log(`🔍 Health Check: http://localhost:${PORT}/monitoring/health`);
      console.log(`📋 Logs: Console (GCP) / ./logs/ (dev)`);
    });

    // Graceful shutdown handling
    const gracefulShutdown = (signal: string) => {
      logger.info(`Received ${signal}, starting graceful shutdown...`);
      
      server.close((err) => {
        if (err) {
          logger.logError(err, 'Error during server shutdown');
          process.exit(1);
        }

        // Stop all scheduled jobs
        scheduler.stop();
        sheetsSync.stop();
        monitoringJobs.stop();

        logger.info('Graceful shutdown completed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.logError(error, 'Uncaught exception');
      gracefulShutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection', { reason, promise });
      gracefulShutdown('unhandledRejection');
    });

  } catch (error) {
    logger.logError(error as Error, 'Failed to start server');
    process.exit(1);
  }
}

startServer();