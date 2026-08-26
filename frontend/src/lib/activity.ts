export const ACTIVITY_PERIODS = [
  { days: 1, homeLabel: '昨天', key: 'yesterday', label: '昨天' },
  { days: 7, homeLabel: '近 7 天', key: '7d', label: '7 天' },
  { days: 30, homeLabel: '近 30 天', key: '30d', label: '30 天' },
  { days: 90, homeLabel: '近 90 天', key: '90d', label: '90 天' },
  { days: 371, homeLabel: '近一年', key: 'year', label: '近一年' },
] as const

export type ActivityPeriodKey = (typeof ACTIVITY_PERIODS)[number]['key']

type ContributionDay = {
  count: number
}

type ActivityMember = {
  avatar: string
  calendar: ContributionDay[]
  github: string
  name: string | null
  url: string
}

type ActivityAlumni = {
  avatar: string
  nickname: string
  profilePath: string
}

export function getActivityPeriod(key: ActivityPeriodKey) {
  return (
    ACTIVITY_PERIODS.find((period) => period.key === key) ?? ACTIVITY_PERIODS[1]
  )
}

export function getNextActivityPeriodKey(
  key: ActivityPeriodKey,
): ActivityPeriodKey {
  const index = ACTIVITY_PERIODS.findIndex((period) => period.key === key)
  return ACTIVITY_PERIODS[(index + 1) % ACTIVITY_PERIODS.length].key
}

export function getContributionCount(
  member: Pick<ActivityMember, 'calendar'>,
  days: number,
): number {
  return member.calendar
    .slice(-days)
    .reduce((total, day) => total + day.count, 0)
}

export function getActivityMemberView(
  member: ActivityMember,
  alumniByGitHub: Map<string, ActivityAlumni>,
) {
  const person = alumniByGitHub.get(member.github.toLowerCase())

  return {
    avatar: person?.avatar ?? member.avatar,
    displayName: person?.nickname ?? member.name ?? member.github,
    href: person?.profilePath ?? member.url,
  }
}

export function isActivityPeriodKey(
  value: string | null,
): value is ActivityPeriodKey {
  return ACTIVITY_PERIODS.some((period) => period.key === value)
}
