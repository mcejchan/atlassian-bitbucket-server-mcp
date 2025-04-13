import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { Logger } from '../../logger.util.js';
import { BitbucketInterceptor } from '../types.js';

export class LoggingInterceptor implements BitbucketInterceptor {
	private readonly logger = Logger.forContext('utils/http/interceptors/logging');

	onRequest(config: AxiosRequestConfig): AxiosRequestConfig {
		this.logger.debug(`Request: ${config.method?.toUpperCase()} ${config.url}`);
		return config;
	}

	onResponse(response: AxiosResponse): AxiosResponse {
		this.logger.debug(`Response: ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`);
		return response;
	}
}