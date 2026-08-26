export type ProfileCardMetric = {
	label: string
	value: string
}

export type ProfileCardContributionDay = {
	color: string
}

export type ProfileCardEntry = {
	badge?: {
		color: string
		label: string
	}
	meta?: string | null
	title: string
}

export type ProfileCardInput = {
	avatarUrl: string
	blogUrl?: string | null
	contributionCalendar?: ProfileCardContributionDay[]
	githubUsername: string
	metrics: ProfileCardMetric[]
	nickname: string
	posts: ProfileCardEntry[]
	projects: ProfileCardEntry[]
}

const CARD_WIDTH = 1080
const CARD_PADDING = 88
const CONTENT_WIDTH = CARD_WIDTH - CARD_PADDING * 2
const CONTRIBUTION_TOP = 530
const CONTRIBUTION_HEIGHT = 168
const ENTRY_SECTION_GAP = 70
const ENTRY_SECTION_STACK_GAP = 34
const ENTRY_ROW_HEIGHT = 42
const FOOTER_GAP = 80
const FONT_FAMILY =
	'-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans SC", sans-serif'

type ProfileCardLayout = {
	footerY: number
	height: number
	postsTop: number | null
	projectsTop: number | null
}

export async function downloadProfileCard(input: ProfileCardInput) {
	if (typeof document === 'undefined') return

	await document.fonts?.ready.catch(() => undefined)

	const layout = getProfileCardLayout(input)
	const canvas = document.createElement('canvas')
	const SCALE = 2

	canvas.width = CARD_WIDTH * SCALE
	canvas.height = layout.height * SCALE

	const context = canvas.getContext('2d')

	if (!context) {
		throw new Error('Canvas is not supported')
	}

	context.scale(SCALE, SCALE)

	const avatar = await loadImage(input.avatarUrl)

	drawProfileCard(context, input, avatar, layout)
	downloadBlob(
		await canvasToBlob(canvas),
		`zzuli-${sanitizeFileName(input.githubUsername)}.png`,
	)
}

async function loadImage(src: string | null | undefined) {
	if (!src) return null

	return new Promise<HTMLImageElement | null>((resolve) => {
		const image = new Image()
		image.crossOrigin = 'anonymous'
		image.decoding = 'async'
		image.onload = () => resolve(image)
		image.onerror = () => resolve(null)
		image.src = src
	})
}

function drawProfileCard(
	context: CanvasRenderingContext2D,
	input: ProfileCardInput,
	avatar: HTMLImageElement | null,
	layout: ProfileCardLayout,
) {
	context.fillStyle = '#ffffff'
	context.fillRect(0, 0, CARD_WIDTH, layout.height)

	const GLOW_COLORS = [
		'99, 102, 241', // 靛蓝
		'236, 72, 153', // 粉红
		'34, 197, 94', // 绿色
	]
	const glowColor = GLOW_COLORS[Math.floor(Math.random() * GLOW_COLORS.length)]

	const glow = context.createRadialGradient(
		CARD_WIDTH - 40,
		40,
		0,
		CARD_WIDTH - 40,
		40,
		460,
	)
	glow.addColorStop(0, `rgba(${glowColor}, 0.12)`)
	glow.addColorStop(1, `rgba(${glowColor}, 0)`)
	context.fillStyle = glow
	context.fillRect(0, 0, CARD_WIDTH, layout.height)

	drawProfile(context, input, avatar)
	drawMetrics(context, input.metrics)
	drawContributionChart(context, input.contributionCalendar ?? [])
	if (layout.projectsTop) {
		drawEntries(context, '项目', input.projects, layout.projectsTop, 3)
	}
	if (layout.postsTop) {
		drawEntries(context, '文章', input.posts, layout.postsTop, 4)
	}
	drawFooter(context, layout.footerY)
}

function drawProfile(
	context: CanvasRenderingContext2D,
	input: ProfileCardInput,
	avatar: HTMLImageElement | null,
) {
	const x = CARD_PADDING
	const y = 126

	if (avatar) {
		drawCoveredImage(context, avatar, x, y, 160, 160, 40)
	} else {
		drawFallbackMark(context, firstCharacter(input.nickname), x, y, 180, 40, 74)
	}

	drawFittedText(context, input.nickname, x + 214, y + 60, 620, 56, 36, 700)

	context.fillStyle = '#6b7280'
	context.font = canvasFont(28, 500)
	context.fillText(`@${input.githubUsername}`, x + 216, y + 104)

	if (input.blogUrl) {
		context.fillStyle = '#6b7280'
		context.font = canvasFont(18, 500)
		context.fillText(
			truncateText(context, input.blogUrl, 360),
			x + 216,
			y + 146,
		)
	}
}

function drawMetrics(
	context: CanvasRenderingContext2D,
	metrics: ProfileCardMetric[],
) {
	const items = metrics.slice(0, 5)
	const top = 392
	const gap = 28
	const width = (CONTENT_WIDTH - gap * 4) / 5

	items.forEach((metric, index) => {
		const x = CARD_PADDING + index * (width + gap)

		context.fillStyle = '#202124'
		context.font = canvasFont(38, 760)
		context.fillText(truncateText(context, metric.value, width), x, top)

		context.fillStyle = '#6b7280'
		context.font = canvasFont(18, 500)
		context.fillText(truncateText(context, metric.label, width), x, top + 38)
	})

	drawDivider(context, top + 92)
}

function drawContributionChart(
	context: CanvasRenderingContext2D,
	calendar: ProfileCardContributionDay[],
) {
	const x = CARD_PADDING
	const y = CONTRIBUTION_TOP
	const chartWidth = CONTENT_WIDTH

	drawSectionTitle(context, 'GitHub 贡献图', x, y)

	context.fillStyle = '#6b7280'
	context.font = canvasFont(18, 500)
	context.textAlign = 'right'
	context.fillText('最近一年', x + chartWidth, y)
	context.textAlign = 'left'

	if (calendar.length === 0) {
		drawEmptyState(context, '暂无贡献数据', x, y + 30, 118)
		return
	}

	const days = calendar.slice(-371)
	const cell = 11
	const gap = 4
	const columns = Math.ceil(days.length / 7)
	const gridWidth = columns * cell + (columns - 1) * gap
	const startX = x + Math.max(0, (chartWidth - gridWidth) / 2)
	const startY = y + 42

	for (const [index, day] of days.entries()) {
		const column = Math.floor(index / 7)
		const row = index % 7

		fillRoundRect(
			context,
			startX + column * (cell + gap),
			startY + row * (cell + gap),
			cell,
			cell,
			3,
			day.color || '#ebedf0',
		)
	}
}

function drawEntries(
	context: CanvasRenderingContext2D,
	title: string,
	entries: ProfileCardEntry[],
	y: number,
	limit: number,
) {
	const x = CARD_PADDING
	const width = CONTENT_WIDTH
	const rows = entries.slice(0, limit)

	if (rows.length === 0) {
		return y
	}

	drawSectionTitle(context, title, x, y)

	rows.forEach((entry, index) => {
		const rowY = y + 34 + index * ENTRY_ROW_HEIGHT

		fillRoundRect(context, x, rowY + 8, 8, 8, 4, '#0969da')

		context.fillStyle = '#202124'
		context.font = canvasFont(22, 500)
		context.fillText(
			truncateText(context, entry.title, width - 160),
			x + 24,
			rowY + 20,
		)

		if (entry.badge) {
			drawLanguageBadge(context, entry.badge, x + width, rowY + 2, 150)
		} else if (entry.meta) {
			context.fillStyle = '#6b7280'
			context.font = canvasFont(17, 500)
			context.textAlign = 'right'
			context.fillText(
				truncateText(context, entry.meta, 150),
				x + width,
				rowY + 19,
			)
			context.textAlign = 'left'
		}
	})

	return getEntrySectionBottom(y, rows.length)
}

function drawFooter(context: CanvasRenderingContext2D, y: number) {
	context.strokeStyle = '#d8dee4'
	context.lineWidth = 1
	context.beginPath()
	context.moveTo(CARD_PADDING, y)
	context.lineTo(CARD_WIDTH - CARD_PADDING, y)
	context.stroke()

	context.fillStyle = '#6b7280'
	context.font = canvasFont(18, 600)
	context.textAlign = 'left'
	context.fillText('zzuli.dev', CARD_PADDING, y + 40)
	context.textAlign = 'right'
	context.font = canvasFont(16, 500)
	context.fillText(
		new Date().toLocaleDateString('zh-CN'),
		CARD_WIDTH - CARD_PADDING,
		y + 40,
	)

	context.textAlign = 'left'
}

function getProfileCardLayout(input: ProfileCardInput): ProfileCardLayout {
	const projectCount = Math.min(input.projects.length, 3)
	const postCount = Math.min(input.posts.length, 4)
	const contributionBottom = CONTRIBUTION_TOP + CONTRIBUTION_HEIGHT
	let nextTop = contributionBottom + ENTRY_SECTION_GAP
	let contentBottom = contributionBottom
	let projectsTop: number | null = null
	let postsTop: number | null = null

	if (projectCount > 0) {
		projectsTop = nextTop
		contentBottom = getEntrySectionBottom(projectsTop, projectCount)
		nextTop = contentBottom + ENTRY_SECTION_STACK_GAP
	}

	if (postCount > 0) {
		postsTop = nextTop
		contentBottom = getEntrySectionBottom(postsTop, postCount)
	}

	const footerY = contentBottom + FOOTER_GAP
	const height = footerY + CARD_PADDING

	return {
		footerY,
		height,
		postsTop,
		projectsTop,
	}
}

function getEntrySectionBottom(y: number, rowCount: number) {
	return y + 28 + rowCount * ENTRY_ROW_HEIGHT
}

function drawSectionTitle(
	context: CanvasRenderingContext2D,
	title: string,
	x: number,
	y: number,
) {
	context.fillStyle = '#202124'
	context.font = canvasFont(24, 720)
	context.fillText(title, x, y)
}

function drawEmptyState(
	context: CanvasRenderingContext2D,
	text: string,
	x: number,
	y: number,
	height: number,
) {
	context.fillStyle = '#6b7280'
	context.font = canvasFont(18, 500)
	context.fillText(text, x, y + height / 2 + 7)
}

function drawDivider(context: CanvasRenderingContext2D, y: number) {
	context.strokeStyle = '#d8dee4'
	context.lineWidth = 1
	context.beginPath()
	context.moveTo(CARD_PADDING, y)
	context.lineTo(CARD_WIDTH - CARD_PADDING, y)
	context.stroke()
}

function drawLanguageBadge(
	context: CanvasRenderingContext2D,
	badge: NonNullable<ProfileCardEntry['badge']>,
	right: number,
	y: number,
	maxWidth: number,
) {
	context.font = canvasFont(17, 500)
	const label = truncateText(context, badge.label, maxWidth - 28)
	const width = Math.min(maxWidth, context.measureText(label).width + 28)
	const x = right - width

	context.fillStyle = '#6b7280'
	context.textAlign = 'right'
	context.fillText(label, right, y + 18)
	context.textAlign = 'left'

	fillRoundRect(context, x, y + 7, 10, 10, 5, badge.color)
}

function drawCoveredImage(
	context: CanvasRenderingContext2D,
	image: HTMLImageElement,
	x: number,
	y: number,
	width: number,
	height: number,
	radius: number,
) {
	const imageWidth = image.naturalWidth || image.width
	const imageHeight = image.naturalHeight || image.height
	const scale = Math.max(width / imageWidth, height / imageHeight)
	const drawWidth = imageWidth * scale
	const drawHeight = imageHeight * scale

	context.save()
	roundRectPath(context, x, y, width, height, radius)
	context.clip()
	context.drawImage(
		image,
		x + (width - drawWidth) / 2,
		y + (height - drawHeight) / 2,
		drawWidth,
		drawHeight,
	)
	context.restore()
}

function drawFallbackMark(
	context: CanvasRenderingContext2D,
	text: string,
	x: number,
	y: number,
	size: number,
	radius: number,
	fontSize: number,
) {
	fillRoundRect(context, x, y, size, size, radius, '#eef6ff')
	context.fillStyle = '#0969da'
	context.font = canvasFont(fontSize, 760)
	context.textAlign = 'center'
	context.textBaseline = 'middle'
	context.fillText(text, x + size / 2, y + size / 2)
	context.textAlign = 'left'
	context.textBaseline = 'alphabetic'
}

function drawFittedText(
	context: CanvasRenderingContext2D,
	text: string,
	x: number,
	y: number,
	maxWidth: number,
	maxSize: number,
	minSize: number,
	weight: number,
) {
	let size = maxSize

	do {
		context.font = canvasFont(size, weight)
		if (context.measureText(text).width <= maxWidth || size <= minSize) break
		size -= 2
	} while (size >= minSize)

	context.fillStyle = '#202124'
	context.fillText(truncateText(context, text, maxWidth), x, y)
}

function fillRoundRect(
	context: CanvasRenderingContext2D,
	x: number,
	y: number,
	width: number,
	height: number,
	radius: number,
	fillStyle: string,
) {
	context.fillStyle = fillStyle
	roundRectPath(context, x, y, width, height, radius)
	context.fill()
}

function roundRectPath(
	context: CanvasRenderingContext2D,
	x: number,
	y: number,
	width: number,
	height: number,
	radius: number,
) {
	if (typeof context.roundRect === 'function') {
		context.beginPath()
		context.roundRect(x, y, width, height, radius)
		return
	}

	const value = Math.min(radius, width / 2, height / 2)

	context.beginPath()
	context.moveTo(x + value, y)
	context.lineTo(x + width - value, y)
	context.quadraticCurveTo(x + width, y, x + width, y + value)
	context.lineTo(x + width, y + height - value)
	context.quadraticCurveTo(x + width, y + height, x + width - value, y + height)
	context.lineTo(x + value, y + height)
	context.quadraticCurveTo(x, y + height, x, y + height - value)
	context.lineTo(x, y + value)
	context.quadraticCurveTo(x, y, x + value, y)
	context.closePath()
}

function canvasFont(size: number, weight: number) {
	return `${weight} ${size}px ${FONT_FAMILY}`
}

function truncateText(
	context: CanvasRenderingContext2D,
	text: string,
	maxWidth: number,
) {
	if (context.measureText(text).width <= maxWidth) return text

	const characters = Array.from(text)
	let result = ''

	for (const character of characters) {
		if (context.measureText(`${result}${character}...`).width > maxWidth) {
			return `${result}...`
		}

		result += character
	}

	return result
}

function firstCharacter(text: string) {
	return Array.from(text.trim())[0]?.toUpperCase() ?? 'Z'
}

function sanitizeFileName(value: string) {
	return (
		value
			.trim()
			.toLowerCase()
			.replace(/[^a-z0-9_-]+/g, '-')
			.replace(/^-+|-+$/g, '') || 'profile'
	)
}

function canvasToBlob(canvas: HTMLCanvasElement) {
	return new Promise<Blob>((resolve, reject) => {
		try {
			canvas.toBlob((blob) => {
				if (blob) {
					resolve(blob)
				} else {
					reject(new Error('Failed to export profile card'))
				}
			}, 'image/png')
		} catch (error) {
			reject(error)
		}
	})
}

function downloadBlob(blob: Blob, fileName: string) {
	const url = URL.createObjectURL(blob)
	const link = document.createElement('a')

	link.href = url
	link.download = fileName
	document.body.append(link)
	link.click()
	link.remove()

	window.setTimeout(() => URL.revokeObjectURL(url), 30_000)
}
