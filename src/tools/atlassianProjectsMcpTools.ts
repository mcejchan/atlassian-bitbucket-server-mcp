import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { projectsService } from '../services/atlassianProjectsService';
import { formatErrorForMcpTool, createValidationError } from '../utils/error.util.js';
import { Logger } from '../utils/logger.util';
import { RestProject } from '../generated';
import { formatProjectDetailsMarkdown } from '../utils/markdownFormatters';

const toolLogger = Logger.forContext('tools/atlassianProjectsMcpTools');

/**
 * Registers Bitbucket Project-related tools with the MCP server.
 * @param server The McpServer instance.
 */
export function registerProjectMcpTools(server: McpServer) {
	const registerLogger = Logger.forContext('registerProjectMcpTools');
	registerLogger.debug('Registering Bitbucket Project tools...');

	// --- List Projects Tool --- // 
	server.tool(
		'bitbucket_list_projects',
		'List Bitbucket projects accessible to the authenticated user.',
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
				const result = await projectsService.listProjects(options);
				handlerLogger.info(`Successfully listed ${result.values?.length ?? 0} projects.`);
				
				// Use imported formatter
				const formattedContent = result.values && result.values.length > 0
					? result.values.map(p => formatProjectDetailsMarkdown(p as RestProject, undefined)).join('\n\n---\n\n')
					: 'No projects found matching the criteria.';

				const paginationInfo = result.isLastPage === false
					? `\n\n*More projects available. Next page starts at index: ${result.nextPageStart ?? 'N/A'}*`
					: '';
				return {
					content: [{
						type: 'text',
						text: `## Bitbucket Projects\n\n${formattedContent}${paginationInfo}`
					}]
				};
			} catch (error) {
				handlerLogger.error('Error listing projects:', error);
				return formatErrorForMcpTool(error);
			}
		}
	);
	registerLogger.debug('Registered tool: bitbucket_list_projects');

	// --- Get Project Tool --- // 
	server.tool(
		'bitbucket_get_project',
		'Get detailed information about a specific Bitbucket project using its key.',
		{
			projectKey: z.string().describe("The key of the project (e.g., 'PROJ'")
		},
		async ({ projectKey }: any, _extra: any) => {
			const handlerLogger = toolLogger.forMethod('bitbucket_get_project');
			if (typeof projectKey !== 'string' || !projectKey) {
				handlerLogger.error('Invalid or missing projectKey', { projectKey });
				return formatErrorForMcpTool(createValidationError('Required parameter "projectKey" must be a non-empty string.'));
			}
			handlerLogger.debug(`Executing with projectKey: ${projectKey}`);
			try {
				const project = await projectsService.getProject(projectKey);
				handlerLogger.info(`Successfully retrieved project: ${project.key}`);
				
				// Use imported formatter
				const formattedContent = formatProjectDetailsMarkdown(project as RestProject, `Project: ${project.name}`);

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
} 