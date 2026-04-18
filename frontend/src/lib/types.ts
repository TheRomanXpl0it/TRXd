export interface PaginatedResponse<T> {
	success: boolean;
	data: T[];
	pagination?: {
		next?: number;
		prev?: number;
		page?: number;
		per_page?: number;
		total?: number;
		pages?: number;
	};
}

export interface Badge {
	name: string;
	description: string;
}

export interface User {
	id: number;
	user_id?: number;
	name: string;
	username?: string;
	email?: string;
	image?: string;
	profileImage?: string;
	team_id?: number | null;
	role: 'User' | 'Admin' | 'Author';
	country?: string;
	joined_at?: string;
	solves?: Solve[]; // Stricter type
	badges?: Badge[];
	score?: number;
	total_category_challenges?: { category: string; count: number }[];
}

export interface Team {
	id: number;
	name: string;
	email?: string;
	country?: string;
	tags?: string[];
	captain_id?: number; // TODO
	members?: User[];
	solves?: Solve[]; // Stricter type
	badges?: Badge[];
	score?: number;
	role?: 'User' | 'Admin' | 'Author'; // Match User role enum exactly
	total_category_challenges?: { category: string; count: number }[];
}

export interface Category {
	id?: number;
	name: string;
	color?: string;
}

export interface Flag {
	flag: string;
	regex: boolean;
}

export interface Challenge {
	id: number;
	name: string;
	description: string;
	category: string;
	type: 'Container' | 'Compose' | 'Normal';
	score_type: 'Static' | 'Dynamic';
	points: number;
	max_points?: number;
	min_points?: number;
	initial_points?: number;
	decay?: number;

	// Metadata
	tags: string[];
	authors: string[];
	attachments?: string[];
	difficulty?: string;
	colors?: string[];

	// Host and connection info
	host?: string;
	port?: number;
	conn_type?: 'NONE' | 'TCP' | 'HTTP' | 'HTTPS';
	connection_info?: string;

	// Instance info
	instance: boolean;
	instance_host?: string | null;
	instance_port?: number | null;
	instance_hash_domain?: boolean;
	instance_renewable?: boolean;
	timeout?: number | null;
	image?: string;
	compose?: string;

	// Solve state
	solved?: boolean;
	solves?: number;
	solves_list?: Solve[];

	// Admin fields
	hidden?: boolean;
	flags?: Flag[];
	docker_config?: {
		image: string;
		compose: string;
		hash_domain: boolean;
		lifetime: number;
		renewable: boolean;
		envs: string;
		max_memory: number;
		max_cpu: string;
	};
}

export interface Solve {
	id: number;
	name: string;
	timestamp: string;
	// Optional context-specific fields
	user_id?: number;
	category?: string;
	points?: number;
	first_blood?: boolean;
}

export interface BaseResponse {
	success: boolean;
	message?: string;
	error?: string;
	errors?: string[];
}

export interface PasswordResetResponse extends BaseResponse {
	new_password?: string;
}

export interface SearchUsersResponse extends BaseResponse {
	users: User[];
}

export interface SearchTeamsResponse extends BaseResponse {
	teams: Team[];
}

export interface ApiError extends BaseResponse { }
