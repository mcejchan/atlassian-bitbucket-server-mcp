import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { projectsService } from '../services/atlassianProjectsService';
import { repositoriesService } from '../services/atlassianRepositoriesService';
import { formatErrorForMcpTool, createValidationError } from '../utils/error.util.js';
import { Logger } from '../utils/logger.util';
import { RestProject, RestRepository, RestBranch, RestMinimalRef } from '../generated';

const toolLogger = Logger.forContext('tools/atlassianTools.ts');

/**
 * Registers Bitbucket-related tools with the MCP server.
 * @param server The McpServer instance.
 */
export function registerAtlassianTools(server: McpServer) {
	const registerLogger = Logger.forContext('registerAtlassianTools');
	registerLogger.debug('Registering Bitbucket tools...');

	// --- List Projects Tool ---
	server.tool(
		'bitbucket_list_projects', // Tool name
		{
			name: z.string().optional().describe("Filter projects by name containing this value."),
			permission: z.string().optional().describe("Filter projects by permission level (e.g., PROJECT_READ, PROJECT_ADMIN). Case-insensitive."),
			limit: z.number().int().positive().optional().default(25).describe("Maximum number of projects to return per page."),
			start: z.number().int().nonnegative().optional().describe("0-based index of the first project to return (for pagination).")
		},
		async (params: any, _extra: any) => {
			const handlerLogger = toolLogger.forMethod('bitbucket_list_projects');
			handlerLogger.debug('Executing with params:', params);
			try {
				// Validation logic (optional, can be part of Zod schema)
				if (params.limit !== undefined && (params.limit <= 0 || params.limit > 100)) {
					throw createValidationError('Parameter "limit" must be between 1 and 100.');
				}
				if (params.start !== undefined && params.start < 0) {
					throw createValidationError('Parameter "start" must be 0 or greater.');
				}

				const options = {
					name: params.name,
					permission: params.permission,
					limit: params.limit,
					start: params.start,
				};

				// Use the imported service
				const result = await projectsService.listProjects(options);
				handlerLogger.info(`Successfully listed ${result.values?.length ?? 0} projects.`);

				// Format the result for MCP (assuming result structure)
				// TODO: Enhance formatting based on actual API response
				const formattedContent = result.values && result.values.length > 0
					? result.values.map((p: RestProject) => `- **${p.name}** (Key: ${p.key}) - ${p.description ?? 'No description'}`).join('\n')
					: 'No projects found matching the criteria.';

				const paginationInfo = result.isLastPage === false
					? `\n\n*More projects available. Next page starts at index: ${result.nextPageStart ?? 'N/A'}*`
					: '';

				// Return in the format expected by the SDK
				return {
					content: [{
						type: 'text',
						text: `## Bitbucket Projects\n\n${formattedContent}${paginationInfo}`
					}]
				};
			} catch (error) {
				handlerLogger.error('Error listing projects:', error);
				return formatErrorForMcpTool(error); // Use ensureMcpError or a similar utility
			}
		}
	);
	registerLogger.debug('Registered tool: bitbucket_list_projects');

	// --- Get Project Tool ---
	server.tool(
		'bitbucket_get_project',
		{
			projectKey: z.string().describe("The key of the project (e.g., 'PROJ')")
		},
		async ({ projectKey }: any, _extra: any) => {
			const handlerLogger = toolLogger.forMethod('bitbucket_get_project');
			// Basic validation (Zod handles type check)
			if (typeof projectKey !== 'string' || !projectKey) {
				handlerLogger.error('Invalid or missing projectKey', { projectKey });
				return formatErrorForMcpTool(createValidationError('Required parameter "projectKey" must be a non-empty string.'));
			}
			handlerLogger.debug(`Executing with projectKey: ${projectKey}`);

			try {
				const project = await projectsService.getProject(projectKey);
				handlerLogger.info(`Successfully retrieved project: ${project.key}`);

				// Format the result using known fields from the service's Project type
				const typedProject = project as RestProject; // Cast to generated type
				const formattedContent =
					`## Project: ${typedProject.name} (Key: ${typedProject.key})

**ID:** ${typedProject.id}
**Description:** ${typedProject.description || 'N/A'}
**Public:** ${typedProject._public !== undefined ? (typedProject._public ? 'Yes' : 'No') : 'N/A'}
**Type:** ${typedProject.type || 'N/A'}
**Link:** ${(typedProject.links as any)?.['self']?.[0]?.href || 'N/A'}
`;

				// Return in the format expected by the SDK
				return {
					content: [{
						type: 'text',
						text: formattedContent
					}]
				};
			} catch (error) {
				handlerLogger.error('Error getting project:', error);
				return formatErrorForMcpTool(error);
			}
		}
	);
	registerLogger.debug('Registered tool: bitbucket_get_project');

	// --- List Repositories Tool ---
	server.tool(
		'bitbucket_list_repositories',
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
				const formattedContent = result.values && result.values.length > 0
					? result.values.map(r => `- **${r.name}** (Slug: ${r.slug})`).join('\n')
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

	// --- Get Repository Tool ---
	server.tool(
		'bitbucket_get_repository',
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
				const typedRepo = repo as RestRepository; // Cast to generated type
				const formattedContent =
					`## Repository: ${typedRepo.name} (Slug: ${typedRepo.slug})

					**ID:** ${typedRepo.id}
					**SCM:** ${typedRepo.scmId}
					**State:** ${typedRepo.state}
					**Status Message:** ${typedRepo.statusMessage ?? 'N/A'}
					**Description:** ${typedRepo.description ?? 'N/A'}
					**Archived:** ${typedRepo.archived ? 'Yes' : 'No'}
					**Forkable:** ${typedRepo.forkable ? 'Yes' : 'No'}
					**Default Branch:** ${typedRepo.defaultBranch ?? 'N/A'}
					**Project:** ${typedRepo.project?.name || 'N/A'} (Key: ${typedRepo.project?.key || 'N/A'})
					**Project Description:** ${typedRepo.project?.description ?? 'N/A'}
					**Public:** ${typedRepo._public !== undefined ? (typedRepo._public ? 'Yes' : 'No') : 'N/A'}
					**Scope:** ${typedRepo.scope ?? 'N/A'}
					**Partition:** ${typedRepo.partition ?? 'N/A'}
					**Link:** ${(typedRepo.links as any)?.['self']?.[0]?.href || 'N/A'}

					${typedRepo.origin ? `**Origin:** ${typedRepo.origin.name} (Slug: ${typedRepo.origin.slug})` : ''}
				`;
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

	// --- Get File Content Tool ---
	server.tool(
		'bitbucket_get_file_content',
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

	// --- List Branches Tool ---
	server.tool(
		'bitbucket_list_branches',
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

	// --- Get Default Branch Tool ---
	server.tool(
		'bitbucket_get_default_branch',
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
					`## Default Branch

**Name:** ${branch.displayId ?? 'N/A'}
**ID:** ${branch.id ?? 'N/A'}
`;
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

	// --- List Commits Tool ---
	server.tool(
		'bitbucket_list_commits',
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
							`- **Commit:** ${c.displayId} (ID: ${c.id ?? 'N/A'})
  **Author:** ${authorInfo}
  **Committer:** ${committerInfo}
  **Date:** ${c.authorTimestamp ? new Date(c.authorTimestamp).toLocaleString() : 'N/A'}
  **Message:** ${c.message ?? 'N/A'}
  **Parents:** ${c.parents?.map(p => p.displayId).join(', ') || 'None'}`
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

	// --- Get Commit Tool ---
	server.tool(
		'bitbucket_get_commit',
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
					`## Commit: ${c.id}

**Author:** ${c.author?.name ?? 'Unknown'}
**Date:** ${c.authorTimestamp ? new Date(c.authorTimestamp).toISOString() : 'N/A'}
**Message:** ${c.message ?? ''}
**Parents:** ${(c.parents || []).map((p: any) => p.id).join(', ') || 'None'}
`;
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

	// --- List Files/Directories Tool ---
	server.tool(
		'bitbucket_list_files',
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

	registerLogger.info('All Bitbucket tools registered successfully.');
}
