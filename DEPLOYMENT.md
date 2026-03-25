# Deployment Checklist — Tevad.ro

## Phase 02 Pre-Launch

### Supabase Setup
- [ ] Create Supabase project (eu-central-1 region — GDPR)
- [ ] Run migrations in order: 001 → 002 → 003_004_005
- [ ] Run seed.sql in dev environment only
- [ ] Verify RLS policies are active on all tables
- [ ] Test service role key access from scraper

### Vercel Setup
- [ ] Import GitHub repo `RomandemAi/Tevad.ro`
- [ ] Set root directory to `apps/web`
- [ ] Add all env vars from `.env.example`
- [ ] Set `NEXT_PUBLIC_APP_URL` to `https://tevad.ro`
- [ ] Enable Edge Network

### DNS (tevad.ro)
- [ ] Point A record to Vercel
- [ ] Add www CNAME
- [ ] Verify SSL certificate issued

### Scrapers (first run)
```bash
# Run once to populate politician database
npm run scrape:cdep
npm run scrape:senat

# Verify data in Supabase dashboard
# Then set up cron jobs
```

### Cron Jobs (Vercel Cron or external)
```
0 2 * * *     npm run scrape:cdep      # Daily 02:00 UTC
0 3 * * *     npm run scrape:senat     # Daily 03:00 UTC
*/30 * * * *  npm run rss:watch        # Every 30 min
0 4 * * *     npm run score:recalc     # Daily 04:00 UTC
```

### Verification Pipeline
- [ ] Test Claude API key with `npm run verify:run -- --demo`
- [ ] Confirm verdict saves to Supabase correctly
- [ ] Test reaction API endpoint

### Pre-launch checks
- [ ] Homepage loads with politician list
- [ ] Politician profile pages render correctly
- [ ] Reactions work (like/dislike)
- [ ] Mobile responsive check
- [ ] Lighthouse score > 90
- [ ] No `.env` secrets in git history

---

*Tevad.ro · "Te văd." · Built by Romandem AI · Bucharest, România · 2026*
