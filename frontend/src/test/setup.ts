import '@testing-library/jest-dom';
import { vi, afterEach } from 'vitest';
import { cleanup } from '@testing-library/svelte';

const originalConsoleWarn = console.warn.bind(console);
const originalConsoleError = console.error.bind(console);

function shouldSuppressSvelteDerivedInert(args: unknown[]) {
	return args.some(
		(arg) =>
			typeof arg === 'string' &&
			(arg.includes('[svelte] derived_inert') ||
				arg.includes('Reading a derived belonging to a now-destroyed effect') ||
				arg.includes('https://svelte.dev/e/derived_inert'))
	);
}

console.warn = (...args: Parameters<typeof console.warn>) => {
	if (shouldSuppressSvelteDerivedInert(args)) return;
	originalConsoleWarn(...args);
};

console.error = (...args: Parameters<typeof console.error>) => {
	if (shouldSuppressSvelteDerivedInert(args)) return;
	originalConsoleError(...args);
};

// Mock window.matchMedia for components that use media queries
Object.defineProperty(window, 'matchMedia', {
	writable: true,
	value: vi.fn().mockImplementation((query) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: vi.fn(), // deprecated
		removeListener: vi.fn(), // deprecated
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn()
	}))
});

// Mock ResizeObserver for components that use it (like virtual lists)
if (typeof global !== 'undefined') {
	global.ResizeObserver = class ResizeObserver {
		observe = vi.fn();
		unobserve = vi.fn();
		disconnect = vi.fn();
	};
}

if (typeof window !== 'undefined' && !HTMLElement.prototype.scrollIntoView) {
	HTMLElement.prototype.scrollIntoView = vi.fn();
}

// Bits UI releases pointer capture when opening a Select. JSDOM does not implement these APIs.
if (typeof window !== 'undefined' && !HTMLElement.prototype.hasPointerCapture) {
	HTMLElement.prototype.hasPointerCapture = () => false;
	HTMLElement.prototype.releasePointerCapture = () => {};
}

// Ensure each test starts with a clean DOM
afterEach(async () => {
	cleanup();
	// Allow any asynchronous cleanups (like bits-ui body-scroll-lock) to complete
	// before the JSDOM environment is torn down.
	await new Promise((resolve) => setTimeout(resolve, 50));
});
