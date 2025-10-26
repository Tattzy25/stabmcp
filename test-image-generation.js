// Simple test script to call the image generation tool through MCP protocol
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";

async function testImageGeneration() {
  try {
    console.log("Connecting to MCP server...");
    
    // Connect to the MCP server using SSE transport
    const transport = new SSEClientTransport(new URL("http://localhost:8080/sse"));
    const client = new Client({
      name: "test-client",
      version: "1.0.0"
    });
    
    await client.connect(transport);
    console.log("Connected to MCP server successfully!");
    
    // Call the generate-image-sd35 tool
    console.log("Calling generate-image-sd35 tool...");
    
    const result = await client.callTool({
      name: "generate-image-sd35",
      arguments: {
        prompt: "a beautiful sunset over mountains with vibrant colors",
        steps: 10,
        width: 512,
        height: 512
      }
    });
    
    console.log("Image generation successful!");
    console.log("Result:", result);
    
    await client.close();
    
  } catch (error) {
    console.error("Error:", error.message);
    if (error.stack) {
      console.error("Stack:", error.stack);
    }
  }
}

// Run the test
testImageGeneration();