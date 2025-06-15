// Simple HealthService for backward compatibility
// Redirects to simpleHealth for minimal overhead

import { simpleHealth, HealthCheck, SystemHealth } from '../utils/simpleHealth';

export { HealthCheck, SystemHealth };

export class HealthService {
  async getSystemHealth(): Promise<SystemHealth> {
    return simpleHealth.getSystemHealth();
  }
  
  async getDetailedSystemInfo(): Promise<any> {
    return simpleHealth.getSystemInfo();
  }
  
  async getMetrics(): Promise<any> {
    return {
      format: 'simple',
      data: 'Use GCP native monitoring instead',
      timestamp: new Date().toISOString()
    };
  }
}