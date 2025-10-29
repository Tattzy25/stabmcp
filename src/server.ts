#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createTransports } from './transports.js';

// Create MCP server with just the Stability AI tool
const server = new McpServer({
  name: 'stability-ai-mcp-server',
  version: '1.0.0',
  description: 'MCP server for Stability AI image generation'
});

// Register the Stability AI image generation tool
server.tool(
  'generate_sd3_image',
  {
    prompt: {
      type: 'string',
      description: 'Text prompt for image generation'
    },
    api_key: {
      type: 'string',
      description: 'Stability AI API key (users provide their own)'
    },
    model: {
      type: 'string',
      description: 'Model to use (sd3, sd3.5, sd3-large, sd3.5-large, sd3.5-large-turbo)',
      enum: ['sd3', 'sd3.5', 'sd3-large', 'sd3.5-large', 'sd3.5-large-turbo'],
      default: 'sd3.5-large-turbo'
    },
    aspect_ratio: {
      type: 'string',
      description: 'Aspect ratio for the image',
      enum: ['16:9', '1:1', '21:9', '2:3', '3:2', '4:5', '5:4', '9:16', '9:21'],
      default: '1:1'
    },
    output_format: {
      type: 'string',
      description: 'Output format for the image',
      enum: ['jpeg', 'png', 'webp'],
      default: 'png'
    }
  },
  async ({ prompt, api_key, model, aspect_ratio, output_format }) => {
    try {
      // Correct Stability AI API endpoint and format
      const formData = new FormData();
      formData.append('prompt', prompt);
      formData.append('model', model);
      formData.append('aspect_ratio', aspect_ratio);
      formData.append('output_format', output_format);

      const response = await fetch('https://api.stability.ai/v2beta/stable-image/generate/sd3', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${api_key}`,
          'Accept': 'image/*'
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Stability AI API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      // Get image data as buffer and convert to Base64 (MCP requires Base64 encoding)
      const imageBuffer = await response.arrayBuffer();
      const base64Data = Buffer.from(imageBuffer).toString('base64');
      
      return {
        content: [{
          type: 'image',
          data: base64Data,
          mimeType: response.headers.get('content-type') || 'image/png'
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }
);

// Start the MCP server with appropriate transport
async function main() {
  // Always start stdio transport for MCP protocol
  const stdioTransport = new StdioServerTransport();
  await server.connect(stdioTransport);
  console.log('Stability AI MCP Server running on stdio');
  
  // Start HTTP and SSE transports for web connectivity
  if (process.env['NODE_ENV'] === 'production' || process.env['RAILWAY_ENVIRONMENT']) {
    const { httpTransport, sseTransport } = createTransports();
    
    // Connect HTTP and SSE transports
    await Promise.all([
      httpTransport.connect(),
      sseTransport.connect()
    ]);
    
    console.log('HTTP and SSE transports started for production deployment');
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { server, main };
