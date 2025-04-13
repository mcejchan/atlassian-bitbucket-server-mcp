import { BitbucketClient } from '../utils/http/bitbucket-client';
import { Logger } from '../utils/logger.util';

// Types based on Bitbucket API (refine with OpenAPI if needed)
export interface Repository {
    hierarchyId?: string;
    scmId: string;
    slug: string;
    statusMessage?: string;
    archived?: boolean;
    forkable?: boolean;
    defaultBranch?: string;
    partition?: number;
    relatedLinks?: Record<string, unknown>;
    project: {
        avatar?: string;
        description?: string;
        scope?: string;
        name: string;
        key: string;
        id: number;
        type?: string;
        public?: boolean;
    };
    description?: string;
    scope?: string;
    origin?: Repository;
    name: string;
    id: number;
    state: string;
    public?: boolean;
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

type RepositoriesResponse = PagedResponse<Repository>;
type RepositoryDetailed = Repository;

export class AtlassianRepositoriesService {
	private static readonly API_PATH = '/rest/api/latest';
	private readonly client: BitbucketClient;
	private readonly logger: Logger;
	private static instance: AtlassianRepositoriesService;

	private constructor() {
		this.logger = Logger.forContext('services/atlassianRepositoriesService');
		this.client = BitbucketClient.getInstance();
	}

	public static getInstance(): AtlassianRepositoriesService {
		if (!AtlassianRepositoriesService.instance) {
			AtlassianRepositoriesService.instance = new AtlassianRepositoriesService();
		}
		return AtlassianRepositoriesService.instance;
	}

	/**
     * Lists repositories for a given project.
     * @param projectKey The key of the project.
     * @param params Optional query parameters (e.g., { limit: 50 })
     * @returns A promise resolving to the paged response of repositories.
     */
	async listRepositories(projectKey: string, params: { limit?: number; start?: number } = {}): Promise<RepositoriesResponse> {
		if (!projectKey) {
			throw new Error('projectKey parameter is required');
		}
		const methodLogger = this.logger.forMethod('listRepositories');
		methodLogger.debug(`Listing repositories for project: ${projectKey} with params:`, params);
		const response = await this.client.get<RepositoriesResponse>(
			`${AtlassianRepositoriesService.API_PATH}/projects/${projectKey}/repos`,
			{ params }
		);
		methodLogger.debug(`Found ${response.size} repositories total.`);
		return response;
	}

	/**
     * Gets detailed information for a specific repository.
     * @param projectKey The key of the project.
     * @param repoSlug The slug of the repository.
     * @returns A promise resolving to the detailed repository information.
     */
	async getRepository(projectKey: string, repoSlug: string): Promise<RepositoryDetailed> {
		if (!projectKey || !repoSlug) {
			throw new Error('projectKey and repoSlug parameters are required');
		}
		const methodLogger = this.logger.forMethod('getRepository');
		methodLogger.debug(`Getting repository: ${repoSlug} in project: ${projectKey}`);
		const response = await this.client.get<RepositoryDetailed>(
			`${AtlassianRepositoriesService.API_PATH}/projects/${projectKey}/repos/${repoSlug}`
		);
		methodLogger.debug(`Retrieved details for repository: ${response.name}`);
		return response;
	}

	/**
     * Gets the raw content of a file in a repository at a specific ref (branch, tag, or commit).
     * @param projectKey The key of the project.
     * @param repoSlug The slug of the repository.
     * @param filePath The path to the file in the repository.
     * @param atRef Optional branch, tag, or commit (defaults to default branch).
     * @returns A promise resolving to the file content as a string.
     */
	async getFileContent(
		projectKey: string,
		repoSlug: string,
		filePath: string,
		atRef?: string
	): Promise<string> {
		if (!projectKey || !repoSlug || !filePath) {
			throw new Error('projectKey, repoSlug, and filePath parameters are required');
		}
		const methodLogger = this.logger.forMethod('getFileContent');
		methodLogger.debug(`Getting file content for ${filePath} in repo: ${repoSlug}, project: ${projectKey}, at: ${atRef || 'default'}`);
		const params: Record<string, string> = {};
		if (atRef) params['at'] = atRef;
		// The Bitbucket API returns raw file content as text
		const response = await this.client.get<string>(
			`${AtlassianRepositoriesService.API_PATH}/projects/${projectKey}/repos/${repoSlug}/raw/${filePath}`,
			{ params, responseType: 'text' }
		);
		methodLogger.debug(`Retrieved file content for ${filePath} (length: ${response.length})`);
		return response;
	}

	/**
     * Lists branches for a given repository.
     * @param projectKey The key of the project.
     * @param repoSlug The slug of the repository.
     * @param params Optional query parameters (e.g., { limit: 50, start: 0, filterText: 'main' })
     * @returns A promise resolving to the paged response of branches.
     */
	async listBranches(
		projectKey: string,
		repoSlug: string,
		params: { limit?: number; start?: number; filterText?: string } = {}
	): Promise<any> {
		if (!projectKey || !repoSlug) {
			throw new Error('projectKey and repoSlug parameters are required');
		}
		const methodLogger = this.logger.forMethod('listBranches');
		methodLogger.debug(`Listing branches for repo: ${repoSlug}, project: ${projectKey}, params:`, params);
		const response = await this.client.get<any>(
			`${AtlassianRepositoriesService.API_PATH}/projects/${projectKey}/repos/${repoSlug}/branches`,
			{ params }
		);
		methodLogger.debug(`Found ${response.size} branches total.`);
		return response;
	}

	/**
     * Gets the default branch for a repository.
     * @param projectKey The key of the project.
     * @param repoSlug The slug of the repository.
     * @returns A promise resolving to the default branch object.
     */
	async getDefaultBranch(
		projectKey: string,
		repoSlug: string
	): Promise<any> {
		if (!projectKey || !repoSlug) {
			throw new Error('projectKey and repoSlug parameters are required');
		}
		const methodLogger = this.logger.forMethod('getDefaultBranch');
		methodLogger.debug(`Getting default branch for repo: ${repoSlug}, project: ${projectKey}`);
		const response = await this.client.get<any>(
			`${AtlassianRepositoriesService.API_PATH}/projects/${projectKey}/repos/${repoSlug}/branches/default`
		);
		methodLogger.debug(`Default branch: ${response.displayId}`);
		return response;
	}

	/**
     * Lists commits for a given repository (optionally for a branch, path, etc.).
     * @param projectKey The key of the project.
     * @param repoSlug The slug of the repository.
     * @param params Optional query parameters (e.g., { limit, start, until, path, author })
     * @returns A promise resolving to the paged response of commits.
     */
	async listCommits(
		projectKey: string,
		repoSlug: string,
		params: { limit?: number; start?: number; until?: string; path?: string; author?: string } = {}
	): Promise<any> {
		if (!projectKey || !repoSlug) {
			throw new Error('projectKey and repoSlug parameters are required');
		}
		const methodLogger = this.logger.forMethod('listCommits');
		methodLogger.debug(`Listing commits for repo: ${repoSlug}, project: ${projectKey}, params:`, params);
		const response = await this.client.get<any>(
			`${AtlassianRepositoriesService.API_PATH}/projects/${projectKey}/repos/${repoSlug}/commits`,
			{ params }
		);
		methodLogger.debug(`Found ${response.size} commits total.`);
		return response;
	}

	/**
     * Gets details for a specific commit.
     * @param projectKey The key of the project.
     * @param repoSlug The slug of the repository.
     * @param commitId The commit hash.
     * @returns A promise resolving to the commit details.
     */
	async getCommit(
		projectKey: string,
		repoSlug: string,
		commitId: string
	): Promise<any> {
		if (!projectKey || !repoSlug || !commitId) {
			throw new Error('projectKey, repoSlug, and commitId parameters are required');
		}
		const methodLogger = this.logger.forMethod('getCommit');
		methodLogger.debug(`Getting commit ${commitId} for repo: ${repoSlug}, project: ${projectKey}`);
		const response = await this.client.get<any>(
			`${AtlassianRepositoriesService.API_PATH}/projects/${projectKey}/repos/${repoSlug}/commits/${commitId}`
		);
		methodLogger.debug(`Retrieved commit: ${response.id}`);
		return response;
	}


	/**
     * Lists files/directories in a repository at a given ref and path.
     * @param projectKey The key of the project.
     * @param repoSlug The slug of the repository.
     * @param options Optional: at (branch/tag/commit), path (subdirectory), limit, start.
     * @returns A promise resolving to the list of files/directories.
     */
	async listFiles(
		projectKey: string,
		repoSlug: string,
		options: { at?: string; path?: string; limit?: number; start?: number } = {}
	): Promise<any> {
		if (!projectKey || !repoSlug) {
			throw new Error('projectKey and repoSlug parameters are required');
		}
		const methodLogger = this.logger.forMethod('listFiles');
		methodLogger.debug(`Listing files for repo: ${repoSlug}, project: ${projectKey}, options:`, options);
		const params: Record<string, any> = {};
		if (options.at) params.at = options.at;
		if (options.path) params.path = options.path;
		if (options.limit) params.limit = options.limit;
		if (options.start) params.start = options.start;
		const response = await this.client.get<any>(
			`${AtlassianRepositoriesService.API_PATH}/projects/${projectKey}/repos/${repoSlug}/files`,
			{ params }
		);
		methodLogger.debug(`Found ${response.values?.length ?? 0} files/directories.`);
		return response;
	}

	// Additional methods for content browsing and search can be added here.
}

// Export the singleton instance for easy use
export const repositoriesService = AtlassianRepositoriesService.getInstance();
