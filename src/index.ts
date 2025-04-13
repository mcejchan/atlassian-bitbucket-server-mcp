#!/usr/bin/env node
console.log('[MCP SERVER] Starting Bitbucket MCP server...');
console.log('[MCP SERVER] Node version:', process.version);
process.on('uncaughtException', (err) => {
	console.error('[MCP SERVER] Uncaught Exception:', err);
	process.exit(1);
});
process.on('unhandledRejection', (reason) => {
	console.error('[MCP SERVER] Unhandled Rejection:', reason);
	process.exit(1);
});
import 'module-alias/register';
// Initialize module aliases
import './utils/moduleAlias.js';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express, { Request, Response } from 'express';
import http from 'http';
import { config } from './utils/config.util.js';
import { VERSION, CLI_NAME } from './utils/constants.util.js';
import { Logger } from './utils/logger.util.js';
import { registerProjectMcpTools } from './tools/atlassianProjectsMcpTools.js';
import { registerRepositoryMcpTools } from './tools/atlassianRepositoriesMcpTools.js';

// Create a contextualized logger for this file
const indexLogger = Logger.forContext('index.ts');

/**
 * Start the MCP server with HTTP/SSE or STDIO transport
 */
export async function startServer() {
	indexLogger.info(`Starting ${CLI_NAME} v${VERSION} in server mode...`);

	let serverInstance: McpServer;
	const transportType = process.env.MCP_TRANSPORT || 'stdio';
	const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

	try {
		indexLogger.info('Loading configuration...');
		config.load();
		indexLogger.info(`Loaded ATLASSIAN_BITBUCKET_SERVER_URL: ${config.get('ATLASSIAN_BITBUCKET_SERVER_URL') ? 'Set' : 'Not Set'}`);

		indexLogger.info('Creating McpServer instance...');
		serverInstance = new McpServer({
			name: CLI_NAME,
			version: VERSION,
			logger: Logger.forContext('McpServer')
		});

		indexLogger.info('Registering MCP tools...');
		registerProjectMcpTools(serverInstance);
		registerRepositoryMcpTools(serverInstance);

		if (transportType === 'stdio') {
			indexLogger.info('Initializing STDIO transport...');
			const transportInstance = new StdioServerTransport();
			indexLogger.info('Connecting MCP server to STDIO transport...');
			await serverInstance.connect(transportInstance);
			indexLogger.info('MCP server connected and listening (STDIO).');
		} else {
			indexLogger.info('Initializing HTTP/SSE transport...');
			const app = express();
			const httpServer = http.createServer(app);

			// Set up SSE endpoint
			app.get('/message', async (_req: Request, res: Response) => {
				indexLogger.info('Received new SSE connection on /message');
				const transportInstance = new SSEServerTransport('/message', res);
				await serverInstance.connect(transportInstance);
			});

			httpServer.listen(port, () => {
				indexLogger.info(`MCP server listening on http://localhost:${port} (HTTP/SSE)`);
			});

			httpServer.on('error', (err: NodeJS.ErrnoException) => {
				if (err.code === 'EADDRINUSE') {
					indexLogger.error(`Port ${port} is already in use. Please stop the other process or use a different port.`);
					process.exit(1);
				} else {
					indexLogger.error('Server error:', err);
					process.exit(1);
				}
			});
		}
	} catch (error) {
		indexLogger.error('Failed to start MCP server:', error);
		process.exit(1); // Exit if server setup fails
	}
}

/**
 * Main entry point (Simplified)
 */
async function main() {
	const mainLogger = Logger.forContext('index.ts', 'main');
	mainLogger.info('Starting in server mode');

	// Check if arguments are provided (CLI mode)
	if (process.argv.length > 2) {
		// CLI mode: Pass arguments to CLI runner
		mainLogger.info('Starting in CLI mode');
		const args = process.argv.slice(2);
		if (args.includes('--cli') || args.includes('-c')) {
			// Run in CLI mode
			mainLogger.info('Starting in CLI mode...');
			try {
				const { runCli } = await import('./cli/index.js');
				// Remove the '--cli' or '-c' flag from args
				const cliArgs = args.filter(arg => arg !== '--cli' && arg !== '-c');
				await runCli(cliArgs);
			} catch (error) {
				mainLogger.error('Failed to run CLI:', error);
				process.exit(1);
			}
		} else {
			// MCP Server mode: Start server with default STDIO
			mainLogger.info('Starting in server mode');
			await startServer();
			mainLogger.info('Server is now running');
		}
	} else {
		// MCP Server mode: Start server with default STDIO
		mainLogger.info('Starting in server mode');
		await startServer();
		mainLogger.info('Server is now running');
	}

	// Remove the redundant startServer call
	mainLogger.info('Process should remain active via MCP connection.');
}

/**
 * Detect CLI mode: if the first argument is a known CLI command, run CLI mode.
 * Otherwise, start the server as usual.
 */
if (require.main === module) {
	const cliCommands = ['project', 'projects', 'repo', 'repos', 'repository', 'repositories', 'help', '--help', '-h', '--version', '-V'];
	const userArgs = process.argv.slice(2);
	const isCliMode = userArgs.length > 0 && cliCommands.some(cmd => userArgs[0].toLowerCase().startsWith(cmd));

	if (isCliMode) {
		// Import runCli dynamically to use the updated function signature
		import('./cli/index.js').then(({ runCli }) => {
			runCli(userArgs).catch((err: Error) => {
				indexLogger.error('Unhandled error in CLI mode', err);
				process.exit(1);
			});
		}).catch((err: Error) => {
			indexLogger.error('Failed to import CLI module', err);
			process.exit(1);
		});
	} else {
		main().catch((err: Error) => {
			indexLogger.error('Unhandled error in main process', err);
			process.exit(1);
		});
	}
}

// Export key utilities for library users
export { CLI_NAME, VERSION } from './utils/constants.util.js';
export * from './utils/error.util.js';
export { config, Logger };
