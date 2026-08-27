<script lang="ts">
	import Seo from '$lib/components/Seo.svelte'
	import { SITE_NAME } from '$lib/site'

	const TITLE = `页面不存在 | ${SITE_NAME}`
	const DESCRIPTION = '这个页面没有被 ZZULI.dev 收录，可能已经移动或不存在。'
</script>

<Seo
	description={DESCRIPTION}
	path="/404"
	robots="noindex, follow"
	title={TITLE}
/>

<main
	class="flex min-h-screen items-center justify-center bg-[#f3f5f7] px-4 text-[#202124] selection:bg-[#7dd3fc]/30"
>
	<section class="w-full max-w-sm text-center">
		<a
			href="/"
			class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-[0_1px_3px_rgba(31,35,40,0.08)]"
			aria-label="返回首页"
		>
			<img
				src="/logo.webp"
				alt="ZZULI"
				class="h-10 w-10 rounded-xl bg-white object-contain p-1"
			/>
		</a>
		<h1 class="mt-6 text-xl font-semibold">页面不存在</h1>
		<p class="mt-2 text-sm leading-6 text-[#6b7280]">
			这个页面可能已经移动，或者还没有被收录。
		</p>
		<a
			href="/"
			class="mt-6 inline-flex items-center rounded-full bg-[#eef6ff] px-4 py-2 text-sm font-medium text-[#0969da] hover:bg-[#ddf4ff]"
		>
			返回首页
		</a>
	</section>
</main>
