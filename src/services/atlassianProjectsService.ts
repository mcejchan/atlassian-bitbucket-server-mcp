import { Logger } from '../utils/logger.util';
// Import generated API client and types
import { ProjectApi, GetProjectsRequest } from '@generated/apis/ProjectApi';
// Remove direct Configuration/Middleware imports
import type { RestProject, GetProjects200Response } from '@generated/models/index';
import { createBitbucketApiConfig } from '../utils/apiConfig'; // Import the factory

/**
 * Service for interacting with Bitbucket Projects API using generated client
 */
export class AtlassianProjectsService {
	private readonly logger: Logger;
	private static instance: AtlassianProjectsService;
	private readonly projectApi: ProjectApi;

	private constructor() {
		this.logger = Logger.forContext('services/atlassianProjectsService');

		// Use the centralized factory to get configuration
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
			// Pass the params object directly as the request
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
			throw error;
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
			throw error;
		}
	}
}

// Export the singleton instance for easy use
export const projectsService = AtlassianProjectsService.getInstance();
