<script lang="ts">
	import type { ResolvedTheme, ThemeMode } from '$lib/theme'

	type Props = {
		brandAriaLabel?: string
		brandHref?: string
		onAbout?: () => void
		onThemeModeChange: (mode: ThemeMode) => void
		resolvedTheme: ResolvedTheme
		showArticlesLink?: boolean
		showHomeLink?: boolean
		subtitle: string
		themeMode: ThemeMode
	}

	const themeOptions: Array<{ label: string; mode: ThemeMode }> = [
		{ label: 'Light', mode: 'light' },
		{ label: 'Dark', mode: 'dark' },
		{ label: 'Auto', mode: 'auto' },
	]

	let {
		brandAriaLabel = '返回首页',
		brandHref = '/',
		onAbout,
		onThemeModeChange,
		resolvedTheme,
		showArticlesLink = false,
		showHomeLink = false,
		subtitle,
		themeMode,
	}: Props = $props()

	let themeMenuOpen = $state(false)

	function chooseThemeMode(mode: ThemeMode) {
		onThemeModeChange(mode)
		themeMenuOpen = false
	}
</script>

<header class="sticky top-0 z-30 bg-[#fdfdfd]/90 shadow-[0_1px_0_rgba(31,35,40,0.08)] backdrop-blur dark:bg-[#15191f]/88 dark:shadow-[0_1px_0_rgba(255,255,255,0.08)]">
	<div class="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
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
			{#if showArticlesLink}
				<a
					href="/articles"
					class="rounded-full px-3 py-1.5 text-sm font-medium text-[#4b5563] hover:bg-[#eef2f7] dark:text-[#b6beca] dark:hover:bg-[#202631]"
				>
					文章
				</a>
			{/if}
			{#if showHomeLink}
				<a
					href="/"
					class="rounded-full px-3 py-1.5 text-sm font-medium text-[#4b5563] hover:bg-[#eef2f7] dark:text-[#b6beca] dark:hover:bg-[#202631]"
				>
					首页
				</a>
			{/if}
			{#if onAbout}
				<button
					type="button"
					onclick={() => onAbout?.()}
					class="rounded-full px-3 py-1.5 text-sm font-medium text-[#4b5563] hover:bg-[#eef2f7] dark:text-[#b6beca] dark:hover:bg-[#202631]"
				>
					关于
				</button>
			{/if}
			<div class="relative">
				<button
					type="button"
					onclick={() => (themeMenuOpen = !themeMenuOpen)}
					class="flex h-9 w-9 items-center justify-center rounded-full text-[#4b5563] hover:bg-[#eef2f7] dark:text-[#b6beca] dark:hover:bg-[#202631]"
					aria-label="选择主题"
					aria-haspopup="menu"
					aria-expanded={themeMenuOpen}
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

				{#if themeMenuOpen}
					<div
						role="menu"
						class="absolute right-0 top-10 z-50 w-28 overflow-hidden rounded-xl bg-white py-1 shadow-[0_8px_26px_rgba(31,35,40,0.16)] ring-1 ring-[#d8dee4] dark:bg-[#1c2128] dark:shadow-[0_12px_30px_rgba(0,0,0,0.4)] dark:ring-[#30363d]"
					>
						{#each themeOptions as option}
							<button
								type="button"
								role="menuitem"
								onclick={() => chooseThemeMode(option.mode)}
								class="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs font-medium text-[#4b5563] hover:bg-[#f8fafc] dark:text-[#b6beca] dark:hover:bg-[#202631]"
							>
								<span>{option.label}</span>
								{#if themeMode === option.mode}
									<span class="h-1.5 w-1.5 rounded-full bg-[#0969da] dark:bg-[#7cc4ff]" aria-hidden="true"></span>
								{/if}
							</button>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>
</header>
