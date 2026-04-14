import { redirect } from '@sveltejs/kit';
import { joinTeamWithToken } from '$lib/team';
import type { PageLoad } from './$types';
import { toast } from 'svelte-sonner';

export const load: PageLoad = async ({ url }) => {
	const token = url.searchParams.get('token');

	if (!token) {
		throw redirect(302, '/teams');
	}

	return {
		token
	};
};
