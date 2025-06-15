export const PERMISSIONS = {
  // Thread permissions
  THREADS_READ: 'threads:read',
  THREADS_WRITE: 'threads:write',
  THREADS_DELETE: 'threads:delete',
  THREADS_PUBLISH: 'threads:publish',
  THREADS_SCHEDULE: 'threads:schedule',

  // Metrics permissions
  METRICS_READ: 'metrics:read',
  METRICS_COLLECT: 'metrics:collect',

  // Sheets permissions
  SHEETS_READ: 'sheets:read',
  SHEETS_SYNC: 'sheets:sync',

  // Admin permissions
  ADMIN_ALL: '*',
  ADMIN_USERS: 'admin:users',
  ADMIN_SYSTEM: 'admin:system'
} as const;

export const DEFAULT_USER_PERMISSIONS = [
  PERMISSIONS.THREADS_READ,
  PERMISSIONS.THREADS_WRITE,
  PERMISSIONS.THREADS_SCHEDULE,
  PERMISSIONS.METRICS_READ,
  PERMISSIONS.SHEETS_READ
];

export const ADMIN_PERMISSIONS = [
  PERMISSIONS.ADMIN_ALL
];

export const RATE_LIMITS = {
  GENERAL: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // requests per window
  },
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5 // login attempts per window
  },
  API: {
    windowMs: 60 * 1000, // 1 minute
    max: 60 // requests per minute
  },
  STRICT: {
    windowMs: 60 * 1000, // 1 minute
    max: 10 // for sensitive endpoints
  }
} as const;

export const SECURITY_CONFIG = {
  JWT_EXPIRY: '24h',
  SESSION_DURATION: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  BCRYPT_ROUNDS: 12,
  API_KEY_PREFIX: 'ttb_',
  PASSWORD_MIN_LENGTH: 8,
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 30
} as const;