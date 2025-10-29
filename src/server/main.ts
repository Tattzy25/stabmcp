#!/usr/bin/env node

import { createMcpServer } from './mcp-server';
import { initializeTransports } from './transports';
import { keepProcessAlive, setupGracefulShutdown, isProduction } from './process-manager';

/**
 * Main server startup function
 */
export async function startServer(): Promise<void> {
  try {
    console.log('Starting Stability AI MCP Server...');
    
    // Create MCP server
    const server = createMcpServer();
    
    // Initialize transports
    await initializeTransports(server);
    
    // Setup process management
    keepProcessAlive();
    setupGracefulShutdown();
    
    console.log('Stability AI MCP Server started successfully');
    console.log('Environment:', isProduction() ? 'production' : 'development');
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

/**
 * Main entry point - only execute if run directly
 */
export function main(): void {
  if (require.main === module) {
    startServer().catch(console.error);
  }
}

// Export the server instance for programmatic usage
export { createMcpServer };