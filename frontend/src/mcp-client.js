// Simple MCP Client for Tattty.com
// No authentication needed - connects directly to your MCP server

import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { Client } from "@modelcontextprotocol/sdk/client";

class TatttyMCPClient {
  constructor() {
    this.client = null;
    this.transport = null;
    this.connected = false;
  }

  // Connect to your MCP server
  async connect() {
    try {
      console.log('🔗 Connecting to Tattty MCP server...');
      
      // Your MCP server endpoint - no auth needed!
      this.transport = new SSEClientTransport(
        new URL("https://tattty.com/sse")
      );

      this.client = new Client(
        {
          name: "tattty-frontend",
          version: "1.0.0",
        },
        { capabilities: {} }
      );

      await this.client.connect(this.transport);
      this.connected = true;
      
      console.log('✅ Connected to Tattty MCP server!');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to connect to MCP server:', error);
      this.connected = false;
      return false;
    }
  }

  // Generate tattoo image using MCP
  async generateTattoo(prompt, style = "realistic") {
    if (!this.connected) {
      throw new Error('Not connected to MCP server');
    }

    try {
      console.log('🎨 Generating tattoo with prompt:', prompt);
      
      const result = await this.client.callTool({
        name: "generate-image",
        arguments: { 
          prompt: `${prompt}, tattoo design, ${style} style, high quality`,
          engine: "sd3.5"
        }
      });

      // Extract image data from MCP response
      if (result.content && result.content.length > 0) {
        const content = result.content[0];
        
        if (content.type === 'image' && content.data) {
          // Return base64 image data
          return {
            success: true,
            image: content.data,
            prompt: prompt,
            style: style
          };
        }
      }

      throw new Error('No image data received from MCP server');
      
    } catch (error) {
      console.error('❌ Tattoo generation failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Other MCP tool calls...
  async removeBackground(imageData) {
    if (!this.connected) return { success: false, error: 'Not connected' };
    
    try {
      const result = await this.client.callTool({
        name: "remove-background",
        arguments: { image: imageData }
      });
      
      return { success: true, image: result.content[0]?.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Health check
  async checkHealth() {
    if (!this.connected) return { status: 'disconnected' };
    
    try {
      const result = await this.client.callTool({
        name: "health-check",
        arguments: {}
      });
      
      return JSON.parse(result.content[0]?.text || '{}');
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }

  // Disconnect
  disconnect() {
    if (this.client) {
      this.client.close();
    }
    this.connected = false;
    console.log('🔌 Disconnected from MCP server');
  }
}

// Export singleton instance
export const mcpClient = new TatttyMCPClient();

export default TatttyMCPClient;