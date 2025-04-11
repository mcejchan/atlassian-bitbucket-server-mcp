import { htmlToMarkdown } from './markdown.util';

describe('Markdown Utility', () => {
	describe('htmlToMarkdown', () => {
		it('should convert basic HTML to Markdown', () => {
			const html =
				'<h1>Hello World</h1><p>This is a <strong>test</strong>.</p>';
			const expected = '# Hello World\n\nThis is a **test**.';
			expect(htmlToMarkdown(html)).toBe(expected);
		});

		it('should handle empty input', () => {
			expect(htmlToMarkdown('')).toBe('');
			expect(htmlToMarkdown('   ')).toBe('');
		});

		it('should convert links correctly', () => {
			const html =
				'<p>Check out <a href="https://example.com">this link</a>.</p>';
			const expected = 'Check out [this link](https://example.com).';
			expect(htmlToMarkdown(html)).toBe(expected);
		});

		it('should convert lists correctly', () => {
			const html =
				'<ul><li>Item 1</li><li>Item 2</li><li>Item 3</li></ul>';
			const expected = '-   Item 1\n-   Item 2\n-   Item 3';
			expect(htmlToMarkdown(html)).toBe(expected);
		});

		it('should convert tables correctly', () => {
			const html = `
                <table>
                    <thead>
                        <tr>
                            <th>Header 1</th>
                            <th>Header 2</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Cell 1</td>
                            <td>Cell 2</td>
                        </tr>
                        <tr>
                            <td>Cell 3</td>
                            <td>Cell 4</td>
                        </tr>
                    </tbody>
                </table>
            `;
			const expected =
				'| Header 1 | Header 2 |\n| --- | --- |\n| Cell 1 | Cell 2 |\n| Cell 3 | Cell 4 |';

			// Normalize whitespace for comparison
			const normalizedResult = htmlToMarkdown(html)
				.replace(/\s+/g, ' ')
				.trim();
			const normalizedExpected = expected.replace(/\s+/g, ' ').trim();

			expect(normalizedResult).toBe(normalizedExpected);
		});

		it('should handle strikethrough text', () => {
			const html = '<p>This is <del>deleted</del> text.</p>';
			const expected = 'This is ~~deleted~~ text.';
			expect(htmlToMarkdown(html)).toBe(expected);
		});
	});
});
