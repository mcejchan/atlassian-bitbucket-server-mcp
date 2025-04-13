/**
 * Markdown utility functions for converting HTML to Markdown
 * Uses Turndown library for HTML to Markdown conversion
 *
 * @see https://github.com/mixmark-io/turndown
 */

import TurndownService from 'turndown';
import { Logger } from './logger.util';

// Create a file-level logger for the module
const markdownLogger = Logger.forContext('utils/markdown.util.ts');

// Create a singleton instance of TurndownService with default options
const turndownService = new TurndownService({
	headingStyle: 'atx', // Use # style headings
	bulletListMarker: '-', // Use - for bullet lists
	codeBlockStyle: 'fenced', // Use ``` for code blocks
	emDelimiter: '_', // Use _ for emphasis
	strongDelimiter: '**', // Use ** for strong
	linkStyle: 'inlined', // Use [text](url) for links
	linkReferenceStyle: 'full', // Use [text][id] + [id]: url for reference links
});

// Add custom rule for strikethrough
turndownService.addRule('strikethrough', {
	// Let TypeScript infer the node type, or use any if needed
	filter: (node) => {
		const nodeName = node.nodeName?.toLowerCase();
		return (
			nodeName === 'del' ||
			nodeName === 's' ||
			nodeName === 'strike'
		);
	},
	replacement: (content: string): string => `~~${content}~~`,
});

// Add custom rule for tables to improve table formatting
turndownService.addRule('tableCell', {
	filter: ['th', 'td'],
	replacement: (content: string, _node: TurndownService.Node): string => {
		return ` ${content} |`;
	},
});

turndownService.addRule('tableRow', {
	filter: 'tr',
	replacement: (content: string, node: TurndownService.Node): string => {
		let output = `|${content}\n`;

		// If this is the first row in a table head, add the header separator row
		if (
			node.parentNode &&
			'tagName' in node.parentNode &&
			node.parentNode.tagName === 'THEAD'
		) {
			const cellCount = node.childNodes.length;
			output += '|' + ' --- |'.repeat(cellCount) + '\n';
		}

		return output;
	},
});

/**
 * Convert HTML content to Markdown
 *
 * @param html - The HTML content to convert
 * @returns The converted Markdown content
 */
export function htmlToMarkdown(html: string): string {
	if (!html || html.trim() === '') {
		return '';
	}

	try {
		const markdown = turndownService.turndown(html);
		return markdown;
	} catch (error) {
		markdownLogger.error('Error converting HTML to Markdown:', error);
		// Return the original HTML if conversion fails
		return html;
	}
}
