/// <reference types="vite/client" />

declare module '@sveltejs/svelte-virtual-list' {
	import { SvelteComponent } from 'svelte';
	export default class VirtualList extends SvelteComponent<{
		items: any[];
		height?: string;
		itemHeight?: number;
		[key: string]: any;
	}> {}
}

declare global {
	const __BACKEND_URL__: string;
	const __GIT_HASH__: string;
}

interface ImportMetaEnv {
	readonly VITE_BACKEND_URL: string;
	readonly VITE_PUBLIC_URL: string;
	readonly VITE_API_BASE: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
