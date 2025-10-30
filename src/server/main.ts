#!/usr/bin/env node

import { createMcpServer } from './mcp-server';
import { createTransports } from '../transports';

async function main() {
  try {
    const server = createMcpServer();
    createTransports(server);

    // Transports auto-start - no need to call start() method
    console.log("✅ Transports initialized and ready for connections");

    const port = process.env['PORT'] || 3000;
    const host = process.env['HOST'] || "0.0.0.0";
    const env = process.env['NODE_ENV'] || "development";

    console.log("🚀 Stability AI MCP Server Started");
    console.log("==================================");
    console.log(`📍 Environment: ${env}`);
    console.log(`🌐 HTTP Server: http://${host}:${port}`);
    console.log(`🔌 MCP Endpoint: http://${host}:${port}/mcp`);
    console.log(`❤️  Health Check: http://${host}:${port}/health`);
    console.log("");
    console.log("🛠️  Available Tools:");
    console.log("- generate_image: Create images with Stability AI");    console.log("");
    console.log("💡 Usage: Users provide their own API keys as tool parameters");
    console.log("🔒 Security: No authentication required for server connection");
    console.log("🚂 Deployed on: Railway");

    // Graceful shutdown
    process.on("SIGINT", () => {
      console.log("\n🛑 Shutting down server gracefully...");
      // Transports handle their own cleanup automatically
      process.exit(0);
    });

    process.on("SIGTERM", () => {
      console.log("\n🛑 Shutting down server gracefully...");
      // Transports handle their own cleanup automatically
      process.exit(0);
    });

    // Handle uncaught exceptions
    process.on("uncaughtException", (error) => {
      console.error("💥 Uncaught Exception:", error);
      // Don't exit in production, let Railway handle restarts
      if (env === "development") {
        process.exit(1);
      }
    });

    process.on("unhandledRejection", (reason, promise) => {
      console.error("💥 Unhandled Rejection at:", promise, "reason:", reason);
      // Don't exit in production
      if (env === "development") {
        process.exit(1);
      }
    });

  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("❌ Fatal error in main:", error);
  process.exit(1);
});