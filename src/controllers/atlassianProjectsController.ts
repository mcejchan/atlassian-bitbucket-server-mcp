import { Logger } from '../utils/logger.util';
import { projectsService } from '../services/atlassianProjectsService';

import { formatPagination } from '../utils/formatter.util';
// Use a more specific type if available from the new service, or keep the generated one for now
// Assuming the structure is compatible or we'll adapt the formatter

import type { RestProject } from '../generated/models/RestProject';

import { McpError, ErrorType } from '../utils/error.util';

// Update context logger name
const controllerLogger = Logger.forContext('controllers/atlassianProjectsController.ts');

// Update class name
class AtlassianProjectsController {
	/**
     * Format a project's details into markdown
     */
	// TODO: Update RestProject type if the new service uses a different type
	private formatProjectDetails(project: any, title: string): string { // Use any for now, refine later
		let content = `# ${title}\n\n`;
		content += '## Basic Information\n\n';
		content += `**Key**: \`${project.key}\`\n`;
		content += `**Name**: ${project.name}\n`;
		if (project.description) {
			content += `**Description**: ${project.description}\n`;
		}
		if (project.type) {
			content += `**Type**: ${project.type}\n`;
		}
		if (typeof project.public === 'boolean') {
			content += `**Public**: ${project.public ? 'Yes' : 'No'}\n`;
		}
		content += '\n';

		// Adjust links handling based on the new service's type
		if (project.links?.self && Array.isArray(project.links.self) && project.links.self.length > 0) {
			content += '## Links\n\n';
			// Assuming the first self link is the primary one
			const selfLink = project.links.self[0].href;
			if (selfLink) {
				content += `- self: ${selfLink}\n`;
			}
			// Add other links if needed and available in the type
			content += '\n';
		}

		return content;
	}

	/**
     * List projects with optional filtering
     */
	// Method name remains 'list' as used by the CLI
	async list(options?: { name?: string; permission?: string; start?: number; limit?: number }) {
		const methodLogger = controllerLogger.forMethod('list');
		methodLogger.debug('Listing projects with options:', options);

		try {
			// Use the correct method name from the new service
			const projects = await projectsService.listProjects(options);

			let content = '# Bitbucket Projects\n\n';

			if (!projects.values?.length) {
				content += '_No projects found._\n';
				return { content };
			}

			// Add summary
			content += `Found ${projects.size} project(s)\n\n`;

			// List each project
			for (const project of projects.values) {
				content += `## ${project.name}\n\n`;
				content += `**Key**: \`${project.key}\`\n`;
				if (project.description) {
					content += `**Description**: ${project.description}\n`;
				}
				if (project.type) {
					content += `**Type**: ${project.type}\n`;
				}
				if (typeof project.public === 'boolean') {
					content += `**Public**: ${project.public ? 'Yes' : 'No'}\n`;
				}
				content += '\n';

				// Adjust links handling in list view
				if (project.links?.self && Array.isArray(project.links.self) && project.links.self.length > 0) {
					content += '### Links\n\n';
					const selfLink = project.links.self[0].href;
					if (selfLink) {
						content += `- self: ${selfLink}\n`;
					}
					content += '\n';
				}
			}

			// Add pagination information
			const count = projects.size || projects.values.length;
			const hasMore = !projects.isLastPage;
			const nextCursor = projects.nextPageStart?.toString();

			return {
				content,
				pagination: formatPagination(count, hasMore, nextCursor)
			};
		} catch (error) {
			methodLogger.error('Failed to list projects:', error);
			// Add status code and original error to McpError
			throw new McpError('Failed to list projects', ErrorType.API_ERROR, 500, error as Error);
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
			// Use the correct method name from the new service
			const project = await projectsService.getProject(projectKey);
			const content = this.formatProjectDetails(project, `Project: ${project.name}`);
			return { content };
		} catch (error) {
			methodLogger.error(`Failed to get project ${projectKey}:`, error);
			// Add status code and original error to McpError
			throw new McpError(`Failed to get project ${projectKey}`, ErrorType.API_ERROR, 500, error as Error);
		}
	}

	/**
     * Create a new project
     */
	// Method name remains 'create' as used by the CLI
	async create(project: RestProject) {
		const methodLogger = controllerLogger.forMethod('create');
		methodLogger.debug('Creating new project:', project);

		try {
			// Keep using the same method name (stubbed in the new service)
			const createdProject = await projectsService.create(project);
			const content = this.formatProjectDetails(createdProject, `Project Created: ${createdProject.name}`);
			return { content };
		} catch (error) {
			methodLogger.error('Failed to create project:', error);
			// Add status code and original error to McpError
			throw new McpError('Failed to create project', ErrorType.API_ERROR, 500, error as Error);
		}
	}

	/**
     * Update an existing project
     */
	// Method name remains 'update' as used by the CLI
	async update({ projectKey, project }: { projectKey: string; project: RestProject }) {
		const methodLogger = controllerLogger.forMethod('update');
		methodLogger.debug(`Updating project ${projectKey}:`, project);

		try {
			// Keep using the same method name (stubbed in the new service)
			const updatedProject = await projectsService.update(projectKey, project);
			const content = this.formatProjectDetails(updatedProject, `Project Updated: ${updatedProject.name}`);
			return { content };
		} catch (error) {
			methodLogger.error(`Failed to update project ${projectKey}:`, error);
			// Add status code and original error to McpError
			throw new McpError(`Failed to update project ${projectKey}`, ErrorType.API_ERROR, 500, error as Error);
		}
	}

	/**
     * Delete a project
     */
	// Method name remains 'delete' as used by the CLI
	async delete({ projectKey }: { projectKey: string }) {
		const methodLogger = controllerLogger.forMethod('delete');
		methodLogger.debug(`Deleting project: ${projectKey}`);

		try {
			// Keep using the same method name (stubbed in the new service)
			await projectsService.delete(projectKey);
			return {
				content: `✅ Project \`${projectKey}\` has been deleted successfully.`
			};
		} catch (error) {
			methodLogger.error(`Failed to delete project ${projectKey}:`, error);
			// Add status code and original error to McpError
			throw new McpError(`Failed to delete project ${projectKey}`, ErrorType.API_ERROR, 500, error as Error);
		}
	}
}

// Update exported instance name
export const atlassianProjectsController = new AtlassianProjectsController();
