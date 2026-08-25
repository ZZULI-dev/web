import { loadSiteData } from '$lib/server/site-data'
import { SITE_ORIGIN } from '$lib/site'

export const prerender = true

type SitemapUrl = {
	path: string
	changefreq?: string
	priority?: string
}

function escapeXml(value: string) {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&apos;')
}

function renderUrl({ path, changefreq, priority }: SitemapUrl) {
	const loc = `${SITE_ORIGIN}${path}`
	return [
		'\t<url>',
		`\t\t<loc>${escapeXml(loc)}</loc>`,
		changefreq ? `\t\t<changefreq>${changefreq}</changefreq>` : '',
		priority ? `\t\t<priority>${priority}</priority>` : '',
		'\t</url>',
	]
		.filter(Boolean)
		.join('\n')
}

export function GET() {
	const data = loadSiteData()
	const urls: SitemapUrl[] = [
		{ path: '/', changefreq: 'daily', priority: '1.0' },
		{ path: '/articles', changefreq: 'daily', priority: '0.8' },
		{ path: '/projects', changefreq: 'weekly', priority: '0.8' },
		{ path: '/activity', changefreq: 'daily', priority: '0.7' },
		{ path: '/links', changefreq: 'monthly', priority: '0.4' },
		...data.alumni.map((person) => ({
			path: person.profilePath,
			changefreq: 'weekly',
			priority: '0.6',
		})),
	]

	const body = [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
		...urls.map(renderUrl),
		'</urlset>',
		'',
	].join('\n')

	return new Response(body, {
		headers: {
			'content-type': 'application/xml; charset=utf-8',
		},
	})
}
