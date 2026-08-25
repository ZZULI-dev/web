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
let searchTerm = $state('')

let normalizedSearch = $derived(searchTerm.trim().toLowerCase())
let filteredProjects = $derived(
	data.projects.filter((project) => {
		if (!normalizedSearch) return true

		return [
			project.name,
			project.description,
			project.url,
			project.author.name,
			project.author.github,
			...project.languages.map((language) => language.name),
			project.submittedAt,
		]
			.filter((value): value is string => Boolean(value))
			.some((value) => value.toLowerCase().includes(normalizedSearch))
	}),
)

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

function formatProjectDate(value: string | null): string {
	if (!value) return '收录时间未知'

	const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
	if (!match) return value.replace(/-/g, '.')

	const [, year, month, day] = match
	return Number(year) === new Date().getFullYear()
		? `${month}.${day}`
		: `${year}.${month}.${day}`
}
</script>

<svelte:head>
	<title>项目列表 | ZZULI.dev</title>
	<link rel="canonical" href={`${SITE_ORIGIN}/projects`} />
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
			<div class="px-4 py-3 shadow-[0_1px_0_rgba(31,35,40,0.08)] dark:shadow-[0_1px_0_rgba(255,255,255,0.08)]">
				<div class="flex items-center gap-2">
					<h1 class="sr-only">项目列表</h1>
					<label class="block min-w-0 flex-1">
						<span class="sr-only">搜索项目</span>
						<input
							type="search"
							bind:value={searchTerm}
							placeholder="搜索项目、作者或语言"
							class="h-10 w-full rounded-full bg-[#f3f5f7] px-4 text-base outline-none ring-1 ring-transparent focus:ring-[#7dd3fc] sm:text-sm dark:bg-[#202631]"
						/>
					</label>
					<a
						href="https://github.com/dogxii/ZZULI.dev/issues/new?template=submit-project.yml"
						target="_blank"
						rel="noopener noreferrer"
						class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#eef6ff] text-[#0969da] hover:bg-[#ddf4ff] dark:bg-[#10233a] dark:text-[#7cc4ff] dark:hover:bg-[#17314f]"
						aria-label="提交项目"
						title="提交项目"
					>
						<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
							<path d="M5 12h14M12 5v14" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
						</svg>
					</a>
				</div>
			</div>

			{#if filteredProjects.length === 0}
				<div class="px-5 py-12 text-center text-sm text-[#6b7280] dark:text-[#9aa4b2]">
					未找到匹配的项目
				</div>
			{:else}
				<div>
					{#each filteredProjects as project}
						<a
							href={project.url}
							target="_blank"
							rel="noopener noreferrer"
							class="group flex gap-3 px-4 py-4 shadow-[0_1px_0_rgba(31,35,40,0.07)] last:shadow-none hover:bg-[#f8fafc] dark:shadow-[0_1px_0_rgba(255,255,255,0.07)] dark:hover:bg-[#1b2129]"
						>
							{#if project.author.avatar}
								<img
									src={project.author.avatar}
									alt={project.author.name}
									class="mt-0.5 h-10 w-10 shrink-0 rounded-full bg-[#eef2f7] object-cover dark:bg-[#202631]"
									loading="lazy"
									decoding="async"
									referrerpolicy="no-referrer"
								/>
							{:else}
								<div class="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#eef2f7] text-sm font-semibold text-[#6b7280] dark:bg-[#202631] dark:text-[#9aa4b2]">
									{project.author.name.charAt(0).toUpperCase()}
								</div>
							{/if}

							<div class="min-w-0 flex-1">
								<div class="flex items-start justify-between gap-3">
									<div class="min-w-0">
										<h2 class="line-clamp-1 text-sm font-semibold text-[#1d4ed8] group-hover:text-[#0f3a9c] dark:text-[#80bfff] dark:group-hover:text-[#a7d5ff]">
											{project.name}
										</h2>
									</div>
									<svg class="mt-0.5 h-4 w-4 shrink-0 text-[#6b7280] dark:text-[#9aa4b2]" viewBox="0 0 16 16" fill="currentColor">
										<path d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06Z"></path>
									</svg>
								</div>

								<p class="mt-1.5 line-clamp-2 text-xs leading-5 text-[#6b7280] dark:text-[#9aa4b2]">
									{project.description}
								</p>

								<div class="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#6b7280] dark:text-[#9aa4b2]">
									<span>{project.author.github ? `@${project.author.github}` : project.author.name}</span>
									{#each project.languages as language}
										<span aria-hidden="true">·</span>
										<span class="inline-flex items-center gap-1.5">
											<span
												class="h-2.5 w-2.5 rounded-full"
												style={`background-color: ${language.color};`}
											></span>
											{language.name}
										</span>
									{/each}
									<span aria-hidden="true">·</span>
									<span>{formatProjectDate(project.submittedAt)}</span>
								</div>
							</div>
						</a>
					{/each}
				</div>
			{/if}
		</section>
	</main>

</div>
