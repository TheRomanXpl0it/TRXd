import { browser } from '$app/environment';

class UIStore {
	challengeView = $state<'normal' | 'sidebar'>('normal');
	collapsedCategories = $state<string[]>([]);
	collapsedAdminCategories = $state<string[]>([]);
	showAuthorTags = $state<boolean>(true);

	constructor() {
		if (browser) {
			const saved = localStorage.getItem('challenge-view-preference');
			if (saved === 'normal' || saved === 'sidebar') {
				this.challengeView = saved;
			}
			const savedAuthorTags = localStorage.getItem('show-author-tags');
			if (savedAuthorTags !== null) {
				this.showAuthorTags = savedAuthorTags === 'true';
			}
			this.collapsedCategories = this.loadList('collapsed-categories');
			this.collapsedAdminCategories = this.loadList('collapsed-admin-categories');
		}
	}

	private loadList(key: string): string[] {
		try {
			const saved = localStorage.getItem(key);
			if (saved) {
				const parsed = JSON.parse(saved);
				if (Array.isArray(parsed)) return parsed;
			}
		} catch {
			// ignore parse errors
		}
		return [];
	}

	private saveList(key: string, list: string[]) {
		if (browser) {
			try {
				localStorage.setItem(key, JSON.stringify(list));
			} catch {
				// ignore storage errors
			}
		}
	}

	setChallengeView(view: 'normal' | 'sidebar') {
		this.challengeView = view;
		if (browser) {
			localStorage.setItem('challenge-view-preference', view);
		}
	}

	toggleAuthorTags() {
		this.showAuthorTags = !this.showAuthorTags;
		if (browser) {
			localStorage.setItem('show-author-tags', String(this.showAuthorTags));
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
		this.saveList('collapsed-categories', this.collapsedCategories);
	}

	isAdminCategoryCollapsed(category: string): boolean {
		return this.collapsedAdminCategories.includes(category);
	}

	toggleAdminCategory(category: string) {
		if (this.collapsedAdminCategories.includes(category)) {
			this.collapsedAdminCategories = this.collapsedAdminCategories.filter((c) => c !== category);
		} else {
			this.collapsedAdminCategories = [...this.collapsedAdminCategories, category];
		}
		this.saveList('collapsed-admin-categories', this.collapsedAdminCategories);
	}
}

export const uiStore = new UIStore();
