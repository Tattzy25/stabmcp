# TaTTTy-MCP Server

A production-grade Model Context Protocol (MCP) server for Stability AI image generation endpoints. This server provides AI assistants with access to Stability AI's powerful image generation capabilities through a standardized MCP interface.

## Features

- **SD3 Image Generation**: Generate high-quality images using Stability AI's latest SD3 models
- **Multiple Model Support**: Support for various SD3 variants including SD3, SD3.5, and SD3.5-Large-Turbo
- **Flexible Aspect Ratios**: Generate images in various aspect ratios (16:9, 1:1, 21:9, 2:3, 3:2, 4:5, 5:4, 9:16, 9:21)
- **Multiple Output Formats**: Support for JPEG, PNG, and WebP output formats
- **Production Ready**: Built with scalability, reliability, and maintainability in mind
- **Modular Architecture**: Clean separation of concerns with well-organized code structure

## Supported Models

- `sd3` - Standard SD3 model
- `sd3.5` - Enhanced SD3.5 model
- `sd3-large` - Large variant of SD3
- `sd3.5-large` - Large variant of SD3.5
- `sd3.5-large-turbo` - Optimized large variant for faster generation

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Stability AI API key
- An MCP-compatible client (Claude Desktop, Cursor, etc.)

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd stabmcp

# Install dependencies
npm install

# Build the project
npm run build
```

### Configuration

Set your Stability AI API key as an environment variable:

```bash
export STABILITY_API_KEY=your_api_key_here
# or on Windows:
set STABILITY_API_KEY=your_api_key_here
```

### Usage

#### Development Mode
```bash
npm run dev
```

#### Production Mode
```bash
npm start
```

#### Build for Production
```bash
npm run build
```

## Connecting to the MCP Server

### For Claude Desktop Users

1. **Locate your Claude Desktop configuration**:
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Linux: `~/.config/Claude/claude_desktop_config.json`

2. **Add the MCP server configuration**:

```json
{
  "mcpServers": {
    "stabmcp": {
      "command": "node",
      "args": ["/absolute/path/to/stabmcp/dist/server.js"],
      "env": {
        "STABILITY_API_KEY": "your_stability_api_key_here"
      }
    }
  }
}
```

3. **Restart Claude Desktop** for the changes to take effect

### For Cursor IDE Users

1. **Open Cursor Settings** (Ctrl+, or Cmd+,)
2. **Navigate to MCP Settings**
3. **Add a new MCP server**:

```json
{
  "name": "stabmcp",
  "command": "node",
  "args": ["/absolute/path/to/stabmcp/dist/server.js"],
  "env": {
    "STABILITY_API_KEY": "your_stability_api_key_here"
  },
  "autoStart": true
}
```

4. **Restart Cursor** for the changes to take effect

### For Other MCP Clients

Most MCP clients support similar configuration. The key elements are:

- **command**: `node`
- **args**: Path to your built server file
- **env**: Environment variables including your Stability API key

### HTTP/SSE Transport Support

This MCP server supports both STDIO and HTTP/SSE transports:

#### STDIO Transport (Default)
- Used by most desktop clients (Claude Desktop, Cursor)
- Configured via command execution

#### HTTP/SSE Transport
- Enable by setting environment variable: `ENABLE_HTTP_TRANSPORT=true`
- Server will listen on port 3000 (configurable via `PORT` environment variable)
- Connect via HTTP endpoint: `http://localhost:3000`

```bash
# Start with HTTP transport enabled
ENABLE_HTTP_TRANSPORT=true npm start

# Or with custom port
ENABLE_HTTP_TRANSPORT=true PORT=8080 npm start
```

### OpenAI Compatibility

While OpenAI doesn't natively support MCP servers, you can use this server in several ways:

#### 1. Via MCP-Compatible Clients
- Use Claude Desktop or Cursor IDE which support MCP and can interface with OpenAI
- The MCP server enhances these clients with image generation capabilities

#### 2. Direct HTTP API
When HTTP transport is enabled, you can make direct API calls:

```javascript
// Example: Direct HTTP call to generate image
const response = await fetch('http://localhost:3000/tools/generate_sd3_image', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your_openai_api_key'
  },
  body: JSON.stringify({
    prompt: "A beautiful sunset over mountains",
    api_key: process.env.STABILITY_API_KEY,
    model: "sd3.5-large-turbo",
    aspect_ratio: "16:9",
    output_format: "png"
  })
});
```

#### 3. Custom Integration
You can build a custom bridge between OpenAI and this MCP server:

```javascript
// Example: Custom OpenAI function calling integration
const tools = [
  {
    type: "function",
    function: {
      name: "generate_sd3_image",
      description: "Generate images using Stability AI SD3 models",
      parameters: {
        type: "object",
        properties: {
          prompt: { type: "string" },
          model: { type: "string", enum: ["sd3", "sd3.5", "sd3-large", "sd3.5-large", "sd3.5-large-turbo"] },
          aspect_ratio: { type: "string", enum: ["16:9", "1:1", "21:9", "2:3", "3:2", "4:5", "5:4", "9:16", "9:21"] },
          output_format: { type: "string", enum: ["jpeg", "png", "webp"] }
        },
        required: ["prompt"]
      }
    }
  }
];
```

### Testing the Connection

Once connected, you can test the server by asking your AI assistant to use the image generation tools:

```
Generate an image of a beautiful sunset using the SD3 model
```

The assistant should automatically use your MCP server to generate the image.

For HTTP transport testing:
```bash
curl -X POST http://localhost:3000/tools/generate_sd3_image \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "test image",
    "api_key": "your_stability_api_key",
    "model": "sd3.5-large-turbo"
  }'

## API Reference

### Available Tools

#### generate_sd3_image

Generate images using Stability AI SD3 models.

**Parameters:**
- `prompt` (string): Text prompt for image generation
- `api_key` (string): Stability AI API key (users provide their own)
- `model` (string): Model to use (default: 'sd3.5-large-turbo')
- `aspect_ratio` (string): Aspect ratio for the image (default: '1:1')
- `output_format` (string): Output format (default: 'png')

**Response:**
Returns base64-encoded image data with appropriate MIME type.

### Example Usage

```javascript
// Example MCP client usage
const result = await mcpClient.executeTool('generate_sd3_image', {
  prompt: "A beautiful sunset over mountains",
  api_key: process.env.STABILITY_API_KEY,
  model: "sd3.5-large-turbo",
  aspect_ratio: "16:9",
  output_format: "png"
});
```

## Project Structure

```
src/
├── server/           # Server core modules
│   ├── index.ts     # Main exports
│   ├── main.ts      # Server orchestration
│   ├── mcp-server.ts # MCP server configuration
│   ├── process-manager.ts # Process management
│   └── transports.ts # Transport initialization
├── server.ts        # Legacy entry point (deprecated)
├── tools/
│   └── registry.ts  # Tool definitions and registry
└── transports.ts    # Legacy transports (deprecated)
```

## Development

### Building

```bash
npm run build
```

### Linting

```bash
npm run lint
npm run lint:fix  # Auto-fix linting issues
```

### Testing

```bash
npm test
npm run test:watch    # Watch mode
npm run test:coverage # With coverage report
```

### Clean

```bash
npm run clean
```

## Deployment

### Railway Deployment

This project includes a `railway.json` configuration for easy deployment to Railway:

1. Connect your repository to Railway
2. Set the `STABILITY_API_KEY` environment variable
3. Deploy!

### Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist/ ./dist/

EXPOSE 3000

CMD ["node", "dist/server.js"]
```

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `STABILITY_API_KEY` | Stability AI API key | Yes | - |
| `PORT` | HTTP server port | No | 3000 |
| `NODE_ENV` | Environment mode | No | development |

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, please open an issue on GitHub or contact the development team.

## Acknowledgments

- Stability AI for their powerful image generation API
- The Model Context Protocol team for the MCP specification
- The open source community for various dependencies and tools