import {
	REPOSITORY_URL,
	SITE_DESCRIPTION,
	SITE_LANGUAGE,
	SITE_LOGO_URL,
	SITE_NAME,
	SITE_ORIGIN,
	SITE_TAGLINE,
} from '$lib/site'

export type JsonLdValue =
	| string
	| number
	| boolean
	| null
	| JsonLdObject
	| JsonLdValue[]

export type JsonLdObject = {
	[key: string]: JsonLdValue | undefined
}

export function absoluteUrl(pathOrUrl: string) {
	return new URL(pathOrUrl, SITE_ORIGIN).toString()
}

export function serializeJsonLd(value: JsonLdValue) {
	return JSON.stringify(value)
		.replaceAll('<', '\\u003c')
		.replaceAll('>', '\\u003e')
		.replaceAll('&', '\\u0026')
		.replaceAll('\u2028', '\\u2028')
		.replaceAll('\u2029', '\\u2029')
}

export function compactJsonLd<T extends JsonLdObject>(value: T): JsonLdObject {
	return Object.fromEntries(
		Object.entries(value).filter(([, item]) => {
			if (item === undefined || item === null || item === '') return false
			return !(Array.isArray(item) && item.length === 0)
		}),
	)
}

export function siteJsonLd(): JsonLdObject[] {
	return [
		{
			'@type': 'WebSite',
			name: SITE_NAME,
			url: SITE_ORIGIN,
			description: SITE_DESCRIPTION,
			inLanguage: SITE_LANGUAGE,
		},
		{
			'@type': 'Organization',
			name: SITE_NAME,
			url: SITE_ORIGIN,
			logo: SITE_LOGO_URL,
			description: SITE_TAGLINE,
			sameAs: [REPOSITORY_URL],
		},
	]
}
