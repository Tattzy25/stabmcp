import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * Initialize MCP stdio transport for protocol communication
 * MCP servers primarily communicate via stdin/stdout using JSON-RPC 2.0
 */
export async function initializeTransports(server: McpServer) {
  // Start stdio transport for MCP protocol (primary communication channel)
  const stdioTransport = new StdioServerTransport();
  await server.connect(stdioTransport);
  
  console.log('Stability AI MCP Server running on stdio transport');
  console.log('MCP protocol ready for connections via stdin/stdout');
  
  return true;
}

/**
 * Get transport status information
 */
export function getTransportStatus() {
  return {
    stdio: 'active',
    http: 'inactive',
    sse: 'inactive',
    info: 'MCP protocol uses stdio transport for client communication'
  };
}
