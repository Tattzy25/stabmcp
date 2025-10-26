# FastMCP Server - TaaTTTy

A TypeScript-based FastMCP server with multiple tools for various operations including mathematical calculations, web content fetching, and media downloads.

## Features

- **FastMCP Framework**: Built using the FastMCP TypeScript framework
- **Multiple Transport Support**: Supports SSE (Server-Sent Events) for real-time communication
- **Zod Validation**: Type-safe parameter validation using Zod schema
- **Multiple Tool Types**: Text, image, and audio content support

## Available Tools

### 1. `add`
- **Description**: Add two numbers
- **Parameters**: 
  - `a` (number): First number
  - `b` (number): Second number
- **Returns**: Sum of the two numbers as string

### 2. `fetch-zod`
- **Description**: Fetch the content of a URL using Zod validation
- **Parameters**:
  - `url` (string): URL to fetch content from
- **Returns**: HTML/content of the webpage as string

### 3. `download-simple`
- **Description**: Download a file and return simple string
- **Parameters**:
  - `url` (string): File URL
- **Returns**: Simple string response "Hello, world!"

### 4. `download-multiple`
- **Description**: Download a file and return multiple messages
- **Parameters**:
  - `url` (string): File URL
- **Returns**: Multiple text messages in content array format

### 5. `download-image`
- **Description**: Download an image file
- **Parameters**:
  - `url` (string): Image URL
- **Returns**: Image content using FastMCP's `imageContent` helper

### 6. `download-audio`
- **Description**: Download an audio file
- **Parameters**:
  - `url` (string): Audio URL
- **Returns**: Audio content using FastMCP's `audioContent` helper

## Installation

1. Install dependencies:
```bash
npm install
```

2. Compile TypeScript:
```bash
npx tsc
```

3. Start the server:
```bash
node index.js
```

## Server Configuration

- **Transport**: HTTP Stream (SSE)
- **Endpoint**: `/sse`
- **Port**: `8080`
- **URL**: `http://localhost:8080/sse`

## Usage

### Connecting to the Server

Clients can connect to the server using SSE transport:

```typescript
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { Client } from "@modelcontextprotocol/sdk/client";

const transport = new SSEClientTransport(new URL("http://localhost:8080/sse"));
const client = new Client(
  {
    name: "example-client",
    version: "1.0.0",
  },
  { capabilities: {} }
);

await client.connect(transport);
```

### Example Tool Calls

```typescript
// Call the add tool
const result = await client.callTool({
  name: "add",
  arguments: { a: 5, b: 3 }
});

// Call the fetch-zod tool
const content = await client.callTool({
  name: "fetch-zod", 
  arguments: { url: "https://example.com" }
});
```

## Project Structure

```
├── index.ts          # Main server file with tool definitions
├── index.js          # Compiled JavaScript output
├── package.json      # Project dependencies and scripts
├── tsconfig.json     # TypeScript configuration
└── README.md         # This file
```

## Dependencies

- **fastmcp**: FastMCP framework for building MCP servers
- **zod**: TypeScript-first schema validation
- **@types/node**: TypeScript definitions for Node.js

## Development

### Building the Project

```bash
# Compile TypeScript to JavaScript
npx tsc

# Start development server
node index.js
```

### Testing

The server can be tested using MCP clients or the FastMCP CLI tools.

## References

- [FastMCP Documentation](https://mcphub.tools/detail/punkpeye/fastmcp)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Zod Documentation](https://zod.dev/)

## License

This project is open source and available under the MIT License.

## Support

For issues and questions, please refer to the FastMCP documentation or create an issue in the project repository.