import { AxiosError } from 'axios';
import { Logger } from '../../logger.util';
import { McpError, ErrorType } from '../../error.util';

const logger = Logger.forContext('utils/http/interceptors/error.interceptor');

/**
 * Response error interceptor handler.
 */
export const handleErrorResponse = (error: any): Promise<never> => {
	const methodLogger = logger.forMethod('handleErrorResponse');
	methodLogger.error('API error:', error);

	if (error.response) {
		const status = error.response.status;
		// Bitbucket Server often puts detailed errors in response.data.errors array
		const detailedMessage = error.response.data?.errors?.[0]?.message;
		const generalMessage = error.response.data?.message; // Some endpoints might use this
		const fallbackMessage = error.message;

		const message = detailedMessage || generalMessage || fallbackMessage;

		switch (status) {
			case 401:
				return Promise.reject(
					new McpError(message, ErrorType.AUTH_INVALID, 401, error)
				);
			case 403:
				return Promise.reject(
					new McpError(message, ErrorType.FORBIDDEN, 403, error)
				);
			case 404:
				return Promise.reject(
					new McpError(message, ErrorType.NOT_FOUND, 404, error)
				);
			// Add cases for other specific errors if needed (e.g., 400, 409)
			default:
				return Promise.reject(
					new McpError(message, ErrorType.API_ERROR, status || 500, error)
				);
		}
	}

	// Handle non-HTTP errors (network issues, etc.)
	return Promise.reject(
		new McpError(
			error.message || 'Network error occurred', // Use error message if available
			ErrorType.REQUEST_ERROR,
			500,
			error
		),
	);
}; 