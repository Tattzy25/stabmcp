/**
 * Process management utilities for keeping the server alive and handling graceful shutdown
 */

/**
 * Keep the process alive (prevents Railway from sleeping)
 */
export function keepProcessAlive(): void {
  process.stdin.resume();
  console.log('Process keep-alive enabled');
}

/**
 * Setup graceful shutdown handlers
 */
export function setupGracefulShutdown(): void {
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('Shutting down gracefully...');
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down...');
    process.exit(0);
  });
  
  console.log('Graceful shutdown handlers configured');
}

/**
 * Get process information
 */
export function getProcessInfo() {
  return {
    pid: process.pid,
    platform: process.platform,
    nodeVersion: process.version,
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage()
  };
}

/**
 * Check if running in production environment
 */
export function isProduction(): boolean {
  const isRailway = !!process.env['PORT'] && process.env['PORT'] !== '3000';
  return process.env['NODE_ENV'] === 'production' || isRailway;
}