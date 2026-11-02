import { clsx } from 'clsx'

const TONE: Record<string, string> = {
  Pending: 'bg-gold/10 text-[#8a6a28] border-gold/35',
  Funded: 'bg-olive-700/10 text-olive-800 border-olive-700/25',
  DeliveryRecorded: 'bg-clay/10 text-clay border-clay/30',
  Confirmed: 'bg-olive-700/10 text-olive-800 border-olive-700/25',
  Paid: 'bg-olive-700 text-cream border-olive-700',
  Proposed: 'bg-cream-200 text-olive-800/70 border-olive-700/20',
  Verified: 'bg-olive-700/12 text-olive-800 border-olive-700/30',
  Active: 'bg-olive-700/10 text-olive-800 border-olive-700/25',
  Completed: 'bg-olive-700 text-cream border-olive-700',
  Defaulted: 'bg-[#f6e2db] text-[#8c3020] border-[#d9b1a3]',
  MarkedLoss: 'bg-[#eecfc4] text-[#7d2818] border-[#cfa493]',
  ProofSubmitted: 'bg-gold/12 text-[#8a6a28] border-gold/35',
  Approved: 'bg-olive-700/12 text-olive-800 border-olive-700/30',
  Rejected: 'bg-[#f6e2db] text-[#8c3020] border-[#d9b1a3]',
  Missed: 'bg-cream-200 text-olive-900/50 border-olive-700/15',
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[0.68rem] font-semibold tracking-wide',
        TONE[status] ?? 'bg-cream-200 text-olive-900/55 border-olive-700/15',
      )}
    >
      {status}
    </span>
  )
}
