// Load environment variables first
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

const envPath = path.resolve(process.cwd(), '.env.test');
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

// Now import the NEW service after environment is loaded
import { projectsService } from './atlassianProjectsService';

// Use the types defined in the new service or adjust as needed
// For simplicity, we might rely on basic checks or use 'any' initially

describe('Atlassian Projects Service (Integration)', () => {
    let shouldSkip = false;

    beforeAll(() => {
        // Ensure we have the required environment variables
        // Use the variable names expected by the config/client (URL and TOKEN)
        if (!process.env.ATLASSIAN_BITBUCKET_SERVER_URL || 
            !process.env.ATLASSIAN_BITBUCKET_ACCESS_TOKEN) {
            console.warn(
                'Skipping integration tests: Requires ATLASSIAN_BITBUCKET_SERVER_URL and ATLASSIAN_BITBUCKET_ACCESS_TOKEN to be set in .env'
            );
            shouldSkip = true;
        }
    });

    describe('listProjects', () => {
        it('should list projects successfully', async () => {
            if (shouldSkip) return;

            const result = await projectsService.listProjects(); // Updated method call
            
            // Verify response structure
            expect(result).toBeDefined();
            expect(result.size).toBeGreaterThanOrEqual(0);
            expect(result.limit).toBeDefined();
            expect(result.isLastPage).toBeDefined();
            expect(Array.isArray(result.values)).toBe(true);
            
            // If we have projects, verify their structure
            if (result.values.length > 0) {
                const project = result.values[0];
                expect(project.key).toBeDefined();
                expect(project.name).toBeDefined();
                expect(project.id).toBeDefined();
                // Check type if it exists, otherwise skip
                // expect(project.type).toBeDefined(); 
                // expect(['NORMAL', 'PERSONAL']).toContain(project.type); 
                // Basic check for links structure
                expect(project.links?.self).toBeDefined(); 
                if (Array.isArray(project.links?.self)) {
                     expect(project.links.self[0]?.href).toBeDefined();
                }
            }
        });

        it('should support pagination', async () => {
            if (shouldSkip) return;

            const limit = 2;
            const result = await projectsService.listProjects({ limit }); // Updated method call
            
            expect(result.limit).toBe(limit);
            expect(result.values.length).toBeLessThanOrEqual(limit);
            expect(result.isLastPage !== undefined).toBe(true);
            
            if (!result.isLastPage) {
                expect(result.nextPageStart).toBeDefined();
            }
        });
    });

    describe('getProject', () => {
        let testProjectKey: string | undefined;

        beforeAll(async () => {
            if (!shouldSkip) {
                // Get a project key to test with
                try {
                    const projects = await projectsService.listProjects({ limit: 1 }); // Updated method call
                    if (projects.values.length > 0) {
                        testProjectKey = projects.values[0].key;
                        console.log(`Using project key for 'get' test: ${testProjectKey}`);
                    } else {
                         console.warn("Cannot run 'getProject' tests: No projects found via listProjects.");
                    }
                } catch (error) {
                     console.error('Error fetching project key for testing:', error);
                     // Prevent tests from running if we can't get a key
                     testProjectKey = undefined; 
                }
            }
        });

        it('should get project details successfully', async () => {
            if (shouldSkip || !testProjectKey) return;

            const result = await projectsService.getProject(testProjectKey); // Updated method call
            
            // Verify project structure
            expect(result).toBeDefined();
            expect(result.key).toBe(testProjectKey);
            expect(result.name).toBeDefined();
            expect(result.id).toBeDefined();
            // Check type if it exists
            // expect(result.type).toBeDefined();
            // expect(['NORMAL', 'PERSONAL']).toContain(result.type);
            expect(result.links?.self).toBeDefined();
            if (Array.isArray(result.links?.self)) {
                 expect(result.links.self[0]?.href).toBeDefined();
            }
            
            // Verify additional fields that should be present in detailed response
            expect(result.public !== undefined).toBe(true);
            if (result.description) {
                expect(typeof result.description).toBe('string');
            }
        });

        it('should handle non-existent project', async () => {
            if (shouldSkip) return;

            // Expect the promise to reject (might throw McpError or AxiosError)
            await expect(projectsService.getProject('NON-EXISTENT-PROJECT-KEY-12345')) // Updated method call
                .rejects
                .toThrow(); 
        });
    });

    // TODO: Add tests for create, update, delete once implemented
});
