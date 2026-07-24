import { api } from '$lib/api';
import type { Challenge, Category, Solve } from '$lib/types';

export async function getSolves(chall_id: string | number): Promise<Solve[]> {
	const ch = await api<any>(`/challenges/${chall_id}`);
	return ch.solves_list || [];
}

export async function getChallenges(): Promise<Challenge[]> {
	return api<Challenge[]>('/challenges');
}

export async function getChallenge(chall_id: string | number): Promise<Challenge> {
	return api<Challenge>(`/challenges/${chall_id}`);
}

export async function submitFlag(
	chall_id: string,
	flag: string
): Promise<{ status: string; first_blood?: boolean }> {
	return api<{ first_blood: boolean; status: string }>(`/submissions`, {
		headers: { 'content-type': 'application/json' },
		method: 'POST',
		body: JSON.stringify({ flag, chall_id })
	});
}

export async function getSubmissions(page = 1, limit = 50): Promise<any> {
	const offset = (page - 1) * limit;
	return api<any>(`/submissions?offset=${offset}&limit=${limit}`, {
		method: 'GET'
	});
}

export async function deleteSubmission(id: number | string): Promise<any> {
	return api<any>(`/submissions`, {
		headers: { 'content-type': 'application/json' },
		method: 'DELETE',
		body: JSON.stringify({ sub_id: Number(id) })
	});
}

export async function getCategories(): Promise<Category[]> {
	return api<Category[]>('/categories');
}

export async function createChallenge(
	name: string,
	category: string,
	description: string,
	instance_type: string,
	max_points: number,
	score_type: string
): Promise<any> {
	return api<any>('/challenges', {
		headers: { 'content-type': 'application/json' },
		method: 'POST',
		body: JSON.stringify({ name, category, description, instance_type, max_points, score_type })
	});
}

export async function deleteChallenge(chall_id: string): Promise<any> {
	return api<any>(`/challenges`, {
		headers: { 'content-type': 'application/json' },
		method: 'DELETE',
		body: JSON.stringify({ chall_id })
	});
}

export async function updateChallenge(data: any): Promise<any> {
	return api<any>(`/challenges`, {
		headers: { 'content-type': 'application/json' },
		method: 'PATCH',
		body: JSON.stringify(data)
	});
}

export async function uploadAttachments(fd: FormData): Promise<any> {
	return api<any>(`/attachments`, {
		method: 'POST',
		body: fd
	});
}

export async function deleteAttachments(chall_id: number, names: string[]): Promise<any> {
	return api<any>(`/attachments`, {
		headers: { 'content-type': 'application/json' },
		method: 'DELETE',
		body: JSON.stringify({ chall_id, names })
	});
}

export async function toggleChallengesHidden(challIds: number[]): Promise<void> {
	return api<void>('/challenges/hidden', {
		headers: { 'content-type': 'application/json' },
		method: 'PATCH',
		body: JSON.stringify({ chall_ids: challIds })
	});
}

export async function getAdminStats(): Promise<{
	total_users: number;
	total_players: number;
	total_teams: number;
	total_challenges: number;
	total_released_challenges: number;
	total_submissions: number;
	total_correct_submissions: number;
}> {
	return api('/stats');
}
