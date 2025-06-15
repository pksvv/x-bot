import { Request, Response } from 'express';
import { simpleHealth } from '../utils/simpleHealth';
import { logger } from '../utils/logger';
import { AuthRequest } from '../types';
import { asyncHandler } from '../middleware/simpleErrorHandler';

export class SimpleMonitoringController {
  // Health check endpoint - public access for load balancers
  healthCheck = async (req: Request, res: Response): Promise<void> => {
    try {
      const health = await simpleHealth.getSystemHealth();
      
      const statusCode = health.status === 'healthy' ? 200 : 503;

      res.status(statusCode).json({
        success: true,
        data: health
      });

    } catch (error) {
      logger.logError(error as Error, 'Health check failed');
      res.status(503).json({
        success: false,
        error: 'Health check failed',
        timestamp: new Date().toISOString()
      });
    }
  };

  // Simple ping for load balancers
  ping = async (req: Request, res: Response): Promise<void> => {
    const ping = simpleHealth.getPing();
    res.status(200).json(ping);
  };

  // Basic system information (admin only)
  getSystemInfo = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user || req.user.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
      return;
    }

    const systemInfo = simpleHealth.getSystemInfo();
    
    res.status(200).json({
      success: true,
      data: systemInfo
    });
  });
}

export const simpleMonitoringController = new SimpleMonitoringController();