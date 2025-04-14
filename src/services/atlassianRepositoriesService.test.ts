import {
	GetCommits200Response,
	GetRepositoriesRecentlyAccessed200Response,
	RestCommit,
	RestMinimalRef,
	RestRepository,
	StreamFiles200Response
} from '@generated/models';
import { jest } from '@jest/globals';

// Import the new fixture utility
import { loadJsonFixture } from '../utils/fixture.util';

// Define mock functions for API methods
const mockGetRepository = jest.fn<(params: GetRepositories1Request) => Promise<RestRepository>>();
const mockGetDefaultBranch = jest.fn<(params: GetDefaultBranch2Request) => Promise<RestMinimalRef>>();
const mockGetCommits = jest.fn<(params: GetCommitsRequest) => Promise<GetCommits200Response>>();
const mockGetCommit = jest.fn<(params: GetCommitRequest) => Promise<RestCommit>>();
const mockStreamFiles1 = jest.fn<(params: StreamFiles1Request) => Promise<StreamFiles200Response>>();
const mockStreamFiles = jest.fn<(params: StreamFiles1Request) => Promise<any>>();
const mockGetRepositories1 = jest.fn<(params: GetRepositories1Request) => Promise<GetRepositoriesRecentlyAccessed200Response>>();

// Mock the generated API clients
jest.mock('../generated/src/apis/RepositoryApi', () => {
	return {
		RepositoryApi: jest.fn().mockImplementation(() => {
			return {
				getRepository: mockGetRepository,
				getCommits: mockGetCommits,
				getCommit: mockGetCommit,
				streamFiles1: mockStreamFiles1,
				streamFiles: mockStreamFiles,
				getRepositories1: mockGetRepositories1
			};
		})
	};
});

// Mock ProjectApi for the getDefaultBranch2 method
jest.mock('../generated/src/apis/ProjectApi', () => {
	return {
		ProjectApi: jest.fn().mockImplementation(() => {
			return {
				getDefaultBranch2: mockGetDefaultBranch,
				getRepository: mockGetRepository
			};
		})
	};
});

// Import types for mock function parameters
import type { GetDefaultBranch2Request } from '../generated/src/apis/ProjectApi';
import type {
	GetCommitRequest,
	GetCommitsRequest,
	GetRepositories1Request,
	StreamFiles1Request
} from '../generated/src/apis/RepositoryApi';

// Import after mocks are defined
import { repositoriesService } from './atlassianRepositoriesService';

const projectKey = 'PRJ';
const repoSlug = 'git-repo';
const commitId = '12345679e4240c758669d14db6aad117e72d';
const filePath = 'git-repo-server/README.md';
const expectedDefaultBranch = 'master';

describe('AtlassianRepositoriesService', () => {
	let getRepositoryFixture: RestRepository;
	let getDefaultBranchFixture: RestMinimalRef;
	let listCommitsFixture: GetCommits200Response;
	let getCommitFixture: RestCommit;
	let listFilesFixture: StreamFiles200Response;
	let listRepositoriesFixture: GetRepositoriesRecentlyAccessed200Response;

	beforeAll(() => {
		// Load fixtures using the new utility
		try {
			getRepositoryFixture = loadJsonFixture<RestRepository>('getRepository.json');
			getDefaultBranchFixture = loadJsonFixture<RestMinimalRef>('getDefaultBranch.json');
			listCommitsFixture = loadJsonFixture<GetCommits200Response>('listCommits.json');
			getCommitFixture = loadJsonFixture<RestCommit>('getCommit.json');
			listFilesFixture = loadJsonFixture<StreamFiles200Response>('listFiles.json');
			listRepositoriesFixture = loadJsonFixture<GetRepositoriesRecentlyAccessed200Response>('listRepositories.json');
		} catch (error) {
			console.error('Error loading fixtures:', error);
			throw new Error('Could not load test fixtures.');
		}
	});

	beforeEach(() => {
		// Reset mocks before each test
		mockGetRepository.mockClear();
		mockGetDefaultBranch.mockClear();
		mockGetCommits.mockClear();
		mockGetCommit.mockClear();
		mockStreamFiles1.mockClear();
		mockStreamFiles.mockClear();
		mockGetRepositories1.mockClear();
	});

	it('should fetch repository details', async () => {
		mockGetRepository.mockResolvedValue(getRepositoryFixture);

		const repo = await repositoriesService.getRepository(projectKey, repoSlug);

		expect(mockGetRepository).toHaveBeenCalledWith({
			projectKey: projectKey,
			repositorySlug: repoSlug
		});
		expect(repo).toBeDefined();
		expect(repo.slug).toBe(repoSlug);
		expect(repo.project!.key).toBe(projectKey);
	});

	it('should fetch the default branch', async () => {
		mockGetDefaultBranch.mockResolvedValue(getDefaultBranchFixture);

		const branch = await repositoriesService.getDefaultBranch(projectKey, repoSlug);

		expect(mockGetDefaultBranch).toHaveBeenCalledWith({
			projectKey: projectKey,
			repositorySlug: repoSlug
		});
		expect(branch).toBeDefined();
		expect(branch.id).toBe(getDefaultBranchFixture.id);
		expect(branch.displayId).toBe(expectedDefaultBranch);
	});

	it('should list commits', async () => {
		mockGetCommits.mockResolvedValue(listCommitsFixture);

		const commits = await repositoriesService.listCommits(projectKey, repoSlug);

		expect(mockGetCommits).toHaveBeenCalledWith({
			projectKey: projectKey,
			repositorySlug: repoSlug
		});
		expect(commits).toBeDefined();
		expect(Array.isArray(commits.values)).toBe(true);
		expect(commits.values!.length).toBe(listCommitsFixture.values!.length);
	});

	it('should fetch a specific commit', async () => {
		mockGetCommit.mockResolvedValue(getCommitFixture);

		const commit = await repositoriesService.getCommit(projectKey, repoSlug, commitId);

		expect(mockGetCommit).toHaveBeenCalledWith({
			projectKey: projectKey,
			repositorySlug: repoSlug,
			commitId: commitId
		});
		expect(commit).toBeDefined();
		expect(commit.id).toBe(getCommitFixture.id);
	});

	it('should list files', async () => {
		mockStreamFiles1.mockResolvedValue(listFilesFixture);

		const files = await repositoriesService.listFiles(projectKey, repoSlug);

		expect(mockStreamFiles1).toHaveBeenCalledWith({
			projectKey: projectKey,
			repositorySlug: repoSlug,
			path: '',
		});
		expect(files).toBeDefined();
		expect(Array.isArray(files.values)).toBe(true);
		expect(files.values!.length).toBe(listFilesFixture.values!.length);
	});

	it('should fetch file content', async () => {
		const apiResponse = {
			values: [{ content: "This is the content of the README file.\n" }]
		};
		mockStreamFiles.mockResolvedValue(apiResponse);

		const content = await repositoriesService.getFileContent(projectKey, repoSlug, filePath);

		expect(mockStreamFiles).toHaveBeenCalledWith({
			projectKey: projectKey,
			repositorySlug: repoSlug,
			path: filePath,
			at: undefined
		});
		expect(content).toBeDefined();
		expect(content).toContain('This is the content of the README file');
	});

	it('should list repositories', async () => {
		mockGetRepositories1.mockResolvedValue(listRepositoriesFixture);

		const repos = await repositoriesService.listRepositories(projectKey);

		expect(mockGetRepositories1).toHaveBeenCalledWith({
			projectkey: projectKey
		});
		expect(repos).toBeDefined();
		expect(Array.isArray(repos.values)).toBe(true);
		expect(repos.values!.length).toBe(listRepositoriesFixture.values!.length);
	});
}); 