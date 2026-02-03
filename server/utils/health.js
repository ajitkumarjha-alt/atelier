import { query } from '../db.js';
import { isStorageConfigured } from '../storage.js';
import { isLLMConfigured } from '../llm.js';

/**
 * Check database health
 */
export const checkDatabase = async () => {
  try {
    const start = Date.now();
    await query('SELECT 1');
    const duration = Date.now() - start;
    
    return {
      status: 'healthy',
      responseTime: `${duration}ms`
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
};

/**
 * Check storage service health
 */
export const checkStorage = async () => {
  try {
    const configured = isStorageConfigured();
    
    return {
      status: configured ? 'healthy' : 'not_configured',
      message: configured ? 'Storage service available' : 'Storage service not configured'
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
};

/**
 * Check LLM service health
 */
export const checkLLM = async () => {
  try {
    const configured = isLLMConfigured();
    
    return {
      status: configured ? 'healthy' : 'not_configured',
      message: configured ? 'LLM service available' : 'LLM service not configured'
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
};

/**
 * Check Firebase Admin health
 */
export const checkFirebase = async (firebaseAdmin) => {
  try {
    if (!firebaseAdmin) {
      return {
        status: 'not_configured',
        message: 'Firebase Admin SDK not initialized'
      };
    }
    
    // Simple check - if we can access auth service
    firebaseAdmin.auth();
    
    return {
      status: 'healthy',
      message: 'Firebase Admin SDK operational'
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
};

/**
 * Comprehensive health check
 */
export const performHealthCheck = async (firebaseAdmin) => {
  const [database, storage, llm, firebase] = await Promise.all([
    checkDatabase(),
    checkStorage(),
    checkLLM(),
    checkFirebase(firebaseAdmin)
  ]);

  const allHealthy = 
    database.status === 'healthy' &&
    (storage.status === 'healthy' || storage.status === 'not_configured') &&
    (llm.status === 'healthy' || llm.status === 'not_configured') &&
    (firebase.status === 'healthy' || firebase.status === 'not_configured');

  return {
    status: allHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      database,
      storage,
      llm,
      firebase
    },
    system: {
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        unit: 'MB'
      },
      nodeVersion: process.version,
      platform: process.platform,
      environment: process.env.NODE_ENV || 'development'
    }
  };
};
