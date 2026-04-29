import { marked } from 'marked';
import DOMPurify from 'dompurify';

marked.setOptions({
	breaks: true,
	gfm: true
});

export function renderMarkdown(markdown: string): string {
	if (!markdown) return '';

	const renderer = new marked.Renderer();
	const originalLink = renderer.link.bind(renderer);
	renderer.link = (token) => {
		const html = originalLink(token);
		if (token.href && token.href.startsWith('http')) {
			return html.replace('<a ', '<a target="_blank" rel="noopener noreferrer" ');
		}
		return html;
	};

	const result = marked.parse(markdown, { renderer, async: false });
	const rawHtml = (typeof result === 'string' ? result : '') as string;

	return DOMPurify.sanitize(rawHtml, {
		ALLOWED_TAGS: [
			'p',
			'br',
			'strong',
			'em',
			'u',
			's',
			'del',
			'ins',
			'h1',
			'h2',
			'h3',
			'h4',
			'h5',
			'h6',
			'ul',
			'ol',
			'li',
			'blockquote',
			'pre',
			'code',
			'a',
			'img',
			'table',
			'thead',
			'tbody',
			'tr',
			'th',
			'td',
			'hr',
			'sup',
			'sub'
		],
		ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'target', 'rel'],
		ALLOW_DATA_ATTR: false
	});
}

export function renderMarkdownInline(markdown: string): string {
	if (!markdown) return '';

	const html = renderMarkdown(markdown).trim();
	if (html.startsWith('<p>') && html.endsWith('</p>')) {
		const matches = html.match(/<p/g);
		if (matches && matches.length === 1) {
			return html.slice(3, -4);
		}
	}

	return html;
}
