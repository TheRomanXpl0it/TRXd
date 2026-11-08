/**
 * Format a countdown in seconds to a human-readable string.
 *   3661 → "1:01:01"
 *    125 → "2:05"
 *     45 → "45"
 */
export function fmtTimeLeft(total: number): string {
    if (!total || total < 0) total = 0;
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = Math.floor(total % 60);
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    if (m > 0) return `${m}:${String(s).padStart(2, '0')}`;
    return `${s}`;
}

/**
 * Format a timestamp into a short relative time string (e.g., "1h 5m ago", "2m ago", "15s ago", "2d 3h ago").
 */
export function formatTimeAgo(dateInput: string | number | Date, now: number = Date.now()): string {
    const timestamp = typeof dateInput === 'object' && dateInput instanceof Date
        ? dateInput.getTime()
        : new Date(dateInput).getTime();

    if (isNaN(timestamp)) return '';

    const diffSec = Math.floor((now - timestamp) / 1000);
    if (diffSec <= 0) return 'just now';
    if (diffSec < 60) return `${diffSec}s ago`;

    if (diffSec < 3600) {
        const m = Math.floor(diffSec / 60);
        return `${m}m ago`;
    }

    if (diffSec < 86400) {
        const h = Math.floor(diffSec / 3600);
        const m = Math.floor((diffSec % 3600) / 60);
        return m > 0 ? `${h}h ${m}m ago` : `${h}h ago`;
    }

    const d = Math.floor(diffSec / 86400);
    const h = Math.floor((diffSec % 86400) / 3600);
    return h > 0 ? `${d}d ${h}h ago` : `${d}d ago`;
}
