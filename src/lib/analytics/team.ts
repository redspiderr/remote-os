// ─── Team Metric Calculations ───────────────────────────────────────

export interface TeamMemberMetric {
  id: string;
  name: string;
  standups: number;
  participationRate: number;
  avgDuration: number;
  lastStandup: string | null;
}

export function calculateParticipationRate(
  activeDays: number,
  totalDays: number
): number {
  if (totalDays <= 0) return 0;
  return Math.round((activeDays / totalDays) * 100);
}

export function calculateStreak(
  dates: string[]
): number {
  if (dates.length === 0) return 0;
  const sorted = [...dates].sort((a, b) => b.localeCompare(a));
  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diff = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24);
    if (diff === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export function calculateEngagementScore(member: TeamMemberMetric): number {
  const durationScore = Math.min(100, (member.avgDuration / 300) * 100); // 5 min max
  const participationScore = member.participationRate;
  const standupScore = Math.min(100, member.standups * 10);
  return Math.round((durationScore + participationScore + standupScore) / 3);
}
