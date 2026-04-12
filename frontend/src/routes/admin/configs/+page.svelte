<script lang="ts">
	import { getConfigs, updateConfigs } from '$lib/config';
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Input } from '$lib/components/ui/input';
	import { authState } from '$lib/stores/auth';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import { showSuccess, showError } from '$lib/utils/toast';
	import { Settings } from '@lucide/svelte';
	import * as Card from '$lib/components/ui/card';

	type ConfigType = 'bool' | 'int' | 'string' | (string & {});

	interface Config {
		key: string;
		type?: ConfigType | null;
		value?: string | number | boolean | null;
		description?: string;
		[key: string]: unknown;
	}

	type FormValue = string | boolean;

	let loading = $state(true);
	let error = $state<string | null>(null);

	let configs = $state<Config[]>([]);
	let form = $state<Record<string, FormValue>>({});

	let saving = $state(false);

	const isAdmin = $derived(authState.user?.role === 'Admin');

	const hasChanges = $derived(
		configs.some((config) => {
			const key = config.key;
			const current = form[key];
			const next = toConfigValue(config, current);
			const prev = String(config.value ?? '');
			return next !== prev;
		})
	);

	function normalizeType(type: Config['type']): ConfigType {
		if (type === 'bool' || type === 'int' || type === 'string') return type;
		return 'string';
	}

	function toFormValue(config: Config): FormValue {
		const t = normalizeType(config.type);
		const raw = config.value;
		if (t === 'bool') return String(raw) === 'true';
		return raw != null ? String(raw) : '';
	}

	function toConfigValue(config: Config, formValue: FormValue | undefined): string {
		const t = normalizeType(config.type);
		if (t === 'bool') return formValue ? 'true' : 'false';
		if (t === 'int') {
			const n = Number(formValue ?? 0);
			return Number.isFinite(n) ? String(n) : '0';
		}
		return String(formValue ?? '');
	}

	async function loadConfigs() {
		if (!isAdmin) return;
		loading = true;
		error = null;
		try {
			const res = await getConfigs();
			const list = Array.isArray(res) ? (res as Config[]) : [];
			configs = list;
			const nextForm: Record<string, FormValue> = {};
			for (const c of list) {
				if (!c || typeof c !== 'object') continue;
				nextForm[c.key] = toFormValue(c);
			}
			form = nextForm;
		} catch (e: any) {
			error = e?.message ?? 'Failed to load configs';
		} finally {
			loading = false;
		}
	}

	onMount(loadConfigs);

	async function save() {
		if (saving || !hasChanges) return;
		saving = true;
		try {
			const changes: Config[] = [];
			for (const config of configs) {
				const key = config.key;
				const value = toConfigValue(config, form[key]);
				const prev = String(config.value ?? '');
				if (value !== prev) {
					changes.push({ ...config, value });
				}
			}
			await Promise.all(changes.map((change) => updateConfigs(change)));
			showSuccess('Configuration updated successfully.');
			await loadConfigs(); // Reload to sync state
		} catch (e: any) {
			showError(e, 'Failed to save configuration.');
		} finally {
			saving = false;
		}
	}
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Configuration</h1>
			<p class="text-muted-foreground mt-1">Manage global platform settings</p>
		</div>
		<Button onclick={save} disabled={saving || !hasChanges}>
			{#if saving}
				<Spinner class="mr-2 h-4 w-4" />
				Saving...
			{:else}
				Save Changes
			{/if}
		</Button>
	</div>

	{#if loading}
		<div class="flex flex-col items-center justify-center py-12">
			<Spinner class="mb-4 h-8 w-8" />
			<p class="text-muted-foreground">Loading configuration...</p>
		</div>
	{:else if error}
		<div class="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-destructive">
			<p class="font-semibold">Error loading configuration</p>
			<p class="text-sm">{error}</p>
		</div>
	{:else}
		<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3 pb-20">
			{#each configs as c (c.key)}
				<Card.Root class="p-5 flex flex-col gap-4">
					<div class="flex items-start justify-between gap-3">
						<div class="min-w-0 flex-1">
							<Label class="font-bold text-sm truncate block">{c.key}</Label>
							{#if c.description}
								<p class="text-muted-foreground text-xs line-clamp-2 mt-1">{c.description}</p>
							{/if}
						</div>
						<div class="bg-primary/10 text-primary text-[10px] uppercase font-bold px-1.5 py-0.5 rounded">
							{c.type}
						</div>
					</div>

					<div class="mt-auto pt-2">
						{#if c.type === 'bool'}
							<div class="flex items-center gap-3">
								<Checkbox
									checked={form[c.key] === true}
									onCheckedChange={(v) => { form[c.key] = !!v; }}
									id={c.key}
								/>
								<Label for={c.key} class="cursor-pointer text-sm">
									{form[c.key] ? 'Enabled' : 'Disabled'}
								</Label>
							</div>
						{:else if c.type === 'int'}
							<Input
								type="number"
								bind:value={form[c.key]}
								placeholder="0"
								class="h-9"
							/>
						{:else}
							<Input
								type="text"
								bind:value={form[c.key]}
								placeholder="Value"
								class="h-9"
							/>
						{/if}
					</div>
				</Card.Root>
			{/each}
		</div>
	{/if}
</div>
