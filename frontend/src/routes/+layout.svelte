<script lang="ts">
	import '../app.css'
	import type { Snippet } from 'svelte'
	import { SITE_LOGO_PATH } from '$lib/site'

	let { children }: { children: Snippet } = $props()
</script>

<svelte:head>
	<link rel="icon" href={SITE_LOGO_PATH} type="image/webp" />
</svelte:head>

{@render children()}
