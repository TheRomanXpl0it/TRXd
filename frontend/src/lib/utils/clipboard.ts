/**
 * Safely copies text to the clipboard using the modern Clipboard API if available,
 * with a fallback to document.execCommand('copy') for non-secure contexts.
 */
export async function copyToClipboard(text: string): Promise<void> {
	if (typeof window === 'undefined' || typeof document === 'undefined') return;

	console.log('[Clipboard] Attempting to copy text...');

	// Try the modern API first
	if (navigator?.clipboard?.writeText && window.isSecureContext) {
		try {
			await navigator.clipboard.writeText(text);
			console.log('[Clipboard] Successfully copied using navigator.clipboard');
			return;
		} catch (err) {
			console.warn('[Clipboard] navigator.clipboard failed, trying fallback:', err);
		}
	}

	// Fallback for non-secure contexts or failed API
	const textArea = document.createElement('textarea');
	textArea.value = text;

	// Avoid opacity: 0 and display: none as some browsers block copying from invisible elements
	textArea.style.position = 'fixed';
	textArea.style.left = '-9999px';
	textArea.style.top = '0';
	textArea.style.width = '2em';
	textArea.style.height = '2em';
	textArea.style.padding = '0';
	textArea.style.border = 'none';
	textArea.style.outline = 'none';
	textArea.style.boxShadow = 'none';
	textArea.style.background = 'transparent';

	document.body.appendChild(textArea);
	
	try {
		textArea.focus({ preventScroll: true });
		textArea.select();
		const successful = document.execCommand('copy');
		if (successful) {
			console.log('[Clipboard] Successfully copied using execCommand fallback');
		} else {
			throw new Error('document.execCommand("copy") returned false');
		}
	} catch (err) {
		console.error('[Clipboard] Fallback copy failed:', err);
		throw new Error('Failed to copy to clipboard');
	} finally {
		document.body.removeChild(textArea);
	}
}
