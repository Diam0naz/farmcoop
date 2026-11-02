/**
 * Funder view — vote to fund, track milestones, vote to approve/reject milestones.
 */
import { useState } from 'react'
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { toast } from 'sonner'
import { ThumbsUp, ThumbsDown, RefreshCw } from 'lucide-react'
import { FARM_COOP } from '@/contracts'
import { TxLink } from '@/components/TxLink'

export function FunderView() {
  const [txHash, setTxHash] = useState<string>()
  const { writeContractAsync } = useWriteContract()
  const { isLoading: isTxPending } = useWaitForTransactionReceipt({ hash: txHash as `0x${string}` | undefined })

  // Milestone vote form
  const [mVoteListingId, setMVoteListingId] = useState('')
  const [mVoteMilestoneIdx, setMVoteMilestoneIdx] = useState('0')

  // Reject milestone form
  const [rejectListingId, setRejectListingId] = useState('')
  const [rejectMilestoneIdx, setRejectMilestoneIdx] = useState('0')

  // Queue processing
  const [queueMaxItems, setQueueMaxItems] = useState('10')

  // Flag default
  const [defaultListingId, setDefaultListingId] = useState('')
  const [markLossListingId, setMarkLossListingId] = useState('')

  async function voteMilestone(approve: boolean) {
    try {
      const tx = await writeContractAsync({
        ...FARM_COOP,
        functionName: 'voteMilestone',
        args: [BigInt(mVoteListingId), BigInt(mVoteMilestoneIdx), approve],
      })
      setTxHash(tx)
      toast.success(approve ? 'Approved milestone.' : 'Voted against milestone.')
    } catch (e: unknown) {
      toast.error((e as Error).message?.slice(0, 80) ?? 'Transaction failed')
    }
  }

  async function rejectMilestone() {
    try {
      const tx = await writeContractAsync({
        ...FARM_COOP,
        functionName: 'rejectMilestone',
        args: [BigInt(rejectListingId), BigInt(rejectMilestoneIdx)],
      })
      setTxHash(tx)
      toast.success('Milestone rejected.')
    } catch (e: unknown) {
      toast.error((e as Error).message?.slice(0, 80) ?? 'Transaction failed')
    }
  }

  async function processQueue() {
    try {
      const tx = await writeContractAsync({
        ...FARM_COOP,
        functionName: 'processWithdrawalQueue',
        args: [BigInt(queueMaxItems)],
      })
      setTxHash(tx)
      toast.success('Queue processed.')
    } catch (e: unknown) {
      toast.error((e as Error).message?.slice(0, 80) ?? 'Transaction failed')
    }
  }

  async function flagDefault() {
    try {
      const tx = await writeContractAsync({ ...FARM_COOP, functionName: 'flagDefault', args: [BigInt(defaultListingId)] })
      setTxHash(tx)
      toast.success('Listing flagged as defaulted.')
    } catch (e: unknown) {
      toast.error((e as Error).message?.slice(0, 80) ?? 'Transaction failed')
    }
  }

  async function markLoss() {
    try {
      const tx = await writeContractAsync({ ...FARM_COOP, functionName: 'markLoss', args: [BigInt(markLossListingId)] })
      setTxHash(tx)
      toast.success('Loss marked. Remaining funds restored to pool.')
    } catch (e: unknown) {
      toast.error((e as Error).message?.slice(0, 80) ?? 'Transaction failed')
    }
  }

  function fieldCls() {
    return 'w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] text-sm text-[var(--ink)] placeholder:text-[var(--subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]'
  }

  return (
    <div className="space-y-6">
      <h2 className="display text-xl font-semibold text-[var(--ink)]">Funder Tools</h2>

      {/* Milestone voting */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-3">
        <h3 className="font-semibold text-[var(--ink)]">Vote on Milestone</h3>
        <p className="text-sm text-[var(--muted)]">Vote to approve or reject a submitted milestone proof. Auto-approves when quorum is reached.</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <input className={fieldCls()} placeholder="Listing ID" type="number" value={mVoteListingId} onChange={e => setMVoteListingId(e.target.value)} />
          <input className={fieldCls()} placeholder="Milestone index" type="number" value={mVoteMilestoneIdx} onChange={e => setMVoteMilestoneIdx(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => void voteMilestone(true)}
            disabled={isTxPending || !mVoteListingId}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 disabled:opacity-40 transition-colors"
          >
            <ThumbsUp size={14} /> Approve
          </button>
          <button
            onClick={() => void voteMilestone(false)}
            disabled={isTxPending || !mVoteListingId}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[var(--surface-muted)] text-[var(--ink)] border border-[var(--border)] font-semibold text-sm hover:bg-[var(--border)] disabled:opacity-40 transition-colors"
          >
            <ThumbsDown size={14} /> Reject
          </button>
        </div>
      </div>

      {/* Reject milestone (after deadline) */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-3">
        <h3 className="font-semibold text-[var(--ink)]">Reject Missed Milestone</h3>
        <p className="text-sm text-[var(--muted)]">Reject a milestone after its vote deadline passed with insufficient approval. Listing moves to Defaulted.</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <input className={fieldCls()} placeholder="Listing ID" type="number" value={rejectListingId} onChange={e => setRejectListingId(e.target.value)} />
          <input className={fieldCls()} placeholder="Milestone index" type="number" value={rejectMilestoneIdx} onChange={e => setRejectMilestoneIdx(e.target.value)} />
        </div>
        <button
          onClick={() => void rejectMilestone()}
          disabled={isTxPending || !rejectListingId}
          className="w-full py-2.5 rounded-xl bg-[var(--danger)] text-white font-semibold text-sm opacity-80 hover:opacity-100 disabled:opacity-40 transition-opacity"
        >
          {isTxPending ? 'Submitting...' : 'Reject Milestone'}
        </button>
      </div>

      {/* Flag default + Mark loss */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-3">
          <h3 className="font-semibold text-[var(--ink)]">Flag Default</h3>
          <input className={fieldCls()} placeholder="Listing ID" type="number" value={defaultListingId} onChange={e => setDefaultListingId(e.target.value)} />
          <button
            onClick={() => void flagDefault()}
            disabled={isTxPending || !defaultListingId}
            className="w-full py-2 rounded-xl bg-[var(--surface-muted)] border border-[var(--border)] text-[var(--danger)] text-sm font-semibold hover:bg-red-50 disabled:opacity-40 transition-colors"
          >
            Flag Default
          </button>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-3">
          <h3 className="font-semibold text-[var(--ink)]">Mark Loss</h3>
          <p className="text-xs text-[var(--muted)]">Reclaims undisbursed funds to pool, updates NAV.</p>
          <input className={fieldCls()} placeholder="Listing ID" type="number" value={markLossListingId} onChange={e => setMarkLossListingId(e.target.value)} />
          <button
            onClick={() => void markLoss()}
            disabled={isTxPending || !markLossListingId}
            className="w-full py-2 rounded-xl bg-[var(--surface-muted)] border border-[var(--border)] text-[var(--danger)] text-sm font-semibold hover:bg-red-50 disabled:opacity-40 transition-colors"
          >
            Mark Loss
          </button>
        </div>
      </div>

      {/* Process withdrawal queue */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-3">
        <div className="flex items-center gap-2">
          <RefreshCw size={15} className="text-[var(--muted)]" />
          <h3 className="font-semibold text-[var(--ink)]">Process Withdrawal Queue</h3>
        </div>
        <p className="text-sm text-[var(--muted)]">Anyone can call this to process queued redemptions when idle USDC is available.</p>
        <div className="flex gap-2">
          <input
            className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] text-sm"
            placeholder="Max items (0 = all)"
            type="number"
            value={queueMaxItems}
            onChange={e => setQueueMaxItems(e.target.value)}
          />
          <button
            onClick={() => void processQueue()}
            disabled={isTxPending}
            className="px-4 py-2 rounded-xl bg-[var(--accent)] text-white text-sm font-semibold hover:bg-[var(--accent-hover)] disabled:opacity-40 transition-colors"
          >
            Process
          </button>
        </div>
      </div>

      {txHash && <TxLink hash={txHash} />}
    </div>
  )
}
