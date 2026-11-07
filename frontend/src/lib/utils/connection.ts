type ConnectionType = 'TCP' | 'HTTP' | 'HTTPS' | string | null | undefined;

type FormatConnectionStringParams = {
	host?: string | null;
	port?: number | string | null;
	connType?: ConnectionType;
	sslWithoutPort?: boolean;
};

export function formatConnectionString({
	host,
	port,
	connType,
	sslWithoutPort = false
}: FormatConnectionStringParams): string {
	const trimmedHost = String(host ?? '').trim();
	if (!trimmedHost) return '';

	const normalizedConnType = String(connType ?? '').trim().toUpperCase();
	const rawPort = String(port ?? '').trim();
	const isDefaultPort =
		(normalizedConnType === 'HTTP' && rawPort === '80') ||
		(normalizedConnType === 'HTTPS' && rawPort === '443');
	const hasPort =
		rawPort !== '' && !isDefaultPort && (!/^\d+$/.test(rawPort) || Number(rawPort) > 0);
	const normalizedPort = hasPort ? rawPort : '';
	let str = normalizedPort ? `${trimmedHost}:${normalizedPort}` : trimmedHost;

	if (normalizedConnType === 'TCP') {
		if (sslWithoutPort && !hasPort) {
			return `ncat --ssl ${trimmedHost} 443`;
		}
		return hasPort ? `nc ${trimmedHost} ${normalizedPort}` : `nc ${trimmedHost}`;
	}

	if (normalizedConnType === 'HTTP') {
		const clean = str.replace(/:80(?=\/|$)/, '');
		return clean.startsWith('http') ? clean : `http://${clean}`;
	}

	if (normalizedConnType === 'HTTPS') {
		const clean = str.replace(/:443(?=\/|$)/, '');
		return clean.startsWith('http') ? clean : `https://${clean}`;
	}

	if (str.startsWith('http://')) {
		return str.replace(/:80(?=\/|$)/, '');
	}

	if (str.startsWith('https://')) {
		return str.replace(/:443(?=\/|$)/, '');
	}

	return str;
}
