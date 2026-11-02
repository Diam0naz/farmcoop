/**
 * Balance page — Members claim their earned payout.
 * Also shows the "Cash Out" off-ramp link.
 */
import { useState } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { formatUnits } from 'viem'
import { toast } from 'sonner'
import { ArrowDownToLine, ExternalLink } from 'lucide-react'
import { FARM_COOP } from '@/contracts'
import { TxLink } from '@/components/TxLink'

export function BalancePage() {
  const { address } = useAccount()
  const [txHash, setTxHash] = useState<string>()

  const { data: claimable, refetch } = useReadContract({
    ...FARM_COOP,
    functionName: 'claimableBalance',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  const { data: shareBalance } = useReadContract({
    ...FARM_COOP,
    functionName: 'shareBalance',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  const { writeContractAsync } = useWriteContract()
  const { isLoading: isTxPending } = useWaitForTransactionReceipt({ hash: txHash as `0x${string}` | undefined })

  const claimableAmt = claimable ? formatUnits(claimable as bigint, 6) : '0.00'
  const shares = shareBalance ? (shareBalance as bigint).toString() : '0'

  async function claim() {
    try {
      const tx = await writeContractAsync({ ...FARM_COOP, functionName: 'claimPayout' })
      setTxHash(tx)
      toast.success('Payout claimed!')
      void refetch()
    } catch (e: unknown) {
      toast.error((e as Error).message?.slice(0, 80) ?? 'Transaction failed')
    }
  }

  return (
    <div className="space-y-4 max-w-md mx-auto">
      <h2 className="display text-xl font-semibold text-[var(--ink)]">My Balance</h2>

      {/* Claimable earnings card */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 space-y-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Claimable Patronage</p>
          <p className="display text-4xl font-semibold text-[var(--ink)] tabular-nums mt-1">
            {parseFloat(claimableAmt).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
            <span className="text-xl ml-1 text-[var(--muted)]">USDC</span>
          </p>
        </div>

        <button
          onClick={() => void claim()}
          disabled={isTxPending || !claimable || (claimable as bigint) === 0n}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[var(--accent)] text-white font-semibold hover:bg-[var(--accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ArrowDownToLine size={16} />
          {isTxPending ? 'Claiming...' : 'Claim Payout'}
        </button>

        {txHash && <TxLink hash={txHash} label="View claim transaction" />}
      </div>

      {/* Pool shares */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Pool Shares</p>
        <p className="display text-2xl font-semibold tabular-nums mt-1 text-[var(--ink)]">{shares}</p>
        <p className="text-sm text-[var(--muted)] mt-1">Redeem on the Pool page</p>
      </div>

      {/* Cash out off-ramp */}
      <div className="rounded-2xl border border-dashed border-[var(--border)] p-5">
        <p className="text-sm font-medium text-[var(--ink)]">Want to convert USDC to cash?</p>
        <p className="text-sm text-[var(--muted)] mt-1 mb-3">
          Use an external off-ramp provider to convert your USDC to local currency.
        </p>
        <a
          href="https://www.circle.com/en/usdc#get-usdc"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--border-strong)] text-sm font-semibold text-[var(--ink)] hover:bg-[var(--surface-muted)] transition-colors"
        >
          <ExternalLink size={14} />
          Cash Out (Off-Ramp)
        </a>
        <p className="text-xs text-[var(--subtle)] mt-2">External provider — FarmCoop has no affiliation.</p>
      </div>
    </div>
  )
}
