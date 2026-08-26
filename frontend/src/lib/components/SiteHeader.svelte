<script lang="ts">
import { onDestroy } from 'svelte'
import GlobalSearch from '$lib/components/GlobalSearch.svelte'
import type { SearchItem } from '$lib/search'
import { syncBrowserThemeColor, type ResolvedTheme, type ThemeMode } from '$lib/theme'

type Props = {
	brandAriaLabel?: string
	brandHref?: string
	onThemeModeChange: (mode: ThemeMode) => void
	resolvedTheme: ResolvedTheme
	showArticlesLink?: boolean
	showProjectsLink?: boolean
	searchItems?: SearchItem[]
	subtitle: string
	themeMode: ThemeMode
}

const themeLabels: Record<ThemeMode, string> = {
	auto: '跟随系统',
	dark: '暗色',
	light: '亮色',
}
const THEME_TOOLTIP_HIDE_DELAY = 650

let {
	brandAriaLabel = '返回首页',
	brandHref = '/',
	onThemeModeChange,
	resolvedTheme,
	searchItems = [],
	showArticlesLink = false,
	showProjectsLink = false,
	subtitle,
	themeMode,
}: Props = $props()

let showThemeTooltip = $state(false)
let themeTooltipMode = $state<ThemeMode>('auto')
let themeTooltipTimer: ReturnType<typeof setTimeout> | null = null
let nextThemeMode = $derived(getNextThemeMode(themeMode))
let themeTooltipLabel = $derived(themeLabels[themeTooltipMode])
let themeTooltipTheme = $derived(
	themeTooltipMode === 'auto' ? resolvedTheme : themeTooltipMode,
)
let themeTooltipClass = $derived(getThemeTooltipClass(themeTooltipTheme))
let themeButtonLabel = $derived(
	`当前主题：${themeLabels[themeMode]}，点击切换到 ${themeLabels[nextThemeMode]}`,
)

$effect(() => {
	syncBrowserThemeColor(resolvedTheme)
})

onDestroy(clearThemeTooltipTimer)

function toggleThemeMode() {
	const mode = nextThemeMode

	themeTooltipMode = mode
	onThemeModeChange(mode)
	showThemeTooltipNow()
	hideThemeTooltipSoon()
}

function getNextThemeMode(mode: ThemeMode): ThemeMode {
	if (mode === 'light') return 'dark'
	if (mode === 'dark') return 'auto'
	return 'light'
}

function getThemeTooltipClass(theme: ResolvedTheme): string {
	return theme === 'dark'
		? 'bg-[#24292f] text-white'
		: 'bg-[#fdfdfd] text-[#202124] ring-1 ring-[#d8dee4]'
}

function clearThemeTooltipTimer() {
	if (themeTooltipTimer) {
		clearTimeout(themeTooltipTimer)
		themeTooltipTimer = null
	}
}

function showThemeTooltipNow() {
	clearThemeTooltipTimer()
	showThemeTooltip = true
}

function hideThemeTooltipNow() {
	clearThemeTooltipTimer()
	showThemeTooltip = false
}

function hideThemeTooltipSoon() {
	clearThemeTooltipTimer()
	themeTooltipTimer = setTimeout(() => {
		showThemeTooltip = false
		themeTooltipTimer = null
	}, THEME_TOOLTIP_HIDE_DELAY)
}
</script>

<header class="sticky top-0 z-30 bg-[#fdfdfd]/90 shadow-[0_1px_0_rgba(31,35,40,0.08)] backdrop-blur dark:bg-[#15191f]/88 dark:shadow-[0_1px_0_rgba(255,255,255,0.08)]">
	<div class="mx-auto flex h-14 max-w-[1056px] items-center justify-between gap-3 px-4 sm:px-6">
		<a
			href={brandHref}
			class="flex min-w-0 items-center gap-3"
			aria-label={brandAriaLabel}
		>
			<img
				src="/logo.webp"
				alt="ZZULI"
				class="h-8 w-8 rounded-lg bg-white object-contain p-1 shadow-[0_0_0_1px_rgba(31,35,40,0.12)] dark:bg-[#1c2128] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.12)]"
			/>
			<div class="min-w-0">
				<p class="truncate text-sm font-semibold">ZZULI.dev</p>
				<p class="truncate text-xs text-[#6b7280] dark:text-[#9aa4b2]">{subtitle}</p>
			</div>
		</a>

		<div class="flex items-center gap-2">
			{#if searchItems.length > 0}
				<GlobalSearch items={searchItems} dark={resolvedTheme === 'dark'} />
			{/if}
			{#if showArticlesLink}
				<a
					href="/articles"
					class="rounded-full px-3 py-1.5 text-sm font-medium text-[#4b5563] hover:bg-[#eef2f7] dark:text-[#b6beca] dark:hover:bg-[#202631]"
				>
					文章
				</a>
			{/if}
			{#if showProjectsLink}
				<a
					href="/projects"
					class="rounded-full px-3 py-1.5 text-sm font-medium text-[#4b5563] hover:bg-[#eef2f7] dark:text-[#b6beca] dark:hover:bg-[#202631]"
				>
					项目
				</a>
			{/if}
			<div class="relative">
				<button
					type="button"
					onclick={toggleThemeMode}
					onblur={hideThemeTooltipNow}
					class="flex h-9 w-9 items-center justify-center rounded-full text-[#4b5563] hover:bg-[#eef2f7] dark:text-[#b6beca] dark:hover:bg-[#202631]"
					aria-label={themeButtonLabel}
				>
					{#if resolvedTheme === 'dark'}
						<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
							<path d="M12 4V2M12 22v-2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
							<circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.8" />
						</svg>
					{:else}
						<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
							<path d="M20.2 14.4A7.7 7.7 0 0 1 9.6 3.8 8.6 8.6 0 1 0 20.2 14.4Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
						</svg>
					{/if}
				</button>

				{#if showThemeTooltip}
					<span class="pointer-events-none absolute right-0 top-10 z-50 whitespace-nowrap rounded-lg px-2 py-1 text-xs font-medium shadow-lg {themeTooltipClass}" role="status" aria-live="polite">
						{themeTooltipLabel}
					</span>
				{/if}
			</div>
		</div>
	</div>
</header>
