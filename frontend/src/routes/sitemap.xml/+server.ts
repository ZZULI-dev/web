import {
	type BlogPost,
	loadSiteData,
	type Project,
} from '$lib/server/site-data'
import { SITE_ORIGIN } from '$lib/site'

export const prerender = true

type SitemapUrl = {
	path: string
	changefreq?: string
	lastmod?: string
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

function renderUrl({ path, changefreq, lastmod, priority }: SitemapUrl) {
	const loc = `${SITE_ORIGIN}${path}`
	return [
		'\t<url>',
		`\t\t<loc>${escapeXml(loc)}</loc>`,
		lastmod ? `\t\t<lastmod>${escapeXml(lastmod)}</lastmod>` : '',
		changefreq ? `\t\t<changefreq>${changefreq}</changefreq>` : '',
		priority ? `\t\t<priority>${priority}</priority>` : '',
		'\t</url>',
	]
		.filter(Boolean)
		.join('\n')
}

function latestDate(...values: Array<string | null | undefined>) {
	const timestamps = values
		.map((value) => {
			if (!value) return null

			const timestamp = Date.parse(value)
			return Number.isNaN(timestamp) ? null : timestamp
		})
		.filter((value): value is number => value !== null)

	if (timestamps.length === 0) return undefined

	return new Date(Math.max(...timestamps)).toISOString()
}

function latestPostDate(posts: BlogPost[]) {
	return latestDate(...posts.map((post) => post.publishedAt ?? post.fetchedAt))
}

function latestProjectDate(projects: Project[]) {
	return latestDate(...projects.map((project) => project.submittedAt))
}

export function GET() {
	const data = loadSiteData()
	const latestArticlesLastmod = latestDate(
		data.blogPostsGeneratedAt,
		latestPostDate(data.blogPosts),
	)
	const latestProjectsLastmod = latestProjectDate(data.projects)
	const activityLastmod = latestDate(
		data.githubActivity.generatedAt,
		data.githubActivity.range.to,
	)
	const siteLastmod = latestDate(
		latestArticlesLastmod,
		latestProjectsLastmod,
		activityLastmod,
		data.siteStats.generatedAt,
	)
	const urls: SitemapUrl[] = [
		{ path: '/', changefreq: 'daily', lastmod: siteLastmod, priority: '1.0' },
		{
			path: '/articles',
			changefreq: 'daily',
			lastmod: latestArticlesLastmod,
			priority: '0.8',
		},
		{
			path: '/projects',
			changefreq: 'weekly',
			lastmod: latestProjectsLastmod,
			priority: '0.8',
		},
		{
			path: '/activity',
			changefreq: 'daily',
			lastmod: activityLastmod,
			priority: '0.7',
		},
		{ path: '/links', changefreq: 'monthly', priority: '0.4' },
		...data.alumni.map((person) => {
			const memberPosts = data.blogPosts.filter(
				(post) => post.sourceName === person.nickname,
			)
			const memberProjects = data.projects.filter(
				(project) => project.author.github?.toLowerCase() === person.id,
			)
			const memberActivity = data.githubActivity.members.find(
				(member) => member.github.toLowerCase() === person.id,
			)

			return {
				path: person.profilePath,
				changefreq: 'weekly',
				lastmod: latestDate(
					person.joinedAt,
					latestPostDate(memberPosts),
					latestProjectDate(memberProjects),
					memberActivity ? activityLastmod : undefined,
				),
				priority: '0.6',
			}
		}),
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
