<script lang="ts">
	import ChallengeForm from '$lib/components/admin/ChallengeForm.svelte';
	import {
		createChallenge,
		getChallenges,
		updateChallenge,
		uploadAttachments
	} from '$lib/challenges';
	import { createFlags } from '$lib/flags';

	async function handleCreate(base: {
		name: string;
		category: string;
		description: string;
		instance_type: string;
		points: number;
		score_type: string;
	}): Promise<number> {
		const baseRes = await createChallenge(
			base.name,
			base.category,
			base.description,
			base.instance_type,
			base.points,
			base.score_type
		);

		let challId = baseRes?.id;
		if (!challId) {
			const all = await getChallenges();
			const newChall = all.find(
				(c) => c.name === base.name && (!c.category || c.category === base.category)
			);
			challId = newChall?.id;
		}
		if (!challId) {
			throw new Error('Challenge created, but failed to retrieve its ID.');
		}
		return challId;
	}
</script>

<ChallengeForm
	mode="create"
	onCreate={handleCreate}
	onUpdate={updateChallenge}
	onCreateFlags={createFlags}
	onUploadAttachments={uploadAttachments}
/>
