/**
 * Pool page — Deposit USDC to mint shares; redeem shares; shows live NAV.
 */
import { useState } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseUnits, formatUnits } from 'viem'
import { toast } from 'sonner'
import { TrendingUp, ArrowDownToLine } from 'lucide-react'
import { FARM_COOP, ERC20_ABI, USDC_ADDRESS } from '@/contracts'
import { TxLink } from '@/components/TxLink'

export function PoolPage() {
  const { address } = useAccount()

  const { data: poolIdle } = useReadContract({ ...FARM_COOP, functionName: 'poolIdleUsdc' })
  const { data: poolListing } = useReadContract({ ...FARM_COOP, functionName: 'poolListingValue' })
  const { data: totalShares } = useReadContract({ ...FARM_COOP, functionName: 'totalShares' })
  const { data: pricePerShare, refetch: refetchPrice } = useReadContract({ ...FARM_COOP, functionName: 'pricePerShare' })
  const { data: myShares, refetch: refetchShares } = useReadContract({
    ...FARM_COOP,
    functionName: 'shareBalance',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  const idle = poolIdle ? formatUnits(poolIdle as bigint, 6) : '0'
  const listing = poolListing ? formatUnits(poolListing as bigint, 6) : '0'
  const total = poolIdle && poolListing
    ? formatUnits((poolIdle as bigint) + (poolListing as bigint), 6)
    : '0'
  const price = pricePerShare ? formatUnits(pricePerShare as bigint, 6) : '1.000000'
  const shares = myShares ? (myShares as bigint).toString() : '0'

  const [depositAmt, setDepositAmt] = useState('')
  const [redeemAmt, setRedeemAmt] = useState('')
  const [txHash, setTxHash] = useState<string>()
  const { writeContractAsync } = useWriteContract()
  const { isLoading: isTxPending } = useWaitForTransactionReceipt({ hash: txHash as `0x${string}` | undefined })

  async function deposit() {
    try {
      const amt = parseUnits(depositAmt, 6)
      await writeContractAsync({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [FARM_COOP.address, amt],
      })
      toast.info('Approving USDC...')
      const tx = await writeContractAsync({ ...FARM_COOP, functionName: 'depositPool', args: [amt] })
      setTxHash(tx)
      toast.success('Shares minted!')
      setDepositAmt('')
      void refetchPrice(); void refetchShares()
    } catch (e: unknown) {
      toast.error((e as Error).message?.slice(0, 80) ?? 'Transaction failed')
    }
  }

  async function redeem() {
    try {
      const tx = await writeContractAsync({
        ...FARM_COOP,
        functionName: 'redeemShares',
        args: [BigInt(redeemAmt)],
      })
      setTxHash(tx)
      toast.success('Redeem submitted!')
      setRedeemAmt('')
      void refetchPrice(); void refetchShares()
    } catch (e: unknown) {
      toast.error((e as Error).message?.slice(0, 80) ?? 'Transaction failed')
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="display text-xl font-semibold text-[var(--ink)]">Investment Pool</h2>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Price per Share', value: `${parseFloat(price).toFixed(6)} USDC`, icon: <TrendingUp size={14} /> },
          { label: 'Pool Value', value: `${parseFloat(total).toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC`, icon: null },
          { label: 'Idle USDC', value: `${parseFloat(idle).toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC`, icon: null },
          { label: 'Active in Listings', value: `${parseFloat(listing).toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC`, icon: null },
        ].map(({ label, value, icon }) => (
          <div key={label} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="text-xs uppercase tracking-wide text-[var(--muted)] flex items-center gap-1">{icon}{label}</p>
            <p className="display font-semibold tabular-nums text-[var(--ink)] mt-1 text-sm">{value}</p>
          </div>
        ))}
      </div>

      {/* My shares */}
      {address && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">My Shares</p>
          <p className="display text-2xl font-semibold tabular-nums text-[var(--ink)] mt-1">{shares}</p>
          {!!myShares && !!pricePerShare && !!totalShares && (totalShares as bigint) > 0n && (
            <p className="text-sm text-[var(--muted)] mt-0.5 tabular-nums">
              ≈ {formatUnits(
                ((myShares as bigint) * ((poolIdle != null ? (poolIdle as bigint) : 0n) + (poolListing != null ? (poolListing as bigint) : 0n))) / (totalShares as bigint),
                6
              )} USDC value
            </p>
          )}
        </div>
      )}

      {/* Deposit + Redeem */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-3">
          <h3 className="font-semibold text-[var(--ink)]">Deposit USDC</h3>
          <p className="text-sm text-[var(--muted)]">Mint shares at current NAV price.</p>
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] text-sm text-[var(--ink)] placeholder:text-[var(--subtle)]"
              placeholder="Amount USDC"
              value={depositAmt}
              onChange={e => setDepositAmt(e.target.value)}
            />
          </div>
          {!!depositAmt && !!pricePerShare && (pricePerShare as bigint) > 0n && (
            <p className="text-xs text-[var(--muted)] tabular-nums">
              ≈ {(parseFloat(depositAmt) / parseFloat(price)).toFixed(2)} shares
            </p>
          )}
          <button
            onClick={() => void deposit()}
            disabled={isTxPending || !depositAmt}
            className="w-full py-2.5 rounded-xl bg-[var(--accent)] text-white font-semibold text-sm hover:bg-[var(--accent-hover)] disabled:opacity-40 transition-colors"
          >
            {isTxPending ? 'Processing...' : 'Deposit'}
          </button>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-3">
          <h3 className="font-semibold text-[var(--ink)]">Redeem Shares</h3>
          <p className="text-sm text-[var(--muted)]">Burn shares for USDC (queued if illiquid).</p>
          <input
            type="number"
            min="0"
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] text-sm text-[var(--ink)] placeholder:text-[var(--subtle)]"
            placeholder="Shares to redeem"
            value={redeemAmt}
            onChange={e => setRedeemAmt(e.target.value)}
          />
          {!!redeemAmt && !!pricePerShare && (pricePerShare as bigint) > 0n && (
            <p className="text-xs text-[var(--muted)] tabular-nums">
              ≈ {(parseFloat(redeemAmt) * parseFloat(price)).toFixed(6)} USDC
            </p>
          )}
          <button
            onClick={() => void redeem()}
            disabled={isTxPending || !redeemAmt}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[var(--accent)] text-white font-semibold text-sm hover:bg-[var(--accent-hover)] disabled:opacity-40 transition-colors"
          >
            <ArrowDownToLine size={14} />
            {isTxPending ? 'Processing...' : 'Redeem'}
          </button>
        </div>
      </div>

      {txHash && <TxLink hash={txHash} />}
    </div>
  )
}
