<script lang="ts">
import { onMount } from 'svelte'
import SiteHeader from '$lib/components/SiteHeader.svelte'
import { formatGeneratedAt, formatPostDate } from '$lib/format'
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
	<title>{data.person.nickname} | ZZULI.dev</title>
</svelte:head>

<div
	class:dark={resolvedTheme === 'dark'}
	class="min-h-screen bg-[#f3f5f7] text-[#202124] selection:bg-[#7dd3fc]/30 dark:bg-[#111418] dark:text-[#e8eaed]"
>
	<SiteHeader
		onThemeModeChange={setThemeMode}
		{resolvedTheme}
		showArticlesLink
		showProjectsLink
		subtitle="开发者社区"
		{themeMode}
	/>

	<main class="mx-auto max-w-5xl space-y-5 px-4 py-5 sm:px-6">
		<section class="overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(31,35,40,0.08)] dark:bg-[#15191f] dark:shadow-[0_1px_3px_rgba(0,0,0,0.35)]">
			<div class="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center">
				<img
					src={data.person.avatar}
					alt={data.person.nickname}
					class="h-20 w-20 rounded-2xl bg-[#eef2f7] object-cover dark:bg-[#202631]"
					loading="eager"
					decoding="async"
					referrerpolicy="no-referrer"
				/>
				<div class="min-w-0 flex-1">
					<h1 class="truncate text-2xl font-semibold">{data.person.nickname}</h1>
					<p class="mt-1 text-sm text-[#6b7280] dark:text-[#9aa4b2]">
						@{data.person.github.username}
					</p>
					<div class="mt-4 flex flex-wrap gap-2">
						<a
							href={data.person.github.url}
							target="_blank"
							rel="noopener noreferrer"
							class="rounded-full bg-[#f3f5f7] px-3 py-1.5 text-sm hover:bg-[#e5eaf0] dark:bg-[#202631] dark:hover:bg-[#2a3340]"
						>
							GitHub
						</a>
						{#if data.person.blog?.url}
							<a
								href={data.person.blog.url}
								target="_blank"
								rel="noopener noreferrer"
								class="max-w-64 truncate rounded-full bg-[#eef6ff] px-3 py-1.5 text-sm text-[#0969da] hover:bg-[#ddf4ff] dark:bg-[#10233a] dark:text-[#7cc4ff] dark:hover:bg-[#17314f]"
							>
								{data.person.blog.name}
							</a>
						{/if}
					</div>
				</div>
			</div>
		</section>

		<section class="overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(31,35,40,0.08)] dark:bg-[#15191f] dark:shadow-[0_1px_3px_rgba(0,0,0,0.35)]">
			<div class="flex items-center justify-between gap-3 px-4 py-3 shadow-[0_1px_0_rgba(31,35,40,0.08)] dark:shadow-[0_1px_0_rgba(255,255,255,0.08)]">
				<h2 class="text-sm font-semibold">项目</h2>
				<span class="text-xs text-[#6b7280] dark:text-[#9aa4b2]">{data.projects.length}</span>
			</div>
			{#if data.projects.length === 0}
				<div class="px-5 py-8 text-sm text-[#6b7280] dark:text-[#9aa4b2]">
					暂无收录项目
				</div>
			{:else}
				<div>
					{#each data.projects as project}
						<a
							href={project.url}
							target="_blank"
							rel="noopener noreferrer"
							class="group block px-4 py-4 shadow-[0_1px_0_rgba(31,35,40,0.07)] last:shadow-none hover:bg-[#f8fafc] dark:shadow-[0_1px_0_rgba(255,255,255,0.07)] dark:hover:bg-[#1b2129]"
						>
							<h3 class="line-clamp-1 text-sm font-semibold text-[#1d4ed8] group-hover:text-[#0f3a9c] dark:text-[#80bfff] dark:group-hover:text-[#a7d5ff]">
								{project.name}
							</h3>
							<p class="mt-1.5 line-clamp-2 text-xs leading-5 text-[#6b7280] dark:text-[#9aa4b2]">
								{project.description}
							</p>
							<div class="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#6b7280] dark:text-[#9aa4b2]">
								{#each project.languages as language, index}
									{#if index > 0}
										<span aria-hidden="true">·</span>
									{/if}
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
						</a>
					{/each}
				</div>
			{/if}
		</section>

		<section class="overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(31,35,40,0.08)] dark:bg-[#15191f] dark:shadow-[0_1px_3px_rgba(0,0,0,0.35)]">
			<div class="flex items-center justify-between gap-3 px-4 py-3 shadow-[0_1px_0_rgba(31,35,40,0.08)] dark:shadow-[0_1px_0_rgba(255,255,255,0.08)]">
				<h2 class="text-sm font-semibold">文章</h2>
				<span class="text-xs text-[#6b7280] dark:text-[#9aa4b2]">
					{data.posts.length} 篇 · {formatGeneratedAt(data.blogPostsGeneratedAt)}
				</span>
			</div>
			{#if data.posts.length === 0}
				<div class="px-5 py-8 text-sm text-[#6b7280] dark:text-[#9aa4b2]">
					暂无近期文章
				</div>
			{:else}
				<div>
					{#each data.posts as post}
						<a
							href={post.url}
							target="_blank"
							rel="noopener noreferrer"
							class="group block px-4 py-3 shadow-[0_1px_0_rgba(31,35,40,0.07)] last:shadow-none hover:bg-[#f8fafc] dark:shadow-[0_1px_0_rgba(255,255,255,0.07)] dark:hover:bg-[#1b2129]"
						>
							<h3 class="line-clamp-2 text-[15px] font-semibold leading-6 text-[#1d4ed8] group-hover:text-[#0f3a9c] dark:text-[#80bfff] dark:group-hover:text-[#a7d5ff]">
								{post.title}
							</h3>
							<div class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#6b7280] dark:text-[#9aa4b2]">
								<span>{formatPostDate(post.publishedAt)}</span>
								<span>{post.discoveredBy === 'feed' ? 'RSS' : '网页'}</span>
							</div>
						</a>
					{/each}
				</div>
			{/if}
		</section>
	</main>
</div>
