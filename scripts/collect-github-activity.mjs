#!/usr/bin/env node
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT_DIR = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	'..',
)
const ALUMNI_PATH = path.join(ROOT_DIR, 'data', 'alumni.json')
const OUTPUT_PATH = path.join(ROOT_DIR, 'data', 'github-activity.json')
const ENDPOINT =
	process.env.GITHUB_GRAPHQL_ENDPOINT ?? 'https://api.github.com/graphql'
const TOKEN = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? ''
const RECENT_DAYS = positiveInteger(
	process.env.GITHUB_ACTIVITY_RECENT_DAYS,
	7,
)
const BATCH_SIZE = positiveInteger(process.env.GITHUB_ACTIVITY_BATCH_SIZE, 8)

function positiveInteger(value, fallback) {
	const parsed = Number(value)
	return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function normalizeGitHubUsername(value) {
	return String(value ?? '')
		.trim()
		.replace(/^@/, '')
		.replace(/^https?:\/\/github\.com\//i, '')
		.replace(/[/?#].*$/, '')
}

function isGitHubUsername(value) {
	return /^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(value)
}

function escapeGraphQLString(value) {
	return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function toDateKey(date) {
	return date.toISOString().slice(0, 10)
}

function addUtcDays(date, days) {
	const next = new Date(date)
	next.setUTCDate(next.getUTCDate() + days)
	return next
}

function chunk(values, size) {
	const chunks = []
	for (let index = 0; index < values.length; index += size) {
		chunks.push(values.slice(index, index + size))
	}
	return chunks
}

async function readAlumni() {
	const alumni = JSON.parse(await fs.readFile(ALUMNI_PATH, 'utf-8'))
	if (!Array.isArray(alumni)) {
		throw new Error('data/alumni.json must be an array')
	}

	return alumni
		.map((person) => ({
			nickname: String(person.nickname ?? '').trim(),
			github: normalizeGitHubUsername(person.github),
		}))
		.filter((person) => person.nickname && isGitHubUsername(person.github))
}

async function githubGraphql(query, variables) {
	const response = await fetch(ENDPOINT, {
		method: 'POST',
		headers: {
			authorization: `Bearer ${TOKEN}`,
			'content-type': 'application/json',
			'user-agent': 'ZZULI.dev-github-activity/0.1',
		},
		body: JSON.stringify({ query, variables }),
	})

	const payload = await response.json().catch(() => null)
	if (!response.ok) {
		throw new Error(`GitHub GraphQL HTTP ${response.status}`)
	}
	if (payload?.errors?.length) {
		throw new Error(
			payload.errors.map((error) => error.message).join('; '),
		)
	}

	return payload.data
}

function buildBatchQuery(batch) {
	const users = batch
		.map(
			(person, index) => `
u${index}: repositoryOwner(login: "${escapeGraphQLString(person.github)}") {
	... on User {
		login
		name
		avatarUrl
		url
		contributionsCollection(from: $from, to: $to) {
			contributionCalendar {
				totalContributions
				weeks {
					contributionDays {
						color
						contributionCount
						contributionLevel
						date
					}
				}
			}
		}
		repositories(
			first: 8
			ownerAffiliations: OWNER
			orderBy: { field: PUSHED_AT, direction: DESC }
		) {
			nodes {
				isFork
				name
				nameWithOwner
				url
				pushedAt
				stargazerCount
				primaryLanguage {
					name
					color
				}
			}
		}
	}
}`,
		)
		.join('\n')

	return `query GitHubActivity($from: DateTime!, $to: DateTime!) {
${users}
rateLimit {
	remaining
	resetAt
}
}`
}

function toActivityMember(user, requestedGithub, recentFromKey, latestDateKey) {
	const calendar =
		user.contributionsCollection?.contributionCalendar?.weeks
			?.flatMap((week) => week.contributionDays ?? [])
			?.map((day) => ({
				date: day.date,
				count: day.contributionCount ?? 0,
				level: day.contributionLevel ?? 'NONE',
				color: day.color ?? '#ebedf0',
			}))
			?.sort((a, b) => a.date.localeCompare(b.date)) ?? []
	const completedCalendar = calendar.filter((day) => day.date <= latestDateKey)
	const latestDayContributions =
		completedCalendar.find((day) => day.date === latestDateKey)?.count ?? 0
	const recentContributions = completedCalendar
		.filter((day) => day.date >= recentFromKey && day.date <= latestDateKey)
		.reduce((sum, day) => sum + day.count, 0)
	const recentRepositories =
		user.repositories?.nodes
			?.filter((repo) => repo && !repo.isFork)
			?.slice(0, 5)
			?.map((repo) => ({
				name: repo.name,
				nameWithOwner: repo.nameWithOwner,
				url: repo.url,
				pushedAt: repo.pushedAt ?? null,
				stars: repo.stargazerCount ?? 0,
				language: repo.primaryLanguage
					? {
							name: repo.primaryLanguage.name,
							color: repo.primaryLanguage.color ?? '#8b949e',
						}
					: null,
			})) ?? []

	return {
		github: user.login ?? requestedGithub,
		name: user.name ?? null,
		url: user.url ?? `https://github.com/${requestedGithub}`,
		avatar: user.avatarUrl ?? `https://github.com/${requestedGithub}.png`,
		latestDayContributions,
		recentContributions,
		totalContributions: completedCalendar.reduce(
			(sum, day) => sum + day.count,
			0,
		),
		calendar: {
			start: completedCalendar[0]?.date ?? null,
			counts: completedCalendar.map((day) => day.count),
		},
		recentRepositories,
	}
}

async function collect() {
	if (!TOKEN) {
		console.log('缺少 GITHUB_TOKEN/GH_TOKEN，跳过 GitHub 活跃数据采集。')
		return
	}

	const alumni = await readAlumni()
	const now = new Date()
	const latestDate = addUtcDays(now, -1)
	const from = addUtcDays(latestDate, -370)
	const recentFrom = addUtcDays(latestDate, -(RECENT_DAYS - 1))
	const latestDateKey = toDateKey(latestDate)
	const recentFromKey = toDateKey(recentFrom)
	const members = []

	for (const batch of chunk(alumni, BATCH_SIZE)) {
		const data = await githubGraphql(buildBatchQuery(batch), {
			from: from.toISOString(),
			to: now.toISOString(),
		})

		for (const [index, person] of batch.entries()) {
			const user = data[`u${index}`]
			if (!user) {
				console.warn(`GitHub 用户不存在或不可访问: ${person.github}`)
				continue
			}

			members.push(
				toActivityMember(user, person.github, recentFromKey, latestDateKey),
			)
		}

		if (data.rateLimit) {
			console.log(
				`GitHub GraphQL 剩余额度: ${data.rateLimit.remaining}，重置时间: ${data.rateLimit.resetAt}`,
			)
		}
	}

	const output = {
		generatedAt: now.toISOString(),
		range: {
			from: toDateKey(from),
			to: latestDateKey,
			recentDays: RECENT_DAYS,
		},
		members,
	}

	await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, '\t')}\n`)
	console.log(`已更新 GitHub 活跃数据: ${members.length} 位成员`)
}

collect().catch((error) => {
	console.error(error)
	process.exit(1)
})
