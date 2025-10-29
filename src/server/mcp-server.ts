import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTools } from '../tools/registry';

/**
 * Creates and configures the MCP server instance
 */
export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: 'stability-ai-mcp-server',
    version: '1.0.0',
    description: 'MCP server for Stability AI image generation'
  });

  // Register all tools from the registry
  registerTools(server);

  return server;
}

/**
 * Get server metadata for health checks and info endpoints
 */
export function getServerMetadata() {
  return {
    name: 'stability-ai-mcp-server',
    version: '1.0.0',
    description: 'MCP server for Stability AI image generation',
    transports: ['HTTP', 'SSE']
  };
}