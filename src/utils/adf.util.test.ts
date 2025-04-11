import { adfToMarkdown } from './adf.util';

describe('ADF Utility', () => {
	describe('adfToMarkdown', () => {
		it('should handle empty or undefined input', () => {
			expect(adfToMarkdown(null)).toBe('');
			expect(adfToMarkdown(undefined)).toBe('');
			expect(adfToMarkdown('')).toBe('');
		});

		it('should handle non-ADF string input', () => {
			expect(adfToMarkdown('plain text')).toBe('plain text');
		});

		it('should convert basic paragraph', () => {
			const adf = {
				type: 'doc',
				version: 1,
				content: [
					{
						type: 'paragraph',
						content: [
							{
								type: 'text',
								text: 'This is a paragraph',
							},
						],
					},
				],
			};

			expect(adfToMarkdown(adf)).toBe('This is a paragraph');
		});

		it('should convert multiple paragraphs', () => {
			const adf = {
				type: 'doc',
				version: 1,
				content: [
					{
						type: 'paragraph',
						content: [
							{
								type: 'text',
								text: 'First paragraph',
							},
						],
					},
					{
						type: 'paragraph',
						content: [
							{
								type: 'text',
								text: 'Second paragraph',
							},
						],
					},
				],
			};

			expect(adfToMarkdown(adf)).toBe(
				'First paragraph\n\nSecond paragraph',
			);
		});

		it('should convert headings', () => {
			const adf = {
				type: 'doc',
				version: 1,
				content: [
					{
						type: 'heading',
						attrs: { level: 1 },
						content: [
							{
								type: 'text',
								text: 'Heading 1',
							},
						],
					},
					{
						type: 'heading',
						attrs: { level: 2 },
						content: [
							{
								type: 'text',
								text: 'Heading 2',
							},
						],
					},
				],
			};

			expect(adfToMarkdown(adf)).toBe('# Heading 1\n\n## Heading 2');
		});

		it('should convert text with marks', () => {
			const adf = {
				type: 'doc',
				version: 1,
				content: [
					{
						type: 'paragraph',
						content: [
							{
								type: 'text',
								text: 'Bold',
								marks: [{ type: 'strong' }],
							},
							{
								type: 'text',
								text: ' and ',
							},
							{
								type: 'text',
								text: 'italic',
								marks: [{ type: 'em' }],
							},
							{
								type: 'text',
								text: ' and ',
							},
							{
								type: 'text',
								text: 'code',
								marks: [{ type: 'code' }],
							},
						],
					},
				],
			};

			expect(adfToMarkdown(adf)).toBe('**Bold** and *italic* and `code`');
		});

		it('should convert bullet lists', () => {
			const adf = {
				type: 'doc',
				version: 1,
				content: [
					{
						type: 'bulletList',
						content: [
							{
								type: 'listItem',
								content: [
									{
										type: 'paragraph',
										content: [
											{
												type: 'text',
												text: 'Item 1',
											},
										],
									},
								],
							},
							{
								type: 'listItem',
								content: [
									{
										type: 'paragraph',
										content: [
											{
												type: 'text',
												text: 'Item 2',
											},
										],
									},
								],
							},
						],
					},
				],
			};

			expect(adfToMarkdown(adf)).toBe('- Item 1\n- Item 2');
		});

		it('should convert code blocks', () => {
			const adf = {
				type: 'doc',
				version: 1,
				content: [
					{
						type: 'codeBlock',
						attrs: { language: 'javascript' },
						content: [
							{
								type: 'text',
								text: 'const x = 1;',
							},
						],
					},
				],
			};

			expect(adfToMarkdown(adf)).toBe('```javascript\nconst x = 1;\n```');
		});

		it('should convert links', () => {
			const adf = {
				type: 'doc',
				version: 1,
				content: [
					{
						type: 'paragraph',
						content: [
							{
								type: 'text',
								text: 'Visit',
							},
							{
								type: 'text',
								text: ' Atlassian',
								marks: [
									{
										type: 'link',
										attrs: {
											href: 'https://atlassian.com',
										},
									},
								],
							},
						],
					},
				],
			};

			expect(adfToMarkdown(adf)).toBe(
				'Visit[ Atlassian](https://atlassian.com)',
			);
		});
	});
});
