export type SearchItemType = 'article' | 'member' | 'project' | 'source'

export type SearchItem = {
	type: SearchItemType
	title: string
	subtitle: string
	href: string
	external: boolean
	keywords: string
}

export const SEARCH_TYPE_LABELS: Record<SearchItemType, string> = {
	article: '文章',
	member: '成员',
	project: '项目',
	source: '来源',
}
