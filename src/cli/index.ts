import { Command } from 'commander';
import { Logger } from '../utils/logger.util.js';
import { VERSION, CLI_NAME } from '../utils/constants.util.js';

// Import Bitbucket-specific CLI modules using named import
import { registerProjectCommands } from './atlassian.projects.cli.js';

// Package description
const DESCRIPTION =
	'A Model Context Protocol (MCP) server for Atlassian Bitbucket integration';

// Create a contextualized logger for this file
const cliLogger = Logger.forContext('cli/index.ts');

// Log CLI initialization
cliLogger.debug('Bitbucket CLI module initialized');

export async function runCli(args: string[]) {
	const program = new Command();

	program.name(CLI_NAME).description(DESCRIPTION).version(VERSION);

	// Register CLI commands using the imported function
	registerProjectCommands(program);
	cliLogger.debug('Project commands registered');

	// Handle unknown commands
	program.on('command:*', (operands: any) => {
		console.error(`error: unknown command '${operands[0]}'
See --help for a list of available commands.`);
		process.exit(1);
	});

	// Parse arguments; default to help if no command provided
	await program.parseAsync(args.length ? args : ['--help'], { from: 'user' });
}
