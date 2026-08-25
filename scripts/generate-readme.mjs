#!/usr/bin/env node
/**
 * 从 data/*.json 生成 README.md 的项目列表和校友表格
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ALUMNI_PATH = path.resolve(__dirname, '../data/alumni.json')
const PROJECTS_PATH = path.resolve(__dirname, '../data/projects.json')
const README_PATH = path.resolve(__dirname, '../README.md')
const PROJECTS_SECTION_MARKER = '## 项目列表'
const ALUMNI_SECTION_MARKER = '## 校友大合集'
const QUICK_ADD_SECTION_MARKER = '## 快速添加'
const NICKNAME_WIDTH = 18
const GITHUB_WIDTH = 57
const BLOG_WIDTH = 48

function displayWidth(value) {
	return [...value].reduce(
		(width, char) => width + (char.codePointAt(0) > 0xff ? 2 : 1),
		0,
	)
}

function padCell(value, width) {
	const content = value ? ` ${value}` : ''
	return content.padEnd(
		content.length + Math.max(0, width - displayWidth(content)),
	)
}

function escapeMarkdownText(value) {
	return String(value ?? '')
		.replace(/\\/g, '\\\\')
		.replace(/\|/g, '\\|')
		.replace(/\*/g, '\\*')
		.replace(/_/g, '\\_')
		.replace(/`/g, '\\`')
		.replace(/\[/g, '\\[')
		.replace(/\]/g, '\\]')
}

function markdownLink(label, url) {
	return `[${escapeMarkdownText(label)}](${url})`
}

function readJsonArray(filePath, label) {
	return fs.readFile(filePath, 'utf-8').then((content) => {
		const data = JSON.parse(content)
		if (!Array.isArray(data)) {
			console.error(`${label} 应为数组`)
			process.exit(1)
		}

		return data
	})
}

function renderProjects(projects) {
	const projectRows = projects
		.map((project) => {
			const author =
				typeof project.author === 'object' && project.author?.github
					? `@${project.author.github}`
					: typeof project.author === 'object' && project.author?.name
						? project.author.name
						: ''
			const languages = Array.isArray(project.languages)
				? project.languages.filter(Boolean).join(', ')
				: ''
			const meta = [author, languages].filter(Boolean).join(' · ')

			return `- ${markdownLink(project.name, project.url)}: ${escapeMarkdownText(project.description)}${meta ? ` (${escapeMarkdownText(meta)})` : ''}`
		})
		.join('\n\n')

	return `${PROJECTS_SECTION_MARKER}

> 收录 ZZULI 开发者参与的开源项目、教程、工具和社区作品。

${projectRows}`
}

async function generateReadme() {
	const [alumni, projects] = await Promise.all([
		readJsonArray(ALUMNI_PATH, 'data/alumni.json'),
		readJsonArray(PROJECTS_PATH, 'data/projects.json'),
	])
	const readmeContent = await fs.readFile(README_PATH, 'utf-8')

	// 生成校友表格
	const tableHeader = `| 昵称             | GitHub                                                  | 博客/主页                                      |
| ---------------- | ------------------------------------------------------- | ---------------------------------------------- |`

	const tableRows = alumni
		.map((person) => {
			const githubUrl = `https://github.com/${person.github}`
			const github = markdownLink(person.github, githubUrl)
			const blog = person.blog
				? markdownLink(person.blog.name, person.blog.url)
				: ''

			return `|${padCell(escapeMarkdownText(person.nickname), NICKNAME_WIDTH)}|${padCell(
				github,
				GITHUB_WIDTH,
			)}|${padCell(blog, BLOG_WIDTH)}|`
		})
		.join('\n')

	const alumniTable = `${tableHeader}\n${tableRows}`

	// 替换 README.md 中的校友部分
	const lines = readmeContent.split('\n')
	const projectsStart = lines.findIndex(
		(line) => line.trim() === PROJECTS_SECTION_MARKER,
	)
	const alumniStart = lines.findIndex(
		(line) => line.trim() === ALUMNI_SECTION_MARKER,
	)
	const quickAddStart = lines.findIndex(
		(line) => line.trim() === QUICK_ADD_SECTION_MARKER,
	)

	if (alumniStart === -1 || quickAddStart === -1) {
		console.error('❌ 找不到校友大合集或快速添加标记')
		process.exit(1)
	}

	const beforeProjects = lines
		.slice(0, projectsStart !== -1 ? projectsStart : alumniStart)
		.join('\n')
		.trimEnd()
	const afterQuickAdd = lines.slice(quickAddStart).join('\n').trimEnd()
	const projectsSection = renderProjects(projects)

	const newReadme =
		`${beforeProjects}

${projectsSection}

${ALUMNI_SECTION_MARKER}

> 收录 ZZULI 开发者成员和公开主页。欢迎通过 Issue 或 PR 补充。

---

${alumniTable}

---

${afterQuickAdd}`.trim() + '\n'

	await fs.writeFile(README_PATH, newReadme)
	console.log(
		`✅ 已更新 README.md，共 ${alumni.length} 位校友、${projects.length} 个项目`,
	)
}

generateReadme().catch(console.error)
