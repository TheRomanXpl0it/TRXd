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

// Bits UI schedules a 24ms setTimeout on body-scroll-lock cleanup that can fire after JSDOM teardown.
const fallbackDoc = {
	body: {
		setAttribute: () => {},
		style: { removeProperty: () => {} }
	}
};
let activeDoc: any = typeof document !== 'undefined' ? document : fallbackDoc;
try {
	Object.defineProperty(globalThis, 'document', {
		get: () => activeDoc ?? fallbackDoc,
		set: (d) => {
			activeDoc = d;
		},
		configurable: true
	});
} catch {
	// ignore if cannot redefine
}

// Polyfill localStorage for Node/JSDOM test environment
const storageMap = new Map<string, string>();
const localStorageMock = {
	getItem: (key: string) => storageMap.get(key) ?? null,
	setItem: (key: string, value: string) => { storageMap.set(key, String(value)); },
	removeItem: (key: string) => { storageMap.delete(key); },
	clear: () => { storageMap.clear(); },
	get length() { return storageMap.size; },
	key: (index: number) => Array.from(storageMap.keys())[index] ?? null
};
try {
	Object.defineProperty(globalThis, 'localStorage', {
		value: localStorageMock,
		writable: true,
		configurable: true
	});
	if (typeof window !== 'undefined') {
		Object.defineProperty(window, 'localStorage', {
			value: localStorageMock,
			writable: true,
			configurable: true
		});
	}
} catch {
	// ignore if cannot redefine
}

// Ensure each test starts with a clean DOM
afterEach(() => {
	cleanup();
});
