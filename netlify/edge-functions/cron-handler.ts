export default async function handler(request: Request, context: any) {
  // Run Next.js cron routes at the origin; edge layer only applies shared auth/caching policies if needed.
  return context.next()
}

