import {
	GetCommits200Response,
	GetRepositoriesRecentlyAccessed200Response,
	RestCommit,
	RestMinimalRef,
	RestRepository,
	StreamFiles200Response
} from '@generated/models';
import nock from 'nock';

// Import the fixture utility
import { loadJsonFixture } from '../utils/fixture.util';

// Import the service to test
import { config } from '../utils/config.util'; // Need config for base URL
import { repositoriesService } from './atlassianRepositoriesService';


const projectKey = 'PRJ';
const repoSlug = 'git-repo';
const commitId = '12345679e4240c758669d14db6aad117e72d';
const filePath = 'git-repo-server/README.md';
const directoryPath = 'folder/sub-folder'; // Path for testing file listing
const expectedDefaultBranch = 'master';
const BASE_URL = config.get('ATLASSIAN_BITBUCKET_SERVER_URL') || 'http://mock-bitbucket-server';

describe('AtlassianRepositoriesService', () => {
	let getRepositoryFixture: RestRepository;
	let getDefaultBranchFixture: RestMinimalRef;
	let listCommitsFixture: GetCommits200Response;
	let getCommitFixture: RestCommit;
	let listFilesFixture: StreamFiles200Response;
	let listRepositoriesFixture: GetRepositoriesRecentlyAccessed200Response;
	let fileContentFixture: StreamFiles200Response; // Fixture for file content

	beforeAll(() => {
		// Load fixtures
		try {
			getRepositoryFixture = loadJsonFixture<RestRepository>('getRepository.json');
			getDefaultBranchFixture = loadJsonFixture<RestMinimalRef>('getDefaultBranch.json');
			listCommitsFixture = loadJsonFixture<GetCommits200Response>('listCommits.json');
			getCommitFixture = loadJsonFixture<RestCommit>('getCommit.json');
			listFilesFixture = loadJsonFixture<StreamFiles200Response>('listFiles.json');
			listRepositoriesFixture = loadJsonFixture<GetRepositoriesRecentlyAccessed200Response>('listRepositories.json');
			fileContentFixture = { values: [{ content: "This is the content of the README file.\n" }] };
		} catch (error) {
			console.error('Error loading fixtures:', error);
			throw new Error('Could not load test fixtures.');
		}

		// Prevent actual network calls, allowing only localhost if needed for other tests
		nock.disableNetConnect();
		nock.enableNetConnect('localhost');
	});

	afterEach(() => {
		// Clean up nock interceptors after each test
		nock.cleanAll();
	});

	afterAll(() => {
		// Restore network connections
		nock.enableNetConnect();
	});

	it('should fetch repository details', async () => {
		const scope = nock(BASE_URL)
			.get(`/api/latest/projects/${projectKey}/repos/${repoSlug}`)
			.query(true)
			.reply(200, getRepositoryFixture);

		const repo = await repositoriesService.getRepository(projectKey, repoSlug);

		expect(repo).toBeDefined();
		expect(repo.slug).toBe(repoSlug);
		expect(repo.project!.key).toBe(projectKey);
		scope.done(); // Verify the mock was called
	});

	it('should fetch the default branch', async () => {
		const scope = nock(BASE_URL)
			.get(`/api/latest/projects/${projectKey}/repos/${repoSlug}/default-branch`)
			.query(true)
			.reply(200, getDefaultBranchFixture);

		const branch = await repositoriesService.getDefaultBranch(projectKey, repoSlug);

		expect(branch).toBeDefined();
		expect(branch.id).toBe(getDefaultBranchFixture.id);
		expect(branch.displayId).toBe(expectedDefaultBranch);
		scope.done();
	});

	it('should list commits', async () => {
		const scope = nock(BASE_URL)
			.get(`/api/latest/projects/${projectKey}/repos/${repoSlug}/commits`)
			.query(true)
			.reply(200, listCommitsFixture);

		const commits = await repositoriesService.listCommits(projectKey, repoSlug);

		expect(commits).toBeDefined();
		expect(Array.isArray(commits.values)).toBe(true);
		expect(commits.values!.length).toBe(listCommitsFixture.values!.length);
		scope.done();
	});

	it('should fetch a specific commit', async () => {
		const scope = nock(BASE_URL)
			.get(`/api/latest/projects/${projectKey}/repos/${repoSlug}/commits/${commitId}`)
			.query(true)
			.reply(200, getCommitFixture);

		const commit = await repositoriesService.getCommit(projectKey, repoSlug, commitId);

		expect(commit).toBeDefined();
		expect(commit.id).toBe(getCommitFixture.id);
		scope.done();
	});

	it('should list files at the root', async () => {
		const scope = nock(BASE_URL)
			.get(`/api/latest/projects/${projectKey}/repos/${repoSlug}/files/`)
			.query(true)
			.reply(200, listFilesFixture);

		const files = await repositoriesService.listFiles(projectKey, repoSlug); // No path specified

		expect(files).toBeDefined();
		expect(Array.isArray(files.values)).toBe(true);
		expect(files.values!.length).toBe(listFilesFixture.values!.length);
		scope.done();
	});

	it('should list files in a specific directory (testing encoding)', async () => {
		// THIS IS THE KEY TEST
		// With the *unfixed* generator, the path sent will be `folder%2Fsub-folder`
		// With the *fixed* generator, the path sent should be `folder/sub-folder`
		// Nock should expect the CORRECT path format the server expects.
		const expectedPathForNock = directoryPath; // The server expects unencoded slashes in the path part

		const scope = nock(BASE_URL)
			.get(`/api/latest/projects/${projectKey}/repos/${repoSlug}/files/${expectedPathForNock}`)
			.query(true)
			.reply(200, listFilesFixture);

		const files = await repositoriesService.listFiles(projectKey, repoSlug, { path: directoryPath });

		expect(files).toBeDefined();
		expect(Array.isArray(files.values)).toBe(true);
		// Use the same generic fixture for now, adjust if needed
		expect(files.values!.length).toBe(listFilesFixture.values!.length);
		scope.done();
	});

	it('should fetch file content', async () => {
		const fileContent = "This is the content of the README file.\n";
		
		// Správný endpoint pro raw content
		// Bitbucket Server používá /raw/{path} endpoint
		const encodedFilePath = filePath.split('/').map(encodeURIComponent).join('/');
		
		const scope = nock(BASE_URL)
			.get(`/api/latest/projects/${projectKey}/repos/${repoSlug}/raw/${encodedFilePath}`)
			.query(true) // Akceptuje jakékoliv query parametry (např. at=branch)
			.reply(200, fileContent, {
				'Content-Type': 'text/plain; charset=UTF-8'
			});

		const content = await repositoriesService.getFileContent(projectKey, repoSlug, filePath);

		expect(content).toBeDefined();
		expect(content).toBe(fileContent);
		expect(content).toContain('This is the content of the README file');
		scope.done();
	});

	// Test s konkrétním ref (branch/tag/commit)
	it('should fetch file content at specific ref', async () => {
		const fileContent = "Content at specific branch\n";
		const ref = 'feature/test-branch';
		const encodedFilePath = filePath.split('/').map(encodeURIComponent).join('/');
		
		const scope = nock(BASE_URL)
			.get(`/api/latest/projects/${projectKey}/repos/${repoSlug}/raw/${encodedFilePath}`)
			.query({ at: ref })
			.reply(200, fileContent, {
				'Content-Type': 'text/plain; charset=UTF-8'
			});

		const content = await repositoriesService.getFileContent(projectKey, repoSlug, filePath, ref);

		expect(content).toBeDefined();
		expect(content).toBe(fileContent);
		scope.done();
	});

	// Test pro chybu když soubor neexistuje
	it('should handle error when file does not exist', async () => {
		const encodedFilePath = filePath.split('/').map(encodeURIComponent).join('/');
		
		const scope = nock(BASE_URL)
			.get(`/api/latest/projects/${projectKey}/repos/${repoSlug}/raw/${encodedFilePath}`)
			.query(true)
			.reply(404, {
				errors: [{
					context: null,
					message: 'File not found',
					exceptionName: 'com.atlassian.bitbucket.repository.NoSuchPathException'
				}]
			});

		await expect(
			repositoriesService.getFileContent(projectKey, repoSlug, filePath)
		).rejects.toThrow('Failed to fetch file content: 404');
		
		scope.done();
	});

	it('should list repositories', async () => {
		const scope = nock(BASE_URL)
			.get('/api/latest/repos')
			.query({ projectkey: projectKey })
			.reply(200, listRepositoriesFixture);

		const repos = await repositoriesService.listRepositories(projectKey);

		expect(repos).toBeDefined();
		expect(Array.isArray(repos.values)).toBe(true);
		expect(repos.values!.length).toBe(listRepositoriesFixture.values!.length);
		scope.done();
	});
}); 