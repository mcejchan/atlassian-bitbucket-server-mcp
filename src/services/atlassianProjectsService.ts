import { Logger } from '../utils/logger.util';
// Import generated API client and types
import { ProjectApi, GetProjectsRequest } from '../generated/src/apis/ProjectApi';
// Import types
import type { RestProject, GetProjects200Response } from '../generated/src/models/index';
import { createBitbucketApiConfig } from '../utils/apiConfig'; // Import the factory
// Import error handling utilities
import { ApiClientError } from '../utils/apiConfig'; // Import ApiClientError
import { McpError, ErrorType, createApiError, createNotFoundError, createUnexpectedError } from '../utils/error.util';

/**
 * Service for interacting with Bitbucket Projects API using generated client
 */
export class AtlassianProjectsService {
	private readonly logger: Logger;
	private static instance: AtlassianProjectsService;
	private readonly projectApi: ProjectApi;

	private constructor() {
		this.logger = Logger.forContext('services/atlassianProjectsService');
		const apiConfig = createBitbucketApiConfig();
		this.projectApi = new ProjectApi(apiConfig);
		this.logger.debug('Service initialized with generated ProjectApi client using shared config.');
	}

	/**
	 * Gets the singleton instance of the service.
	 */
	public static getInstance(): AtlassianProjectsService {
		if (!AtlassianProjectsService.instance) {
			AtlassianProjectsService.instance = new AtlassianProjectsService();
		}
		return AtlassianProjectsService.instance;
	}

	/**
	 * Lists projects accessible to the authenticated user.
	 * @param params Optional query parameters
	 * @returns A promise resolving to the paged response of projects.
	 * @throws {McpError} If the API request fails
	 */
	async listProjects(params: GetProjectsRequest = {}): Promise<GetProjects200Response> {
		const methodLogger = this.logger.forMethod('listProjects');
		methodLogger.debug('Listing projects with params:', params);

		try {
			const response = await this.projectApi.getProjects(params);
			methodLogger.info(`Successfully listed ${response.values?.length ?? 0} projects`);
			methodLogger.debug('Projects response:', {
				size: response.size,
				isLastPage: response.isLastPage,
				nextPageStart: response.nextPageStart
			});
			return response;
		} catch (error) {
			methodLogger.error('Error listing projects:', error);
			// Convert specific ApiClientError or wrap unexpected errors
			if (error instanceof ApiClientError) {
				// Attempt to parse body for a more specific message if needed
				let detail = '';
				try {
					if (typeof error.body === 'string' && error.body) {
						const parsedBody = JSON.parse(error.body);
						detail = parsedBody.message || parsedBody.error || error.body;
					}
				} catch { detail = String(error.body); }

				if (error.status === 404) {
					throw createNotFoundError(`Failed to list projects: Not Found. ${detail}`);
				} else {
					throw createApiError(`Failed to list projects: ${error.message}. ${detail}`, error.status, error);
				}
			} else {
				throw createUnexpectedError(error);
			}
		}
	}

	/**
	 * Gets detailed information for a specific project.
	 * @param projectKey The key of the project.
	 * @returns A promise resolving to the detailed project information.
	 * @throws {McpError} If the API request fails or project is not found
	 */
	async getProject(projectKey: string): Promise<RestProject> {
		const methodLogger = this.logger.forMethod('getProject');

		try {
			methodLogger.debug(`Getting project with key: ${projectKey}`);
			const response = await this.projectApi.getProject({ projectKey: projectKey });

			methodLogger.info(`Successfully retrieved project: ${response.name} (${response.key})`);
			methodLogger.debug('Project details:', {
				id: response.id,
				type: response.type,
				public: response._public
			});

			return response;
		} catch (error) {
			methodLogger.error(`Error getting project ${projectKey}:`, error);
			// Convert specific ApiClientError or wrap unexpected errors
			if (error instanceof ApiClientError) {
				// Attempt to parse body for a more specific message
				let detail = '';
				try {
					if (typeof error.body === 'string' && error.body) {
						const parsedBody = JSON.parse(error.body);
						detail = parsedBody.message || parsedBody.error || error.body;
					}
				} catch { detail = String(error.body); }

				if (error.status === 404) {
					throw createNotFoundError(`Project '${projectKey}' not found. ${detail}`);
				} else {
					throw createApiError(`Failed to get project '${projectKey}': ${error.message}. ${detail}`, error.status, error);
				}
			} else {
				throw createUnexpectedError(error);
			}
		}
	}
}

// Export the singleton instance for easy use
export const projectsService = AtlassianProjectsService.getInstance();
