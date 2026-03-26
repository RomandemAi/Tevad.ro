interface PoliticianAvatarProps {
  name: string
  avatarColor?: string | null
  avatarTextColor?: string | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const SIZE = {
  sm:  'w-8 h-8 text-[10px]',
  md:  'w-10 h-10 text-[11px]',
  lg:  'w-14 h-14 text-[13px]',
  xl:  'w-16 h-16 text-[15px]',
}

export default function PoliticianAvatar({
  name,
  avatarColor,
  avatarTextColor,
  size = 'md',
  className = '',
}: PoliticianAvatarProps) {
  const initials = name
    .split(' ')
    .map(w => w[0] ?? '')
    .join('')
    .slice(0, 3)
    .toUpperCase()

  return (
    <div
      className={`${SIZE[size]} rounded-lg flex items-center justify-center font-mono font-medium flex-shrink-0 border border-white/[0.06] ${className}`}
      style={{
        background: avatarColor ?? '#0d2a4a',
        color: avatarTextColor ?? '#378ADD',
      }}
    >
      {initials}
    </div>
  )
}
