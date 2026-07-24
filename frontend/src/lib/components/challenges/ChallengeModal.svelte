<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Button } from '@/components/ui/button';
	import { Download, Droplet, Info, Pen, Trash2, Trophy, UserCog } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import InstanceControls from './InstanceControls.svelte';
	import FlagSubmission from './FlagSubmission.svelte';
	import ChallengeSolvesTable from './ChallengeSolvesTable.svelte';
	import Markdown from '$lib/components/Markdown.svelte';
	import { getSolves } from '$lib/challenges';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import { formatConnectionString } from '$lib/utils/connection';
	import { copyToClipboard as copy } from '$lib/utils/clipboard';
	import type { Solve } from '$lib/types';

	let {
		open = $bindable(false),
		challenge = $bindable(),
		countdown = 0,
		isAdmin = false,
		canEdit = false,
		submissionsClosed = false,
		onEdit,
		onDelete,
		onSolved,
		onCountdownUpdate,
		onInstanceChange
	}: {
		open: boolean;
		challenge: any;
		countdown?: number;
		isAdmin?: boolean;
		canEdit?: boolean;
		submissionsClosed?: boolean;
		onEdit?: (challenge: any) => void;
		onDelete?: (challenge: any) => void;
		onSolved?: () => void;
		onCountdownUpdate?: (id: string | number, newCountdown: number) => void;
		onInstanceChange?: (challenge?: any) => void;
	} = $props();

	let activeTab = $state<'details' | 'solves'>('details');
	let solves = $state<Solve[]>([]);
	let loadingSolves = $state(false);
	let solvesError = $state<string | null>(null);
	let loadedSolvesChallengeId = $state<number | null>(null);
	let lastChallengeId = $state<number | null>(null);
	let solvesRequestId = 0;

	async function loadSolves(id: number) {
		const requestId = ++solvesRequestId;
		loadingSolves = true;
		solvesError = null;

		try {
			const data = await getSolves(id);
			if (requestId === solvesRequestId && open && challenge?.id === id) {
				solves = data ?? [];
				loadedSolvesChallengeId = id;
			}
		} catch (err: any) {
			if (requestId === solvesRequestId && open && challenge?.id === id) {
				solves = [];
				solvesError = err?.message ?? 'Failed to load solves';
				loadedSolvesChallengeId = id;
				toast.error(solvesError ?? 'Failed to load solves');
			}
		} finally {
			if (requestId === solvesRequestId) {
				loadingSolves = false;
			}
		}
	}

	function openSolvesTab() {
		activeTab = 'solves';
	}

	$effect(() => {
		const currentId = challenge?.id ?? null;
		if (!open || currentId !== lastChallengeId) {
			activeTab = 'details';
			solves = [];
			solvesError = null;
			loadedSolvesChallengeId = null;
			lastChallengeId = currentId;
		}
	});

	$effect(() => {
		const currentId = challenge?.id;
		if (
			open &&
			activeTab === 'solves' &&
			currentId &&
			loadedSolvesChallengeId !== currentId &&
			!loadingSolves
		) {
			loadSolves(currentId);
		}
	});

	async function copyToClipboard(text: string) {
		try {
			await copy(text);
			toast.success('Copied to clipboard!');
		} catch (err) {
			toast.error('Failed to copy to clipboard.');
		}
	}

	const isDynamicType = $derived(
		challenge?.instance_type === 'Container' ||
			challenge?.instance_type === 'Compose' ||
			!!challenge?.image ||
			!!challenge?.compose ||
			!!challenge?.ghost
	);

	const connectionString = $derived.by(() => {
		// Dynamic challenges handle their own connection info via InstanceControls
		if (isDynamicType || challenge?.instance) return '';

		const h = challenge?.host || '';
		const p = challenge?.port;

		if (!h) return '';

		return formatConnectionString({
			host: h,
			port: p,
			connType: challenge?.conn_type
		});
	});
</script>

<Dialog.Root bind:open>
	<Dialog.Content
		class="max-h-[95vh] max-w-[95vw] overflow-y-auto overflow-x-hidden p-4 sm:max-w-[800px] sm:p-6"
		aria-describedby="challenge-description"
	>
		<Dialog.Header class="pb-4 sm:pb-6">
			<div class="min-w-0 flex-1">
				<div class="mb-3 flex items-start gap-2 pr-8">
					<Dialog.Title
						class="min-w-0 break-words text-2xl font-black tracking-tighter sm:text-3xl"
					>
						{challenge?.name ?? 'Challenge'}
					</Dialog.Title>
					{#if canEdit && challenge?.id}
						<Button
							variant="ghost"
							size="icon-sm"
							href={`/admin/challenges/${challenge.id}/edit`}
							class="mt-0.5 shrink-0"
							aria-label="Edit challenge"
							title="Edit challenge"
						>
							<Pen class="h-4 w-4" aria-hidden="true" />
						</Button>
					{/if}
				</div>

				<!-- Tags & Metadata -->
				<div class="flex flex-wrap items-center gap-2">
					{#if challenge?.tags && challenge.tags.length > 0}
						<div role="list" aria-label="Challenge tags" class="contents">
							{#each challenge.tags as tag}
								<span
									class="inline-flex items-center rounded-full bg-black/5 px-2.5 py-0.5 text-xs font-medium dark:bg-white/10"
									role="listitem"
								>
									{tag}
								</span>
							{/each}
						</div>
					{/if}

					{#if challenge?.solves === 0}
						<span class="inline-flex items-center gap-1 text-xs font-medium">
							<Droplet class="h-4 w-4 text-red-500" aria-hidden="true" />
							<span class="opacity-70">0 solves</span>
						</span>
					{:else if challenge?.solves}
						<button
							type="button"
							onclick={openSolvesTab}
							class="cursor-pointer text-xs font-medium opacity-70 transition-opacity hover:underline hover:opacity-100 focus:underline focus:outline-none"
							aria-label="View {challenge.solves} solve{challenge.solves === 1 ? '' : 's'}"
						>
							{challenge.solves}
							{challenge.solves === 1 ? 'solve' : 'solves'}
						</button>
					{/if}
					{#if challenge?.solved}
						<span
							class="solve-surface solve-text-strong inline-flex items-center rounded-md px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest"
						>
							Solved
						</span>
					{/if}
				</div>

				<!-- Authors -->
				{#if challenge?.authors && challenge.authors.length > 0}
					<div class="mt-2 flex items-center gap-1 text-xs font-medium opacity-70">
						<UserCog class="h-4 w-4" aria-hidden="true" />
						<span>
							By {#each challenge.authors as author, i (author)}{author}{i <
								challenge.authors.length - 1
									? ', '
									: ''}{/each}
						</span>
					</div>
				{/if}

				<!-- Admin Controls -->
				{#if isAdmin}
					<div class="mt-3 flex items-center gap-2" role="group" aria-label="Admin actions">
						<Button
							variant="outline"
							size="sm"
							class="cursor-pointer"
							onclick={() => onEdit?.(challenge)}
							aria-label="Edit challenge"
						>
							<Pen class="h-3.5 w-3.5" aria-hidden="true" />
							<span>Edit</span>
						</Button>
						<Button
							variant="outline"
							size="sm"
							class="cursor-pointer text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
							onclick={() => onDelete?.(challenge)}
							aria-label="Delete challenge"
						>
							<Trash2 class="h-3.5 w-3.5" aria-hidden="true" />
							<span>Delete</span>
						</Button>
					</div>
				{/if}
			</div>
			<Dialog.Description id="challenge-description" class="sr-only">
				Challenge details and submission form
			</Dialog.Description>
		</Dialog.Header>

		<div class="mb-6 flex justify-center border-b pb-4">
			<div
				class="bg-muted text-muted-foreground inline-flex h-10 items-center justify-center gap-1 rounded-lg p-1"
			>
				<button
					class="ring-offset-background focus-visible:ring-ring inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md px-6 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 {activeTab ===
					'details'
						? 'bg-background text-foreground shadow-sm'
						: 'hover:bg-background/50 hover:text-foreground'}"
					onclick={() => (activeTab = 'details')}
				>
					<Info class="h-4 w-4" />
					Details
				</button>
				<button
					class="ring-offset-background focus-visible:ring-ring inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md px-6 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 {activeTab ===
					'solves'
						? 'bg-background text-foreground shadow-sm'
						: 'hover:bg-background/50 hover:text-foreground'}"
					onclick={openSolvesTab}
				>
					<Trophy class="h-4 w-4" />
					Solves
				</button>
			</div>
		</div>

		{#if activeTab === 'details'}
			<!-- Description -->
			<section class="mb-6" aria-labelledby="description-heading">
				<h3 id="description-heading" class="mb-2 text-sm font-semibold opacity-70">Description</h3>
				{#if challenge?.description}
					<Markdown content={challenge.description} class="break-words text-base leading-relaxed" />
				{:else}
					<div class="text-base leading-relaxed opacity-60">No description available.</div>
				{/if}
			</section>

			<!-- Attachments -->
			{#if challenge?.attachments && challenge.attachments.length > 0}
				<section class="mb-6" aria-labelledby="attachments-heading">
					<h3 id="attachments-heading" class="mb-3 text-sm font-semibold opacity-70">
						Attachments
					</h3>
					<div class="flex flex-wrap gap-2">
						{#each challenge.attachments as attachment}
							<a
								href={`/attachments/${challenge.id || challenge.chall_id}/${attachment.replace(/^\/+/, '')}`}
								target="_blank"
								rel="noopener noreferrer"
								class="border-input bg-background hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring inline-flex h-9 items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2"
								aria-label="Download {attachment.split('/').pop()}"
							>
								<Download class="h-4 w-4" aria-hidden="true" />
								<span>{attachment.split('/').pop()}</span>
							</a>
						{/each}
					</div>
				</section>
			{/if}

			<!-- Connection Info (only for non-instance/static challenges) -->
			{#if !isDynamicType && challenge?.host && !challenge.instance && connectionString}
				<section class="mb-6" aria-labelledby="connection-heading">
					<h3 id="connection-heading" class="mb-3 text-sm font-semibold opacity-70">Connection</h3>
					<div class="flex items-center gap-3">
						<button
							type="button"
							onclick={() => copyToClipboard(connectionString)}
							class="focus:ring-primary inline-flex h-10 min-w-0 flex-1 items-center gap-2 rounded-md bg-gray-100 px-4 font-mono text-sm font-medium transition-colors hover:bg-gray-200 focus:outline-none focus:ring-2 dark:bg-gray-800 dark:hover:bg-gray-700"
							aria-label="Copy connection string: {connectionString}"
						>
							<span class="block max-w-full truncate">{connectionString}</span>
						</button>
						{#if connectionString.startsWith('http')}
							<a
								href={connectionString}
								target="_blank"
								rel="noopener noreferrer"
								class="text-primary text-sm font-semibold hover:underline"
							>
								Open
							</a>
						{/if}
					</div>
				</section>
			{/if}

			<!-- Instance Controls -->
			{#if challenge?.instance || isDynamicType}
				<section class="mb-4">
					<h3
						class="mb-3 flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest opacity-60"
					>
						<span class="shrink-0">Instance Management</span>
						<div class="bg-border h-px flex-1"></div>
					</h3>
					<InstanceControls
						{challenge}
						{countdown}
						{onCountdownUpdate}
						onInstanceChange={(updated) => {
							if (updated) challenge = updated;
							if (onInstanceChange) onInstanceChange(updated);
						}}
						hideHeader={true}
						showTimer={true}
					/>
				</section>
			{/if}

			<!-- Submit Flag -->
			<FlagSubmission
				{challenge}
				{submissionsClosed}
				onSolved={() => {
					if (challenge) challenge.solved = true;
					if (onSolved) onSolved();
				}}
			/>
		{:else if activeTab === 'solves'}
			<section class="mb-2" aria-labelledby="solves-heading">
				<h3 id="solves-heading" class="sr-only">Challenge solves</h3>
				<div class="overflow-hidden rounded-xl border">
					{#if loadingSolves}
						<div class="flex flex-col items-center gap-4 p-12 text-center">
							<Spinner class="h-8 w-8" />
							<p class="text-muted-foreground text-sm">Loading solves...</p>
						</div>
					{:else if solvesError}
						<div class="text-destructive p-8 text-center text-sm">{solvesError}</div>
					{:else}
						<div class="p-4">
							<ChallengeSolvesTable {solves} />
						</div>
					{/if}
				</div>
			</section>
		{/if}
	</Dialog.Content>
</Dialog.Root>
