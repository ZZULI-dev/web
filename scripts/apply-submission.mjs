import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT_DIR = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	'..',
)
const kind = process.argv[2]

function readJsonArray(relativePath) {
	const absolutePath = path.join(ROOT_DIR, relativePath)
	return JSON.parse(fs.readFileSync(absolutePath, 'utf8'))
}

function writeJson(relativePath, value) {
	const absolutePath = path.join(ROOT_DIR, relativePath)
	fs.writeFileSync(absolutePath, `${JSON.stringify(value, null, 2)}\n`)
}

function setOutput(name, value) {
	const output = String(value ?? '')
	console.log(`${name}=${output}`)

	if (!process.env.GITHUB_OUTPUT) {
		return
	}

	const escaped = output
		.replace(/%/g, '%25')
		.replace(/\r/g, '%0D')
		.replace(/\n/g, '%0A')
	fs.appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${escaped}\n`)
}

function fail(message) {
	console.error(message)
	process.exit(1)
}

function requiredEnv(name, label) {
	const value = process.env[name]?.trim()
	if (!value) {
		fail(`${label}不能为空`)
	}
	return value
}

function optionalEnv(name) {
	return process.env[name]?.trim() ?? ''
}

function normalizeGitHubUsername(value) {
	return value.trim().replace(/^@/, '')
}

function githubKey(value) {
	return normalizeGitHubUsername(value).toLowerCase()
}

function normalizeHttpUrl(value) {
	const url = new URL(value.trim())
	if (!['http:', 'https:'].includes(url.protocol)) {
		throw new Error('URL 必须以 http:// 或 https:// 开头')
	}
	url.hash = ''
	url.pathname = url.pathname.replace(/\/+$/, '') || '/'
	return url.toString()
}

function normalizeUrlKey(value) {
	try {
		const url = new URL(value.trim())
		url.hash = ''
		url.pathname = url.pathname.replace(/\/+$/, '') || '/'
		return url.toString().toLowerCase()
	} catch {
		return value.trim().replace(/\/+$/, '').toLowerCase()
	}
}

function compactText(value) {
	return value.replace(/\s+/g, ' ').trim()
}

function parseList(value) {
	return [
		...new Set(
			value
				.split(/[,\n，、]/)
				.map((item) => item.trim())
				.filter(Boolean),
		),
	]
}

function today() {
	return new Date().toISOString().slice(0, 10)
}

function todayInChina() {
	const parts = new Intl.DateTimeFormat('en', {
		day: '2-digit',
		month: '2-digit',
		timeZone: 'Asia/Shanghai',
		year: 'numeric',
	}).formatToParts(new Date())
	const values = Object.fromEntries(
		parts.map((part) => [part.type, part.value]),
	)

	return `${values.year}-${values.month}-${values.day}`
}

function inferGitHubOwner(projectUrl) {
	try {
		const url = new URL(projectUrl)
		if (url.hostname.toLowerCase() !== 'github.com') {
			return ''
		}
		return normalizeGitHubUsername(
			url.pathname.split('/').filter(Boolean)[0] ?? '',
		)
	} catch {
		return ''
	}
}

function findAlumniName(alumni, github) {
	const key = githubKey(github)
	return (
		alumni.find((person) => githubKey(person.github ?? '') === key)?.nickname ??
		''
	)
}

function upsertAlumni() {
	const nickname = requiredEnv('NICKNAME', '昵称')
	const github = normalizeGitHubUsername(
		requiredEnv('GITHUB_USERNAME', 'GitHub 用户名'),
	)
	const blogUrlInput = optionalEnv('BLOG_URL')
	const blogName = optionalEnv('BLOG_NAME') || nickname

	const alumni = readJsonArray('data/alumni.json')
	const index = alumni.findIndex(
		(person) =>
			githubKey(person.github ?? '') === githubKey(github) ||
			person.nickname?.toLowerCase() === nickname.toLowerCase(),
	)
	const existing = index >= 0 ? alumni[index] : {}
	const next = {
		...existing,
		nickname,
		github,
		joinedAt: index >= 0 ? existing.joinedAt : todayInChina(),
	}

	if (blogUrlInput) {
		next.blog = {
			name: blogName,
			url: normalizeHttpUrl(blogUrlInput),
		}
	} else if (!existing.blog) {
		delete next.blog
	}

	if (index >= 0) {
		alumni[index] = next
	} else {
		alumni.push(next)
	}

	const action = index >= 0 ? 'updated' : 'added'
	const actionLabel = index >= 0 ? '更新' : '添加'
	writeJson('data/alumni.json', alumni)
	setOutput('action', action)
	setOutput('action_label', actionLabel)
	setOutput('commit_subject', `${actionLabel}校友 ${nickname} (@${github})`)
	setOutput('summary', `${actionLabel}校友 ${nickname} (@${github})`)
}

function upsertProject() {
	const name = requiredEnv('PROJECT_NAME', '项目名称')
	const url = normalizeHttpUrl(requiredEnv('PROJECT_URL', '项目链接'))
	const description = compactText(requiredEnv('DESCRIPTION', '项目简介'))
	const languagesInput = optionalEnv('LANGUAGES')
	const alumni = readJsonArray('data/alumni.json')
	const projects = readJsonArray('data/projects.json')

	const authorGithub = normalizeGitHubUsername(
		optionalEnv('AUTHOR_GITHUB') || inferGitHubOwner(url),
	)
	const authorName = authorGithub
		? findAlumniName(alumni, authorGithub) || authorGithub
		: '未知作者'
	const languages = parseList(languagesInput)
	const index = projects.findIndex(
		(project) => normalizeUrlKey(project.url ?? '') === normalizeUrlKey(url),
	)
	const existing = index >= 0 ? projects[index] : {}
	const existingAuthor = existing.author ?? {}
	const next = {
		...existing,
		name,
		url,
		description,
		author: {
			name: authorName || existingAuthor.name || '未知作者',
		},
		languages:
			languages.length > 0
				? languages
				: existing.languages?.length
					? existing.languages
					: ['Other'],
		submittedAt: existing.submittedAt || today(),
	}

	if (authorGithub || existingAuthor.github) {
		next.author.github = authorGithub || existingAuthor.github
	}

	if (index >= 0) {
		projects[index] = next
	} else {
		projects.push(next)
	}

	const action = index >= 0 ? 'updated' : 'added'
	const actionLabel = index >= 0 ? '更新' : '添加'
	writeJson('data/projects.json', projects)
	setOutput('action', action)
	setOutput('action_label', actionLabel)
	setOutput('commit_subject', `${actionLabel}项目 ${name}`)
	setOutput('summary', `${actionLabel}项目 ${name}`)
}

if (kind === 'alumni') {
	upsertAlumni()
} else if (kind === 'project') {
	upsertProject()
} else {
	fail('用法: node scripts/apply-submission.mjs alumni|project')
}
