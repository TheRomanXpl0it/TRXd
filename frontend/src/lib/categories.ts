import { api } from './api';

export function createCategory(name: string): Promise<any> {
	return api<any>(`/categories`, {
		headers: { 'content-type': 'application/json' },
		method: 'POST',
		body: JSON.stringify({ name })
	});
}

export function getCategories(): Promise<string[]> {
	return api<string[]>(`/categories`, {
		method: 'GET'
	});
}

export function deleteCategory(name: string): Promise<any> {
	return api<any>(`/categories`, {
		headers: { 'content-type': 'application/json' },
		method: 'DELETE',
		body: JSON.stringify({ name })
	});
}

export function updateCategory(name: string, new_name: string): Promise<any> {
	return api<any>(`/categories`, {
		headers: { 'content-type': 'application/json' },
		method: 'PATCH',
		body: JSON.stringify({ name, new_name })
	});
}
