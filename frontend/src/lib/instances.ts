import { api } from './api';

type StartInstanceResponse = {
	host: string;
	port?: number | null;
	timeout: number;
	hash_domain?: boolean;
	instance_renewable?: boolean;
};

type RenewInstanceResponse = {
	timeout: number;
	instance_renewable?: boolean;
};

export async function startInstance(chall_id: number): Promise<StartInstanceResponse> {
	return api<StartInstanceResponse>(`/instances`, {
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

export async function renewInstance(chall_id: number): Promise<RenewInstanceResponse> {
	return api<RenewInstanceResponse>(`/instances`, {
		headers: { 'content-type': 'application/json' },
		method: 'PATCH',
		body: JSON.stringify({ chall_id })
	});
}
