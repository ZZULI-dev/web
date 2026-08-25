#!/usr/bin/env node
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT_DIR = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	'..',
)
const OUTPUT_PATH = path.join(ROOT_DIR, 'data', 'site-stats.json')
const ENDPOINT =
	process.env.CLOUDFLARE_GRAPHQL_ENDPOINT ??
	'https://api.cloudflare.com/client/v4/graphql'
const TOKEN = process.env.CLOUDFLARE_API_TOKEN ?? ''
const ZONE_TAG =
	process.env.CLOUDFLARE_ZONE_TAG ?? process.env.CLOUDFLARE_ZONE_ID ?? ''
const HOSTNAME = (process.env.SITE_STATS_HOSTNAME ?? 'zzuli.dev').trim()
const DAYS = positiveInteger(process.env.SITE_STATS_DAYS, 30)

function positiveInteger(value, fallback) {
	const parsed = Number(value)
	return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function toDateKey(date) {
	return date.toISOString().slice(0, 10)
}

function fromDateKey(dateKey) {
	return new Date(`${dateKey}T00:00:00.000Z`)
}

function addUtcDays(date, days) {
	const next = new Date(date)
	next.setUTCDate(next.getUTCDate() + days)
	return next
}

function toFiniteNumber(value) {
	return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function sumNumbers(values, readValue) {
	return values.reduce((total, value) => total + (readValue(value) ?? 0), 0)
}

async function readExistingStats() {
	try {
		return JSON.parse(await fs.readFile(OUTPUT_PATH, 'utf-8'))
	} catch {
		return {}
	}
}

async function cloudflareGraphql(query, variables) {
	const response = await fetch(ENDPOINT, {
		method: 'POST',
		headers: {
			authorization: `Bearer ${TOKEN}`,
			'content-type': 'application/json',
			'user-agent': 'ZZULI.dev-site-stats/0.1',
		},
		body: JSON.stringify({ query, variables }),
	})

	const payload = await response.json().catch(() => null)
	if (!response.ok) {
		throw new Error(`Cloudflare GraphQL HTTP ${response.status}`)
	}
	if (payload?.errors?.length) {
		throw new Error(
			payload.errors.map((error) => error.message).join('; '),
		)
	}

	return payload.data
}

function buildRequestFilter({ since, until }) {
	const filter = {
		requestSource: 'eyeball',
		datetime_geq: since,
		datetime_lt: until,
	}

	if (HOSTNAME) {
		filter.clientRequestHTTPHost = HOSTNAME
	}

	return filter
}

function buildDailyFilter({ sinceDate, untilDate }) {
	return {
		date_geq: sinceDate,
		date_lt: untilDate,
	}
}

async function fetchRequestTotals(filter) {
	const data = await cloudflareGraphql(
		`query SiteRequests($zoneTag: string!, $filter: ZoneHttpRequestsAdaptiveGroupsFilter_InputObject) {
			viewer {
				zones(filter: { zoneTag: $zoneTag }) {
					httpRequestsAdaptiveGroups(limit: 10000, filter: $filter) {
						count
						sum {
							visits
						}
					}
				}
			}
		}`,
		{ zoneTag: ZONE_TAG, filter },
	)
	const groups = data?.viewer?.zones?.[0]?.httpRequestsAdaptiveGroups ?? []

	return {
		requests: sumNumbers(groups, (group) => toFiniteNumber(group.count)),
		visits: sumNumbers(groups, (group) =>
			toFiniteNumber(group.sum?.visits),
		),
	}
}

async function fetchRequestTotalsByDay({ since, until }) {
	const totals = {
		requests: 0,
		visits: 0,
	}
	let cursor = since

	while (cursor < until) {
		const next = new Date(
			Math.min(addUtcDays(cursor, 1).getTime(), until.getTime()),
		)
		const dailyTotals = await fetchRequestTotals(
			buildRequestFilter({
				since: cursor.toISOString(),
				until: next.toISOString(),
			}),
		)

		totals.requests += dailyTotals.requests
		totals.visits += dailyTotals.visits
		cursor = next
	}

	return totals
}

async function fetchDailyTotals(filter) {
	const data = await cloudflareGraphql(
		`query SiteDailyStats($zoneTag: string!, $filter: ZoneHttpRequests1dGroupsFilter_InputObject) {
			viewer {
				zones(filter: { zoneTag: $zoneTag }) {
					httpRequests1dGroups(limit: 1000, filter: $filter) {
						dimensions {
							date
						}
						sum {
							pageViews
							requests
						}
						uniq {
							uniques
						}
					}
				}
			}
		}`,
		{ zoneTag: ZONE_TAG, filter },
	)
	const groups = data?.viewer?.zones?.[0]?.httpRequests1dGroups ?? []
	const pageViewsByDate = Object.fromEntries(
		groups
			.map((group) => [
				group.dimensions?.date,
				toFiniteNumber(group.sum?.pageViews) ?? 0,
			])
			.filter(([date]) => typeof date === 'string'),
	)

	return {
		pageViewsByDate,
		pageViews: sumNumbers(groups, (group) =>
			toFiniteNumber(group.sum?.pageViews),
		),
		requests: sumNumbers(groups, (group) =>
			toFiniteNumber(group.sum?.requests),
		),
		uniqueVisitors: sumNumbers(groups, (group) =>
			toFiniteNumber(group.uniq?.uniques),
		),
	}
}

async function collect() {
	if (!TOKEN || !ZONE_TAG) {
		console.log(
			'缺少 CLOUDFLARE_API_TOKEN 或 CLOUDFLARE_ZONE_TAG，跳过站点统计采集。',
		)
		return
	}

	const existingStats = await readExistingStats()
	const now = new Date()
	const todayDate = toDateKey(now)
	const untilDate = todayDate
	const untilExclusiveDate = toDateKey(addUtcDays(now, 1))
	const sinceDate = toDateKey(addUtcDays(now, 1 - DAYS))
	const since = fromDateKey(sinceDate)
	const untilExclusive = fromDateKey(untilExclusiveDate)

	let requestTotals = null
	if (DAYS <= 7) {
		try {
			requestTotals = await fetchRequestTotalsByDay({
				since,
				until: untilExclusive,
			})
		} catch (error) {
			console.warn(`请求统计不可用: ${error.message}`)
		}
	}

	let dailyTotals = null
	try {
		dailyTotals = await fetchDailyTotals(
			buildDailyFilter({
				sinceDate,
				untilDate: untilExclusiveDate,
			}),
		)
	} catch (error) {
		console.warn(`日统计不可用，仅展示请求和访次: ${error.message}`)
	}

	const requests = requestTotals?.requests ?? dailyTotals?.requests ?? null
	const pageViews = dailyTotals?.pageViews ?? null
	const visits = requestTotals?.visits ?? null
	const uniqueVisitors = dailyTotals?.uniqueVisitors ?? null
	const totalPageViewsState = await updateTotalPageViews({
		existingStats,
		pageViewsByDate: dailyTotals?.pageViewsByDate ?? {},
	})
	const available =
		requests !== null ||
		pageViews !== null ||
		visits !== null ||
		uniqueVisitors !== null ||
		totalPageViewsState.totalPageViews !== null
	const sources = [
		requestTotals ? 'cloudflare-graphql:httpRequestsAdaptiveGroups' : null,
		dailyTotals ? 'cloudflare-graphql:httpRequests1dGroups' : null,
	].filter(Boolean)
	const output = {
		generatedAt: now.toISOString(),
		range: {
			from: sinceDate,
			to: untilDate,
			days: DAYS,
		},
		hostname: HOSTNAME || null,
		requests,
		pageViews,
		visits,
		uniqueVisitors,
		uniqueVisitorsApproximate: uniqueVisitors !== null && Boolean(HOSTNAME),
		totalPageViews: totalPageViewsState.totalPageViews,
		totalPageViewsStartedAt: totalPageViewsState.totalPageViewsStartedAt,
		totalPageViewsUpdatedThrough:
			totalPageViewsState.totalPageViewsUpdatedThrough,
		dailyPageViews: totalPageViewsState.dailyPageViews,
		source: sources.join('+') || null,
		available,
	}

	await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, '\t')}\n`)
	console.log(
		`已更新站点统计: ${totalPageViewsState.totalPageViews ?? 0} 总访问量, ${uniqueVisitors ?? 0} 近 ${DAYS} 天访客`,
	)
}

async function updateTotalPageViews({
	existingStats,
	pageViewsByDate,
}) {
	const dailyPageViews = {
		...normalizeDailyPageViews(existingStats.dailyPageViews),
		...normalizeDailyPageViews(pageViewsByDate),
	}
	const dates = Object.keys(dailyPageViews).sort()
	const totalPageViews =
		dates.length > 0
			? dates.reduce((total, date) => total + dailyPageViews[date], 0)
			: null

	return {
		dailyPageViews,
		totalPageViews,
		totalPageViewsStartedAt: dates[0] ?? null,
		totalPageViewsUpdatedThrough: dates.at(-1) ?? null,
	}
}

function normalizeDailyPageViews(value) {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return {}
	}

	return Object.fromEntries(
		Object.entries(value).filter(
			([date, count]) =>
				/^\d{4}-\d{2}-\d{2}$/.test(date) &&
				typeof count === 'number' &&
				Number.isFinite(count) &&
				count >= 0,
		),
	)
}

collect().catch((error) => {
	console.error(error)
	process.exit(1)
})
