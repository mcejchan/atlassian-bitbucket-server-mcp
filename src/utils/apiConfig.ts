import { Configuration, Middleware, RequestContext, ResponseContext } from '../generated/src/runtime';
import { Logger } from './logger.util';
import { config } from './config.util';

// Optional: Define a custom error class for API client errors
export class ApiClientError extends Error {
	constructor(message: string, public status?: number, public statusText?: string, public body?: any) {
		super(message);
		this.name = 'ApiClientError';
	}
}

/**
 * Creates a shared Configuration object for Bitbucket API clients.
 * Includes logging and error handling middleware.
 * Reads configuration from environment variables.
 * @returns {Configuration} The configured API client configuration.
 */
export function createBitbucketApiConfig(): Configuration {
	const middlewareLogger = Logger.forContext('ApiClientMiddleware');

	// Logging Middleware
	const loggingMiddleware: Middleware = {
		pre: async (context: RequestContext): Promise<void> => {
			middlewareLogger.debug(`=> ${context.init.method} ${context.url}`);
		},
		post: async (context: ResponseContext): Promise<void> => {
			// Log successful responses or errors handled by the error middleware
			if (context.response.ok) {
				middlewareLogger.debug(`<= ${context.response.status} ${context.response.statusText} | ${context.init.method} ${context.url}`);
			}
		}
	};

	// Auth Middleware - explicitly adds the Bearer token
	const authMiddleware: Middleware = {
		pre: async (context: RequestContext): Promise<void> => {
			// Try both environment variable names
			const token = process.env.ATLASSIAN_BITBUCKET_ACCESS_TOKEN || 
						  config.get('ATLASSIAN_BITBUCKET_ACCESS_TOKEN');
			
			if (token) {
				if (!context.init.headers) {
					context.init.headers = {};
				}
				// Explicitly set as a Record<string, string> to handle the headers
				const headers = context.init.headers as Record<string, string>;
				headers['Authorization'] = `Bearer ${token}`;
				middlewareLogger.debug('Added Bearer token authorization header');
			} else {
				middlewareLogger.warn('No authentication token found');
			}
		}
	};

	// Error Handling Middleware
	const errorHandlingMiddleware: Middleware = {
		post: async (context: ResponseContext): Promise<void> => {
			if (!context.response.ok) {
				let errorBodyText: string | undefined;
				try {
					// Clone the response to read the body without consuming it for the actual client
					errorBodyText = await context.response.clone().text();
				} catch (e) {
					middlewareLogger.warn('Failed to read error response body', e);
				}

				const errorMessage = `[${context.response.status} ${context.response.statusText}] ${context.init.method} ${context.url}`;
				middlewareLogger.error(`API Error: ${errorMessage}`, { body: errorBodyText });
                
				// Throw a custom error or a generic one
				throw new ApiClientError(
					errorMessage, 
					context.response.status, 
					context.response.statusText, 
					errorBodyText
				);
			}
		}
		// No 'pre' needed for this middleware
	};

	// Create configuration with environment variables and middleware
	const apiConfig = new Configuration({
		basePath: process.env.ATLASSIAN_BITBUCKET_SERVER_URL,
		// Don't set the token here, we'll add it in middleware
		// accessToken: process.env.BITBUCKET_SERVER_TOKEN,
		// IMPORTANT: Order matters. Auth first, then logging, then error handling
		middleware: [authMiddleware, loggingMiddleware, errorHandlingMiddleware] 
	});

	middlewareLogger.debug('API Configuration created with auth, logging and error handling middleware.');
	return apiConfig;
} 