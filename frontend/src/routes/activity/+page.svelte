<script lang="ts">
import { onMount } from 'svelte'
import {
	ACTIVITY_PERIODS,
	type ActivityPeriodKey,
	getActivityMemberView,
	getActivityPeriod,
	getContributionCount,
} from '$lib/activity'
import Seo from '$lib/components/Seo.svelte'
import SiteHeader from '$lib/components/SiteHeader.svelte'
import { formatGeneratedAt, formatMetric, formatPostDate } from '$lib/format'
import { absoluteUrl, compactJsonLd } from '$lib/seo'
import {
	getSavedThemeMode,
	type ResolvedTheme,
	resolveThemeMode,
	saveThemeMode,
	type ThemeMode,
	watchSystemTheme,
} from '$lib/theme'
import type { PageData } from './$types'

const ACTIVITY_TITLE = '近期活跃 | ZZULI.dev'
const ACTIVITY_STRUCTURED_MEMBER_LIMIT = 50

let { data }: { data: PageData } = $props()

let themeMode = $state<ThemeMode>('auto')
let resolvedTheme = $state<ResolvedTheme>('light')
let selectedPeriod = $state<ActivityPeriodKey>('7d')
let activityDescription = $derived(
	`查看 ZZULI 开发者 GitHub 近期活跃榜，按贡献数浏览 ${data.githubActivity.members.length} 位成员的开源动态。`,
)

let alumniByGitHub = $derived(
	new Map(data.alumni.map((person) => [person.id, person])),
)
let selectedPeriodOption = $derived(getActivityPeriod(selectedPeriod))
let activeMembers = $derived.by(() =>
	data.githubActivity.members
		.map((member) => ({
			contributions: getContributionCount(member, selectedPeriodOption.days),
			member,
		}))
		.filter((item) => item.contributions > 0)
		.sort((a, b) => {
			if (b.contributions !== a.contributions) {
				return b.contributions - a.contributions
			}
			return b.member.totalContributions - a.member.totalContributions
		}),
)
let activityJsonLd = $derived(
	compactJsonLd({
		'@type': 'CollectionPage',
		name: ACTIVITY_TITLE,
		description: activityDescription,
		url: absoluteUrl('/activity'),
		dateModified: data.githubActivity.generatedAt,
		mainEntity: compactJsonLd({
			'@type': 'ItemList',
			itemListElement: activeMembers
				.slice(0, ACTIVITY_STRUCTURED_MEMBER_LIMIT)
				.map((item, index) => {
					const activityView = getActivityMemberView(item.member, alumniByGitHub)

					return compactJsonLd({
						'@type': 'ListItem',
						position: index + 1,
						url: absoluteUrl(activityView.href),
						item: compactJsonLd({
							'@type': 'Person',
							name: activityView.displayName,
							alternateName: item.member.github,
							url: absoluteUrl(activityView.href),
							image: activityView.avatar,
							sameAs: [item.member.url],
						}),
					})
				}),
		}),
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
</script>

<Seo
	description={activityDescription}
	jsonLd={activityJsonLd}
	path="/activity"
	title={ACTIVITY_TITLE}
/>

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
			<div class="flex flex-wrap items-center justify-between gap-3 px-4 py-3 shadow-[0_1px_0_rgba(31,35,40,0.08)] dark:shadow-[0_1px_0_rgba(255,255,255,0.08)]">
				<div class="min-w-0">
					<h1 class="text-base font-semibold">近期活跃</h1>
					<p class="mt-0.5 truncate text-xs text-[#6b7280] dark:text-[#9aa4b2]">
						按 {selectedPeriodOption.label} 排序 · 截至 {formatPostDate(data.githubActivity.range.to)} · {formatGeneratedAt(data.githubActivity.generatedAt)}
					</p>
				</div>
				<div
					class="ml-auto flex h-10 shrink-0 items-center gap-1 rounded-full bg-[#f3f5f7] p-1 dark:bg-[#202631]"
					aria-label="选择榜单时段"
				>
					{#each ACTIVITY_PERIODS as period}
						<button
							type="button"
							aria-pressed={selectedPeriod === period.key}
							onclick={() => (selectedPeriod = period.key)}
							class="h-8 rounded-full px-3 text-xs font-medium transition-colors {selectedPeriod === period.key
								? 'bg-white text-[#202124] shadow-sm dark:bg-[#2b3139] dark:text-[#e8eaed]'
								: 'text-[#6b7280] hover:text-[#202124] dark:text-[#9aa4b2] dark:hover:text-[#e8eaed]'}"
						>
							{period.label}
						</button>
					{/each}
				</div>
			</div>

			{#if activeMembers.length === 0}
				<div class="px-5 py-12 text-center text-sm text-[#6b7280] dark:text-[#9aa4b2]">
					暂无 GitHub 活跃数据
				</div>
			{:else}
				<div>
					{#each activeMembers as item, index}
						{@const member = item.member}
						{@const activityView = getActivityMemberView(member, alumniByGitHub)}
						<a
							href={activityView.href}
							class="group flex gap-3 px-4 py-3 shadow-[0_1px_0_rgba(31,35,40,0.07)] last:shadow-none hover:bg-[#f8fafc] dark:shadow-[0_1px_0_rgba(255,255,255,0.07)] dark:hover:bg-[#1b2129]"
						>
							<div class="w-8 shrink-0 pt-2 text-center text-xs font-semibold text-[#6b7280] dark:text-[#9aa4b2]">
								#{index + 1}
							</div>
							<img
								src={activityView.avatar}
								alt={activityView.displayName}
								class="mt-0.5 h-10 w-10 shrink-0 rounded-xl bg-[#eef2f7] object-cover dark:bg-[#202631]"
								loading="lazy"
								decoding="async"
								referrerpolicy="no-referrer"
							/>
							<div class="min-w-0 flex-1">
								<div class="flex items-start justify-between gap-3">
									<div class="min-w-0">
										<h2 class="truncate text-sm font-semibold text-[#1d4ed8] group-hover:text-[#0f3a9c] dark:text-[#80bfff] dark:group-hover:text-[#a7d5ff]">
											{activityView.displayName}
										</h2>
										<p class="mt-0.5 truncate text-xs text-[#6b7280] dark:text-[#9aa4b2]">@{member.github}</p>
									</div>
									<div class="shrink-0 text-right">
										<p class="text-sm font-semibold">{formatMetric(item.contributions)}</p>
										<p class="mt-0.5 text-xs text-[#6b7280] dark:text-[#9aa4b2]">贡献</p>
									</div>
								</div>

							</div>
						</a>
					{/each}
				</div>
			{/if}
		</section>
	</main>
</div>
