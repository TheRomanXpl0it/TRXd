import { api } from '$lib/api';

function normalizeSignupName(name: string): string {
	const value = name.trim().normalize('NFC');

	if (!value) {
		throw new Error('Invalid user name');
	}

	for (const ch of value) {
		if (ch === ' ') continue;

		if (/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u.test(ch)) {
			throw new Error('Invalid user name');
		}

		if (/\s/u.test(ch)) {
			throw new Error('Invalid user name');
		}
	}

	return value;
}

export async function getInfo(): Promise<any | null> {
	try {
		return await api<any>('/info');
	} catch {
		return null;
	}
}

export async function login(email: string, password: string): Promise<any> {
	return api<any>('/login', {
		headers: { 'content-type': 'application/json' },
		method: 'POST',
		body: JSON.stringify({ email, password })
	});
}

export async function register(email: string, password: string, name: string): Promise<void> {
	const normalizedName = normalizeSignupName(name);
	await api<void>('/register', {
		headers: { 'content-type': 'application/json' },
		method: 'POST',
		body: JSON.stringify({ email, password, name: normalizedName })
	});
}

export async function requestRegistrationVerification(email: string): Promise<void> {
	await api<void>('/register', {
		headers: { 'content-type': 'application/json' },
		method: 'POST',
		body: JSON.stringify({ email })
	});
}

export async function completeVerifiedRegistration(
	token: string,
	name: string,
	password: string
): Promise<void> {
	const normalizedName = normalizeSignupName(name);
	await api<void>('/register', {
		headers: { 'content-type': 'application/json' },
		method: 'POST',
		body: JSON.stringify({ token, name: normalizedName, password })
	});
}

export async function logout(): Promise<void> {
	await api<any>('/logout', { method: 'POST' });
}
