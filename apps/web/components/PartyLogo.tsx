import Image from 'next/image'
import { partyLogoSrc } from '@/lib/party-logo'

type Props = {
  partyShort: string | null | undefined
  size?: number
  className?: string
  title?: string
}

export default function PartyLogo({ partyShort, size = 22, className = '', title }: Props) {
  const src = partyLogoSrc(partyShort)
  if (!src) return null
  const label = (partyShort ?? '').trim() || 'Partid'
  return (
    <Image
      src={src}
      alt={`Logo ${label}`}
      width={size}
      height={size}
      className={`flex-shrink-0 rounded-md object-contain ${className}`}
      title={title ?? partyShort ?? undefined}
    />
  )
}
