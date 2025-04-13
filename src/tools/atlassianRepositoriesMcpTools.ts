import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { repositoriesService } from '../services/atlassianRepositoriesService';
import { formatErrorForMcpTool, createValidationError } from '../utils/error.util.js';
import { Logger } from '../utils/logger.util';
import { RestRepository, RestMinimalRef } from '../generated';
import { formatRepositoryDetailsMarkdown } from '../utils/markdownFormatters';

const toolLogger = Logger.forContext('tools/atlassianRepositoriesMcpTools');

/**
 * Registers Bitbucket Repository-related tools with the MCP server.
 * @param server The McpServer instance.
 */
export function registerRepositoryMcpTools(server: McpServer) {
	const registerLogger = Logger.forContext('registerRepositoryMcpTools');
	registerLogger.debug('Registering Bitbucket Repository tools...');

	// --- List Repositories Tool --- // 
	server.tool(
		'bitbucket_list_repositories',
		'List Bitbucket repositories within a specific project.',
		{
			projectKey: z.string().describe("The key of the project (e.g., 'PROJ')"),
			limit: z.number().int().positive().optional().default(25).describe("Maximum number of repositories to return per page."),
			start: z.number().int().nonnegative().optional().describe("0-based index of the first repository to return (for pagination).")
		},
		async (params: any, _extra: any) => {
			const handlerLogger = toolLogger.forMethod('bitbucket_list_repositories');
			handlerLogger.debug('Executing with params:', params);
			try {
				if (params.limit !== undefined && (params.limit <= 0 || params.limit > 100)) {
					throw createValidationError('Parameter "limit" must be between 1 and 100.');
				}
				if (params.start !== undefined && params.start < 0) {
					throw createValidationError('Parameter "start" must be 0 or greater.');
				}
				const options = {
					limit: params.limit,
					start: params.start,
				};
				const result = await repositoriesService.listRepositories(params.projectKey, options);
				handlerLogger.info(`Successfully listed ${result.values?.length ?? 0} repositories.`);

				// Use imported formatter
				const formattedContent = result.values && result.values.length > 0
					? result.values.map(r => formatRepositoryDetailsMarkdown(r as RestRepository, undefined)).join('\n\n---\n\n')
					: 'No repositories found matching the criteria.';
				
				const paginationInfo = result.isLastPage === false
					? `\n\n*More repositories available. Next page starts at index: ${result.nextPageStart ?? 'N/A'}*`
					: '';
				return {
					content: [{
						type: 'text',
						text: `## Bitbucket Repositories\n\n${formattedContent}${paginationInfo}`
					}]
				};
			} catch (error) {
				handlerLogger.error('Error listing repositories:', error);
				return formatErrorForMcpTool(error);
			}
		}
	);
	registerLogger.debug('Registered tool: bitbucket_list_repositories');

	// --- Get Repository Tool --- // 
	server.tool(
		'bitbucket_get_repository',
		'Get detailed information about a specific Bitbucket repository.',
		{
			projectKey: z.string().describe("The key of the project (e.g., 'PROJ')"),
			repoSlug: z.string().describe("The slug of the repository")
		},
		async ({ projectKey, repoSlug }: any, _extra: any) => {
			const handlerLogger = toolLogger.forMethod('bitbucket_get_repository');
			if (typeof projectKey !== 'string' || !projectKey || typeof repoSlug !== 'string' || !repoSlug) {
				handlerLogger.error('Invalid or missing projectKey or repoSlug', { projectKey, repoSlug });
				return formatErrorForMcpTool(createValidationError('Required parameters "projectKey" and "repoSlug" must be non-empty strings.'));
			}
			handlerLogger.debug(`Executing with projectKey: ${projectKey}, repoSlug: ${repoSlug}`);
			try {
				const repo = await repositoriesService.getRepository(projectKey, repoSlug);
				handlerLogger.info(`Successfully retrieved repository: ${repo.slug}`);
				
				// Use imported formatter
				const formattedContent = formatRepositoryDetailsMarkdown(repo as RestRepository, `Repository: ${repo.name}`);
				
				return {
					content: [{
						type: 'text',
						text: formattedContent
					}]
				};
			} catch (error) {
				handlerLogger.error('Error getting repository:', error);
				return formatErrorForMcpTool(error);
			}
		}
	);
	registerLogger.debug('Registered tool: bitbucket_get_repository');

	// --- Get File Content Tool --- // 
	server.tool(
		'bitbucket_get_file_content',
		'Get the raw content of a file in a specific repository branch/tag/commit.',
		{
			projectKey: z.string().describe("The key of the project (e.g., 'PROJ')"),
			repoSlug: z.string().describe("The slug of the repository"),
			filePath: z.string().describe("The path to the file in the repository (e.g., 'src/index.js')"),
			atRef: z.string().optional().describe("Branch, tag, or commit (optional, defaults to default branch)")
		},
		async ({ projectKey, repoSlug, filePath, atRef }: any, _extra: any) => {
			const handlerLogger = toolLogger.forMethod('bitbucket_get_file_content');
			if (!projectKey || !repoSlug || !filePath) {
				handlerLogger.error('Missing required parameters', { projectKey, repoSlug, filePath });
				return formatErrorForMcpTool(createValidationError('projectKey, repoSlug, and filePath are required.'));
			}
			handlerLogger.debug(`Getting file content for ${filePath} in ${projectKey}/${repoSlug} at ${atRef || 'default'}`);
			try {
				const content = await repositoriesService.getFileContent(projectKey, repoSlug, filePath, atRef);
				handlerLogger.info(`Successfully retrieved file content for ${filePath}`);
				return {
					content: [{
						type: 'text',
						text: `### File: ${filePath}\n\n\`\`\`\n${content}\n\`\`\``
					}]
				};
			} catch (error) {
				handlerLogger.error('Error getting file content:', error);
				return formatErrorForMcpTool(error);
			}
		}
	);
	registerLogger.debug('Registered tool: bitbucket_get_file_content');

	// --- List Branches Tool --- // 
	server.tool(
		'bitbucket_list_branches',
		'List branches for a specific repository.',
		{
			projectKey: z.string().describe("The key of the project (e.g., 'PROJ')"),
			repoSlug: z.string().describe("The slug of the repository"),
			limit: z.number().int().positive().optional().default(25).describe("Maximum number of branches to return per page."),
			start: z.number().int().nonnegative().optional().describe("0-based index of the first branch to return (for pagination)."),
			filterText: z.string().optional().describe("Filter branches by name containing this value.")
		},
		async (params: any, _extra: any) => {
			const handlerLogger = toolLogger.forMethod('bitbucket_list_branches');
			handlerLogger.debug('Executing with params:', params);
			try {
				const options = {
					limit: params.limit,
					start: params.start,
					filterText: params.filterText,
				};
				const result = await repositoriesService.listBranches(params.projectKey, params.repoSlug, options);
				handlerLogger.info(`Successfully listed ${result.values?.length ?? 0} branches.`);
				const formattedContent = result.values && result.values.length > 0
					? result.values.map((b: RestMinimalRef) => {
						return `- **Branch:** ${b.displayId ?? 'N/A'} (ID: ${b.id ?? 'N/A'})`;
					}).join('\n')
					: 'No branches found matching the criteria.';
				const paginationInfo = result.isLastPage === false
					? `\n\n*More branches available. Next page starts at index: ${result.nextPageStart ?? 'N/A'}*`
					: '';
				return {
					content: [{
						type: 'text',
						text: `## Bitbucket Branches\n\n${formattedContent}${paginationInfo}`
					}]
				};
			} catch (error) {
				handlerLogger.error('Error listing branches:', error);
				return formatErrorForMcpTool(error);
			}
		}
	);
	registerLogger.debug('Registered tool: bitbucket_list_branches');

	// --- Get Default Branch Tool --- // 
	server.tool(
		'bitbucket_get_default_branch',
		'Get the default branch for a specific repository.',
		{
			projectKey: z.string().describe("The key of the project (e.g., 'PROJ')"),
			repoSlug: z.string().describe("The slug of the repository")
		},
		async ({ projectKey, repoSlug }: any, _extra: any) => {
			const handlerLogger = toolLogger.forMethod('bitbucket_get_default_branch');
			handlerLogger.debug(`Getting default branch for ${projectKey}/${repoSlug}`);
			try {
				const branch: RestMinimalRef = await repositoriesService.getDefaultBranch(projectKey, repoSlug);
				handlerLogger.info(`Successfully retrieved default branch: ${branch.displayId}`);
				const formattedContent =
					`## Default Branch\n\n**Name:** ${branch.displayId ?? 'N/A'}\n**ID:** ${branch.id ?? 'N/A'}\n`;
				return {
					content: [{
						type: 'text',
						text: formattedContent
					}]
				};
			} catch (error) {
				handlerLogger.error('Error getting default branch:', error);
				return formatErrorForMcpTool(error);
			}
		}
	);
	registerLogger.debug('Registered tool: bitbucket_get_default_branch');

	// --- List Commits Tool --- // 
	server.tool(
		'bitbucket_list_commits',
		'List commits for a specific repository, optionally filtering by branch, path, or author.',
		{
			projectKey: z.string().describe("The key of the project (e.g., 'PROJ')"),
			repoSlug: z.string().describe("The slug of the repository"),
			branch: z.string().optional().describe("Branch or tag to list commits from (optional)"),
			limit: z.number().int().positive().optional().default(25).describe("Maximum number of commits to return per page."),
			start: z.number().int().nonnegative().optional().describe("0-based index of the first commit to return (for pagination)."),
			path: z.string().optional().describe("Filter commits affecting this file or directory (optional)"),
			author: z.string().optional().describe("Filter commits by author (optional)")
		},
		async (params: any, _extra: any) => {
			const handlerLogger = toolLogger.forMethod('bitbucket_list_commits');
			handlerLogger.debug('Executing with params:', params);
			try {
				const options: any = {
					limit: params.limit,
					start: params.start,
					path: params.path,
					author: params.author,
				};
				if (params.branch) options.until = params.branch;
				const result = await repositoriesService.listCommits(params.projectKey, params.repoSlug, options);
				handlerLogger.info(`Successfully listed ${result.values?.length ?? 0} commits.`);
				const formattedContent = result.values && result.values.length > 0
					? result.values.map(c => {
						const authorInfo = c.author ? `${c.author.name} <${c.author.emailAddress}>` : 'Unknown Author';
						const committerInfo = c.committer ? `${c.committer.name} <${c.committer.emailAddress}>` : 'Unknown Committer';
						return (
							`- **Commit:** ${c.displayId} (ID: ${c.id ?? 'N/A'})\n  **Author:** ${authorInfo}\n  **Committer:** ${committerInfo}\n  **Date:** ${c.authorTimestamp ? new Date(c.authorTimestamp).toLocaleString() : 'N/A'}\n  **Message:** ${c.message ?? 'N/A'}\n  **Parents:** ${(c.parents || []).map(p => p.displayId).join(', ') || 'None'}`
						);
					}).join('\n\n')
					: 'No commits found matching the criteria.';
				const paginationInfo = result.isLastPage === false
					? `\n\n*More commits available. Next page starts at index: ${result.nextPageStart ?? 'N/A'}*`
					: '';
				return {
					content: [{
						type: 'text',
						text: `## Bitbucket Commits\n\n${formattedContent}${paginationInfo}`
					}]
				};
			} catch (error) {
				handlerLogger.error('Error listing commits:', error);
				return formatErrorForMcpTool(error);
			}
		}
	);
	registerLogger.debug('Registered tool: bitbucket_list_commits');

	// --- Get Commit Tool --- // 
	server.tool(
		'bitbucket_get_commit',
		'Get details for a specific commit hash (SHA) in a repository.',
		{
			projectKey: z.string().describe("The key of the project (e.g., 'PROJ')"),
			repoSlug: z.string().describe("The slug of the repository"),
			commitId: z.string().describe("The commit hash (SHA)")
		},
		async ({ projectKey, repoSlug, commitId }: any, _extra: any) => {
			const handlerLogger = toolLogger.forMethod('bitbucket_get_commit');
			handlerLogger.debug(`Getting commit ${commitId} for ${projectKey}/${repoSlug}`);
			try {
				const c = await repositoriesService.getCommit(projectKey, repoSlug, commitId);
				handlerLogger.info(`Successfully retrieved commit: ${c.id}`);
				const formattedContent =
					`## Commit: ${c.id}\n\n**Author:** ${c.author?.name ?? 'Unknown'}\n**Date:** ${c.authorTimestamp ? new Date(c.authorTimestamp).toISOString() : 'N/A'}\n**Message:** ${c.message ?? ''}\n**Parents:** ${(c.parents || []).map((p: any) => p.id).join(', ') || 'None'}\n`;
				return {
					content: [{
						type: 'text',
						text: formattedContent
					}]
				};
			} catch (error) {
				handlerLogger.error('Error getting commit:', error);
				return formatErrorForMcpTool(error);
			}
		}
	);
	registerLogger.debug('Registered tool: bitbucket_get_commit');

	// --- List Files Tool --- // 
	server.tool(
		'bitbucket_list_files',
		'List files and directories within a specific repository path, at a given ref.',
		{
			projectKey: z.string().describe("The key of the project (e.g., 'PROJ')"),
			repoSlug: z.string().describe("The slug of the repository"),
			at: z.string().optional().describe("Branch, tag, or commit (optional, defaults to default branch)"),
			path: z.string().optional().describe("Subdirectory path to list (optional, defaults to repo root)"),
			limit: z.number().int().positive().optional().default(100).describe("Maximum number of files to return"),
			start: z.number().int().nonnegative().optional().describe("0-based index of the first file to return (for pagination)")
		},
		async (params: any, _extra: any) => {
			const handlerLogger = toolLogger.forMethod('bitbucket_list_files');
			handlerLogger.debug('Executing with params:', params);
			try {
				const options: any = {
					at: params.at,
					path: params.path,
					limit: params.limit,
					start: params.start,
				};
				const result = await repositoriesService.listFiles(params.projectKey, params.repoSlug, options);
				handlerLogger.info(`Successfully listed ${result.values?.length ?? 0} files/directories.`);
				const formattedContent = result.values && result.values.length > 0
					? result.values.map((f: string) => `- ${f}`).join('\n')
					: 'No files or directories found at this location.';
				const paginationInfo = result.isLastPage === false
					? `\n\n*More files available. Next page starts at index: ${result.nextPageStart ?? 'N/A'}*`
					: '';
				return {
					content: [{
						type: 'text',
						text: `## Bitbucket Files/Directories\n\n${formattedContent}${paginationInfo}`
					}]
				};
			} catch (error) {
				handlerLogger.error('Error listing files:', error);
				return formatErrorForMcpTool(error);
			}
		}
	);
	registerLogger.debug('Registered tool: bitbucket_list_files');

	registerLogger.info('All Bitbucket Repository tools registered successfully.');
} 