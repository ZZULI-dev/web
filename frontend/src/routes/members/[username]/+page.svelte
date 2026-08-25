<script lang="ts">
import { onMount } from 'svelte'
import SiteHeader from '$lib/components/SiteHeader.svelte'
import { formatGeneratedAt, formatMetric, formatPostDate } from '$lib/format'
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

function formatProjectDate(value: string | null): string {
	if (!value) return '收录时间未知'

	const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
	if (!match) return value.replace(/-/g, '.')

	const [, year, month, day] = match
	return Number(year) === new Date().getFullYear()
		? `${month}.${day}`
		: `${year}.${month}.${day}`
}

function contributionTitle(
	day: NonNullable<PageData['activity']>['calendar'][number],
): string {
	return `${day.date}: ${day.count} 次贡献`
}
</script>

<svelte:head>
	<title>{data.person.nickname} | ZZULI.dev</title>
	<link rel="canonical" href={`${SITE_ORIGIN}${data.person.profilePath}`} />
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

	<main class="mx-auto max-w-4xl space-y-5 px-4 py-5 sm:px-6">
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

		{#if data.activity}
			<section class="overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(31,35,40,0.08)] dark:bg-[#15191f] dark:shadow-[0_1px_3px_rgba(0,0,0,0.35)]">
				<div class="flex flex-wrap items-center justify-between gap-3 px-4 py-3 shadow-[0_1px_0_rgba(31,35,40,0.08)] dark:shadow-[0_1px_0_rgba(255,255,255,0.08)]">
					<h2 class="text-sm font-semibold">GitHub 贡献</h2>
					<span class="text-xs text-[#6b7280] dark:text-[#9aa4b2]">
						{formatGeneratedAt(data.activity.generatedAt)}
					</span>
				</div>

				<div class="px-4 py-4">
					<div class="grid grid-cols-3 gap-4 text-sm">
						<div>
							<p class="text-lg font-semibold">{formatMetric(data.activity.todayContributions)}</p>
							<p class="mt-0.5 text-xs text-[#6b7280] dark:text-[#9aa4b2]">今日</p>
						</div>
						<div>
							<p class="text-lg font-semibold">{formatMetric(data.activity.recentContributions)}</p>
							<p class="mt-0.5 text-xs text-[#6b7280] dark:text-[#9aa4b2]">近 {data.activity.range.recentDays} 天</p>
						</div>
						<div>
							<p class="text-lg font-semibold">{formatMetric(data.activity.totalContributions)}</p>
							<p class="mt-0.5 text-xs text-[#6b7280] dark:text-[#9aa4b2]">近一年</p>
						</div>
					</div>

					{#if data.activity.calendar.length > 0}
						<div
							class="mt-4 overflow-x-auto pb-1"
							aria-label={`${data.person.nickname} 的 GitHub 贡献日历`}
						>
							<div
								class="grid grid-flow-col gap-1"
								style="grid-template-rows: repeat(7, minmax(0, 1fr));"
							>
								{#each data.activity.calendar as day}
									<span
										class="h-2.5 w-2.5 rounded-[2px] bg-[#ebedf0] dark:bg-[#202631]"
										style={`background-color: ${day.color};`}
										title={contributionTitle(day)}
										aria-label={contributionTitle(day)}
									></span>
								{/each}
							</div>
						</div>
					{/if}

					{#if data.activity.recentRepositories.length > 0}
						<div class="mt-4 grid gap-2 sm:grid-cols-2">
							{#each data.activity.recentRepositories as repo}
								<a
									href={repo.url}
									target="_blank"
									rel="noopener noreferrer"
									class="min-w-0 rounded-xl bg-[#f8fafc] px-3 py-2 hover:bg-[#eef2f7] dark:bg-[#1b2129] dark:hover:bg-[#202631]"
								>
									<p class="truncate text-sm font-medium text-[#1d4ed8] dark:text-[#80bfff]">
										{repo.nameWithOwner}
									</p>
									<div class="mt-1 flex items-center gap-2 text-xs text-[#6b7280] dark:text-[#9aa4b2]">
										{#if repo.language}
											<span class="inline-flex min-w-0 items-center gap-1.5">
												<span
													class="h-2.5 w-2.5 rounded-full"
													style={`background-color: ${repo.language.color};`}
												></span>
												<span class="truncate">{repo.language.name}</span>
											</span>
										{/if}
										<span>★ {formatMetric(repo.stars)}</span>
									</div>
								</a>
							{/each}
						</div>
					{/if}
				</div>
			</section>
		{/if}

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
