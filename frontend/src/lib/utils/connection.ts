type ConnectionType = 'NONE' | 'TCP' | 'HTTP' | 'HTTPS' | string | null | undefined;

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

	const rawPort = String(port ?? '').trim();
	const hasPort =
		rawPort !== '' && (!/^\d+$/.test(rawPort) || Number(rawPort) > 0);
	const normalizedPort = hasPort ? String(port).trim() : '';
	const str = hasPort ? `${trimmedHost}:${normalizedPort}` : trimmedHost;

	if (connType === 'TCP') {
		if (sslWithoutPort && !hasPort) {
			return `ncat --ssl ${trimmedHost} 443`;
		}
		return hasPort ? `nc ${trimmedHost} ${normalizedPort}` : `nc ${trimmedHost}`;
	}

	if (connType === 'HTTP' && !str.startsWith('http')) {
		return `http://${str}`;
	}

	if (connType === 'HTTPS' && !str.startsWith('http')) {
		return `https://${str}`;
	}

	return str;
}
