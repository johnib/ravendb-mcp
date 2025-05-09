#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as dotenv from 'dotenv';
import { safeLog } from './common/utils.js';
import { createRavenDBServer } from './server.js';
import { configFromEnv } from './types/config.js';

// Load environment variables
dotenv.config();

// Log startup information
safeLog('RavenDB MCP Server - Starting up');

// Create the server configuration from environment variables
const config = configFromEnv();

// Log configuration
safeLog(`Using ${config.authMethod} authentication`);
if (config.defaultUrl) {
  safeLog(`Default URL: ${config.defaultUrl}`);
}

// Create the server
const server = createRavenDBServer(config);

// Run the server
async function runServer() {
  // Connect the server to the stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  safeLog('RavenDB MCP Server running on stdio');
}

// Start the server
runServer().catch(error => {
  safeLog(
    `Fatal error in main(): ${
      error instanceof Error ? error.message : String(error)
    }`,
  );
  process.exit(1);
});

// Handle process termination
process.on('SIGINT', () => {
  safeLog('Received SIGINT, shutting down');
  process.exit(0);
});

process.on('SIGTERM', () => {
  safeLog('Received SIGTERM, shutting down');
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', error => {
  safeLog(`Uncaught exception: ${error.message}`);
  safeLog(error.stack || 'No stack trace available');
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', reason => {
  safeLog(
    `Unhandled promise rejection: ${
      reason instanceof Error ? reason.message : String(reason)
    }`,
  );
  process.exit(1);
});
