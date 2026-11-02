/**
 * Marketplace — Verified business listings with milestones and status.
 */
import { useState } from 'react'
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { formatUnits } from 'viem'
import { toast } from 'sonner'
import { ShieldCheck, ChevronDown, ChevronUp, CheckCircle, XCircle } from 'lucide-react'
import { FARM_COOP, FARM_COOP_VERIFIER } from '@/contracts'
import { TxLink } from '@/components/TxLink'
import { StatusBadge } from '@/components/StatusBadge'

const PAGE_LOAD_TIME = Date.now()

const LISTING_STATUS = ['Proposed', 'Verified', 'Funded', 'Active', 'Completed', 'Defaulted', 'MarkedLoss']
const MILESTONE_STATUS = ['Pending', 'ProofSubmitted', 'Approved', 'Rejected', 'Missed']

function MilestoneRow({ listingId, idx }: { listingId: bigint; idx: number }) {
  const { data: m } = useReadContract({
    ...FARM_COOP,
    functionName: 'getMilestone',
    args: [listingId, BigInt(idx)],
  })
  if (!m) return null
  const [pct, desc, statusIdx, proof, _proofLink, deadline] = m as [bigint, string, number, string, string, bigint]
  const status = MILESTONE_STATUS[Number(statusIdx)] ?? 'Unknown'
  const deadlineDate = new Date(Number(deadline) * 1000).toLocaleDateString()
  return (
    <div className="flex items-start gap-3 py-2 border-b border-[var(--border)] last:border-0">
      {status === 'Approved' ? <CheckCircle size={14} className="text-[var(--success)] mt-0.5 shrink-0" /> :
       status === 'Rejected' ? <XCircle size={14} className="text-[var(--danger)] mt-0.5 shrink-0" /> :
       <div className="w-3.5 h-3.5 rounded-full border-2 border-[var(--muted)] mt-0.5 shrink-0" />}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[var(--ink)]">{pct.toString()}%</span>
          <span className="text-sm text-[var(--ink-2)]">{desc}</span>
          <StatusBadge status={status} />
        </div>
        <p className="text-xs text-[var(--muted)] mt-0.5">Deadline: {deadlineDate}</p>
        {proof && <p className="text-xs text-[var(--muted)] mt-0.5 truncate">Proof: {proof}</p>}
      </div>
    </div>
  )
}

function ListingCard({ listingId }: { listingId: bigint }) {
  const [expanded, setExpanded] = useState(false)
  const [txHash, setTxHash] = useState<string>()
  const { writeContractAsync } = useWriteContract()
  const { isLoading: isTxPending } = useWaitForTransactionReceipt({ hash: txHash as `0x${string}` | undefined })

  const nowMs = PAGE_LOAD_TIME

  const { data: listing, refetch } = useReadContract({
    ...FARM_COOP,
    functionName: 'getListing',
    args: [listingId],
  })
  const { data: isVerified } = useReadContract({
    ...FARM_COOP_VERIFIER,
    functionName: 'isListingVerified',
    args: [listingId],
  })

  if (!listing) return null

  const [_business, name, description, fundingTarget, profitShareBps, statusIdx, totalFunded, voteYes, voteNo, voteDeadline, currentMilestone] = listing as [
    string, string, string, bigint, bigint, number, bigint, bigint, bigint, bigint, bigint
  ]
  const status = LISTING_STATUS[Number(statusIdx)] ?? 'Unknown'
  const milestoneCount = 4 // max
  const votingOpen = Number(voteDeadline) * 1000 > nowMs
  const fundedPct = fundingTarget > 0n ? Number((totalFunded * 100n) / fundingTarget) : 0
  const verified = !!isVerified

  async function vote(support: boolean) {
    try {
      const tx = await writeContractAsync({ ...FARM_COOP, functionName: 'voteListing', args: [listingId, support] })
      setTxHash(tx)
      toast.success(support ? 'Voted yes!' : 'Voted no.')
      void refetch()
    } catch (e: unknown) {
      toast.error((e as Error).message?.slice(0, 80) ?? 'Transaction failed')
    }
  }

  async function finalize() {
    try {
      const tx = await writeContractAsync({ ...FARM_COOP, functionName: 'finalizeListing', args: [listingId] })
      setTxHash(tx)
      toast.success('Listing finalized.')
      void refetch()
    } catch (e: unknown) {
      toast.error((e as Error).message?.slice(0, 80) ?? 'Transaction failed')
    }
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] backdrop-blur-sm overflow-hidden">
      <button
        className="w-full flex items-start gap-3 px-5 py-4 text-left hover:bg-[var(--surface-muted)] transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="display font-semibold text-[var(--ink)]">{name || `Listing #${listingId}`}</span>
            {verified && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-[var(--success)] border border-emerald-200">
                <ShieldCheck size={10} /> Verified
              </span>
            )}
            <StatusBadge status={status} />
          </div>
          <div className="text-sm text-[var(--muted)] mt-0.5 tabular-nums">
            Target: {formatUnits(fundingTarget, 6)} USDC &middot; {profitShareBps.toString()} bps profit share
          </div>
        </div>
        {expanded ? <ChevronUp size={16} className="text-[var(--muted)] mt-1" /> : <ChevronDown size={16} className="text-[var(--muted)] mt-1" />}
      </button>

      {!!expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-[var(--border)]">
          <p className="text-sm text-[var(--ink-2)] pt-4">{description}</p>

          {/* Funding progress */}
          <div>
            <div className="flex justify-between text-xs text-[var(--muted)] mb-1">
              <span>Funding progress</span>
              <span className="tabular-nums">{formatUnits(totalFunded, 6)} / {formatUnits(fundingTarget, 6)} USDC</span>
            </div>
            <div className="h-1.5 rounded-full bg-[var(--surface-muted)] overflow-hidden">
              <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${Math.min(fundedPct, 100)}%` }} />
            </div>
          </div>

          {/* Votes */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2 tabular-nums">
              <span className="text-[var(--muted)] text-xs">Yes</span>
              <div className="font-semibold text-[var(--success)]">{voteYes.toString()}</div>
            </div>
            <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 tabular-nums">
              <span className="text-[var(--muted)] text-xs">No</span>
              <div className="font-semibold text-[var(--danger)]">{voteNo.toString()}</div>
            </div>
          </div>

          <div aria-label="milestones">
            <p className="text-xs uppercase tracking-wide text-[var(--muted)] mb-2">Milestones</p>
            <div className="rounded-xl border border-[var(--border)] overflow-hidden px-3">
              {Array.from({ length: Math.min(Number(currentMilestone) + 2, milestoneCount) }, (_, i) => (
                <MilestoneRow key={i} listingId={listingId} idx={i} />
              ))}
            </div>
          </div>

          {/* Actions */}
          {verified && votingOpen && (
            <div className="flex gap-2">
              <button
                onClick={() => void vote(true)}
                disabled={isTxPending}
                className="flex-1 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-40 transition-colors"
              >
                Vote Yes
              </button>
              <button
                onClick={() => void vote(false)}
                disabled={isTxPending}
                className="flex-1 py-2 rounded-xl bg-[var(--danger)] text-white text-sm font-semibold opacity-80 hover:opacity-100 disabled:opacity-40 transition-opacity"
              >
                Vote No
              </button>
            </div>
          )}
          {verified && !votingOpen && status === 'Proposed' && (
            <button
              onClick={() => void finalize()}
              disabled={isTxPending}
              className="w-full py-2.5 rounded-xl bg-[var(--accent)] text-white font-semibold text-sm hover:bg-[var(--accent-hover)] disabled:opacity-40 transition-colors"
            >
              {isTxPending ? 'Finalizing...' : 'Finalize Vote'}
            </button>
          )}

          {!!txHash && <TxLink hash={txHash} />}
        </div>
      )}
    </div>
  )
}

export function MarketplacePage() {
  const { data: listingCount } = useReadContract({ ...FARM_COOP, functionName: 'listingCount' })
  const count = listingCount ? Number(listingCount) : 0

  return (
    <div className="space-y-4">
      <h2 className="display text-xl font-semibold text-[var(--ink)]">Marketplace</h2>
      <p className="text-sm text-[var(--muted)]">Verified business listings seeking cooperative funding.</p>

      {count === 0 && (
        <div className="rounded-2xl border border-dashed border-[var(--border)] p-8 text-center text-[var(--muted)] text-sm">
          No listings yet. Create one from the Business dashboard.
        </div>
      )}

      <div className="space-y-3">
        {Array.from({ length: count }, (_, i) => (
          <ListingCard key={i + 1} listingId={BigInt(i + 1)} />
        ))}
      </div>
    </div>
  )
}
