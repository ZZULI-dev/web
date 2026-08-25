import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function readJson(relativePath) {
	const absolutePath = path.join(ROOT_DIR, relativePath);
	return JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
}

function addError(pathLabel, message) {
	errors.push(`${pathLabel}: ${message}`);
}

function isNonEmptyString(value) {
	return typeof value === 'string' && value.trim().length > 0;
}

function normalizeGitHubUsername(value) {
	return String(value ?? '').trim().replace(/^@/, '').toLowerCase();
}

function isGitHubUsername(value) {
	return /^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(value);
}

function isHttpUrl(value) {
	try {
		const url = new URL(value);
		return url.protocol === 'http:' || url.protocol === 'https:';
	} catch {
		return false;
	}
}

function normalizeUrlKey(value) {
	try {
		const url = new URL(value);
		url.hash = '';
		url.pathname = url.pathname.replace(/\/+$/, '') || '/';
		return url.toString().toLowerCase();
	} catch {
		return String(value ?? '').trim().replace(/\/+$/, '').toLowerCase();
	}
}

function isDate(value) {
	return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime());
}

function checkUnique(key, value, seen, pathLabel) {
	if (!value) {
		return;
	}

	if (seen.has(value)) {
		addError(pathLabel, `${key} 重复: ${value}`);
	} else {
		seen.add(value);
	}
}

function validateAlumni() {
	const alumni = readJson('data/alumni.json');
	if (!Array.isArray(alumni)) {
		addError('data/alumni.json', '顶层必须是数组');
		return 0;
	}

	const githubs = new Set();
	const nicknames = new Set();

	alumni.forEach((person, index) => {
		const pathLabel = `data/alumni.json[${index}]`;
		if (!isNonEmptyString(person.nickname)) {
			addError(pathLabel, 'nickname 不能为空');
		}
		if (!isNonEmptyString(person.github)) {
			addError(pathLabel, 'github 不能为空');
		} else if (!isGitHubUsername(person.github)) {
			addError(pathLabel, `github 格式不正确: ${person.github}`);
		}

		checkUnique('github', normalizeGitHubUsername(person.github), githubs, pathLabel);
		checkUnique('nickname', String(person.nickname ?? '').trim().toLowerCase(), nicknames, pathLabel);

		if (person.blog) {
			if (!isNonEmptyString(person.blog.name)) {
				addError(pathLabel, 'blog.name 不能为空');
			}
			if (!isNonEmptyString(person.blog.url) || !isHttpUrl(person.blog.url)) {
				addError(pathLabel, `blog.url 必须是 http(s) URL: ${person.blog.url ?? ''}`);
			}
		}
	});

	return alumni.length;
}

function validateProjects() {
	const projects = readJson('data/projects.json');
	if (!Array.isArray(projects)) {
		addError('data/projects.json', '顶层必须是数组');
		return 0;
	}

	const urls = new Set();

	projects.forEach((project, index) => {
		const pathLabel = `data/projects.json[${index}]`;
		if (!isNonEmptyString(project.name)) {
			addError(pathLabel, 'name 不能为空');
		}
		if (!isNonEmptyString(project.url) || !isHttpUrl(project.url)) {
			addError(pathLabel, `url 必须是 http(s) URL: ${project.url ?? ''}`);
		}
		checkUnique('url', normalizeUrlKey(project.url), urls, pathLabel);
		if (!isNonEmptyString(project.description)) {
			addError(pathLabel, 'description 不能为空');
		}
		if (!project.author || typeof project.author !== 'object') {
			addError(pathLabel, 'author 必须是对象');
		} else {
			if (!isNonEmptyString(project.author.name)) {
				addError(pathLabel, 'author.name 不能为空');
			}
			if (project.author.github && !isGitHubUsername(project.author.github)) {
				addError(pathLabel, `author.github 格式不正确: ${project.author.github}`);
			}
		}
		if (!Array.isArray(project.languages) || project.languages.length === 0) {
			addError(pathLabel, 'languages 必须是非空数组');
		} else {
			project.languages.forEach((language, languageIndex) => {
				if (!isNonEmptyString(language)) {
					addError(`${pathLabel}.languages[${languageIndex}]`, '语言不能为空');
				}
			});
		}
		if (!isDate(project.submittedAt)) {
			addError(pathLabel, `submittedAt 必须是 YYYY-MM-DD: ${project.submittedAt ?? ''}`);
		}
	});

	return projects.length;
}

function validateBlogPosts() {
	const filePath = path.join(ROOT_DIR, 'data/blog-posts.json');
	if (!fs.existsSync(filePath)) {
		return 0;
	}

	const data = readJson('data/blog-posts.json');
	if (!Array.isArray(data.posts)) {
		addError('data/blog-posts.json', 'posts 必须是数组');
		return 0;
	}

	const urls = new Set();
	data.posts.forEach((post, index) => {
		const pathLabel = `data/blog-posts.json.posts[${index}]`;
		if (!isNonEmptyString(post.title)) {
			addError(pathLabel, 'title 不能为空');
		}
		if (!isNonEmptyString(post.url) || !isHttpUrl(post.url)) {
			addError(pathLabel, `url 必须是 http(s) URL: ${post.url ?? ''}`);
		}
		checkUnique('url', normalizeUrlKey(post.url), urls, pathLabel);
		if (!isNonEmptyString(post.sourceName)) {
			addError(pathLabel, 'sourceName 不能为空');
		}
		if (!isNonEmptyString(post.sourceUrl) || !isHttpUrl(post.sourceUrl)) {
			addError(pathLabel, `sourceUrl 必须是 http(s) URL: ${post.sourceUrl ?? ''}`);
		}
		if (post.publishedAt && Number.isNaN(new Date(post.publishedAt).getTime())) {
			addError(pathLabel, `publishedAt 不是有效日期: ${post.publishedAt}`);
		}
	});

	return data.posts.length;
}

const counts = {
	alumni: validateAlumni(),
	projects: validateProjects(),
	blogPosts: validateBlogPosts()
};

if (errors.length > 0) {
	console.error(errors.map((error) => `- ${error}`).join('\n'));
	process.exit(1);
}

console.log(`数据校验通过: ${counts.alumni} 位成员, ${counts.projects} 个项目, ${counts.blogPosts} 篇文章`);
