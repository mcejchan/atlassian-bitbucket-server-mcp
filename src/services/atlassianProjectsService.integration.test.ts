// Load environment variables first
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
// Remove nock import
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
import type { ProjectApi as ProjectApiType } from '@generated/apis/ProjectApi';
import type { Configuration as ConfigurationType } from '@generated/runtime';
import type { BitbucketClient as BitbucketClientType } from '../utils/http/bitbucket-client';

// Define mock functions for API methods
const mockGetProjects = jest.fn();
const mockGetProject = jest.fn();

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

// Mock BitbucketClient static method using factory function
jest.mock('../utils/http/bitbucket-client', () => {
	// Dynamically import the Configuration class needed for the mock return value
	const { Configuration } = jest.requireActual<typeof import('@generated/runtime')>('@generated/runtime');
	const mockBaseUrl = process.env.ATLASSIAN_BITBUCKET_SERVER_URL || 'https://mock-bitbucket.com';
	// Return a mock constructor/class with the mocked static method
	return {
		BitbucketClient: {
			getInstance: jest.fn().mockReturnValue({
				getGeneratedClientConfiguration: () => new Configuration({ basePath: mockBaseUrl }),
			})
		}
	};
});

// Now import the service - mocks will be applied
import { projectsService } from './atlassianProjectsService';

const testProjectKey = 'TESTPROJ';
const fixturesDir = path.resolve(__dirname, '__fixtures__');

describe('Atlassian Projects Service (with Mocked ProjectApi)', () => {
	let listFixture: GetProjects200Response;
	let getFixture: RestProject;
	// No longer need projectsServiceInstance, use the imported singleton

	beforeAll(() => {
		// Load Fixtures
		try {
			listFixture = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'listProjects.json'), 'utf-8'));
			getFixture = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'getProject.json'), 'utf-8'));
		} catch (error) {
			console.error('Error loading fixtures:', error);
			throw new Error('Could not load test fixtures.');
		}
		// No service instantiation needed here anymore
	});

	beforeEach(() => {
		// Reset mocks before each test
		mockGetProjects.mockClear();
		mockGetProject.mockClear();
		// Clear the mock static method calls if needed (optional)
		const ActualBitbucketClientModule = jest.requireActual<{ [key: string]: any }>('../utils/http/bitbucket-client');
		const ActualBitbucketClient = ActualBitbucketClientModule.BitbucketClient;
		if (ActualBitbucketClient && ActualBitbucketClient.getInstance && jest.isMockFunction(ActualBitbucketClient.getInstance)) {
			(ActualBitbucketClient.getInstance as jest.Mock).mockClear();
		}
	});

	/* // Nock cleanup no longer needed
	afterAll(() => {
		nock.cleanAll();
		nock.enableNetConnect();
	});

	afterEach(() => {
		nock.cleanAll(); // Clean mocks between tests
	});
	*/

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
			const error = new McpError('Project not found', ErrorType.NOT_FOUND, 404);
			mockGetProject.mockRejectedValue(error);

			await expect(projectsService.getProject(nonExistentKey)).rejects.toThrow(
				error
			);
			expect(mockGetProject).toHaveBeenCalledWith({ projectKey: nonExistentKey });
		});

		it('should handle other API errors', async () => {
			const error = new McpError('Internal server error', ErrorType.API_ERROR, 500);
			mockGetProject.mockRejectedValue(error);
			
			await expect(projectsService.getProject(testProjectKey)).rejects.toThrow(
				error
			);
			expect(mockGetProject).toHaveBeenCalledWith({ projectKey: testProjectKey });
		});
	});
});
