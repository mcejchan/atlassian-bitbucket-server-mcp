import { InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { Logger } from '../../logger.util';
import { BitbucketInterceptor } from '../types.js';

const logger = Logger.forContext('utils/http/interceptors/logging.interceptor');

/**
 * Request interceptor handler for logging.
 */
export const logRequest = (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
	const methodLogger = logger.forMethod('logRequest');
	methodLogger.debug(`${config.method?.toUpperCase()} ${config.url}`);
	return config;
};

/**
 * Request interceptor error handler for logging.
 */
export const logRequestError = (error: any): Promise<never> => {
	logger.error('Request error:', error);
	return Promise.reject(error);
};

/**
 * Response interceptor handler for logging.
 */
export const logResponse = (response: AxiosResponse): AxiosResponse => {
	const methodLogger = logger.forMethod('logResponse');
	methodLogger.debug(
		`${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`,
	);
	return response;
};

/**
 * Response interceptor error handler for logging.
 */
export const logResponseError = (error: any): Promise<never> => {
	logger.error('Response error:', error);
	return Promise.reject(error);
};

export class LoggingInterceptor implements BitbucketInterceptor {
	onRequest(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
		return logRequest(config);
	}

	onResponse(response: AxiosResponse): AxiosResponse {
		return logResponse(response);
	}
}