
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createTransports } from "../transports";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// Module-level transport instances for status tracking and cleanup
let httpTransport: any = null;
let sseTransport: any = null;

/**
 * Initialize ALL transports for the MCP server
 * MCP servers can use both stdio (for MCP hosts) and HTTP (for web clients)
 */
export async function initializeTransports(server: McpServer) {
  // Start stdio transport for MCP protocol (primary communication channel)
  const stdioTransport = new StdioServerTransport();
  await server.connect(stdioTransport);
  
  console.log('Stability AI MCP Server running on stdio transport');
  console.log('MCP protocol ready for connections via stdin/stdout');

  // Initialize web transports for HTTP services
  const transports = createTransports(server);
  httpTransport = transports.httpTransport;
  sseTransport = transports.sseTransport;
  
  console.log('HTTP and SSE transports activated for web clients');
  
  return true;
}

/**
 * Get transport status information based on actual server state
 */
export function getTransportStatus() {
  return {
    stdio: 'active',
    http: httpTransport ? 'active' : 'inactive',
    sse: sseTransport ? 'active' : 'inactive',
    info: 'MCP protocol active on stdio, HTTP, and SSE transports'
  };
}
