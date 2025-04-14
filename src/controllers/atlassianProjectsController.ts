import { RestProject } from '../generated/src/models'; // Ensure RestProject is imported
import { projectsService } from '../services/atlassianProjectsService';
import { ErrorType, McpError } from '../utils/error.util';
import { formatPagination } from '../utils/formatter.util';
import { Logger } from '../utils/logger.util';
import { formatProjectDetailsMarkdown } from '../utils/markdownFormatters'; // Import from new utils location

// Update context logger name
const controllerLogger = Logger.forContext('controllers/atlassianProjectsController.ts');

// Update class name
class AtlassianProjectsController {
	/**
	 * List projects with optional filtering
	 */
	// Method name remains 'list' as used by the CLI
	async list(options?: { name?: string; permission?: string; start?: number; limit?: number }) {
		const methodLogger = controllerLogger.forMethod('list');
		methodLogger.debug('Listing projects with options:', options);

		try {
			const projects = await projectsService.listProjects(options);

			let content = '# Bitbucket Projects\n\n';

			if (!projects.values?.length) {
				content += '_No projects found._\n';
				return { content };
			}

			content += `Showing ${projects.values.length} of ${projects.size} project(s)\n\n`;

			// Use the imported formatter for each project
			content += projects.values.map(project =>
				formatProjectDetailsMarkdown(project as RestProject, undefined)
			).join('\n\n---\n\n'); // Separate projects

			// Add pagination information
			const count = projects.size || projects.values.length;
			const hasMore = !projects.isLastPage;
			const nextCursor = projects.nextPageStart?.toString();

			return {
				content,
				pagination: formatPagination(count, hasMore, nextCursor)
			};
		} catch (e) {
			methodLogger.error('Failed to list projects:', e);
			throw new McpError('Failed to list projects', ErrorType.API_ERROR, 500, e as Error);
		}
	}

	/**
	 * Get project details by key
	 */
	// Method name remains 'get' as used by the CLI
	async get({ projectKey }: { projectKey: string }) {
		const methodLogger = controllerLogger.forMethod('get');
		methodLogger.debug(`Getting project details for: ${projectKey}`);

		try {
			const project = await projectsService.getProject(projectKey);
			// Use the imported formatter
			const content = formatProjectDetailsMarkdown(project as RestProject, `Project: ${project.name}`);
			return { content };
		} catch (e) {
			methodLogger.error(`Failed to get project ${projectKey}:`, e);
			throw new McpError(`Failed to get project ${projectKey}`, ErrorType.API_ERROR, 500, e as Error);
		}
	}
}

export const atlassianProjectsController = new AtlassianProjectsController();
