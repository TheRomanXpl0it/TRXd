import { browser } from '$app/environment';

class UIStore {
	challengeView = $state<'normal' | 'sidebar'>('normal');
	collapsedCategories = $state<string[]>([]);

	constructor() {
		if (browser) {
			const saved = localStorage.getItem('challenge-view-preference');
			if (saved === 'normal' || saved === 'sidebar') {
				this.challengeView = saved;
			}
			try {
				const savedCats = localStorage.getItem('collapsed-categories');
				if (savedCats) {
					const parsed = JSON.parse(savedCats);
					if (Array.isArray(parsed)) {
						this.collapsedCategories = parsed;
					}
				}
			} catch {
				// ignore parse errors
			}
		}
	}

	setChallengeView(view: 'normal' | 'sidebar') {
		this.challengeView = view;
		if (browser) {
			localStorage.setItem('challenge-view-preference', view);
		}
	}

	isCategoryCollapsed(category: string): boolean {
		return this.collapsedCategories.includes(category);
	}

	toggleCategory(category: string) {
		if (this.collapsedCategories.includes(category)) {
			this.collapsedCategories = this.collapsedCategories.filter((c) => c !== category);
		} else {
			this.collapsedCategories = [...this.collapsedCategories, category];
		}
		if (browser) {
			try {
				localStorage.setItem('collapsed-categories', JSON.stringify(this.collapsedCategories));
			} catch {
				// ignore storage errors
			}
		}
	}
}

export const uiStore = new UIStore();
