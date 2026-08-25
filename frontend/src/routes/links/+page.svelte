<script lang="ts">
import { onMount } from 'svelte'
import SiteHeader from '$lib/components/SiteHeader.svelte'
import { SITE_ORIGIN } from '$lib/site'
import {
	getSavedThemeMode,
	type ResolvedTheme,
	resolveThemeMode,
	saveThemeMode,
	type ThemeMode,
	watchSystemTheme,
} from '$lib/theme'
import type { PageData } from './$types'

let { data }: { data: PageData } = $props()

let themeMode = $state<ThemeMode>('auto')
let resolvedTheme = $state<ResolvedTheme>('light')

onMount(() => {
	themeMode = getSavedThemeMode()
	resolvedTheme = resolveThemeMode(themeMode)

	return watchSystemTheme((systemTheme) => {
		if (themeMode === 'auto') {
			resolvedTheme = systemTheme
		}
	})
})

function setThemeMode(mode: ThemeMode) {
	themeMode = mode
	resolvedTheme = resolveThemeMode(mode)
	saveThemeMode(mode)
}

function formatHost(value: string) {
	try {
		return new URL(value).host.replace(/^www\./, '')
	} catch {
		return value
	}
}
</script>

<svelte:head>
	<title>友情链接 | ZZULI.dev</title>
	<link rel="canonical" href={`${SITE_ORIGIN}/links`} />
</svelte:head>

<div
	class:dark={resolvedTheme === 'dark'}
	class="min-h-screen bg-[#f3f5f7] text-[#202124] selection:bg-[#7dd3fc]/30 dark:bg-[#111418] dark:text-[#e8eaed]"
>
	<SiteHeader
		onThemeModeChange={setThemeMode}
		{resolvedTheme}
		searchItems={data.searchIndex}
		showArticlesLink
		showProjectsLink
		subtitle="开发者社区"
		{themeMode}
	/>

	<main class="mx-auto max-w-4xl px-4 py-5 sm:px-6">
		<section class="overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(31,35,40,0.08)] dark:bg-[#15191f] dark:shadow-[0_1px_3px_rgba(0,0,0,0.35)]">
			<div class="flex items-center justify-between gap-3 px-4 py-3 shadow-[0_1px_0_rgba(31,35,40,0.08)] dark:shadow-[0_1px_0_rgba(255,255,255,0.08)]">
				<div class="min-w-0">
					<h1 class="text-base font-semibold">友情链接</h1>
					<p class="mt-0.5 truncate text-xs text-[#6b7280] dark:text-[#9aa4b2]">
						{data.friendLinks.length} 个站点
					</p>
				</div>
			</div>

			{#if data.friendLinks.length === 0}
				<div class="px-5 py-12 text-center text-sm text-[#6b7280] dark:text-[#9aa4b2]">
					暂无友情链接
				</div>
			{:else}
				<div>
					{#each data.friendLinks as link}
						<a
							href={link.url}
							target="_blank"
							rel="noopener noreferrer"
							class="group flex gap-3 px-4 py-4 shadow-[0_1px_0_rgba(31,35,40,0.07)] last:shadow-none hover:bg-[#f8fafc] dark:shadow-[0_1px_0_rgba(255,255,255,0.07)] dark:hover:bg-[#1b2129]"
						>
							{#if link.avatar}
								<img
									src={link.avatar}
									alt={link.name}
									class="mt-0.5 h-11 w-11 shrink-0 rounded-xl bg-[#eef2f7] object-cover p-1 dark:bg-[#202631]"
									loading="lazy"
									decoding="async"
								/>
							{:else}
								<div class="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eef2f7] text-sm font-semibold text-[#6b7280] dark:bg-[#202631] dark:text-[#9aa4b2]">
									{link.name.charAt(0).toUpperCase()}
								</div>
							{/if}

							<div class="min-w-0 flex-1">
								<div class="flex items-start justify-between gap-3">
									<div class="min-w-0">
										<h2 class="line-clamp-1 text-sm font-semibold text-[#1d4ed8] group-hover:text-[#0f3a9c] dark:text-[#80bfff] dark:group-hover:text-[#a7d5ff]">
											{link.name}
										</h2>
										<p class="mt-0.5 truncate text-xs text-[#6b7280] dark:text-[#9aa4b2]">
											{formatHost(link.url)}
										</p>
									</div>
									<svg class="mt-0.5 h-4 w-4 shrink-0 text-[#6b7280] dark:text-[#9aa4b2]" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
										<path d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06Z"></path>
									</svg>
								</div>

								{#if link.description}
									<p class="mt-1.5 line-clamp-2 text-xs leading-5 text-[#6b7280] dark:text-[#9aa4b2]">
										{link.description}
									</p>
								{/if}
							</div>
						</a>
					{/each}
				</div>
			{/if}
		</section>
	</main>
</div>
