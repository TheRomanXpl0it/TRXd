<script lang="ts">
	import { getConfigs, updateConfigs } from '$lib/config';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import DateTimePicker from '$lib/components/ui/date-time-picker.svelte';
	import { authState } from '$lib/stores/auth';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import { showSuccess, showError } from '$lib/utils/toast';
	import * as Card from '$lib/components/ui/card';
	import { Eye, EyeOff } from '@lucide/svelte';

	type ConfigType =
		| 'bool'
		| 'int'
		| 'float'
		| 'string'
		| 'text'
		| 'date'
		| 'url'
		| 'port'
		| 'duration'
		| (string & {});

	interface Config {
		key: string;
		type?: ConfigType | null;
		value?: string | number | boolean | null;
		description?: string;
		category?: string | null;
		name?: string | null;
		secret?: boolean | null;
		[key: string]: unknown;
	}

	interface ConfigGroup {
		key: string;
		label: string;
		configs: Config[];
	}

	type FormValue = string | boolean;

	let loading = $state(true);
	let error = $state<string | null>(null);

	let configs = $state<Config[]>([]);
	let form = $state<Record<string, FormValue>>({});
	let visibleSecrets = $state<Record<string, boolean>>({});
	let activeTab = $state('');
	let fetchedOnce = $state(false);

	let saving = $state(false);

	const isReady = $derived(authState.ready);
	const isAdmin = $derived(authState.user?.role === 'Admin');
	const groupedConfigs = $derived.by(() => groupConfigs(configs));

	const hasChanges = $derived(
		configs.some((config) => {
			const key = config.key;
			const current = form[key];
			const next = toConfigValue(config, current);
			const prev = String(config.value ?? '');
			return next !== prev;
		})
	);

	const hasInvalidValues = $derived(
		configs.some((config) => isInvalidFormValue(config, form[config.key]))
	);

	function normalizeType(type: Config['type']): ConfigType {
		if (type === 'float64') return 'float';
		if (
			type === 'bool' ||
			type === 'int' ||
			type === 'float' ||
			type === 'string' ||
			type === 'text' ||
			type === 'date' ||
			type === 'url' ||
			type === 'port' ||
			type === 'duration'
		) {
			return type;
		}
		return 'string';
	}

	function getCategoryLabel(category: Config['category']): string {
		const value = String(category ?? '').trim();
		if (!value) return 'General';
		return value
			.split(/[-_\s]+/)
			.filter(Boolean)
			.map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
			.join(' ');
	}

	function getCategoryKey(category: Config['category']): string {
		const value = String(category ?? '')
			.trim()
			.toLowerCase();
		if (!value) return 'general';
		return value.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'general';
	}

	function getDisplayName(config: Config): string {
		const name = String(config.name ?? '').trim();
		return name || config.key;
	}

	function groupConfigs(list: Config[]): ConfigGroup[] {
		const groups = new Map<string, ConfigGroup>();

		for (const config of list) {
			const key = getCategoryKey(config.category);
			const label = getCategoryLabel(config.category);
			const group = groups.get(key);

			if (group) {
				group.configs.push(config);
				continue;
			}

			groups.set(key, {
				key,
				label,
				configs: [config]
			});
		}

		return [...groups.values()];
	}

	function toDateTimeInputValue(raw: unknown): string {
		const value = String(raw ?? '').trim();
		if (!value) return '';

		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return '';

		const year = String(date.getFullYear());
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		const hours = String(date.getHours()).padStart(2, '0');
		const minutes = String(date.getMinutes()).padStart(2, '0');

		return `${year}-${month}-${day}T${hours}:${minutes}`;
	}

	function fromDateTimeInputValue(formValue: FormValue | undefined): string {
		const value = String(formValue ?? '').trim();
		if (!value) return '';

		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return '';

		return date.toISOString();
	}

	function toFormValue(config: Config): FormValue {
		const t = normalizeType(config.type);
		const raw = config.value;
		if (t === 'bool') return String(raw) === 'true';
		if (t === 'date') return toDateTimeInputValue(raw);
		return raw != null ? String(raw) : '';
	}

	function toConfigValue(config: Config, formValue: FormValue | undefined): string {
		const t = normalizeType(config.type);
		if (t === 'bool') return formValue ? 'true' : 'false';
		if (t === 'date') return fromDateTimeInputValue(formValue);
		if (t === 'int' || t === 'port' || t === 'duration') {
			const value = String(formValue ?? '').trim();
			if (!value) return '';
			const n = Number(value);
			return Number.isFinite(n) ? String(Math.trunc(n)) : '';
		}
		if (t === 'float') {
			const value = String(formValue ?? '').trim();
			if (!value) return '';
			const n = Number(value);
			return Number.isFinite(n) ? String(n) : '';
		}
		return String(formValue ?? '');
	}

	function isNumericType(type: ConfigType): boolean {
		return type === 'int' || type === 'float' || type === 'port' || type === 'duration';
	}

	function isInvalidFormValue(config: Config, formValue: FormValue | undefined): boolean {
		const t = normalizeType(config.type);
		if (t === 'bool') return false;

		const value = String(formValue ?? '').trim();
		if (!value) return false;

		if (t === 'date') {
			return Number.isNaN(new Date(value).getTime());
		}

		if (isNumericType(t)) {
			const number = Number(value);
			if (!Number.isFinite(number)) return true;
			if (t !== 'float' && !Number.isInteger(number)) return true;
			if (t === 'port' && (number < 1 || number > 65535)) return true;
		}

		return false;
	}

	function getInputType(
		config: Config,
		secretVisible = false
	): 'text' | 'number' | 'url' | 'password' {
		const t = normalizeType(config.type);
		if (config.secret && !secretVisible) return 'password';
		if (t === 'url') return 'url';
		if (isNumericType(t)) return 'number';
		return 'text';
	}

	function getStep(config: Config): string | undefined {
		const t = normalizeType(config.type);
		if (t === 'float') return 'any';
		if (t === 'int' || t === 'port' || t === 'duration') return '1';
		return undefined;
	}

	function getMin(config: Config): number | undefined {
		const t = normalizeType(config.type);
		if (t === 'port') return 1;
		if (t === 'int' || t === 'duration' || t === 'float') return 0;
		return undefined;
	}

	function getInputMode(config: Config): 'text' | 'numeric' | 'decimal' | 'url' {
		const t = normalizeType(config.type);
		if (t === 'float') return 'decimal';
		if (t === 'int' || t === 'port' || t === 'duration') return 'numeric';
		if (t === 'url') return 'url';
		return 'text';
	}

	function getValidationMessage(config: Config): string {
		const t = normalizeType(config.type);
		if (t === 'date') return 'Enter a valid date and time.';
		if (t === 'port') return 'Enter a valid port between 1 and 65535.';
		if (t === 'float') return 'Enter a valid number.';
		if (t === 'int' || t === 'duration') return 'Enter a whole number.';
		return 'Invalid value.';
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

	$effect(() => {
		if (!isReady) return;
		if (!isAdmin) {
			loading = false;
			return;
		}
		if (fetchedOnce) return;
		fetchedOnce = true;
		loadConfigs();
	});

	$effect(() => {
		if (!groupedConfigs.length) {
			activeTab = '';
			return;
		}

		if (!groupedConfigs.some((group) => group.key === activeTab)) {
			activeTab = groupedConfigs[0].key;
		}
	});

	async function save() {
		if (saving || !hasChanges || hasInvalidValues) return;
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
		<Button onclick={save} disabled={saving || !hasChanges || hasInvalidValues}>
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
	{:else if isReady && !isAdmin}
		<div class="border-destructive/20 bg-destructive/10 text-destructive rounded-lg border p-4">
			<p class="font-semibold">Access denied</p>
			<p class="text-sm">Administrator access is required to edit configuration.</p>
		</div>
	{:else if error}
		<div class="border-destructive/20 bg-destructive/10 text-destructive rounded-lg border p-4">
			<p class="font-semibold">Error loading configuration</p>
			<p class="text-sm">{error}</p>
		</div>
	{:else if groupedConfigs.length === 0}
		<div class="rounded-lg border p-6">
			<p class="font-semibold">No configuration entries found</p>
			<p class="text-muted-foreground mt-1 text-sm">
				The server did not return any editable settings.
			</p>
		</div>
	{:else}
		<div class="space-y-6 pb-20">
			<div class="overflow-x-auto">
				<div class="flex justify-center">
					<div
						class="bg-muted text-muted-foreground inline-flex h-10 min-w-max items-center justify-center gap-1 rounded-lg p-1"
					>
						{#each groupedConfigs as group}
							<button
								class="ring-offset-background focus-visible:ring-ring inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md px-6 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 {activeTab ===
								group.key
									? 'bg-background text-foreground shadow-sm'
									: 'hover:bg-background/50 hover:text-foreground'}"
								onclick={() => (activeTab = group.key)}
								type="button"
							>
								{group.label}
								<span class="text-muted-foreground text-xs">{group.configs.length}</span>
							</button>
						{/each}
					</div>
				</div>
			</div>

			{#each groupedConfigs as group (group.key)}
				{#if activeTab === group.key}
					<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
						{#each group.configs as c (c.key)}
							{@const normalizedType = normalizeType(c.type)}
							{@const invalid = isInvalidFormValue(c, form[c.key])}
							<Card.Root
								class="flex flex-col gap-4 p-5 {normalizedType === 'text'
									? 'md:col-span-2 xl:col-span-3'
									: ''}"
							>
								<div class="flex items-start justify-between gap-3">
									<div class="min-w-0 flex-1">
										<Label class="block truncate text-sm font-bold">{getDisplayName(c)}</Label>
										<p class="text-muted-foreground mt-1 font-mono text-[11px]">{c.key}</p>
										{#if c.description}
											<p class="text-muted-foreground mt-2 text-xs leading-relaxed">
												{c.description}
											</p>
										{/if}
									</div>
									<div class="flex shrink-0 items-center gap-2">
										<div
											class="bg-primary/10 text-primary rounded px-1.5 py-0.5 text-[10px] font-bold uppercase"
										>
											{normalizedType}
										</div>
										{#if c.secret}
											<div
												class="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[10px] font-bold uppercase"
											>
												secret
											</div>
										{/if}
									</div>
								</div>

								<div class="mt-auto space-y-2 pt-2">
									{#if normalizedType === 'bool'}
										<div class="flex items-center gap-3">
											<Checkbox
												checked={form[c.key] === true}
												onCheckedChange={(value) => {
													form[c.key] = !!value;
												}}
												id={c.key}
											/>
											<Label for={c.key} class="cursor-pointer text-sm">
												{form[c.key] ? 'Enabled' : 'Disabled'}
											</Label>
										</div>
									{:else if normalizedType === 'date'}
										<DateTimePicker
											bind:value={form[c.key]}
											{invalid}
											class="h-9"
											placeholder="Select date and time"
										/>
										{#if invalid}
											<p class="text-destructive text-xs">{getValidationMessage(c)}</p>
										{/if}
									{:else if normalizedType === 'text'}
										<Textarea
											value={String(form[c.key] ?? '')}
											oninput={(event) => (form[c.key] = event.currentTarget.value)}
											rows={8}
											class="min-h-40 resize-y font-mono"
											placeholder="Value"
											aria-invalid={invalid}
										/>
									{:else}
										<div class="relative">
											<Input
												type={getInputType(c, visibleSecrets[c.key])}
												bind:value={form[c.key]}
												class={c.secret ? 'h-9 pr-10' : 'h-9'}
												min={getMin(c)}
												step={getStep(c)}
												inputmode={getInputMode(c)}
												placeholder="Value"
												aria-invalid={invalid}
											/>
											{#if c.secret}
												<button
													type="button"
													class="text-muted-foreground hover:text-foreground absolute right-0 top-0 inline-flex h-9 w-9 items-center justify-center"
													aria-label={`${visibleSecrets[c.key] ? 'Hide' : 'Show'} ${getDisplayName(c)}`}
													onclick={() => (visibleSecrets[c.key] = !visibleSecrets[c.key])}
												>
													{#if visibleSecrets[c.key]}
														<EyeOff class="h-4 w-4" />
													{:else}
														<Eye class="h-4 w-4" />
													{/if}
												</button>
											{/if}
										</div>
										{#if invalid}
											<p class="text-destructive text-xs">{getValidationMessage(c)}</p>
										{/if}
									{/if}
								</div>
							</Card.Root>
						{/each}
					</div>
				{/if}
			{/each}
		</div>
	{/if}
</div>
