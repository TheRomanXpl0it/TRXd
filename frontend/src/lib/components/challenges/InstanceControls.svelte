<script lang="ts">
	import { Container, X, RefreshCw } from '@lucide/svelte';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import { toast } from 'svelte-sonner';
	import { stopInstance, startInstance, renewInstance } from '$lib/instances';
	import { useQueryClient } from '@tanstack/svelte-query';
	import { Clock } from '@lucide/svelte';
	import { formatConnectionString } from '$lib/utils/connection';
	import { updateChallengeCache } from '$lib/utils/challenge-cache';
	import { copyToClipboard as copy } from '$lib/utils/clipboard';

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
	let renewingInstance = $state(false);

	async function copyToClipboard(text: string) {
		try {
			await copy(text);
			toast.success('Copied to clipboard!');
		} catch (err) {
			toast.error('Failed to copy to clipboard.');
		}
	}

	function updateChallengeQueryCache(patch: Record<string, any>) {
		queryClient.setQueryData(['challenges'], (old: any) =>
			updateChallengeCache(old, challenge.id, patch)
		);
	}

	function usesHashDomain(ch: any) {
		return ch?.instance_hash_domain === true || ch?.hash_domain === true;
	}

	async function createInstance() {
		if (creatingInstance || !challenge?.id) return;
		creatingInstance = true;
		try {
			const { host, port, timeout, hash_domain, instance_renewable } = await startInstance(
				Number(challenge.id)
			);
			const instanceHashDomain = hash_domain ?? usesHashDomain(challenge);
			const patch = {
				instance_host: host,
				instance_port: port ?? null,
				instance_hash_domain: instanceHashDomain,
				timeout,
				instance_renewable
			};
			const updated = { ...challenge, ...patch };

			updateChallengeQueryCache(patch);

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
			const patch = {
				instance_host: null,
				instance_port: null,
				timeout: null
			};
			const updated = { ...challenge, ...patch };

			updateChallengeQueryCache(patch);

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

	async function renew() {
		if (renewingInstance || !challenge?.id) return;
		renewingInstance = true;
		try {
			const { timeout, instance_renewable } = await renewInstance(Number(challenge.id));
			const patch = {
				timeout,
				instance_renewable
			};
			const updated = { ...challenge, ...patch };

			updateChallengeQueryCache(patch);

			if (typeof timeout === 'number' && onCountdownUpdate) {
				onCountdownUpdate(challenge.id, Math.max(0, timeout));
			}
			toast.success('Instance renewed!');
			onInstanceChange?.(updated);
		} catch (err: any) {
			console.error(err);
			const msg = err && typeof err === 'object' && 'message' in err ? err.message : String(err);
			toast.error(`Error: ${msg}`);
		} finally {
			renewingInstance = false;
		}
	}

	const connectionString = $derived.by(() => {
		if (!challenge?.instance_host) return '';

		return formatConnectionString({
			host: challenge.instance_host,
			port: challenge.instance_port,
			connType: challenge.conn_type,
			sslWithoutPort: usesHashDomain(challenge)
		});
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
			<div class="flex flex-col gap-2 sm:flex-row sm:items-center">
				<button
					class="flex h-11 w-full min-w-0 items-center justify-center gap-3 overflow-hidden rounded-lg bg-green-600 px-4 text-xs font-bold text-white shadow-sm transition-all hover:bg-green-700 active:scale-[0.99] sm:flex-1"
					onclick={() => copyToClipboard(connectionString)}
					title="Click to copy connection address"
					aria-label="Copy instance connection address"
				>
					<Container class="size-4 shrink-0" />
					<code class="block max-w-full truncate font-mono text-sm font-bold tracking-tight"
						>{connectionString}</code
					>
				</button>

				<div class="flex shrink-0 items-center gap-2">
					{#if showTimer && (challenge?.instance_renewable ?? challenge?.renewable) !== false}
						<div
							class="bg-muted/40 border-border/60 flex h-11 flex-1 shrink-0 items-center gap-2 rounded-lg border px-3 text-green-600 sm:flex-none dark:text-green-500"
						>
							<button
								onclick={renew}
								disabled={renewingInstance}
								class="hover:text-green-700 disabled:opacity-50 dark:hover:text-green-400"
								title="Renew Instance"
							>
								{#if renewingInstance}
									<Spinner class="h-4 w-4" />
								{:else}
									<RefreshCw class="h-4 w-4" />
								{/if}
							</button>
							<div class="bg-border/70 h-5 w-px"></div>
							<div
								class="flex shrink-0 items-center gap-1.5 font-mono text-sm font-black tabular-nums"
							>
								<Clock class="h-4 w-4" />
								<span>{formatCountdown(countdown)}</span>
							</div>
						</div>
					{:else if showTimer}
						<div
							class="bg-muted/40 border-border/60 flex h-11 flex-1 shrink-0 items-center gap-3 rounded-lg border px-4 text-green-600 sm:flex-none dark:text-green-500"
						>
							<div
								class="flex shrink-0 items-center gap-1.5 font-mono text-sm font-black tabular-nums"
							>
								<Clock class="h-4 w-4" />
								<span>{formatCountdown(countdown)}</span>
							</div>
						</div>
					{/if}

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
