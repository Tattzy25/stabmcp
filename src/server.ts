#!/usr/bin/env node

// Re-export everything from the modular server structure
export * from './server/index.js';

// Main entry point - maintain backward compatibility
import { main } from './server/main.js';

// Only run if this file is executed directly
if (require.main === module) {
  main();
}
