import Image from 'next/image'
import PartyLogo from './PartyLogo'
import { normalizePartyCode, partyBadgeBackground, partyLogoSrc } from '@/lib/party-logo'

interface PoliticianAvatarProps {
  name: string
  avatarColor?: string | null
  avatarTextColor?: string | null
  /** Official portrait (e.g. gov.ro cabinet); when set, shown instead of initials / party logo */
  avatarUrl?: string | null
  /** When no portrait: show party logo in the avatar slot if a static asset exists; else initials */
  partyShort?: string | null
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'card'
  shape?: 'rounded' | 'circle'
  /** Used with shape=circle — party color at ~30% for outer ring */
  ringColor?: string | null
  className?: string
}

const SIZE = {
  sm: 'w-8 h-8 text-[10px]',
  md: 'w-10 h-10 text-[11px]',
  lg: 'w-14 h-14 text-[13px]',
  xl: 'w-16 h-16 text-[15px]',
  card: 'w-11 h-11 text-[13px]',
}

const SIZE_PX: Record<NonNullable<PoliticianAvatarProps['size']>, { box: number; font: number }> = {
  sm: { box: 32, font: 10 },
  md: { box: 40, font: 11 },
  lg: { box: 56, font: 13 },
  xl: { box: 64, font: 15 },
  card: { box: 44, font: 13 },
}

export default function PoliticianAvatar({
  name,
  avatarColor,
  avatarTextColor,
  avatarUrl,
  partyShort,
  size = 'md',
  shape = 'rounded',
  ringColor,
  className = '',
}: PoliticianAvatarProps) {
  const initials = name
    .split(' ')
    .map(w => w[0] ?? '')
    .join('')
    .slice(0, 3)
    .toUpperCase()

  const px = SIZE_PX[size]
  const radius = shape === 'circle' ? px.box / 2 : 8
  const ring = ringColor ?? (avatarTextColor ? `${avatarTextColor}4d` : 'rgba(29,110,245,0.35)')

  const showPhoto =
    typeof avatarUrl === 'string' &&
    avatarUrl.length > 8 &&
    (avatarUrl.startsWith('https://') || avatarUrl.startsWith('http://'))

  const partyLogo = partyLogoSrc(partyShort)
  const showPartyLogo = !showPhoto && Boolean(partyLogo)
  const partyCode = normalizePartyCode(partyShort)
  const showPartyCode = !showPhoto && !showPartyLogo && Boolean(partyCode)
  const logoSize = Math.max(22, Math.round(px.box - 10))
  const partyCodeFont = Math.min(Math.round(px.box * 0.26), 14)

  return (
    <div
      className={`${SIZE[size]} relative flex flex-shrink-0 items-center justify-center overflow-hidden font-mono font-medium ${className}`}
      style={{
        width: px.box,
        height: px.box,
        minWidth: px.box,
        minHeight: px.box,
        maxWidth: px.box,
        maxHeight: px.box,
        fontSize: px.font,
        borderRadius: radius,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        boxSizing: 'border-box',
        background: showPhoto
          ? 'var(--gray-100)'
          : showPartyLogo
            ? '#fff'
            : showPartyCode
              ? partyBadgeBackground(partyShort)
              : avatarColor ?? '#0d2a4a',
        color: avatarTextColor ?? '#378ADD',
        border: shape === 'circle' ? '2px solid white' : '1px solid rgba(255,255,255,0.06)',
        boxShadow: shape === 'circle' && ringColor ? `0 0 0 2px ${ring}` : undefined,
      }}
    >
      {showPhoto ? (
        <Image
          src={avatarUrl!}
          alt=""
          width={px.box}
          height={px.box}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ borderRadius: radius }}
          sizes={`${px.box}px`}
        />
      ) : showPartyLogo ? (
        <span className="flex h-full w-full items-center justify-center rounded-[inherit] bg-white p-1">
          <PartyLogo partyShort={partyShort} size={logoSize} className="border border-[var(--gray-200)] bg-white" />
        </span>
      ) : showPartyCode ? (
        <span
          className="flex h-full w-full items-center justify-center rounded-[inherit] px-0.5 font-mono font-semibold uppercase leading-none tracking-tight text-[var(--gray-900)]"
          style={{ fontSize: partyCodeFont }}
        >
          {(partyCode ?? '').length > 6 ? (partyCode ?? '').slice(0, 6) : (partyCode ?? '')}
        </span>
      ) : (
        initials
      )}
    </div>
  )
}
