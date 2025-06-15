import { Request, Response } from 'express';
import { MetricsService } from '../services/MetricsService';

export class MetricsController {
  private metricsService: MetricsService;

  constructor() {
    this.metricsService = new MetricsService();
  }

  // GET /api/metrics/summary
  async getMetricsSummary(req: Request, res: Response) {
    try {
      const summary = await this.metricsService.getMetricsSummary();
      return res.json({ success: true, data: summary });
    } catch (error) {
      console.error('Error getting metrics summary:', error);
      return res.status(500).json({ success: false, error: 'Failed to get metrics summary' });
    }
  }

  // GET /api/metrics/top-threads
  async getTopPerformingThreads(req: Request, res: Response) {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const topThreads = await this.metricsService.getTopPerformingThreads(limit);
      return res.json({ success: true, data: topThreads });
    } catch (error) {
      console.error('Error getting top performing threads:', error);
      return res.status(500).json({ success: false, error: 'Failed to get top performing threads' });
    }
  }

  // GET /api/metrics/thread/:id
  async getThreadMetrics(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ success: false, error: 'Thread ID is required' });
      }

      const metrics = await this.metricsService.collectMetricsForThread(id);
      if (!metrics) {
        return res.status(404).json({ success: false, error: 'No metrics found for this thread' });
      }

      return res.json({ success: true, data: metrics });
    } catch (error) {
      console.error('Error getting thread metrics:', error);
      return res.status(500).json({ success: false, error: 'Failed to get thread metrics' });
    }
  }

  // GET /api/metrics/thread/:id/history
  async getThreadMetricsHistory(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ success: false, error: 'Thread ID is required' });
      }

      const days = parseInt(req.query.days as string) || 30;
      const history = await this.metricsService.getMetricsHistory(id, days);
      
      return res.json({ success: true, data: history });
    } catch (error) {
      console.error('Error getting thread metrics history:', error);
      return res.status(500).json({ success: false, error: 'Failed to get thread metrics history' });
    }
  }

  // POST /api/metrics/collect
  async collectMetricsManually(req: Request, res: Response) {
    try {
      await this.metricsService.collectMetricsForAllPublishedThreads();
      return res.json({ 
        success: true, 
        message: 'Metrics collection started for all published threads' 
      });
    } catch (error) {
      console.error('Error collecting metrics manually:', error);
      return res.status(500).json({ success: false, error: 'Failed to start metrics collection' });
    }
  }

  // POST /api/metrics/collect/:id
  async collectMetricsForThread(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ success: false, error: 'Thread ID is required' });
      }

      const metrics = await this.metricsService.collectMetricsForThread(id);
      if (!metrics) {
        return res.status(404).json({ 
          success: false, 
          error: 'Could not collect metrics for this thread (may not have tweet IDs)' 
        });
      }

      return res.json({ 
        success: true, 
        message: 'Metrics collected successfully',
        data: metrics 
      });
    } catch (error) {
      console.error('Error collecting metrics for thread:', error);
      return res.status(500).json({ success: false, error: 'Failed to collect metrics for thread' });
    }
  }
}