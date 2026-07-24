<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import Label from '@/components/ui/label/label.svelte';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Button } from '@/components/ui/button';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import MultiSelect from '$lib/components/challenges/CategorySelect.svelte';
	import TagMultiSelect from '$lib/components/challenges/TagMultiselect.svelte';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import { toast } from 'svelte-sonner';
	import {
		createChallenge,
		updateChallenge,
		getChallenges,
		uploadAttachments
	} from '$lib/challenges';
	import { createFlags } from '$lib/flags';
	import {
		Plus,
		X,
		Cpu,
		MemoryStick,
		Clock,
		Tags as TagsIcon,
		Flag,
		Globe,
		Info,
		Paperclip
	} from '@lucide/svelte';

	let {
		open = $bindable(false),
		challengeName = $bindable(''),
		challengeDescription = $bindable(''),
		category = $bindable(''),
		challengeType = $bindable('Static'),
		points = $bindable(500),
		dynamicScore = $bindable(true),
		categories = $bindable([]),
		challengeTypes = [],
		oncreated
	} = $props<{
		open: boolean;
		challengeName?: string;
		challengeDescription?: string;
		category?: string;
		challengeType?: string;
		points?: number;
		dynamicScore?: boolean;
		categories: Array<{ value: string; label: string }>;
		challengeTypes: Array<{ value: string; label: string }>;
		oncreated?: () => void;
	}>();

	// Additional states
	let activeTab = $state<'meta' | 'deployment' | 'flags' | 'attachments'>('meta');
	let tags = $state<string[]>([]);
	let image = $state('');
	let lifetime = $state(1800);
	let compose = $state('');
	let host = $state('');
	let port = $state<number | null>(null);
	let connType = $state('TCP');
	let envVars = $state<{ name: string; value: string }[]>([]);
	let hashDomain = $state(false);
	let renewable = $state(true);
	let flags = $state<{ flag: string; regex: boolean }[]>([{ flag: '', regex: false }]);

	// Attachments
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

	let createLoading = $state(false);

	async function submitCreateChallenge(ev: SubmitEvent) {
		ev.preventDefault();
		if (createLoading) return;

		const trimmedName = challengeName.trim();
		if (!trimmedName) return toast.error('Please enter a challenge name.');
		if (!category) return toast.error('Please select a category.');
		if (!challengeType) return toast.error('Please select a challenge type.');

		// Validate flags
		const activeFlags = flags.filter((f) => f.flag.trim());
		if (activeFlags.length === 0) {
			activeTab = 'flags';
			return toast.error('At least one flag is required.');
		}

		createLoading = true;
		const scoretype = dynamicScore ? 'Dynamic' : 'Static';

		try {
			// 1. Create base challenge
			await createChallenge(
				trimmedName,
				category,
				challengeDescription.trim(),
				challengeType,
				points,
				scoretype
			);

			// 2. Fetch the newly created challenge to get its ID
			const all = await getChallenges();
			const newChall = all.sort((a, b) => b.id - a.id).find((c) => c.name === trimmedName);

			if (newChall) {
				const chall_id = newChall.id;

				// 3. Update with advanced options (tags, envs, deployment)
				const updateData: any = {
					chall_id,
					tags,
					host,
					port,
					conn_type: connType,
					hash_domain: hashDomain,
					renewable: renewable,
					hidden: true // Hidden by default on creation
				};

				if (challengeType === 'Container' || challengeType === 'Compose') {
					updateData.image = challengeType === 'Container' ? image || 'nginx:latest' : undefined;
					updateData.compose = challengeType === 'Compose' ? compose : undefined;
					updateData.lifetime = Number(lifetime) || 1800;

					// Env vars
					const envObj: Record<string, string> = {};
					for (const env of envVars) {
						if (env.name.trim()) envObj[env.name.trim()] = env.value;
					}
					if (Object.keys(envObj).length > 0) {
						updateData.envs = JSON.stringify(envObj);
					}
				}

				await updateChallenge(updateData);

				// 4. Create Flags
				await createFlags(activeFlags, chall_id);

				// 5. Upload Attachments
				if (attachments.length > 0) {
					const fd = new FormData();
					fd.append('chall_id', String(chall_id));
					for (const f of attachments) {
						fd.append('attachments', f, f.name);
					}
					await uploadAttachments(fd);
				}
			}

			toast.success('Challenge created successfully!');

			// Reset all fields
			resetForm();
			open = false;
			oncreated?.();
		} catch (err: any) {
			toast.error(err?.message ?? 'Failed to create challenge.');
		} finally {
			createLoading = false;
		}
	}

	function resetForm() {
		challengeName = '';
		challengeDescription = '';
		category = '';
		challengeType = 'Static';
		points = 500;
		dynamicScore = true;
		tags = [];
		image = '';
		lifetime = 1800;
		compose = '';
		host = '';
		port = null;
		connType = 'TCP';
		envVars = [];
		hashDomain = false;
		renewable = true;
		flags = [{ flag: '', regex: false }];
		attachments = [];
		activeTab = 'meta';
	}
</script>

<Dialog.Root
	bind:open
	onOpenChange={(o) => {
		if (!o) resetForm();
	}}
>
	<Dialog.Overlay />
	<Dialog.Content class="block max-h-[95vh] overflow-hidden p-0 sm:max-w-[800px]">
		<Dialog.Header class="px-6 pb-2 pt-6">
			<Dialog.Title class="text-2xl font-black tracking-tighter uppercase">Create Challenge</Dialog.Title>
			<Dialog.Description>
				Fill in the details to deploy a new challenge to the platform.
			</Dialog.Description>
		</Dialog.Header>

		<div class="flex h-[calc(95vh-140px)] flex-col">
			<!-- Tab Navigation -->
			<div class="border-muted bg-muted/20 flex border-b px-6">
				{#each ['meta', 'deployment', 'flags', 'attachments'] as tab}
					<button
						type="button"
						class="border-b-2 px-4 py-3 text-sm font-bold uppercase tracking-widest transition-all {activeTab ===
						tab
							? 'border-primary text-primary'
							: 'text-muted-foreground hover:text-foreground border-transparent'}"
						onclick={() => (activeTab = tab as any)}
					>
						{tab}
					</button>
				{/each}
			</div>

			<form onsubmit={submitCreateChallenge} class="flex flex-1 flex-col overflow-hidden">
				<div class="flex-1 space-y-6 overflow-y-auto p-6">
					{#if activeTab === 'meta'}
						<div class="space-y-6">
							<div class="grid gap-4">
								<div>
									<Label
										for="name"
										class="text-muted-foreground mb-2 block text-sm font-bold uppercase tracking-wider"
										>Name</Label
									>
									<Input
										id="name"
										type="text"
										bind:value={challengeName}
										required
										placeholder="Enter challenge name"
									/>
								</div>
								<div>
									<Label
										for="description"
										class="text-muted-foreground mb-2 block text-sm font-bold uppercase tracking-wider"
										>Description</Label
									>
									<Textarea
										id="description"
										bind:value={challengeDescription}
										class="min-h-32"
										placeholder="Write the challenge prompt (optional)..."
									/>
								</div>
							</div>

							<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
								<div class="space-y-4">
									<div>
										<Label
											class="text-muted-foreground mb-2 block text-sm font-bold uppercase tracking-wider"
											>Category</Label
										>
										<MultiSelect
											items={categories}
											bind:value={category}
											placeholder="Select category..."
										/>
									</div>
									<div>
										<Label
											class="text-muted-foreground mb-2 block text-sm font-bold uppercase tracking-wider"
											>Type</Label
										>
										<MultiSelect
											items={challengeTypes}
											bind:value={challengeType}
											placeholder="Select type..."
										/>
									</div>
								</div>
								<div class="space-y-4">
									<div>
										<Label
											for="points"
											class="text-muted-foreground mb-2 block text-sm font-bold uppercase tracking-wider"
											>Initial Points</Label
										>
										<Input id="points" type="number" bind:value={points} min="0" />
									</div>
									<div
										class="bg-muted/30 mt-2 flex items-center gap-3 rounded-lg border border-dashed p-3"
									>
										<Checkbox id="dynamic" bind:checked={dynamicScore} />
										<Label
											for="dynamic"
											class="cursor-pointer text-sm font-bold uppercase tracking-wider"
											>Dynamic Scoring</Label
										>
										<Tooltip.Provider>
											<Tooltip.Root>
												<Tooltip.Trigger><Info class="h-4 w-4 opacity-50" /></Tooltip.Trigger>
												<Tooltip.Content>Points decrease as more players solve</Tooltip.Content>
											</Tooltip.Root>
										</Tooltip.Provider>
									</div>
								</div>
							</div>

							<div>
								<Label
									class="text-muted-foreground mb-2 block text-sm font-bold uppercase tracking-wider"
									>Tags</Label
								>
								<TagMultiSelect
									bind:value={tags}
									placeholder="Add keywords (e.g. pwn, web, easy)..."
								/>
							</div>
						</div>
					{:else if activeTab === 'deployment'}
						<div class="space-y-6">
							<!-- Container/Compose Specifics -->
							{#if challengeType === 'Container' || challengeType === 'Compose'}
								<div class="bg-muted/30 space-y-4 rounded-xl border p-5">
									<h4
										class="text-primary/70 flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em]"
									>
										<Plus class="h-3 w-3" /> Docker Configuration
									</h4>
									{#if challengeType === 'Container'}
										<div>
											<Label for="image" class="mb-2 block text-sm font-bold">Image Name</Label>
											<Input
												id="image"
												bind:value={image}
												placeholder="e.g. nginx:latest"
												class="font-mono text-sm"
											/>
										</div>
									{:else}
										<div>
											<Label for="compose" class="mb-2 block text-sm font-bold"
												>Compose File (YAML)</Label
											>
											<Textarea
												id="compose"
												bind:value={compose}
												placeholder="services: ..."
												class="min-h-64 font-mono text-xs"
											/>
										</div>
									{/if}
									<div class="flex flex-wrap items-center gap-6">
										<div class="flex-1">
											<Label for="lifetime" class="mb-2 block text-sm font-bold"
												>Instance Lifetime (s)</Label
											>
											<Input id="lifetime" type="number" bind:value={lifetime} />
										</div>
										<div class="flex flex-col gap-3 pt-6">
											<div class="flex items-center gap-2">
												<Checkbox id="hash-domain" bind:checked={hashDomain} />
												<Label for="hash-domain" class="text-xs font-bold uppercase cursor-pointer">Hash Domain</Label>
											</div>
											<div class="flex items-center gap-2">
												<Checkbox id="renewable" bind:checked={renewable} />
												<Label for="renewable" class="text-xs font-bold uppercase cursor-pointer">Renewable</Label>
											</div>
										</div>
									</div>
								</div>

								<!-- Env Vars -->
								<div class="space-y-4 border-t pt-4">
									<div class="flex items-center justify-between">
										<Label class="text-muted-foreground text-sm font-bold uppercase tracking-wider"
											>Environment Variables</Label
										>
										<Button
											type="button"
											variant="outline"
											size="sm"
											onclick={() => (envVars = [...envVars, { name: '', value: '' }])}
										>
											Add Variable
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
							{/if}

							<!-- Static Connection Info -->
							<div class="space-y-4 border-t pt-4">
								<h4 class="text-muted-foreground text-xs font-black uppercase tracking-[0.2em]">
									Connection Details
								</h4>
								<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
									<div class="md:col-span-2">
										<Label for="host" class="mb-2 block text-sm font-bold">Static Host</Label>
										<Input id="host" bind:value={host} placeholder="e.g. challenge.com" />
									</div>
									<div>
										<Label for="port" class="mb-2 block text-sm font-bold">Static Port</Label>
										<Input id="port" type="number" bind:value={port} placeholder="31337" />
									</div>
								</div>
								<div>
									<Label for="connType" class="mb-2 block text-sm font-bold">Connection Type</Label>
									<select
										id="connType"
										bind:value={connType}
										class="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
									>
										<option value="TCP">TCP</option>
										<option value="HTTP">HTTP</option>
										<option value="HTTPS">HTTPS</option>
									</select>
								</div>
							</div>
						</div>
					{:else if activeTab === 'flags'}
						<div class="space-y-6">
							<div class="flex items-center justify-between">
								<h4 class="text-muted-foreground text-sm font-bold uppercase tracking-wider">
									Flags
								</h4>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onclick={() => (flags = [...flags, { flag: '', regex: false }])}
								>
									Add Flag
								</Button>
							</div>
							<div class="space-y-3">
								{#each flags as f, i}
									<div class="bg-muted/20 flex items-center gap-3 rounded-xl border p-4">
										<div class="flex-1">
											<Input bind:value={f.flag} placeholder={'TRX{...}'} class="font-mono" />
										</div>
										<div class="flex items-center gap-2 border-l border-r px-3">
											<Checkbox id={'re-' + i} bind:checked={f.regex} />
											<Label for={'re-' + i} class="whitespace-nowrap text-xs font-bold"
												>Regex</Label
											>
										</div>
										<Button
											type="button"
											variant="ghost"
											size="icon"
											class="text-destructive h-10 w-10"
											onclick={() => (flags = flags.filter((_, idx) => idx !== i))}
										>
											<X class="h-4 w-4" />
										</Button>
									</div>
								{/each}
							</div>
						</div>
					{:else if activeTab === 'attachments'}
						<div class="space-y-6">
							<div
								role="button"
								tabindex="0"
								class="border-muted hover:border-primary hover:bg-primary/5 group rounded-2xl border-2 border-dashed p-12 text-center transition-all"
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
								<h4 class="mb-1 text-lg font-bold">Upload Attachments</h4>
								<p class="text-muted-foreground text-sm">
									Drag and drop files here, or click to browse
								</p>
							</div>

							{#if attachments.length > 0}
								<div class="space-y-2">
									<h5 class="text-muted-foreground text-xs font-black uppercase tracking-[0.2em]">
										Selected Files ({attachments.length})
									</h5>
									<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
													class="text-destructive h-7 w-7 opacity-0 transition-all group-hover:opacity-100"
													onclick={() => removeFile(i)}
												>
													<X class="h-3 w-3" />
												</Button>
											</div>
										{/each}
									</div>
								</div>
							{/if}
						</div>
					{/if}
				</div>

				<div class="bg-muted/10 flex justify-end gap-3 border-t p-6">
					<Dialog.Close>
						<Button
							variant="outline"
							type="button"
							class="px-6 text-[10px] font-bold uppercase tracking-widest">Cancel</Button
						>
					</Dialog.Close>
					<Button
						type="submit"
						disabled={createLoading}
						class="min-w-[120px] px-8 text-[10px] font-bold uppercase tracking-widest"
					>
						{#if createLoading}
							<Spinner class="mr-2" /> Creating...
						{:else}
							Create Challenge
						{/if}
					</Button>
				</div>
			</form>
		</div>
	</Dialog.Content>
</Dialog.Root>
