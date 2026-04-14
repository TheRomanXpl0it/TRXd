<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import * as Card from '$lib/components/ui/card';
	import { toast } from 'svelte-sonner';
	import {
		createChallenge,
		getChallenges,
		updateChallenge,
		uploadAttachments
	} from '$lib/challenges';
	import { createFlags } from '$lib/flags';
	import { goto } from '$app/navigation';
	import {
		PlusCircle,
		Flag,
		Cpu,
		Info,
		Save,
		X,
		Paperclip,
		Tags as TagsIcon,
		Plus
	} from '@lucide/svelte';
	import CategorySelect from '$lib/components/challenges/CategorySelect.svelte';
	import TagMultiSelect from '$lib/components/challenges/TagMultiselect.svelte';
	import MonacoEditor from '$lib/components/MonacoEditor.svelte';
	import { getCategories } from '$lib/categories';
	import { onMount } from 'svelte';

	// Form State
	let name = $state('');
	let category = $state('');
	let description = $state('');
	let type = $state('Normal');
	let points = $state(500);
	let dynamicScore = $state(true);
	let hidden = $state(false);

	let host = $state('');
	let port = $state<number | undefined>(undefined);
	let connType = $state('NONE');

	const connTypes = [
		{ value: 'NONE', label: 'None' },
		{ value: 'TCP', label: 'TCP' },
		{ value: 'HTTP', label: 'HTTP' },
		{ value: 'HTTPS', label: 'HTTPS' }
	];

	// Flags
	let flags = $state([{ flag: '', regex: false }]);

	// Docker Config (for Container/Compose)
	let imageName = $state('');
	let composeFile = $state('');
	let lifetime = $state(0);
	let maxMemory = $state(0);
	let maxCpu = $state('');

	let activeTab = $state<'info' | 'flags' | 'deployment' | 'attachments'>('info');
	let loading = $state(false);
	let categories = $state<any[]>([]);

	// Parity fields
	let tags = $state<string[]>([]);
	let authorsCsv = $state('');
	let envVars = $state<{ name: string; value: string }[]>([]);
	let attachments = $state<File[]>([]);
	let fileInputEl = $state<HTMLInputElement | null>(null);

	function addFiles(files: FileList | null) {
		if (!files) return;
		attachments = [...attachments, ...Array.from(files)];
		if (fileInputEl) fileInputEl.value = '';
	}

	function removeFile(index: number) {
		attachments = attachments.filter((_, i) => i !== index);
	}

	const challengeTypes = [
		{ value: 'Normal', label: 'Normal' },
		{ value: 'Container', label: 'Container' },
		{ value: 'Compose', label: 'Compose' }
	];

	onMount(async () => {
		try {
			const res = await getCategories();
			categories = res.map((c: any) => ({
				value: typeof c === 'string' ? c : c.name,
				label: typeof c === 'string' ? c : c.name
			}));
		} catch (err) {
			console.error('Failed to load categories', err);
		}
	});

	async function handleSubmit() {
		if (!name.trim()) return toast.error('Name is required');
		if (!category) return toast.error('Category is required');
		if (points <= 0) return toast.error('Points must be greater than 0');

		loading = true;
		try {
			// 1. Create base challenge
			const baseRes = await createChallenge(
				name.trim(),
				category,
				description.trim(),
				type,
				points,
				dynamicScore ? 'Dynamic' : 'Static'
			);

			// 2. Fetch the newly created challenge to get its ID
			const all = await getChallenges();
			const newChall = all.sort((a, b: any) => b.id - a.id).find((c) => c.name === name.trim());
			const challId = newChall?.id || baseRes.id;

			// 3. Update Advanced Fields
			const authors = authorsCsv
				.split(',')
				.map((a) => a.trim())
				.filter(Boolean);

			const envObj: Record<string, string> = {};
			for (const env of envVars) {
				if (env.name.trim()) envObj[env.name.trim()] = env.value;
			}

			await updateChallenge({
				chall_id: challId,
				name: name.trim(),
				category: category,
				description: description.trim(),
				type: type,
				hidden: hidden,
				score_type: dynamicScore ? 'Dynamic' : 'Static',
				max_points: points,
				image: type === 'Container' ? imageName : undefined,
				compose: type === 'Compose' ? composeFile : undefined,
				host: host.trim() ? host.trim() : undefined,
				port: port ? port : undefined,
				conn_type: connType,
				lifetime: lifetime || 1800,
				max_memory: maxMemory || 512,
				max_cpu: maxCpu || '0.5',
				tags: tags,
				authors: authors.length > 0 ? authors : undefined,
				envs: Object.keys(envObj).length > 0 ? JSON.stringify(envObj) : undefined
			});

			// 4. Create Flags
			const validFlags = flags.filter((f) => f.flag.trim());
			if (validFlags.length > 0) {
				await createFlags(validFlags, challId);
			}

			// 5. Upload Attachments
			if (attachments.length > 0) {
				const fd = new FormData();
				fd.append('chall_id', String(challId));
				for (const f of attachments) {
					fd.append('attachments', f, f.name);
				}
				await uploadAttachments(fd);
			}

			toast.success('Challenge created successfully!');
			goto('/challenges');
		} catch (err: any) {
			toast.error(err?.message || 'Failed to create challenge');
		} finally {
			loading = false;
		}
	}

	function addFlag() {
		flags = [...flags, { flag: '', regex: false }];
	}

	function removeFlag(index: number) {
		flags = flags.filter((_, i) => i !== index);
		if (flags.length === 0) addFlag();
	}
</script>

<div class="max-w-4xl space-y-8 pb-20">
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<div class="bg-primary/10 text-primary rounded-full p-3">
				<PlusCircle class="h-8 w-8" />
			</div>
			<div>
				<h1 class="text-3xl font-bold tracking-tight">Create Challenge</h1>
				<p class="text-muted-foreground mt-1">Configure all challenge settings in one go</p>
			</div>
		</div>
		<Button size="lg" onclick={handleSubmit} disabled={loading} class="gap-2 px-8">
			{#if loading}
				<Spinner class="h-4 w-4" />
			{:else}
				<Save class="h-4 w-4" />
			{/if}
			Create Challenge
		</Button>
	</div>

	<div class="flex justify-center">
		<div
			class="bg-muted text-muted-foreground inline-flex h-10 items-center justify-center gap-1 rounded-lg p-1"
		>
			<button
				class="ring-offset-background focus-visible:ring-ring inline-flex items-center justify-center whitespace-nowrap rounded-md px-6 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 {activeTab ===
				'info'
					? 'bg-background text-foreground px-6 py-1.5 shadow-sm'
					: 'hover:bg-background/50 hover:text-foreground'}"
				onclick={() => (activeTab = 'info')}
			>
				<Info class="mr-2 h-4 w-4" />
				Metadata
			</button>
			<button
				class="ring-offset-background focus-visible:ring-ring inline-flex items-center justify-center whitespace-nowrap rounded-md px-6 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 {activeTab ===
				'flags'
					? 'bg-background text-foreground shadow-sm'
					: 'hover:bg-background/50 hover:text-foreground'}"
				onclick={() => (activeTab = 'flags')}
			>
				<Flag class="mr-2 h-4 w-4" />
				Flags
			</button>
			<button
				class="ring-offset-background focus-visible:ring-ring inline-flex items-center justify-center whitespace-nowrap rounded-md px-6 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 {activeTab ===
				'deployment'
					? 'bg-background text-foreground shadow-sm'
					: 'hover:bg-background/50 hover:text-foreground'}"
				onclick={() => (activeTab = 'deployment')}
			>
				<Cpu class="mr-2 h-4 w-4" />
				Deployment
			</button>
			<button
				class="ring-offset-background focus-visible:ring-ring inline-flex items-center justify-center whitespace-nowrap rounded-md px-6 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 {activeTab ===
				'attachments'
					? 'bg-background text-foreground shadow-sm'
					: 'hover:bg-background/50 hover:text-foreground'}"
				onclick={() => (activeTab = 'attachments')}
			>
				<Paperclip class="mr-2 h-4 w-4" />
				Attachments
			</button>
		</div>
	</div>

	<div class="w-full">
		{#if activeTab === 'info'}
			<div class="mt-6">
				<Card.Root>
					<Card.Header>
						<Card.Title>Basic Information</Card.Title>
						<Card.Description>Name, category, and core settings of the challenge.</Card.Description>
					</Card.Header>
					<Card.Content class="space-y-6">
						<div class="grid gap-6 sm:grid-cols-2">
							<div class="space-y-2">
								<Label for="name">Challenge Name*</Label>
								<Input id="name" bind:value={name} placeholder="E.g. My Awesome Challenge" />
							</div>
							<div class="space-y-2">
								<Label for="category">Category*</Label>
								<CategorySelect
									items={categories}
									bind:value={category}
									placeholder="Select Category..."
								/>
							</div>
						</div>

						<div class="space-y-2">
							<Label for="description">Description (optional)</Label>
							<Textarea
								id="description"
								bind:value={description}
								placeholder="Markdown supported..."
								class="min-h-[150px]"
							/>
						</div>

						<div class="grid gap-6 sm:grid-cols-2">
							<div class="space-y-4">
								<div class="space-y-2">
									<Label for="type">Type</Label>
									<CategorySelect items={challengeTypes} bind:value={type} />
								</div>
								<div class="space-y-2">
									<Label for="points">Initial Points</Label>
									<Input id="points" type="number" bind:value={points} />
								</div>
							</div>
							<div class="space-y-4">
								<div class="space-y-2">
									<Label for="authors">Authors (comma separated)</Label>
									<Input id="authors" bind:value={authorsCsv} placeholder="e.g. author1, author2" />
								</div>
								<div class="flex flex-col justify-end gap-3 pt-3">
									<div class="flex items-center gap-3">
										<Checkbox id="dynamic" bind:checked={dynamicScore} />
										<Label for="dynamic" class="cursor-pointer text-sm">Dynamic Scoring</Label>
									</div>
									<div class="flex items-center gap-3">
										<Checkbox id="hidden" bind:checked={hidden} />
										<Label for="hidden" class="cursor-pointer text-sm">Hidden</Label>
									</div>
								</div>
							</div>
						</div>

						<div class="space-y-2 border-t pt-6">
							<Label class="flex items-center gap-2">
								<TagsIcon class="h-4 w-4 opacity-70" />
								Tags
							</Label>
							<TagMultiSelect
								bind:value={tags}
								placeholder="Add keywords (e.g. pwn, web, crypto)..."
							/>
						</div>
					</Card.Content>
				</Card.Root>
			</div>
		{:else if activeTab === 'flags'}
			<div class="mt-6">
				<Card.Root>
					<Card.Header class="flex flex-row items-center justify-between">
						<div>
							<Card.Title>Flags</Card.Title>
							<Card.Description>Manage correct answers for this challenge.</Card.Description>
						</div>
						<Button variant="outline" size="sm" onclick={addFlag}>Add Flag</Button>
					</Card.Header>
					<Card.Content class="space-y-4">
						{#each flags as _, i}
							<div class="flex items-center gap-4 rounded-lg border p-4">
								<div class="flex-1 space-y-2">
									<Label class="text-muted-foreground text-xs uppercase">Flag</Label>
									<Input bind:value={flags[i].flag} placeholder="TRX&#123;...&#125;" />
								</div>
								<div class="flex items-center gap-2 pt-6">
									<Checkbox id={`regex-${i}`} bind:checked={flags[i].regex} />
									<Label for={`regex-${i}`} class="cursor-pointer text-sm">Regex</Label>
								</div>
								<Button
									variant="ghost"
									size="icon"
									class="text-destructive mt-6"
									onclick={() => removeFlag(i)}
									disabled={flags.length === 1}
								>
									<PlusCircle class="h-4 w-4 rotate-45" />
								</Button>
							</div>
						{/each}
					</Card.Content>
				</Card.Root>
			</div>
		{:else if activeTab === 'deployment'}
			<div class="mt-6">
				<Card.Root>
					<Card.Header>
						<Card.Title>Deployment Settings</Card.Title>
						<Card.Description
							>Configure Docker settings for containerized challenges.</Card.Description
						>
					</Card.Header>
					<Card.Content class="space-y-6">
						{#if type !== 'Normal'}
							<div class="animate-in fade-in slide-in-from-top-2 space-y-4">
								{#if type === 'Container'}
									<div class="space-y-2">
										<Label for="image">Docker Image Name</Label>
										<Input
											id="image"
											bind:value={imageName}
											placeholder="registry.example.com/chall:latest"
										/>
									</div>
								{:else}
									<div class="space-y-4">
										<Label for="compose">Docker Compose YAML</Label>
										<div class="h-[400px] overflow-hidden rounded-md border">
											<MonacoEditor bind:value={composeFile} language="yaml" class="h-full" />
										</div>
									</div>
								{/if}

								<div class="grid gap-6 sm:grid-cols-3">
									<div class="space-y-2">
										<Label for="cpu">Max CPU (e.g. 0.5)</Label>
										<Input id="cpu" bind:value={maxCpu} placeholder="0.5" />
									</div>
									<div class="space-y-2">
										<Label for="ram">Max RAM (MB)</Label>
										<Input id="ram" type="number" bind:value={maxMemory} placeholder="256" />
									</div>
									<div class="space-y-2">
										<Label for="life">Lifetime (Seconds)</Label>
										<Input id="life" type="number" bind:value={lifetime} placeholder="3600" />
									</div>
								</div>

								<!-- Env Vars -->
								<div class="space-y-4 border-t pt-6">
									<div class="flex items-center justify-between">
										<div class="space-y-1">
											<Label class="text-sm font-bold">Environment Variables</Label>
											<p class="text-muted-foreground text-xs">
												Dynamic variables for your containers.
											</p>
										</div>
										<Button
											type="button"
											variant="outline"
											size="sm"
											onclick={() => (envVars = [...envVars, { name: '', value: '' }])}
										>
											<Plus class="mr-2 h-4 w-4" /> Add Variable
										</Button>
									</div>
									<div class="space-y-2">
										{#each envVars as env, i}
											<div class="flex items-center gap-2">
												<Input
													bind:value={env.name}
													placeholder="KEY"
													class="w-1/3 font-mono text-xs"
												/>
												<span class="opacity-50">=</span>
												<Input
													bind:value={env.value}
													placeholder="VALUE"
													class="flex-1 font-mono text-xs"
												/>
												<Button
													type="button"
													variant="ghost"
													size="icon"
													class="text-destructive h-8 w-8"
													onclick={() => (envVars = envVars.filter((_, idx) => idx !== i))}
												>
													<X class="h-4 w-4" />
												</Button>
											</div>
										{/each}
									</div>
								</div>
							</div>
						{/if}

						<div
							class={`animate-in fade-in slide-in-from-top-2 space-y-4 ${type !== 'Normal' ? 'border-t pt-6' : ''}`}
						>
							<div class="space-y-2">
								<Label for="host">Connecting Host (optional)</Label>
								<Input id="host" bind:value={host} placeholder="e.g. chal.myctf.com" />
							</div>
							<div class="grid gap-6 sm:grid-cols-2">
								<div class="space-y-2">
									<Label for="port">Port</Label>
									<Input id="port" type="number" bind:value={port} placeholder="1337" />
								</div>
								<div class="space-y-2">
									<Label for="connType">Connection Type</Label>
									<CategorySelect items={connTypes} bind:value={connType} />
								</div>
							</div>
						</div>
					</Card.Content>
				</Card.Root>
			</div>
		{:else if activeTab === 'attachments'}
			<div class="mt-6">
				<Card.Root>
					<Card.Header>
						<Card.Title>Attachments</Card.Title>
						<Card.Description>Upload files for players to download.</Card.Description>
					</Card.Header>
					<Card.Content class="space-y-6">
						<div
							role="button"
							tabindex="0"
							class="hover:border-primary hover:bg-primary/5 group rounded-2xl border-2 border-dashed p-10 text-center transition-all"
							ondragover={(e) => e.preventDefault()}
							ondrop={(e) => {
								e.preventDefault();
								addFiles(e.dataTransfer?.files || null);
							}}
							onclick={() => fileInputEl?.click()}
							onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && fileInputEl?.click()}
						>
							<input
								type="file"
								bind:this={fileInputEl}
								multiple
								class="hidden"
								onchange={(e) => addFiles(e.currentTarget.files)}
							/>
							<div
								class="bg-muted group-hover:bg-primary/10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full transition-colors"
							>
								<Paperclip
									class="text-muted-foreground group-hover:text-primary h-8 w-8 transition-colors"
								/>
							</div>
							<h4 class="mb-1 text-lg font-bold">Drop files here</h4>
							<p class="text-muted-foreground text-sm">Or click to browse from your computer</p>
						</div>

						{#if attachments.length > 0}
							<div class="space-y-3">
								<h5 class="text-muted-foreground text-xs font-black uppercase tracking-widest">
									Selected Files ({attachments.length})
								</h5>
								<div class="grid gap-2">
									{#each attachments as file, i}
										<div
											class="bg-muted/30 group flex items-center justify-between rounded-lg border p-3"
										>
											<div class="flex min-w-0 items-center gap-3">
												<Paperclip class="h-4 w-4 shrink-0 opacity-40" />
												<span class="truncate text-sm font-medium">{file.name}</span>
											</div>
											<Button
												type="button"
												variant="ghost"
												size="icon"
												class="text-destructive h-8 w-8 transition-all"
												onclick={() => removeFile(i)}
											>
												<X class="h-4 w-4" />
											</Button>
										</div>
									{/each}
								</div>
							</div>
						{/if}
					</Card.Content>
				</Card.Root>
			</div>
		{/if}
	</div>
</div>
