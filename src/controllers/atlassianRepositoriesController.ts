import { Logger } from '../utils/logger.util';
import { repositoriesService } from '../services/atlassianRepositoriesService';
import { formatRepositoryDetailsMarkdown } from '../utils/markdownFormatters';
import { formatPagination } from '../utils/formatter.util';
import { createApiError } from '../utils/error.util';
import { RestRepository, RestCommit } from '../generated/src/models'; // Add necessary types

const controllerLogger = Logger.forContext('controllers/atlassianRepositoriesController.ts');

class AtlassianRepositoriesController {
	private readonly service = repositoriesService; // Use the singleton instance

	/**
     * List repositories for a project.
     */
	async list(options: { projectKey: string; limit?: number; start?: number }) {
		const methodLogger = controllerLogger.forMethod('list');
		methodLogger.debug('Listing repositories with options:', options);
		try {
			const result = await this.service.listRepositories(options.projectKey, { limit: options.limit, start: options.start });
			
			let content = `# Bitbucket Repositories in ${options.projectKey}\n\n`;
			if (!result.values?.length) {
				content += '_No repositories found._\n';
				return { content };
			}

			content += `Showing ${result.values.length} of ${result.size} repositories(s)\n\n`;
			content += result.values.map(repo => 
				formatRepositoryDetailsMarkdown(repo as RestRepository, undefined)
			).join('\n\n---\n\n'); 

			const count = result.size || result.values.length;
			const hasMore = !result.isLastPage;
			const nextCursor = result.nextPageStart?.toString();

			return {
				content,
				pagination: formatPagination(count, hasMore, nextCursor)
			};
		} catch (e) {
			const error = createApiError(`Error listing repositories for project ${options.projectKey}`, undefined, e);
			methodLogger.error(`Error listing repositories for project ${options.projectKey}: ${error.message}`);
			throw error;
		}
	}

	/**
     * Get details for a specific repository.
     */
	async get(options: { projectKey: string; repoSlug: string }) {
		const methodLogger = controllerLogger.forMethod('get');
		methodLogger.debug(`Getting repository: ${options.projectKey}/${options.repoSlug}`);
		try {
			const repo = await this.service.getRepository(options.projectKey, options.repoSlug);
			const content = formatRepositoryDetailsMarkdown(repo as RestRepository, `Repository: ${repo.name}`);
			return { content };
		} catch (e) {
			const error = createApiError(`Error getting repository ${options.projectKey}/${options.repoSlug}`, undefined, e);
			methodLogger.error(`Error getting repository ${options.projectKey}/${options.repoSlug}: ${error.message}`);
			throw error;
		}
	}

	/**
     * Get raw file content.
     */
	async getFileContent(options: { projectKey: string; repoSlug: string; filePath: string; atRef?: string }) {
		const methodLogger = controllerLogger.forMethod('getFileContent');
		methodLogger.debug(`Getting file content for ${options.filePath} in ${options.projectKey}/${options.repoSlug}`);
		try {
			const fileContent = await this.service.getFileContent(options.projectKey, options.repoSlug, options.filePath, options.atRef);
			// Basic formatting for raw content
			const content = `### File: ${options.filePath}\n\n\`\`\`\n${fileContent}\n\`\`\``;
			return { content };
		} catch (e) {
			const error = createApiError(`Error getting file content for ${options.filePath}`, undefined, e);
			methodLogger.error(`Error getting file content for ${options.filePath} in ${options.projectKey}/${options.repoSlug}: ${error.message}`);
			throw error;
		}
	}

	/**
	 * List branches for a repository.
	 */
	async listBranches(options: { projectKey: string; repoSlug: string; limit?: number; start?: number; filterText?: string; orderBy?: any }) {
		const methodLogger = controllerLogger.forMethod('listBranches');
		methodLogger.debug(`Listing branches for ${options.projectKey}/${options.repoSlug}`);
		try {
			const result = await this.service.listBranches(options.projectKey, options.repoSlug, {
				limit: options.limit,
				start: options.start,
				filterText: options.filterText,
				orderBy: options.orderBy
			});

			let content = `# Branches in ${options.projectKey}/${options.repoSlug}\n\n`;
			if (!result.values?.length) {
				content += '_No branches found._\n';
				return { content };
			}

			content += `Showing ${result.values.length} of ${result.size} branch(es)\n\n`;
			content += result.values.map((b: any) => 
				`- **${b.displayId}** (Latest: ${b.latestCommit ?? 'N/A'}, Default: ${b.isDefault ? 'Yes' : 'No'})`
			).join('\n');

			const count = result.size || result.values.length;
			const hasMore = !result.isLastPage;
			const nextCursor = result.nextPageStart?.toString();

			return {
				content,
				pagination: formatPagination(count, hasMore, nextCursor)
			};
		} catch (e) {
			const error = createApiError(`Error listing branches for ${options.projectKey}/${options.repoSlug}`, undefined, e);
			methodLogger.error(`Error listing branches for ${options.projectKey}/${options.repoSlug}: ${error.message}`);
			throw error;
		}
	}

	/**
     * Get default branch for a repository.
     */
	async getDefaultBranch(options: { projectKey: string; repoSlug: string }) {
		const methodLogger = controllerLogger.forMethod('getDefaultBranch');
		methodLogger.debug(`Getting default branch for ${options.projectKey}/${options.repoSlug}`);
		try {
			const branch = await this.service.getDefaultBranch(options.projectKey, options.repoSlug);
			// Cast branch as any to avoid TypeScript errors since the type definitions might not match the actual API response
			const branchData = branch as any;
			const content = `## Default Branch: ${branchData.displayId}\n\n- ID: ${branchData.id}\n- Latest Commit: ${branchData.latestCommit ?? 'N/A'}\n- Type: ${branchData.type ?? 'N/A'}`;
			return { content };
		} catch (e) {
			const error = createApiError(`Error getting default branch for ${options.projectKey}/${options.repoSlug}`, undefined, e);
			methodLogger.error(`Error getting default branch for ${options.projectKey}/${options.repoSlug}: ${error.message}`);
			throw error;
		}
	}

	/**
     * List commits for a repository.
     */
	async listCommits(options: { projectKey: string; repoSlug: string; limit?: number; start?: number; until?: string; path?: string; }) {
		const methodLogger = controllerLogger.forMethod('listCommits');
		methodLogger.debug(`Listing commits for ${options.projectKey}/${options.repoSlug}`);
		try {
			const result = await this.service.listCommits(options.projectKey, options.repoSlug, { 
				limit: options.limit, 
				start: options.start, 
				until: options.until, 
				path: options.path 
			});

			let content = `# Commits in ${options.projectKey}/${options.repoSlug}${options.until ? ' (Branch: ' + options.until + ')' : ''}${options.path ? ' (Path: ' + options.path + ')' : ''}\n\n`;
			if (!result.values?.length) {
				content += '_No commits found._\n';
				return { content };
			}

			content += `Showing ${result.values.length} of ${result.size} commit(s)\n\n`;
			content += result.values.map((c: RestCommit) => {
				const authorInfo = c.author ? `${c.author.name} <${c.author.emailAddress}>` : 'Unknown Author';
				return (
					`- **${c.displayId}** (${new Date(c.authorTimestamp ?? 0).toLocaleDateString()})\n  Author: ${authorInfo}\n  Message: ${c.message?.split('\n')[0]}`
				);
			}).join('\n---\n');

			const count = result.size || result.values.length;
			const hasMore = !result.isLastPage;
			const nextCursor = result.nextPageStart?.toString();

			return {
				content,
				pagination: formatPagination(count, hasMore, nextCursor)
			};
		} catch (e) {
			const error = createApiError(`Error listing commits for ${options.projectKey}/${options.repoSlug}`, undefined, e);
			methodLogger.error(`Error listing commits for ${options.projectKey}/${options.repoSlug}: ${error.message}`);
			throw error;
		}
	}

	/**
     * Get details for a specific commit.
     */
	async getCommit(options: { projectKey: string; repoSlug: string; commitId: string }) {
		const methodLogger = controllerLogger.forMethod('getCommit');
		methodLogger.debug(`Getting commit ${options.commitId} for ${options.projectKey}/${options.repoSlug}`);
		try {
			const c = await this.service.getCommit(options.projectKey, options.repoSlug, options.commitId);
			const authorInfo = c.author ? `${c.author.name} <${c.author.emailAddress}>` : 'Unknown Author';
			const committerInfo = c.committer ? `${c.committer.name} <${c.committer.emailAddress}>` : 'Unknown Committer';
			const content = 
`## Commit: ${c.displayId} (ID: ${c.id})\n\n**Author:** ${authorInfo}\n**Authored Date:** ${new Date(c.authorTimestamp ?? 0).toLocaleString()}\n**Committer:** ${committerInfo}\n**Committed Date:** ${new Date(c.committerTimestamp ?? 0).toLocaleString()}\n**Parents:** ${(c.parents || []).map(p => p.displayId).join(', ') || 'None'}\n\n**Message:**\n\n${c.message ?? 'N/A'}\n`;
			return { content };
		} catch (e) {
			const error = createApiError(`Error getting commit ${options.commitId}`, undefined, e);
			methodLogger.error(`Error getting commit ${options.commitId} for ${options.projectKey}/${options.repoSlug}: ${error.message}`);
			throw error;
		}
	}

	/**
     * List files/directories in a repository path.
     */
	async listFiles(options: { projectKey: string; repoSlug: string; at?: string; path?: string; limit?: number; start?: number; }) {
		const methodLogger = controllerLogger.forMethod('listFiles');
		methodLogger.debug(`Listing files for ${options.projectKey}/${options.repoSlug} at path ${options.path || '/'} (ref: ${options.at || 'default'})`);
		try {
			const result = await this.service.listFiles(options.projectKey, options.repoSlug, {
				at: options.at,
				path: options.path,
				limit: options.limit,
				start: options.start
			});

			let content = `# Files in ${options.projectKey}/${options.repoSlug}${options.path ? '/' + options.path : ''}${options.at ? ' (ref: ' + options.at + ')' : ''}\n\n`;
			if (!result.values?.length) {
				content += '_No files or directories found._\n';
				return { content };
			}

			content += `Showing ${result.values.length} of ${result.size} item(s)\n\n`;
			content += result.values.map((item: any) => {
				if (typeof item === 'string') return `- ${item}`;				return `- ${JSON.stringify(item)}`; // Fallback
			}).join('\n');

			const count = result.size || result.values.length;
			const hasMore = !result.isLastPage;
			const nextCursor = result.nextPageStart?.toString();

			return {
				content,
				pagination: formatPagination(count, hasMore, nextCursor)
			};
		} catch (e) {
			const error = createApiError(`Error listing files for ${options.projectKey}/${options.repoSlug}`, undefined, e);
			methodLogger.error(`Error listing files for ${options.projectKey}/${options.repoSlug}: ${error.message}`);
			throw error;
		}
	}
}

export const atlassianRepositoriesController = new AtlassianRepositoriesController(); 