// lib/score-utils.ts

export function scoreColor(score: number): string {
  if (score >= 70) return '#22c97a'  // green
  if (score >= 45) return '#f5a623'  // amber
  return '#f04545'                    // red
}

export function scoreLabel(score: number): string {
  if (score >= 70) return 'Credibil'
  if (score >= 45) return 'Discutabil'
  if (score >= 20) return 'Problematic'
  return 'Toxic'
}

export function credBadgeClass(score: number): string {
  if (score >= 70) return 'bg-[rgba(34,201,122,0.1)] text-[#22c97a] border-[rgba(34,201,122,0.25)]'
  if (score >= 45) return 'bg-[rgba(245,166,35,0.1)] text-[#f5a623] border-[rgba(245,166,35,0.25)]'
  return 'bg-[rgba(240,69,69,0.1)] text-[#f04545] border-[rgba(240,69,69,0.25)]'
}
