import { InternalAxiosRequestConfig } from 'axios';
import { Logger } from '../../logger.util';
import { config } from '../../config.util';

const logger = Logger.forContext('utils/http/interceptors/auth.interceptor');

/**
 * Request interceptor handler to add Authorization header.
 */
export const addAuthHeader = (requestConfig: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
	const methodLogger = logger.forMethod('addAuthHeader');

	// --- Bearer Token Auth (Priority 1) ---
	const token = config.get('ATLASSIAN_BITBUCKET_ACCESS_TOKEN');
	if (token) {
		if (requestConfig.headers) {
			requestConfig.headers.Authorization = `Bearer ${token}`;
			methodLogger.debug('Added Bearer token authorization header.');
		}
		return requestConfig; // Use token auth and proceed
	}

	// --- Basic Auth (Fallback - Priority 2) ---
	methodLogger.debug('Bearer token not found, attempting Basic auth.');
	const username = config.get('ATLASSIAN_BITBUCKET_USERNAME');
	const password = config.get('ATLASSIAN_BITBUCKET_PASSWORD');

	if (username && password) {
		const auth = Buffer.from(`${username}:${password}`).toString('base64');
		if (requestConfig.headers) {
			requestConfig.headers.Authorization = `Basic ${auth}`;
			methodLogger.debug('Added Basic auth header using username/password.');
		}
	} else {
		// --- No Credentials ---
		methodLogger.warn('No suitable authentication credentials (Bearer token or Basic auth username/password) were found in config.');
	}

	return requestConfig;
};

/**
 * Request interceptor error handler (optional, simple rethrow for now).
 */
export const handleAuthError = (error: any): Promise<never> => {
	logger.error('Auth interceptor error:', error);
	return Promise.reject(error);
}; 