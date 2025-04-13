import { Command } from 'commander';
import { Logger } from '../utils/logger.util.js';
import { VERSION, CLI_NAME } from '../utils/constants.util.js';

// Import Bitbucket-specific CLI modules using named import
import { registerProjectCommands } from './atlassian.projects.cli.js';
import { registerRepositoryCommands } from './atlassian.repositories.cli.js';

// Package description
const DESCRIPTION =
	'A Model Context Protocol (MCP) server for Atlassian Bitbucket integration';

// Create a contextualized logger for this file
const cliLogger = Logger.forContext('cli/index.ts');

// Log CLI initialization
cliLogger.debug('Bitbucket CLI module initialized');

/**
 * Setup and run the CLI application.
 */
export async function runCli(args: string[]): Promise<void> {
	const program = new Command();

	program.name(CLI_NAME).description(DESCRIPTION).version(VERSION);

	// Register CLI commands using the imported function
	cliLogger.debug('Registering command groups...');
	try {
		registerProjectCommands(program);
		registerRepositoryCommands(program);
		cliLogger.info('All command groups registered successfully.');
	} catch (error) {
		cliLogger.error('Failed to register command groups:', error);
		process.exit(1);
	}

	// Hook up the MCP server to a base command if needed (example)
	// program
	//     .command('mcp')
	//     .description('Interact with the MCP server')
	//     .action(async () => {
	//         // Example: Start server in stdio mode if command is run
	//         serverInstance.listenStdio();
	//         cliLogger.info('MCP Server listening on stdio...');
	//     });

	// Parse arguments
	cliLogger.debug('Parsing CLI arguments...');
	await program.parseAsync(['node', 'script.js', ...args]);

	if (!args.length) {
		program.outputHelp();
	}
}
