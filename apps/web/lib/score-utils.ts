// lib/score-utils.ts

/** Neutral baseline (matches DB default + SCORING.md empty-state). */
export const DEFAULT_SCORE = 50

/** Use for display when `politicians.score` may be null before first recalc. */
export function displayScore(score: number | null | undefined): number {
  if (score == null) return DEFAULT_SCORE
  const n = Number(score)
  if (Number.isNaN(n)) return DEFAULT_SCORE
  return Math.min(100, Math.max(0, n))
}

export function scoreColor(score: number): string {
  if (score >= 70) return '#16a34a'
  if (score >= 45) return '#d97706'
  return '#dc2626'
}

export function scoreLabel(score: number): string {
  if (score >= 70) return 'Credibil'
  if (score >= 45) return 'Discutabil'
  if (score >= 20) return 'Problematic'
  return 'Toxic'
}

export function credBadgeClass(score: number): string {
  if (score >= 70)
    return 'bg-[var(--green-bg)] text-[var(--green)] border border-[rgba(22,163,74,0.35)]'
  if (score >= 45)
    return 'bg-[var(--amber-bg)] text-[var(--amber)] border border-[rgba(217,119,6,0.35)]'
  return 'bg-[var(--red-bg)] text-[var(--red)] border border-[rgba(220,38,38,0.35)]'
}
