<script lang="ts">
	import ChallengeForm from '$lib/components/admin/ChallengeForm.svelte';
	import { updateChallenge, uploadAttachments, deleteAttachments } from '$lib/challenges';
	import { createFlags, deleteFlags } from '$lib/flags';
	import { page } from '$app/stores';
	import type { Challenge } from '$lib/types';

	let { data }: { data: { challenge: Challenge } } = $props();
</script>

<ChallengeForm
	mode="edit"
	challenge={data.challenge}
	challId={Number($page.params.id)}
	onUpdate={updateChallenge}
	onCreateFlags={createFlags}
	onDeleteFlags={deleteFlags}
	onUploadAttachments={uploadAttachments}
	onDeleteAttachments={deleteAttachments}
/>
