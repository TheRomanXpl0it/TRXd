import { api } from '$lib/api';
import type {
	User,
	PaginatedResponse,
	BaseResponse,
	PasswordResetResponse,
	SearchUsersResponse
} from '$lib/types';
import { getTeamByEmail, getTeamByName } from '$lib/team';

import { authState } from '$lib/stores/auth';

function isUsersArrayResponse(response: SearchUsersResponse): response is { users: User[] } {
	return typeof response === 'object' && response !== null && 'users' in response;
}

function parseSearchUserResponse(response: SearchUsersResponse): User[] {
	if (Array.isArray(response)) {
		return response;
	}

	if (isUsersArrayResponse(response)) {
		return response.users ?? [];
	}

	return response ? [response] : [];
}

export async function getUsers(page = 1, limit = 20): Promise<PaginatedResponse<User>> {
	const offset = (page - 1) * limit;
	const isUserMode = authState.userMode;

	if (isUserMode) {
		const response = await api<{ total: number; teams: any[] }>(
			`/teams?offset=${offset}&limit=${limit}`
		);
		// Map teams to users structure
		const teams = response?.teams || [];
		const users = teams.map((t: any) => ({ ...t, role: t.role || 'User' }));
		return {
			success: true,
			data: users,
			pagination: {
				total: response.total,
				page,
				per_page: limit,
				pages: Math.ceil(response.total / limit)
			}
		};
	} else {
		const response = await api<{ total: number; users: User[] }>(
			`/users?offset=${offset}&limit=${limit}`
		);
		return {
			success: true,
			data: response?.users || [],
			pagination: {
				total: response.total,
				page,
				per_page: limit,
				pages: Math.ceil(response.total / limit)
			}
		};
	}
}

export async function getUserData(id: number, userMode = authState.userMode): Promise<User> {
	if (userMode) {
		const team = await api<any>(`/teams/${id}`);
		return { ...team, role: team.role || 'User' };
	} else {
		return api<User>(`/users/${id}`);
	}
}

export async function updateUser(id: number, name: string, country: string): Promise<BaseResponse> {
	return api<BaseResponse>(`/users`, {
		headers: { 'content-type': 'application/json' },
		method: 'PATCH',
		body: JSON.stringify({ id, name, country })
	});
}

export async function updateUserRole(userId: number, role: string): Promise<BaseResponse> {
	return api<BaseResponse>('/users/role', {
		headers: { 'content-type': 'application/json' },
		method: 'PATCH',
		body: JSON.stringify({ user_id: userId, new_role: role })
	});
}

export async function resetUserPassword(
	userId: number,
	newPassword?: string
): Promise<PasswordResetResponse> {
	const body: any = { user_id: userId };
	if (newPassword) body.new_password = newPassword;

	return api<PasswordResetResponse>('/users/password', {
		headers: { 'content-type': 'application/json' },
		method: 'PATCH',
		body: JSON.stringify(body)
	});
}

export async function getUserByEmail(email: string): Promise<User[]> {
	if (authState.userMode) {
		const teams = await getTeamByEmail(email);
		return teams.map((result) => ({ ...result, role: (result.role as any) || 'User' }) as User);
	}

	const response = await api<SearchUsersResponse>(`/users/search?email=${encodeURIComponent(email)}`);
	return parseSearchUserResponse(response);
}

export async function getUserByName(name: string): Promise<User[]> {
	if (authState.userMode) {
		const teams = await getTeamByName(name);
		return teams.map((result) => ({ ...result, role: (result.role as any) || 'User' }) as User);
	}

	const response = await api<SearchUsersResponse>(`/users/search?name=${encodeURIComponent(name)}`);
	return parseSearchUserResponse(response);
}
