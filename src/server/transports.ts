
import { createTransports } from "../transports";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// Module-level transport instances
let httpTransport: any = null;
let sseTransport: any = null;

export async function initializeTransports(server: McpServer) {
  try {
    const transports = createTransports(server);
    httpTransport = transports.httpTransport;
    sseTransport = transports.sseTransport;
    
    const PORT = process.env['PORT'] ? parseInt(process.env['PORT']) : 3000;
    console.log(`HTTP Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`MCP endpoint: http://localhost:${PORT}/mcp`);
    console.log(`SSE endpoint: http://localhost:3001`);
    
    return true;
  } catch (error) {
    console.error('Failed to initialize transports:', error);
    throw error; // Fail loud, no silent fallbacks
  }
}

/**
 * Get transport status information based on actual server state
 */
export function getTransportStatus() {
  return {
    http: httpTransport ? 'active' : 'inactive',
    sse: sseTransport ? 'active' : 'inactive',
    info: 'MCP protocol active on HTTP and SSE transports only'
  };
}
