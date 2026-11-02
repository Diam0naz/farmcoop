/**
 * Orders page — Coordinator creates orders; buyer funds and confirms delivery;
 * coordinator records quantities; members see status.
 */
import { useState } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseUnits, formatUnits } from 'viem'
import { toast } from 'sonner'
import { Plus, Package, ChevronDown, ChevronUp } from 'lucide-react'
import { FARM_COOP, ERC20_ABI, USDC_ADDRESS, COORDINATOR_ADDRESS } from '@/contracts'
import { TxLink } from '@/components/TxLink'
import { StatusBadge } from '@/components/StatusBadge'

const ORDER_STATUS = ['Pending', 'Funded', 'DeliveryRecorded', 'Confirmed', 'Paid']

function useOrderCount() {
  return useReadContract({ ...FARM_COOP, functionName: 'orderCount' })
}

function OrderCard({ orderId }: { orderId: bigint }) {
  const { address } = useAccount()
  const isCoordinator = address?.toLowerCase() === COORDINATOR_ADDRESS.toLowerCase()
  const [expanded, setExpanded] = useState(false)
  const [deliveryAddrs, setDeliveryAddrs] = useState('')
  const [deliveryQtys, setDeliveryQtys] = useState('')
  const [txHash, setTxHash] = useState<string>()

  const { data: order, refetch } = useReadContract({
    ...FARM_COOP,
    functionName: 'getOrder',
    args: [orderId],
  })

  const { writeContractAsync } = useWriteContract()
  const { isLoading: isTxPending } = useWaitForTransactionReceipt({ hash: txHash as `0x${string}` | undefined })

  if (!order) return null

  const orderTuple = order as [string, bigint, bigint, number, boolean, bigint]
  const [buyer, price, expectedQty, statusIdx, _buyerConfirmed, totalDelivered] = orderTuple
  const status = ORDER_STATUS[Number(statusIdx)] ?? 'Unknown'
  const isBuyer = address?.toLowerCase() === (buyer).toLowerCase()

  async function handleFund() {
    try {
      // Approve first
      await writeContractAsync({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [FARM_COOP.address, price],
      })
      toast.info('Approving USDC...')
      // Then fund
      const fundTx = await writeContractAsync({
        ...FARM_COOP,
        functionName: 'fundOrder',
        args: [orderId],
      })
      setTxHash(fundTx)
      toast.success('Order funded!')
      void refetch();
    } catch (e: unknown) {
      toast.error((e as Error).message?.slice(0, 80) ?? 'Transaction failed')
    }
  }

  async function handleConfirm() {
    try {
      const tx = await writeContractAsync({ ...FARM_COOP, functionName: 'confirmDelivery', args: [orderId] })
      setTxHash(tx)
      toast.success('Delivery confirmed. Payout settled.')
      void refetch();
    } catch (e: unknown) {
      toast.error((e as Error).message?.slice(0, 80) ?? 'Transaction failed')
    }
  }

  async function handleRecordDelivery() {
    try {
      const addrs = deliveryAddrs.split(',').map(s => s.trim()) as `0x${string}`[]
      const qtys = deliveryQtys.split(',').map(s => BigInt(s.trim()))
      const tx = await writeContractAsync({
        ...FARM_COOP,
        functionName: 'recordDelivery',
        args: [orderId, addrs, qtys],
      })
      setTxHash(tx)
      toast.success('Delivery recorded.')
      void refetch();
    } catch (e: unknown) {
      toast.error((e as Error).message?.slice(0, 80) ?? 'Transaction failed')
    }
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] backdrop-blur-sm overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-[var(--surface-muted)] transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <Package size={16} className="text-[var(--muted)] shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="display font-semibold text-[var(--ink)]">Order #{orderId.toString()}</span>
            <StatusBadge status={status} />
          </div>
          <div className="text-sm text-[var(--muted)] mt-0.5 tabular-nums">
            {formatUnits(price, 6)} USDC &middot; Qty {(expectedQty).toString()}
          </div>
        </div>
        {expanded ? <ChevronUp size={16} className="text-[var(--muted)]" /> : <ChevronDown size={16} className="text-[var(--muted)]" />}
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-3 border-t border-[var(--border)]">
          <div className="grid grid-cols-2 gap-2 pt-4 text-sm">
            <div>
              <span className="text-[var(--muted)] text-xs uppercase tracking-wide">Buyer</span>
              <div className="mono text-xs text-[var(--ink-2)] truncate mt-0.5">{buyer}</div>
            </div>
            <div>
              <span className="text-[var(--muted)] text-xs uppercase tracking-wide">Total delivered</span>
              <div className="tabular-nums font-medium mt-0.5">{(totalDelivered).toString()}</div>
            </div>
          </div>

          {/* Buyer actions */}
          {isBuyer && status === 'Pending' && (
            <button
              onClick={() => void handleFund()}
              disabled={isTxPending}
              className="w-full py-2.5 rounded-xl bg-[var(--accent)] text-white font-semibold text-sm hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors"
            >
              {isTxPending ? 'Funding...' : `Fund ${formatUnits(price, 6)} USDC`}
            </button>
          )}
          {isBuyer && status === 'DeliveryRecorded' && (
            <button
              onClick={() => void handleConfirm()}
              disabled={isTxPending}
              className="w-full py-2.5 rounded-xl bg-[var(--accent)] text-white font-semibold text-sm hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors"
            >
              {isTxPending ? 'Confirming...' : 'Confirm Delivery'}
            </button>
          )}

          {/* Coordinator actions */}
          {isCoordinator && status === 'Funded' && (
            <div className="space-y-2">
              <p className="text-xs text-[var(--muted)]">Record deliveries (comma-separated addresses and quantities):</p>
              <input
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] text-sm text-[var(--ink)] placeholder:text-[var(--subtle)]"
                placeholder="0xMember1, 0xMember2..."
                value={deliveryAddrs}
                onChange={e => setDeliveryAddrs(e.target.value)}
              />
              <input
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] text-sm text-[var(--ink)] placeholder:text-[var(--subtle)]"
                placeholder="50, 30..."
                value={deliveryQtys}
                onChange={e => setDeliveryQtys(e.target.value)}
              />
              <button
                onClick={() => void handleRecordDelivery()}
                disabled={isTxPending || !deliveryAddrs || !deliveryQtys}
                className="w-full py-2.5 rounded-xl bg-[var(--accent)] text-white font-semibold text-sm hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors"
              >
                {isTxPending ? 'Recording...' : 'Record Delivery'}
              </button>
            </div>
          )}

          {txHash && <TxLink hash={txHash} />}
        </div>
      )}
    </div>
  )
}

export function OrdersPage() {
  const { address } = useAccount()
  const isCoordinator = address?.toLowerCase() === COORDINATOR_ADDRESS.toLowerCase()

  const { data: orderCount, refetch } = useOrderCount()
  const [showCreate, setShowCreate] = useState(false)
  const [buyerAddr, setBuyerAddr] = useState('')
  const [price, setPrice] = useState('')
  const [qty, setQty] = useState('')
  const [txHash, setTxHash] = useState<string>()
  const { writeContractAsync } = useWriteContract()
  const { isLoading: isTxPending } = useWaitForTransactionReceipt({ hash: txHash as `0x${string}` | undefined })

  async function createOrder() {
    try {
      const tx = await writeContractAsync({
        ...FARM_COOP,
        functionName: 'createOrder',
        args: [buyerAddr as `0x${string}`, parseUnits(price, 6), BigInt(qty)],
      })
      setTxHash(tx)
      toast.success('Order created!')
      setBuyerAddr(''); setPrice(''); setQty('')
      setShowCreate(false)
      void refetch();
    } catch (e: unknown) {
      toast.error((e as Error).message?.slice(0, 80) ?? 'Transaction failed')
    }
  }

  const count = orderCount ? Number(orderCount) : 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="display text-xl font-semibold text-[var(--ink)]">Produce Orders</h2>
        {isCoordinator && (
          <button
            onClick={() => setShowCreate(s => !s)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--accent)] text-white text-sm font-semibold hover:bg-[var(--accent-hover)] transition-colors"
          >
            <Plus size={14} />
            New Order
          </button>
        )}
      </div>

      {showCreate && isCoordinator && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-3">
          <h3 className="font-semibold text-[var(--ink)]">Create Order</h3>
          <input
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] text-sm text-[var(--ink)] placeholder:text-[var(--subtle)]"
            placeholder="Buyer address (0x...)"
            value={buyerAddr}
            onChange={e => setBuyerAddr(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] text-sm text-[var(--ink)] placeholder:text-[var(--subtle)]"
              placeholder="Price (USDC)"
              type="number"
              min="0"
              value={price}
              onChange={e => setPrice(e.target.value)}
            />
            <input
              className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] text-sm text-[var(--ink)] placeholder:text-[var(--subtle)]"
              placeholder="Expected qty"
              type="number"
              min="1"
              value={qty}
              onChange={e => setQty(e.target.value)}
            />
          </div>
          <button
            onClick={() => void createOrder()}
            disabled={isTxPending || !buyerAddr || !price || !qty}
            className="w-full py-2.5 rounded-xl bg-[var(--accent)] text-white font-semibold text-sm hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors"
          >
            {isTxPending ? 'Creating...' : 'Create Order'}
          </button>
          {txHash && <TxLink hash={txHash} />}
        </div>
      )}

      {count === 0 && (
        <div className="rounded-2xl border border-dashed border-[var(--border)] p-8 text-center text-[var(--muted)] text-sm">
          No orders yet.
        </div>
      )}

      <div className="space-y-3">
        {Array.from({ length: count }, (_, i) => (
          <OrderCard key={i + 1} orderId={BigInt(i + 1)} />
        ))}
      </div>
    </div>
  )
}
