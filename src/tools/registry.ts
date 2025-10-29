import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

// Tool definitions interface with proper Zod schemas (following TypeScript SDK patterns)
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: any;
  handler: (args: any) => Promise<any>;
}

// Zod schemas for input validation (following TypeScript SDK patterns)
const ImageGenerationSchema = z.object({
  prompt: z.string().describe('Text prompt for image generation'),
  api_key: z.string().describe('Stability AI API key (users provide their own)'),
  model: z.enum(['sd3', 'sd3.5', 'sd3-large', 'sd3.5-large', 'sd3.5-large-turbo'])
    .describe('Model to use'),
  width: z.number().describe('Image width'),
  height: z.number().describe('Image height'),
  aspect_ratio: z.enum(['16:9', '1:1', '21:9', '2:3', '3:2', '4:5', '5:4', '9:16', '9:21'])
    .describe('Aspect ratio for the image'),
  output_format: z.enum(['jpeg', 'png', 'webp']).describe('Output format for the image')
});



export const toolRegistry: ToolDefinition[] = [
  {
    name: 'generate_image',
    description: 'Generate images using Stability AI models',
    parameters: ImageGenerationSchema,
    handler: async (args: any) => {
      const { prompt, api_key, model, aspect_ratio, output_format } = ImageGenerationSchema.parse(args);
      
      try {
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