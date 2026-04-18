export const PENDING_SIGNUP_KEY = 'pending-signup';

export type PendingSignup = {
	email: string;
	name: string;
	password: string;
};

export function readPendingSignup(): PendingSignup | null {
	if (typeof window === 'undefined') return null;
	const raw = sessionStorage.getItem(PENDING_SIGNUP_KEY);
	if (!raw) return null;

	try {
		const parsed = JSON.parse(raw) as Partial<PendingSignup>;
		if (!parsed.email || !parsed.name || !parsed.password) return null;

		return {
			email: parsed.email,
			name: parsed.name,
			password: parsed.password
		};
	} catch {
		sessionStorage.removeItem(PENDING_SIGNUP_KEY);
		return null;
	}
}

export function savePendingSignup(data: PendingSignup) {
	if (typeof window === 'undefined') return;
	sessionStorage.setItem(PENDING_SIGNUP_KEY, JSON.stringify(data));
}

export function clearPendingSignup() {
	if (typeof window === 'undefined') return;
	sessionStorage.removeItem(PENDING_SIGNUP_KEY);
}
