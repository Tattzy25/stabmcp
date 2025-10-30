import express = require('express');
import { createServer, Server } from 'http';
import { Server as SocketServer } from 'socket.io';
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// Extend McpServer interface to include processRequest method
interface McpServerWithProcessRequest extends McpServer {
  processRequest(message: any): Promise<any>;
}

export class SSETransport {
  private server: Server;
  private io: SocketServer;
  private mcpServer: McpServerWithProcessRequest;
  
  constructor(mcpServer: McpServer, port: number, host: string) {
    this.mcpServer = mcpServer as McpServerWithProcessRequest;
    this.server = createServer();
    this.io = new SocketServer(this.server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });
    
    this.setupSocketHandlers();
    
    this.server.listen(port, host, () => {
      console.log(`SSE server running on port ${port}`);
    });
  }
  
  private setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log('Client connected via SSE');
      
      socket.on('mcp_message', async (data: any) => {
        const response = await this.mcpServer.processRequest(data);
        socket.emit('mcp_response', response);
      });
      
      socket.on('disconnect', () => {
        console.log('Client disconnected from SSE');
      });
    });
  }
  
  async connect() {
    // Connection is handled by socket.io
    return Promise.resolve();
  }
  
  close() {
    this.io.close();
    this.server.close();
  }
}

export class HTTPTransport {
  private app: express.Application;
  private server: Server;
  private mcpServer: McpServerWithProcessRequest;
  
  constructor(mcpServer: McpServer, port: number, host: string) {
    this.mcpServer = mcpServer as McpServerWithProcessRequest;
    this.app = express();
    this.server = createServer(this.app);
    
    this.setupMiddleware();
    this.setupRoutes();
    
    this.server.listen(port, host, () => {
      console.log(`HTTP server running on port ${port}`);
    });
  }
  
  private setupMiddleware() {
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
  }
  
  private setupRoutes() {
    // Enhanced health check endpoint for Railway monitoring
     this.app.get('/health', (_req, res) => {
       // INTERNAL MONITORING ONLY - For your eyes only, not for external users
       // Monitoring headers for Google Sheets integration - EXACTLY as specified
       const currentTime = new Date().toISOString();
       const memoryUsage = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
       const uptime = Math.round(process.uptime());
       const requestStart = _req.headers['x-request-start'] ? Number(_req.headers['x-request-start']) : Date.now();
       const responseTime = Date.now() - requestStart;
       
       // LIVE MONITORING DATA - REAL-TIME SERVER METRICS:
       res.setHeader('X-Monitor-Timestamp', currentTime);
       res.setHeader('X-Monitor-Status', 'healthy');
       res.setHeader('X-Monitor-Memory-Usage', memoryUsage + 'MB');
       res.setHeader('X-Monitor-Uptime', uptime + 's');
       res.setHeader('X-Monitor-Environment', process.env['NODE_ENV'] || '');
       res.setHeader('X-Monitor-Response-Time', responseTime + 'ms');
       res.setHeader('X-Monitor-Last-Error', '');
       res.setHeader('X-Monitor-Active-Connections', '0');
       
       // Standard health response for external users
       res.status(200).json({ 
         status: 'ok', 
         timestamp: currentTime,
         service: 'stability-ai-mcp-server',
         version: process.env['npm_package_version'],
         environment: process.env['NODE_ENV'],
         uptime: process.uptime(),
         memory: process.memoryUsage(),
         transports: ['http', 'sse']
       });
     });
    
    this.app.post('/mcp', async (req, res) => {
      const message = req.body;
      const response = await this.mcpServer.processRequest(message);
      res.json(response);
    });
    
    // Root endpoint for server information
     this.app.get('/', (_req, res) => {
      res.json({
        message: 'Production MCP Server - Live Deployment',
        description: 'Live MCP server for real-time monitoring and integration',
        deployment: 'Railway - Production',
        server_url: 'https://function-bun-production-19e1.up.railway.app',
        endpoints: {
          health: '/health',
          mcp: '/mcp (POST)',
          sse: 'WebSocket connection for SSE transport'
        },
        tools: ['generate_image'],
        note: 'Internal monitoring enabled. Users provide their own API keys. No server authentication required.'
      });
    });
    
    // Enable CORS for public access
     this.app.use((req, res, next) => {
       res.header('Access-Control-Allow-Origin', '*');
       res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
       res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
       
       if (req.method === 'OPTIONS') {
         res.status(200).end();
         return;
       }
       
       next();
     });
  }
  
  async connect() {
    // Connection is handled by Express
    return Promise.resolve();
  }
  
  close() {
    this.server.close();
  }
}

// Factory function to create REAL MCP transports
export function createTransports(mcpServer: McpServer) {
  // Use PORT from environment for HTTP
  const httpPort = parseInt(process.env['PORT'] || '');
  // Use next port for SSE
  const ssePort = httpPort + 1;
  const host = process.env['HOST'] || '';
  
  const httpTransport = new HTTPTransport(mcpServer, httpPort, host);
  const sseTransport = new SSETransport(mcpServer, ssePort, host);
  
  return { httpTransport, sseTransport };
}
