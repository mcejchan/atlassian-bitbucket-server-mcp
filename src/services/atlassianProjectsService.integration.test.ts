// Load environment variables first
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { jest } from '@jest/globals';
// Nock is not needed here as we mock the ProjectApi directly
// import nock from 'nock'; 

const envPath = path.resolve(process.cwd(), '.env.test');
if (fs.existsSync(envPath)) {
	const envConfig = dotenv.parse(fs.readFileSync(envPath));
	for (const k in envConfig) {
		process.env[k] = envConfig[k];
	}
}

// Import types
import { McpError, ErrorType } from '../utils/error.util';
import type { RestProject, GetProjects200Response } from '../generated/models';
import type { GetProjectsRequest, GetProjectRequest } from '../generated/apis/ProjectApi';

// Define mock functions for API methods with explicit types
const mockGetProjects = jest.fn< (params: GetProjectsRequest) => Promise<GetProjects200Response> >();
const mockGetProject = jest.fn< (params: GetProjectRequest) => Promise<RestProject> >();

// Mock generated ProjectApi
jest.mock('@generated/apis/ProjectApi', () => {
	// Return a mock constructor
	return {
		ProjectApi: jest.fn().mockImplementation(() => {
			// The mock instance has the mocked methods
			return {
				getProjects: mockGetProjects,
				getProject: mockGetProject,
			};
		})
	};
});

// REMOVED: Mock for ../utils/http/bitbucket-client

// Now import the service - mocks will be applied
import { projectsService } from './atlassianProjectsService';

const testProjectKey = 'TESTPROJ';
const fixturesDir = path.resolve(__dirname, '__fixtures__');

// Load fixtures function (assuming it exists)
const loadFixture = (fixturePath: string) => {
	const fullPath = path.resolve(__dirname, '__fixtures__', fixturePath);
	return JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
};

// Use the base URL expected by nock from the errors, or use env var if set for tests
const TEST_BASE_URL = process.env.ATLASSIAN_BITBUCKET_SERVER_URL || 'http://example.com:7990';
const MOCK_API_BASE = `${TEST_BASE_URL}/rest/api/latest`;

describe('Atlassian Projects Service (with Mocked ProjectApi)', () => {
	let listFixture: GetProjects200Response;
	let getFixture: RestProject;

	beforeAll(() => {
		// Load Fixtures
		try {
			listFixture = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'listProjects.json'), 'utf-8'));
			getFixture = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'getProject.json'), 'utf-8'));
		} catch (error) {
			console.error('Error loading fixtures:', error);
			throw new Error('Could not load test fixtures.');
		}
	});

	beforeEach(() => {
		// Reset mocks before each test
		mockGetProjects.mockClear();
		mockGetProject.mockClear();
		// REMOVED: Clear mock for BitbucketClient static method
	});

	// REMOVED: nock beforeEach, afterEach, afterAll

	describe('listProjects', () => {
		it('should list projects successfully using mock data', async () => {
			mockGetProjects.mockResolvedValue(listFixture);

			const limit = 5;
			const result = await projectsService.listProjects({ limit });

			expect(mockGetProjects).toHaveBeenCalledWith({ limit });
			expect(result).toEqual(listFixture);
		});

		it('should handle pagination parameters', async () => {
			const limitedResponse = { 
				...listFixture, 
				size: 2, 
				isLastPage: true, 
				values: listFixture.values?.slice(0, 2) ?? [] 
			};
			mockGetProjects.mockResolvedValue(limitedResponse);

			const limit = 2;
			const start = 0;
			const result = await projectsService.listProjects({ limit, start });

			expect(mockGetProjects).toHaveBeenCalledWith({ limit, start });
			expect(result).toEqual(limitedResponse);
			expect(result.values?.length).toBeLessThanOrEqual(limit);
		});
	});

	describe('getProject', () => {
		it('should get project details successfully using mock data', async () => {
			mockGetProject.mockResolvedValue(getFixture);

			const result = await projectsService.getProject(testProjectKey);

			expect(mockGetProject).toHaveBeenCalledWith({ projectKey: testProjectKey });
			expect(result).toEqual(getFixture);
		});

		it('should throw McpError for non-existent project key', async () => {
			const nonExistentKey = 'NON-EXISTENT-PROJECT-KEY-12345';
			// Use ApiClientError now if that's what the middleware throws, or the original McpError if you catch/re-throw
			// Assuming middleware throws ApiClientError and service re-throws or it bubbles up
			// const error = new ApiClientError('Project not found', 404); // Example
			const error = new McpError('Project not found', ErrorType.NOT_FOUND, 404); // Original error type
			mockGetProject.mockRejectedValue(error);

			await expect(projectsService.getProject(nonExistentKey)).rejects.toThrow(
				error
			);
			expect(mockGetProject).toHaveBeenCalledWith({ projectKey: nonExistentKey });
		});

		it('should handle other API errors', async () => {
			// const error = new ApiClientError('Internal server error', 500); // Example
			const error = new McpError('Internal server error', ErrorType.API_ERROR, 500); // Original error type
			mockGetProject.mockRejectedValue(error);
			
			await expect(projectsService.getProject(testProjectKey)).rejects.toThrow(
				error
			);
			expect(mockGetProject).toHaveBeenCalledWith({ projectKey: testProjectKey });
		});
	});
});

// REMOVED: Second describe block 'AtlassianProjectsService Integration (Mocked)'
