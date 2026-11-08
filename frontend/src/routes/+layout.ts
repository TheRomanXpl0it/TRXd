import { loadUser, authState } from '$lib/stores/auth';
import { siteContent } from '$lib/site-content';
import { get } from 'svelte/store';
import { redirect } from '@sveltejs/kit';

export const ssr = false; // Disable SSR since TRXd relies heavily on client-side state/API
export const prerender = false;

export async function load({ url }: { url: URL }) {
	try {
		// Let the user state initialize
		await loadUser(false);
	} catch {
		// Connection error during initial load, allow page to render without crashing root
	}

	// Alias / to /home if "No Landing Page" is enabled
	if (url.pathname === '/') {
		const $sc = get(siteContent);
		if ($sc.features.noLandingPage) {
			throw redirect(302, '/home');
		}
	}

	// Routes that are ONLY for guests (not logged in)
	const guestOnlyRoutes = ['/signIn', '/signUp', '/forgot', '/verify'];
	const isGuestOnlyRoute = guestOnlyRoutes.some((r) => url.pathname.startsWith(r));

	// Routes that are public for EVERYONE
	const publicRoutes = ['/', '/home', '/scoreboard', '/teams', '/users', '/404'];
	const isPublicRoute = publicRoutes.some((r) =>
		r === '/' ? url.pathname === '/' : url.pathname.startsWith(r)
	);

	// Let /admin pass through so admin/+layout.svelte can render 404 directly without crashing root load
	if (!authState.user && !isPublicRoute && !isGuestOnlyRoute && !url.pathname.startsWith('/admin')) {
		throw redirect(302, '/signIn');
	}

	if (authState.user && isGuestOnlyRoute) {
		throw redirect(302, '/challenges');
	}

	return {};
}
