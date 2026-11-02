import { clsx } from 'clsx'
import { navigate } from '@/lib/router'

/** Emblem: a rising sun over ploughed rows. */
export function BrandMark({ className, dark = false }: { className?: string; dark?: boolean }) {
  return (
    <svg
      viewBox="0 0 44 44"
      aria-hidden="true"
      className={clsx('h-10 w-10', className)}
      fill="none"
    >
      <circle cx="22" cy="22" r="21" fill={dark ? '#F4EDE6' : '#465626'} />
      <g stroke={dark ? '#465626' : '#F4EDE6'} strokeWidth="1.7" strokeLinecap="round">
        <circle cx="22" cy="18" r="5.6" fill={dark ? '#465626' : '#F4EDE6'} stroke="none" />
        <path d="M22 6.4v2.4M22 27.2v0" />
        <path d="M13.6 18h-2.6M33 18h-2.6M16.1 12.1 14.3 10.3M27.9 12.1l1.8-1.8" opacity="0.9" />
        <path d="M9 30c4-2.6 8.4-2.6 13 0s9 2.6 13 0" opacity="0.95" />
        <path d="M9 35c4-2.6 8.4-2.6 13 0s9 2.6 13 0" opacity="0.55" />
      </g>
    </svg>
  )
}

export function Brand({
  dark = false,
  className,
  onClick,
}: {
  dark?: boolean
  className?: string
  onClick?: () => void
}) {
  return (
    <a
      href="#/"
      onClick={onClick}
      className={clsx('group flex items-center gap-2.5', className)}
      aria-label="FarmCoop home"
    >
      <BrandMark dark={dark} className="h-9 w-9 transition-transform duration-500 group-hover:rotate-12" />
      <span
        className={clsx(
          'display text-[1.4rem] leading-none',
          dark ? 'text-cream' : 'text-olive-950',
        )}
      >
        FarmCoop
      </span>
    </a>
  )
}

/** Small round stamp used on marketing surfaces. */
export function CoopStamp({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={clsx('h-28 w-28', className)} aria-hidden="true">
      <defs>
        <path id="stamp-circle" d="M60,60 m-43,0 a43,43 0 1,1 86,0 a43,43 0 1,1 -86,0" />
      </defs>
      <circle cx="60" cy="60" r="57" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <circle cx="60" cy="60" r="39" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.35" />
      <text fill="currentColor" fontSize="8.6" letterSpacing="2.6" fontFamily="Instrument Sans, sans-serif" fontWeight="600">
        <textPath href="#stamp-circle" startOffset="0">
          MEMBER OWNED · FARM TOGETHER · ARC TESTNET ·
        </textPath>
      </text>
      <text
        x="60"
        y="57"
        textAnchor="middle"
        fill="currentColor"
        fontSize="16"
        fontFamily="Shrikhand, serif"
      >
        85%
      </text>
      <text
        x="60"
        y="70"
        textAnchor="middle"
        fill="currentColor"
        fontSize="6.4"
        letterSpacing="1.6"
        fontFamily="Instrument Sans, sans-serif"
        fontWeight="600"
        opacity="0.8"
      >
        TO PATRONS
      </text>
    </svg>
  )
}

export function GoToAppButton({
  tab = 'orders',
  className,
  label = 'Enter the app',
}: {
  tab?: string
  className?: string
  label?: string
}) {
  return (
    <button onClick={() => navigate(`/app/${tab}`)} className={className}>
      {label}
    </button>
  )
}
