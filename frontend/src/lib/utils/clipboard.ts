/**
 * Safely copies text to the clipboard using the modern Clipboard API if available,
 * with a fallback to document.execCommand('copy') for non-secure contexts.
 */
export async function copyToClipboard(text: string): Promise<void> {
	if (typeof window === 'undefined' || typeof document === 'undefined') return;

	if (navigator.clipboard && window.isSecureContext) {
		try {
			await navigator.clipboard.writeText(text);
			return;
		} catch (err) {
			console.error('Clipboard API failed, falling back', err);
		}
	}

	// Fallback for non-secure contexts or failed API
	const textArea = document.createElement('textarea');
	textArea.value = text;

	// Ensure it's not visible or interfering with the UI
	textArea.style.position = 'fixed';
	textArea.style.left = '-9999px';
	textArea.style.top = '0';
	textArea.style.opacity = '0';
	textArea.style.pointerEvents = 'none';
	document.body.appendChild(textArea);

	textArea.focus();
	textArea.select();

	try {
		const successful = document.execCommand('copy');
		if (!successful) {
			throw new Error('execCommand failed');
		}
	} catch (err) {
		console.error('Fallback clipboard copy failed', err);
		throw new Error('Failed to copy to clipboard');
	} finally {
		textArea.remove();
	}
}
