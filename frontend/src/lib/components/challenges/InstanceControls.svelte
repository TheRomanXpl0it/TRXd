<script lang="ts">
	import { Container, X, Copy, ExternalLink, RefreshCw } from '@lucide/svelte';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import { toast } from 'svelte-sonner';
	import { stopInstance, startInstance } from '$lib/instances';
	import { fmtTimeLeft } from '$lib/utils/time';
	import { useQueryClient } from '@tanstack/svelte-query';
	import { Clock } from '@lucide/svelte';

	let {
		challenge,
		countdown = 0,
		onCountdownUpdate,
		onInstanceChange,
		hideHeader = false,
		showTimer = true
	}: {
		challenge: any;
		countdown?: number;
		onCountdownUpdate?: (id: string | number, newCountdown: number) => void;
		onInstanceChange?: (challenge?: any) => void;
		hideHeader?: boolean;
		showTimer?: boolean;
	} = $props();
	const queryClient = useQueryClient();

	let creatingInstance = $state(false);
	let destroyingInstance = $state(false);

	function copyToClipboard(text: string) {
		if (typeof navigator === 'undefined') return;
		navigator.clipboard
			.writeText(text)
			.then(() => toast.success('Copied to clipboard!'))
			.catch(() => toast.error('Failed to copy to clipboard.'));
	}

	async function createInstance() {
		if (creatingInstance || !challenge?.id) return;
		creatingInstance = true;
		try {
			const { host, port, timeout } = await startInstance(Number(challenge.id));
			const updated = {
				...challenge,
				instance_host: host,
				instance_port: port,
				timeout
			};

			// Update Global Cache
			queryClient.setQueryData(['challenges'], (old: any) => {
				if (!old || !old.data) return old;
				return {
					...old,
					data: old.data.map((c: any) => (c.id === challenge.id ? updated : c))
				};
			});

			if (typeof timeout === 'number' && onCountdownUpdate) {
				onCountdownUpdate(challenge.id, Math.max(0, timeout));
			}
			toast.success('Instance created!');
			onInstanceChange?.(updated);
		} catch (err: any) {
			console.error(err);
			toast.error(`Error: ${err?.message ?? err}`);
		} finally {
			creatingInstance = false;
		}
	}

	async function destroyInstance() {
		if (destroyingInstance || !challenge?.id) return;
		destroyingInstance = true;
		try {
			await stopInstance(Number(challenge.id));
			const updated = {
				...challenge,
				instance_host: null,
				instance_port: null,
				timeout: null
			};

			// Update Global Cache
			queryClient.setQueryData(['challenges'], (old: any) => {
				if (!old || !old.data) return old;
				return {
					...old,
					data: old.data.map((c: any) => (c.id === challenge.id ? updated : c))
				};
			});

			if (onCountdownUpdate) {
				onCountdownUpdate(challenge.id, 0);
			}
			toast.success('Instance stopped!');
			onInstanceChange?.(updated);
		} catch (err: any) {
			console.error(err);
			toast.error(`Error: ${err?.message ?? err}`);
		} finally {
			destroyingInstance = false;
		}
	}

	const connectionString = $derived.by(() => {
		// Only show connection info if we have an active instance OR it's a static challenge
		const hasInstance = challenge?.instance || !!challenge?.instance_host;
		const isDynamic = challenge?.type === 'Container' || challenge?.type === 'Compose';

		// If it's a dynamic challenge and we don't have an instance, show nothing
		if (isDynamic && !hasInstance) return '';

		const h = hasInstance
			? (challenge?.instance_host ?? challenge?.host ?? '')
			: (challenge?.host ?? '');
		const p = hasInstance ? challenge?.instance_port : challenge?.port;

		let str = p ? `${h}:${p}` : h;
		if (!str || ['localhost', '127.0.0.1', '0.0.0.0'].includes(h.toLowerCase().trim())) return '';

		const type = challenge?.conn_type;
		if (type === 'HTTP' && !str.startsWith('http')) {
			str = `http://${str}`;
		} else if (type === 'HTTPS' && !str.startsWith('http')) {
			str = `https://${str}`;
		} else if (type === 'TCP' || type === 'TCP_TLS') {
			if (type === 'TCP') {
				str = p ? `nc ${h} ${p}` : `nc ${h}`;
			} else {
				str = p ? `ncat --ssl ${h} ${p}` : `ncat --ssl ${h}`;
			}
		}

		return str;
	});

	function formatCountdown(seconds: number) {
		const h = Math.floor(seconds / 3600);
		const m = Math.floor((seconds % 3600) / 60);
		const s = seconds % 60;

		if (h > 0) {
			return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
		}
		return `${m}:${s.toString().padStart(2, '0')}`;
	}
</script>

<div class={hideHeader ? '' : 'mb-6'}>
	{#if !hideHeader}
		<h3 class="text-muted-foreground/70 mb-3 text-xs font-bold uppercase tracking-tight">
			Instance
		</h3>
	{/if}

	<div class="w-full">
		{#if countdown > 0}
			<div class="flex items-center gap-3">
				<!-- Primary Action Row -->
				<div class="flex flex-1 items-center gap-2">
					<!-- Connection Info (Green) -->
					<button
						class="flex h-11 flex-1 items-center justify-center gap-3 overflow-hidden rounded-lg bg-green-600 px-4 text-xs font-bold text-white shadow-sm transition-all hover:bg-green-700 active:scale-[0.99]"
						onclick={() => copyToClipboard(connectionString)}
						title="Click to copy connection address"
						aria-label="Copy instance connection address"
					>
						<Container class="size-4 shrink-0" />
						<code class="truncate font-mono text-sm font-bold tracking-tight">{connectionString}</code>
					</button>

					<!-- Terminate (Red) -->
					<button
						onclick={destroyInstance}
						disabled={destroyingInstance}
						class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-red-600 text-white shadow-sm transition-all hover:bg-red-700 active:scale-[0.95] disabled:opacity-50"
						title="Stop Instance"
					>
						{#if destroyingInstance}
							<Spinner class="h-4 w-4" />
						{:else}
							<X class="h-4 w-4" />
						{/if}
					</button>
				</div>

				<!-- Horizontal Timer -->
				{#if showTimer}
					<div
						class="flex shrink-0 items-center gap-1.5 border-l pl-3 font-mono text-sm font-black tabular-nums text-green-600 dark:text-green-500"
					>
						<Clock class="h-4 w-4" />
						<span>{formatCountdown(countdown)}</span>
					</div>
				{/if}
			</div>
		{:else}
			<!-- Idle State: Start Instance (Blue) -->
			<button
				onclick={createInstance}
				disabled={creatingInstance}
				class="flex h-12 w-full items-center justify-center gap-3 rounded-lg bg-blue-600 text-[11px] font-bold uppercase tracking-[0.1em] text-white shadow-sm transition-all hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50"
			>
				{#if creatingInstance}
					<Spinner class="h-4 w-4" />
					<span>Starting...</span>
				{:else}
					<Container class="h-4 w-4" />
					<span>Start Instance</span>
				{/if}
			</button>
		{/if}
	</div>
</div>
