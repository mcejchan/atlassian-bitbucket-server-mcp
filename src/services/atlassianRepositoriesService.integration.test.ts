import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

import { repositoriesService } from './atlassianRepositoriesService';
import nock from 'nock';
import fs from 'fs';
import path from 'path';

describe('AtlassianRepositoriesService Integration (Mocked)', () => {
	const projectKey = 'PRJ';
	const repoSlug = 'git-repo';
	const commitId = '12345679e4240c758669d14db6aad117e72d';
	const filePath = 'git-repo-server/README.md';
	const expectedDefaultBranch = 'master';

	const bitbucketUrl = process.env.ATLASSIAN_BITBUCKET_SERVER_URL || '';
	const fixturesDir = path.resolve(__dirname, '__fixtures__');

	beforeAll(() => {
		nock.disableNetConnect();
	});

	afterAll(() => {
		nock.cleanAll();
		nock.enableNetConnect();
	});

	it('should fetch repository details and verify the default branch (from fixture)', async () => {
		const fixture = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'getRepository.json'), 'utf-8'));
		nock(bitbucketUrl)
			.get(`/rest/api/latest/projects/${projectKey}/repos/${repoSlug}`)
			.reply(200, fixture);

		const repo = await repositoriesService.getRepository(projectKey, repoSlug);
		expect(repo).toBeDefined();
		expect(repo.slug).toBe(repoSlug);
		expect(repo.project.key).toBe("PRJ");
		expect(repo.defaultBranch).toBeDefined();
		expect(repo.defaultBranch).toBe(expectedDefaultBranch);
	});

	it('should fetch the default branch (from fixture)', async () => {
		const fixture = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'getDefaultBranch.json'), 'utf-8'));
		nock(bitbucketUrl)
			.get(`/rest/api/latest/projects/${projectKey}/repos/${repoSlug}/branches/default`)
			.reply(200, fixture);

		const branch = await repositoriesService.getDefaultBranch(projectKey, repoSlug);
		expect(branch).toBeDefined();
		expect(branch.id).toBe(fixture.id);
		expect(branch.displayId).toBe(fixture.displayId);
	});

	it('should list commits (from fixture)', async () => {
		const fixture = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'listCommits.json'), 'utf-8'));
		nock(bitbucketUrl)
			.get(`/rest/api/latest/projects/${projectKey}/repos/${repoSlug}/commits`)
			.reply(200, fixture);

		const commits = await repositoriesService.listCommits(projectKey, repoSlug);
		expect(commits).toBeDefined();
		expect(Array.isArray(commits.values)).toBe(true);
		expect(commits.values.length).toBe(fixture.values.length);
	});

	it('should fetch a specific commit (from fixture)', async () => {
		const fixture = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'getCommit.json'), 'utf-8'));
		nock(bitbucketUrl)
			.get(`/rest/api/latest/projects/${projectKey}/repos/${repoSlug}/commits/${commitId}`)
			.reply(200, fixture);

		const commit = await repositoriesService.getCommit(projectKey, repoSlug, commitId);
		expect(commit).toBeDefined();
		expect(commit.id).toBe(fixture.id);
		expect(commit.displayId).toBe(fixture.displayId);
	});

	it('should list files (from fixture)', async () => {
		const fixture = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'listFiles.json'), 'utf-8'));
		nock(bitbucketUrl)
			.get(`/rest/api/latest/projects/${projectKey}/repos/${repoSlug}/files`)
			.reply(200, fixture);

		const files = await repositoriesService.listFiles(projectKey, repoSlug);
		expect(files).toBeDefined();
		expect(Array.isArray(files.values)).toBe(true);
		expect(files.values.length).toBe(fixture.values.length);
	});

	it('should fetch file content (from fixture)', async () => {
		const fixture = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'getFileContent.json'), 'utf-8'));
		nock(bitbucketUrl)
			.get(`/rest/api/latest/projects/${projectKey}/repos/${repoSlug}/raw/${filePath}`)
			.reply(200, fixture);

		const content = await repositoriesService.getFileContent(projectKey, repoSlug, filePath);
		expect(content).toBeDefined();
		// Optionally check content length or value
	});

	it('should list repositories (from fixture)', async () => {
		const fixture = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'listRepositories.json'), 'utf-8'));
		nock(bitbucketUrl)
			.get(`/rest/api/latest/projects/${projectKey}/repos`)
			.reply(200, fixture);

		const repos = await repositoriesService.listRepositories(projectKey);
		expect(repos).toBeDefined();
		expect(Array.isArray(repos.values)).toBe(true);
		expect(repos.values.length).toBe(fixture.values.length);
	});
});
