import { jest } from '@jest/globals';

// Import types
import type { GetProjectRequest, GetProjectsRequest } from '@generated/apis/ProjectApi';
import type { GetProjects200Response, RestProject } from '@generated/models';
import { ErrorType, McpError } from '../utils/error.util';

// Import the new fixture utility
import { loadJsonFixture } from '../utils/fixture.util';

// Define mock functions for API methods with explicit types
const mockGetProjects = jest.fn<(params: GetProjectsRequest) => Promise<GetProjects200Response>>();
const mockGetProject = jest.fn<(params: GetProjectRequest) => Promise<RestProject>>();

// Mock generated ProjectApi
jest.mock('../generated/src/apis/ProjectApi', () => {
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

// Now import the service - mocks will be applied
import { projectsService } from './atlassianProjectsService';

const testProjectKey = 'TESTPROJ';

describe('Atlassian Projects Service', () => {
	let listFixture: GetProjects200Response;
	let getFixture: RestProject;

	beforeAll(() => {
		// Load Fixtures using the new utility
		try {
			listFixture = loadJsonFixture<GetProjects200Response>('listProjects.json');
			getFixture = loadJsonFixture<RestProject>('getProject.json');
		} catch (error) {
			console.error('Error loading fixtures:', error);
			throw new Error('Could not load test fixtures.');
		}
	});

	beforeEach(() => {
		// Reset mocks before each test
		mockGetProjects.mockClear();
		mockGetProject.mockClear();
	});

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
