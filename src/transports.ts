import express from 'express';
import { createServer, Server } from 'http';
import { Server as SocketServer } from 'socket.io';

// SSE Transport implementation
export class SSETransport {
  private server: Server;
  private io: SocketServer;
  
  constructor(port: number = 3001, host: string = '0.0.0.0') {
    this.server = createServer();
    this.io = new SocketServer(this.server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });
    
    this.setupSocketHandlers();
    
    this.server.listen(port, host, () => {
      console.log(`SSE Transport running on port ${port}`);
    });
  }
  
  private setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log('Client connected via SSE');
      
      // Handle MCP messages
      socket.on('mcp_message', async (_data: any) => {
        try {
          // For SSE transport, we'll just acknowledge the message
          // Actual MCP processing happens through stdio transport
          socket.emit('mcp_response', { 
            status: 'received', 
            message: 'MCP messages processed through stdio transport' 
          });
        } catch (error) {
          socket.emit('mcp_error', { 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
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

// HTTP Transport implementation
export class HTTPTransport {
  private app: express.Application;
  private server: Server;
  
  constructor(port: number = 3000, host: string = '0.0.0.0') {
    this.app = express();
    this.server = createServer(this.app);
    
    this.setupMiddleware();
    this.setupRoutes();
    
    this.server.listen(port, host, () => {
      console.log(`HTTP Transport running on port ${port}`);
    });
  }
  
  private setupMiddleware() {
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
  }
  
  private setupRoutes() {
    // Favicon route
    this.app.get('/favicon.ico', (_, res) => {
      res.redirect('https://i.imgur.com/7LSHoSe.png');
    });
    
    // Health check endpoint
    this.app.get('/health', (_, res) => {
      res.status(200).json({ status: 'ok', service: 'stability-ai-mcp-server' });
    });
    
    // MCP endpoint - for HTTP transport, we'll provide info only
    this.app.post('/mcp', async (_req, res) => {
      try {
        res.json({
          status: 'info',
          message: 'MCP server running with stdio transport',
          transport: 'HTTP wrapper for stdio',
          note: 'Connect via stdio transport for full MCP functionality'
        });
      } catch (error) {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });
    
    // Root endpoint
    this.app.get('/', (_, res) => {
      res.json({
        message: 'Stability AI MCP Server',
        status: 'running',
        transports: ['stdio', 'HTTP', 'SSE'],
        endpoints: {
          info: '/ (GET)',
          health: '/health',
          sse: 'Connect via Socket.io on port 3001'
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

// Factory function to create transports
export function createTransports() {
  // Use PORT from environment for HTTP (Railway compatibility)
  const httpPort = parseInt(process.env['PORT'] || '3000');
  // Use next port for SSE, or default to 3001
  const ssePort = httpPort === 3000 ? 3001 : httpPort + 1;
  const host = process.env['HOST'] || '0.0.0.0';
  
  const httpTransport = new HTTPTransport(httpPort, host);
  const sseTransport = new SSETransport(ssePort, host);
  
  return { httpTransport, sseTransport };
}