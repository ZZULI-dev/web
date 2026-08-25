import { error } from '@sveltejs/kit'
import { loadSiteData } from '$lib/server/site-data'
import type { EntryGenerator, PageServerLoad } from './$types'

export const prerender = true

function normalizeUrlKey(value: string | null | undefined) {
	if (!value) return ''

	try {
		const url = new URL(value)
		url.hash = ''
		url.pathname = url.pathname.replace(/\/+$/, '') || '/'
		return url.toString().toLowerCase()
	} catch {
		return value.trim().replace(/\/+$/, '').toLowerCase()
	}
}

export const entries: EntryGenerator = () =>
	loadSiteData().alumni.map((person) => ({ username: person.id }))

export const load: PageServerLoad = ({ params }) => {
	const siteData = loadSiteData()
	const username = params.username.toLowerCase()
	const person = siteData.alumni.find((item) => item.id === username)

	if (!person) {
		error(404, '成员不存在')
	}

	const blogUrl = normalizeUrlKey(person.blog?.url)
	const posts = siteData.blogPosts
		.filter(
			(post) =>
				post.sourceName === person.nickname ||
				(blogUrl && normalizeUrlKey(post.sourceUrl) === blogUrl),
		)
		.slice(0, 24)
	const projects = siteData.projects.filter(
		(project) => project.author.github?.toLowerCase() === person.id,
	)

	return {
		person,
		posts,
		projects,
		blogPostsGeneratedAt: siteData.blogPostsGeneratedAt,
	}
}
