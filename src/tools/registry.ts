import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// Tool definitions interface
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: any;
  handler: (args: any) => Promise<any>;
}

export const toolRegistry: ToolDefinition[] = [
  {
    name: 'generate_image',
    description: 'Generate images using Stability AI models',
    parameters: {
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
      width: {
        type: 'number',
        description: 'Image width',
        default: 1024
      },
      height: {
        type: 'number',
        description: 'Image height',
        default: 1024
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
    handler: async ({ prompt, api_key, model, aspect_ratio, output_format }: any) => {
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
        throw new Error(`Image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }
];

// Register all tools with the MCP server
export function registerTools(server: McpServer) {
  for (const tool of toolRegistry) {
    server.tool(tool.name, tool.parameters, tool.handler);
  }
}

// Utility function to get tool names
export function getToolNames(): string[] {
  return toolRegistry.map(tool => tool.name);
}

// Utility function to get tool by name
export function getToolByName(name: string): ToolDefinition | undefined {
  return toolRegistry.find(tool => tool.name === name);
}