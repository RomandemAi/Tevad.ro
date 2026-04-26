/**
 * packages/scraper/src/x-tweets.ts — Scrape politicians' X timelines → verification_queue.
 *
 * Auth options (in priority order):
 *   1. X_AUTH_TOKEN + X_CT0  (browser cookies from x.com — most reliable, no rate limits)
 *   2. X_BEARER_TOKEN        (official X API v2 Bearer Token — free at developer.x.com)
 *
 * How to get cookies (option 1 — recommended):
 *   → Log in to x.com in your browser
 *   → DevTools → Application → Storage → Cookies → https://x.com
 *   → Copy "auth_token" → X_AUTH_TOKEN
 *   → Copy "ct0"        → X_CT0
 *
 * How to get Bearer Token (option 2):
 *   → Register at developer.x.com (free)
 *   → Create a project/app → copy the Bearer Token → X_BEARER_TOKEN
 *   → Note: free tier allows ~1 req/15min per endpoint
 *
 * Run:
 *   npm run x:tweets                          — all politicians with x_handle
 *   npm run x:tweets -- --limit 10            — first N politicians
 *   npm run x:tweets -- --slug catalin-drula  — single politician
 *   npm run x:tweets -- --dry-run             — classify only, no DB writes
 */

import { createServiceClient } from './supabase-env'
import Anthropic from '@anthropic-ai/sdk'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env') })

const MIN_TWEET_CHARS = 60
const MAX_TWEETS_PER_POL = 50

// X API v2 base URL
const API = 'https://api.twitter.com/2'

// X internal API base (used with cookie auth)
const INTERNAL_API = 'https://api.twitter.com'

// Public bearer token embedded in X's own web app (well-known, used by many open-source tools)
const GUEST_BEARER =
  'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA'

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': '*/*',
  'Accept-Language': 'ro-RO,ro;q=0.9,en;q=0.8',
  'Referer': 'https://twitter.com/',
  'content-type': 'application/json',
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

// ─── Auth detection ────────────────────────────────────────────────────────────

function getAuthMode(): 'cookie' | 'bearer' | 'guest' {
  if (process.env.X_AUTH_TOKEN && process.env.X_CT0) return 'cookie'
  if (process.env.X_BEARER_TOKEN) return 'bearer'
  return 'guest'
}

function cookieHeader(): string {
  return `auth_token=${process.env.X_AUTH_TOKEN}; ct0=${process.env.X_CT0}`
}

// ─── Guest token (for unauthenticated requests) ────────────────────────────────

let cachedGuestToken: string | null = null

async function getGuestToken(): Promise<string> {
  if (cachedGuestToken) return cachedGuestToken
  const res = await fetch(`${INTERNAL_API}/1.1/guest/activate.json`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GUEST_BEARER}`,
      'Content-Length': '0',
    },
  })
  if (!res.ok) throw new Error(`Guest token: ${res.status}`)
  const json = (await res.json()) as { guest_token: string }
  cachedGuestToken = json.guest_token
  return cachedGuestToken
}

// ─── Fetch user ID via GraphQL (works with cookie auth) ───────────────────────

async function getUserId(handle: string): Promise<string | null> {
  const mode = getAuthMode()

  if (mode === 'bearer') {
    const res = await fetch(`${API}/users/by/username/${handle}`, {
      headers: { Authorization: `Bearer ${process.env.X_BEARER_TOKEN}` },
    })
    if (!res.ok) return null
    const j = (await res.json()) as { data?: { id: string } }
    return j.data?.id ?? null
  }

  // Cookie mode — use X's internal GraphQL API (same as the web app)
  const variables = encodeURIComponent(JSON.stringify({ screen_name: handle, withSafetyModeUserFields: true }))
  const features = encodeURIComponent(JSON.stringify({
    hidden_profile_likes_enabled: true,
    hidden_profile_subscriptions_enabled: true,
    responsive_web_graphql_exclude_directive_enabled: true,
    verified_phone_label_enabled: false,
    highlights_tweets_tab_ui_enabled: true,
    creator_subscriptions_tweet_preview_api_enabled: true,
    responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
    responsive_web_graphql_timeline_navigation_enabled: true,
  }))

  const headers: Record<string, string> = {
    ...BROWSER_HEADERS,
    Authorization: `Bearer ${GUEST_BEARER}`,
    'x-csrf-token': process.env.X_CT0!,
    Cookie: cookieHeader(),
    'x-twitter-active-user': 'yes',
    'x-twitter-auth-type': 'OAuth2Session',
    'x-twitter-client-language': 'en',
  }

  const res = await fetch(
    `https://twitter.com/i/api/graphql/IGgvgiOx4QZndDHuD3x9TQ/UserByScreenName?variables=${variables}&features=${features}`,
    { headers }
  )
  if (!res.ok) {
    const body = await res.text()
    console.warn(`[x-tweets]   GraphQL UserByScreenName ${res.status}: ${body.slice(0, 150)}`)
    return null
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const j = (await res.json()) as any
  return j?.data?.user?.result?.rest_id ?? j?.data?.user?.result?.id_str ?? null
}

// ─── Fetch tweets ──────────────────────────────────────────────────────────────

interface RawTweet {
  id_str: string
  full_text?: string
  text?: string
  created_at?: string
  retweeted_status?: unknown
  in_reply_to_status_id_str?: string | null
}

async function fetchUserTweets(handle: string, userId: string, count: number): Promise<RawTweet[]> {
  const mode = getAuthMode()

  if (mode === 'bearer') {
    // Official API v2
    const url = new URL(`${API}/users/${userId}/tweets`)
    url.searchParams.set('max_results', String(Math.min(count, 100)))
    url.searchParams.set('tweet.fields', 'created_at,referenced_tweets,in_reply_to_user_id')
    url.searchParams.set('expansions', 'referenced_tweets.id')
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${process.env.X_BEARER_TOKEN}` },
    })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`v2 timeline ${res.status}: ${body.slice(0, 200)}`)
    }
    const j = (await res.json()) as { data?: Array<{ id: string; text: string; created_at?: string; referenced_tweets?: Array<{ type: string }> }> }
    return (j.data ?? []).map(t => ({
      id_str: t.id,
      full_text: t.text,
      created_at: t.created_at,
      retweeted_status: t.referenced_tweets?.some(r => r.type === 'retweeted') ? {} : undefined,
      in_reply_to_status_id_str: t.referenced_tweets?.some(r => r.type === 'replied_to') ? 'yes' : null,
    }))
  }

  // Cookie mode — use X GraphQL UserTweets endpoint
  const variables = encodeURIComponent(JSON.stringify({
    userId: String(userId),
    count: Math.min(count, 40),
    includePromotedContent: false,
    withQuickPromoteEligibilityTweetFields: false,
    withVoice: true,
  }))
  const features = encodeURIComponent(JSON.stringify({
    rweb_lists_timeline_redesign_enabled: true,
    responsive_web_graphql_exclude_directive_enabled: true,
    verified_phone_label_enabled: false,
    creator_subscriptions_tweet_preview_api_enabled: true,
    responsive_web_graphql_timeline_navigation_enabled: true,
    responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
    tweetypie_unmention_optimization_enabled: true,
    responsive_web_edit_tweet_api_enabled: true,
    graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
    view_counts_everywhere_api_enabled: true,
    longform_notetweets_consumption_enabled: true,
    responsive_web_twitter_article_tweet_consumption_enabled: false,
    tweet_awards_web_tipping_enabled: false,
    freedom_of_speech_not_reach_fetch_enabled: true,
    standardized_nudges_misinfo: true,
    tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
    longform_notetweets_rich_text_read_enabled: true,
    longform_notetweets_inline_media_enabled: true,
    responsive_web_enhance_cards_enabled: false,
  }))

  const res = await fetch(
    `https://twitter.com/i/api/graphql/naBcZ4al-iTCFBYGOAMzBQ/UserTweets?variables=${variables}&features=${features}`,
    {
      headers: {
        ...BROWSER_HEADERS,
        Authorization: `Bearer ${GUEST_BEARER}`,
        'x-csrf-token': process.env.X_CT0!,
        Cookie: cookieHeader(),
        'x-twitter-active-user': 'yes',
        'x-twitter-auth-type': 'OAuth2Session',
        'x-twitter-client-language': 'en',
      },
    }
  )
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`GraphQL UserTweets ${res.status}: ${body.slice(0, 200)}`)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const json = (await res.json()) as any
  // Debug: log first 300 chars of the response to understand structure
  // X returns either timeline or timeline_v2 depending on account/features
  const tl = json?.data?.user?.result?.timeline?.timeline ?? json?.data?.user?.result?.timeline_v2?.timeline
  const instructions: any[] = tl?.instructions ?? []
  const tweets: RawTweet[] = []

  function extractFromEntry(entry: any) {
    // TimelineTimelineItem → direct tweet
    const direct = entry?.content?.itemContent?.tweet_results?.result?.legacy
    if (direct?.id_str) tweets.push(direct as RawTweet)
    // TimelineTimelineModule → items array
    for (const item of (entry?.content?.items ?? []) as any[]) {
      const nested = item?.item?.itemContent?.tweet_results?.result?.legacy
      if (nested?.id_str) tweets.push(nested as RawTweet)
    }
  }

  for (const inst of instructions) {
    // AddEntries instruction
    for (const entry of (inst.entries ?? []) as any[]) extractFromEntry(entry)
    // TimelineAddToModule instruction
    for (const entry of (inst.moduleItems ?? []) as any[]) extractFromEntry(entry)
  }
  return tweets
}

// ─── Classification ────────────────────────────────────────────────────────────

interface TweetClassification {
  relevant: boolean
  recordType: 'statement' | 'promise' | 'vote' | null
  topic: string | null
  confidence: number
}

async function classifyTweet(text: string, anthropic: Anthropic): Promise<TweetClassification> {
  const skip: TweetClassification = { relevant: false, recordType: null, topic: null, confidence: 0 }
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 120,
      messages: [{
        role: 'user',
        content: `Romanian political accountability platform. Classify this tweet from a Romanian politician.

Tweet: "${text}"

Return JSON only:
{
  "relevant": true/false,
  "recordType": "statement"|"promise"|"vote"|null,
  "topic": "infrastructure|taxes|healthcare|education|corruption|economy|foreign_policy|social|pensions|transparency|coalition|other"|null,
  "confidence": 0-100
}

relevant=true only if it is a verifiable political claim, commitment or promise the politician makes about their own policy positions or actions — NOT retweets, birthday wishes, event invitations, tourist photos, sports reactions, or vague slogans.`,
      }],
    })
    const raw = (msg.content[0] as { text: string }).text.trim()
      .replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
    return JSON.parse(raw) as TweetClassification
  } catch {
    return skip
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const dryRun   = process.argv.includes('--dry-run')
  const slugArg  = process.argv.includes('--slug') ? process.argv[process.argv.indexOf('--slug') + 1] : null
  const limitIdx = process.argv.indexOf('--limit')
  const polLimit = limitIdx >= 0 ? Number(process.argv[limitIdx + 1]) || 0 : 0

  const mode = getAuthMode()
  if (mode === 'guest') {
    console.warn('[x-tweets] ⚠  No X credentials set — using unauthenticated guest mode.')
    console.warn('[x-tweets]    For better results, set X_AUTH_TOKEN + X_CT0 in .env')
    console.warn('[x-tweets]    (from browser cookies at x.com → DevTools → Application → Cookies)')
  } else {
    console.log(`[x-tweets] Auth mode: ${mode}`)
  }

  const supabase = createServiceClient()

  let q = supabase
    .from('politicians')
    .select('id, slug, name, party_short, x_handle')
    .eq('is_active', true)
    .not('x_handle', 'is', null)
    .order('name')

  if (slugArg) q = (q as typeof q).eq('slug', slugArg)
  if (polLimit > 0) q = (q as typeof q).limit(polLimit)

  const { data: politicians, error } = await q
  if (error || !politicians?.length) {
    console.error('[x-tweets] No politicians with x_handle:', error?.message ?? 'empty')
    process.exit(1)
  }

  console.log(`[x-tweets] Processing ${politicians.length} politician(s)${dryRun ? ' (DRY RUN)' : ''}`)

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

  let totalQueued = 0
  let totalSkipped = 0

  for (const pol of politicians) {
    const handle = pol.x_handle as string
    console.log(`\n[x-tweets] @${handle} — ${pol.name}`)

    try {
      const userId = await getUserId(handle)
      if (!userId) {
        console.warn(`[x-tweets]   Could not resolve user ID for @${handle}`)
        await sleep(2000)
        continue
      }

      const rawTweets = await fetchUserTweets(handle, userId, MAX_TWEETS_PER_POL)
      console.log(`[x-tweets]   fetched ${rawTweets.length} tweets`)

      for (const t of rawTweets) {
        const text = (t.full_text ?? t.text ?? '').replace(/https?:\/\/t\.co\/\S+/g, '').trim()

        // Skip retweets and replies
        if (t.retweeted_status) { totalSkipped++; continue }
        if (t.in_reply_to_status_id_str) { totalSkipped++; continue }
        if (text.length < MIN_TWEET_CHARS) { totalSkipped++; continue }

        const cls = await classifyTweet(text, anthropic)
        await sleep(150)

        if (!cls.relevant || !cls.recordType || cls.confidence < 55) {
          totalSkipped++
          continue
        }

        const tweetUrl = `https://x.com/${handle}/status/${t.id_str}`
        const pubDate = t.created_at ? new Date(t.created_at).toISOString() : new Date().toISOString()

        // Dedup check
        const { data: inQueue } = await supabase
          .from('verification_queue').select('id').eq('article_url', tweetUrl).maybeSingle()
        if (inQueue?.id) { totalSkipped++; continue }

        const { data: inRecords } = await supabase
          .from('records').select('id')
          .eq('politician_id', pol.id)
          .like('text', text.slice(0, 60).replace(/%/g, '\\%') + '%')
          .maybeSingle()
        if (inRecords?.id) { totalSkipped++; continue }

        console.log(`[x-tweets]   → QUEUE ${cls.recordType} (${cls.confidence}%) ${text.slice(0, 90)}`)

        if (!dryRun) {
          await supabase.from('verification_queue').insert({
            politician_id: pol.id,
            article_url: tweetUrl,
            article_title: text.slice(0, 500),
            outlet: `@${handle} (X)`,
            tier: 1,
            record_type: cls.recordType,
            topic: cls.topic,
            extracted_quote: text.slice(0, 800),
            confidence: cls.confidence,
            pub_date: pubDate,
          })
        }
        totalQueued++
      }
    } catch (e) {
      console.error(`[x-tweets]   Error for @${handle}:`, (e as Error).message.slice(0, 200))
    }

    await sleep(mode === 'guest' ? 5000 : 2000)
  }

  console.log(`\n[x-tweets] Done. queued=${totalQueued} skipped=${totalSkipped}`)
}

main().catch(e => { console.error('[x-tweets] Fatal:', e.message); process.exit(1) })
