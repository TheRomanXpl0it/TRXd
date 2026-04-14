import { api } from './api';

export async function startInstance(
	chall_id: number
): Promise<{ host: string; port: number; timeout: number }> {
	return api<{ host: string; port: number; timeout: number }>(`/instances`, {
		headers: { 'content-type': 'application/json' },
		method: 'POST',
		body: JSON.stringify({ chall_id })
	});
}

export async function stopInstance(chall_id: number): Promise<void> {
	return api<void>(`/instances`, {
		headers: { 'content-type': 'application/json' },
		method: 'DELETE',
		body: JSON.stringify({ chall_id })
	});
}

export async function getInstances(): Promise<any[]> {
	return api<any[]>('/instances', {
		method: 'GET'
	});
}

export async function adminStopInstance(teamId: number, challId: number): Promise<void> {
	return api<void>('/instances', {
		headers: { 'content-type': 'application/json' },
		method: 'DELETE',
		body: JSON.stringify({ team_id: teamId, chall_id: challId })
	});
}

export async function renewInstance(
	chall_id: number
): Promise<{ timeout: number }> {
	return api<{ timeout: number }>(`/instances`, {
		headers: { 'content-type': 'application/json' },
		method: 'PATCH',
		body: JSON.stringify({ chall_id })
	});
}
