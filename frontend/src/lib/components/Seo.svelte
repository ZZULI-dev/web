<script lang="ts">
	import {
		SITE_DESCRIPTION,
		SITE_LOCALE,
		SITE_LOGO_URL,
		SITE_NAME,
	} from '$lib/site'
	import {
		absoluteUrl,
		serializeJsonLd,
		type JsonLdObject,
		type JsonLdValue,
	} from '$lib/seo'

	const JSON_LD_SCRIPT_OPEN = '<script type="application/ld+json">'
	const JSON_LD_SCRIPT_CLOSE = '<' + '/script>'

	type Props = {
		description?: string
		image?: string | null
		jsonLd?: JsonLdObject | JsonLdObject[] | null
		path: string
		robots?: string | null
		title: string
		type?: 'profile' | 'website'
	}

	let {
		description = SITE_DESCRIPTION,
		image = SITE_LOGO_URL,
		jsonLd = null,
		path,
		robots = null,
		title,
		type = 'website',
	}: Props = $props()

	let canonicalUrl = $derived(absoluteUrl(path))
	let imageUrl = $derived(image ? absoluteUrl(image) : SITE_LOGO_URL)
	let jsonLdGraph = $derived<JsonLdValue | null>(
		jsonLd
			? {
					'@context': 'https://schema.org',
					'@graph': Array.isArray(jsonLd) ? jsonLd : [jsonLd],
				}
			: null,
	)
	let jsonLdScript = $derived(
		jsonLdGraph
			? `${JSON_LD_SCRIPT_OPEN}${serializeJsonLd(jsonLdGraph)}${JSON_LD_SCRIPT_CLOSE}`
			: '',
	)
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	{#if robots}
		<meta name="robots" content={robots} />
	{/if}
	<link rel="canonical" href={canonicalUrl} />

	<meta property="og:type" content={type} />
	<meta property="og:site_name" content={SITE_NAME} />
	<meta property="og:locale" content={SITE_LOCALE} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={canonicalUrl} />
	<meta property="og:image" content={imageUrl} />

	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={imageUrl} />

	{#if jsonLdScript}
		{@html jsonLdScript}
	{/if}
</svelte:head>
