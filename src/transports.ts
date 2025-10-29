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
  
  constructor(mcpServer: McpServer, port: number = 3001, host: string = '0.0.0.0') {
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
  
  constructor(mcpServer: McpServer, port: number = 3000, host: string = '0.0.0.0') {
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
    this.app.get('/health', (_, res) => {
      res.status(200).json({ 
        status: 'ok', 
        service: 'stability-ai-mcp-server',
        transports: ['HTTP', 'SSE'],
        ports: {
          http: parseInt(process.env['PORT'] || '3000'),
          sse: parseInt(process.env['PORT'] || '3000') + 1
        }
      });
    });
    
    this.app.post('/mcp', async (req, res) => {
      const message = req.body;
      const response = await this.mcpServer.processRequest(message);
      res.json(response);
    });
    
    this.app.get('/', (_, res) => {
      res.json({
        message: 'Stability AI MCP Server',
        status: 'running',
        transports: ['HTTP', 'SSE'],
        endpoints: {
          info: '/ (GET)',
          health: '/health (GET)',
          mcp: '/mcp (POST)',
          sse: 'Connect via Socket.io for streaming'
        }
      });
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
  // Use PORT from environment for HTTP (Railway compatibility)
  const httpPort = parseInt(process.env['PORT'] || '3000');
  // Use next port for SSE
  const ssePort = httpPort + 1;
  const host = process.env['HOST'] || '0.0.0.0';
  
  const httpTransport = new HTTPTransport(mcpServer, httpPort, host);
  const sseTransport = new SSETransport(mcpServer, ssePort, host);
  
  return { httpTransport, sseTransport };
}
