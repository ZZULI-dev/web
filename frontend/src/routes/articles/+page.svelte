<script lang="ts">
import { onMount } from 'svelte'
import SiteHeader from '$lib/components/SiteHeader.svelte'
import { formatPostDate } from '$lib/format'
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
let groupBy = $state<'time' | 'author'>('time')
let showCount = $state(50)
let loadMoreTrigger = $state<HTMLDivElement | null>(null)
let expandedAuthors = $state(new Set<string>())

// Use a stable Map to avoid re-computation issues
const alumniByName = $derived.by(() => {
	const map = new Map<string, (typeof data.alumni)[0]>()
	for (const person of data.alumni) {
		map.set(person.nickname, person)
	}
	return map
})

const filteredPosts = $derived.by(() => {
	if (!searchTerm.trim()) {
		return data.blogPosts
	}
	const term = searchTerm.toLowerCase()
	return data.blogPosts.filter(
		(post) =>
			post.title.toLowerCase().includes(term) ||
			post.sourceName.toLowerCase().includes(term) ||
			post.sourceSiteName?.toLowerCase().includes(term),
	)
})

// For time grouping: use pagination
const displayedPosts = $derived(
	groupBy === 'time' ? filteredPosts.slice(0, showCount) : filteredPosts,
)
const hasMore = $derived(groupBy === 'time' && filteredPosts.length > showCount)

const groupedPosts = $derived.by(() => {
	if (groupBy === 'author') {
		const groups = new Map<string, typeof filteredPosts>()
		for (const post of filteredPosts) {
			const author = post.sourceName
			if (!groups.has(author)) {
				groups.set(author, [])
			}
			groups.get(author)!.push(post)
		}
		return Array.from(groups.entries())
			.map(([author, posts]) => {
				// Get the latest post date for this author
				const latestDate = posts.reduce((latest, post) => {
					if (!post.publishedAt) return latest
					const date = new Date(post.publishedAt)
					return date > latest ? date : latest
				}, new Date(0))
				return { label: author, posts, latestDate }
			})
			.sort((a, b) => b.latestDate.getTime() - a.latestDate.getTime())
	} else {
		const now = new Date()
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
		const yesterday = new Date(today.getTime() - 86400000)
		const thisWeek = new Date(today.getTime() - 7 * 86400000)

		const groups = {
			今天: [] as typeof filteredPosts,
			昨天: [] as typeof filteredPosts,
			本周: [] as typeof filteredPosts,
			更早: [] as typeof filteredPosts,
		}

		for (const post of displayedPosts) {
			const date = post.publishedAt ? new Date(post.publishedAt) : null
			if (!date) {
				groups['更早'].push(post)
			} else if (date >= today) {
				groups['今天'].push(post)
			} else if (date >= yesterday) {
				groups['昨天'].push(post)
			} else if (date >= thisWeek) {
				groups['本周'].push(post)
			} else {
				groups['更早'].push(post)
			}
		}

		return Object.entries(groups)
			.filter(([_, posts]) => posts.length > 0)
			.map(([label, posts]) => ({ label, posts }))
	}
})

$effect(() => {
	// Reset scroll count when search term or group changes
	searchTerm
	groupBy
	showCount = 50
	expandedAuthors = new Set()
})

onMount(() => {
	themeMode = getSavedThemeMode()
	resolvedTheme = resolveThemeMode(themeMode)

	const unwatch = watchSystemTheme((systemTheme) => {
		if (themeMode === 'auto') {
			resolvedTheme = systemTheme
		}
	})

	// Intersection Observer for infinite scroll
	const observer = new IntersectionObserver(
		(entries) => {
			if (entries[0].isIntersecting && hasMore) {
				showCount += 50
			}
		},
		{ rootMargin: '200px' },
	)

	if (loadMoreTrigger) {
		observer.observe(loadMoreTrigger)
	}

	return () => {
		unwatch()
		observer.disconnect()
	}
})

function setThemeMode(mode: ThemeMode) {
	themeMode = mode
	resolvedTheme = resolveThemeMode(mode)
	saveThemeMode(mode)
}

function getPostAvatar(sourceName: string): string | null {
	return alumniByName.get(sourceName)?.avatar ?? null
}

function toggleAuthor(author: string) {
	const newSet = new Set(expandedAuthors)
	if (newSet.has(author)) {
		newSet.delete(author)
	} else {
		newSet.add(author)
	}
	expandedAuthors = newSet
}

const INITIAL_AUTHOR_POSTS = 5
</script>

<svelte:head>
	<title>文章列表 | ZZULI.dev</title>
	<link rel="canonical" href={`${SITE_ORIGIN}/articles`} />
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
					<h1 class="sr-only">文章列表</h1>
					<label class="block min-w-0 flex-1">
						<span class="sr-only">搜索文章</span>
						<input
							type="search"
							bind:value={searchTerm}
							placeholder="搜索标题或作者"
							class="h-10 w-full rounded-full bg-[#f3f5f7] px-4 text-base outline-none ring-1 ring-transparent focus:ring-[#7dd3fc] sm:text-sm dark:bg-[#202631]"
						/>
					</label>
					<div class="flex h-10 shrink-0 items-center gap-1 rounded-full bg-[#f3f5f7] p-1 dark:bg-[#202631]">
						<button
							onclick={() => (groupBy = 'time')}
							class="h-8 rounded-full px-3 text-xs font-medium transition-colors {groupBy === 'time'
								? 'bg-white text-[#202124] shadow-sm dark:bg-[#2b3139] dark:text-[#e8eaed]'
								: 'text-[#6b7280] hover:text-[#202124] dark:text-[#9aa4b2] dark:hover:text-[#e8eaed]'}"
						>
							时间
						</button>
						<button
							onclick={() => (groupBy = 'author')}
							class="h-8 rounded-full px-3 text-xs font-medium transition-colors {groupBy === 'author'
								? 'bg-white text-[#202124] shadow-sm dark:bg-[#2b3139] dark:text-[#e8eaed]'
								: 'text-[#6b7280] hover:text-[#202124] dark:text-[#9aa4b2] dark:hover:text-[#e8eaed]'}"
						>
							作者
						</button>
					</div>
				</div>
			</div>

			{#if displayedPosts.length === 0}
				<div class="px-5 py-12 text-center text-sm text-[#6b7280] dark:text-[#9aa4b2]">
					{searchTerm ? '未找到匹配的文章' : '暂无文章'}
				</div>
			{:else}
				{#each groupedPosts as group}
					{@const isExpanded = expandedAuthors.has(group.label)}
					{@const displayPosts = groupBy === 'author' && !isExpanded ? group.posts.slice(0, INITIAL_AUTHOR_POSTS) : group.posts}
					{@const hasMorePosts = groupBy === 'author' && group.posts.length > INITIAL_AUTHOR_POSTS}
					<div>
						<div class="sticky top-14 z-10 bg-[#f8fafc] px-4 py-2 dark:bg-[#1b2129]">
							<h2 class="text-xs font-semibold tracking-wide text-[#6b7280] dark:text-[#9aa4b2]">
								{group.label}
								<span class="ml-1 font-normal">({group.posts.length})</span>
							</h2>
						</div>
						<div>
							{#each displayPosts as post}
								<a
									href={post.url}
									target="_blank"
									rel="noopener noreferrer"
									class="group flex gap-3 px-4 py-3 shadow-[0_1px_0_rgba(31,35,40,0.07)] last:shadow-none hover:bg-[#f8fafc] dark:shadow-[0_1px_0_rgba(255,255,255,0.07)] dark:hover:bg-[#1b2129]"
								>
									{#if getPostAvatar(post.sourceName)}
										<img
											src={getPostAvatar(post.sourceName)}
											alt={post.sourceName}
											class="h-10 w-10 shrink-0 rounded-xl bg-[#eef2f7] object-cover dark:bg-[#202631]"
											loading="lazy"
											decoding="async"
											referrerpolicy="no-referrer"
										/>
									{:else}
										<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eef6ff] text-sm font-semibold text-[#0969da] dark:bg-[#10233a] dark:text-[#7cc4ff]">
											文
										</div>
									{/if}

									<div class="min-w-0 flex-1">
										<h3 class="line-clamp-2 text-[15px] font-semibold leading-6 text-[#1d4ed8] group-hover:text-[#0f3a9c] dark:text-[#80bfff] dark:group-hover:text-[#a7d5ff]">
											{post.title}
										</h3>
										<div class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#6b7280] dark:text-[#9aa4b2]">
											{#if groupBy === 'time'}
												<span class="font-medium text-[#374151] dark:text-[#cbd5e1]">{post.sourceName}</span>
											{/if}
											<span>{formatPostDate(post.publishedAt)}</span>
											{#if post.discoveredBy === 'feed'}
												<span class="inline-flex items-center gap-1">
													<svg class="h-3 w-3" viewBox="0 0 16 16" fill="currentColor">
														<path d="M2 3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3zm1 0v10h10V3H3z"></path>
														<path d="M5 5h6v1H5V5zm0 2h6v1H5V7zm0 2h4v1H5V9z"></path>
													</svg>
													RSS
												</span>
											{/if}
										</div>
									</div>
								</a>
							{/each}

							{#if hasMorePosts}
								<button
									type="button"
									onclick={() => toggleAuthor(group.label)}
									class="w-full px-4 py-3 text-left text-sm font-medium text-[#0969da] shadow-[0_1px_0_rgba(31,35,40,0.07)] hover:bg-[#f8fafc] dark:text-[#7cc4ff] dark:shadow-[0_1px_0_rgba(255,255,255,0.07)] dark:hover:bg-[#1b2129]"
								>
									<div class="flex items-center justify-center gap-2">
										<svg class="h-4 w-4 transition-transform {isExpanded ? 'rotate-180' : ''}" viewBox="0 0 16 16" fill="currentColor">
											<path d="M8 12a.75.75 0 0 1-.53-.22l-3.5-3.5a.75.75 0 0 1 1.06-1.06L8 10.19l2.97-2.97a.75.75 0 1 1 1.06 1.06l-3.5 3.5A.75.75 0 0 1 8 12Z"></path>
										</svg>
										<span>{isExpanded ? '收起' : `展开全部 ${group.posts.length} 篇`}</span>
									</div>
								</button>
							{/if}
						</div>
					</div>
				{/each}

				{#if hasMore}
					<div bind:this={loadMoreTrigger} class="px-4 py-4 text-center shadow-[0_-1px_0_rgba(31,35,40,0.07)] dark:shadow-[0_-1px_0_rgba(255,255,255,0.07)]">
						<div class="inline-flex items-center gap-2 text-sm text-[#6b7280] dark:text-[#9aa4b2]">
							<svg class="h-4 w-4 animate-pulse" viewBox="0 0 16 16" fill="currentColor">
								<path d="M8 12a.75.75 0 0 1-.53-.22l-3.5-3.5a.75.75 0 0 1 1.06-1.06L8 10.19l2.97-2.97a.75.75 0 1 1 1.06 1.06l-3.5 3.5A.75.75 0 0 1 8 12Z"></path>
							</svg>
							<span>加载中...</span>
						</div>
					</div>
				{/if}
			{/if}
		</section>
	</main>

</div>
