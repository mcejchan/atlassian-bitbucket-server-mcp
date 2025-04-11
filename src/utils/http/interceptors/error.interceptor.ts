import { AxiosError } from 'axios';
import { McpError, ErrorType } from '../../error.util.js';

export class ErrorInterceptor {
	onError(error: unknown): never {
		if (error instanceof AxiosError) {
			const status = error.response?.status;
			const message = error.response?.data?.error?.message || error.message;

			switch (status) {
				case 401:
					throw new McpError(message, ErrorType.AUTH_ERROR, 401, error);
				case 403:
					throw new McpError(message, ErrorType.FORBIDDEN, 403, error);
				case 404:
					throw new McpError(message, ErrorType.NOT_FOUND, 404, error);
				default:
					throw new McpError(message, ErrorType.API_ERROR, status || 500, error);
			}
		}

		if (error instanceof Error) {
			throw new McpError(error.message, ErrorType.UNEXPECTED_ERROR, 500, error);
		}

		throw new McpError('An unexpected error occurred', ErrorType.UNEXPECTED_ERROR, 500);
	}
} 