import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

import { repositoriesService } from './atlassianRepositoriesService';
import nock from 'nock';
import fs from 'fs';
import path from 'path';

// Consistent base URL definition matching apiConfig.ts logic / error traces
const MOCK_BASE_URL = process.env.ATLASSIAN_BITBUCKET_SERVER_URL || 'http://example.com:7990'; 
const API_PREFIX = '/rest/api/latest'; // Correct prefix

describe('AtlassianRepositoriesService Integration (Mocked)', () => {
	const projectKey = 'PRJ';
	const repoSlug = 'git-repo';
	const commitId = '12345679e4240c758669d14db6aad117e72d';
	const filePath = 'git-repo-server/README.md';
	const expectedDefaultBranch = 'master'; // Assuming this is correct for the fixture

	const fixturesDir = path.resolve(__dirname, '__fixtures__');

	beforeAll(() => {
		// Prevent real network connections
		nock.disableNetConnect();
	});

	beforeEach(() => {
		// Clean mocks before each test and ensure nock is active
		nock.cleanAll();
		if (!nock.isActive()) {
			nock.activate();
		}
	});

	afterEach(() => {
		// Verify all expected nock calls were made and clean up
		try {
			expect(nock.isDone()).toBe(true); 
		} finally {
			nock.cleanAll();
		}
	});

	afterAll(() => {
		// Clean up and allow network connections again
		nock.cleanAll();
		nock.restore(); 
		nock.enableNetConnect();
	});

	it('should fetch repository details (from fixture)', async () => {
		const fixture = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'getRepository.json'), 'utf-8'));
		nock(MOCK_BASE_URL)
			.get(`${API_PREFIX}/projects/${projectKey}/repos/${repoSlug}`)
			.reply(200, fixture);

		const repo = await repositoriesService.getRepository(projectKey, repoSlug);
		expect(repo).toBeDefined();
		expect(repo.slug).toBe(repoSlug);
		expect(repo.project!.key).toBe(projectKey); // Use non-null assertion if sure
		// Note: getRepository fixture doesn't seem to include defaultBranch, test adjusted
	});

	it('should fetch the default branch (from fixture)', async () => {
		const fixture = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'getDefaultBranch.json'), 'utf-8'));
		nock(MOCK_BASE_URL)
			.get(`${API_PREFIX}/projects/${projectKey}/repos/${repoSlug}/default-branch`)
			.reply(200, fixture);

		const branch = await repositoriesService.getDefaultBranch(projectKey, repoSlug);
		expect(branch).toBeDefined();
		expect(branch.id).toBe(fixture.id);
		expect(branch.displayId).toBe(expectedDefaultBranch); // Check against expected value
	});

	it('should list commits (from fixture)', async () => {
		const fixture = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'listCommits.json'), 'utf-8'));
		nock(MOCK_BASE_URL)
			.get(`${API_PREFIX}/projects/${projectKey}/repos/${repoSlug}/commits`)
			.reply(200, fixture);

		const commits = await repositoriesService.listCommits(projectKey, repoSlug);
		expect(commits).toBeDefined();
		expect(Array.isArray(commits.values)).toBe(true);
		expect(commits.values!.length).toBe(fixture.values.length);
	});

	it('should fetch a specific commit (from fixture)', async () => {
		const fixture = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'getCommit.json'), 'utf-8'));
		nock(MOCK_BASE_URL)
			.get(`${API_PREFIX}/projects/${projectKey}/repos/${repoSlug}/commits/${commitId}`)
			.reply(200, fixture);

		const commit = await repositoriesService.getCommit(projectKey, repoSlug, commitId);
		expect(commit).toBeDefined();
		expect(commit.id).toBe(fixture.id);
		// Consider checking displayId or message if relevant
	});

	it('should list files (from fixture)', async () => {
		const fixture = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'listFiles.json'), 'utf-8'));
		nock(MOCK_BASE_URL)
			.get(`${API_PREFIX}/projects/${projectKey}/repos/${repoSlug}/files/`)
			.reply(200, fixture);

		const files = await repositoriesService.listFiles(projectKey, repoSlug);
		expect(files).toBeDefined();
		expect(Array.isArray(files.values)).toBe(true);
		expect(files.values!.length).toBe(fixture.values.length);
	});

	it('should fetch file content (from fixture)', async () => {
		// Assuming getFileContent returns raw text, not JSON
		const rawContent = "This is the content of the README file.\n"; 
		const encodedFilePath = encodeURIComponent(filePath);
		nock(MOCK_BASE_URL)
			// Note: The actual endpoint might be `/browse` or `/raw` depending on method used
			// streamFileContentRawRaw likely hits `/raw`
			.get(`${API_PREFIX}/projects/${projectKey}/repos/${repoSlug}/raw/${encodedFilePath}`)
			.reply(200, rawContent, { 'Content-Type': 'text/plain' }); // Reply with text

		const content = await repositoriesService.getFileContent(projectKey, repoSlug, filePath);
		expect(content).toBeDefined();
		expect(content).toEqual(rawContent);
	});

	it('should list repositories (from fixture)', async () => {
		const fixture = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'listRepositories.json'), 'utf-8'));
		nock(MOCK_BASE_URL)
		    // getRepositories1 uses /repos endpoint
			.get(`${API_PREFIX}/repos`)
			.query({ projectkey: projectKey }) // Match query parameters
			.reply(200, fixture);

		const repos = await repositoriesService.listRepositories(projectKey);
		expect(repos).toBeDefined();
		expect(Array.isArray(repos.values)).toBe(true);
		expect(repos.values!.length).toBe(fixture.values.length);
	});
});
