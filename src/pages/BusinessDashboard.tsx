/**
 * Business dashboard — create listing, submit milestone proof, repay.
 */
import { useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseUnits } from 'viem'
import { toast } from 'sonner'
import { PlusCircle, Upload, DollarSign } from 'lucide-react'
import { FARM_COOP, ERC20_ABI, USDC_ADDRESS } from '@/contracts'
import { TxLink } from '@/components/TxLink'

function fieldCls() {
  return 'w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] text-sm text-[var(--ink)] placeholder:text-[var(--subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]'
}

export function BusinessDashboard() {
  const { address } = useAccount()
  const [txHash, setTxHash] = useState<string>()
  const { writeContractAsync } = useWriteContract()
  const { isLoading: isTxPending } = useWaitForTransactionReceipt({ hash: txHash as `0x${string}` | undefined })

  // Create listing form
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [fundTarget, setFundTarget] = useState('')
  const [fundPeriodDays, setFundPeriodDays] = useState('30')
  const [profitShareBps, setProfitShareBps] = useState('1200')
  const [docsHash, setDocsHash] = useState('')
  const [milestones, setMilestones] = useState([
    { pct: '50', desc: 'Phase 1 — preparation', deadlineDays: '30' },
    { pct: '50', desc: 'Phase 2 — delivery', deadlineDays: '60' },
  ])

  // Submit proof form
  const [proofListingId, setProofListingId] = useState('')
  const [proofMilestoneIdx, setProofMilestoneIdx] = useState('0')
  const [proofNote, setProofNote] = useState('')
  const [proofLink, setProofLink] = useState('')

  // Repay form
  const [repayListingId, setRepayListingId] = useState('')
  const [repayAmount, setRepayAmount] = useState('')

  function updateMilestone(i: number, field: string, value: string) {
    setMilestones(ms => ms.map((m, idx) => idx === i ? { ...m, [field]: value } : m))
  }

  function addMilestone() {
    if (milestones.length < 4) setMilestones(ms => [...ms, { pct: '0', desc: '', deadlineDays: '90' }])
  }

  async function createListing() {
    try {
      const pcts = milestones.map(m => BigInt(m.pct))
      const descs = milestones.map(m => m.desc)
      const now = Math.floor(Date.now() / 1000)
      const deadlines = milestones.map(m => BigInt(now + Number(m.deadlineDays) * 86400))
      const tx = await writeContractAsync({
        ...FARM_COOP,
        functionName: 'createListing',
        args: [
          address as `0x${string}`,
          name, description,
          parseUnits(fundTarget, 6),
          BigInt(Number(fundPeriodDays) * 86400),
          BigInt(profitShareBps),
          pcts, descs, deadlines,
          docsHash,
        ],
      })
      setTxHash(tx)
      toast.success('Listing created!')
    } catch (e: unknown) {
      toast.error((e as Error).message?.slice(0, 80) ?? 'Transaction failed')
    }
  }

  async function submitProof() {
    try {
      const tx = await writeContractAsync({
        ...FARM_COOP,
        functionName: 'submitMilestoneProof',
        args: [BigInt(proofListingId), BigInt(proofMilestoneIdx), proofNote, proofLink],
      })
      setTxHash(tx)
      toast.success('Milestone proof submitted!')
    } catch (e: unknown) {
      toast.error((e as Error).message?.slice(0, 80) ?? 'Transaction failed')
    }
  }

  async function repay() {
    try {
      const amt = parseUnits(repayAmount, 6)
      await writeContractAsync({ address: USDC_ADDRESS, abi: ERC20_ABI, functionName: 'approve', args: [FARM_COOP.address, amt] })
      toast.info('Approving USDC...')
      const tx = await writeContractAsync({ ...FARM_COOP, functionName: 'repay', args: [BigInt(repayListingId), amt] })
      setTxHash(tx)
      toast.success('Repayment sent!')
    } catch (e: unknown) {
      toast.error((e as Error).message?.slice(0, 80) ?? 'Transaction failed')
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="display text-xl font-semibold text-[var(--ink)]">Business Dashboard</h2>

      {/* Create Listing */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4">
        <div className="flex items-center gap-2">
          <PlusCircle size={16} className="text-[var(--muted)]" />
          <h3 className="font-semibold text-[var(--ink)]">Create Listing</h3>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <input className={fieldCls()} placeholder="Business name" value={name} onChange={e => setName(e.target.value)} />
          <input className={fieldCls()} placeholder="Funding target (USDC)" type="number" value={fundTarget} onChange={e => setFundTarget(e.target.value)} />
        </div>
        <textarea
          className={fieldCls() + ' min-h-[80px] resize-none'}
          placeholder="Description"
          value={description}
          onChange={e => setDescription(e.target.value)}
        />
        <div className="grid sm:grid-cols-3 gap-3">
          <input className={fieldCls()} placeholder="Funding period (days)" type="number" value={fundPeriodDays} onChange={e => setFundPeriodDays(e.target.value)} />
          <input className={fieldCls()} placeholder="Profit share (bps, e.g. 1200 = 12%)" type="number" value={profitShareBps} onChange={e => setProfitShareBps(e.target.value)} />
          <input className={fieldCls()} placeholder="Docs hash / URL (optional)" value={docsHash} onChange={e => setDocsHash(e.target.value)} />
        </div>

        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Milestones (2–4, must sum to 100%)</p>
          {milestones.map((m, i) => (
            <div key={i} className="grid grid-cols-3 gap-2">
              <input className={fieldCls()} placeholder="%" type="number" value={m.pct} onChange={e => updateMilestone(i, 'pct', e.target.value)} />
              <input className={fieldCls()} placeholder="Description" value={m.desc} onChange={e => updateMilestone(i, 'desc', e.target.value)} />
              <input className={fieldCls()} placeholder="Deadline (days)" type="number" value={m.deadlineDays} onChange={e => updateMilestone(i, 'deadlineDays', e.target.value)} />
            </div>
          ))}
          {milestones.length < 4 && (
            <button onClick={() => void addMilestone()} className="text-xs text-[var(--accent-hover)] hover:underline">+ Add milestone</button>
          )}
        </div>

        <button
          onClick={() => void createListing()}
          disabled={isTxPending || !name || !fundTarget}
          className="w-full py-2.5 rounded-xl bg-[var(--accent)] text-white font-semibold text-sm hover:bg-[var(--accent-hover)] disabled:opacity-40 transition-colors"
        >
          {isTxPending ? 'Submitting...' : 'Create Listing'}
        </button>
      </div>

      {/* Submit milestone proof */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Upload size={16} className="text-[var(--muted)]" />
          <h3 className="font-semibold text-[var(--ink)]">Submit Milestone Proof</h3>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <input className={fieldCls()} placeholder="Listing ID" type="number" value={proofListingId} onChange={e => setProofListingId(e.target.value)} />
          <input className={fieldCls()} placeholder="Milestone index (0-based)" type="number" value={proofMilestoneIdx} onChange={e => setProofMilestoneIdx(e.target.value)} />
        </div>
        <textarea
          className={fieldCls() + ' min-h-[60px] resize-none'}
          placeholder="Proof note"
          value={proofNote}
          onChange={e => setProofNote(e.target.value)}
        />
        <input className={fieldCls()} placeholder="Proof link or hash" value={proofLink} onChange={e => setProofLink(e.target.value)} />
        <button
          onClick={() => void submitProof()}
          disabled={isTxPending || !proofListingId || !proofNote}
          className="w-full py-2.5 rounded-xl bg-[var(--accent)] text-white font-semibold text-sm hover:bg-[var(--accent-hover)] disabled:opacity-40 transition-colors"
        >
          {isTxPending ? 'Submitting...' : 'Submit Proof'}
        </button>
      </div>

      {/* Repay */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-3">
        <div className="flex items-center gap-2">
          <DollarSign size={16} className="text-[var(--muted)]" />
          <h3 className="font-semibold text-[var(--ink)]">Repay</h3>
        </div>
        <p className="text-sm text-[var(--muted)]">
          Repayments restore pool NAV (principal + profit share). Members benefit via share price appreciation.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          <input className={fieldCls()} placeholder="Listing ID" type="number" value={repayListingId} onChange={e => setRepayListingId(e.target.value)} />
          <input className={fieldCls()} placeholder="Amount (USDC)" type="number" value={repayAmount} onChange={e => setRepayAmount(e.target.value)} />
        </div>
        <button
          onClick={() => void repay()}
          disabled={isTxPending || !repayListingId || !repayAmount}
          className="w-full py-2.5 rounded-xl bg-[var(--accent)] text-white font-semibold text-sm hover:bg-[var(--accent-hover)] disabled:opacity-40 transition-colors"
        >
          {isTxPending ? 'Sending...' : 'Repay'}
        </button>
      </div>

      {txHash && <TxLink hash={txHash} />}
    </div>
  )
}
