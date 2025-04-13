import { Command } from 'commander';
import { Logger } from '../utils/logger.util.js';
import { atlassianRepositoriesController } from '../controllers/atlassianRepositoriesController.js';
import { handleCliError } from '../utils/error.util.js';

/**
 * Register Bitbucket repository-related commands
 * @param program - The Commander program instance
 */
export function registerRepositoryCommands(program: Command): void {
	const commandLogger = Logger.forContext('cli/atlassian.repositories.cli.ts');
	commandLogger.debug('Registering Bitbucket repository commands...');

	// --- List Repositories --- //
	program
		.command('list-repos')
		.description('List Bitbucket repositories within a specific project.')
		.requiredOption('-k, --project-key <key>', 'Key of the project containing the repositories')
		.option('-l, --limit <number>', 'Maximum number of repositories to return', (v) => parseInt(v, 10))
		.option('-s, --start <number>', '0-based start index for pagination', (v) => parseInt(v, 10))
		.action(async (options: any) => {
			const actionLogger = commandLogger.forMethod('list-repos');
			try {
				actionLogger.debug('Listing repositories with options:', options);
				const result = await atlassianRepositoriesController.list(options);
				console.log(result.content);
				if (result.pagination) console.log('\nPagination Information:\n', result.pagination);
			} catch (error) {
				actionLogger.error('Operation failed:', error);
				handleCliError(error);
			}
		});

	// --- Get Repository --- //
	program
		.command('get-repo')
		.description('Get detailed information about a specific Bitbucket repository.')
		.requiredOption('-k, --project-key <key>', 'Key of the project containing the repository')
		.requiredOption('-r, --repo-slug <slug>', 'Slug of the repository')
		.action(async (options: any) => {
			const actionLogger = commandLogger.forMethod('get-repo');
			try {
				actionLogger.debug('Getting repository with options:', options);
				const result = await atlassianRepositoriesController.get(options);
				console.log(result.content);
			} catch (error) {
				actionLogger.error('Operation failed:', error);
				handleCliError(error);
			}
		});

	// --- Get File Content --- //
	program
		.command('get-file')
		.description('Get the raw content of a file in a repository.')
		.requiredOption('-k, --project-key <key>', 'Project key')
		.requiredOption('-r, --repo-slug <slug>', 'Repository slug')
		.requiredOption('-f, --file-path <path>', 'Path to the file within the repository')
		.option('-a, --at-ref <ref>', 'Branch, tag, or commit hash (defaults to default branch)')
		.action(async (options: any) => {
			const actionLogger = commandLogger.forMethod('get-file');
			try {
				actionLogger.debug('Getting file content with options:', options);
				const result = await atlassianRepositoriesController.getFileContent(options);
				console.log(result.content);
			} catch (error) {
				actionLogger.error('Operation failed:', error);
				handleCliError(error);
			}
		});

	// --- List Branches --- //
	program
		.command('list-branches')
		.description('List branches for a specific repository.')
		.requiredOption('-k, --project-key <key>', 'Project key')
		.requiredOption('-r, --repo-slug <slug>', 'Repository slug')
		.option('-l, --limit <number>', 'Maximum number of branches to return', (v) => parseInt(v, 10))
		.option('-s, --start <number>', '0-based start index for pagination', (v) => parseInt(v, 10))
		.option('--filter <text>', 'Filter branches by name containing this text')
		.action(async (options: any) => {
			const actionLogger = commandLogger.forMethod('list-branches');
			try {
				actionLogger.debug('Listing branches with options:', options);
				const result = await atlassianRepositoriesController.listBranches({
					projectKey: options.projectKey,
					repoSlug: options.repoSlug,
					limit: options.limit,
					start: options.start,
					filterText: options.filter 
				});
				console.log(result.content);
				if (result.pagination) console.log('\nPagination Information:\n', result.pagination);
			} catch (error) {
				actionLogger.error('Operation failed:', error);
				handleCliError(error);
			}
		});

	// --- Get Default Branch --- //
	program
		.command('get-default-branch')
		.description('Get the default branch for a repository.')
		.requiredOption('-k, --project-key <key>', 'Project key')
		.requiredOption('-r, --repo-slug <slug>', 'Repository slug')
		.action(async (options: any) => {
			const actionLogger = commandLogger.forMethod('get-default-branch');
			try {
				actionLogger.debug('Getting default branch with options:', options);
				const result = await atlassianRepositoriesController.getDefaultBranch(options);
				console.log(result.content);
			} catch (error) {
				actionLogger.error('Operation failed:', error);
				handleCliError(error);
			}
		});

	// --- List Commits --- //
	program
		.command('list-commits')
		.description('List commits for a repository, optionally filtering by branch/path.')
		.requiredOption('-k, --project-key <key>', 'Project key')
		.requiredOption('-r, --repo-slug <slug>', 'Repository slug')
		.option('-l, --limit <number>', 'Maximum number of commits to return', (v) => parseInt(v, 10))
		.option('-s, --start <number>', '0-based start index for pagination', (v) => parseInt(v, 10))
		.option('-b, --branch <ref>', 'List commits on this branch/tag/ref (uses "until")')
		.option('-p, --path <path>', 'Only list commits affecting this path')
		.action(async (options: any) => {
			const actionLogger = commandLogger.forMethod('list-commits');
			try {
				actionLogger.debug('Listing commits with options:', options);
				const result = await atlassianRepositoriesController.listCommits({
					projectKey: options.projectKey,
					repoSlug: options.repoSlug,
					limit: options.limit,
					start: options.start,
					until: options.branch, // Map CLI option to service parameter
					path: options.path
				});
				console.log(result.content);
				if (result.pagination) console.log('\nPagination Information:\n', result.pagination);
			} catch (error) {
				actionLogger.error('Operation failed:', error);
				handleCliError(error);
			}
		});

	// --- Get Commit --- //
	program
		.command('get-commit')
		.description('Get details for a specific commit.')
		.requiredOption('-k, --project-key <key>', 'Project key')
		.requiredOption('-r, --repo-slug <slug>', 'Repository slug')
		.requiredOption('-c, --commit-id <hash>', 'The commit ID (hash)')
		.action(async (options: any) => {
			const actionLogger = commandLogger.forMethod('get-commit');
			try {
				actionLogger.debug('Getting commit with options:', options);
				const result = await atlassianRepositoriesController.getCommit(options);
				console.log(result.content);
			} catch (error) {
				actionLogger.error('Operation failed:', error);
				handleCliError(error);
			}
		});

	// --- List Files --- //
	program
		.command('list-files')
		.description('List files and directories in a repository path.')
		.requiredOption('-k, --project-key <key>', 'Project key')
		.requiredOption('-r, --repo-slug <slug>', 'Repository slug')
		.option('-a, --at-ref <ref>', 'Branch, tag, or commit hash (defaults to default branch)')
		.option('-p, --path <path>', 'Subdirectory path to list (defaults to root)')
		.option('-l, --limit <number>', 'Maximum number of items to return', (v) => parseInt(v, 10))
		.option('-s, --start <number>', '0-based start index for pagination', (v) => parseInt(v, 10))
		.action(async (options: any) => {
			const actionLogger = commandLogger.forMethod('list-files');
			try {
				actionLogger.debug('Listing files with options:', options);
				const result = await atlassianRepositoriesController.listFiles({
					projectKey: options.projectKey,
					repoSlug: options.repoSlug,
					at: options.atRef,
					path: options.path,
					limit: options.limit,
					start: options.start
				});
				console.log(result.content);
				if (result.pagination) console.log('\nPagination Information:\n', result.pagination);
			} catch (error) {
				actionLogger.error('Operation failed:', error);
				handleCliError(error);
			}
		});

	commandLogger.info('Repository commands registered.');
} 