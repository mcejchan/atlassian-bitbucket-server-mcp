import { Command } from 'commander';
import { Logger } from '../utils/logger.util.js';
import { atlassianProjectsController } from '../controllers/atlassianProjectsController.js';
import { handleCliError } from '../utils/error.util.js';

/**
 * Register Bitbucket project-related commands
 * @param program - The Commander program instance
 */
export function registerProjectCommands(program: Command): void {
	const commandLogger = Logger.forContext(
		'cli/atlassian.projects.cli.ts',
	);
	commandLogger.debug('Registering Bitbucket project commands...');

	program
		.command('list-projects')
		.description(
			`List Bitbucket projects accessible to the authenticated user.

        PURPOSE: Discover available projects and retrieve their keys, names, and basic metadata.

        Use Case: Get an overview of all projects you have access to, with their permissions and links.

        Output: Formatted list of projects with details like name, key, type, and links.

        Examples:
  $ mcp-atlassian-bitbucket list-projects
  $ mcp-atlassian-bitbucket list-projects --limit 10`,
		)
		.option(
			'-l, --limit <number>',
			'Maximum number of projects to return',
			(value) => parseInt(value, 10),
		)
		.option('-p, --page <number>', 'Page number for pagination', (value) =>
			parseInt(value, 10),
		)
		.action(async (options) => {
			const actionLogger = Logger.forContext(
				'cli/atlassian.projects.cli.ts',
				'list-projects',
			);
			try {
				actionLogger.debug('Listing projects with options:', options);

				const result = await atlassianProjectsController.list(options);

				console.log(result.content);

				if (result.pagination) {
					console.log('\nPagination Information:');
					console.log(result.pagination);
				}
			} catch (error) {
				actionLogger.error('Operation failed:', error);
				handleCliError(error);
			}
		});

	program
		.command('get-project')
		.description(
			`Get detailed information about a specific Bitbucket project using its key.

        PURPOSE: Retrieve comprehensive details for a *known* project, including its UUID, name, type, creation date, and links to related resources like repositories.

        Use Case: Useful when you have a specific project key (often obtained via 'list-projects') and need its full metadata or links.

        Output: Formatted details of the specified project. Fetches all available details by default.

        Examples:
  $ mcp-atlassian-bitbucket get-project --project-key PROJ`,
		)
		.requiredOption(
			'-k, --project-key <key>',
			'Key of the project to retrieve (identifies the project)',
		)
		.action(async (options) => {
			const actionLogger = Logger.forContext(
				'cli/atlassian.projects.cli.ts',
				'get-project',
			);
			try {
				actionLogger.debug(
					`Fetching project: ${options.projectKey}`,
				);

				const result = await atlassianProjectsController.get({
					projectKey: options.projectKey,
				});

				console.log(result.content);
			} catch (error) {
				actionLogger.error('Operation failed:', error);
				handleCliError(error);
			}
		});
}
