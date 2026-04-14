import PoliticianAvatar from './PoliticianAvatar'

/** Politician row from Supabase join — loose typing for record list pages */
export type RecordPoliticianRow = {
  name?: string | null
  slug?: string | null
  avatar_color?: string | null
  avatar_text_color?: string | null
  avatar_url?: string | null
  party_short?: string | null
} | null

function avatarRing(pol: RecordPoliticianRow): string {
  const c = pol?.avatar_text_color
  if (c != null && c !== '') return `color-mix(in srgb, ${c} 30%, transparent)`
  return 'rgba(15, 31, 61, 0.22)'
}

/** Circular party logo / portrait + subtle navy chrome ring (matches app shell tone) */
export function RecordRowPoliticianAvatar({ pol }: { pol: RecordPoliticianRow }) {
  return (
    <span className="mt-0.5 inline-flex shrink-0 rounded-full bg-gradient-to-b from-white to-[var(--gray-50)] p-[2px] ring-1 ring-[rgba(15,31,61,0.16)] shadow-[0_1px_2px_rgba(15,31,61,0.06)]">
      <PoliticianAvatar
        name={pol?.name ?? '?'}
        avatarColor={pol?.avatar_color}
        avatarTextColor={pol?.avatar_text_color}
        avatarUrl={pol?.avatar_url}
        partyShort={pol?.party_short}
        size="sm"
        shape="circle"
        ringColor={avatarRing(pol)}
      />
    </span>
  )
}

/** Same name + party line treatment as PoliticianCard (sans role) */
export function RecordRowPoliticianName({ pol }: { pol: RecordPoliticianRow }) {
  return (
    <>
      <div className="line-clamp-2 break-words font-sans text-[14px] font-semibold leading-snug text-[var(--gray-900)] md:text-[15px]">
        {pol?.name ?? '?'}
      </div>
      {pol?.party_short ? (
        <div className="mt-0.5 line-clamp-1 break-words font-sans text-[11px] leading-snug text-[var(--gray-500)] md:text-[12px]">
          <span className="text-[var(--gray-400)]">· {pol.party_short}</span>
        </div>
      ) : null}
    </>
  )
}
