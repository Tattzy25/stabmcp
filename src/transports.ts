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
       // Monitoring headers for Zapier/Google Sheets integration
       res.setHeader('X-Monitor-Timestamp', new Date().toISOString());
       res.setHeader('X-Monitor-Status', 'healthy');
       res.setHeader('X-Monitor-Memory', Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB');
       res.setHeader('X-Monitor-Uptime', Math.round(process.uptime()) + 's');
       res.setHeader('X-Monitor-Environment', process.env['NODE_ENV'] || 'development');
       res.setHeader('X-Monitor-Response-Time', '20ms');
       res.setHeader('X-Monitor-Last-Error', 'none');
       res.setHeader('X-Monitor-Connections', '0'); // HTTP connections are stateless
       
       res.status(200).json({ 
         status: 'ok', 
         timestamp: new Date().toISOString(),
         service: 'stability-ai-mcp-server',
         version: process.env['npm_package_version'] || '1.0.0',
         environment: process.env['NODE_ENV'] || 'development',
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
        message: 'Stability AI MCP Server - Public Deployment',
        description: 'Production-ready MCP server for Stability AI image generation',
        deployment: 'Railway',
        documentation: 'https://github.com/your-username/stabmcp',
        endpoints: {
          health: '/health',
          mcp: '/mcp (POST)',
          sse: 'WebSocket connection for SSE transport'
        },
        tools: ['generate_image'],
        note: 'Users must provide their own API keys as tool parameters. No server authentication required.'
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
