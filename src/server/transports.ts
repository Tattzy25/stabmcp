import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createTransports as createWebTransports } from '../transports.js';
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * Initialize all transports for the MCP server
 */
export async function initializeTransports(server: McpServer) {
  // Always start stdio transport for MCP protocol
  const stdioTransport = new StdioServerTransport();
  await server.connect(stdioTransport);
  console.log('Stability AI MCP Server running on stdio');
  
  // Start HTTP and SSE transports for web connectivity in production or when PORT is set
  if (process.env['NODE_ENV'] === 'production' || 
      process.env['RAILWAY_ENVIRONMENT'] || 
      process.env['PORT'] ||
      process.env['ENABLE_HTTP_TRANSPORT'] === 'true') {
    await initializeWebTransports();
  }
}

/**
 * Initialize web transports (HTTP and SSE)
 */
export async function initializeWebTransports() {
  try {
    const { httpTransport, sseTransport } = createWebTransports();
    
    // Connect HTTP and SSE transports
    await Promise.all([
      httpTransport.connect(),
      sseTransport.connect()
    ]);
    
    console.log('HTTP and SSE transports started for production deployment');
  } catch (error) {
    console.error('Failed to initialize web transports:', error);
  }
}

/**
 * Get transport status information
 */
export function getTransportStatus() {
  const webTransportsEnabled = process.env['NODE_ENV'] === 'production' || 
                              process.env['RAILWAY_ENVIRONMENT'] || 
                              process.env['PORT'] ||
                              process.env['ENABLE_HTTP_TRANSPORT'] === 'true';
  
  return {
    stdio: 'active',
    http: webTransportsEnabled ? 'active' : 'disabled',
    sse: webTransportsEnabled ? 'active' : 'disabled'
  };
}