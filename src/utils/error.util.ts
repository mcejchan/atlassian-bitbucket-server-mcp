import { Logger } from './logger.util';

/**
 * Error types for classification
 */
export enum ErrorType {
	AUTH_ERROR = 'AUTH_ERROR',
	AUTH_MISSING = 'AUTH_MISSING',
	AUTH_INVALID = 'AUTH_INVALID',
	FORBIDDEN = 'FORBIDDEN',
	NOT_FOUND = 'NOT_FOUND',
	API_ERROR = 'API_ERROR',
	CONFIG_ERROR = 'CONFIG_ERROR',
	VALIDATION_ERROR = 'VALIDATION_ERROR',
	REQUEST_ERROR = 'REQUEST_ERROR',
	UNEXPECTED_ERROR = 'UNEXPECTED_ERROR'
}

/**
 * Custom error class with type classification
 */
export class McpError extends Error {
	public readonly type: ErrorType;
	public readonly statusCode: number;
	public readonly originalError?: unknown;

	constructor(
		message: string,
		type: ErrorType,
		statusCode: number,
		originalError?: unknown,
	) {
		super(message);
		this.name = 'McpError';
		this.type = type;
		this.statusCode = statusCode;
		this.originalError = originalError;
	}
}

/**
 * Create an authentication missing error
 */
export function createAuthMissingError(
	message: string = 'Authentication credentials are missing',
): McpError {
	return new McpError(message, ErrorType.AUTH_MISSING, 401);
}

/**
 * Create an authentication invalid error
 */
export function createAuthInvalidError(
	message: string = 'Authentication credentials are invalid',
): McpError {
	return new McpError(message, ErrorType.AUTH_INVALID, 401);
}

/**
 * Create an API error
 */
export function createApiError(
	message: string,
	statusCode?: number,
	originalError?: unknown,
): McpError {
	return new McpError(
		message,
		ErrorType.API_ERROR,
		statusCode ?? 500,
		originalError,
	);
}

/**
 * Create an unexpected error
 */
export function createUnexpectedError(
	error: unknown,
): McpError {
	const message = error instanceof Error ? error.message : String(error);
	return new McpError(message, ErrorType.UNEXPECTED_ERROR, 500, error);
}

/**
 * Ensure an error is an McpError
 */
export function ensureMcpError(error: unknown): McpError {
	if (error instanceof McpError) {
		return error;
	}

	if (error instanceof Error) {
		return createUnexpectedError(error);
	}

	return createUnexpectedError(String(error));
}

/**
 * Format error for MCP tool response
 */
export function formatErrorForMcpTool(error: unknown): {
	content: Array<{ type: 'text'; text: string }>;
} {
	const methodLogger = Logger.forContext(
		'utils/error.util.ts',
		'formatErrorForMcpTool',
	);
	const mcpError = ensureMcpError(error);

	methodLogger.error(`${mcpError.type} error`, mcpError);

	return {
		content: [
			{
				type: 'text' as const,
				text: `Error: ${mcpError.message}`,
			},
		],
	};
}

/**
 * Format error for MCP resource response
 */
export function formatErrorForMcpResource(
	error: unknown,
	uri: string,
): {
	contents: Array<{
		uri: string;
		text: string;
		mimeType: string;
		description?: string;
	}>;
} {
	const methodLogger = Logger.forContext(
		'utils/error.util.ts',
		'formatErrorForMcpResource',
	);
	const mcpError = ensureMcpError(error);

	methodLogger.error(`${mcpError.type} error`, mcpError);

	return {
		contents: [
			{
				uri,
				text: `Error: ${mcpError.message}`,
				mimeType: 'text/plain',
				description: `Error: ${mcpError.type}`,
			},
		],
	};
}

/**
 * Handle error in CLI context
 * @param error The error to handle
 * @param source Optional source information for better error messages
 */
export function handleCliError(error: unknown, source?: string): never {
	const methodLogger = Logger.forContext(
		'utils/error.util.ts',
		'handleCliError',
	);
	const mcpError = ensureMcpError(error);

	// Log detailed information at different levels based on error type
	if (mcpError.statusCode && mcpError.statusCode >= 500) {
		methodLogger.error(`${mcpError.type} error occurred`, {
			message: mcpError.message,
			statusCode: mcpError.statusCode,
			source,
			stack: mcpError.stack,
		});
	} else {
		methodLogger.warn(`${mcpError.type} error occurred`, {
			message: mcpError.message,
			statusCode: mcpError.statusCode,
			source,
		});
	}

	// Log additional debug information if DEBUG is enabled
	methodLogger.debug('Error details', {
		type: mcpError.type,
		statusCode: mcpError.statusCode,
		originalError: mcpError.originalError,
		stack: mcpError.stack,
	});

	// Display user-friendly message to console
	console.error(`Error: ${mcpError.message}`);
	process.exit(1);
}

export function createNotFoundError(message: string): McpError {
	return new McpError(message, ErrorType.NOT_FOUND, 404);
}

export function createAuthError(message: string): McpError {
	return new McpError(message, ErrorType.AUTH_ERROR, 401);
}

export function createForbiddenError(message: string): McpError {
	return new McpError(message, ErrorType.FORBIDDEN, 403);
}

export function createRequestError(message: string, originalError?: unknown): McpError {
	return new McpError(message, ErrorType.REQUEST_ERROR, 500, originalError);
}

export function createValidationError(message: string): McpError {
	return new McpError(message, ErrorType.VALIDATION_ERROR, 400);
}

export function createConfigError(message: string): McpError {
	return new McpError(message, ErrorType.CONFIG_ERROR, 500);
}
