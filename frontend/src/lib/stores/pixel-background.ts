import { writable } from 'svelte/store';

export type PixelBackgroundTheme = 'default' | 'finished' | 'mixed';

export interface PixelBackgroundConfig {
	opacity: number;
	overlayOpacity: number;
	blurAmount: number;
	edgeOverlayOpacity: number;
	darkEdgeOverlayOpacity: number;
	theme: PixelBackgroundTheme;
}

const { subscribe, set } = writable<Partial<PixelBackgroundConfig> | null>(null);

export const pixelBackgroundOverride = {
	subscribe
};

export function setPixelBackgroundOverride(config: Partial<PixelBackgroundConfig> | null) {
	set(config);
}

export function resetPixelBackgroundOverride() {
	set(null);
}
