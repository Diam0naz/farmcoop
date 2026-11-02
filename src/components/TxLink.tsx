import { ExternalLink, Copy, CheckCircle } from 'lucide-react'
import { useState } from 'react'
import { FARM_COOP_ADDRESS, txExplorerUrl, FARM_COOP_EXPLORER } from '@/contracts'

interface TxLinkProps {
  hash?: string
  label?: string
}

export function TxLink({ hash, label = 'View transaction' }: TxLinkProps) {
  const [copied, setCopied] = useState(false)

  if (!hash) return null

  const url = txExplorerUrl(hash)

  function copy() {
    void navigator.clipboard.writeText(hash!)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-sm space-y-2">
      <div className="flex items-center gap-2 text-[var(--muted)]">
        <span className="text-xs font-medium uppercase tracking-wide">Contract</span>
        <span className="mono text-xs truncate">{FARM_COOP_ADDRESS}</span>
        <a
          href={FARM_COOP_EXPLORER}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--accent-hover)] hover:underline ml-auto"
        >
          <ExternalLink size={12} />
        </a>
      </div>
      <div className="flex items-center gap-2">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-[var(--accent-hover)] font-medium hover:underline"
        >
          <ExternalLink size={13} />
          {label}
        </a>
        <button
          onClick={copy}
          className="ml-auto flex items-center gap-1 text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
        >
          {copied ? <CheckCircle size={13} className="text-[var(--success)]" /> : <Copy size={13} />}
          <span className="text-xs">{copied ? 'Copied' : 'Copy hash'}</span>
        </button>
      </div>
    </div>
  )
}
