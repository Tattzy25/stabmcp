// Load environment variables
import 'dotenv/config';

// Log Node.js version for debugging
console.log('Node.js version:', process.version);

import { z } from "zod";
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import { EventEmitter } from 'events';

// Custom error class for MCP operations
class UserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserError';
  }
}

// Import Stability AI tools from organized structure
import {
  generateImage,
  generateImageSD35,
  removeBackground,
  outpaint,
  searchAndReplace,
  upscaleFast,
  upscaleCreative,
  upscaleConservative,
  controlSketch,
  controlStyle,
  controlStructure,
  replaceBackgroundAndRelight,
  searchAndRecolor,
  erase,
  inpaint
} from './src/tools/stability/index.js';

// Import API key utilities
import { API_KEYS, currentApiKeyIndex, getCurrentApiKey } from './src/tools/utilities/index.js';

// Environment configuration with fallback API keys
const STABILITY_API_KEY = process.env.STABILITY_API_KEY!;
const STABILITY_API_KEY_ALT = process.env.STABILITY_API_KEY_ALT;

// Function to get API key with fallback logic
function getStabilityApiKey(primaryKey: string, fallbackKey?: string): string {
  // For now, we'll use the primary key
  // Fallback logic can be implemented here if needed
  return primaryKey;
}

const PORT = parseInt(process.env.PORT || '8080');
const HOST = process.env.HOST || '0.0.0.0';
const NODE_ENV = process.env.NODE_ENV || 'development';
const SERVER_NAME = process.env.MCP_SERVER_NAME || 'StabilityAI-MCP-Server';
const SERVER_VERSION = process.env.MCP_SERVER_VERSION || '1.0.0';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const HEALTH_CHECK_PATH = process.env.HEALTH_CHECK_PATH || '/health';
const METRICS_PATH = process.env.METRICS_PATH || '/metrics';
const STABILITY_BASE_URL = process.env.STABILITY_BASE_URL || 'https://api.stability.ai';



// Ensure version format is correct (major.minor.patch)
const validatedVersion = SERVER_VERSION.match(/^\d+\.\d+\.\d+$/)
  ? SERVER_VERSION
  : '1.0.0';

// Comprehensive logging and monitoring setup
const logger = {
  info: (message: string, data?: any) => {
    console.log(`[INFO] ${new Date().toISOString()}: ${message}`, data || '');
  },
  warn: (message: string, data?: any) => {
    console.warn(`[WARN] ${new Date().toISOString()}: ${message}`, data || '');
  },
  error: (message: string, data?: any) => {
    console.error(`[ERROR] ${new Date().toISOString()}: ${message}`, data || '');
  },
  debug: (message: string, data?: any) => {
    if (process.env.DEBUG) {
      console.debug(`[DEBUG] ${new Date().toISOString()}: ${message}`, data || '');
    }
  }
};

// Server metrics tracking
interface ServerMetrics {
  connections: number;
  activeConnections: number;
  totalMessages: number;
  successfulMessages: number;
  failedMessages: number;
  toolExecutions: number;
  toolErrors: number;
  uptime: number;
}

// Comprehensive MCP Server Implementation with Full Protocol Compliance
class MCPServer extends EventEmitter {
  private clients = new Map<string, { res: http.ServerResponse; lastActivity: number }>();
  private tools = new Map<string, { description: string; parameters: any; execute: Function }>();
  private heartbeatInterval: NodeJS.Timeout | null = null;
   private connectionCount = 0;
   private maxConnections = 100;
   private metrics: ServerMetrics = {
     connections: 0,
     activeConnections: 0,
     totalMessages: 0,
     successfulMessages: 0,
     failedMessages: 0,
     toolExecutions: 0,
     toolErrors: 0,
     uptime: 0
   };
   private startTime = Date.now();

  constructor() {
     super();
     this.setupHeartbeat();
     this.setupMetricsReporting();
     logger.info('MCP Server initialized', { 
       serverName: SERVER_NAME, 
       version: validatedVersion,
       maxConnections: this.maxConnections 
     });
   }

  // Setup metrics reporting
   private setupMetricsReporting() {
     setInterval(() => {
       this.metrics.uptime = Date.now() - this.startTime;
       this.metrics.activeConnections = this.clients.size;
       
       if (this.metrics.totalMessages > 0 || this.clients.size > 0) {
         logger.debug('Server metrics', this.metrics);
       }
     }, 60000); // Report every minute
   }

   // Setup heartbeat mechanism for connection keep-alive
   private setupHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
        const now = Date.now();
        let disconnected = 0;
        
        for (const [clientId, client] of this.clients.entries()) {
          if (now - client.lastActivity > 30000) { // 30s inactivity
            this.clients.delete(clientId);
            client.res.end();
            this.connectionCount--;
            this.emit('clientDisconnected', clientId);
            disconnected++;
            logger.info('Client disconnected due to inactivity', { clientId });
          } else {
            this.sendKeepAlive(client.res);
          }
        }
        
        if (disconnected > 0) {
          logger.debug('Heartbeat cycle completed', { 
            disconnectedClients: disconnected, 
            remainingClients: this.clients.size 
          });
        }
      }, 15000); // 15s heartbeat interval
  }

  // Add tool to server with comprehensive validation
  addTool(name: string, description: string, parameters: any, execute: Function) {
    if (!name.match(/^[a-zA-Z0-9_\-\/]+$/)) {
      throw new Error('Tool name must contain only alphanumeric characters, underscores, hyphens, and slashes');
    }
    
    this.tools.set(name, { 
      description, 
      parameters: this.validateSchema(parameters),
      execute: this.wrapToolExecution(execute, name)
    });
    
    this.emit('toolAdded', name);
  }

  // Validate JSON schema compliance
  private validateSchema(schema: any): any {
    // Basic schema validation - can be extended with full JSON Schema validation
    if (schema && typeof schema === 'object' && !Array.isArray(schema)) {
      return schema;
    }
    throw new Error('Invalid schema format');
  }

  // Wrap tool execution with comprehensive error handling
  private wrapToolExecution(execute: Function, toolName: string): Function {
    return async (params: any) => {
      try {
        // Validate parameters against schema
        this.validateParameters(params, this.tools.get(toolName)!.parameters);
        
        // Execute tool with timeout protection
        const result = await Promise.race([
          execute(params),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Tool execution timeout')), 30000)
          )
        ]);
        
        return this.formatResult(result, toolName);
        
      } catch (error: any) {
        throw this.formatError(error, toolName);
      }
    };
  }

  // Handle SSE connection with comprehensive protocol compliance
  handleSSEConnection(req: http.IncomingMessage, res: http.ServerResponse) {
    // Check connection limits
    if (this.connectionCount >= this.maxConnections) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: {
          code: -32000,
          message: 'Server busy - too many connections'
        }
      }));
      return;
    }

    // Set comprehensive SSE headers for protocol compliance
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control, Content-Type, Last-Event-ID',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Max-Age': '86400',
      'X-Protocol-Version': '2024-11-05',
      'X-Server-Name': SERVER_NAME,
      'X-Server-Version': validatedVersion
    });

    const clientId = this.generateClientId();
    const clientInfo = { res, lastActivity: Date.now() };
    
    this.clients.set(clientId, clientInfo);
    this.connectionCount++;
    
    this.emit('clientConnected', clientId);

    // Send protocol readiness notification
    this.sendProtocolMessage(res, {
      jsonrpc: '2.0',
      method: 'notifications/readiness',
      params: {
        server: {
          name: SERVER_NAME,
          version: validatedVersion,
          capabilities: this.getServerCapabilities()
        }
      }
    });

    // Handle client data and disconnection
    req.on('data', (chunk) => {
      clientInfo.lastActivity = Date.now();
      this.handleClientData(chunk.toString(), res, clientId);
    });

    req.on('close', () => {
      this.clients.delete(clientId);
      this.connectionCount--;
      this.emit('clientDisconnected', clientId);
    });

    req.on('error', (error) => {
      this.emit('connectionError', { clientId, error });
    });
  }

  // Generate unique client ID
  private generateClientId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get comprehensive server capabilities
  private getServerCapabilities() {
    return {
      tools: Array.from(this.tools.entries()).map(([name, tool]) => ({
        name,
        description: tool.description,
        inputSchema: tool.parameters
      })),
      protocol: {
        version: '2024-11-05',
        supportedVersions: ['2024-11-05', '2024-06-13'],
        authentication: {
          methods: ['none']
        }
      },
      limits: {
        maxConnections: this.maxConnections,
        maxMessageSize: 1048576, // 1MB
        timeout: 30000 // 30s
      }
    };
  }

  // Send protocol-compliant SSE message
  private sendProtocolMessage(res: http.ServerResponse, data: any) {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    res.write(message);
    this.emit('messageSent', data);
  }

  // Send keep-alive comment for connection maintenance
  private sendKeepAlive(res: http.ServerResponse) {
    res.write(': keep-alive\n\n');
  }

  // Handle incoming client data with comprehensive validation
  private async handleClientData(data: string, res: http.ServerResponse, clientId: string) {
    try {
      const message = this.parseAndValidateMessage(data);
      
      switch (message.method) {
        case 'initialize':
          await this.handleInitialize(message, res);
          break;
        case 'tools/call':
          await this.handleToolCall(message, res);
          break;
        case 'ping':
          this.handlePing(message, res);
          break;
        default:
          this.sendError(res, message.id, -32601, 'Method not found');
      }
      
    } catch (error: any) {
      this.sendError(res, undefined, -32700, `Parse error: ${error.message}`);
    }
  }

  // Parse and validate incoming message with comprehensive checks
  private parseAndValidateMessage(data: string): any {
    let message: any;
    
    try {
      message = JSON.parse(data);
    } catch {
      throw new Error('Invalid JSON format');
    }

    // Validate JSON-RPC 2.0 structure
    if (message.jsonrpc !== '2.0') {
      throw new Error('Invalid JSON-RPC version');
    }

    if (message.id && (typeof message.id !== 'string' && typeof message.id !== 'number')) {
      throw new Error('Invalid message ID');
    }

    if (message.method && typeof message.method !== 'string') {
      throw new Error('Invalid method name');
    }

    return message;
  }

  // Handle initialization handshake with version negotiation
  private async handleInitialize(message: any, res: http.ServerResponse) {
    const { id, params } = message;
    
    // Validate protocol version compatibility
    const clientVersion = params?.protocolVersion || '2024-06-13';
    const supportedVersions = ['2024-11-05', '2024-06-13'];
    
    if (!supportedVersions.includes(clientVersion)) {
      this.sendError(res, id, -32002, `Unsupported protocol version: ${clientVersion}`);
      return;
    }

    this.sendProtocolMessage(res, {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: clientVersion,
        capabilities: this.getServerCapabilities(),
        serverInfo: {
          name: SERVER_NAME,
          version: validatedVersion
        }
      }
    });
  }

  // Handle tool execution with comprehensive error handling
  private async handleToolCall(message: any, res: http.ServerResponse) {
    const { id, params } = message;
    
    if (!params || !params.name) {
      this.sendError(res, id, -32602, 'Invalid params: tool name required');
      return;
    }

    const tool = this.tools.get(params.name);
    if (!tool) {
      this.sendError(res, id, -32601, `Tool not found: ${params.name}`);
      return;
    }

    try {
      const result = await tool.execute(params.arguments || {});
      this.sendProtocolMessage(res, {
        jsonrpc: '2.0',
        id,
        result
      });
    } catch (error: any) {
      this.sendError(res, id, -32000, `Tool execution failed: ${error.message}`);
    }
  }

  // Handle ping requests for connection testing
  private handlePing(message: any, res: http.ServerResponse) {
    this.sendProtocolMessage(res, {
      jsonrpc: '2.0',
      id: message.id,
      result: {
        timestamp: new Date().toISOString(),
        server: SERVER_NAME,
        version: validatedVersion
      }
    });
  }

  // Send standardized error response
  private sendError(res: http.ServerResponse, id: any, code: number, message: string) {
    this.sendProtocolMessage(res, {
      jsonrpc: '2.0',
      id,
      error: {
        code,
        message,
        data: {
          timestamp: new Date().toISOString(),
          server: SERVER_NAME
        }
      }
    });
  }

  // Validate parameters against schema
  private validateParameters(params: any, schema: any) {
    // Basic validation - can be extended with full JSON Schema validation
    if (schema && params && typeof params === 'object') {
      // Check required fields - simplified validation
      // For now, we'll assume all fields in the schema are required
      // This is a temporary fix to get the build working
      for (const [key] of Object.entries(schema)) {
        if (params[key] === undefined) {
          throw new Error(`Missing required parameter: ${key}`);
        }
      }
    }
  }

  // Format tool result according to MCP content types
  private formatResult(result: any, toolName: string): any {
    if (typeof result === 'object' && result !== null) {
      // Handle image content
      if (result.buffer && result.buffer instanceof Buffer) {
        return {
          contentType: 'image/png',
          content: result.buffer.toString('base64')
        };
      }
      
      // Handle text content
      if (typeof result.text === 'string') {
        return {
          contentType: 'text/plain',
          content: result.text
        };
      }
    }
    
    // Default JSON response
    return {
      contentType: 'application/json',
      content: JSON.stringify(result)
    };
  }

  // Format error with proper MCP error structure
  private formatError(error: any, toolName: string): any {
    return {
      code: -32000,
      message: `Tool ${toolName} failed: ${error.message}`,
      data: {
        tool: toolName,
        timestamp: new Date().toISOString()
      }
    };
  }

  // Start HTTP server with SSE endpoint
  start(config: { transportType: string; httpStream: { endpoint: string; port: number; host?: string } }) {
    if (config.transportType !== 'httpStream') {
      throw new Error('Only httpStream transport type is supported');
    }

    const httpServer = http.createServer((req, res) => {
      if (req.url === config.httpStream.endpoint && req.method === 'GET') {
        this.handleSSEConnection(req, res);
      } else if (req.url === HEALTH_CHECK_PATH && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
      } else if (req.url === METRICS_PATH && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(this.metrics));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
      }
    });

    const host = config.httpStream.host || HOST;
    const port = config.httpStream.port || PORT;

    httpServer.listen(port, host, () => {
      logger.info('MCP Server started', { host, port, endpoint: config.httpStream.endpoint });
      this.emit('serverStarted', { host, port });
    });

    httpServer.on('error', (error) => {
      logger.error('Server error', { error: error.message });
      this.emit('serverError', error);
    });

    return httpServer;
  }

  // Cleanup resources
  destroy() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    for (const [clientId, client] of this.clients.entries()) {
      client.res.end();
      this.clients.delete(clientId);
    }
    
    this.emit('serverDestroyed');
  }
}

// Create and configure MCP server instance
const server = new MCPServer();

// Setup server shutdown handling
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down MCP server...');
  server.destroy();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down MCP server...');
  server.destroy();
  process.exit(0);
});

// Add resource for application logs
// Note: Resources are not part of core MCP protocol - removed for compliance

// Add prompt for image generation guidance
// Note: Prompts are not part of core MCP protocol - removed for compliance

// Helper function to convert old tool format to new format
function convertToolToNewFormat(tool: any) {
  return {
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
    execute: async (params: any) => {
      try {
        const result = await tool.execute(params, {
          log: logger,
          reportProgress: (progress: any) => {
            logger.debug('Tool progress', progress);
          }
        });
        
        // Convert imageContent format to new format
        if (result && result.buffer) {
          return {
            contentType: 'image/png',
            content: result.buffer.toString('base64')
          };
        }
        
        return result;
      } catch (error: any) {
        throw new Error(error.message);
      }
    }
  };
}

// Add health check tool
server.addTool("health-check", "Comprehensive health check for the MCP server and Stability AI API connectivity. Validates server status, system resources, and external API availability.", z.object({}), async (params: any) => {
  logger.info("Comprehensive health check requested");
  
  const healthChecks = {
    server: {
      status: "healthy",
      name: SERVER_NAME,
      version: SERVER_VERSION,
      environment: NODE_ENV,
      uptime: process.uptime(),
    },
    system: {
      memory: Math.round(process.memoryUsage().rss / 1024 / 1024) + "MB RSS",
      platform: process.platform,
      node_version: process.version,
    },
    stability_api: {
      status: "configured",
      keys_configured: API_KEYS.length,
      current_key_index: currentApiKeyIndex,
      validation: "pending"
    }
  };
  
  // Validate API connectivity with a simple test
  try {
    // Simple API validation - check if we can make a basic request
    const testResponse = await fetch('https://api.stability.ai/v1/engines/list', {
      headers: {
        'Authorization': `Bearer ${getCurrentApiKey()}`,
        'Accept': 'application/json',
      },
    });
    
    if (testResponse.ok) {
      healthChecks.stability_api.status = "connected";
      healthChecks.stability_api.validation = "success";
      logger.info("Stability AI API connectivity validated successfully");
    } else {
      healthChecks.stability_api.status = "error";
      healthChecks.stability_api.validation = `HTTP ${testResponse.status}: ${testResponse.statusText}`;
      logger.warn("Stability AI API validation failed", { status: testResponse.status });
    }
  } catch (error: any) {
    healthChecks.stability_api.status = "error";
    healthChecks.stability_api.validation = `Connection failed: ${error.message}`;
    logger.error("Stability AI API connectivity test failed", { error: error.message });
  }
  
  // Determine overall status
  const overallStatus = healthChecks.stability_api.status === "connected" ? "healthy" : "degraded";
  
  const healthStatus = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    checks: healthChecks
  };
  
  return JSON.stringify(healthStatus, null, 2);
});

// Add metrics tool
server.addTool("server-metrics", "Get server performance metrics", z.object({}), async (params: any) => {
  logger.info("Metrics requested");
  
  const metrics = {
    timestamp: new Date().toISOString(),
    process: {
      pid: process.pid,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      version: process.version,
      platform: process.platform,
    },
    system: {
      arch: process.arch,
      cpus: require('os').cpus().length,
      totalMemory: require('os').totalmem(),
      freeMemory: require('os').freemem(),
    },
  };
  
  return JSON.stringify(metrics, null, 2);
});

// Stability AI Tools
server.addTool("generate-image", "Generate images from text prompts using Stability AI's text-to-image generation API. Supports multiple models, samplers, and configuration options for creative control.", z.object({
  prompt: z.string(),
  negative_prompt: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  aspect_ratio: z.string().optional(),
  seed: z.number().optional(),
  samples: z.number().optional(),
  output_format: z.enum(['jpeg', 'png']).optional(),
  model: z.string().optional(),
  mode: z.enum(['text-to-image', 'image-to-image']).optional(),
}), async (params: any) => {
  logger.info("Generating image with Stability AI", { prompt: params.prompt });
  
  try {
    const result = await generateImage({
      prompt: params.prompt!,
      negative_prompt: params.negative_prompt,
      width: params.width,
      height: params.height,
      aspect_ratio: params.aspect_ratio,
      seed: params.seed,
      samples: params.samples,
      output_format: params.output_format,
      model: params.model,
      mode: params.mode
    });
    
    return {
      type: 'image',
      data: result.images[0].base64,
      mimeType: 'image/png'
    };
  } catch (error: any) {
    throw new Error(`Failed to generate image: ${error.message}`);
  }
});

server.addTool("generate-image-sd35", "Generate high-quality images using Stable Diffusion 3.5, Stability AI's most advanced text-to-image model with superior prompt adherence and professional-grade outputs.", z.object({
  prompt: z.string(),
  negative_prompt: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  aspect_ratio: z.string().optional(),
  seed: z.number().optional(),
  samples: z.number().optional(),
  output_format: z.enum(['jpeg', 'png']).optional(),
  model: z.string().optional(),
  mode: z.enum(['text-to-image', 'image-to-image']).optional(),
}), async (params: any) => {
  logger.info("Generating image with Stable Diffusion 3.5", { prompt: params.prompt });
  
  try {
    const result = await generateImageSD35({
      prompt: params.prompt!,
      negative_prompt: params.negative_prompt,
      width: params.width,
      height: params.height,
      aspect_ratio: params.aspect_ratio,
      seed: params.seed,
      samples: params.samples,
      output_format: params.output_format,
      model: params.model,
      mode: params.mode
    });
    
    return {
      type: 'image',
      data: result.images[0].base64,
      mimeType: 'image/png'
    };
  } catch (error: any) {
    throw new Error(`Failed to generate image with SD3.5: ${error.message}`);
  }
});

server.addTool("remove-background", "Automatically detect and remove backgrounds from images using Stability AI's background removal API. Returns transparent PNG images with foreground subjects isolated.", z.object({
  image: z.string(), // base64 encoded image
}), async (params: any) => {
  logger.info("Removing background from image");
  
  try {
    const result = await removeBackground({ image: params.image! });
    
    return {
      type: 'image',
      data: result.image,
      mimeType: 'image/png'
    };
  } catch (error: any) {
    throw new Error(`Failed to remove background: ${error.message}`);
  }
});

server.addTool("outpaint", "Extend image boundaries with AI-generated content using Stability AI's outpainting technology. Expand canvas size while maintaining visual coherence with the original image.", z.object({
  image: z.string(), // base64 encoded image
  prompt: z.string(),
  direction: z.enum(['left', 'right', 'top', 'bottom', 'all']),
  width: z.number().optional(),
  height: z.number().optional(),
}), async (params: any) => {
  logger.info("Outpainting image", { direction: params.direction });
  
  try {
    const result = await outpaint({
      image: params.image!,
      prompt: params.prompt!,
      direction: params.direction!,
      width: params.width,
      height: params.height
    });
    
    return {
      type: 'image',
      data: result.image,
      mimeType: 'image/png'
    };
  } catch (error: any) {
    throw new Error(`Failed to outpaint image: ${error.message}`);
  }
});

server.addTool("search-and-replace", "Find and replace specific elements within images using natural language descriptions. Identify target objects and specify replacement content with text prompts.", z.object({
  image: z.string(), // base64 encoded image
  search_prompt: z.string(),
  replace_prompt: z.string(),
}), async (params: any) => {
  logger.info("Searching and replacing objects in image", { 
    search: params.search_prompt, 
    replace: params.replace_prompt 
  });
  
  try {
    const result = await searchAndReplace({
      image: params.image!,
      search_prompt: params.search_prompt!,
      replace_prompt: params.replace_prompt!
    });
    
    return {
      type: 'image',
      data: result.image,
      mimeType: 'image/png'
    };
  } catch (error: any) {
    throw new Error(`Failed to search and replace: ${error.message}`);
  }
});

server.addTool("upscale-fast", "Increase image resolution 4x using Stability AI's fast upscaling model. Optimized for speed while maintaining image quality and detail preservation.", z.object({
  image: z.string(), // base64 encoded image
}), async (params: any) => {
  logger.info("Upscaling image (fast 4x)");
  
  try {
    const result = await upscaleFast({ image: params.image! });
    
    return {
      contentType: 'image/png',
      content: result.image
    };
  } catch (error: any) {
    throw new Error(`Failed to upscale image (fast): ${error.message}`);
  }
});

server.addTool("upscale-creative", "Upscale images to 4K resolution with creative enhancement using Stability AI's advanced upscaling. Adds detail and improves image quality beyond simple resolution increase.", z.object({
  image: z.string(), // base64 encoded image
  creativity: z.number().min(0).max(1).optional(),
}), async (params: any) => {
  logger.info("Upscaling image (creative up to 4K)");
  
  try {
    const result = await upscaleCreative({ image: params.image!, creativity: params.creativity });
    
    return {
      contentType: 'image/png',
      content: result.image
    };
  } catch (error: any) {
    throw new Error(`Failed to upscale image (creative): ${error.message}`);
  }
});

server.addTool("control-sketch", "Convert hand-drawn sketches into polished, production-ready images using Stability AI's sketch-to-image technology. Maintains the structure and composition of the original sketch while enhancing visual quality.", z.object({
  image: z.string(), // base64 encoded sketch image
  prompt: z.string(),
}), async (params: any) => {
  logger.info("Processing sketch to production image");
  
  try {
    const result = await controlSketch({ image: params.image!, prompt: params.prompt! });
    
    return {
      contentType: 'image/png',
      content: result.image
    };
  } catch (error: any) {
    throw new Error(`Failed to process sketch: ${error.message}`);
  }
});

server.addTool("control-style", "Apply artistic styles from reference images to generated content using Stability AI's style transfer technology. Create images that match the visual characteristics of provided style references.", z.object({
  image: z.string(), // base64 encoded style reference image
  prompt: z.string(),
}), async (params: any) => {
  logger.info("Applying style to image");
  
  try {
    const result = await controlStyle({ image: params.image!, prompt: params.prompt! });
    
    return {
      contentType: 'image/png',
      content: result.image
    };
  } catch (error: any) {
    throw new Error(`Failed to apply style: ${error.message}`);
  }
});

server.addTool("control-structure", "Generate new images while preserving the structural composition of reference images using Stability AI's structure control technology. Maintain layout, pose, and spatial relationships while changing content.", z.object({
  image: z.string(), // base64 encoded structure reference image
  prompt: z.string(),
}), async (params: any) => {
  logger.info("Maintaining structure while generating image");
  
  try {
    const result = await controlStructure({ image: params.image!, prompt: params.prompt! });
    
    return {
      contentType: 'image/png',
      content: result.image
    };
  } catch (error: any) {
    throw new Error(`Failed to maintain structure: ${error.message}`);
  }
});

server.addTool("replace-background-and-relight", "Replace image backgrounds with AI-generated environments and apply realistic lighting adjustments using Stability AI's background replacement and relighting technology.", z.object({
  image: z.string(), // base64 encoded image
  background_prompt: z.string(),
}), async (params: any) => {
  logger.info("Replacing background and relighting image");
  
  try {
    const result = await replaceBackgroundAndRelight({ image: params.image!, background_prompt: params.background_prompt! });
    
    return {
      contentType: 'image/png',
      content: result.image
    };
  } catch (error: any) {
    throw new Error(`Failed to replace background and relight: ${error.message}`);
  }
});

server.addTool("search-and-recolor", "Identify specific objects in images and apply color modifications using Stability AI's object detection and recoloring technology. Change colors of targeted elements while preserving image quality.", z.object({
  image: z.string(), // base64 encoded image
  prompt: z.string(),
  select_prompt: z.string(),
}), async (params: any) => {
  logger.info("Searching and recoloring objects in image", { 
    prompt: params.prompt, 
    select_prompt: params.select_prompt 
  });
  
  try {
    const result = await searchAndRecolor(params.image!, params.prompt!, params.select_prompt!);
    
    return {
      contentType: 'image/png',
      content: result
    };
  } catch (error: any) {
    throw new Error(`Failed to search and recolor: ${error.message}`);
  }
});

server.addTool("upscale-conservative", "Increase image resolution while preserving original details and minimizing artifacts using Stability AI's conservative upscaling model. Ideal for archival and professional photography applications.", z.object({
  image: z.string(), // base64 encoded image
}), async (params: any) => {
  logger.info("Upscaling image (conservative - preserve details)");
  
  try {
    const result = await upscaleConservative(params.image, "", undefined, undefined, undefined, undefined);
    
    return {
      contentType: 'image/png',
      content: result
    };
  } catch (error: any) {
    throw new Error(`Failed to upscale image (conservative): ${error.message}`);
  }
});

server.addTool("erase", "Remove unwanted objects from images using AI-powered object removal technology. Works with manual masks or automatic object detection to cleanly erase elements while preserving background integrity.", z.object({
  image: z.string(), // base64 encoded image
  mask: z.string(), // base64 encoded mask image
}), async (params: any) => {
  logger.info("Erasing objects from image");
  
  try {
    const result = await erase(params.image!, params.mask!);
    
    return {
      contentType: 'image/png',
      content: result
    };
  } catch (error: any) {
    throw new Error(`Failed to erase objects: ${error.message}`);
  }
});

server.addTool("inpaint", "Fill in or replace specified image areas with AI-generated content using Stability AI's inpainting technology. Perfect for removing objects, repairing damage, or creatively modifying image regions.", z.object({
  image: z.string(), // base64 encoded image
  mask: z.string(), // base64 encoded mask image
  prompt: z.string(),
}), async (params: any) => {
  logger.info("Inpainting image areas");
  
  try {
    const result = await inpaint(params.image!, params.prompt!, undefined, undefined, params.mask!);
    
    return {
      contentType: 'image/png',
      content: result
    };
  } catch (error: any) {
    throw new Error(`Failed to inpaint: ${error.message}`);
  }
});

// Start server with enhanced configuration
server.start({
  transportType: "httpStream",
  httpStream: {
    endpoint: "/sse",
    port: PORT,
    host: HOST,
  },
});

console.log(`🚀 FastMCP Server ${SERVER_NAME} v${SERVER_VERSION} starting...`);
console.log(`📍 Environment: ${NODE_ENV}`);
console.log(`🌐 Server: http://${HOST}:${PORT}/sse`);
console.log(`❤️  Health: http://${HOST}:${PORT}${HEALTH_CHECK_PATH}`);
console.log(`📊 Metrics: http://${HOST}:${PORT}${METRICS_PATH}`);
console.log(`🔧 Log Level: ${LOG_LEVEL}`);


async function fetchWebpageContent(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.text();
  } catch (error: any) {
    console.error("Error fetching webpage content:", error);
    return `Error fetching content from ${url}: ${error.message ?? String(error)}`;
  }
}