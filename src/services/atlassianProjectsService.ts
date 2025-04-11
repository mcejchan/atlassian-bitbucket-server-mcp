// src/services/atlassianProjectsService.ts
import { BitbucketClient } from '../utils/http/bitbucket-client';
import { Logger } from '../utils/logger.util';

// Basic Types based on typical Bitbucket responses (Refine using OpenAPI spec if needed)
interface Project {
    key: string;
    id: number;
    name: string;
    description?: string;
    public?: boolean;
    type?: string;
    link?: { rel: string; href: string };
    links?: { self: { href: string }[] };
}

interface PagedResponse<T> {
    size: number;
    limit: number;
    isLastPage: boolean;
    values: T[];
    start?: number;
    nextPageStart?: number;
}

type ProjectsResponse = PagedResponse<Project>;
type ProjectDetailed = Project; // Assuming details are similar for now

interface ListProjectsParams {
    name?: string;
    permission?: string;
    limit?: number;
    start?: number;
}

/**
 * Service for interacting with Bitbucket Projects API (vLatest)
 */
export class AtlassianProjectsService {
    private static readonly API_PATH = '/rest/api/latest'; // Use 'latest' as per spec
    private readonly client: BitbucketClient;
    private readonly logger: Logger;
    private static instance: AtlassianProjectsService;

    private constructor() {
        this.logger = Logger.forContext('services/atlassianProjectsService');
        this.client = BitbucketClient.getInstance();
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
     * @param params Optional query parameters (e.g., { limit: 50 })
     * @returns A promise resolving to the paged response of projects.
     */
    async listProjects(params: ListProjectsParams = {}): Promise<ProjectsResponse> {
        const methodLogger = this.logger.forMethod('listProjects');
        methodLogger.debug('Listing projects with params:', params);
        // Use the generic get method from BitbucketClient
        const response = await this.client.get<ProjectsResponse>(
            `${AtlassianProjectsService.API_PATH}/projects`,
            { params } // Axios automatically handles query params
        );
        methodLogger.debug(`Found ${response.size} projects total.`);
        return response;
    }

    /**
     * Gets detailed information for a specific project.
     * @param projectKey The key of the project.
     * @returns A promise resolving to the detailed project information.
     */
    async getProject(projectKey: string): Promise<ProjectDetailed> {
        if (!projectKey) {
            throw new Error('projectKey parameter is required');
        }
        const methodLogger = this.logger.forMethod('getProject');
        methodLogger.debug(`Getting project with key: ${projectKey}`);
        const response = await this.client.get<ProjectDetailed>(
            `${AtlassianProjectsService.API_PATH}/projects/${projectKey}`
        );
        methodLogger.debug(`Retrieved details for project: ${response.name}`);
        return response;
    }

    // --- Stub Methods (Not Yet Implemented) ---

    /**
     * Creates a new project. (NOT IMPLEMENTED)
     * @param _project Project creation payload (currently unused).
     * @returns A promise resolving to the created project details.
     */
    async create(_project: Partial<Project>): Promise<ProjectDetailed> {
        this.logger.forMethod('create').warn('Create project functionality is not yet implemented in this service.');
        throw new Error('Create project not implemented');
        // TODO: Implement using POST /rest/api/latest/projects based on OpenAPI spec
    }

    /**
     * Updates an existing project. (NOT IMPLEMENTED)
     * @param projectKey The key of the project to update.
     * @param _project Project update payload (currently unused).
     * @returns A promise resolving to the updated project details.
     */
    async update(projectKey: string, _project: Partial<Project>): Promise<ProjectDetailed> {
        this.logger.forMethod('update').warn(`Update project functionality is not yet implemented for project: ${projectKey}`);
        throw new Error('Update project not implemented');
         // TODO: Implement using PUT /rest/api/latest/projects/{projectKey} based on OpenAPI spec
    }

    /**
     * Deletes a project. (NOT IMPLEMENTED)
     * @param projectKey The key of the project to delete.
     * @returns A promise that resolves when deletion is complete (or errors).
     */
    async delete(projectKey: string): Promise<void> {
        this.logger.forMethod('delete').warn(`Delete project functionality is not yet implemented for project: ${projectKey}`);
        throw new Error('Delete project not implemented');
        // TODO: Implement using DELETE /rest/api/latest/projects/{projectKey} based on OpenAPI spec
    }
}

// Export the singleton instance for easy use
export const projectsService = AtlassianProjectsService.getInstance();
