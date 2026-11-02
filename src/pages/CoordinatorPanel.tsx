/**
 * Coordinator panel — manage members, verify listings, withdraw reserve.
 */
import { useState } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { formatUnits } from 'viem'
import { toast } from 'sonner'
import { UserPlus, UserMinus, ShieldCheck, Banknote } from 'lucide-react'
import { FARM_COOP, FARM_COOP_VERIFIER, COORDINATOR_ADDRESS } from '@/contracts'
import { TxLink } from '@/components/TxLink'

function fieldCls() {
  return 'w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] text-sm text-[var(--ink)] placeholder:text-[var(--subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]'
}

export function CoordinatorPanel() {
  const { address } = useAccount()
  const isCoordinator = address?.toLowerCase() === COORDINATOR_ADDRESS.toLowerCase()

  const { data: reserveBalance } = useReadContract({ ...FARM_COOP, functionName: 'reserveBalance' })
  const { data: memberCount } = useReadContract({ ...FARM_COOP, functionName: 'memberCount' })

  const [txHash, setTxHash] = useState<string>()
  const { writeContractAsync } = useWriteContract()
  const { isLoading: isTxPending } = useWaitForTransactionReceipt({ hash: txHash as `0x${string}` | undefined })

  const [addMemberAddr, setAddMemberAddr] = useState('')
  const [removeMemberAddr, setRemoveMemberAddr] = useState('')
  const [verifyListingId, setVerifyListingId] = useState('')
  const [withdrawTo, setWithdrawTo] = useState('')
  const [withdrawAmt, setWithdrawAmt] = useState('')

  if (!isCoordinator) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border)] p-8 text-center text-[var(--muted)] text-sm">
        Connect the coordinator wallet to access this panel.
      </div>
    )
  }

  async function addMember() {
    try {
      const tx = await writeContractAsync({ ...FARM_COOP, functionName: 'addMember', args: [addMemberAddr as `0x${string}`] })
      setTxHash(tx); toast.success('Member added.'); setAddMemberAddr('')
    } catch (e: unknown) { toast.error((e as Error).message?.slice(0, 80) ?? 'Error') }
  }

  async function removeMember() {
    try {
      const tx = await writeContractAsync({ ...FARM_COOP, functionName: 'removeMember', args: [removeMemberAddr as `0x${string}`] })
      setTxHash(tx); toast.success('Member removed.'); setRemoveMemberAddr('')
    } catch (e: unknown) { toast.error((e as Error).message?.slice(0, 80) ?? 'Error') }
  }

  async function verifyListing() {
    try {
      const tx = await writeContractAsync({ ...FARM_COOP_VERIFIER, functionName: 'verify', args: [BigInt(verifyListingId)] })
      setTxHash(tx); toast.success('Listing verified.'); setVerifyListingId('')
    } catch (e: unknown) { toast.error((e as Error).message?.slice(0, 80) ?? 'Error') }
  }

  async function withdrawReserve() {
    try {
      const { parseUnits } = await import('viem')
      const tx = await writeContractAsync({
        ...FARM_COOP,
        functionName: 'withdrawReserve',
        args: [withdrawTo as `0x${string}`, parseUnits(withdrawAmt, 6)],
      })
      setTxHash(tx); toast.success('Reserve withdrawn.'); setWithdrawTo(''); setWithdrawAmt('')
    } catch (e: unknown) { toast.error((e as Error).message?.slice(0, 80) ?? 'Error') }
  }

  return (
    <div className="space-y-6">
      <h2 className="display text-xl font-semibold text-[var(--ink)]">Coordinator Panel</h2>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Members</p>
          <p className="display text-2xl font-semibold tabular-nums mt-1">{memberCount ? (memberCount as bigint).toString() : '0'}</p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Reserve</p>
          <p className="display text-2xl font-semibold tabular-nums mt-1">
            {reserveBalance ? parseFloat(formatUnits(reserveBalance as bigint, 6)).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0'} <span className="text-base text-[var(--muted)]">USDC</span>
          </p>
        </div>
      </div>

      {/* Add member */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-3">
        <div className="flex items-center gap-2">
          <UserPlus size={15} className="text-[var(--muted)]" />
          <h3 className="font-semibold text-[var(--ink)]">Add Member</h3>
        </div>
        <div className="flex gap-2">
          <input className={fieldCls()} placeholder="Member address (0x...)" value={addMemberAddr} onChange={e => setAddMemberAddr(e.target.value)} />
          <button
            onClick={() => void addMember()}
            disabled={isTxPending || !addMemberAddr}
            className="px-4 py-2 rounded-xl bg-[var(--accent)] text-white text-sm font-semibold hover:bg-[var(--accent-hover)] disabled:opacity-40 whitespace-nowrap transition-colors"
          >
            Add
          </button>
        </div>
      </div>

      {/* Remove member */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-3">
        <div className="flex items-center gap-2">
          <UserMinus size={15} className="text-[var(--muted)]" />
          <h3 className="font-semibold text-[var(--ink)]">Remove Member</h3>
        </div>
        <div className="flex gap-2">
          <input className={fieldCls()} placeholder="Member address (0x...)" value={removeMemberAddr} onChange={e => setRemoveMemberAddr(e.target.value)} />
          <button
            onClick={() => void removeMember()}
            disabled={isTxPending || !removeMemberAddr}
            className="px-4 py-2 rounded-xl border border-[var(--danger)] text-[var(--danger)] text-sm font-semibold hover:bg-red-50 disabled:opacity-40 whitespace-nowrap transition-colors"
          >
            Remove
          </button>
        </div>
      </div>

      {/* Verify listing */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck size={15} className="text-[var(--muted)]" />
          <h3 className="font-semibold text-[var(--ink)]">Verify Listing</h3>
        </div>
        <div className="flex gap-2">
          <input className={fieldCls()} placeholder="Listing ID" type="number" value={verifyListingId} onChange={e => setVerifyListingId(e.target.value)} />
          <button
            onClick={() => void verifyListing()}
            disabled={isTxPending || !verifyListingId}
            className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-40 whitespace-nowrap transition-colors"
          >
            Verify
          </button>
        </div>
      </div>

      {/* Withdraw reserve */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Banknote size={15} className="text-[var(--muted)]" />
          <h3 className="font-semibold text-[var(--ink)]">Withdraw Reserve</h3>
        </div>
        <input className={fieldCls()} placeholder="Recipient address (0x...)" value={withdrawTo} onChange={e => setWithdrawTo(e.target.value)} />
        <div className="flex gap-2">
          <input className={fieldCls()} placeholder="Amount (USDC)" type="number" value={withdrawAmt} onChange={e => setWithdrawAmt(e.target.value)} />
          <button
            onClick={() => void withdrawReserve()}
            disabled={isTxPending || !withdrawTo || !withdrawAmt}
            className="px-4 py-2 rounded-xl bg-[var(--accent)] text-white text-sm font-semibold hover:bg-[var(--accent-hover)] disabled:opacity-40 whitespace-nowrap transition-colors"
          >
            Withdraw
          </button>
        </div>
      </div>

      {!!txHash && <TxLink hash={txHash} />}
    </div>
  )
}
