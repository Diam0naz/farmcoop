import { clsx } from 'clsx'

const COLOR: Record<string, string> = {
  Pending:          'bg-amber-50 text-amber-700 border-amber-200',
  Funded:           'bg-blue-50 text-blue-700 border-blue-200',
  DeliveryRecorded: 'bg-purple-50 text-purple-700 border-purple-200',
  Confirmed:        'bg-sky-50 text-sky-700 border-sky-200',
  Paid:             'bg-emerald-50 text-[var(--success)] border-emerald-200',
  Proposed:         'bg-gray-50 text-gray-600 border-gray-200',
  Verified:         'bg-emerald-50 text-[var(--success)] border-emerald-200',
  Active:           'bg-blue-50 text-blue-700 border-blue-200',
  Completed:        'bg-emerald-50 text-[var(--success)] border-emerald-200',
  Defaulted:        'bg-red-50 text-[var(--danger)] border-red-200',
  MarkedLoss:       'bg-red-100 text-[var(--danger)] border-red-300',
  ProofSubmitted:   'bg-yellow-50 text-yellow-700 border-yellow-200',
  Approved:         'bg-emerald-50 text-[var(--success)] border-emerald-200',
  Rejected:         'bg-red-50 text-[var(--danger)] border-red-200',
  Missed:           'bg-gray-100 text-gray-600 border-gray-200',
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={clsx(
      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
      COLOR[status] ?? 'bg-gray-50 text-gray-500 border-gray-200'
    )}>
      {status}
    </span>
  )
}
