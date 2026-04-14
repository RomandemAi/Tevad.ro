'use client'

import { useId, useState } from 'react'

type Props = {
  summary: string
  detail?: string
  /** Smaller hit target on dense rows (e.g. promises list) */
  compact?: boolean
}

export default function StatusHintIcon({ summary, detail, compact }: Props) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const titleText = detail ? `${summary} ${detail}` : summary
  const ariaLabel = `${summary} Apasă pentru detalii.`

  return (
    <span className="inline-flex flex-col items-start gap-1 align-middle">
      <button
        type="button"
        className={`inline-flex shrink-0 items-center justify-center rounded-full border border-[var(--gray-200)] bg-[var(--gray-50)] text-[var(--gray-500)] transition-colors hover:border-[var(--gray-300)] hover:bg-[var(--gray-100)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue)] focus-visible:ring-offset-2 ${
          'cursor-pointer'
        } ${compact ? 'h-5 w-5' : 'h-6 w-6'}`}
        title={titleText}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={e => {
          e.preventDefault()
          e.stopPropagation()
          setOpen(o => !o)
        }}
      >
        <span className="sr-only">Informații despre verdict</span>
        <svg
          width={compact ? 12 : 14}
          height={compact ? 12 : 14}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {open && (
        <p
          id={panelId}
          className="max-w-[min(100%,300px)] rounded border border-[var(--gray-200)] bg-white px-2 py-1.5 font-mono text-[9px] leading-snug text-[var(--gray-600)] shadow-sm"
          role="note"
        >
          <span className="text-[var(--gray-700)]">{summary}</span>
          {detail ? <span className="text-[var(--gray-600)]">{` ${detail}`}</span> : null}
        </p>
      )}
    </span>
  )
}
