import { Logger } from '../utils/logger.util';
import { ProjectApi } from '../generated/src/apis/ProjectApi';
import { RepositoryApi } from '../generated/src/apis/RepositoryApi';

// Remove direct Configuration/Middleware imports
// Import specific request/response types needed
import type {
	GetRepositories1Request,
	StreamFiles1Request,
	GetBranchesRequest,
	GetBranchesOrderByEnum,
	GetCommitsRequest,
	GetCommitRequest
} from '../generated/src/apis/RepositoryApi';
import type { GetRepositoryRequest, GetDefaultBranch2Request } from '../generated/src/apis/ProjectApi';
import type {
	GetRepositoriesRecentlyAccessed200Response,
	RestRepository,
	GetBranches200Response,
	GetCommits200Response,
	RestCommit,
	StreamFiles200Response,
	RestMinimalRef
} from '../generated/src/models/index';
import { createBitbucketApiConfig } from '../utils/apiConfig'; // Import the factory

export class AtlassianRepositoriesService {
	private readonly logger: Logger;
	private static instance: AtlassianRepositoriesService;
	private readonly projectApi: ProjectApi;
	private readonly repositoryApi: RepositoryApi;

	private constructor() {
		this.logger = Logger.forContext('services/atlassianRepositoriesService');

		// Use the centralized factory to get configuration
		const apiConfig = createBitbucketApiConfig();

		this.projectApi = new ProjectApi(apiConfig);
		this.repositoryApi = new RepositoryApi(apiConfig);

		this.logger.debug('Service initialized with generated API clients using shared config.');
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
	async listRepositories(projectKey: string, params: { limit?: number; start?: number } = {}): Promise<GetRepositoriesRecentlyAccessed200Response> {
		if (!projectKey) {
			throw new Error('projectKey parameter is required');
		}
		const methodLogger = this.logger.forMethod('listRepositories');
		methodLogger.debug(`Listing repositories for project: ${projectKey} with params:`, params);

		const request: GetRepositories1Request = {
			projectkey: projectKey,
			limit: params.limit,
			start: params.start
		};

		const response = await this.repositoryApi.getRepositories1(request);

		methodLogger.debug(`Found ${response.size ?? 'unknown'} repositories total.`);
		return response;
	}

	/**
	 * Gets detailed information for a specific repository.
	 * @param projectKey The key of the project.
	 * @param repoSlug The slug of the repository.
	 * @returns A promise resolving to the detailed repository information.
	 */
	async getRepository(projectKey: string, repoSlug: string): Promise<RestRepository> {
		if (!projectKey || !repoSlug) {
			throw new Error('projectKey and repoSlug parameters are required');
		}
		const methodLogger = this.logger.forMethod('getRepository');
		methodLogger.debug(`Getting repository: ${repoSlug} in project: ${projectKey}`);

		const request: GetRepositoryRequest = {
			projectKey: projectKey,
			repositorySlug: repoSlug
		};

		const response = await this.projectApi.getRepository(request);

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
			throw new Error('projectKey, repoSlug, and filePath are required');
		}

		const methodLogger = this.logger.forMethod('getFileContent');
		methodLogger.debug(
			`Getting file content for ${filePath} in ${projectKey}/${repoSlug} at ${atRef ?? 'default'}`
		);

		try {
			// Zkusíme najít metodu getRaw v RepositoryApi
			const repoApiAny = this.repositoryApi as any;
			
			if (typeof repoApiAny.getRaw === 'function') {
				methodLogger.debug('Using getRaw method from generated API');
				
				const response = await repoApiAny.getRaw({
					projectKey,
					repositorySlug: repoSlug,
					path: filePath,
					at: atRef
				});
				
				// Zpracování různých typů odpovědí
				if (typeof response === 'string') {
					return response;
				}
				
				// Pokud má response metodu text() (jako Blob nebo Response)
				if (response && typeof response.text === 'function') {
					return await response.text();
				}
				
				// Fallback - převedeme na string
				return String(response);
			}
			
			// Pokud getRaw neexistuje, použijeme přímé volání fetch
			methodLogger.debug('getRaw method not found, using direct fetch');
			
			const config = createBitbucketApiConfig();
			const baseURL = config.basePath;
			const headers = config.headers || {};
			
			// Správně zakódujeme části URL
			const encodedProjectKey = encodeURIComponent(projectKey);
			const encodedRepoSlug = encodeURIComponent(repoSlug);
			
			// Pro cestu k souboru zachováme lomítka, ale zakódujeme ostatní znaky
			const encodedFilePath = filePath.split('/').map(encodeURIComponent).join('/');
			
			// Konstruujeme URL pro /raw endpoint
			let url = `${baseURL}/projects/${encodedProjectKey}/repos/${encodedRepoSlug}/raw/${encodedFilePath}`;
			
			// Přidáme query parametr pro ref
			if (atRef) {
				url += `?at=${encodeURIComponent(atRef)}`;
			}
			
			methodLogger.debug(`Fetching raw content from: ${url}`);
			
			const response = await fetch(url, {
				method: 'GET',
				headers: {
					...headers,
					'Accept': '*/*'
				}
			});
			
			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(
					`Failed to fetch file content: ${response.status} ${response.statusText}. ` +
					`Response: ${errorText}`
				);
			}
			
			const content = await response.text();
			methodLogger.debug(`Retrieved ${content.length} bytes of content`);
			
			return content;
			
		} catch (error) {
			methodLogger.error(`Error fetching file content for ${filePath}:`, error);
			throw error;
		}
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
		params: { limit?: number; start?: number; filterText?: string; orderBy?: GetBranchesOrderByEnum; } = {}
	): Promise<GetBranches200Response> {
		if (!projectKey || !repoSlug) {
			throw new Error('projectKey and repoSlug parameters are required');
		}
		const methodLogger = this.logger.forMethod('listBranches');
		methodLogger.debug(`Listing branches for repo: ${repoSlug}, project: ${projectKey}, params:`, params);

		const request: GetBranchesRequest = {
			projectKey: projectKey,
			repositorySlug: repoSlug,
			limit: params.limit,
			start: params.start,
			filterText: params.filterText,
			orderBy: params.orderBy,
		};

		const response = await this.repositoryApi.getBranches(request);

		methodLogger.debug(`Found ${response.size ?? 'unknown'} branches total.`);
		return response;
	}

	/**
	 * Gets the default branch for a repository.
	 * @param projectKey The key of the project.
	 * @param repoSlug The slug of the repository.
	 * @returns A promise resolving to the default branch object (minimal ref).
	 */
	async getDefaultBranch(
		projectKey: string,
		repoSlug: string
	): Promise<RestMinimalRef> {
		if (!projectKey || !repoSlug) {
			throw new Error('projectKey and repoSlug parameters are required');
		}
		const methodLogger = this.logger.forMethod('getDefaultBranch');
		methodLogger.debug(`Getting default branch for repo: ${repoSlug}, project: ${projectKey}`);

		const request: GetDefaultBranch2Request = {
			projectKey: projectKey,
			repositorySlug: repoSlug
		};

		const response = await this.projectApi.getDefaultBranch2(request);

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
		params: { limit?: number; start?: number; until?: string; path?: string; } = {}
	): Promise<GetCommits200Response> {
		if (!projectKey || !repoSlug) {
			throw new Error('projectKey and repoSlug parameters are required');
		}
		const methodLogger = this.logger.forMethod('listCommits');
		methodLogger.debug(`Listing commits for repo: ${repoSlug}, project: ${projectKey}, params:`, params);

		const request: GetCommitsRequest = {
			projectKey: projectKey,
			repositorySlug: repoSlug,
			limit: params.limit,
			start: params.start,
			until: params.until,
			path: params.path,
		};

		const response = await this.repositoryApi.getCommits(request);

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
	): Promise<RestCommit> {
		if (!projectKey || !repoSlug || !commitId) {
			throw new Error('projectKey, repoSlug, and commitId parameters are required');
		}
		const methodLogger = this.logger.forMethod('getCommit');
		methodLogger.debug(`Getting commit ${commitId} for repo: ${repoSlug}, project: ${projectKey}`);

		const request: GetCommitRequest = {
			projectKey: projectKey,
			repositorySlug: repoSlug,
			commitId: commitId
		};

		const response = await this.repositoryApi.getCommit(request);

		methodLogger.debug(`Retrieved commit: ${response.id}`);
		return response;
	}


	/**
	 * Lists files/directories in a repository at a given ref and path.
	 * @param projectKey The key of the project.
	 * @param repoSlug The slug of the repository.
	 * @param params Optional: at (branch/tag/commit), path (subdirectory), limit, start.
	 * @returns A promise resolving to the list of files/directories.
	 */
	async listFiles(
		projectKey: string,
		repoSlug: string,
		params: { at?: string; path?: string; limit?: number; start?: number; } = {}
	): Promise<StreamFiles200Response> {
		if (!projectKey || !repoSlug) {
			throw new Error('projectKey and repoSlug parameters are required');
		}
		const methodLogger = this.logger.forMethod('listFiles');
		methodLogger.debug(`Listing files for repo: ${repoSlug}, project: ${projectKey}, params:`, params);

		const request: StreamFiles1Request = {
			projectKey: projectKey,
			repositorySlug: repoSlug,
			at: params.at,
			path: params.path ?? '',
			limit: params.limit,
			start: params.start
		};

		const response = await this.repositoryApi.streamFiles1(request);

		methodLogger.debug(`Found ${response.size ?? 0} files/directories.`);
		return response;
	}

	// Additional methods for content browsing and search can be added here.
}

// Export singleton instance
export const repositoriesService = AtlassianRepositoriesService.getInstance();
