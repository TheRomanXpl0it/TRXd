import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SITE_CONTENT_PATH = resolve(ROOT, 'static', 'site-content.json');
const APP_HTML_PATH = resolve(ROOT, 'src', 'app.html');
const TITLE_START = '\t\t<!-- app-title:start -->';
const TITLE_END = '\t\t<!-- app-title:end -->';
const FALLBACK_TITLE = 'TRXD';

function escapeHtml(value) {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

function readBrowserTitle() {
	try {
		const raw = JSON.parse(readFileSync(SITE_CONTENT_PATH, 'utf8'));
		const title = raw?.brand?.browserTitle;
		return typeof title === 'string' && title.trim() ? title.trim() : FALLBACK_TITLE;
	} catch {
		return FALLBACK_TITLE;
	}
}

function syncAppHtmlTitle() {
	const title = readBrowserTitle();
	const html = readFileSync(APP_HTML_PATH, 'utf8');
	const managedBlock = `${TITLE_START}\n\t\t<title>${escapeHtml(title)}</title>\n\t\t${TITLE_END}`;

	let nextHtml;
	if (html.includes(TITLE_START) && html.includes(TITLE_END)) {
		const blockPattern = new RegExp(
			`${TITLE_START.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}[\\s\\S]*?${TITLE_END.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}`
		);
		nextHtml = html.replace(blockPattern, managedBlock);
	} else {
		nextHtml = html.replace('\t\t%sveltekit.head%', `${managedBlock}\n\t\t%sveltekit.head%`);
	}

	if (nextHtml !== html) {
		writeFileSync(APP_HTML_PATH, nextHtml);
	}

	process.stdout.write(`Synced app title: ${title}\n`);
}

syncAppHtmlTitle();
