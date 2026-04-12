import { browser } from '$app/environment';

class UIStore {
	challengeView = $state<'normal' | 'sidebar'>('normal');

	constructor() {
		if (browser) {
			const saved = localStorage.getItem('challenge-view-preference');
			if (saved === 'normal' || saved === 'sidebar') {
				this.challengeView = saved;
			}
		}
	}

	setChallengeView(view: 'normal' | 'sidebar') {
		this.challengeView = view;
		if (browser) {
			localStorage.setItem('challenge-view-preference', view);
		}
	}
}

export const uiStore = new UIStore();
