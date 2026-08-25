<script lang="ts">
import { onMount, tick } from 'svelte'
import { SEARCH_TYPE_LABELS, type SearchItem } from '$lib/search'

type ScoredSearchItem = SearchItem & {
	score: number
}

type Props = {
	items: SearchItem[]
}

let { items }: Props = $props()

let activeIndex = $state(0)
let inputElement = $state<HTMLInputElement | null>(null)
let lastQuery = $state('')
let open = $state(false)
let query = $state('')

let normalizedQuery = $derived(query.trim().toLowerCase())
let results = $derived.by(() => getResults(items, normalizedQuery))

$effect(() => {
	if (normalizedQuery !== lastQuery) {
		lastQuery = normalizedQuery
		activeIndex = 0
		return
	}

	if (activeIndex >= results.length) {
		activeIndex = Math.max(0, results.length - 1)
	}
})

onMount(() => {
	const onKeydown = (event: KeyboardEvent) => {
		if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
			event.preventDefault()
			openSearch()
		}
	}

	window.addEventListener('keydown', onKeydown)

	return () => window.removeEventListener('keydown', onKeydown)
})

function closeSearch() {
	open = false
	query = ''
	activeIndex = 0
}

function openSearch() {
	open = true
	activeIndex = 0
	void tick().then(() => inputElement?.focus())
}

function onDialogKeydown(event: KeyboardEvent) {
	if (event.key === 'Escape') {
		event.preventDefault()
		closeSearch()
		return
	}

	if (event.key === 'ArrowDown') {
		event.preventDefault()
		activeIndex = Math.min(activeIndex + 1, results.length - 1)
		return
	}

	if (event.key === 'ArrowUp') {
		event.preventDefault()
		activeIndex = Math.max(activeIndex - 1, 0)
		return
	}

	if (event.key === 'Enter' && results[activeIndex]) {
		event.preventDefault()
		openResult(results[activeIndex])
	}
}

function openResult(item: SearchItem) {
	closeSearch()

	if (item.external) {
		window.open(item.href, '_blank', 'noopener,noreferrer')
		return
	}

	window.location.href = item.href
}

function getResults(items: SearchItem[], query: string): SearchItem[] {
	if (!query) {
		return items.slice(0, 10)
	}

	const tokens = query.split(/\s+/).filter(Boolean)

	return items
		.map((item) => {
			const score = getScore(item, query, tokens)
			return score === null ? null : { ...item, score }
		})
		.filter((item): item is ScoredSearchItem => item !== null)
		.sort((a, b) => a.score - b.score)
		.slice(0, 12)
}

function getScore(
	item: SearchItem,
	query: string,
	tokens: string[],
): number | null {
	const title = item.title.toLowerCase()
	const subtitle = item.subtitle.toLowerCase()
	const haystack = `${title} ${subtitle} ${item.keywords.toLowerCase()}`

	if (!tokens.every((token) => haystack.includes(token))) {
		return null
	}

	if (title === query) return 0
	if (title.startsWith(query)) return 1
	if (title.includes(query)) return 2
	if (subtitle.includes(query)) return 3

	return 4
}
</script>

<button
	type="button"
	onclick={openSearch}
	class="flex h-9 w-9 items-center justify-center rounded-full text-[#4b5563] hover:bg-[#eef2f7] dark:text-[#b6beca] dark:hover:bg-[#202631]"
	aria-label="全局搜索"
	title="Search"
>
	<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
		<path d="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
	</svg>
</button>

{#if open}
	<div
		class="fixed inset-0 z-50 px-4 pt-20"
		role="none"
	>
		<button
			type="button"
			class="absolute inset-0 h-full w-full cursor-default bg-black/20 backdrop-blur-sm dark:bg-black/45"
			aria-label="关闭搜索"
			onclick={closeSearch}
		></button>
		<div
			class="relative mx-auto max-w-xl overflow-hidden rounded-2xl bg-white shadow-[0_18px_60px_rgba(31,35,40,0.22)] ring-1 ring-[#d8dee4] dark:bg-[#15191f] dark:shadow-[0_18px_60px_rgba(0,0,0,0.55)] dark:ring-[#30363d]"
			role="dialog"
			aria-modal="true"
			aria-label="全局搜索"
			tabindex="-1"
			onkeydown={onDialogKeydown}
		>
			<label class="flex items-center gap-3 px-4 py-3 shadow-[0_1px_0_rgba(31,35,40,0.08)] dark:shadow-[0_1px_0_rgba(255,255,255,0.08)]">
				<svg class="h-4 w-4 shrink-0 text-[#6b7280] dark:text-[#9aa4b2]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
					<path d="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
				</svg>
				<span class="sr-only">搜索</span>
				<input
					bind:this={inputElement}
					bind:value={query}
					class="h-8 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-[#8b949e] sm:text-sm dark:placeholder:text-[#6e7681]"
					placeholder="搜索成员、项目、文章"
					type="search"
				/>
			</label>

			{#if results.length === 0}
				<div class="px-4 py-10 text-center text-sm text-[#6b7280] dark:text-[#9aa4b2]">
					没有结果
				</div>
			{:else}
				<div class="max-h-[60vh] overflow-y-auto py-1" role="listbox" aria-label="搜索结果">
					{#each results as item, index}
						<a
							href={item.href}
							target={item.external ? '_blank' : undefined}
							rel={item.external ? 'noopener noreferrer' : undefined}
							role="option"
							aria-selected={index === activeIndex}
							onclick={closeSearch}
							onmouseenter={() => (activeIndex = index)}
							class="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 px-4 py-2.5 text-sm {index === activeIndex
								? 'bg-[#f3f5f7] dark:bg-[#202631]'
								: 'hover:bg-[#f8fafc] dark:hover:bg-[#1b2129]'}"
						>
							<span class="mt-0.5 rounded-full bg-[#eef2f7] px-2 py-0.5 text-[10px] font-medium text-[#6b7280] dark:bg-[#202631] dark:text-[#9aa4b2]">
								{SEARCH_TYPE_LABELS[item.type]}
							</span>
							<span class="min-w-0">
								<span class="block truncate font-medium text-[#202124] dark:text-[#e8eaed]">{item.title}</span>
								<span class="mt-0.5 block truncate text-xs text-[#6b7280] dark:text-[#9aa4b2]">{item.subtitle}</span>
							</span>
						</a>
					{/each}
				</div>
			{/if}
		</div>
	</div>
{/if}
