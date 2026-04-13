/** Romanian-safe slug for URLs (matches Tevad pipeline). */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[șşŞŠ]/g, 's')
    .replace(/[țţŢŤ]/g, 't')
    .replace(/[ăâÂĂ]/g, 'a')
    .replace(/[îÎ]/g, 'i')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}
