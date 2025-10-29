#!/usr/bin/env node

// Re-export everything from the modular server structure
export * from './server/index';

// Main entry point - maintain backward compatibility
import { main } from './server/main';

// Only run if this file is executed directly
if (require.main === module) {
  main();
}
