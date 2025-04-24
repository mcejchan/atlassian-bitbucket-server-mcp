import nock from 'nock';
import { ErrorType, McpError } from '../utils/error.util';

// Import types
import type { GetProjects200Response, RestProject } from '@generated/models';

// Import the fixture utility
import { loadJsonFixture } from '../utils/fixture.util';

// Import the singleton INSTANCE
import { projectsService } from './atlassianProjectsService';
// Import config for base URL
import { config } from '../utils/config.util';

const testProjectKey = 'TESTPROJ';
const BASE_URL = config.get('ATLASSIAN_BITBUCKET_SERVER_URL') || 'http://mock-bitbucket-server';

describe('Atlassian Projects Service', () => {
	let listFixture: GetProjects200Response;
	let getFixture: RestProject;

	beforeAll(() => {
		// Load Fixtures
		try {
			listFixture = loadJsonFixture<GetProjects200Response>('listProjects.json');
			getFixture = loadJsonFixture<RestProject>('getProject.json');
		} catch (error) {
			console.error('Error loading fixtures:', error);
			throw new Error('Could not load test fixtures.');
		}
		nock.disableNetConnect();
		nock.enableNetConnect('localhost');
	});

	afterEach(() => {
		nock.cleanAll();
	});

	afterAll(() => {
		nock.enableNetConnect();
	});

	describe('listProjects', () => {
		it('should list projects successfully', async () => {
			const scope = nock(BASE_URL)
				.get('/api/latest/projects')
				.query(true)
				.reply(200, listFixture); // Use fixture

			const result = await projectsService.listProjects({});
			expect(result.size).toEqual(listFixture.size);
			expect(result.values).toBeDefined();
			expect(result.values?.[0]?.key).toEqual(listFixture.values?.[0]?.key);
			scope.done();
		});

		it('should handle pagination parameters', async () => {
			// Using a mock response here as listFixture doesn't fit pagination well
			const mockPaginatedResponse = {
				...listFixture,
				limit: 10,
				start: 10,
				isLastPage: false,
				values: [{ key: 'PRJ2', name: 'Project 2', id: 2, public: false, type: 'NORMAL' }], // Example paginated value
				size: 1,
			};
			const scope = nock(BASE_URL)
				.get('/api/latest/projects')
				.query({ limit: 10, start: 10 })
				.reply(200, mockPaginatedResponse);

			const result = await projectsService.listProjects({ limit: 10, start: 10 });
			// Check essential pagination fields
			expect(result.limit).toEqual(mockPaginatedResponse.limit);
			expect(result.start).toEqual(mockPaginatedResponse.start);
			expect(result.isLastPage).toEqual(mockPaginatedResponse.isLastPage);
			expect(result.size).toEqual(mockPaginatedResponse.size);
			expect(result.values?.[0]?.key).toEqual(mockPaginatedResponse.values[0].key);
			scope.done();
		});

		// Add tests for filtering by name and permission if needed
	});

	describe('getProject', () => {
		const nonExistentKey = 'NON-EXISTENT-PROJECT-KEY-12345';

		it('should get project details successfully', async () => {
			const projectKeyFromFixture = getFixture.key || testProjectKey;
			const scope = nock(BASE_URL)
				.get(`/api/latest/projects/${projectKeyFromFixture}`)
				.reply(200, getFixture); // Use fixture

			const result = await projectsService.getProject(projectKeyFromFixture);
			expect(result.key).toEqual(getFixture.key);
			expect(result.name).toEqual(getFixture.name);
			scope.done();
		});

		it('should throw McpError for non-existent project key (404)', async () => {
			const errorResponse = { message: 'Project not found' };
			const scope = nock(BASE_URL)
				.get(`/api/latest/projects/${nonExistentKey}`)
				.reply(404, errorResponse);

			await expect(projectsService.getProject(nonExistentKey)).rejects.toThrow(
				new McpError(
					`Project '${nonExistentKey}' not found. ${errorResponse.message}`,
					ErrorType.NOT_FOUND,
					404
				)
			);
			scope.done();
		});

		it('should handle other API errors (e.g., 500)', async () => {
			const projectKeyFromFixture = getFixture.key || testProjectKey;
			const errorResponse = { message: 'Internal server error' };
			const scope = nock(BASE_URL)
				.get(`/api/latest/projects/${projectKeyFromFixture}`)
				.reply(500, errorResponse);

			const expectedApiErrorMessage = `Failed to get project '${projectKeyFromFixture}': [500 Internal Server Error] GET ${BASE_URL}/api/latest/projects/${projectKeyFromFixture}. ${errorResponse.message}`;

			await expect(projectsService.getProject(projectKeyFromFixture)).rejects.toThrow(
				new McpError(
					expectedApiErrorMessage,
					ErrorType.API_ERROR,
					500
				)
			);
			scope.done();
		});
	});
});
