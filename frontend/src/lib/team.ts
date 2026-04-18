import { api } from '$lib/api';
import type { Team, PaginatedResponse, BaseResponse, SearchTeamsResponse } from '$lib/types';

export async function getTeams(page = 1, limit = 20): Promise<PaginatedResponse<Team>> {
	const offset = (page - 1) * limit;
	const response = await api<{ total: number; teams: Team[] }>(
		`/teams?offset=${offset}&limit=${limit}`
	);
	return {
		success: true,
		data: response.teams,
		pagination: {
			total: response.total,
			page,
			per_page: limit,
			pages: Math.ceil(response.total / limit)
		}
	};
}

export async function getTeam(id: number): Promise<Team> {
	return api<Team>(`/teams/${id}`);
}

export async function joinTeam(name: string, password: string): Promise<BaseResponse> {
	return api<BaseResponse>(`/teams/join`, {
		headers: { 'content-type': 'application/json' },
		method: 'POST',
		body: JSON.stringify({ name, password })
	});
}

export async function createTeam(name: string, password: string): Promise<BaseResponse> {
	return api<BaseResponse>(`/teams/register`, {
		headers: { 'content-type': 'application/json' },
		method: 'POST',
		body: JSON.stringify({ name, password })
	});
}

export async function updateTeam(
	id: number,
	name: string,
	country: string,
	tags: string[] = []
): Promise<BaseResponse> {
	return api<BaseResponse>(`/teams`, {
		headers: { 'content-type': 'application/json' },
		method: 'PATCH',
		body: JSON.stringify({ id, name, country, tags })
	});
}

export async function resetTeamPassword(teamId: number, newPassword?: string): Promise<BaseResponse> {
	const body: any = { team_id: teamId };
	if (newPassword) body.new_password = newPassword;
	
	return api<BaseResponse>('/teams/password', {
		headers: { 'content-type': 'application/json' },
		method: 'PATCH',
		body: JSON.stringify(body)
	});
}

export async function getTeamInviteToken(): Promise<{ token: string }> {
	return api<{ token: string }>('/teams/join');
}

export async function joinTeamWithToken(token: string): Promise<BaseResponse> {
	return api<BaseResponse>(`/teams/join?token=${token}`);
}

export async function getTeamByEmail(email: string): Promise<Team | null> {
	const response = await api<SearchTeamsResponse>(`/teams/search?email=${encodeURIComponent(email)}`);
	return response.teams?.[0] || null;
}

export async function getTeamByName(name: string): Promise<Team | null> {
	const response = await api<SearchTeamsResponse>(`/teams/search?name=${encodeURIComponent(name)}`);
	return response.teams?.[0] || null;
}
