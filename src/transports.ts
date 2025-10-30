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
       const currentTime = new Date().toISOString();
       const memoryUsage = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
       const uptime = Math.round(process.uptime());
       
       res.setHeader('X-Internal-Monitor-Timestamp', currentTime);
       res.setHeader('X-Internal-Monitor-Status', 'healthy');
       res.setHeader('X-Internal-Monitor-Memory', memoryUsage + 'MB');
       res.setHeader('X-Internal-Monitor-Uptime', uptime + 's');
       res.setHeader('X-Internal-Monitor-Environment', process.env['NODE_ENV'] || 'development');
       res.setHeader('X-Internal-Monitor-Response-Time', Date.now() - Number(_req.headers['x-request-start'] || Date.now()) + 'ms');
       res.setHeader('X-Internal-Monitor-Last-Error', 'none');
       res.setHeader('X-Internal-Monitor-Connections', '0');
       res.setHeader('X-Internal-Monitor-Server-URL', 'https://function-bun-production-19e1.up.railway.app');
       res.setHeader('X-Internal-Monitor-Zapier-URL', 'https://mcp.zapier.com/api/mcp/s/ZmM5MWNhYjItN2FmNS00YjRlLWI0ZGMtNDBlZDBiMGZkMTZiOjI3ODBlODkxLTE4NjctNGQxOS04N2MyLTEwOGIzMjVjNDBhMg==/mcp');
       
       res.status(200).json({ 
         status: 'ok', 
         timestamp: currentTime,
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
