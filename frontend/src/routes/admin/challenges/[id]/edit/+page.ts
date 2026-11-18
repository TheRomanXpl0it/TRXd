import { getChallenge } from '$lib/challenges';
import { error } from '@sveltejs/kit';

export async function load({ params }) {
	try {
		const challenge = await getChallenge(params.id);
		return { challenge };
	} catch (err: any) {
		const status = typeof err?.status === 'number' && err.status >= 400 ? err.status : 500;
		const message =
			status === 404 ? 'Challenge not found' : err?.message || 'Failed to load challenge';
		throw error(status, message);
	}
}
