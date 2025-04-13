import { RestProject, RestRepository } from '@generated/models';
import { Logger } from './logger.util';

const logger = Logger.forContext('utils/markdownFormatters');

/**
 * Formats the links object into a Markdown list.
 * @param links Links object (typically from a Bitbucket REST resource).
 * @returns Formatted string.
 */
function formatLinksMarkdown(links?: any): string {
	if (!links || !links.self || !Array.isArray(links.self) || links.self.length === 0) {
		return '- N/A';
	}
	// Handle potential variations in link structure robustly
	const linkItems = links.self
		.map((link: any) => link?.href ? `- [Self](${link.href})` : null)
		.filter((item: string | null): item is string => item !== null); // Filter out nulls

	return linkItems.length > 0 ? linkItems.join('\n') : '- N/A';
}

/**
 * Formats project details into a Markdown string.
 * @param {RestProject} project The project object.
 * @param {string} title Optional title for the section.
 * @returns {string} Formatted Markdown string.
 */
export function formatProjectDetailsMarkdown(project: RestProject, title?: string): string {
	const details = [
		title ? `### ${title}` : '',
		`**ID:** ${project.id}`,
		`**Key:** ${project.key}`,
		`**Name:** ${project.name}`,
		`**Public:** ${project._public ? 'Yes' : 'No'}`, // Fixed: Use _public based on model
		`**Description:** ${project.description || 'N/A'}`,
		`**Type:** ${project.type || 'N/A'}`, 
		'**Links:**',
		formatLinksMarkdown(project.links), 
	].filter(Boolean).join('\n');
	return details;
}

/**
 * Formats repository details into a Markdown string.
 * @param {RestRepository} repo The repository object.
 * @param {string} title Optional title for the section.
 * @returns {string} Formatted Markdown string.
 */
export function formatRepositoryDetailsMarkdown(repo: RestRepository, title?: string): string {
	logger.debug(`Formatting repository details for: ${repo.slug}`);

	// Format origin repository if it exists
	let originMarkdown = 'N/A';
	if (repo.origin) {
		originMarkdown = `${repo.origin.name} (in project ${repo.origin.project?.key || 'N/A'})`;
	}

	// Format project details minimally
	let projectMarkdown = 'N/A';
	if (repo.project) {
		projectMarkdown = `${repo.project.name} (Key: ${repo.project.key})`;
	}

	// Safely access links
	const links = repo.links as any; 
	const sshLink = links?.clone?.find((l: any) => l.name === 'ssh')?.href || 'N/A';
	const httpLink = links?.clone?.find((l: any) => l.name === 'http')?.href || 'N/A';
	const selfLink = links?.self?.[0]?.href || 'N/A';

	const details = [
		title ? `### ${title}` : '',
		`**ID:** ${repo.id}`,
		`**Slug:** ${repo.slug}`,
		`**Name:** ${repo.name}`,
		`**SCM ID:** ${repo.scmId || 'N/A'}`,
		`**State:** ${repo.state || 'N/A'}`,
		`**Status Message:** ${repo.statusMessage || 'N/A'}`,
		`**Forkable:** ${repo.forkable ? 'Yes' : 'No'}`,
		`**Public:** ${repo._public !== undefined ? (repo._public ? 'Yes' : 'No') : 'N/A'}`, // Fixed: Use _public
		`**Origin:** ${originMarkdown}`,
		`**Project:** ${projectMarkdown}`,
		`**Links:**`,
		`  - Clone SSH: ${sshLink}`,
		`  - Clone HTTP: ${httpLink}`,
		`  - Self: ${selfLink}`,
	].filter(Boolean).join('\n');

	return details;
} 