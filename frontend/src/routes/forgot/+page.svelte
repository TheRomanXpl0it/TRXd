<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { ArrowLeft, KeyRound, UserPlus } from '@lucide/svelte';
</script>

<div class="flex min-h-[80vh] items-center justify-center px-4 py-12">
	<Card.Root
		class="bg-card/50 mx-auto w-full max-w-md border-0 shadow-xl backdrop-blur-sm sm:max-w-[420px]"
	>
		<div class="p-8 pb-0">
			<Card.Header class="space-y-2 p-0 text-center">
				<div
					class="bg-primary/10 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
				>
					<KeyRound class="text-primary h-6 w-6" />
				</div>
				<Card.Title class="text-2xl font-bold tracking-tight">Forgot your password?</Card.Title>
				<Card.Description class="text-base">
					Automatic password recovery is not available yet.
				</Card.Description>
			</Card.Header>
		</div>

		<Card.Content class="space-y-6 p-8 pt-6">
			<div class="bg-muted/40 text-muted-foreground rounded-lg border px-4 py-3 text-sm">
				Use the email address tied to your account and contact the event organizer or platform
				administrator to reset your password.
			</div>

			<div class="grid gap-3 sm:grid-cols-2">
				<Button href="/signIn" variant="outline" class="w-full">
					<ArrowLeft class="h-4 w-4" />
					Back to sign in
				</Button>
				<Button href="/signUp" class="w-full">
					<UserPlus class="h-4 w-4" />
					Create account
				</Button>
			</div>
		</Card.Content>
	</Card.Root>
</div>
