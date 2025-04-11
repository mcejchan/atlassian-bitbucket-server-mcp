import { AxiosRequestConfig, AxiosResponse } from 'axios';

export interface BitbucketInterceptor {
    onRequest?(config: AxiosRequestConfig): Promise<AxiosRequestConfig> | AxiosRequestConfig;
    onResponse?(response: AxiosResponse): Promise<AxiosResponse> | AxiosResponse;
    onError?(error: unknown): Promise<never> | never;
} 