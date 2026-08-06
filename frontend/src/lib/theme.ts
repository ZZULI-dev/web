const THEME_STORAGE_KEY = 'zzuli-theme'
const SYSTEM_DARK_QUERY = '(prefers-color-scheme: dark)'

export type ResolvedTheme = 'light' | 'dark'
export type ThemeMode = ResolvedTheme | 'auto'

export function getSavedThemeMode(): ThemeMode {
	if (typeof localStorage === 'undefined') return 'auto'

	const value = localStorage.getItem(THEME_STORAGE_KEY)
	return isThemeMode(value) ? value : 'auto'
}

export function getSystemTheme(): ResolvedTheme {
	if (typeof window === 'undefined') return 'light'

	return window.matchMedia(SYSTEM_DARK_QUERY).matches ? 'dark' : 'light'
}

export function resolveThemeMode(mode: ThemeMode): ResolvedTheme {
	return mode === 'auto' ? getSystemTheme() : mode
}

export function saveThemeMode(mode: ThemeMode) {
	localStorage.setItem(THEME_STORAGE_KEY, mode)
}

export function watchSystemTheme(onChange: (theme: ResolvedTheme) => void) {
	if (typeof window === 'undefined') return () => {}

	const mediaQuery = window.matchMedia(SYSTEM_DARK_QUERY)
	const listener = (event: MediaQueryListEvent) => {
		onChange(event.matches ? 'dark' : 'light')
	}

	mediaQuery.addEventListener('change', listener)

	return () => {
		mediaQuery.removeEventListener('change', listener)
	}
}

function isThemeMode(value: string | null): value is ThemeMode {
	return value === 'auto' || value === 'dark' || value === 'light'
}
