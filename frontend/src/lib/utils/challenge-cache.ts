import type { Challenge, PaginatedResponse } from '$lib/types';

type ChallengeCache = Challenge[] | PaginatedResponse<Challenge> | null | undefined;

export function updateChallengeCache(
	cache: ChallengeCache,
	challengeId: number | string,
	patch: Partial<Challenge>
): ChallengeCache {
	const mergeChallenge = (challenge: Challenge) =>
		String(challenge.id) === String(challengeId) ? { ...challenge, ...patch } : challenge;

	if (Array.isArray(cache)) {
		return cache.map(mergeChallenge);
	}

	if (cache && Array.isArray(cache.data)) {
		return {
			...cache,
			data: cache.data.map(mergeChallenge)
		};
	}

	return cache;
}
