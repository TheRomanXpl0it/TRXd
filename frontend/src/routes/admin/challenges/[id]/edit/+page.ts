import { getChallenge } from '$lib/challenges';
import { error } from '@sveltejs/kit';

export async function load({ params }) {
	try {
		const challenge = await getChallenge(params.id);
		return { challenge };
	} catch (err) {
		throw error(404, 'Challenge not found');
	}
}
